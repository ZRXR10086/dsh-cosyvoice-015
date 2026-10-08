/**
 * 测试脚手架：布置一个能解析 harness 包的临时 harness home。
 *
 * `host/harness.js` 刻意不从裸 import 拿 `@deepseek-ai/schemastery` —— 它要从真实
 * 的 DSH 安装处解析，因为"从本地 checkout 软链安装"是最常见的用法（那里的父目录
 * 上溯到不了 profile 树）。代价是**本包自己的测试也没有那个包**，于是跑测试得先
 * 布置一个看起来像 harness home 的临时目录，再从已安装的 DSH 借一个 schemastery
 * 链过去。
 *
 * 抽成共享文件有两个理由：这套脚手架有 25 行，而至少需要它的测试有两处
 * （集成测试要真的 `apply` 一遍；兼容测试要真的加载 `host/index.js`）。
 * @module dsh-cosyvoice/test/harness-home
 */

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

/**
 * 把 harness home 布置成一个能解析 `@deepseek-ai/schemastery` 的样子。
 *
 * 链接的目标是从已安装的 DSH 里找出来的，所以测试不硬编码任何版本。
 * @returns 临时 home 的绝对路径。
 */
export function stageHome() {
  const root = mkdtempSync(join(tmpdir(), 'cosyvoice-home-'))
  const target = join(root, 'profiles', 'node_modules', '@deepseek-ai')
  mkdirSync(target, { recursive: true })
  // 从本包自身解析不到（它不在 DSH 树里），所以从 DSH 的安装处借一个。
  const anchor = harnessAnchorForTest()
  const resolved = createRequire(anchor).resolve('@deepseek-ai/schemastery/package.json')
  symlinkSync(dirname(resolved), join(target, 'schemastery'))
  return root
}

/**
 * 找一个能解析到 harness 包的起点：优先已安装的 DSH，其次 NVM 里的 CLI。
 * @returns 一个文件路径，供 `createRequire` 使用。
 */
export function harnessAnchorForTest() {
  const candidates = process.env.DSH_CLI_ROOT
    ? [join(process.env.DSH_CLI_ROOT, 'lib', 'bin.js')]
    : []
  candidates.push('/usr/lib/node_modules/@deepseek-ai/dsh/lib/bin.js')
  const nvmRoot = join(process.env.HOME ?? '/root', '.nvm/versions/node')
  for (const entry of safeReaddir(nvmRoot)) {
    candidates.push(join(nvmRoot, entry, 'lib/node_modules/@deepseek-ai/dsh/lib/bin.js'))
  }
  for (const candidate of candidates) {
    try {
      readFileSync(candidate)
      return candidate
    } catch {
      // 继续找下一个。
    }
  }
  throw new Error('测试脚手架：找不到 DSH 安装位置，无法借用 @deepseek-ai/schemastery')
}

/**
 * 读目录内容，读不到就是空列表。
 * @param dir - 目录。
 * @returns 条目名。
 */
export function safeReaddir(dir) {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}
