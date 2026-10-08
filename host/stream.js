/**
 * 流式合成这一半的两件小事：读百炼的 SSE、以及把拿到的裸 PCM 包成 WAV。
 *
 * 为什么需要它们：
 *
 * **SSE 要自己解析。** Node 的 `fetch` 只把响应体整段交出来，而流式接口想让我们
 * 在每一句合成完的那一刻就把字节推出去；浏览器端的 `EventSource` 又只能发 GET，
 * 带不动整条回答的文本。于是两端各自拿着一个手写的 SSE 解析器：这一份读云端，
 * `client/shared.js` 里那一份读本插件。
 *
 * **流式给的是裸 PCM。** 云端按句返回 16 位小端单声道采样，没有容器。浏览器播不
 * 了裸数据，缓存也落不了盘，所以这里补一个 44 字节的 WAV 头 —— 不重编码、没有
 * 依赖，只是把采样包装成一个播放器认得的盒子。
 * @module dsh-cosyvoice/stream
 */

/** 流式链路请求的采样率；同时是 WAV 头里要写的值，必须两边一致。 */
export const STREAM_SAMPLE_RATE = 24000

/** 流式链路的位深（16 位）与声道数（单声道）。 */
export const STREAM_BITS = 16

/** 流式链路的声道数。 */
export const STREAM_CHANNELS = 1

/**
 * 把一个响应体变成字节序列。
 *
 * 三种形状都要接住：Node fetch 给的是 web `ReadableStream`，假 fetch（测试）给的是
 * async iterable 或 Node Readable。`ReadableStream` 有没有实现 async iterator 取决于
 * 运行时版本，所以这里显式走 `getReader()`，不去赌那个 Symbol。
 * @param source - 响应体。
 * @returns 字节块（Uint8Array）序列。
 */
async function* iterateBytes(source) {
  if (source === undefined || source === null) return
  if (typeof source.getReader === 'function') {
    const reader = source.getReader()
    try {
      while (true) {
        const next = await reader.read()
        if (next.done) return
        yield next.value
      }
    } finally {
      // 有些实现要求解锁，锁着也不影响本次流；吞掉即可。
      try { reader.releaseLock?.() } catch { /* 无所谓 */ }
    }
    return
  }
  if (typeof source[Symbol.asyncIterator] === 'function') {
    yield* source
  }
}

/**
 * 切出一个 SSE 帧。
 *
 * 换行可能是 `\r\n`，所以先归一；`atob` 式的注释行（`: xxx`）不在处理范围内，
 * 它们本来就没有 data。
 * @param frame - 不含结尾空行的原始帧文本。
 * @returns 事件名与 data；没有 data 行时为 undefined。
 */
export function parseSseFrame(frame) {
  let name = ''
  const lines = []
  for (const raw of String(frame).split('\n')) {
    const line = raw.trim()
    if (line === '') continue
    const colon = line.indexOf(':')
    const key = colon < 0 ? line : line.slice(0, colon).trim()
    const value = colon < 0 ? '' : line.slice(colon + 1).trim()
    if (key === 'event') name = value
    else if (key === 'data') lines.push(value)
  }
  if (lines.length === 0) return undefined
  return { event: name, data: lines.join('\n') }
}

/**
 * 读一条 SSE 流。
 * @param source - 响应体（web 流 / async iterable / Node Readable）。
 * @returns `{ event, data }` 序列。
 */
export async function* readSse(source) {
  let buffer = ''
  for await (const chunk of iterateBytes(source)) {
    buffer += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8')
    // 一次读到半块是常态：TCP 不保证帧边界，所以留下尾巴等下一趟。
    let at = buffer.indexOf('\n\n')
    while (at >= 0) {
      const frame = parseSseFrame(buffer.slice(0, at))
      buffer = buffer.slice(at + 2)
      if (frame !== undefined) yield frame
      at = buffer.indexOf('\n\n')
    }
  }
  // 有些实现在最后一个事件后不给空行。
  if (buffer.trim() !== '') {
    const frame = parseSseFrame(buffer)
    if (frame !== undefined) yield frame
  }
}

/**
 * 在一棵对象里按一组候选路径取值。
 * @param root - 起点。
 * @param paths - 点分路径，例如 `'output.audio.data'`。
 * @returns 第一个非空值。
 */
function pickPath(root, paths) {
  for (const path of paths) {
    let node = root
    let ok = true
    for (const key of path.split('.')) {
      if (node === null || node === undefined || typeof node !== 'object') { ok = false; break }
      node = node[key]
    }
    if (!ok || node === undefined) continue
    if (typeof node === 'string' && node !== '') return node
    if (typeof node === 'number') return String(node)
  }
  return undefined
}

/**
 * 深度限制内的第一次命中。
 *
 * 云端不同文档版本把同一份东西放在不同深度（`payload.data` / `output.audio.data`
 * / `output.audio`），与其手抄全部组合，不如一次浅搜；深度卡在 4 层是因为真实
 * 结构从未更深，而无限递归会把一次响应解析变成一次 DoS。
 * @param node - 当前节点。
 * @param keys - 要认的字段名。
 * @param depth - 剩余深度。
 * @returns 命中值。
 */
