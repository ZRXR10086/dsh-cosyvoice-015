/**
 * 与小米 MiMo 开放平台语音合成的对话（MiMo-V2.5-TTS 系列三款模型）。
 *
 * ## 它和百炼那一半的根本差别
 *
 * 两边都是 HTTP 合成，但**音色是怎么带过去的**完全不同，这一处差别决定了本文件的
 * 几乎全部结构：
 *
 * | | 百炼 CosyVoice | MiMo |
 * | --- | --- | --- |
 * | 端点 | `/api/v1/services/audio/tts/SpeechSynthesizer` | `/v1/chat/completions` |
 * | 形状 | 自定义的 `input: { text, voice }` | OpenAI 兼容的 `messages` + `audio` |
 * | 待合成文本 | `input.text` | **`role: assistant` 那条消息的 content** |
 * | 音色 | `input.voice` = 音色 ID | `audio.voice` = 音色名 **或整段参考音频的 data URL** |
 * | 风格指令 | 无 | **`role: user` 那条消息的 content** |
 * | 流式 | `X-DashScope-SSE: enable` + 自定义帧 | `stream: true` + OpenAI 的 `choices[].delta` |
 *
 * 最要紧的两条：
 *
 * **1. 文本必须放在 `role: assistant` 里。** 官方文档写得很明确——*"语音合成的目标文本
 * 需填写在 `role` 为 `assistant` 的消息中，不可放在 `user` 角色的消息内"*。而 `user`
 * 那一侧是**风格指令**的位置（"用轻快上扬的语调、语速稍快"…）。音色设计更是只能写
 * 在 `user` 里。于是同一段文本在两份配置里的落点正好相反，写反了不会报语法错，只
 * 会**念出指令本身**或**沉默**，非常难查。
 *
 * **2. 音色复刻没有"音色 ID"。** 参考音频（base64 的 data URL）随每次请求附在
 * `audio.voice` 上，音色是这一次即时复刻出来的。因此本客户端需要一个本地样本来源
 * （`VoiceSamples`），每次合成前把音频读出来重新附上——这正是"复用"要靠本地兜住
 * 的原因，细节见 `./samples.js`。
 *
 * ## 三款模型的能力差异（官方文档）
 *
 * | 模型 | 音色来源 | 唱歌 | 低延迟流式 |
 * | --- | --- | --- | --- |
 * | `mimo-v2.5-tts` | 预置音色列表 | 支持 | **已上线** |
 * | `mimo-v2.5-tts-voiceclone` | 音频样本 | 不支持 | 未上线，降级为兼容模式 |
 * | `mimo-v2.5-tts-voicedesign` | 文字描述 | 不支持 | 未上线，降级为兼容模式 |
 *
 * 后两款的"流式"是**兼容模式**：接口照收 `stream: true`，但只在全部推理完成后一次性
 * 吐出完整结果。本客户端**照样走流式路径**（于是上层的 Web Audio 排期、缓存落盘、
 * 回退逻辑一行都不用改），只是用户会等到整段合成完才听到第一声。诚实地说明这一点
 * 优于假装它能低延迟——所以 `models.js` 里标了 `streaming: false`，界面上如实告知。
 *
 * 与 {@link import('./speech.js').SpeechClient} 一样：fetch 可注入（于是测试不花钱
 * 也不联网），业务失败返回可展示的中文错误而不是抛裸异常。
 * @module dsh-cosyvoice/mimo
 */

import {
  isMimo,
  KIND_CLONE,
  KIND_DESIGN,
  normalizeModel,
  providerOf,
} from './models.js'
import { normalizeText, PCM_SAMPLE_RATE } from './speech.js'
import { interpretOpenAiChunk, readSse } from './stream.js'

/** MiMo 的合成端点（OpenAI 兼容：`/v1` + `/chat/completions`）。 */
export const MIMO_ENDPOINT = 'https://api.xiaomimimo.com/v1/chat/completions'

/** 单次合成的文本上限（字符）。与百炼一致。 */
export const MIMO_MAX_TEXT_CHARS = 20000

/** 单次请求的超时（毫秒）。合成是长任务，但不能无限等。 */
export const MIMO_TIMEOUT_MS = 180000

/**
 * 预置音色在没有指定时用谁。
 *
 * `mimo_default` 的实际嗓音**随部署集群而异**（中国集群是「冰糖」，其他集群是
 * 「Mia」），所以它不是"某个具体的嗓子"，而是"这一套集群的默认嗓子"——对不想挑
 * 的人来说是正确的默认值。
 */
export const MIMO_DEFAULT_VOICE = 'mimo_default'

/** 音色设计时，若描述为空，给用户的一句实在话。 */
const DESIGN_FALLBACK_HINT = '请先为这个音色写一句描述（年龄段、性别、声音质感、语速、情绪底色）。'

