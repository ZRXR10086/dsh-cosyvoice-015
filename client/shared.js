/**
 * 浏览器端各模块共用的管道。
 *
 * 这些文件由 `build.mjs` 拼接成一个 bundle，共享同一个 factory 作用域，所以这里
 * 声明的函数在后面的文件里可以直接调用；`build.mjs` 里的顺序就是声明顺序。
 *
 * bundle 是一个普通 classic script：没有 TypeScript、没有 JSX、没有 import，
 * 从模块表里只取 `react`。
 */

/** 宿主那一半占有的路由前缀。 */
var ROUTE_PREFIX = '/dsh-cosyvoice'

/** 设置命名空间；必须等于 profile 里的 entry id（`cordis.patch.yml` 的 `id`）。 */
var SETTINGS_ENTRY = 'cosyvoice'

/** 必须等于包名：boot-graph 的行 id 就是注册键。 */
var PLUGIN_ID = 'dsh-cosyvoice'

/** 非实时：整段一次合成后再播。 */
var MODE_ONE_SHOT = 'one-shot'

/** 实时：SSE 边合成边播。 */
var MODE_STREAM = 'stream'

/** 合成方式存在浏览器本地的键；它是"点了立刻生效"的那一份。 */
var MODE_KEY = 'dsh-cosyvoice.mode'

/**
 * 取本插件的配置表单。
 *
 * 两版宿主在这里不是同一个东西，而**服务的有无本身就是版本号**，不必引入任何
 * 版本判断：
 *
 * - **0.2.1**：`ctx.configForms.get(entryId)` → `ConfigForm`，
 *   写操作 resolve 成 `boolean`（宿主是否接受）；
 * - **0.1.5**：`ctx.settingsScope.bind({ namespace })` → `SettingsScope`，
 *   写操作 resolve 成 `void`。
 *
 * 快照的形状两版是逐字相同的（`status` / `value` / `base` / `user` /
 * `revision` / `writable` / `mode`），所以上层不必分支 —— 真正需要归一化的只有
 * 写操作的**返回值**。这一点是必须的，因为 `undefined` 是 falsy：若直接把 0.1.5
 * 的 `set()` 交上去，"写入成功"会被当成一个假值，于是"写了一看成功了再一次显示
 * 失败"这类错判就会重演 —— v2.1.1 那次"切换模式没反应"的根因正是这一类。
 * @param ctx - 客户端插件 context。
 * @param entryId - 设置命名空间。
 * @returns 表单控制器；宿主一个都没有时 undefined（此时不该渲染设置页）。
 */
function configFormOf(ctx, entryId) {
  if (!ctx) return undefined
  try {
    if (ctx.configForms && typeof ctx.configForms.get === 'function') {
      return normalizeWrites(ctx.configForms.get(entryId))
    }
    if (ctx.settingsScope && typeof ctx.settingsScope.bind === 'function') {
      return normalizeWrites(ctx.settingsScope.bind({ namespace: entryId }))
    }
  } catch (error) {
    console.error('[dsh-cosyvoice] 无法取得配置表单：', error)
  }
  return undefined
}

/**
 * 把写操作的结果统一成「resolve = 已接受，reject = 没写进去」。
 *
 * 之所以用 reject 而不是返回 false：本插件的设置页用 `promise.then(ok).catch(fail)`
 * 表达结果（见 `settings-page.js` 的 `switchMode` / `writeVisible`），于是归一化到
 * reject 可以让 failure 自动走到已经存在的那条提示分支，上层一行都不用改。
 *
 * 0.1.5 的 `SettingsScope.set` 文档写明"被拒或失败的写入会改为重载宿主状态"——
 * 也就是它**不 reject，也不给出结论**。于是那一版唯一可靠的判据是 `writable`：
 * memory 模式（远程/非 loopback 页面）下文档永不接受写入。
 * @param form - 宿主给的表单控制器。
 * @returns 写结果语义统一之后的同一个表单。
 */
