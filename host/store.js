/**
 * 音频存储：本插件自己的音频目录，以及"内容哈希 → 文件"的缓存。
 *
 * 两个决定让这个包可移植：
 *
 * **插件拥有自己的文件。** 它用 `node:fs` 直接写，而不是走面向 agent 的 `fs`
 * 服务——本插件是进程级挂载的，没有 session，无 session 解析出来的策略会退回到
 * 部署级根目录，任何硬编码的工作区路径在别的机器上都是错的。在 harness home
 * 下拥有一个自己的目录，直接消掉了这个问题。
 *
 * **文件名即缓存键。** 相同内容+音色+模型必然算出同一个文件名，命中就是零成本
 * 复用——重复收听、多端看同一会话、设置页反复试听都不再产生费用。
 * @module dsh-cosyvoice/store
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { dshHome } from './harness.js'

/**
 * 缓存文件名：`<64位十六进制>.mp3` 或 `.wav`。
 *
 * 两种扩展名是非实时与实时两条链路各自的产物：前者拿到的是 MP3，后者是 16 位
 * PCM 裸数据、需要由 {@link import('./stream.js').wavFromPcm} 补上 WAV 头才能听。
 * 分开命名于是同一段文字在两种模式下各有各的缓存，互不覆盖也互不当责。
 */
const CACHE_NAME = /^[0-9a-f]{64}\.(?:mp3|wav)$/

/** 非实时链路的产物扩展名。 */
export const EXT_ONE_SHOT = 'mp3'

/** 实时链路的产物扩展名。 */
export const EXT_STREAM = 'wav'

/**
 * 一切 PCM 拼接产物的扩展名。
 *
 * 实时流式、以及角色扮演的多段合成，拿到的都是裸 PCM，补一个 WAV 头才能播。
 * 两者格式一样，于是共用这一个扩展名（值与 {@link EXT_STREAM} 相同，分开命名
 * 只是为了让调用处读起来是在说"这是一份拼出来的 WAV"）。
 */
export const EXT_WAV = 'wav'

/**
 * 一个缓存名该用什么 Content-Type 回应。
 * @param name - 缓存文件名。
 * @returns MIME 类型。
 */
export function mimeOf(name) {
  return String(name ?? '').endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'
}

/**
 * 计算缓存键。
 * @param model - 合成模型。
 * @param voiceId - 音色 ID。
 * @param text - 已清洗的文本。
 * @returns 64 位十六进制字符串。
 */
export function cacheKeyOf(model, voiceId, text) {
  return createHash('sha256').update(`${model}\n${voiceId}\n${text}`, 'utf8').digest('hex')
}

/**
 * 计算一次**多段**合成的缓存键。
 *
 * 角色扮演下一次朗读要发好几个请求，每个都有自己的音色。缓存键必须把"哪一段
 * 用了哪个音色"都算进去：只按全文算的话，换了角色音色却命中旧缓存，念出来还是
 * 旧声音——那种 bug 极难发现，因为一切看起来都成功了。
 *
 * 段之间用控制字符分隔，避免正文里恰好出现分隔符时把两段的内容接成别的意思。
 * @param parts - 段序列，每段带 `kind` / `model` / `voiceId` / `text`。
 * @returns 64 位十六进制字符串。
 */
export function cacheKeyOfParts(parts) {
  const seed = parts
    .map(part => `${part.kind}\u0001${part.model}\u0001${part.voiceId}\u0001${part.text}`)
    .join('\u0002')
  return createHash('sha256').update(seed, 'utf8').digest('hex')
}

/**
 * 本插件的音频目录：配置的覆盖值，否则是 harness home 下插件自有的目录。
 * @param configured - `outputDir` 设置（空表示用默认）。
 * @returns 绝对目录路径。
 */
export function resolveOutputDir(configured) {
  const trimmed = String(configured ?? '').trim()
  return trimmed === '' ? join(dshHome(), 'voice', 'audio') : trimmed
}

/** 拥有一个音频目录：按哈希查找、写入、列举、清理。 */
export class AudioStore {
  /**
   * @param getOutputDir - 每次调用都读当前设置，所以改输出目录无需重启。
   */
  constructor(getOutputDir) {
    this.getOutputDir = getOutputDir
  }

  /** @returns 当前写入的绝对目录。 */
  dir() {
    return resolveOutputDir(this.getOutputDir())
  }

  /** 目录不存在则创建。 @returns 目录路径。 */
  ensure() {
    const dir = this.dir()
    mkdirSync(dir, { recursive: true })
    return dir
  }

  /**
   * 缓存文件名。
   * @param key - 缓存键。
   * @param ext - 产物扩展名；默认 MP3。
   * @returns 文件名。
   */
  nameOf(key, ext = EXT_ONE_SHOT) {
    return `${key}.${ext}`
  }

  /**
   * 命中缓存则返回该音频的描述。
   * @param key - 缓存键。
   * @param ext - 产物扩展名；默认 MP3。
   * @returns 名称、绝对路径与大小；未命中返回 undefined。
   */
  hit(key, ext = EXT_ONE_SHOT) {
    const name = this.nameOf(key, ext)
    const path = join(this.dir(), name)
    if (!existsSync(path)) return undefined
    try {
      return { name, path, bytes: statSync(path).size }
    } catch {
      return undefined
    }
  }

  /**
   * 写入一段音频（同名即覆盖，因为同键必然同内容）。
   * @param key - 缓存键。
   * @param bytes - 音频字节。
   * @param ext - 产物扩展名；默认 MP3。
   * @returns 名称、绝对路径与大小。
   */
  put(key, bytes, ext = EXT_ONE_SHOT) {
    const dir = this.ensure()
    const name = this.nameOf(key, ext)
    const path = join(dir, name)
    writeFileSync(path, bytes)
    return { name, path, bytes: bytes.length }
  }

  /**
   * 把一个缓存名解析成目录内的路径。
   *
   * 名字要对着缓存名模式校验，而不是简单拼接，所以请求永远走不出这个目录。
   * @param name - 要解析的文件名。
   * @returns 绝对路径；不是合法缓存名或文件不存在时返回 undefined。
   */
  pathOf(name) {
    const candidate = String(name ?? '')
    if (!CACHE_NAME.test(candidate)) return undefined
    const path = join(this.dir(), candidate)
    return existsSync(path) ? path : undefined
  }

  /**
   * 目录里的音频数量。
   * @returns 文件数。
   */
  count() {
    const dir = this.dir()
    if (!existsSync(dir)) return 0
    try {
      return readdirSync(dir).filter(entry => CACHE_NAME.test(entry)).length
    } catch {
      return 0
    }
  }

  /**
   * 删除目录里的全部音频。
   * @returns 删除数量。
   */
  clear() {
    const dir = this.dir()
    if (!existsSync(dir)) return 0
    let removed = 0
    let entries = []
    try {
      entries = readdirSync(dir).filter(entry => CACHE_NAME.test(entry))
    } catch {
      return 0
    }
    for (const name of entries) {
      try {
        rmSync(join(dir, name), { force: true })
        removed += 1
      } catch {
        // 被播放器锁住的文件跳过，不算失败。
      }
    }
    return removed
  }
}
