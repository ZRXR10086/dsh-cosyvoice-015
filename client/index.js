/**
 * Bundle 入口：把本插件的各模块接起来。
 *
 * `apply` 绝不能抛异常。这里每个模块贡献的是 UI，其中一个失败不该把整页拖垮，
 * 所以每一项都独立 try/catch —— 一个坏掉的模块最坏的结果是"这个功能没出现"，
 * 而不是"整个会话面板空白"。
 *
 * 三件贡献：
 *
 * 1. **播放键**（`conversation.chat.assistant-actions`）—— v1 的全部交互面；
 * 2. **设置页**（`settings.section`）—— 配置、试听、打开目录、清空缓存；
 * 3. **开机音** —— 页面首次交互时按开关播一次提示音。
 */

/** 本插件拥有的文案命名空间。 */
var NS = 'cosyvoice'

/**
 * 必需服务：slot 注册表、文案。
 *
 * **刻意不把配置表单写进来。**它在新旧两版宿主里的服务名不同（0.2.1 是
 * `configForms`，0.1.5 是 `settingsScope`），而 `inject` 声明的是**硬依赖** ——
 * 声明一个宿主没有的服务，cordis 会一直等它，插件于是永远挂载不上，页面上一个
 * 按钮都不会出现。所以表单改为运行时探测（见 `shared.js` 的 `configFormOf`）：
 * 有就渲染设置页，两个都没有也只损失设置页，播放键照常工作。
 */
var inject = ['slots', 'locale']

/**
 * 在页面首次真实交互时播一次提示音。
 *
 * 必须是"首次交互时"而不是"加载完成时"：浏览器的自动播放策略会拦掉没有用户手势
 * 的播放，而一次被拒的 `play()` 再也不会重来 —— 所以这里等到用户真的碰了页面。
 * @param form - `cosyvoice` 配置表单，用来读开关。
 */
function armBootSound(form) {
  var played = false
  /**
   * 一次性播放。
   *
   * 用**自己的** `Audio` 而不是共享播放器：提示音不该抢走用户正在听的那条回答，
   * 也不该把播放器的状态占住。文件缺失时只是没有声音，不报任何错 —— 提示音从来
   * 不是关键功能。
   */
  function once() {
    if (played) return
    played = true
    const snapshot = form.getSnapshot()
    const value = snapshot && snapshot.value ? snapshot.value : {}
    if (value.bootSound === false) return
    try {
      const audio = new Audio(ROUTE_PREFIX + '/boot')
      audio.volume = 0.5
      const started = audio.play()
      if (started && typeof started.catch === 'function') started.catch(function () {})
    } catch (error) {
      // 没有提示音文件、或浏览器不给播：静默跳过。
    }
  }
  if (typeof document === 'undefined') return
  document.addEventListener('pointerdown', once, { once: true, passive: true })
  document.addEventListener('keydown', once, { once: true })
}

/**
 * 插件主体。
 * @param ctx - 客户端插件 context。
 */
function apply(ctx) {
  ctx.effect(function () {
    return ctx.locale.register(NS, { zh: DICT_ZH, en: DICT_EN })
  }, 'dsh-cosyvoice: dictionaries')
  const t = ctx.locale.bind(NS)

  try {
    ctx.slots.inject('conversation.chat.assistant-actions', function () {
      return ctx.slots.register({
        name: 'conversation.chat.assistant-actions',
        id: 'cosyvoice',
        order: 20,
        locale: NS,
        inject: function () { return {} },
      }, CosyvoiceSpeakButton)
    })
  } catch (error) {
    console.error('[dsh-cosyvoice] play button failed:', error)
  }

  try {
    // 两版宿主给的不是同一个服务，由 configFormOf 运行时认领；取不到时抛错落在
    // 下面的 catch 里，于是只少了设置页，播放键不受影响。
    var form = configFormOf(ctx, SETTINGS_ENTRY)
    if (!form) throw new Error('宿主没有提供可用的配置表单服务')
    ctx.slots.inject('settings.section', function () {
      return ctx.slots.register({
        name: 'settings.section',
        id: 'cosyvoice',
        order: 100,
        locale: NS,
        label: t('section.label'),
        inject: function () { return { form: form } },
      }, CosyvoiceSettingsPage)
    })
    armBootSound(form)
  } catch (error) {
    console.error('[dsh-cosyvoice] settings page failed:', error)
  }
}
