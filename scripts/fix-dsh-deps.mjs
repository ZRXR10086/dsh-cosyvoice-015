/**
 * 补齐 dsh 安装里"代码 import 了、但依赖树里真的没有"的那些自家包。
 *
 * dsh 是 pnpm workspace 开发出来的：那里的 hoisting 让兄弟包互相可见，于是发布时
 * 少写一批 dependencies 也不会在开发机上露馅。装到 npm 上就可能变成
 * `ERR_MODULE_NOT_FOUND` —— 它不是本插件的问题，不修这一步，任何插件都跑不起来。
 *
 * 这里**不硬编码名单**（名单会随版本变：0.1.5-rc.2 和 0.2.1-alpha.1 的缺失集合
 * 就不一样），而是扫真实的 `@deepseek-ai` 树，并且做两层过滤：
 *
 *   1. 被引用的包已经在 node_modules 里 → **不是问题**。
 *      Node 的解析会顺着目录往上冒泡，`<dsh>/node_modules/@deepseek-ai/x` 对树上
 *      任何一个包都可见（这正是 pnpm hoisting 的效果）。它只是"没写在纸上"而已。
 *      （在 0.2.1-alpha.1 上实测这类有 84 个，把它们全写进依赖是纯噪音。）
 *   2. 被引用的包**连实体都没有** → 这才是真断链，运行时必炸，必须补。
 *      （同一版本上实测 27 个。）
 *
 * 版本号的选法是这份脚本唯一真正需要拿捏的地方，按三层顺序试：
 *
 *   1. registry 上这个包有没有为当前 dsh 版本打的**配对标签**
 *      （`dist-tags["dsh-0-2-1-alpha-1"]`）。少数包（如 `cordis-plugin-group`）走
 *      自己的版本号线，发布者就用这种 tag 标出该配哪一版。最权威。
 *   2. 有没有**与 dsh 完全同名**的版本。这批 `dsh-*` 内部包是跟着主版本同步发布
 *      的，同名版本就是同期产物 —— 实测 27 个里有 26 个走这条路。
 *      注意不能顺手用 `latest`：这批包的 latest 普遍停在旧线上
 *      （`dsh-scope` 的 latest 是 0.0.1-rc.1，而同期版本是 0.2.1-alpha.1），
 *      装上旧线只会从"找不到包"变成"版本对不上"。
 *   3. 都没有才退回 latest，并单独标出来提醒留意。
 *
 * 用法：
 *   node scripts/fix-dsh-deps.mjs                    # 自动找全局 dsh
 *   node scripts/fix-dsh-deps.mjs /path/to/dsh       # 显式给出安装位置
 *   node scripts/fix-dsh-deps.mjs --dry              # 只看鉴定结果，不改文件
 *
 * 改完需要重跑一次安装把它真正落盘，否则只是改了一份清单：
 *   cd <dsh 安装目录> && npm i
 */

import { execSync, execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** 只认这一个作用域：其余依赖（commander、js-yaml…）dsh 自己声明得很齐全。 */
const SCOPE = '@deepseek-ai'

/** 打过包的产物里没有可读的 import 边，超过这个体积就不当源码读。 */
const MAX_SOURCE_BYTES = 4 * 1024 * 1024

/**
 * 在源码里找 `@deepseek-ai/xxx` 的静态引用。
 *
 * 刻意不读 `client.js`（浏览器端产物）：那里的跨包引用由 bundler 在运行前内联掉，
 * 不是 Node 的解析范围。
 * @param source - 源码文本。
 * @returns 被引用的包短名集合。
 */
function importedPackages(source) {
  const found = new Set()
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\brequire\(\s*["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']/g,
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1]
      if (!specifier.startsWith(`${SCOPE}/`)) continue
      found.add(specifier.slice(SCOPE.length + 1).split('/')[0])
    }
  }
  return found
}

/**
 * 遍历一个包自己的源码文件。
 * @param dir - 包根目录。
 * @returns 源码文件的绝对路径。
 */