function normalizeWrites(form) {
  if (!form || typeof form.getSnapshot !== 'function') return undefined
  return {
    getSnapshot: function () { return form.getSnapshot() },
    subscribe: function (listener) { return form.subscribe(listener) },
    set: function (field, value) {
      return Promise.resolve(form.set(field, value)).then(function (result) {
        if (typeof result === 'boolean') {
          if (result) return true
          throw new Error('未写入配置：宿主拒绝了这次写入')
        }
        // 0.1.5：宿主不告诉结论，只能自己看这一份文档可不可写。
        var snapshot = form.getSnapshot()
        if (snapshot && snapshot.writable === false) {
          throw new Error('未写入配置：这一份设置文档不接受写入（宿主运行在-memory 模式）')
        }
        return true
      })
    },
  }
}

/** localStorage 不可用时（无痕模式、沙箱）兜在这一份里，页面内仍然能切换。 */
var modeMemory = ''

/**
 * 当前想要的合成方式。
 *
 * 存在本地而不是只读配置镜像，是因为写配置要走一趟宿主通道（有时还会因为 schema
 * 没重载而被拒），而"点了一下没反应"是最差的体验 —— 这里先让它立刻生效，配置的
 * 写入再异步去试，失败也只是提示，不影响这一次播放。
 * @returns `stream` / `one-shot` / `''`（没选过，交给服务端配置决定）。
 */
function readMode() {
  try {
    var stored = window.localStorage === undefined || window.localStorage === null
      ? ''
      : window.localStorage.getItem(MODE_KEY)
    if (stored === MODE_STREAM || stored === MODE_ONE_SHOT) return stored
  } catch (error) {
    // 读不到就当没选过。
  }
  return modeMemory
}

/**
 * 记住当前选择的合成方式。
 * @param value - `stream` / `one-shot`。
 */
function saveMode(value) {
  modeMemory = value === MODE_STREAM ? MODE_STREAM : MODE_ONE_SHOT
  try {
    if (window.localStorage !== undefined && window.localStorage !== null) {
      window.localStorage.setItem(MODE_KEY, modeMemory)
    }
  } catch (error) {
    // 存不下也不影响这一页。
  }
}

/** 角色扮演开关的存储键。 */
var ROLEPLAY_KEY = 'dsh-cosyvoice.roleplay'

/** 旁白音色的存储键。 */
var NARRATION_KEY = 'dsh-cosyvoice.narrationVoice'

/** 角色音色的存储键。 */
var CHARACTER_KEY = 'dsh-cosyvoice.characterVoice'

/** localStorage 不可用时的兜底：键 → 值。 */
var prefMemory = {}

/**
 * 读一个本机偏好。
 *
 * 与合成方式同一套道理：绑定音色也好、开关也好，走宿主配置通道都可能被拒，
 * 而"改了没反应"是不可接受的。所以本机先记一份，每次朗读请求带上，服务端
 * 见到就用它 —— 页面内当场生效，配置写得进去就顺带持久化。
 * @param key - 存储键。
 * @returns 存过的值；**没存过是 null，存过空串是空串** —— 这个区别有意义：
 *   "跟随当前音色"就是存一个空串，而没存过应当听配置的。
 */
function readPref(key) {
  if (Object.prototype.hasOwnProperty.call(prefMemory, key)) return prefMemory[key]
  try {
    if (window.localStorage !== undefined && window.localStorage !== null) {
      var stored = window.localStorage.getItem(key)
      return stored === null || stored === undefined ? null : String(stored)
    }
  } catch (error) {
    // 读不到就当没存过。
  }
  return null
}

/**
 * 写一个本机偏好。
 * @param key - 存储键。
 * @param value - 值；空串表示"清掉，重新听配置的"。
 */
function savePref(key, value) {
  prefMemory[key] = value
  try {
    if (window.localStorage !== undefined && window.localStorage !== null) {
      window.localStorage.setItem(key, value)
    }
  } catch (error) {
    // 存不下也不影响这一页。
  }
}

