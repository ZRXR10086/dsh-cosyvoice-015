/**
 * 合成编排层：把「清洗 → 分段 → 算缓存键 → 查缓存 → 调云端 → 落盘」串成一次动作。
 *
 * 单独成一层，是因为这三件事的边界恰好是职责的边界：
 *
 * - {@link import('./speech.js').SpeechClient} 只懂 HTTP，不懂磁盘；
 * - {@link import('./store.js').AudioStore} 只懂磁盘，不懂网络；
 * - {@link import('./dialogue.js')} 只懂"哪些字是台词"，不懂音色；
 * - 缓存策略（什么算命中、失败要不要污染缓存）属于编排，不该塞进任何一边。
 *
 * 于是"换个合成引擎"和"换个缓存介质"互不干扰，单测也可以只注入其中一半。
 * @module dsh-cosyvoice/synth
 */

import { dialogueParts, hasDialogue, KIND_DIALOGUE, KIND_NARRATION, summarizeParts } from './dialogue.js'
import { MAX_TEXT_CHARS, normalizeText, PCM_SAMPLE_RATE } from './speech.js'
import { cacheKeyOf, cacheKeyOfParts, EXT_ONE_SHOT, EXT_WAV } from './store.js'
import { wavFromPcm } from './stream.js'

/**
 * 多段合成的并发上限。
 *
 * 角色扮演一次要发好几个请求，全并发容易撞限流；串行又会把总时长拉成 N 倍。
 * 3 是个折中：典型回答 2~6 段，最多多花一次往返。
 */
const MAX_CONCURRENCY = 3

/**
 * 取第一个非空值。
 * @param values - 候选，按优先级从高到低。
 * @returns 第一个非空串；全空时返回空串。
 */
function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (text !== '') return text
  }
  return ''
}

/**
 * 有限并发地映射，且**保持输入顺序**。
 *
 * 顺序不能靠 `Promise.all` 之后的索引去猜：段的先后就是朗读的先后，乱序等于念错。
 * @param items - 输入。
 * @param limit - 并发上限。
 * @param task - 处理函数。
 * @returns 与输入同序的结果。
 */
async function mapInOrder(items, limit, task) {
  const out = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      out[index] = await task(items[index], index)
    }
  }
  const lanes = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: lanes }, worker))
  return out
}

/** 带内容哈希缓存的语音合成器。 */
export class VoiceSynthesizer {
  /**
   * @param options - 协作者。
   * @param options.speech - 云端合成客户端。
   * @param options.store - 音频目录与缓存。
   * @param options.getSettings - 每次调用都读当前设置。
   * @param options.profiles - 音色档案；省略时固定走设置里的回退值。
   * @param options.log - 诊断输出（不进响应）。
   */
  constructor({ speech, store, getSettings, profiles, log }) {
    this.speech = speech
    this.store = store
    this.getSettings = getSettings
    this.profiles = profiles
    this.log = log ?? (() => {})
  }

  /**
   * 当前生效的（模型 + 音色）。
   *
   * 优先取**激活的音色档案**：档案表达的是"现在用哪一套"，而设置里的
   * `voiceId` / `model` 在 v2 已经降级成"一套档案都没有"时的回退值，这样
   * v1 用户升级上来不需要重新配置就能继续用。
   *
   * 档案存在但音色 ID 还是空的（克隆中）时不作数，否则每次合成都会拿一个空
   * 音色去打云端，报错还难懂。
   * @returns 模型、音色，以及命中档案时的档案 id / 名称。
   */
  identity() {
    const settings = this.getSettings() ?? {}
    const fallback = {
      model: String(settings.model ?? '').trim(),
      voiceId: String(settings.voiceId ?? '').trim(),
    }
    const profile = this.profiles === undefined ? undefined : this.profiles.active()
    if (profile === undefined || profile.voiceId === '') return fallback
    return {
      model: profile.model === '' ? fallback.model : profile.model,
      voiceId: profile.voiceId,
      profileId: profile.id,
      profileName: profile.name,
    }
  }