function sourceFiles(dir) {
  const out = []
  const walk = (current) => {
    let entries = []
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const at = join(current, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue // 嵌套安装，不属于本包源码
        walk(at)
        continue
      }
      if (entry.name === 'client.js') continue
      if (!entry.name.endsWith('.js') && !entry.name.endsWith('.mjs')) continue
      try {
        if (statSync(at).size > MAX_SOURCE_BYTES) continue
      } catch {
        continue
      }
      out.push(at)
    }
  }
  walk(dir)
  return out
}

/**
 * 把整棵树里"引用了 `@deepseek-ai/*`"的边分成两类。
 *
 * 区分的依据只有一条：**目标包在依赖树里有没有实体**。有 → Node 一定能解析到，
 * 漏写 dependencies 只是账面上不好看；没有 → 运行时必然 ERR_MODULE_NOT_FOUND。
 * @param scopeDir - `<dsh>/node_modules/@deepseek-ai`。
 * @returns `{ broken, hoisted }`，两者都是 Map<包短名, Set<引用方短名>>。
 */
function scanEdges(scopeDir) {
  const broken = new Map()
  const hoisted = new Map()

  for (const name of readdirSync(scopeDir)) {
    for (const file of sourceFiles(join(scopeDir, name))) {
      let source
      try {
        source = readFileSync(file, 'utf8')
      } catch {
        continue
      }
      for (const used of importedPackages(source)) {
        if (used === 'cordis' || used === name) continue
        const bucket = existsSync(join(scopeDir, used)) ? hoisted : broken
        if (!bucket.has(used)) bucket.set(used, new Set())
        bucket.get(used).add(name)
      }
    }
  }
  return { broken, hoisted }
}

/**
 * 一次问清某个包有哪些版本、哪些 dist-tags。
 *
 * 逐个版本 `npm view` 会有几十次 registry 往返，拉这一份就够。
 * @param short - 包短名。
 * @returns `{ distTags, versions }`；versions 是**版本号的数组**（这个 registry 不
 *          在 versions 里带元数据）。查不到返回 null。
 */
function packumentOf(short) {
  let printed
  try {
    printed = execFileSync(
      'npm', ['view', `${SCOPE}/${short}`, 'versions', 'dist-tags', '--json', '--no-audit', '--no-fund'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 },
    )
  } catch {
    return null
  }
  try {
    const doc = JSON.parse(printed)
    const raw = doc.versions ?? []
    // 兼容两种形态：有些 registry 给对象（键是版本号），有些给纯字符串数组。
    const versions = Array.isArray(raw)
      ? raw.map(v => (typeof v === 'string' ? v : v?.version)).filter(Boolean)
      : Object.keys(raw)
    return { distTags: doc['dist-tags'] ?? {}, versions }
  } catch {
    return null
  }
}

/**
 * 为一个断链包挑出该写进依赖表的版本，三层优先级见文件头注释。
 * @param short - 包短名。
 * @param dshVersion - dsh 自身的版本号。
 * @returns `{ version, via }`；via 说明这个版本是怎么选出来的，查不到时 version 为 null。
 */
function chooseVersion(short, dshVersion) {
  const doc = packumentOf(short)
  if (!doc) return { version: null, via: 'registry 上查不到这个包' }

  // 第 1 层：发布者为这个 dsh 版本打的配对标签，例如 dist-tags["dsh-0-2-1-alpha-1"]。
  const pairTag = doc.distTags[`dsh-${dshVersion.replace(/\./g, '-')}`]
  if (pairTag) return { version: pairTag, via: '官方配对标签' }

  // 第 2 层：与主版本同期发布的那个版本（dsh-* 内部包跟主版本同步发版）。
  if (doc.versions.includes(dshVersion)) return { version: dshVersion, via: '与主版本同期发布' }

  // 第 3 层：兜底。这批包的 latest 常常停在旧线上，所以要报给用户知道。
  if (doc.distTags.latest) return { version: doc.distTags.latest, via: 'latest（没有同期版本）' }
  return { version: doc.versions[0] ?? null, via: '仅有的版本' }
}