/** @returns `'true'` / `'false'` / `''`（没选过）。 */
function readRoleplay() {
  return readPref(ROLEPLAY_KEY) === 'true' ? 'true' : readPref(ROLEPLAY_KEY) === 'false' ? 'false' : ''
}

/** @param on - 是否开启。 */
function saveRoleplay(on) {
  savePref(ROLEPLAY_KEY, on ? 'true' : 'false')
}

/** @returns 绑定的旁白音色 ID；没存过是 null，存过"跟随"是空串。 */
function readNarrationVoice() {
  return readPref(NARRATION_KEY)
}

/** @param id - 旁白音色 ID。 */
function saveNarrationVoice(id) {
  savePref(NARRATION_KEY, String(id === undefined || id === null ? '' : id))
}

/** @returns 绑定的角色音色 ID；没存过是 null，存过"跟随"是空串。 */
function readCharacterVoice() {
  return readPref(CHARACTER_KEY)
}

/** @param id - 角色音色 ID。 */
function saveCharacterVoice(id) {
  savePref(CHARACTER_KEY, String(id === undefined || id === null ? '' : id))
}

/** 主机名主题 token，每个都带兜底，缺 token 时降级而不是变空白。 */
var T = {
  text: 'var(--dsw-alias-label-primary, inherit)',
  textDim: 'var(--dsw-alias-label-secondary, inherit)',
  textFaint: 'var(--dsw-alias-label-tertiary, inherit)',
  border: 'var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.24))',
  borderSoft: 'var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.16))',
  panel: 'var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.06))',
  accent: 'var(--dsw-alias-brand-primary, currentColor)',
}

/**
 * 调用一个宿主路由。
 *
 * 永不抛异常：失败的调用 resolve 成 `{ ok: false, message }`，于是渲染路径不会
 * 因为一次瞬时宿主错误而崩掉。
 * @param action - 插件前缀下的路由名（例如 `speak-message`）。
 * @param body - JSON body；省略即 GET。
 * @param method - 覆盖 HTTP 方法（档案的删除用 DELETE）。
 * @returns 解析后的响应，或失败信封。
 */