/**
 * 本插件内部统一的音频格式名 → MiMo 请求里的 `audio.format`。
 *
 * - `mp3` / `wav`：非实时整段合成。云端直接返回带容器的音频，落盘即可播。
 * - `pcm`：裸 16 位小端单声道采样。角色扮演要按段拼音频，只有采样级的数据能拼。
 *
 * 关键的一处：**流式必须用 `pcm16`**。官方文档专门说明"采用流式调用时，输出音频的
 * 格式请指定为 `pcm16`，以便拼接成完整音频"。所以 {@link formatForStream} 恒定返回
 * `pcm16`，与百炼那侧的 `pcm` 是同一个内部名字、不同的线上取值。
 */
export function mimoFormatOf(format) {
  const key = String(format ?? '').trim()
  if (key === 'wav') return 'wav'
  if (key === 'pcm' || key === 'pcm16') return 'pcm16'
  return 'mp3'
}

/**
 * 流式请求该用的格式名。
 * @returns 恒为 `pcm16`。
 */
export function formatForStream() {
  return 'pcm16'
}

/**
 * MiMo 预置音色之外，还要不要在 `audio.voice` 里带东西。
 *
 * 音色设计**不要** `audio.voice`：它没有参考音频也没有音色名，描述在 `role: user`
 * 那条消息里。多带一个空串会让接口走到"预置音色"分支，然后报"音色不存在"。
 * @param kind - 音色来源（`preset` / `clone` / `design`）。
 * @returns 是否需要 `audio.voice`。
 */
function needsVoiceField(kind) {
  return kind !== KIND_DESIGN
}

/**
 * 把一段音频编成 MiMo 要的 data URL。
 *
 * 官方要求的形态是 `data:{MIME_TYPE};base64,{BASE64}`，MIME 只能是 `audio/mpeg`
 * （或 `audio/mp3`）与 `audio/wav`。**前缀必须带**——不带时接口认不出这是音频。
 * @param bytes - 音频字节。
 * @param mime - MIME 类型。
 * @returns data URL。
 */
export function audioDataUrl(bytes, mime) {
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
}

/**
 * 把 HTTP 状态码与正文翻译成一句人能看懂的中文提示。
 *
 * MiMo 这边最常见的失败其实只有两类：Key 没开通语音合成（401/403），以及音色相关的
 * 400——比如复刻音色时那段音频读不出内容、或者描述为空。这类报错必须说得比
 * "HTTP 400"具体得多，否则用户根本不知道要去检查哪一项。
 * @param status - HTTP 状态码。
 * @param bodyText - 响应正文。
 * @param identity - 本次用的模型与音色（用来点名是哪个坏了）。
 * @returns 面向用户的错误说明。
 */
export function describeMimoFailure(status, bodyText, identity) {
  const text = String(bodyText ?? '').trim()
  let detail = ''
  try {
    const parsed = JSON.parse(text)
    detail = String(parsed?.error?.message ?? parsed?.message ?? '').trim()
  } catch {
    detail = text.slice(0, 200)
  }
  const suffix = detail === '' ? '' : `（${detail}）`
  const voice = String(identity?.voiceId ?? '').trim()
  const named = voice === '' ? '' : `（音色：${voice}）`

  if (status === 401 || status === 403) {
    return `MiMo API Key 无效或无权限${suffix}。请在 设置 → 语音 中填写小米 MiMo 开放平台的 Key。`
  }
  if (status === 429) return `MiMo 请求过于频繁或额度不足${suffix}。`
  if (status === 404) return `MiMo 没有这个模型或音色${suffix}${named}。请检查该音色档案绑定的模型。`
  if (status === 400) {
    if (/voice|audio|sample|reference/i.test(detail)) {
      return `MiMo 拒绝了这次音色请求${suffix}${named}。复刻音色需要一段清晰的 mp3/wav 参考音频，音色设计需要一句非空的描述。`
    }
    return `MiMo 拒绝了这次请求${suffix}。`
  }
  if (status >= 500) return `MiMo 服务暂时不可用${suffix}，请稍后重试。`
  return `MiMo 语音合成失败（HTTP ${String(status)}）${suffix}`
}

/**
 * 带超时的 fetch。
 * @param fetchImpl - 实际发请求的 fetch。
 * @param url - 目标地址。
 * @param init - 请求参数。
 * @param timeoutMs - 超时毫秒数。
 * @returns 响应。
 */
async function fetchWithTimeout(fetchImpl, url, init, timeoutMs) {
  return fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
}

