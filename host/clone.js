/**
 * 音色克隆：上传一段音频，走完百炼「声音复刻」的整条链，返回一个可直接合成的音色 ID。
 *
 * 链路是四步，一步都不能省：
 *
 * ```
 * ① POST /api/v1/files            上传音频            → file_id
 * ② GET  /api/v1/files/{file_id}  取内网临时 URL      → url
 * ③ POST /tts/customization       create_voice        → voice_id
 * ④ POST /tts/customization       query_voice（轮询）  → DEPLOYING → OK
 * ```
 *
 * **② 不是多余的一步**：`create_voice` 的 `url` 只接受阿里云**内网可访问**的地址，
 * 直接把公网直链递过去会报 `AudioSilentError`。这正是必须走 Files 接口、也因此
 * 用户不必自己准备 OSS 的原因。
 *
 * 与 {@link import('./speech.js').SpeechClient} 一样，fetch 可注入，于是这四步在
 * 测试里都能用假响应复现，不花钱也不联网。
 * @module dsh-cosyvoice/clone
 */

/** 百炼文件接口。 */
export const FILES_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/files'

/** 百炼声音定制接口（复刻、查询、列举都在这一个端点上，靠 `action` 区分）。 */
export const CUSTOMIZATION_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/customization'

/** 声音注册用的模型名；它与"合成模型"是两个概念，别混。 */
export const ENROLLMENT_MODEL = 'voice-enrollment'

/** 单次上传的字节上限。10~20 秒的 48kHz WAV 通常在几 MB 内，20MB 足够宽松。 */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

/** 上传/取 URL 的超时（毫秒）：音频越大越久，所以比一般接口宽。 */
export const UPLOAD_TIMEOUT_MS = 120000

/** 注册/查询接口的超时（毫秒）。 */
export const ENROLL_TIMEOUT_MS = 60000

/** 前缀允许的字符集：百炼只接受数字与小写字母。 */
const PREFIX_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz'

/** 前缀长度上限（百炼约束）。 */
const PREFIX_MAX = 10

/**
 * 生成一个合法的音色前缀。
 * @param length - 随机部分的长度。
 * @returns 前缀（含 `dsh` 标识，便于在控制台里认出是本插件建的）。
 */
export function randomPrefix(length = 6) {
  let out = ''
  for (let i = 0; i < length; i += 1) out += PREFIX_CHARS[Math.floor(Math.random() * PREFIX_CHARS.length)]
  return `dsh${out}`.slice(0, PREFIX_MAX)
}

/**
 * 把一个任意输入收敛成合法前缀：小写化、剔掉非法字符、截断。
 * @param raw - 用户输入。
 * @returns 合法前缀；全被剔光时返回 undefined，交给调用方去随机一个。
 */
export function normalizePrefix(raw) {
  const cleaned = String(raw ?? '').toLowerCase().replace(/[^0-9a-z]/g, '').slice(0, PREFIX_MAX)
  return cleaned === '' ? undefined : cleaned
}

/**
 * 按扩展名猜一个上传用的 Content-Type。
 *
 * 猜不出来就用 `application/octet-stream`：百炼按 `purpose` 处理上传，MIME 只是
 * 附带信息，猜错不会失败，但猜对了控制台里更好认。
 * @param filename - 原文件名。
 * @returns MIME 类型。
 */
export function audioContentType(filename) {
  const ext = String(filename ?? '').toLowerCase().split('.').pop() ?? ''
  if (ext === 'wav' || ext === 'wave') return 'audio/wav'
  if (ext === 'mp3') return 'audio/mpeg'
  if (ext === 'm4a') return 'audio/mp4'
  if (ext === 'aac') return 'audio/aac'
  if (ext === 'flac') return 'audio/flac'
  if (ext === 'ogg' || ext === 'oga') return 'audio/ogg'
  if (ext === 'opus') return 'audio/opus'
  if (ext === 'webm') return 'audio/webm'
  return 'application/octet-stream'
}

/**
 * 把 HTTP 状态码与正文翻成一句人能看懂的中文提示。
 *
 * 复刻失败的原因对用户来说几乎全是不可见的（音频质量问题、配额、模型不匹配），
 * 所以这里把百炼给的 `message` 原样带上，否则用户只能看到"失败"两个字。
 * @param status - HTTP 状态码。
 * @param bodyText - 响应正文。
 * @returns 面向用户的错误说明。
 */
export function describeCloneFailure(status, bodyText) {
  const text = String(bodyText ?? '').trim()
  let detail = ''
  try {
    const parsed = JSON.parse(text)
    detail = String(parsed?.message ?? parsed?.error?.message ?? '').trim()
  } catch {
    detail = text.slice(0, 200)
  }
  const suffix = detail === '' ? '' : `（${detail}）`

  if (status === 401 || status === 403) return `API Key 无效或无权限${suffix}。`
  if (status === 400) {
    // 这一类最常出现：音频太短 / 静音 / 采样率不对，百炼统一报 AudioSilent 一类。
    if (/silent|audio/i.test(detail)) return `音频不符合复刻要求${suffix}。建议用 48kHz 的 WAV，录 10~20 秒清晰人声。`
    return `复刻请求被拒绝${suffix}。`
  }
  if (status === 404) return `找不到这个资源${suffix}，请重试。`
  if (status === 429) return `请求过于频繁，或音色配额已满（上限 30 个）${suffix}。`
  if (status >= 500) return `百炼服务暂时不可用${suffix}，请稍后重试。`
  return `音色复刻失败（HTTP ${String(status)}）${suffix}`
}

