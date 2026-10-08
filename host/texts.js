/**
 * 按 messageId 取回一条 AI 回答的纯文本。
 *
 * 播放键所在的 slot 条目只拿到 `{ messageId }`（外加 session 级的 runtime props），
 * 拿不到回答正文。本模块负责把 messageId 变成文本，取两条路：
 *
 * 1. **记忆**（`remember`）—— 进程内存里的 `messageId → text` 映射。任何先于点击
 *    就拿到文本的途径都可以往这里登记，命中是零成本的。
 * 2. **会话日志**（`resolveFromDisk`）—— 在 `$DSH_HOME/sessions` 下找到该会话的
 *    JSONL 日志（可能是 zstd 压缩），按 messageId 抽出助手文本块。
 *
 * 磁盘解析写成"尽力而为"：格式对不上就返回 undefined，由调用方给出可读的提示，
 * 而不是把整个插件拖崩。
 * @module dsh-cosyvoice/texts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import zlib from 'node:zlib'
import { dshHome } from './harness.js'

/** 会话日志目录（相对 harness home）。 */
const SESSIONS_DIR = 'sessions'

/** 单文件扫描上限：会话日志可能很大，够用即可。 */
const MAX_FILE_BYTES = 64 * 1024 * 1024

/** 递归列举时的最大目录深度。 */
const MAX_DEPTH = 3

/**
 * 解压 zstd（若运行时支持），否则原样返回。
 * @param bytes - 可能是 zstd 流的字节。
 * @returns 解压后的字节，或原字节。
 */
function maybeZstd(bytes) {
  // zstd 魔数：0x28 0xB5 0x2F 0xFD
  const isZstd = bytes.length >= 4 && bytes[0] === 0x28 && bytes[1] === 0xB5 && bytes[2] === 0x2F && bytes[3] === 0xFD
  if (!isZstd) return bytes
  // zstd 解压在 Node 23.8+ 才有；低版本拿不到就返回 undefined，由调用方给出提示。
  if (typeof zlib.zstdDecompressSync !== 'function') return undefined
  try {
    return zlib.zstdDecompressSync(bytes)
  } catch {
    return undefined
  }
}

/**
 * 从一个任意嵌套的节点里抽出可读文本。
 *
 * 认识 `{ kind: 'text', text }` 这种内容块（dsh 助手消息就是这种结构），
 * 其余情况退化为"把所有字符串值拼起来"。
 * @param node - 任意 JSON 节点。
 * @returns 抽出的文本。
 */
function collectText(node) {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(collectText).filter(part => part !== '').join('')
  if (node !== null && typeof node === 'object') {
    if (node.kind === 'text' && typeof node.text === 'string') return node.text
    const parts = []
    for (const key of Object.keys(node)) {
      if (key === 'messageId' || key === 'id' || key === 'rpcId') continue
      parts.push(collectText(node[key]))
    }
    return parts.filter(part => part !== '').join('')
  }
  return ''
}

/**
 * 在一棵 JSON 树里找 messageId 命中处，并抽出它的文本。
 * @param node - 任意 JSON 节点。
 * @param messageId - 目标消息 id。
 * @returns 命中的文本；未命中返回 undefined。
 */
function findMessageText(node, messageId) {
  if (node === null || typeof node !== 'object') return undefined
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findMessageText(item, messageId)
      if (found !== undefined && found !== '') return found
    }
    return undefined
  }
  const own = node.messageId ?? node.id
  if (own === messageId) {
    // 优先只取内容块，避免把 id、时间戳之类的杂项拼进去。
    const blocks = node.blocks ?? node.content ?? node.parts
    const text = blocks !== undefined ? collectText(blocks) : collectText(node)
    if (text !== '') return text
  }
  for (const key of Object.keys(node)) {
    const found = findMessageText(node[key], messageId)
    if (found !== undefined && found !== '') return found
  }
  return undefined
}