/** MiMo 语音合成客户端。 */
export class MimoSpeechClient {
  /**
   * @param options - 协作者。
   * @param options.getSettings - 每次调用时读取当前设置，所以改配置无需重启。
   * @param options.samples - 本地音色样本仓库；复刻音色每次合成都要从它读音频。
   * @param options.endpoint - 合成端点。
   * @param options.fetchImpl - 可注入的 fetch（测试用假实现）。
   * @param options.timeoutMs - 请求超时。
   */
  constructor({
    getSettings,
    samples,
    endpoint = MIMO_ENDPOINT,
    fetchImpl = globalThis.fetch,
    timeoutMs = MIMO_TIMEOUT_MS,
  }) {
    this.getSettings = getSettings
    this.samples = samples
    this.endpoint = endpoint
    this.fetchImpl = fetchImpl
    this.timeoutMs = timeoutMs
  }

  /**
   * 当前 MiMo API Key。
   * @returns Key。
   * @throws {Error} 未配置时抛出（消息可直接展示给用户）。
   */
  apiKey() {
    const key = String(this.getSettings()?.mimoApiKey ?? '').trim()
    if (key === '') {
      throw new Error('未配置 MiMo API Key。请在 设置 → 语音 中填写小米 MiMo 开放平台的 Key。')
    }
    return key
  }

  /**
   * 整理一次请求要用的全部材料。
   *
   * 与百炼那一侧最大的不同在这里体现：**音色与文本要放进不同的消息角色里**。
   * 文本进 `assistant`，风格指令/音色描述进 `user`。而音色复刻还要额外把本地样本
   * 编成 data URL 附在 `audio.voice` 上——这一步同步完成（读文件 + base64），
   * 于是"样本文件不见了"会在**发请求之前**就报出来，不会浪费一次往返。
   *
   * @param rawText - 要朗读的文本（可以是 Markdown，会先清洗）。
   * @param identity - 本次的模型与音色。
   * @param format - 要云端返回的音频格式（本插件的内部名字）。
   * @returns 文本、凭据与可直接序列化的请求体。
   * @throws {Error} 配置缺失、样本丢失或文本为空时抛出。
   */
  prepare(rawText, identity, format) {
    const text = normalizeText(rawText)
    if (text === '') throw new Error('没有可朗读的文本。')

    const apiKey = this.apiKey()
    const model = normalizeModel(identity?.model)
    if (!isMimo(model)) {
      throw new Error(`模型 ${model} 不是 MiMo 系列的，不能用 MiMo 通道合成。`)
    }

    const kind = identity?.kind ?? 'preset'
    const audio = { format: mimoFormatOf(format) }

    if (kind === KIND_CLONE) {
      // 复刻：音色就是那段参考音频。**每次都重新读、重新编** —— MiMo 侧没有可长期
      // 持有的音色句柄，本地样本是唯一的复用方式。
      const sampleName = String(identity?.sample ?? '').trim()
      const sample = this.samples === undefined ? undefined : this.samples.read(sampleName)
      if (sample === undefined) {
        throw new Error(
          '这套复刻音色的参考音频已经不在了（它只保存在本机 ~/.dsh/voice/samples）。请在 设置 → 语音 里重新上传一段。',
        )
      }
      audio.voice = audioDataUrl(sample.bytes, sample.mime)
    } else if (kind === KIND_DESIGN) {
      const design = String(identity?.voiceId ?? '').trim()
      if (design === '') throw new Error(`这套音色还没有写描述。${DESIGN_FALLBACK_HINT}`)
    } else {
      const voice = String(identity?.voiceId ?? '').trim() || MIMO_DEFAULT_VOICE
      audio.voice = voice
    }

    // 目标文本进 assistant；user 那一侧留给风格指令。角色扮演切出的每一段都是纯文本，
    // 所以这里不给额外的指令——本插件不做"用温柔的语气念"这类自动加词，那属于音色设计
    // 那一侧的事。
    const payload = {
      model,
      messages: [
        { role: 'user', content: kind === KIND_DESIGN ? String(identity?.voiceId ?? '').trim() : '' },
        { role: 'assistant', content: text },
      ],
      audio,
    }
    if (kind === KIND_DESIGN) {
      // 音色设计可以顺手让云端把目标文本润色成更贴合音色的表达；但那会改掉用户
      // 要读的字面内容，所以默认不开（显式传 false 而不是省略，语义更清楚）。
      audio.optimize_text_preview = false
    }

    return { text, apiKey, model, audio, payload }
  }

  /**
   * 合成一段文本，返回音频字节。
   * @param rawText - 要朗读的文本。
   * @param identity - 本次的模型与音色。
   * @param format - 音频格式；角色扮演要拼音频，所以用裸 `pcm`。
   * @returns 音频字节、使用的音色与模型、以及字符用量。
   * @throws {Error} 配置缺失、样本丢失或合成失败时抛出。
   */
  async synthesize(rawText, identity, format = 'mp3') {
    const { text, apiKey, model, payload } = this.prepare(rawText, identity, format)
    let response
    try {
      response = await fetchWithTimeout(this.fetchImpl, this.endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      }, this.timeoutMs)
    } catch (error) {
      throw new Error(`无法连接 MiMo 服务：${error instanceof Error ? error.message : String(error)}`)
    }