/**
 * 把响应正文里的状态字段抠出来。
 *
 * 百炼这套接口的返回形状在不同版本间挪过位置（`output.status` /
 * `output.voice_status` / `output.voice.status` / `output.voice_list[0].status`），
 * 只认其中一处的话，形状一变就会永远卡在"复刻中"。所以这里全看一遍，取第一个
 * 有值的 —— 认错形状的代价（永远转圈）远大于多看几个字段的代价。
 * @param payload - 解析后的响应。
 * @returns 大写的状态串；实在找不到时返回 `'UNKNOWN'`。
 */
export function pickStatus(payload) {
  const output = payload?.output ?? {}
  const list = Array.isArray(output.voice_list) ? output.voice_list : []
  const candidates = [
    output.status,
    output.voice_status,
    output.voice?.status,
    list[0]?.status,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value !== '') return value.toUpperCase()
  }
  return 'UNKNOWN'
}

/**
 * 从响应正文里取音色 ID，同样多认几处。
 * @param payload - 解析后的响应。
 * @returns 音色 ID；没有时返回 undefined。
 */
export function pickVoiceId(payload) {
  const output = payload?.output ?? {}
  const list = Array.isArray(output.voice_list) ? output.voice_list : []
  const candidates = [output.voice_id, output.voice?.voice_id, list[0]?.voice_id]
  for (const value of candidates) {
    if (typeof value === 'string' && value !== '') return value
  }
  return undefined
}

/** 已知的合成模型名；音色 ID 通常以它打头（`{model}-{prefix}-{唯一标识}`）。 */
export const KNOWN_MODELS = [
  'cosyvoice-v3.5-plus',
  'cosyvoice-v3.5-flash',
  'cosyvoice-v3-plus',
  'cosyvoice-v3-flash',
  'cosyvoice-v2',
  'cosyvoice-v1',
]

/**
 * 从音色 ID 反推它是用哪个模型注册的。
 *
 * 猜不出来就返回 undefined —— 这时档案留空模型，合成时回落设置里的模型，用户
 * 发现不匹配也可以自己改。猜错模型的代价是 418，所以宁可留空也不硬猜。
 * @param voiceId - 音色 ID。
 * @returns 模型名；猜不出时返回 undefined。
 */
export function modelFromVoiceId(voiceId) {
  const id = String(voiceId ?? '')
  for (const model of KNOWN_MODELS) {
    if (id.startsWith(`${model}-`)) return model
  }
  return undefined
}

/**
 * 一个状态串意味着什么。
 * @param status - 百炼给的状态（大写）。
 * @returns `ready` / `pending` / `failed`。
 */
export function phaseOfStatus(status) {
  const value = String(status ?? '').toUpperCase()
  if (value === 'OK' || value === 'READY' || value === 'DEPLOYED') return 'ready'
  if (value === 'UNDEPLOYED' || value === 'FAILED' || value === 'ERROR') return 'failed'
  // DEPLOYING、UNKNOWN 以及任何没见过的都当"还在路上"：
  // 轮询的意义就是再等一次，过早判死会让几秒后才就绪的音色被误报失败。
  return 'pending'
}

/** 声音复刻客户端。 */
export class VoiceCloner {
  /**
   * @param options - 协作者。
   * @param options.getSettings - 读取当前设置（要拿 API Key 与默认模型）。
   * @param options.fetchImpl - 可注入的 fetch。
   * @param options.filesEndpoint - 文件接口地址。
   * @param options.customEndpoint - 定制接口地址。
   */
  constructor({
    getSettings,
    fetchImpl = globalThis.fetch,
    filesEndpoint = FILES_ENDPOINT,
    customEndpoint = CUSTOMIZATION_ENDPOINT,
  }) {
    this.getSettings = getSettings
    this.fetchImpl = fetchImpl
    this.filesEndpoint = filesEndpoint
    this.customEndpoint = customEndpoint
  }

  /**
   * 当前 API Key。
   * @returns Key。
   * @throws {Error} 未配置时抛出。
   */
  apiKey() {
    const key = String(this.getSettings()?.apiKey ?? '').trim()
    if (key === '') throw new Error('未配置 API Key。请在 设置 → 语音 中填写阿里云百炼的 Key。')
    return key
  }

