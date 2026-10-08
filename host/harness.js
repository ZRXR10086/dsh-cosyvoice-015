/**
 * 定位 DeepSeek Harness 自身的包，而不靠裸 import。
 *
 * 从**本地路径**安装的插件以软链形式进入 profile，Node 会从包的**真实目录**
 * 解析它的 import —— 也就是那个 checkout，位于 profile 树之外。于是父目录上溯
 * 永远到不了 `$DSH_HOME/profiles/node_modules`（让 harness 包在任何 profile 下
 * 都可解析的扁平回退目录），裸 `import '@deepseek-ai/dsh-tools'` 会报
 * ERR_MODULE_NOT_FOUND。而"克隆下来再从 checkout 安装"恰恰是最常见的用法。
 *
 * 所以这里用一个**位于该回退目录内**的锚点来解析这些包，再按文件 URL 导入。
 * 依赖的是**已发布的包名**，而不是插件恰好在哪。
 *
 * 同一文件还负责 harness home 的解析：它必须在任何 harness 包能被加载之前
 * 就可用，所以这里是本地实现，而不是 import 提供它的那个包。
 * @module dsh-cosyvoice/harness
 */

import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/** 承载显式 harness home 的环境变量。 */
const DSH_HOME_ENV = 'DSH_HOME'

/**
 * 解析 DeepSeek Harness 的家目录。
 *
 * 优先级从高到低：显式实参、`$DSH_HOME`、`~/.dsh`。
 * 空白的 `$DSH_HOME` 视为未设置，所以空的覆盖永远不会把 home 解析成工作目录。
 * @param configured - 显式覆盖，优先于环境变量。
 * @param env - 读取 `DSH_HOME` 的环境映射。
 * @returns 绝对 harness home。
 */
export function dshHome(configured, env = process.env) {
  const fromEnv = env[DSH_HOME_ENV]
  const selected = configured ?? (fromEnv !== undefined && fromEnv.trim().length > 0 ? fromEnv : join(homedir(), '.dsh'))
  const expanded = selected === '~' ? homedir() : selected.replace(/^~[/\\]/, '')
  return resolve(expanded)
}

/**
 * 解析锚点：扁平模块回退目录内的一个路径。
 *
 * 这个文件本身从不存在 —— `createRequire` 只需要它作为起点，Node 自己从这里
 * 上溯就能找到 `profiles/node_modules`，那里放着安装所依赖的每个包的链接。
 * @returns 绝对锚点路径。
 */
export function harnessAnchor() {
  return join(dshHome(), 'profiles', '_dsh-cosyvoice-anchor.js')
}

/**
 * 把包说明符解析成文件系统的入口路径。
 *
 * 两次尝试，因为两种安装方式的解析起点不同：
 *
 * 1. **先按本模块自身的位置解析** —— 从 registry 安装时，插件就躺在
 *    `$DSH_HOME/profiles/node_modules` 里，父目录上溯一步即可命中，这是最
 *    直接也最快的一条路。
 * 2. **再退回锚点** —— 从本地 checkout 软链安装时，Node 从 checkout 的真实
 *    目录解析，上溯永远到不了那个扁平目录，此时必须靠锚点。
 *
 * @param specifier - 包名，以发布时的写法为准。
 * @returns 入口文件的绝对路径。
 * @throws {Error} 两条路都走不通时抛出，同时报出锚点与可能的原因。
 */
function resolveHarnessEntry(specifier) {
  const anchor = harnessAnchor()
  const attempts = [import.meta.url, pathToFileURL(anchor).href]
  const causes = []
  for (const base of attempts) {
    try {
      return createRequire(base).resolve(specifier)
    } catch (cause) {
      causes.push(cause)
    }
  }
  throw new Error(
    `dsh-cosyvoice: 无法定位 ${specifier}（解析锚点：${anchor}）。`
    + '该锚点用于找到 DSH 安装自身的包；若目录不存在，说明 DSH_HOME 指向了错误的位置，'
    + '或这个 DSH 版本没有提供该包。',
    { cause: causes[0] },
  )
}

/**
 * 按名字导入一个 harness 包，从 harness 安装处解析。
 * @param specifier - 包名，以发布时的写法为准。
 * @returns 该包的模块命名空间。
 * @throws {Error} 找不到包时抛出。
 */
export async function loadHarnessModule(specifier) {
  return import(pathToFileURL(resolveHarnessEntry(specifier)).href)
}

/**
 * 同步版本：按名字 require 一个 harness 包。
 *
 * 存在的理由只有一条 —— cordis 的 `Config` 必须在模块顶层同步求值，
 * `await import` 在那里用不了。`@deepseek-ai/schemastery` 提供了 CJS 入口，
 * 所以这条路走得通。
 * @param specifier - 包名。
 * @returns 该包的导出。
 * @throws {Error} 找不到包或它没有 CJS 入口时抛出。
 */
export function requireHarnessModule(specifier) {
  return createRequire(import.meta.url)(resolveHarnessEntry(specifier))
}

/**
 * 尝试按名字导入一个 harness 包；失败时返回 undefined 而不是抛错。
 *
 * 用于那些"有就更好、没有也能跑"的可选能力（例如 webServer）。
 * @param specifier - 包名。
 * @returns 模块命名空间，或 undefined。
 */
export async function tryLoadHarnessModule(specifier) {
  try {
    return await loadHarnessModule(specifier)
  } catch {
    return undefined
  }
}