    const bodyText = await response.text()
    if (!response.ok) throw new Error(describeMimoFailure(response.status, bodyText, identity))

    let parsed
    try {
      parsed = JSON.parse(bodyText)
    } catch {
      throw new Error('MiMo 返回的内容不是合法 JSON，请稍后重试。')
    }

    // 非流式的音频在 choices[0].message.audio.data（base64）。官方示例正是这个位置。
    const message = parsed?.choices?.[0]?.message
    const inline = typeof message?.audio?.data === 'string' ? message.audio.data : ''
    if (inline === '') throw new Error('MiMo 没有返回音频数据，请稍后重试。')

    const bytes = Buffer.from(inline, 'base64')
    if (bytes.length === 0) throw new Error('合成返回的音频为空，请稍后重试。')
    const voiceId = String(identity?.voiceId ?? '').trim()
    return {
      bytes,
      model,
      voiceId,
      characters: Number(parsed?.usage?.characters ?? text.length),
    }
  }

  /**
   * 开一条流，但**不开始消费**。
   *
   * 与百炼那侧同一套结构（async generator 的函数体在第一次 `next()` 才执行，
   * 直接 `map` 出一堆 generator 一个请求都发不出去），于是把 fetch 装进一个立即启动的
   * promise，返回时请求已经在飞。
   *
   * 流式帧是 OpenAI 形状：`choices[0].delta.audio.data` 里是 base64 的 `pcm16`。
   * 注意**采样率恒为 24000**（官方文档），所以这里传下去的 sampleRate 是个常量而不是
   * 从云端读的——云端这一侧压根没给采样率字段。
   * @param rawText - 要朗读的文本。
   * @param identity - 本次的模型与音色。
   * @returns `{ frames }`：一个尚未开始消费的异步迭代器。
   * @throws {Error} 配置缺失时**同步**抛出（还没发请求）。
   */
  openStream(rawText, identity) {
    const { apiKey, model, payload } = this.prepare(rawText, identity, 'pcm')
    payload.stream = true
    payload.audio.format = formatForStream()

    const pending = (async () => {
      let response
      try {
        response = await fetchWithTimeout(this.fetchImpl, this.endpoint, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
            accept: 'text/event-stream',
          },
          body: JSON.stringify(payload),
        }, this.timeoutMs)
      } catch (error) {
        throw new Error(`无法连接 MiMo 服务：${error instanceof Error ? error.message : String(error)}`)
      }
      if (!response.ok) throw new Error(describeMimoFailure(response.status, await response.text(), identity))
      return response
    })()
    // 多条流并行时，靠后那条可能先失败，而它的 promise 此刻还没人 await。
    pending.catch(() => {})

    const sampleRate = PCM_SAMPLE_RATE
    const voiceId = String(identity?.voiceId ?? '').trim()
    async function * frames() {
      const response = await pending
      let sawAudio = false
      for await (const frame of readSse(response.body)) {
        const event = interpretOpenAiChunk(frame)
        if (event.kind === 'audio') {
          sawAudio = true
          yield { kind: 'audio', bytes: Buffer.from(event.base64, 'base64'), sampleRate }
        } else if (event.kind === 'failed') {
          throw new Error(event.message)
        } else if (event.kind === 'finish') {
          yield { kind: 'finish', url: undefined, characters: event.characters, model, voiceId }
        }
      }
      if (!sawAudio) throw new Error('MiMo 没有返回音频数据，请稍后重试。')
    }

    return { frames: frames() }
  }

  /**
   * 流式合成：边合成边把音频块交出来。
   * @param rawText - 要朗读的文本。
   * @param identity - 本次的模型与音色。
   * @returns 依次为 `{ kind: 'audio', bytes, sampleRate }` 与 `{ kind: 'finish', ... }`。
   */
  async * stream(rawText, identity) {
    yield * this.openStream(rawText, identity).frames
  }
}

/**
 * 一个模型该走哪一套客户端。
 *
 * 与 `./models.js` 里的 `providerOf` 同一个答案，但留这个函数是为了让调用点读起来
 * 是在问"这件事是不是 MiMo 的活"——音色复刻在两边要拿的东西根本不同（百炼要音色 ID，
 * MiMo 要本地音频），那一处分支因此需要一个自解释的名字。
 * @param model - 模型名。
 * @returns 是否走 MiMo。
 */
export function isMimoModel(model) {
  return providerOf(model) === 'mimo' && isMimo(model)
}
