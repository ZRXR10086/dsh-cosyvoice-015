/**
 * 播放键：挂在 `conversation.chat.assistant-actions` 上，于是它出现在每条 AI
 * 回答末尾那一排动作按钮里（与点赞/点踩同一行）。
 *
 * 这是 v1 的全部交互面 —— **没有系统提示注入，也没有给模型的工具**。模型不知道
 * 语音这件事，用户点哪个按钮就读哪一条。pull 而不是 push，所以不存在"提醒了它
 * 却不说"的不确定性。
 *
 * 文本从 chat 快照里取（`useChat` 是 chat 为 session 级 slot 声明的标准 prop）。
 * 取不到时（消息不在已加载窗口内）把 messageId 交给宿主去解析，两条路都走不通
 * 才报"没找到文本"。
 */

/** 图标统一尺寸：与宿主那一排动作按钮的视觉重量一致。 */
var ICON = {
  width: '16',
  height: '16',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '1.8',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

/**
 * 喇叭图标：待播。
 * @returns SVG 元素。
 */
function IconSpeak() {
  return React.createElement('svg', ICON,
    React.createElement('path', { d: 'M11 5 6 9H3v6h3l5 4V5z' }),
    React.createElement('path', { d: 'M15.5 8.5a5 5 0 0 1 0 7' }),
    React.createElement('path', { d: 'M18.5 5.5a9 9 0 0 1 0 13' }))
}

/**
 * 停止图标：播放中。
 * @returns SVG 元素。
 */
function IconStop() {
  return React.createElement('svg', ICON,
    React.createElement('rect', { x: '7', y: '7', width: '10', height: '10', rx: '2', fill: 'currentColor' }))
}

/**
 * 转圈图标：合成中。用 SVG 原生动画，所以不需要额外的样式表。
 * @returns SVG 元素。
 */
function IconBusy() {
  // animateTransform 必须待在 <g> 里：SVG 的动画元素作用于其**父元素**。
  // 若直接挂在 <svg> 下，旋转的是整个图标（连带它在按钮里的位置一起绕圈），
  // 看起来就是"整体也在转"。放进 <g> 后只有这条弧绕中心转。
  return React.createElement('svg', ICON,
    React.createElement('g', null,
      React.createElement('path', { d: 'M12 3a9 9 0 1 0 9 9', opacity: '0.85' }),
      React.createElement('animateTransform', {
        attributeName: 'transform',
        type: 'rotate',
        from: '0 12 12',
        to: '360 12 12',
        dur: '0.9s',
        repeatCount: 'indefinite',
      })))
}

/**
 * 播放键。
 * @param props - slot 运行时 props（`messageId`、`sessionId`、`useChat`）与 `t`。
 * @returns 一个按钮。
 */
function CosyvoiceSpeakButton(props) {
  var messageId = props.messageId
  var sessionId = props.sessionId
  var useChat = props.useChat
  var t = props.t

  var snapshot = usePlayerState()
  var current = stateOf(snapshot, messageId)
  var busy = current.phase === 'loading'
  var playing = current.phase === 'playing'

  // chat 挂载后才会有 useChat；缺失时组件仍然渲染，文本改由宿主解析。
  var text = typeof useChat === 'function'
    ? useChat(function (chat) { return textOfMessage(chat, messageId) })
    : undefined

  var label = playing
    ? t('action.stop')
    : busy
      ? t('action.synthesizing')
      : t('action.speak')

  var title = current.phase === 'error' && current.message !== undefined
    ? current.message
    : label

  /**
   * 点击：播放中即停止，否则取文本 → 合成 → 播放。
   */
  function onActivate() {
    if (playing) {
      player.stop()
      return
    }
    if (busy) return
    // 说话快慢由服务端定：整段模式等一次合成完再响，实时模式第一句好了就出声。
    // 两种情况共用这一个入口，因为它按响应的 content-type 自己分岔。
    speakAs('speak-message', {
      messageId: messageId,
      sessionId: sessionId,
      text: typeof text === 'string' ? text : '',
    }, messageId)
  }

  var glyph = playing ? React.createElement(IconStop) : busy ? React.createElement(IconBusy) : React.createElement(IconSpeak)

  return React.createElement('button', {
    type: 'button',
    'aria-label': title,
    'aria-pressed': playing,
    'data-active': playing || undefined,
    'data-busy': busy || undefined,
    title: title,
    onClick: onActivate,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '28px',
      height: '28px',
      padding: '0',
      borderRadius: '6px',
      border: '1px solid ' + (playing ? T.accent : 'transparent'),
      background: playing ? T.panel : 'transparent',
      color: current.phase === 'error' ? '#d93025' : T.textDim,
      cursor: busy ? 'progress' : 'pointer',
      opacity: busy ? '0.6' : '1',
      transition: 'background-color .12s, color .12s',
    },
  }, glyph)
}