/** 按 messageId 解析回答文本。 */
export class MessageTextResolver {
  /**
   * @param options - 选项。
   * @param options.home - harness home（默认自动解析）。
   * @param options.log - 诊断输出（不进响应）。
   */
  constructor({ home, log } = {}) {
    this.home = home ?? dshHome()
    this.log = log ?? (() => {})
    /** 内存映射：messageId → 文本。 */
    this.remembered = new Map()
  }

  /**
   * 登记一条已知文本（供将来任何先于点击拿到文本的途径使用）。
   * @param messageId - 消息 id。
   * @param text - 该消息的正文。
   */
  remember(messageId, text) {
    const value = String(text ?? '').trim()
    if (messageId === undefined || messageId === null || value === '') return
    this.remembered.set(String(messageId), value)
  }

  /**
   * 解析一条回答的文本。
   * @param messageId - 目标消息 id。
   * @param sessionId - 所属会话 id（用于缩小搜索范围；可省略）。
   * @returns 文本；解析不到返回 undefined。
   */
  resolve(messageId, sessionId) {
    const id = String(messageId ?? '').trim()
    if (id === '') return undefined
    const known = this.remembered.get(id)
    if (known !== undefined) return known
    return this.resolveFromDisk(id, sessionId)
  }

  /**
   * 从会话日志里解析。
   * @param messageId - 目标消息 id。
   * @param sessionId - 所属会话 id（可省略）。
   * @returns 文本；解析不到返回 undefined。
   */
  resolveFromDisk(messageId, sessionId) {
    const files = this.candidateFiles(sessionId)
    for (const file of files) {
      const text = this.scanFile(file, messageId)
      if (text !== undefined && text !== '') return text
    }
    if (files.length === 0) {
      this.log(`texts: 在 ${join(this.home, SESSIONS_DIR)} 下没找到会话日志文件`)
    }
    return undefined
  }

  /**
   * 列出候选日志文件：优先名字里带 sessionId 的，否则最近的若干个。
   * @param sessionId - 会话 id（可省略）。
   * @returns 文件绝对路径列表。
   */
  candidateFiles(sessionId) {
    const root = join(this.home, SESSIONS_DIR)
    const found = []
    this.walk(root, 0, found)
    const wanted = String(sessionId ?? '').trim()
    const matching = wanted === '' ? [] : found.filter(file => file.includes(wanted))
    if (matching.length > 0) return matching
    // 没有 sessionId 或没匹配上：按修改时间从新到旧试，最近的会话最可能是当前会话。
    return found
      .map(file => {
        try {
          return { file, mtime: statSync(file).mtimeMs }
        } catch {
          return undefined
        }
      })
      .filter(entry => entry !== undefined)
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 10)
      .map(entry => entry.file)
  }

  /**
   * 递归收集会话日志文件。
   * @param dir - 当前目录。
   * @param depth - 当前深度。
   * @param out - 收集结果。
   */
  walk(dir, depth, out) {
    if (depth > MAX_DEPTH) return
    let entries = []
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        this.walk(path, depth + 1, out)
        continue
      }
      if (!entry.isFile()) continue
      if (path.endsWith('.jsonl') || path.endsWith('.jsonl.zstd')) out.push(path)
    }
  }

  /**
   * 扫描单个日志文件，找目标消息。
   * @param file - 日志文件绝对路径。
   * @param messageId - 目标消息 id。
   * @returns 文本；未找到返回 undefined。
   */
  scanFile(file, messageId) {
    let bytes
    try {
      bytes = readFileSync(file)
    } catch {
      return undefined
    }
    if (bytes.length > MAX_FILE_BYTES) return undefined
    const raw = file.endsWith('.zstd') ? maybeZstd(bytes) : bytes
    if (raw === undefined) {
      this.log(`texts: 无法解压 ${file}（当前 Node 版本缺少 zstd 支持）`)
      return undefined
    }
    const lines = raw.toString('utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed === '') continue
      let record
      try {
        record = JSON.parse(trimmed)
      } catch {
        continue
      }
      const text = findMessageText(record, messageId)
      if (text !== undefined && text !== '') return text
    }
    return undefined
  }
}
