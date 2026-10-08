/**
 * 与阿里云百炼（DashScope）非实时语音合成 HTTP 接口的对话。
 *
 * 两条链路，同一个端点：
 *
 * - **非实时**：一次 POST 拿回整条音频（默认）。语调最连贯，代价是要等全文合成完；
 * - **实时**：加上 `X-DashScope-SSE: enable`，云端按句把 PCM 推回来，
 *   第一句合成完就能出声。
 *
 * 两个决定塑造了这个文件：
 *
 * **fetch 可注入。** 客户端接收一个可注入的 fetch 实现，于是测试可以塞进假 fetch
 * 模拟成功/失败/超时，完全不碰真实网络；真实环境也可以注入受限的 fetch。
 *
 * **业务失败返回结构化错误，而不是抛裸异常。** 模型/调用方要能读懂"为什么失败"
 * 才能正确引导用户（Key 错了、模型与音色不匹配、还是服务不可用）。
 * @module dsh-cosyvoice/speech
 */

import { DEFAULT_MODEL } from './settings.js'
import { interpretSseFrame, readSse } from './stream.js'

/** 合成接口地址（华北2北京；非流式返回音频 URL）。 */
export const DEFAULT_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer'

/** 单次合成的文本上限（字符）。超过即截断，避免请求被拒。 */
export const MAX_TEXT_CHARS = 20000

/** 单次请求的超时（毫秒）。合成是长任务，但不能无限等。 */
export const REQUEST_TIMEOUT_MS = 120000

/** 打开流式返回的请求头：不带它就是一次普通的、等整段合成完的请求。 */
export const SSE_HEADER = 'X-DashScope-SSE'

/** 流式链路请求头的值。 */
export const SSE_ENABLED = 'enable'

/**
 * 一切 PCM 产物的采样率。
 *
 * 请求里带 `sample_rate`，云端返回的 PCM 就按这个来；角色扮演要把多段音频直接
 * 拼起来，**采样率必须一致**才不会变调，所以整条链路只用这一个值。
 */
export const PCM_SAMPLE_RATE = 24000

/** 流式链路的采样率；与 {@link PCM_SAMPLE_RATE} 同一个值。 */
const STREAM_SAMPLE_RATE = PCM_SAMPLE_RATE

/**
 * 把一段回答文本整理成"适合朗读"的纯文本。
 *
 * 去掉 Markdown 标记，否则 `**`、`#`、链接 URL 都会被念出来，听感很差。
 * 顺序有讲究：先删块级结构（代码块），再删行内标记，最后压空白。
 * @param raw - 原始文本（可能是 Markdown）。
 * @returns 清洗并截断后的文本。
 */