function findDeep(node, keys, depth) {
  if (depth <= 0 || node === null || node === undefined || typeof node !== 'object') return undefined
  for (const key of keys) {
    const value = node[key]
    if (typeof value === 'string' && value !== '') return value
    if (typeof value === 'number') return String(value)
  }
  for (const key of Object.keys(node)) {
    const found = findDeep(node[key], keys, depth - 1)
    if (found !== undefined) return found
  }
  return undefined
}

/** Base64：只含字母数字与 `+/=`。 */
const BASE64 = /^[A-Za-z0-9+/=]+$/

/**
 * 一段 Base64 像不像音频。
 *
 * 门槛刻意压得很低（十几个字符）：真实链路里一小块 PCM 就可能只有几十个采样，
 * 而"像不像"这件事本来也不是靠长度判的 —— 关键在它出现在哪个字段上、以及它是
 * 不是一个 URL。
 * @param value - 候选值。
 * @returns 是否可以按音频解出来。
 */
function looksLikeAudio(value) {
  return BASE64.test(value) && value.length >= 8 && !value.startsWith('http')
}

/**
 * 从一个 SSE 帧里取出音频 Base64。
 * @param parsed - 已解析的 data。
 * @returns Base64 字符串；没有音频时返回 undefined。
 */
export function pickAudio(parsed) {
  const candidates = ['output.audio.data', 'payload.data', 'payload.audio', 'output.audio', 'data', 'audio']
  for (const path of candidates) {
    const value = pickPath(parsed, [path])
    if (value !== undefined && looksLikeAudio(value)) return value
  }
  const deep = findDeep(parsed, ['audio', 'audio_data'], 4)
  if (deep !== undefined && looksLikeAudio(deep)) return deep
  return undefined
}

/**
 * 从一个 SSE 帧里取出完整音频地址（最后一个包里带着，24 小时有效）。
 * @param parsed - 已解析的 data。
 * @returns URL；没有时返回 undefined。
 */
export function pickUrl(parsed) {
  const value = pickPath(parsed, ['output.audio.url', 'output.url', 'url'])
  if (typeof value === 'string' && value.startsWith('http')) return value
  return findDeep(parsed, ['url'], 4)
}

/**
 * 从一个 SSE 帧里取出计费字符数。
 * @param parsed - 已解析的 data。
 * @returns 字符数；缺失时为 0。
 */
export function pickCharacters(parsed) {
  const value = pickPath(parsed, ['usage.characters', 'output.usage.characters', 'characters'])
  const count = Number(value ?? 0)
  return Number.isFinite(count) ? count : 0
}

/**
 * 一个 SSE 帧说了什么。
 *
 * 事件名可能在 SSE 的 `event:` 行上，也可能只写在 data 的 `header.event` 里 ——
 * 两种都见过。认名字时不挑这两处：发生在句子上的三个事件（begin / synthesis /
 * end）与终态（finished / failed）才是唯一要区分的东西。
 * @param frame - `{ event, data }`。
 * @returns 语义化的帧：`{ kind: 'begin' | 'audio' | 'end' | 'finish' | 'failed' | 'ignored' }`。
 */
export function interpretSseFrame(frame) {
  let parsed
  try {
    parsed = JSON.parse(frame.data)
  } catch {
    // 非 JSON 的 data（比如某个注释场面）一律忽略，而不是让整次流式失败。
    return { kind: 'ignored', text: frame.data }
  }
  if (parsed === null || typeof parsed !== 'object') return { kind: 'ignored', text: frame.data }

  const named = frame.event !== '' ? frame.event : ''
  const embedded = pickPath(parsed, ['header.event', 'output.event', 'event']) ?? ''
  const name = named !== '' ? named : embedded

  if (name === 'sentence-begin' || name === 'start') return { kind: 'begin' }
  if (name === 'sentence-end') return { kind: 'end' }
  if (name === 'failed' || name === 'error') {
    return { kind: 'failed', message: pickPath(parsed, ['header.error_message', 'output.error_message', 'message']) ?? '流式合成失败' }
  }

  const audio = pickAudio(parsed)
  if (audio !== undefined) return { kind: 'audio', base64: audio }
  if (name === 'sentence-synthesis' || name === 'result' || name === 'finished' || name === 'complete') {
    const url = pickUrl(parsed)
    const characters = pickCharacters(parsed)
    if (url !== undefined) return { kind: 'finish', url, characters }
    if (name === 'finished' || name === 'complete') return { kind: 'finish', url: undefined, characters }
  }
  return { kind: 'ignored', text: frame.data }
}

/**
 * 给裸 PCM 补一个 WAV 头。
 *
 * 不重编码，所以这段操作是 O(1) 的一次拷贝 —— 顺手做的事不该成为流式链路上的
 * 一段延迟。
 * @param bytes - 16 位小端、单声道采样。
 * @param sampleRate - 采样率。
 * @returns 可直接落在磁盘与 `<audio>` 上的 WAV 字节。
 */
export function wavFromPcm(bytes, sampleRate = STREAM_SAMPLE_RATE) {
  const payload = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
  const byteRate = sampleRate * STREAM_CHANNELS * (STREAM_BITS / 8)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + payload.length, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(STREAM_CHANNELS, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(STREAM_CHANNELS * (STREAM_BITS / 8), 32)
  header.writeUInt16LE(STREAM_BITS, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(payload.length, 40)
  return Buffer.concat([header, payload])
}