async function rpc(action, body, method) {
  try {
    const response = await fetch(ROUTE_PREFIX + '/' + action, {
      method: method ?? (body === undefined ? 'GET' : 'POST'),
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    if (text === '') return { ok: response.ok }
    try {
      return JSON.parse(text)
    } catch (error) {
      return { ok: false, message: '返回内容不是合法 JSON' }
    }
  } catch (error) {
    return { ok: false, message: String(error) }
  }
}

/**
 * 上传一段字节并取回 JSON（音色克隆用）。
 *
 * 与 {@link rpc} 一样永不抛异常，于是"上传失败"不会把设置页掀翻。
 * @param action - 插件前缀下的路由名。
 * @param query - 查询串（已编码）。
 * @param bytes - 要送出去的字节。
 * @returns 解析后的响应，或失败信封。
 */
async function rpcBytes(action, query, bytes) {
  try {
    const response = await fetch(`${ROUTE_PREFIX}/${action}?${query}`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: bytes,
    })
    const text = await response.text()
    if (text === '') return { ok: response.ok }
    try {
      return JSON.parse(text)
    } catch (error) {
      return { ok: false, message: '返回内容不是合法 JSON' }
    }
  } catch (error) {
    return { ok: false, message: String(error) }
  }
}

/**
 * 播放状态：按 messageId 索引的一次性快照。
 *
 * 全局单实例而非每按钮一份，因为**同时只该有一个声音在响**：一个 `Audio`
 * 元素、一份状态，点第二条消息的播放键自然接管前一条。
 */
var player = (function () {
  /** @type {{ idle: true } | { kind: 'loading' | 'playing' | 'error', messageId: string, message?: string }} */
  var state = { idle: true }
  var listeners = []
  var audio = null

  /**
   * AudioContext：**懒建**。浏览器的自动播放策略要求它在一个用户手势里醒来，而
   * 播放键的点击正是那个手势 —— 提前建只是多一个 suspended 的上下文。
   * @type {any}
   */
  var ctx = null

  /** 已经排上日程、还没播完的音源。 */
  var sources = []

  /** 下一块音频该在什么时刻开始（相对 AudioContext 自己的时钟）。 */
  var nextStart = 0

  /**
   * 正在进行的一次流式播放；`open` 表示后面还会有块过来。
   * @type {{ messageId: string, open: boolean } | null}
   */
  var streaming = null

  function emit() {
    for (var i = 0; i < listeners.length; i += 1) listeners[i]()
  }

  function element() {
    if (audio === null) audio = new Audio()
    return audio
  }

  function set(next) {
    state = next
    emit()
  }

  /**
   * 取出 AudioContext，必要时把它叫醒。
   * @returns AudioContext。
   */
  function audioContext() {
    if (ctx === null) {
      var Ctor = window.AudioContext === undefined ? window.webkitAudioContext : window.AudioContext
      if (Ctor === undefined) throw new Error('这个浏览器不支持 Web Audio，请到设置里改用「非实时」模式。')
      ctx = new Ctor()
    }
    // 页面刚打开时它常常是 suspended：resume 一次没有任何副作用。
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume()
    return ctx
  }

  /**
   * 收掉一次流式播放：停掉所有还在排队的音源并把游标拨回当下。
   *
   * 那些音源是**已经排到未来某刻**的，光 `currentTime` 归零不够 —— 不去 `stop()`
   * 它们的话，一段听起来已经停了的声音会从半中间重新冒出来。
   */
  function resetStream() {
    for (var i = 0; i < sources.length; i += 1) {
      try {
        sources[i].onended = null
        sources[i].stop()
      } catch (error) {
        // 已经播完的音源再 stop 一次会抛，无所谓。
      }
    }
    sources = []
    if (ctx !== null) nextStart = ctx.currentTime
    streaming = null
  }

  /**
   * 把一小块音频排到播放日程上。
   * @param base64 - Base64 编码的 16 位小端 PCM。
   * @param sampleRate - 采样率。
   */
  function feed(base64, sampleRate) {
    if (streaming === null) return
    var messageId = streaming.messageId
    var context = audioContext()
    var floats = pcmToFloats(base64ToBytes(base64))
    if (floats.length === 0) return

    var rate = Number(sampleRate)
    if (!isFinite(rate) || rate <= 0) rate = 24000
    var buffer = context.createBuffer(1, floats.length, rate)
    if (typeof buffer.copyToChannel === 'function') buffer.copyToChannel(floats, 0)
    else buffer.getChannelData(0).set(floats)

    var source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    var startedAt = nextStart < context.currentTime ? context.currentTime : nextStart
    source.start(startedAt)
    sources.push(source)
    // 流式之所以"听不出接缝"，全在这一行：下一块排在**上一块结束的那一刻**（精确
    // 到采样），而不是"播完再去取下一块"。后者每两句之间都要付一个网络往返，听
    // 起来就是一顿一顿的。
    nextStart = startedAt + buffer.duration

    source.onended = function () {
      var at = sources.indexOf(source)
      if (at >= 0) sources.splice(at, 1)
      // 全部播完、且服务端说过不会再有块了，才回到空闲。
      if (sources.length === 0 && streaming !== null && !streaming.open) set({ idle: true })
    }
    set({ kind: 'playing', messageId: messageId })
  }

  return {
    /**
     * 开始一次流式播放。后续每一块音频由 {@link feed} 排上日程。
     * @param messageId - 归属消息。
     */
    beginStream: function (messageId) {
      resetStream()
      streaming = { messageId: messageId, open: true }
      nextStart = 0
      set({ kind: 'loading', messageId: messageId })
    },
    /**
     * 排一块音频上播放日程（见该类里 {@link feed} 的说明）。
     * @param base64 - Base64 编码的 16 位小端 PCM。
     * @param sampleRate - 采样率。
     */
    feed: feed,
    /** 服务端不会再有块过来了；播完已排的那些就回到空闲。 */
    endStream: function () {
      if (streaming === null) return
      streaming.open = false
      if (sources.length === 0) set({ idle: true })
    },
    /** @returns 当前状态快照。 */
    getSnapshot: function () { return state },
    /** @param listener - 变更回调。 @returns 取消订阅函数。 */
    subscribe: function (listener) {
      listeners.push(listener)
      return function () {
        var at = listeners.indexOf(listener)
        if (at >= 0) listeners.splice(at, 1)
      }
    },
    /**
     * 开始播一段音频。
     * @param messageId - 归属消息，用于把"正在播"落在正确的按钮上。
     * @param url - 音频地址。
     */
    play: function (messageId, url) {
      const audio = element()
      resetStream()
      audio.pause()
      audio.src = url
      audio.currentTime = 0
      set({ kind: 'loading', messageId: messageId })
      const started = audio.play()
      if (started && typeof started.then === 'function') {
        started.then(function () {
          set({ kind: 'playing', messageId: messageId })
        }).catch(function () {
          set({ kind: 'error', messageId: messageId, message: '浏览器拒绝了自动播放，请再点一次' })
        })
      } else {
        set({ kind: 'playing', messageId: messageId })
      }
      audio.onended = function () { set({ idle: true }) }
      audio.onerror = function () {
        set({ kind: 'error', messageId: messageId, message: '音频播放失败' })
      }
    },
    /** 停止播放：整段播放与流式播放一起收掉。 */
    stop: function () {
      const audio = element()
      resetStream()
      audio.pause()
      audio.onended = null
      audio.onerror = null
      set({ idle: true })
    },
    /**
     * 标记某条消息正在合成。
     * @param messageId - 目标消息。
     */
    loading: function (messageId) {
      resetStream()
      set({ kind: 'loading', messageId: messageId })
    },
    /**
     * 标记某条消息失败。
     * @param messageId - 目标消息。
     * @param message - 展示给用户的说明。
     */
    fail: function (messageId, message) {
      set({ kind: 'error', messageId: messageId, message: message })
    },
  }
})()

/**
 * Base64 → 字节。
 *
 * 手写而不是用 `atob`：一是一段 base64 里混入换行或缺失填充时它会直接抛，二是少
 * 一个宿主 API，产物自检就少一处环境差异。
 * @param text - Base64 文本。
 * @returns 字节。
 */
var base64ToBytes = (function () {
  var table = null
  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  /**
   * @param base64 - Base64 文本。
   * @returns 字节。
   */
  return function decode(base64) {
    if (table === null) {
      table = {}
      for (var i = 0; i < ALPHABET.length; i += 1) table[ALPHABET.charAt(i)] = i
    }
    var clean = String(base64 === undefined ? '' : base64).replace(/[^A-Za-z0-9+/=]/g, '')
    var length = clean.length
    var padding = clean.charAt(length - 2) === '=' ? 2 : clean.charAt(length - 1) === '=' ? 1 : 0
    var bytes = new Uint8Array(Math.floor((length * 3) / 4) - padding)
    var at = 0
    var acc = 0
    var bits = 0
    for (var i = 0; i < length; i += 1) {
      var char = clean.charAt(i)
      if (char === '=') break
      acc = (acc << 6) | table[char]
      bits += 6
      if (bits >= 8) {
        bits -= 8
        bytes[at] = (acc >> bits) & 0xFF
        at += 1
      }
    }
    return bytes
  }
})()

/**
 * 16 位小端 PCM → WebAudio 要的 Float32（-1 ~ 1）。
 * @param bytes - 原始采样。
 * @returns 归一化后的采样。
 */
function pcmToFloats(bytes) {
  var count = Math.floor(bytes.length / 2)
  var out = new Float32Array(count)
  for (var i = 0; i < count; i += 1) {
    var sample = (bytes[i * 2 + 1] << 8) | bytes[i * 2]
    if (sample >= 32768) sample -= 65536
    out[i] = sample / 32768
  }
  return out
}

/**
 * 切出一个 SSE 帧。
 *
 * 与宿主 `host/stream.js` 里那份是同一个形状的两份实现 —— 浏览器端的 bundle 不能
 * 引 Node 模块，而这里也不需要那些 Node 侧的类型。
 * @param frame - 不含结尾空行的原始帧文本。
 * @returns `{ event, data }`；没有 data 行时为 undefined。
 */
function parseFrame(frame) {
  var name = ''
  var lines = []
  var parts = String(frame).split('\n')
  for (var i = 0; i < parts.length; i += 1) {
    var line = parts[i].trim()
    if (line === '') continue
    var colon = line.indexOf(':')
    var key = colon < 0 ? line : line.slice(0, colon).trim()
    var value = colon < 0 ? '' : line.slice(colon + 1).trim()
    if (key === 'event') name = value
    else if (key === 'data') lines.push(value)
  }
  if (lines.length === 0) return undefined
  return { event: name, data: lines.join('\n') }
}

/**
 * 读一条 SSE 流，逐个事件交给回调。
 * @param body - 响应体（StreamReader 的宿主）。
 * @param onFrame - 每帧回调。
 * @returns 流结束时的 Promise。
 */
async function readSseFrames(body, onFrame) {
  var decoder = new TextDecoder()
  var reader = body.getReader()
  var buffer = ''
  while (true) {
    var next = await reader.read()
    if (next.done) break
    buffer += decoder.decode(next.value, { stream: true })
    // TCP 不保证一次读到整帧，所以留下尾巴等下一趟。
    var at = buffer.indexOf('\n\n')
    while (at >= 0) {
      var frame = parseFrame(buffer.slice(0, at))
      buffer = buffer.slice(at + 2)
      if (frame !== undefined) onFrame(frame)
      at = buffer.indexOf('\n\n')
    }
  }
  if (buffer.trim() !== '') {
    var tail = parseFrame(buffer)
    if (tail !== undefined) onFrame(tail)
  }
}

/**
 * 请求一次朗读并把结果交给播放器。
 *
 * 服务端按自己的配置决定回整段 JSON 还是 SSE 流，这里不先去问 `mode` —— 少一次
 * 往返，而 `content-type` 已经是唯一的真相来源：模式可能在两次请求之间被改掉，问
 * 来的答案反而可能是过期的。
 * @param action - 插件前缀下的路由名。
 * @param body - JSON body。
 * @param messageId - 归属消息，用于把状态落在正确的按钮上。
 * @returns 处理完毕的 Promise。
 */
async function speakAs(action, body, messageId) {
  player.loading(messageId)
  var payload = {}
  if (body !== undefined && body !== null) {
    for (var key in body) if (Object.prototype.hasOwnProperty.call(body, key)) payload[key] = body[key]
  }
  // 带上"我现在想要的模式"：服务端只在它合法时才听它的，否则仍按自己的配置来。
  // 于是切换是**当场生效**的，不必等宿主把配置写回去。
  var wanted = readMode()
  if (wanted !== '') payload.mode = wanted

  // 角色扮演同理：开关与两个音色都随请求走，服务端见了就用。写配置是"顺带"，
  // 写不进去也不会让这一次朗读回到旧的读法。
  var roleplay = readRoleplay()
  if (roleplay === 'true') payload.roleplay = true
  else if (roleplay === 'false') payload.roleplay = false
  // 空串是有意义的（"跟随当前音色"），但那该由配置去表达，不必占用请求体。
  var narrationVoice = readNarrationVoice()
  if (narrationVoice !== null && narrationVoice !== '') payload.narrationVoiceId = narrationVoice
  var characterVoice = readCharacterVoice()
  if (characterVoice !== null && characterVoice !== '') payload.characterVoiceId = characterVoice

  var response
  try {
    response = await fetch(ROUTE_PREFIX + '/' + action, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    player.fail(messageId, String(error))
    return
  }

  var type = response.headers === undefined || response.headers === null
    ? ''
    : String(response.headers.get('content-type') || '')

  if (type.indexOf('text/event-stream') >= 0) {
    if (response.body === undefined || response.body === null || typeof response.body.getReader !== 'function') {
      player.fail(messageId, '这个浏览器读不了流式响应，请在设置里改用「非实时」模式。')
      return
    }
    player.beginStream(messageId)
    try {
      await readSseFrames(response.body, function (frame) {
        var data = {}
        try { data = JSON.parse(frame.data) } catch (error) { data = {} }
        if (frame.event === 'chunk') {
          try {
            player.feed(data.audio, data.sampleRate)
          } catch (error) {
            player.fail(messageId, String(error))
          }
        } else if (frame.event === 'done') {
          player.endStream()
        } else if (frame.event === 'error') {
          player.fail(messageId, data.message === undefined ? '语音合成失败' : data.message)
        }
      })
    } catch (error) {
      player.fail(messageId, String(error))
    }
    return
  }

  var text = ''
  try {
    text = await response.text()
  } catch (error) {
    player.fail(messageId, String(error))
    return
  }
  var payload
  try {
    payload = text === '' ? { ok: response.ok } : JSON.parse(text)
  } catch (error) {
    player.fail(messageId, '返回内容不是合法 JSON')
    return
  }
  if (payload === undefined || payload === null || !payload.ok) {
    player.fail(messageId, (payload !== null && payload !== undefined && payload.message) || '语音合成失败')
    return
  }
  if (payload.clip === undefined || payload.clip === null || !payload.clip.url) {
    player.fail(messageId, '语音合成失败')
    return
  }
  player.play(messageId, payload.clip.url)
}

/**
 * 订阅播放器状态。
 * @returns 当前状态。
 */
function usePlayerState() {
  var pair = React.useState(function () { return player.getSnapshot() })
  var snapshot = pair[0]
  var setSnapshot = pair[1]
  React.useEffect(function () {
    setSnapshot(player.getSnapshot())
    return player.subscribe(function () { setSnapshot(player.getSnapshot()) })
  }, [])
  return snapshot
}

/**
 * 某条消息此刻的播放状态。
 * @param snapshot - 播放器快照。
 * @param messageId - 目标消息。
 * @returns `'idle' | 'loading' | 'playing' | 'error'`，以及错误消息。
 */
function stateOf(snapshot, messageId) {
  if (snapshot.idle === true) return { phase: 'idle', message: undefined }
  if (snapshot.messageId !== messageId) return { phase: 'idle', message: undefined }
  return { phase: snapshot.kind, message: snapshot.message }
}

/**
 * 从 chat 快照里抽出一条助手消息的纯文本。
 *
 * 与宿主渲染"复制"按钮时用同一套规则（只取 `kind === 'text'` 的块），所以听到的
 * 和复制出来的是同一段内容。
 * @param snapshot - chat 快照。
 * @param messageId - 目标消息。
 * @returns 文本；不在已加载窗口内时返回 undefined。
 */
function textOfMessage(snapshot, messageId) {
  if (snapshot === undefined || snapshot === null) return undefined
  const nodes = snapshot.legacy === undefined ? undefined : snapshot.legacy.nodes
  if (nodes === undefined) return undefined
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i]
    if (node === undefined || node.kind !== 'assistant' || node.messageId !== messageId) continue
    const blocks = node.blocks === undefined ? [] : node.blocks
    let text = ''
    for (let j = 0; j < blocks.length; j += 1) {
      const block = blocks[j]
      if (block !== undefined && block.kind === 'text' && typeof block.text === 'string') text += block.text
    }
    return text === '' ? undefined : text
  }
  return undefined
}