  /**
   * 排定一次朗读要合成哪几段、每段用哪个音色。
   *
   * 音色的取值顺序是**请求 > 配置 > 当前音色**：请求里带的是"用户刚刚选的"，
   * 配置里是持久化的那一份，两者都没有时才跟随当前激活的档案。于是没绑定角色
   * 音色也能直接用（听起来就是现在的声音），绑定了才分。
   * @param text - 已清洗的文本。
   * @param options - 本次的偏好。
   * @param options.roleplay - 是否按角色扮演处理。
   * @param options.narrationVoiceId - 旁白音色（覆盖配置）。
   * @param options.characterVoiceId - 台词音色（覆盖配置）。
   * @returns `{ parts, multi }`；`multi` 为真表示要走多段合成。
   */
  plan(text, options = {}) {
    const base = this.identity()
    const settings = this.getSettings() ?? {}
    const narrationVoice = firstNonEmpty(options.narrationVoiceId, settings.narrationVoiceId, base.voiceId)
    const characterVoice = firstNonEmpty(options.characterVoiceId, settings.characterVoiceId, base.voiceId)

    if (options.roleplay !== true) {
      return {
        multi: false,
        parts: [{ kind: KIND_NARRATION, text, model: base.model, voiceId: base.voiceId }],
      }
    }

    const parts = dialogueParts(text).map(part => ({
      kind: part.kind,
      text: part.text,
      model: base.model,
      voiceId: part.kind === KIND_DIALOGUE ? characterVoice : narrationVoice,
    }))

    // 一条台词都没有：整段都是旁白，那就用旁白音色一次念完 —— 不需要分段，
    // 也就不存在"分了却分不出两种声音"的尴尬。
    if (!hasDialogue(parts)) {
      return {
        multi: false,
        parts: [{ kind: KIND_NARRATION, text, model: base.model, voiceId: narrationVoice }],
      }
    }
    return { multi: true, parts }
  }

  /**
   * 合成一段文本，命中缓存则直接复用。
   * @param rawText - 要朗读的文本（可以是 Markdown，会先清洗）。
   * @param options - {@link VoiceSynthesizer#plan} 的偏好。
   * @returns 音频描述；`cached` 标明这次是否走了缓存。
   * @throws {Error} 配置缺失或合成失败时抛出（消息可直接展示给用户）。
   */
  async synthesize(rawText, options = {}) {
    const text = normalizeText(rawText)
    if (text === '') throw new Error('没有可朗读的文本。')

    const plan = this.plan(text, options)
    if (!plan.multi) return this.synthesizeOne(plan.parts[0])
    return this.synthesizeParts(plan.parts)
  }

  /**
   * 单段合成（非角色扮演，或开了但这条没有台词）。
   * @param part - 段。
   * @returns 音频描述。
   * @throws {Error} 配置缺失或合成失败时抛出。
   */
  async synthesizeOne(part) {
    const key = cacheKeyOf(part.model, part.voiceId, part.text)
    const cached = this.store.hit(key, EXT_ONE_SHOT)
    if (cached !== undefined) {
      this.log(`synth: 命中缓存 ${cached.name}（${String(cached.bytes)} 字节）`)
      return { ...cached, cached: true, text: part.text, characters: 0 }
    }

    // 长文本在清洗后才截断，所以缓存键算的是"真正会发出去的内容"——
    // 否则同一段超长文本在截断前后会算出两个键，白付一次钱。
    const clipped = part.text.length > MAX_TEXT_CHARS ? part.text.slice(0, MAX_TEXT_CHARS) : part.text
    const result = await this.speech.synthesize(clipped, { model: part.model, voiceId: part.voiceId })
    const clip = this.store.put(key, result.bytes, EXT_ONE_SHOT)
    this.log(`synth: 已合成 ${clip.name}（${String(clip.bytes)} 字节，计费 ${String(result.characters)} 字符）`)
    return { ...clip, cached: false, text: clipped, characters: result.characters }
  }