  /**
   * 发一个带超时与错误翻译的请求。
   * @param url - 目标地址。
   * @param init - 请求参数（不含 signal）。
   * @param timeoutMs - 超时毫秒数。
   * @returns 解析后的 JSON。
   */
  async call(url, init, timeoutMs) {
    let response
    try {
      response = await this.fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    } catch (error) {
      throw new Error(`无法连接百炼服务：${error instanceof Error ? error.message : String(error)}`)
    }
    const bodyText = await response.text()
    if (!response.ok) throw new Error(describeCloneFailure(response.status, bodyText))
    try {
      return JSON.parse(bodyText)
    } catch {
      throw new Error('百炼返回的内容不是合法 JSON，请稍后重试。')
    }
  }

  /**
   * ① 上传音频到百炼文件服务。
   * @param options - 上传参数。
   * @param options.bytes - 音频字节。
   * @param options.filename - 原文件名（用来猜 MIME，也进控制台的列表）。
   * @param options.description - 可选描述。
   * @returns `file_id`。
   */
  async upload({ bytes, filename, description }) {
    const form = new FormData()
    // FormData 会自己带上带边界的 Content-Type，手动设一个反而会丢掉 boundary。
    form.append('files', new Blob([bytes], { type: audioContentType(filename) }), filename || 'voice.wav')
    form.append('purpose', 'voice_clone')
    form.append('descriptions', String(description ?? '').trim() || 'dsh-cosyvoice 音色复刻')

    const payload = await this.call(this.filesEndpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey()}` },
      body: form,
    }, UPLOAD_TIMEOUT_MS)

    const fileId = payload?.data?.uploaded_files?.[0]?.file_id
    if (typeof fileId !== 'string' || fileId === '') throw new Error('百炼没有返回 file_id，请稍后重试。')
    return fileId
  }

  /**
   * ② 取文件在阿里云内网的临时访问地址。
   * @param fileId - 上一步拿到的 id。
   * @returns 内网 URL。
   */
  async fileUrl(fileId) {
    const payload = await this.call(`${this.filesEndpoint}/${encodeURIComponent(fileId)}`, {
      method: 'GET',
      headers: { authorization: `Bearer ${this.apiKey()}` },
    }, UPLOAD_TIMEOUT_MS)
    const url = payload?.data?.url
    if (typeof url !== 'string' || url === '') throw new Error('百炼没有返回音频的内网地址，请稍后重试。')
    return url
  }

  /**
   * ③ 用一段音频注册一个音色。
   * @param options - 注册参数。
   * @param options.url - 内网可访问的音频地址。
   * @param options.prefix - 音色前缀（数字与小写字母）。
   * @param options.targetModel - 目标合成模型；必须与之后合成所用模型一致。
   * @returns 音色 ID。
   */
  async createVoice({ url, prefix, targetModel }) {
    const payload = await this.call(this.customEndpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey()}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: ENROLLMENT_MODEL,
        input: {
          action: 'create_voice',
          target_model: targetModel,
          prefix,
          url,
          language_hints: ['zh'],
        },
      }),
    }, ENROLL_TIMEOUT_MS)
    const voiceId = pickVoiceId(payload)
    if (voiceId === undefined) throw new Error('百炼没有返回音色 ID，请稍后重试。')
    return voiceId
  }

  /**
   * ④ 查一个音色的就绪状态。
   * @param voiceId - 音色 ID。
   * @returns 音色 ID、原始状态与判定结果。
   */
  async queryVoice(voiceId) {
    const payload = await this.call(this.customEndpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: ENROLLMENT_MODEL, input: { action: 'query_voice', voice_id: voiceId } }),
    }, ENROLL_TIMEOUT_MS)
    const status = pickStatus(payload)
    return { voiceId, status, phase: phaseOfStatus(status) }
  }

  /**
   * 列出账号在百炼上已有的全部音色（控制台里手建的也在）。
   * @returns 音色清单 `[{ voiceId, status, phase }]`。
   */
  async listVoices() {
    const payload = await this.call(this.customEndpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: ENROLLMENT_MODEL, input: { action: 'list_voice' } }),
    }, ENROLL_TIMEOUT_MS)
    const list = Array.isArray(payload?.output?.voice_list) ? payload.output.voice_list : []
    return list
      .map(entry => ({
        voiceId: String(entry?.voice_id ?? '').trim(),
        status: String(entry?.status ?? '').toUpperCase(),
      }))
      .filter(entry => entry.voiceId !== '')
      .map(entry => ({ ...entry, phase: phaseOfStatus(entry.status) }))
  }

  /**
   * 一次走完 ①②③。
   * @param options - 复刻参数。
   * @param options.bytes - 音频字节。
   * @param options.filename - 原文件名。
   * @param options.prefix - 想要的前缀；不合法或省略时随机一个。
   * @param options.targetModel - 目标模型。
   * @returns 音色 ID 与实际使用的前缀。
   */
  async clone({ bytes, filename, prefix, targetModel }) {
    const fileId = await this.upload({ bytes, filename })
    const url = await this.fileUrl(fileId)
    const used = normalizePrefix(prefix) ?? randomPrefix()
    const voiceId = await this.createVoice({ url, prefix: used, targetModel })
    return { voiceId, prefix: used, fileId }
  }
}