export function normalizeText(raw) {
  let text = String(raw ?? '')

  // 代码块：整块去掉（代码念出来毫无意义）
  text = text.replace(/```[\s\S]*?```/g, ' ')
  text = text.replace(/~~~[\s\S]*?~~~/g, ' ')
  // 行内代码：保留内容，去掉反引号
  text = text.replace(/`([^`]*)`/g, '$1')
  // 图片：整块去掉
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  // 链接：保留可读文字，丢掉 URL
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  // HTML 标签
  text = text.replace(/<[^>]+>/g, ' ')
  // 标题符号 / 引用符号 / 列表符号 / 表格分隔（保留内容）
  text = text.replace(/^\s{0,3}#{1,6}\s*/gm, '')
  text = text.replace(/^\s{0,3}>\s?/gm, '')
  text = text.replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '')
  text = text.replace(/^\s*\|?[\s:|-]{3,}\|?\s*$/gm, ' ')
  text = text.replace(/\|/g, ' ')
  // 强调符号
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2')
  text = text.replace(/(\*|_)(.*?)\1/g, '$2')
  text = text.replace(/~~(.*?)~~/g, '$1')
  // 压空白：连续空格并成一个，行尾不留白（块级结构被删掉后常留下只含空格的行）。
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/[ \t]+$/gm, '')
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()

  if (text.length > MAX_TEXT_CHARS) text = text.slice(0, MAX_TEXT_CHARS)
  return text
}

/**
 * 把 HTTP 状态码与响应正文翻译成一句人能看懂的中文提示。
 * @param status - HTTP 状态码。
 * @param bodyText - 响应正文（可能是 JSON，也可能不是）。
 * @returns 面向用户的错误说明。
 */
export function describeFailure(status, bodyText) {
  const text = String(bodyText ?? '').trim()
  let detail = ''
  try {
    const parsed = JSON.parse(text)
    detail = String(parsed?.message ?? parsed?.error?.message ?? '').trim()
  } catch {
    detail = text.slice(0, 200)
  }
  const suffix = detail === '' ? '' : `（${detail}）`

  if (status === 401 || status === 403) return `API Key 无效或无权限${suffix}。请在 设置 → 语音 中检查。`
  if (status === 418) return `合成模型与注册音色时的模型不一致${suffix}。设置里的「合成模型」必须与音色 ID 前缀一致。`
  if (status === 429) return `请求过于频繁或额度不足${suffix}。`
  if (status >= 500) return `百炼服务暂时不可用${suffix}，请稍后重试。`
  return `语音合成失败（HTTP ${String(status)}）${suffix}`
}

/**
 * 带超时的 fetch。AbortSignal.timeout 在 Node 18+ 可用。
 * @param fetchImpl - 实际发请求的 fetch。
 * @param url - 目标地址。
 * @param init - 请求参数。
 * @param timeoutMs - 超时毫秒数。
 * @returns 响应。
 */
async function fetchWithTimeout(fetchImpl, url, init, timeoutMs) {
  return fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
}

/** 语音合成客户端。 */
export class SpeechClient {
  /**
   * @param options - 协作者。
   * @param options.getSettings - 每次调用时读取当前设置，所以改配置无需重启。
   * @param options.endpoint - 合成接口地址，默认华北2北京。
   * @param options.fetchImpl - 可注入的 fetch（测试用假实现）。
   * @param options.timeoutMs - 请求超时。
   */
  constructor({ getSettings, endpoint = DEFAULT_ENDPOINT, fetchImpl = globalThis.fetch, timeoutMs = REQUEST_TIMEOUT_MS }) {
    this.getSettings = getSettings
    this.endpoint = endpoint
    this.fetchImpl = fetchImpl
    this.timeoutMs = timeoutMs
  }

  /**
   * 整理一次请求要用的全部材料。
   *
   * 两条链路共用，于是"Key 缺失""没给音色""超长截断"这些判定只有一份 ——
   * 否则流式和非流式迟早会在某一条错误消息上分家。
   * @param rawText - 原始文本（可以是 Markdown）。
   * @param identity - 本次要用的模型与音色；省略时用设置里的回退值。
   * @param format - 要云端返回的音频格式。
   * @returns 文本、凭据与可直接序列化的请求体。
   * @throws {Error} 配置缺失时抛出（消息可直接展示给用户）。
   */
  prepare(rawText, identity, format) {
    const text = normalizeText(rawText)
    if (text === '') throw new Error('没有可朗读的文本。')

    const settings = this.getSettings()
    const apiKey = String(settings?.apiKey ?? '').trim()
    // 音色与模型由编排层定（激活的音色档案优先于设置），本类只管把它们发出去 ——
    // 让它自己去读设置的话，切了档案请求却还在用旧音色。
    const voiceId = String(identity?.voiceId ?? settings?.voiceId ?? '').trim()
    const model = String(identity?.model ?? settings?.model ?? '').trim() || DEFAULT_MODEL
    if (apiKey === '') throw new Error('未配置 API Key。请在 设置 → 语音 中填写阿里云百炼的 Key。')
    if (voiceId === '') throw new Error('未配置音色 ID。请在 设置 → 语音 中填写已注册的复刻音色 ID。')

    const payload = {
      model,
      input: { text, voice: voiceId, format, sample_rate: STREAM_SAMPLE_RATE },
    }
    return { text, apiKey, model, voiceId, payload }
  }

  /**
   * 合成一段文本，返回音频字节。
   * @param rawText - 要朗读的文本（可以是 Markdown，会先清洗）。
   * @param identity - 本次要用的模型与音色；省略时用设置里的回退值。
   * @param format - 云端返回的音频格式；角色扮演要拼音频，所以用裸 `pcm`。
   * @returns 音频字节、使用的音色与模型、以及字符用量。
   * @throws {Error} 配置缺失或合成失败时抛出（消息可直接展示给用户）。
   */
  async synthesize(rawText, identity, format = 'mp3') {
    const { text, apiKey, model, voiceId, payload } = this.prepare(rawText, identity, format)
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
      throw new Error(`无法连接百炼服务：${error instanceof Error ? error.message : String(error)}`)
    }

    const bodyText = await response.text()
    if (!response.ok) throw new Error(describeFailure(response.status, bodyText))

    let parsed
    try {
      parsed = JSON.parse(bodyText)
    } catch {
      throw new Error('百炼返回的内容不是合法 JSON，请稍后重试。')
    }

    const audio = parsed?.output?.audio
    const inline = typeof audio?.data === 'string' && audio.data !== ''
    const url = typeof audio?.url === 'string' && audio.url !== '' ? audio.url : undefined
    if (!inline && url === undefined) throw new Error('百炼没有返回音频数据，请稍后重试。')

    const bytes = inline
      ? Buffer.from(audio.data, 'base64')
      : await this.download(url)

    if (bytes.length === 0) throw new Error('合成返回的音频为空，请稍后重试。')
    return { bytes, model, voiceId, characters: Number(parsed?.usage?.characters ?? text.length) }
  }

  /**
   * 开一条流，但**不开始消费**。
   *
   * 角色扮演要同时念旁白和台词：两条流都得先发出去，否则第二条要等第一条收完
   * 才起飞，段与段之间就多出一次完整的网络往返——那正是 v2 分句方案被吐槽
   * "间隔太大"的原因。
   *
   * 而 async generator 的函数体在第一次 `next()` 才执行，直接 `map` 出一堆
   * generator 是一个请求都不会发出去的。所以这里把 fetch 装进一个立即启动的
   * promise（返回时请求已经在飞），generator 只负责等它、然后按块往外吐。
   * @param rawText - 要朗读的文本（可以是 Markdown，会先清洗）。
   * @param identity - 本次要用的模型与音色；省略时用设置里的回退值。
   * @returns `{ frames }`：一个尚未开始消费的异步迭代器。
   * @throws {Error} 配置缺失时**同步**抛出（还没发请求，不必去等流）。
   */
  openStream(rawText, identity) {
    // prepare 放在外面同步执行：Key 没配、音色没配这类问题应当在发起任何请求
    // 之前就报出来，而不是等第一条流读了一半才炸。
    const { apiKey, model, voiceId, payload } = this.prepare(rawText, identity, 'pcm')

    const pending = (async () => {
      let response
      try {
        response = await fetchWithTimeout(this.fetchImpl, this.endpoint, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
            [SSE_HEADER]: SSE_ENABLED,
            accept: 'text/event-stream',
          },
          body: JSON.stringify(payload),
        }, this.timeoutMs)
      } catch (error) {
        throw new Error(`无法连接百炼服务：${error instanceof Error ? error.message : String(error)}`)
      }
      if (!response.ok) throw new Error(describeFailure(response.status, await response.text()))
      return response
    })()
    // 多条流并行时，靠后那条可能先失败，而它的 promise 此刻还没人 await。
    // 挂一个空 catch 把这次拒绝认领掉，免得冒出 unhandled rejection。
    pending.catch(() => {})

    const sampleRate = STREAM_SAMPLE_RATE
    async function * frames() {
      const response = await pending
      let sawAudio = false
      for await (const frame of readSse(response.body)) {
        const event = interpretSseFrame(frame)
        if (event.kind === 'audio') {
          sawAudio = true
          yield { kind: 'audio', bytes: Buffer.from(event.base64, 'base64'), sampleRate }
        } else if (event.kind === 'failed') {
          throw new Error(event.message)
        } else if (event.kind === 'finish') {
          yield { kind: 'finish', url: event.url, characters: event.characters, model, voiceId }
        }
      }
      if (!sawAudio) throw new Error('百炼没有返回音频数据，请稍后重试。')
    }

    return { frames: frames() }
  }

  /**
   * 流式合成：边合成边把音频块交出来。
   *
   * 生成器而不是回调，是因为"第一块到达""流走完了"这两个时刻由调用方决定怎么写
   * 出去（在 HTTP 层是 SSE 帧），而 generator 让它可以按自己的节奏拉取 —— 顺带
   * 也让它在测试里被 `for await` 消费时无需任何桩件。
   * @param rawText - 要朗读的文本（可以是 Markdown，会先清洗）。
   * @param identity - 本次要用的模型与音色；省略时用设置里的回退值。
   * @returns 依次为 `{ kind: 'audio', bytes, sampleRate }` 与 `{ kind: 'finish', ... }`。
   * @throws {Error} 配置缺失、请求被拒或云端报失败时抛出。
   */
  async * stream(rawText, identity) {
    yield * this.openStream(rawText, identity).frames
  }

  /**
   * 下载合成结果。非流式接口返回一个短期有效的 OSS 地址。
   * @param url - 音频地址。
   * @returns 音频字节。
   */
  async download(url) {
    let response
    try {
      response = await fetchWithTimeout(this.fetchImpl, url, { method: 'GET' }, this.timeoutMs)
    } catch (error) {
      throw new Error(`下载合成音频失败：${error instanceof Error ? error.message : String(error)}`)
    }
    if (!response.ok) throw new Error(`下载合成音频失败（HTTP ${String(response.status)}）`)
    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer)
  }
}
