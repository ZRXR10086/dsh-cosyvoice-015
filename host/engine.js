/**
 * 合成引擎路由：按音色档案绑定的模型，把一次合成交给对应的那一家。
 *
 * ## 为什么是路由而不是"一个客户端里判断模型"
 *
 * 两家的请求形状几乎没有交集（见 `./mimo.js` 头注释的对照表）：端点不同、文本落在
 * 不同的消息角色、音色的带法不同、流式的帧格式不同。把它们塞进一个类里，于是每
 * 一个方法都长成一个 `if (isMimo(model)) … else …` 的双分支——而合成链路上有**四个**
 * 这样的方法（准备、整段合成、开流、流式消费），八个分支里漏掉一个就是"某一种
 * 组合下请求体缺字段"，而这类 bug 只在那个特定组合被点一次时才现形。
 *
 * 分成两个各自纯粹的客户端 + 一个只做分发的路由器之后，两个客户端里**一个 MiMo 相关
 * 的判断都没有**，路由器的判断只有一个且发生在最外层。新增第三家引擎时，这里加一个
 * 分支、旁边加一个文件，两个已有文件都不用动。
 *
 * ## 路由器还顺手统一了两件事
 *
 * **格式名。** 上层说的 `pcm` 是"裸采样、要拿去拼接"的内部意思；百炼线上就叫
 * `pcm`，MiMo 线上必须叫 `pcm16`。转换发生在客户端里（`formatFor`），
 * 于是 `synth.js` 那边的"角色扮演要拼音频所以用 pcm"这句话对两家都成立。
 *
 * **流式能力。** MiMo 的设计/复刻两款流式是兼容模式（等整段合成完才一次性返回），
 * 但那**不是本插件该拦的事**——上层的排期、落盘、缓存全都能处理"第一帧就很大"，
 * 拦住只会让用户少一个选择。所以路由**照常走流式**，只是把"这款流式不是低延迟"
 * 这件事如实报到界面上去（由 `models.js` 的 `streaming` 字段负责）。
 * @module dsh-cosyvoice/engine
 */

import { isMimo, kindOf, normalizeModel, providerOf } from './models.js'
import { MimoSpeechClient } from './mimo.js'
import { SpeechClient } from './speech.js'

/**
 * 把内部的音频格式名翻译成某一家线上用的字面量。
 * @param provider - `mimo` / `dashscope`。
 * @param format - 内部格式名（`mp3` / `wav` / `pcm`）。
 * @returns 线上格式名。
 */
export function formatFor(provider, format) {
  const key = String(format ?? '').trim()
  if (provider !== 'mimo') return key === 'pcm' ? 'pcm' : key
  // MiMo 侧：`pcm` 在线上写作 `pcm16`，其余（mp3 / wav）同名。
  if (key === 'pcm') return 'pcm16'
  return key === '' ? 'mp3' : key
}

/**
 * 按模型分发的合成引擎。
 */
export class SpeechEngine {
  /**
   * @param options - 协作者。
   * @param options.getSettings - 读取当前设置（两个客户端各自要不同的 Key）。
   * @param options.samples - 本地音色样本仓库；只有 MiMo 复刻音色会用到。
   * @param options.dashscope - 百炼客户端；省略时按默认配置新建。
   * @param options.mimo - MiMo 客户端；省略时按默认配置新建。
   */
  constructor({ getSettings, samples, dashscope, mimo }) {
    this.getSettings = getSettings
    this.samples = samples
    this.dashscope = dashscope ?? new SpeechClient({ getSettings })
    this.mimo = mimo ?? new MimoSpeechClient({ getSettings, samples })
  }

  /**
   * 这一段该走哪一家。
   *
   * 模型的归属来自音色档案（见 `./models.js`），而这里只做一次归一化：`voiceId` 之类的
   * 字段由调用方（`synth.js`）按档案填好，本类不解释它们。
   * @param identity - 本次的模型与音色。
   * @returns 该用的那个客户端。
   */
  clientFor(identity) {
    const model = normalizeModel(identity?.model)
    return isMimo(model) ? this.mimo : this.dashscope
  }

  /**
   * 合成一段文本，返回音频字节。
   * @param rawText - 要朗读的文本。
   * @param identity - 本次的模型与音色。
   * @param format - 内部音频格式名。
   * @returns 合成结果。
   * @throws {Error} 配置缺失或合成失败时抛出。
   */
  async synthesize(rawText, identity, format) {
    const provider = providerOf(identity?.model)
    const client = this.clientFor(identity)
    // MiMo 的音色来源要显式告诉客户端（预置名 / 描述 / 本地样本三选一），
    // 百炼那侧不关心这个字段，所以带上它是无害的。
    const enriched = provider === 'mimo' ? { ...identity, kind: voiceKindFor(identity) } : identity
    return client.synthesize(rawText, enriched, formatFor(provider, format))
  }

  /**
   * 开一条流，但**不开始消费**。
   * @param rawText - 要朗读的文本。
   * @param identity - 本次的模型与音色。
   * @returns `{ frames }`。
   * @throws {Error} 配置缺失时**同步**抛出。
   */
  openStream(rawText, identity) {
    const provider = providerOf(identity?.model)
    const client = this.clientFor(identity)
    const enriched = provider === 'mimo' ? { ...identity, kind: voiceKindFor(identity) } : identity
    return client.openStream(rawText, enriched)
  }

  /**
   * 流式合成：边合成边把音频块交出来。
   * @param rawText - 要朗读的文本。
   * @param identity - 本次的模型与音色。
   * @returns 帧序列。
   */
  async * stream(rawText, identity) {
    yield * this.openStream(rawText, identity).frames
  }
}

/**
 * 这一段要用的音色来源（预置 / 复刻 / 设计）。
 *
 * 优先听调用方显式给的（`synth.js` 从音色档案里读出来的 `voiceKind`，那是最准的），
 * 否则按模型查目录。**不在这里重新判断"哪个模型是复刻"** —— 那份知识属于
 * `./models.js`，复制一份的代价是目录里改了而这里没改，于是复刻音色被当成预置音色
 * （拿音色名去问接口，报"音色不存在"）这类错误要到用户点了播放才现形。
 * @param identity - 本次的模型与音色。
 * @returns `clone` / `preset` / `design`。
 */
function voiceKindFor(identity) {
  const explicit = String(identity?.voiceKind ?? '').trim()
  if (explicit !== '') return explicit
  return kindOf(identity?.model)
}
