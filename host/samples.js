/**
 * 音色样本：把复刻用的参考音频**留在本机**，于是它能在之后的每一次合成里复用。
 *
 * ## 为什么需要这一层
 *
 * 百炼的「声音复刻」是**两步**的：上传音频换回一个音色 ID，之后合成只带那个 ID。
 * 音色 ID 是一个长期有效的句柄，所以百炼不需要在合成时再看到音频。
 *
 * MiMo 的音色复刻不是这样。官方文档里，参考音频是**随每一次请求附上的**：
 *
 * ```
 * audio: { format: "wav", voice: "data:audio/mpeg;base64,<整段音频的 base64>" }
 * ```
 *
 * 没有"音色 ID"这种可长期持有的东西——音色是由这一次请求里的那段音频即时复刻出来的。
 * 文档转述里也写得很直白：*"voice clone 只针对单次调用"*。
 *
 * 于是"上传一次、以后都能用"这件事**必须由本地来兜住**：上传时把音频原样存到
 * `~/.dsh/voice/samples/<档案 id>.<扩展名>`，档案里只记这个文件名；每次合成前把文件
 * 读出来、编成 data URL、附在请求的 `audio.voice` 上。
 *
 * ## 为什么文件名用档案 id 而不是内容哈希
 *
 * 两者都能唯一定位一段音频，但档案 id 有一个内容哈希没有的好处：**用户能认出它**。
 * 档案列表里那条"我的声音"旁边对应的就是磁盘上那一个文件，而用户如果自己删了那个
 * 目录，界面能直接告诉他"这个音色的参考音频不见了，请重新上传"——而不是莫名其妙地
 * 合成失败。内容哈希做不到这一点（用户看到的是一串 64 位十六进制）。
 *
 * 扩展名必须保留：`audio/mpeg` 与 `audio/wav` 是两种 MIME，而 MiMo 只认这两个。
 * @module dsh-cosyvoice/samples
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { dshHome } from './harness.js'

/** 样本文件名的合法形态：`<档案 id>.wav|.mp3`。 */
const SAMPLE_NAME = /^[A-Za-z0-9_-]{1,64}\.(?:wav|mp3)$/i

/** MiMo 只接受这两种音频格式，别的（m4a / flac / ogg）一律在上传时就拒掉。 */
export const ACCEPTED_EXTENSIONS = ['wav', 'mp3']

/**
 * 单段参考音频的字节上限。
 *
 * MiMo 的限制是**Base64 之后**不超过 10 MB，而 Base64 会把体积放大 4/3，于是原始
 * 音频实际上限约 7.5 MB。这里取 **7 MB**：留出余量，且超限时给出的提示是用户能
 * 直接照做的（"裁短到 30 秒以内"），而不是一个抽象的字节数。
 */
export const MAX_SAMPLE_BYTES = 7 * 1024 * 1024

/**
 * 样本文件在 data URL 里的 MIME 类型。
 * @param name - 样本文件名或原始上传文件名。
 * @returns MIME 类型。
 */
export function mimeOfSample(name) {
  const ext = extname(String(name ?? '')).toLowerCase().slice(1)
  if (ext === 'wav') return 'audio/wav'
  if (ext === 'mp3') return 'audio/mpeg'
  // 认不出的容器一律按 wav 之外最可能的那个猜；真正的把关在上传时按扩展名拒绝。
  return 'audio/mpeg'
}

/**
 * 把上传的文件名收敛成一个安全的样本文件名。
 *
 * 档案 id 本身已经被约束在 `[A-Za-z0-9_-]` 里，所以这里只处理两件事：扩展名归一
 * （`.MP3` 与 `.mp3` 是同一个东西）与缺失（默认 `wav`，浏览器有时拿不到扩展名）。
 * @param id - 档案 id。
 * @param filename - 上传的原始文件名。
 * @returns 样本文件名。
 */
export function sampleNameFor(id, filename) {
  const raw = String(filename ?? '').trim()
  const ext = extname(raw).toLowerCase().slice(1)
  return `${String(id ?? '').trim()}.${ACCEPTED_EXTENSIONS.includes(ext) ? ext : 'wav'}`
}

/**
 * 样本目录的位置。
 * @returns 绝对路径。
 */
export function resolveSamplesDir() {
  return join(dshHome(), 'voice', 'samples')
}

/**
 * 一个文件名是否是合法的样本名。
 *
 * 用于**读**之前：档案文件是可以被手改的，而这里的文件名会被拼进磁盘路径，
 * 所以对着模式校验是让请求永远走不出这个目录的唯一办法。
 * @param name - 候选文件名。
 * @returns 是否合法。
 */