  /**
   * 多段合成：每段用自己的音色，按原文顺序拼成一条音频。
   *
   * 要的是 **PCM 而不是 MP3**：MP3 直接字节拼接能播，但时长与帧边界都是错的，
   * 而 PCM 拼接是采样级的，拼完之后补一个 WAV 头就是一条正经音频。顺序也就在
   * 文件里定死了，不存在"播放时才排顺序"这种会出错的地方。
   * @param parts - 段序列（已带各自的音色）。
   * @returns 音频描述。
   * @throws {Error} 任一段失败即抛出。
   */
  async synthesizeParts(parts) {
    const key = cacheKeyOfParts(parts)
    const cached = this.store.hit(key, EXT_WAV)
    if (cached !== undefined) {
      this.log(`synth: 角色扮演命中缓存 ${cached.name}（${String(cached.bytes)} 字节）`)
      return { ...cached, cached: true, text: joinParts(parts), characters: 0 }
    }

    const summary = summarizeParts(parts)
    this.log(`synth: 角色扮演 ${String(summary.narration)} 段旁白 / ${String(summary.dialogue)} 段台词`)

    const results = await mapInOrder(parts, MAX_CONCURRENCY, part =>
      this.speech.synthesize(part.text, { model: part.model, voiceId: part.voiceId }, 'pcm'))

    const whole = Buffer.concat(results.map(result => result.bytes))
    if (whole.length === 0) throw new Error('合成返回的音频为空，请稍后重试。')
    const clip = this.store.put(key, wavFromPcm(whole, PCM_SAMPLE_RATE), EXT_WAV)
    const characters = results.reduce((sum, result) => sum + Number(result.characters ?? 0), 0)
    this.log(`synth: 角色扮演合成 ${clip.name}（${String(clip.bytes)} 字节，计费 ${String(characters)} 字符）`)
    return { ...clip, cached: false, text: joinParts(parts), characters }
  }

  /**
   * 流式合成：一边把音频块交出去，一边攒完整的音频以便下次命中缓存。
   *
   * 产出顺序有意为之：**每一块到达就立刻 yield**，这份响应在 HTTP 层会变成一帧
   * SSE，落到浏览器就是"第一句出来就开始响"。全部合成完之后才补一个 `ready`，届时
   * 整段音频已经落成 WAV —— 于是同一条回答第二次播不再付第二次钱，也不再有任何
   * 等待。
   *
   * 缓存命中时不产生任何 `audio` 帧：直接给一个 `ready`，让路由按普通 JSON 回给
   * 浏览器去整段播。既然音频已经在磁盘上，再假装流一次只会更慢。
   * @param rawText - 要朗读的文本（可以是 Markdown，会先清洗）。
   * @param options - {@link VoiceSynthesizer#plan} 的偏好。
   * @returns 依次为音频块与终帧。
   * @throws {Error} 配置缺失或合成失败时抛出（消息可直接展示给用户）。
   */
  async * stream(rawText, options = {}) {
    const text = normalizeText(rawText)
    if (text === '') throw new Error('没有可朗读的文本。')

    const plan = this.plan(text, options)
    if (!plan.multi) {
      const part = plan.parts[0]
      const key = cacheKeyOf(part.model, part.voiceId, part.text)

      const cached = this.store.hit(key, EXT_WAV)
      if (cached !== undefined) {
        this.log(`synth: 流式命中缓存 ${cached.name}（${String(cached.bytes)} 字节）`)
        yield { kind: 'ready', clip: { ...cached, cached: true, characters: 0 } }
        return
      }

      // 长文本在清洗后才截断，所以缓存键算的是"真正会发出去的内容"。
      const clipped = part.text.length > MAX_TEXT_CHARS ? part.text.slice(0, MAX_TEXT_CHARS) : part.text
      const chunks = []
      let characters = 0
      let rate = PCM_SAMPLE_RATE

      for await (const frame of this.speech.stream(clipped, { model: part.model, voiceId: part.voiceId })) {
        if (frame.kind === 'audio') {
          chunks.push(frame.bytes)
          rate = frame.sampleRate
          yield { kind: 'audio', bytes: frame.bytes, sampleRate: frame.sampleRate }
          continue
        }
        if (frame.kind === 'finish') characters = frame.characters
      }

      const whole = Buffer.concat(chunks)
      if (whole.length === 0) throw new Error('合成返回的音频为空，请稍后重试。')
      const clip = this.store.put(key, wavFromPcm(whole, rate), EXT_WAV)
      this.log(`synth: 流式合成 ${clip.name}（${String(clip.bytes)} 字节，计费 ${String(characters)} 字符）`)
      yield { kind: 'ready', clip: { ...clip, cached: false, characters } }
      return
    }

    yield * this.streamParts(plan.parts)
  }

