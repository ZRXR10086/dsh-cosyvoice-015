/**
 * 音色档案：多套音色（名称 + 音色 ID + 模型）的本地清单，以及"当前用哪一套"。
 *
 * **为什么自管一个 JSON 而不塞进插件配置 schema**：
 *
 * - schemastery 的**数组结构**经由 `ConfigForms` 做「按路径增量写入」时行为不可靠，
 *   复合结构尤其容易踩坑；
 * - 设置页本就是**自绘 UI**（`settings.section` slot），不受 schema 渲染能力的限制；
 * - 音色克隆落盘时要带 `status` 状态机（`pending → ready / failed`），自管更直接。
 *
 * **为什么放在 harness home 的 voice 目录而不跟随 `outputDir`**：档案是配置而不是
 * 音频。改输出目录不该让档案消失，"清空缓存"也不该顺手删掉用户攒的音色。
 * @module dsh-cosyvoice/profiles
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { dshHome } from './harness.js'

/** 档案文件格式版本。将来结构变了可以据此迁移。 */
export const PROFILES_VERSION = 1

/** `source` 的合法取值。 */
export const PROFILE_SOURCES = ['clone', 'manual', 'cloud']

/** `status` 的合法取值。 */
export const PROFILE_STATUSES = ['ready', 'pending', 'failed']

/**
 * 档案文件的位置。
 * @returns 绝对路径。
 */
export function resolveProfilesPath() {
  return join(dshHome(), 'voice', 'profiles.json')
}

/**
 * 一份空档案（文件缺失或读不出来时的兜底）。
 * @returns 空数据。
 */
function emptyData() {
  return { version: PROFILES_VERSION, activeId: '', profiles: [] }
}

/**
 * 生成一个档案 id。
 * @returns 短 id。
 */
export function newProfileId() {
  return `p_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

/**
 * 把任意读到的对象收敛成一个合法档案条目。
 * @param raw - 读到的原始条目。
 * @returns 规范化的档案。
 */
function normalize(raw) {
  const source = typeof raw.source === 'string' && PROFILE_SOURCES.includes(raw.source) ? raw.source : 'manual'
  const status = typeof raw.status === 'string' && PROFILE_STATUSES.includes(raw.status) ? raw.status : 'ready'
  const out = {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : newProfileId(),
    name: String(raw.name ?? '').trim(),
    voiceId: String(raw.voiceId ?? '').trim(),
    model: String(raw.model ?? '').trim(),
    source,
    status,
  }
  // 没给时间戳就不带这个键，于是"部分更新"不会把已有的 createdAt 抹成 undefined。
  if (typeof raw.createdAt === 'string') out.createdAt = raw.createdAt
  return out
}

/** 音色档案的读写。 */
export class VoiceProfiles {
  /**
   * @param getPath - 档案文件位置；默认 harness home 下的固定位置。
   */
  constructor(getPath) {
    this.getPath = getPath ?? resolveProfilesPath
  }

  /** @returns 当前档案文件的绝对路径。 */
  path() {
    return this.getPath()
  }

  /**
   * 读取全部档案。
   *
   * 任何损坏（文件不存在、JSON 坏掉、字段类型不对）都退化成空档案而不是抛错：
   * 一个坏掉的配置文件不该让整个插件挂掉，用户重新加一套音色就能恢复。
   * @returns 规范化后的数据。
   */
  load() {
    let text = ''
    try {
      text = readFileSync(this.path(), 'utf8')
    } catch {
      return emptyData()
    }
    let parsed = undefined
    try {
      parsed = JSON.parse(text)
    } catch {
      return emptyData()
    }
    if (parsed === null || typeof parsed !== 'object') return emptyData()
    const raw = Array.isArray(parsed.profiles) ? parsed.profiles : []
    return {
      version: PROFILES_VERSION,
      activeId: typeof parsed.activeId === 'string' ? parsed.activeId : '',
      profiles: raw.filter(item => item !== null && typeof item === 'object').map(normalize),
    }
  }

  /**
   * 写回档案文件。
   * @param data - 要写入的数据。
   * @returns 同一份数据。
   */
  save(data) {
    const path = this.path()
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
    return data
  }

  /** @returns 全部档案。 */
  list() {
    return this.load().profiles
  }

  /**
   * 当前激活的档案。
   * @returns 档案；没有或未设置时返回 undefined。
   */
  active() {
    const data = this.load()
    if (data.activeId === '') return undefined
    return data.profiles.find(item => item.id === data.activeId)
  }

  /**
   * 新增或更新一套档案。
   *
   * 给了 `id` 就更新那一条（用于给克隆中的音色回填 voiceId / status），
   * 没给就新建。
   * @param entry - 档案内容；`id` 省略表示新建。
   * @returns 保存后的档案。
   */
  put(entry) {
    const data = this.load()
    const incoming = normalize(entry ?? {})
    const at = data.profiles.findIndex(item => item.id === incoming.id)
    if (at >= 0) {
      // 更新时只覆盖**这一次真正给了的**字段。克隆流程会分批回填 voiceId / status，
      // 若把没给的字段也一并重置，一套克隆音色会被打回 `manual` / `ready`。
      const patch = {}
      for (const key of Object.keys(entry ?? {})) {
        if (key in incoming && incoming[key] !== undefined) patch[key] = incoming[key]
      }
      data.profiles[at] = { ...data.profiles[at], ...patch }
    } else {
      data.profiles.push(incoming)
      // 第一套档案自动成为当前音色：刚配置完就能试听，不用再点一次"启用"。
      if (data.activeId === '') data.activeId = incoming.id
    }
    this.save(data)
    return at >= 0 ? data.profiles[at] : incoming
  }

  /**
   * 切换当前音色。
   * @param id - 档案 id。
   * @returns 是否切换成功（id 不存在时为 false）。
   */
  activate(id) {
    const data = this.load()
    if (!data.profiles.some(item => item.id === id)) return false
    data.activeId = id
    this.save(data)
    return true
  }

  /**
   * 删除一套档案。删掉的正好是当前音色时，激活项清空。
   * @param id - 档案 id。
   * @returns 是否真的删掉了。
   */
  remove(id) {
    const data = this.load()
    const at = data.profiles.findIndex(item => item.id === id)
    if (at < 0) return false
    data.profiles.splice(at, 1)
    if (data.activeId === id) data.activeId = data.profiles.length > 0 ? data.profiles[0].id : ''
    this.save(data)
    return true
  }

  /**
   * 档案文件是否已经存在（用于给设置页一个"还没配过"的提示）。
   * @returns 是否存在。
   */
  exists() {
    return existsSync(this.path())
  }
}