/** dsh 主包的 manifest 路径。 */
function dshRoot(explicit) {
  if (explicit) return explicit
  const printed = execSync('npm root -g', { encoding: 'utf8' }).trim()
  const at = join(printed, SCOPE, 'dsh')
  if (!existsSync(at)) throw new Error(`没找到全局 dsh（查过 ${at}）`)
  return at
}

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const explicit = args.find(a => !a.startsWith('--'))

const root = dshRoot(explicit)
const scopeDir = join(root, 'node_modules', SCOPE)
if (!existsSync(scopeDir)) {
  throw new Error(`没找到 ${scopeDir}，这里不是 dsh 的安装目录（或者还没跑过 npm i）`)
}

const manifestPath = join(root, 'package.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const { broken, hoisted } = scanEdges(scopeDir)

console.log(`dsh ${manifest.version}  安装在 ${root}`)
console.log(`  引用了就有实体、只是没写进依赖表（Node 仍能解析，无需处理）：${hoisted.size} 个`)
console.log(`  依赖树里连目录都没有（真断链，必须补）：${broken.size} 个`)

if (broken.size === 0) {
  console.log('\n没有断链 —— 不需要修。')
  process.exit(0)
}

console.log('\n逐个从 registry 挑版本：')
const toAdd = []
const unresolvable = []
/** 走到第 3 层（兜底）的包，值得用户自己再看一眼。 */
const fellBack = []
for (const short of [...broken.keys()].sort()) {
  if (manifest.dependencies[`${SCOPE}/${short}`] !== undefined) {
    console.log(`  ${short.padEnd(34)} 已在 dependencies 里（可能刚补过），跳过`)
    continue
  }
  const { version, via } = chooseVersion(short, manifest.version)
  if (!version) {
    unresolvable.push(short)
    console.log(`  ${short.padEnd(34)} ${via}，无从补起`)
    continue
  }
  toAdd.push([short, version])
  if (via.startsWith('latest') || via.startsWith('仅有的')) fellBack.push(short)
  console.log(`  ${short.padEnd(34)} → ${version.padEnd(14)} ${via}`)
}

if (fellBack.length > 0) {
  console.log(`\n${fellBack.length} 个包没有同期版本，退回到了 latest：${fellBack.join(', ')}`)
  console.log('它们的 latest 可能滞后于 dsh 当前这条线；装完若报版本不匹配，手动降到同期那一版。')
}

if (unresolvable.length > 0) {
  console.log(`\n有 ${unresolvable.length} 个包 registry 上没有：${unresolvable.join(', ')}`)
  console.log('这些多半是私有工作区包。如果你的用法会走到引用它们的代码路径，')
  console.log('光靠 npm 装不齐 —— 需要从 dsh 的源码仓库构建。')
}

if (toAdd.length === 0) {
  console.log('\n没有可补的依赖 —— package.json 不变。')
  process.exit(0)
}

if (dry) {
  console.log('\n[--dry] 到此为止，没写文件。真要改的话去掉 --dry。')
  process.exit(0)
}

// 改的是别人的包：先备份，出问题时用户要能回到原状。已备份过就不覆盖，
// 免得第二次运行把最初的干净版本冲掉。
const backupPath = `${manifestPath}.orig`
if (!existsSync(backupPath)) {
  writeFileSync(backupPath, readFileSync(manifestPath))
  console.log(`\n已备份 ${backupPath}`)
}

for (const [short, version] of toAdd) {
  manifest.dependencies[`${SCOPE}/${short}`] = version
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

console.log(`\n写回 ${toAdd.length} 个依赖。下一步要真正装一遍，否则改的只是一份清单：`)
console.log(`  cd ${root} && npm i`)