  /**
   * 角色扮演的流式合成：**一起发起，按序交付**。
   *
   * 这是整个 v3.0 里最关键的一个取舍。串行处理（第一条流收完再开第二条）最省事，
   * 但每换一次音色就要多等一次完整的网络往返——用户在 v2 分句方案上已经吃过这个
   * 亏："两句间隔太大"。反过来全并发再按到达顺序交付，则顺序会乱，台词可能跑到
   * 旁白前面。
   *
   * 于是：**请求全部先起飞**（`openStream` 返回时 HTTP 已经发出），消费时严格按下
   * 标顺序读。后面的流在等待期间一直在缓冲，轮到它时数据基本已经到了，段与段
   * 之间既没有额外等待，顺序也和原文一致。
   * @param parts - 段序列（已带各自的音色）。
   * @returns 依次为音频块与终帧。
   * @throws {Error} 任一段失败即抛出，并把其余未消费的流收掉。
   */
  async * streamParts(parts) {
    const key = cacheKeyOfParts(parts)
    const cached = this.store.hit(key, EXT_WAV)
    if (cached !== undefined) {
      this.log(`synth: 角色扮演流式命中缓存 ${cached.name}`)
      yield { kind: 'ready', clip: { ...cached, cached: true, characters: 0 } }
      return
    }

    const chunks = []
    let characters = 0
    let rate = PCM_SAMPLE_RATE
    let opened = []

    try {
      // 这一段会同步校验 Key / 音色：不合法就在这里炸掉，一个请求都不会发出去。
      opened = parts.map(part => this.speech.openStream(part.text, { model: part.model, voiceId: part.voiceId }))

      for (let index = 0; index < opened.length; index += 1) {
        for await (const frame of opened[index].frames) {
          if (frame.kind === 'audio') {
            chunks.push(frame.bytes)
            rate = frame.sampleRate
            yield { kind: 'audio', bytes: frame.bytes, sampleRate: frame.sampleRate }
            continue
          }
          if (frame.kind === 'finish') characters += Number(frame.characters ?? 0)
        }
      }
    } catch (error) {
      // 剩下的流还没人读：显式收掉，别让它们挂在连接上等着超时。
      for (const item of opened) {
        if (typeof item.frames.return === 'function') {
          try { await item.frames.return(undefined) } catch { /* 收不掉就算了 */ }
        }
      }
      throw error
    }

    const whole = Buffer.concat(chunks)
    if (whole.length === 0) throw new Error('合成返回的音频为空，请稍后重试。')
    const clip = this.store.put(key, wavFromPcm(whole, rate), EXT_WAV)
    this.log(`synth: 角色扮演流式合成 ${clip.name}（${String(clip.bytes)} 字节，计费 ${String(characters)} 字符）`)
    yield { kind: 'ready', clip: { ...clip, cached: false, characters } }
  }
}

/**
 * 把段序列拼回一段文本，用于回报"这次念了什么"。
 * @param parts - 段序列。
 * @returns 拼接结果。
 */
function joinParts(parts) {
  return parts.map(part => part.text).join('')
}
