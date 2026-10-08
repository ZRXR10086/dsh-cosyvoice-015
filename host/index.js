/**
 * dsh-cosyvoice —— 宿主（Node）那一半。
 *
 * 一个插件、一个包，只做三件事：
 *
 * 1. 声明 `cosyvoice` 配置面（`export const Config`），于是设置页自动长出表单，
 *    API Key 走 `role('secret')` 脱敏，永不回传浏览器；
 * 2. 把「清洗 → 缓存 → 调百炼 → 落盘」的合成链路组装起来；
 * 3. 挂上 `/dsh-cosyvoice/*` 这组 HTTP 路由，供浏览器那一半取用。
 *
 * 这里**没有**系统提示注入，也**没有** `voice_speak` 工具。v1 的交互是 pull 式的：
 * 播放键长在每条 AI 回答末尾（客户端 slot 贡献），点了才合成。模型不需要知道
 * 语音这件事，也就不会出现"提醒了它却不说"的不确定性。
 *
 * harness 的包全部经 `./harness.js` 解析，而不是按裸名 import，所以从 registry
 * 安装和从本地 checkout 安装都能跑。有状态的东西都住在协作者里（
 * {@link import('./synth.js').VoiceSynthesizer} 与
 * {@link import('./store.js').AudioStore}），本文件只做接线。
 * @module dsh-cosyvoice
 */

import { fileURLToPath } from 'node:url'
import { requireHarnessModule } from './harness.js'
import { voiceSettingsSchema, VOICE_NAMESPACE } from './settings.js'
import { AudioStore } from './store.js'
import { SpeechClient } from './speech.js'
import { VoiceSynthesizer } from './synth.js'
import { MessageTextResolver } from './texts.js'
import { VoiceProfiles } from './profiles.js'
import { VoiceCloner } from './clone.js'
import { cosyvoiceRoutes } from './routes.js'

/** 稳定的 cordis 插件名。 */
export const name = 'dsh-cosyvoice'

/**
 * 必需的服务。
 *
 * `webServer` 是硬依赖而非可选依赖：没有路由，浏览器那一半无从工作，此时把插件
 * 挂起等路由可注册才是诚实的做法 —— 半挂载的语音插件只会给出一个什么都不解释
 * 的按钮。
 */
export const inject = ['webServer']

/**
 * 本插件的配置面。
 *
 * 同步求值，因为 cordis 的 `Config` 必须在模块顶层给出。`schemastery` 提供了
 * CJS 入口，所以这里用同步 require 而不是 `await import`。
 */
export const Config = voiceSettingsSchema(normalizeSchemastery(requireHarnessModule('@deepseek-ai/schemastery')))

/**
 * 取 schemastery 的可调用入口。
 *
 * 不同打包方式下它可能以默认导出或命名空间到达，两种都要接住。
 * @param mod - require 到的模块导出。
 * @returns 带 `.object()` 的入口。
 */
function normalizeSchemastery(mod) {
  const candidate = mod?.default ?? mod
  return typeof candidate === 'function' ? candidate : candidate?.default ?? mod
}

/**
 * 在系统文件管理器里打开一个目录。
 *
 * 三种写法，因为没有可移植的那一种。Windows 的 `cmd /c start` 需要一个空的
 * 标题参数：只给一个引号包裹的参数时，Windows 会把它当成窗口标题而不是路径。
 * @param dir - 要打开的绝对目录。
 */
async function revealDirectory(dir) {
  const { spawn } = await import('node:child_process')
  const command = process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '""', dir]]
    : process.platform === 'darwin'
      ? ['open', [dir]]
      : ['xdg-open', [dir]]
  await new Promise((resolve) => {
    const child = spawn(command[0], command[1], { stdio: 'ignore', detached: true })
    child.on('error', () => { resolve() })
    child.on('exit', () => { resolve() })
  })
}

/**
 * 把设置命名空间显式登记给 dsh 0.1.5。
 *
 * 两版宿主在这里的做法不同，而差别恰好可以用**服务的有无**来判别，不必写版本号
 * 分支：
 *
 * - **0.2.1**：宿主自己从 `export const Config` 推导并登记 namespace（那时这个
 *   服务已经被 `ConfigForms` 取代了），于是 `ctx.settings` 根本不存在；
 * - **0.1.5**：宿主不做这件事，插件必须自己登记，否则设置页里永远没有这一节 ——
 *   `Config` 只负责**校验**交给 apply 的那份配置，不负责让它出现在 UI 上。
 *
 * 所以下面用 `ctx.inject(['settings'], ...)`：服务在就登记，不在就永远不触发。
 * 这一条是可以证实的前提，不是巧合式的兜底 —— dsh 自己的 `ui-chat` 在 0.1.5 上
 * 正是这样登记 `'ui-chat'` 的。
 * @param ctx - 宿主 context。
 */
function registerSettingsNamespace(ctx) {
  try {
    ctx.inject(['settings'], (settingsCtx) => {
      // effect 让卸载时连同登记一起收回：插件被摘掉后，设置文档里不该留一个
      // 谁都不拥有的命名空间。
      ctx.effect(() => {
        const disposed = settingsCtx.settings.register(VOICE_NAMESPACE, Config)
        return typeof disposed === 'function' ? disposed : () => {}
      }, `dsh-cosyvoice: settings namespace ${VOICE_NAMESPACE}`)
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // 登记失败不该拖垮整个插件：路由没挂上才是失能，设置面缺失只是少一张表单。
    ctx.logger?.warn?.(`[dsh-cosyvoice] 无法登记设置命名空间：${message}`)
  }
}

/**
 * 挂载插件。
 *
 * 配置由 **cordis 作为第二个参数** 交进来（`runtime.callback(ctx, config)`），
 * 而不是 `ctx.config` —— 后者在这个版本上根本不是 context 的属性，读它会抛
 * `cannot get property "config" without inject`。配置改动会让 cordis 带着新值
 * 重新调用本函数，所以这里拿到的永远是当前生效的那一份。
 * @param ctx - 宿主 context。
 * @param config - 已按 {@link Config} 校验过的配置。
 */
export function apply(ctx, config) {
  const settings = () => config ?? {}
  const log = (message) => { ctx.logger?.warn?.(`[dsh-cosyvoice] ${message}`) }

  registerSettingsNamespace(ctx)

  const store = new AudioStore(() => settings().outputDir)
  const speech = new SpeechClient({ getSettings: settings })
  const texts = new MessageTextResolver({ log })
  // 音色档案自管一个 JSON（理由见 ./profiles.js 头注释），所以它不在 cordis 的
  // 配置面里，也就不会随着配置重载被重建 —— 挂载/重载插件不该动用户的音色清单。
  const profiles = new VoiceProfiles()
  const synth = new VoiceSynthesizer({ speech, store, getSettings: settings, profiles, log })
  const cloner = new VoiceCloner({ getSettings: settings })

  try {
    store.ensure()
  } catch (error) {
    log(`无法创建音频目录 ${store.dir()}：${error instanceof Error ? error.message : String(error)}`)
  }

  for (const route of cosyvoiceRoutes({
    getSettings: settings,
    synth,
    store,
    texts,
    profiles,
    cloner,
    bootClip: fileURLToPath(new URL('../assets/boot.mp3', import.meta.url)),
    log,
    openDir: revealDirectory,
  })) {
    ctx.effect(() => ctx.webServer.register(route), `dsh-cosyvoice: ${route.path}`)
  }

  log(`路由已挂载于 ${String(store.dir())}`)
}