export function isSampleName(name) {
  const candidate = String(name ?? '')
  if (SAMPLE_NAME.test(candidate)) return true
  // 档案 id 里理论上带点（老的 newProfileId 不带），但历史数据可能有，
  // 于是多给一次"两段都是 id"的机会：`p_abc123.voice`。
  return /^[A-Za-z0-9_-]{1,64}\.[A-Za-z0-9_-]{1,32}\.(?:wav|mp3)$/i.test(candidate)
}

/**
 * 音色样本的读写。
 */
export class VoiceSamples {
  /**
   * @param getDir - 样本目录；默认 harness home 下的固定位置。
   */
  constructor(getDir) {
    this.getDir = getDir ?? resolveSamplesDir
  }

  /** @returns 当前样本目录的绝对路径。 */
  dir() {
    return this.getDir()
  }

  /** 目录不存在则创建。 @returns 目录路径。 */
  ensure() {
    const dir = this.dir()
    mkdirSync(dir, { recursive: true })
    return dir
  }

  /**
   * 把一段参考音频写进样本目录。
   *
   * 同名即覆盖：样本与档案一一对应，用户重新上传同一套音色时不需要清理旧文件。
   * @param options - 写入参数。
   * @param options.id - 档案 id（决定文件名）。
   * @param options.filename - 上传的原始文件名（决定扩展名与 MIME）。
   * @param options.bytes - 音频字节。
   * @returns `{ name, path, bytes, mime }`。
   */
  put({ id, filename, bytes }) {
    const name = sampleNameFor(id, filename)
    const path = join(this.ensure(), name)
    writeFileSync(path, bytes)
    return { name, path, bytes: bytes.length, mime: mimeOfSample(name) }
  }

  /**
   * 读一段参考音频。
   *
   * 返回 undefined 有两种原因，**刻意不区分**：文件不存在（从没上传过），以及
 * 档案被手工改过写了个越界的文件名。调用方看到的都是同一句话——"这个音色的
   * 参考音频不在了，请重新上传"——因为对用户而言这两种情况的处理完全一样。
   * @param name - 样本文件名。
   * @returns `{ name, bytes, mime }`；不可用时返回 undefined。
   */
  read(name) {
    const candidate = String(name ?? '')
    if (!isSampleName(candidate)) return undefined
    const path = join(this.dir(), candidate)
    if (!existsSync(path)) return undefined
    try {
      const bytes = readFileSync(path)
      if (bytes.length === 0) return undefined
      return { name: candidate, bytes, mime: mimeOfSample(candidate) }
    } catch {
      return undefined
    }
  }

  /**
   * 读一段参考音频并编成 MiMo 要的 data URL。
   *
   * 形态是 `data:{MIME};base64,{BASE64}`（官方文档要求前缀必须在，且 MIME 只能是
   * `audio/mpeg` / `audio/mp3` / `audio/wav`）。每次合成都要现编一次——**不缓存
   * 编好的字符串**：一段 7 MB 的音频编完是 9.3 MB 的字符串，把它留在内存里等着一份
 * 档案的 id，而十份档案就是近百 MB，那是拿内存换一次根本不必要的往返。
   * @param name - 样本文件名。
   * @returns data URL；样本不可用时返回 undefined。
   */
  dataUrlOf(name) {
    const sample = this.read(name)
    if (sample === undefined) return undefined
    return `data:${sample.mime};base64,${sample.bytes.toString('base64')}`
  }

  /**
   * 删掉一段参考音频（删档案时调用）。
   *
 * 删不掉不算失败：文件可能已被用户手动清掉，而这不该让"删除一套音色"报错。
   * @param name - 样本文件名。
   * @returns 是否真的删掉了。
   */
  remove(name) {
    const candidate = String(name ?? '')
    if (!isSampleName(candidate)) return false
    const path = join(this.dir(), candidate)
    if (!existsSync(path)) return false
    try {
      rmSync(path, { force: true })
      return true
    } catch {
      return false
    }
  }

  /**
   * 样本的指纹，用在缓存键里。
   *
   * 为什么要算指纹而不是直接用文件名：用户可能把同一套音色的参考音频换掉（文件名
   * 不变，内容变了）。缓存键里带着内容指纹，换了音频就必然重新合成，而不会命中
   * 用旧音频合出来的缓存——那种 bug 极难发现，因为一切看起来都成功了。
   *
   * 用内容哈希而不是 mtime：改一次内容 mtime 一定变，但复制/还原工具会让 mtime 变
   * 而内容不变（于是白付一次钱），哈希则只认内容。
   * @param name - 样本文件名。
   * @returns 短指纹；样本不可用时返回空串。
   */
  fingerprint(name) {
    const sample = this.read(name)
    if (sample === undefined) return ''
    return createHash('sha256').update(sample.bytes).digest('hex').slice(0, 16)
  }
}
