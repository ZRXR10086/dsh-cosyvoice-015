/**
 * 宿主端集成测试：**真的起一个 HTTP 服务器**，把 `apply()` 注册出来的路由挂上去，
 * 再用真实的 `fetch` 打它。
 *
 * 与 `host.test.mjs` 的区别是层次：那边测单个类，这边测"插件接好线之后到底能不能
 * 工作"——包括 cordis 的 `apply(ctx, config)` 签名、`harness.js` 的包解析、路由
 * 分发、以及一次合成从 HTTP 请求到音频字节的全过程。
 *
 * 四处理刻意的设计：
 *
 * - **非实时、实时、角色扮演各起一台服务器**：同一份路由代码在三种配置下各注册一次，
 *   于是"同一个 HTTP 表面几种形态"这件事是真的被测到的 —— 而不是各处各造一批
 *   各自的 mocks，proving 不了它们共享的那段代码。
 * - **音色档案是三台共享的一份 JSON**（`~/.dsh/voice/profiles.json`，插件自管）。
 *   所以角色扮演那一台必须**最后**才挂：它要绑两套档案，提前建档案会污染前面那些
 *   "档案清单为空"的用例。绑定值是**档案 id** 而不是音色 ID —— 档案才是
 *   "模型 + 音色"的完整单位（MiMo 复刻音色压根没有 ID 可绑）。
 * - **临时 harness home**：`DSH_HOME` 指向一个临时目录，里面按真实布局放一个
 *   `profiles/node_modules/@deepseek-ai/schemastery` 链接，于是这份测试同时验证了
 *   锚点解析这条路径本身。
 * - **假的 `globalThis.fetch`**：合成走的是注入的全局 fetch，所以"合成成功""取出
 *   音频字节""错误消息"都能在不花钱、不联网的情况下复现。
 * - **`apply` 用假 ctx**：只提供插件真正用到的三个能力（`effect`、`webServer`、
 *   `logger`），多给一样都是在掩盖真实的依赖面。
 *
 * 运行：`node --test test/`
 * @module dsh-cosyvoice/test-integration
 */

import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { stageHome } from './harness-home.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE = resolve(HERE, '..')

/** 本测试注入的假合成结果：一段固定的"音频"字节。 */
const FAKE_AUDIO = Buffer.from('FAKE-MP3-BYTES')

/** 流式链路的第一块 PCM（16 位小端，4 个采样）。 */
const PCM_ONE = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08])

/** 流式链路的第二块 PCM。 */
const PCM_TWO = Buffer.from([0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18])

/** 假云端的 SSE 响应体：`X-DashScope-SSE` 打开时用的那一份。 */
const SSE_BODY = [
  'event: sentence-begin',
  'data: {"header":{"event":"sentence-begin"}}',
  '',
  'event: sentence-synthesis',
  `data: {"payload":{"data":"${PCM_ONE.toString('base64')}"}}`,
  '',
  'event: sentence-synthesis',
  `data: {"payload":{"data":"${PCM_TWO.toString('base64')}"}}`,
  '',
  'event: sentence-end',
  'data: {"header":{"event":"sentence-end"},"usage":{"characters":9}}',
  '',
  'event: sentence-synthesis',
  'data: {"header":{"event":"sentence-synthesis"},"output":{"audio":{"url":"https://audio.example.com/all.wav"}},"usage":{"characters":9}}',
  '',
].join('\n')

/**
 * 假 SSE 响应。
 *
 * body 是一整段文本、切成两块投递，于是"一次读到半帧"这条路径也被覆盖 —— 这在
 * 真实网络上才是常态。
 * @param body - SSE 文本。
 * @returns 响应。
 */
function fakeStream(body) {
  const bytes = Buffer.from(body, 'utf8')
  const half = Math.floor(bytes.length / 2)
  return {
    ok: true,
    status: 200,
    text: async () => body,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.subarray(0, half))
        controller.enqueue(bytes.subarray(half))
        controller.close()
      },
    }),
  }
}

/**
 * HTTP 响应体的 JSON 解析。
 * @param response - 响应。
 * @returns 解析结果。
 */
async function json(response) {
  return JSON.parse(await response.text())
}

/**
 * 一个假的百炼响应。
 * @param payload - 响应体。
 * @returns 响应。
 */
function fake(payload) {
  return { ok: true, status: 200, text: async () => JSON.stringify(payload) }
}

let home
let server
let base
/** 第二台服务器：同样的插件，`mode: 'stream'`。 */
let streamServer
let streamBase
/** 第三台服务器：`mode: 'one-shot'` + 角色扮演开启。 */
let roleplayServer
let roleplayBase
/** 插件发给"百炼"的每一次合成请求，用于断言旁白/台词各发给了谁。 */
let speakCalls = []
/**
 * 真正的网络 fetch。
 *
 * 下面会把 `globalThis.fetch` 换成假的（合成链路走它），所以测试自己发请求必须
 * 用这一份 —— 否则连"请求服务器"这件事本身也被假 fetch 接走了。
 */
/** 测试期间被替换掉的全局 fetch；after 里还原。 */
let realFetch

before(async () => {
  home = stageHome()
  process.env.DSH_HOME = home

  // 假 fetch：合成请求返回一段固定音频（`SpeechClient` 默认读全局 fetch）。
  // 音色克隆打的是另外两个端点，所以这里按 URL 分派 —— 于是"上传 → 取内网地址 →
  // 注册 → 查询就绪"整条链也是在不联网的前提下验证的。
  realFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    const target = String(url ?? '')
    // 角色扮演一次朗读会发好几个请求，所以要把"发给了哪个音色"记下来 ——
    // 顺序对不对只能在这上面看。
    if (target.includes('SpeechSynthesizer')) speakCalls.push({ url: target, init })
    // 流式与非流式打的是同一个端点，靠请求头区分 —— 这也是真实链路上的样子。
    if (init?.headers?.['X-DashScope-SSE'] === 'enable') return fakeStream(SSE_BODY)
    if (target.includes('/api/v1/files')) {
      return fake(init?.body === undefined
        ? { data: { url: 'https://intranet.example.com/a.wav' } }
        : { data: { uploaded_files: [{ file_id: 'file-1' }] } })
    }
    if (target.includes('customization')) {
      const body = JSON.parse(String(init?.body ?? '{}'))
      const action = body?.input?.action
      if (action === 'create_voice') return fake({ output: { voice_id: 'cosyvoice-v3.5-plus-dsh-ab12cd' } })
      if (action === 'query_voice') return fake({ output: { voice_id: body.input.voice_id, status: 'OK' } })
      return fake({ output: { voice_list: [{ voice_id: 'cosyvoice-v3.5-plus-cloud1', status: 'OK' }] } })
    }
    return fake({
      output: { audio: { data: FAKE_AUDIO.toString('base64') } },
      usage: { characters: 5 },
    })
  }

  const plugin = await import('../host/index.js')

  /**
   * 一个只提供插件真正用到的三个能力的 ctx。
   * @returns context 与它会收到的路由。
   */
  function spareContext() {
    const routes = []
    return {
      routes,
      ctx: {
        effect: (fn) => { fn(); return () => {} },
        webServer: { register: (route) => { routes.push(route); return () => {} } },
        logger: { warn: () => {} },
      },
    }
  }

  /**
   * 把一组路由挂到一个真服务器上；分发只看路径，与宿主一致。
   * @param routes - 要挂的路由。
   * @returns 服务器。
   */
  function serveWith(routes) {
    return createServer((req, res) => {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname
      const route = routes.find(candidate => candidate.path === path)
      if (route === undefined) {
        res.writeHead(404).end()
        return
      }
      Promise.resolve(route.handler(req, res)).catch(() => { res.destroy() })
    })
  }

  const plain = spareContext()
  plugin.apply(plain.ctx, {
    apiKey: 'sk-test',
    voiceId: 'voice-1',
    model: 'cosyvoice-v3.5-plus',
    outputDir: join(home, 'audio'),
    bootSound: true,
    mode: 'one-shot',
  })

  const realtime = spareContext()
  plugin.apply(realtime.ctx, {
    apiKey: 'sk-test',
    voiceId: 'voice-1',
    model: 'cosyvoice-v3.5-plus',
    // 两条链路的产物扩展名不同（mp3 / wav），目录也分开：于是两种缓存互不覆盖，
    // 断言能看清到底是哪一个命中了。
    outputDir: join(home, 'audio-stream'),
    bootSound: true,
    mode: 'stream',
  })

  // 角色扮演那一台在「角色扮演路由」那个 describe 里才挂：它要绑两套**音色档案**，
  // 而档案清单是三台共享的一份 JSON（`~/.dsh/voice/profiles.json`）。提前建档案会
  // 污染前面那些"档案清单为空"的用例，所以挪到后面连着档案一起建。

  server = serveWith(plain.routes)
  await new Promise((resolveListen) => { server.listen(0, '127.0.0.1', resolveListen) })
  base = `http://127.0.0.1:${String(server.address().port)}`

  streamServer = serveWith(realtime.routes)
  await new Promise((resolveListen) => { streamServer.listen(0, '127.0.0.1', resolveListen) })
  streamBase = `http://127.0.0.1:${String(streamServer.address().port)}`
})

// 角色扮演那一台由它自己的 describe 关闭：那个 describe 的`before` 才建它
// （要连带建两套音色档案），所以它的生命周期不对齐前两台。
after(() => {
  if (server !== undefined) server.close()
  if (streamServer !== undefined) streamServer.close()
  delete process.env.DSH_HOME
})

describe('apply', () => {
  it('在真实 HTTP 上响应 /status，且不把密钥带出去', async () => {
    const response = await realFetch(`${base}/dsh-cosyvoice/status`)
    const body = await json(response)
    assert.equal(body.ok, true)
    assert.equal(body.configured, true)
    assert.equal(body.voiceId, 'voice-1')
    assert.equal(body.count, 0)
    assert.equal(body.mode, 'one-shot')
    assert.ok(!JSON.stringify(body).includes('sk-test'), 'status 绝不能回传 API Key')
  })

  it('另一份配置下的 /status 报新的合成方式', async () => {
    const body = await json(await realFetch(`${streamBase}/dsh-cosyvoice/status`))
    assert.equal(body.mode, 'stream')
  })
})

describe('合成路由', () => {
  it('/speak 整段一次合成并落盘，/audio 取回同样的字节', async () => {
    const spoken = await json(await realFetch(`${base}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '这是一条要整段合成的回答。第二句也在同一份音频里。' }),
    }))
    assert.equal(spoken.ok, true)
    assert.equal(spoken.mode, 'one-shot')
    assert.equal(spoken.clip.cached, false)
    assert.equal(spoken.clip.name.endsWith('.mp3'), true)

    const audio = await realFetch(`${base}${spoken.clip.url}`)
    assert.equal(audio.headers.get('content-type'), 'audio/mpeg')
    const bytes = Buffer.from(await audio.arrayBuffer())
    assert.deepEqual(bytes, FAKE_AUDIO)
  })

  it('同一段文本第二次直接命中缓存', async () => {
    const first = await json(await realFetch(`${base}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '缓存测试' }),
    }))
    const second = await json(await realFetch(`${base}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '缓存测试' }),
    }))
    assert.equal(first.clip.cached, false)
    assert.equal(second.clip.cached, true)
    assert.equal(second.clip.name, first.clip.name)
  })

  it('/speak-message 用客户端给的文本，并记住它', async () => {
    const spoken = await json(await realFetch(`${base}/dsh-cosyvoice/speak-message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messageId: 'm-fresh', sessionId: 's1', text: '**重点**内容' }),
    }))
    assert.equal(spoken.ok, true)

    // 不传 text，只给 messageId：应当命中上一步记住的文本。
    const again = await json(await realFetch(`${base}/dsh-cosyvoice/speak-message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messageId: 'm-fresh', sessionId: 's1' }),
    }))
    assert.equal(again.ok, true)
    assert.equal(again.clip.name, spoken.clip.name)
  })

  it('/speak-message 取不到文本时给 404 和可读提示', async () => {
    const response = await realFetch(`${base}/dsh-cosyvoice/speak-message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messageId: 'm-unknown', sessionId: 's-nope' }),
    })
    assert.equal(response.status, 404)
    const body = await json(response)
    assert.equal(body.ok, false)
    assert.match(body.message, /没找到这条回答的文本/)
  })

  it('/audio 拒绝目录穿越与不合法文件名', async () => {    for (const name of ['../../etc/passwd', 'nope.mp3', '']) {
      const response = await realFetch(`${base}/dsh-cosyvoice/audio?name=${encodeURIComponent(name)}`)
      assert.equal(response.status, 404, `name=${name} 应当被拒绝`)
    }
  })

  it('/clear 清掉本插件的缓存文件', async () => {
    await realFetch(`${base}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '待清理' }),
    })
    const cleared = await json(await realFetch(`${base}/dsh-cosyvoice/clear`, { method: 'POST' }))
    assert.equal(cleared.ok, true)
    assert.ok(cleared.removed >= 1)
    const status = await json(await realFetch(`${base}/dsh-cosyvoice/status`))
    assert.equal(status.count, 0)
  })

  it('空文本得到 500 与中文提示，而不是崩溃', async () => {
    const response = await realFetch(`${base}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '  **  ' }),
    })
    assert.equal(response.status, 500)
    assert.match((await json(response)).message, /没有可朗读的文本/)
  })
})

/**
 * 取出一条 SSE 文本里某个事件的数据。
 * @param text - SSE 文本。
 * @param event - 事件名。
 * @returns 数据行；没有该事件时返回 undefined。
 */
function dataLines(text, event) {
  const out = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] !== `event: ${event}`) continue
    for (let j = i + 1; j < lines.length; j += 1) {
      if (!lines[j].startsWith('data: ')) break
      out.push(JSON.parse(lines[j].slice('data: '.length)))
    }
  }
  return out
}

describe('实时（流式）合成路由', () => {
  it('/speak 改成 SSE：开放帧 → 音频块 → 收尾给整段地址', async () => {
    const response = await realFetch(`${streamBase}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '流式合成的第一句。这是第二句。' }),
    })
    assert.equal(response.status, 200)
    assert.match(String(response.headers.get('content-type')), /text\/event-stream/)
    const text = await response.text()

    // 一上来就有一帧 open：浏览器不必等到第一块音频才知道连接已经建立。
    assert.ok(text.includes('event: open'), '开头应当有一帧 open')
    const chunks = dataLines(text, 'chunk')
    assert.equal(chunks.length, 2)
    // 每一块就是云端推下来的那一块 PCM，一个字节不多一个字节不少。
    assert.deepEqual(Buffer.from(chunks[0].audio, 'base64'), PCM_ONE)
    assert.deepEqual(Buffer.from(chunks[1].audio, 'base64'), PCM_TWO)
    assert.equal(chunks[0].sampleRate, 24000)

    const done = dataLines(text, 'done')
    assert.equal(done.length, 1)
    assert.equal(done[0].clip.cached, false)
    assert.equal(done[0].clip.name.endsWith('.wav'), true)
    assert.equal(done[0].characters, 9)

    // 完整音频已经落盘：WAV 头之后正是那两块 PCM 拼起来的样子。
    const audio = await realFetch(`${streamBase}${done[0].clip.url}`)
    assert.equal(audio.headers.get('content-type'), 'audio/wav')
    const bytes = Buffer.from(await audio.arrayBuffer())
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF')
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WAVE')
    assert.deepEqual(bytes.subarray(44), Buffer.concat([PCM_ONE, PCM_TWO]))
  })

  it('同一段文本第二次直接给整段地址，不再假装流式', async () => {
    const body = JSON.stringify({ text: '流式缓存测试' })
    const post = () => realFetch(`${streamBase}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })

    // 第一次是真流式：整缓存还没生成，所以一帧 SSE 也省不掉。
    const streamed = dataLines(await (await post()).text(), 'done')
    assert.equal(streamed.length, 1)
    assert.equal(streamed[0].clip.cached, false)

    // 第二次缓存已经在磁盘上了，回 JSON 让它整段取，比再流一次更快也更省。
    const again = await json(await post())
    assert.equal(again.clip.cached, true)
    assert.equal(again.clip.name, streamed[0].clip.name)
  })

  it('实时模式下配置缺失也走 SSE 的 error 帧', async () => {
    const response = await realFetch(`${streamBase}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '  ' }),
    })
    // 空文本在写下第一帧之前就失败，于是还能用普通 JSON 报错。
    assert.equal(response.status, 500)
    assert.match((await json(response)).message, /没有可朗读的文本/)
  })

  it('请求里带的 mode 当场覆盖配置：整段服务器也能出 SSE', async () => {
    // 用户点击切换后必须**这一次**就生效，而不是等宿主把配置写回去 —— 配置通道
    // 迟迟不落（或 schema 没跟着重载）时，等待就表现为"点了没反应"。
    const response = await realFetch(`${base}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '临时的实时请求', mode: 'stream' }),
    })
    assert.match(String(response.headers.get('content-type')), /text\/event-stream/)
    const text = await response.text()
    const chunks = dataLines(text, 'chunk')
    assert.equal(chunks.length, 2)
    assert.deepEqual(Buffer.from(chunks[0].audio, 'base64'), PCM_ONE)
  })

  it('带 one-shot 时实时服务器也回到整段 JSON', async () => {
    const spoken = await json(await realFetch(`${streamBase}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '临时的整段请求', mode: 'one-shot' }),
    }))
    assert.equal(spoken.mode, 'one-shot')
    assert.equal(spoken.clip.name.endsWith('.mp3'), true)
    const audio = await realFetch(`${streamBase}${spoken.clip.url}`)
    assert.equal(audio.headers.get('content-type'), 'audio/mpeg')
  })

  it('不认识的 mode 不生效，仍按配置走', async () => {
    const response = await realFetch(`${streamBase}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '胡乱给一个模式', mode: 'realtime' }),
    })
    assert.match(String(response.headers.get('content-type')), /text\/event-stream/)
  })

  it('/status 按问上来的 mode 报"真正会生效的那个"，并单独给配置值', async () => {
    const asStream = await json(await realFetch(`${base}/dsh-cosyvoice/status?mode=stream`))
    assert.equal(asStream.mode, 'stream')
    // 配置里写的是 one-shot，这一行把它如实报出来，于是页面能说明"已生效但未保存"。
    assert.equal(asStream.configuredMode, 'one-shot')

    const plain = await json(await realFetch(`${base}/dsh-cosyvoice/status`))
    assert.equal(plain.mode, 'one-shot')
    assert.equal(plain.configuredMode, 'one-shot')
  })

  it('流式与非流式的缓存各占一个文件名，互不覆盖', async () => {
    const text = '两条链路各自缓存'
    const once = await json(await realFetch(`${base}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    }))
    const realtime = dataLines(await (await realFetch(`${streamBase}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    })).text(), 'done')
    assert.equal(realtime.length, 1)
    // 同一段文字，两个名字：换模式不会白付第二次钱，也不会拿错音频。
    assert.notEqual(once.clip.name, realtime[0].clip.name)
    const onceAudio = await realFetch(`${base}${once.clip.url}`)
    const realtimeAudio = await realFetch(`${streamBase}${realtime[0].clip.url}`)
    assert.equal(onceAudio.headers.get('content-type'), 'audio/mpeg')
    assert.equal(realtimeAudio.headers.get('content-type'), 'audio/wav')
  })
})

describe('音色档案路由', () => {
  /** POST 一个 JSON，返回解析后的响应与状态码。 */
  async function post(action, body) {
    const response = await realFetch(`${base}/dsh-cosyvoice/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    return { status: response.status, body: await json(response) }
  }

  /** DELETE 一个 JSON，返回解析后的响应与状态码。 */
  async function del(body) {
    const response = await realFetch(`${base}/dsh-cosyvoice/profiles`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    return { status: response.status, body: await json(response) }
  }

  it('新增 → 列表 → 启用 → 删除 的完整往返', async () => {
    const first = await post('profiles', { name: '档案甲', voiceId: 'voice-a', model: 'cosyvoice-v3.5-plus' })
    assert.equal(first.status, 200)
    assert.equal(first.body.profiles.length, 1)
    // 第一套自动成为当前音色，于是保存完立刻就能试听。
    assert.equal(first.body.activeId, first.body.profiles[0].id)

    const second = await post('profiles', { name: '档案乙', voiceId: 'voice-b', model: 'cosyvoice-v3.5-flash' })
    assert.equal(second.body.profiles.length, 2)
    assert.equal(second.body.activeId, first.body.profiles[0].id)

    const activated = await post('profiles/activate', { id: second.body.profiles[1].id })
    assert.equal(activated.body.activeId, second.body.profiles[1].id)

    const listed = await json(await realFetch(`${base}/dsh-cosyvoice/profiles`))
    assert.equal(listed.ok, true)
    assert.equal(listed.profiles.length, 2)
    assert.deepEqual(listed.fallback, { model: 'cosyvoice-v3.5-plus', voiceId: 'voice-1' })

    const removed = await del({ id: listed.profiles[1].id })
    assert.equal(removed.body.profiles.length, 1)
    // 删掉的正是当前音色，于是退回剩下那一条而不是变成"没有音色"。
    assert.equal(removed.body.activeId, listed.profiles[0].id)

    await del({ id: listed.profiles[0].id })
    const emptied = await json(await realFetch(`${base}/dsh-cosyvoice/profiles`))
    assert.equal(emptied.profiles.length, 0)
    assert.equal(emptied.activeId, '')
  })

  it('启用档案后 /status 与合成都用档案里的音色', async () => {
    const saved = await post('profiles', { name: '档案丙', voiceId: 'voice-profile', model: 'model-profile' })
    assert.equal(saved.body.activeId, saved.body.profiles[0].id)

    const status = await json(await realFetch(`${base}/dsh-cosyvoice/status`))
    assert.equal(status.voiceId, 'voice-profile')
    assert.equal(status.model, 'model-profile')
    assert.equal(status.profileId, saved.body.profiles[0].id)
    assert.equal(status.configured, true)

    await del({ id: saved.body.profiles[0].id })
    const back = await json(await realFetch(`${base}/dsh-cosyvoice/status`))
    assert.equal(back.voiceId, 'voice-1')
  })

  it('缺音色 ID 得 400，启用不存在的档案得 404', async () => {
    const noVoice = await post('profiles', { name: '没有音色', voiceId: '   ' })
    assert.equal(noVoice.status, 400)
    assert.match(noVoice.body.message, /音色 ID 不能为空/)

    const missing = await post('profiles/activate', { id: '不存在的 id' })
    assert.equal(missing.status, 404)

    const badJson = await realFetch(`${base}/dsh-cosyvoice/profiles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ 这不是 JSON',
    })
    assert.equal(badJson.status, 400)
  })
})

describe('音色克隆路由', () => {
  /** POST 一段裸音频字节。 */
  async function upload(body, query = '') {
    const response = await realFetch(`${base}/dsh-cosyvoice/clone${query}`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body,
    })
    return { status: response.status, body: await json(response) }
  }

  it('上传音频 → 得到音色 ID → 轮询就绪 → 自动设为当前音色', async () => {
    const made = await upload(Buffer.from('RIFF-fake-wav'), '?name=' + encodeURIComponent('我的声音') + '&filename=my.wav')
    assert.equal(made.status, 200)
    assert.equal(made.body.profile.source, 'clone')
    assert.equal(made.body.profile.voiceId, 'cosyvoice-v3.5-plus-dsh-ab12cd')
    // 刚注册完还没部署好，所以是 pending —— 但用户此刻就该在列表里看见它。
    assert.equal(made.body.profile.status, 'pending')
    assert.equal(made.body.profile.name, '我的声音')

    const polled = await json(await realFetch(`${base}/dsh-cosyvoice/clone/status?id=${encodeURIComponent(made.body.profile.id)}`))
    assert.equal(polled.ok, true)
    assert.equal(polled.phase, 'ready')
    // 就绪即落盘，并自动设为当前音色：用户上传一段音频，默认就是想用它。
    assert.equal(polled.activeId, made.body.profile.id)
    const stored = polled.profiles.find(item => item.id === made.body.profile.id)
    assert.equal(stored.status, 'ready')

    const status = await json(await realFetch(`${base}/dsh-cosyvoice/status`))
    assert.equal(status.voiceId, 'cosyvoice-v3.5-plus-dsh-ab12cd')
  })

  it('空 body 得 400，而不是拿着空音频去打百炼', async () => {
    const empty = await upload(Buffer.alloc(0))
    assert.equal(empty.status, 400)
    assert.match(empty.body.message, /没有收到音频/)
  })

  it('查一个不存在的档案得 404', async () => {
    const response = await realFetch(`${base}/dsh-cosyvoice/clone/status?id=nope`)
    assert.equal(response.status, 404)
  })

  it('云端音色能一键导入，模型从音色 ID 前缀反推', async () => {
    const listed = await json(await realFetch(`${base}/dsh-cosyvoice/cloud-voices`))
    assert.equal(listed.ok, true)
    assert.equal(listed.voices.length, 1)

    const imported = await json(await realFetch(`${base}/dsh-cosyvoice/cloud-voices/import`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }))
    assert.equal(imported.ok, true)
    assert.equal(imported.added, 1)
    const cloud = imported.profiles.find(item => item.voiceId === 'cosyvoice-v3.5-plus-cloud1')
    assert.equal(cloud.source, 'cloud')
    assert.equal(cloud.model, 'cosyvoice-v3.5-plus')
    assert.equal(cloud.status, 'ready')

    // 再导一次：已经有的不重复加。
    const again = await json(await realFetch(`${base}/dsh-cosyvoice/cloud-voices/import`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }))
    assert.equal(again.added, 0)

    // 收尾：把这次产生的档案删掉，别污染后面可能新增的用例。
    for (const item of await json(await realFetch(`${base}/dsh-cosyvoice/profiles`)).then(r => r.profiles)) {
      await realFetch(`${base}/dsh-cosyvoice/profiles`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
    }
  })
})

describe('角色扮演路由', () => {
  /** 一段带台词的回答：旁白- 台词 - 旁白。 */
  const SCRIPT = '他抬起头。「你来了。」他笑了笑。'

  /** 两套绑给角色的音色档案；档案 id 才是绑定值，音色 ID 是档案里的内容。 */
  let narration
  let character

  before(async () => {
    // 绑定的是**档案 id** 而不是音色 ID —— 档案是"模型 + 音色"的完整单位，而音色
    // ID 单独一个字段定不了一套音色（MiMo 复刻音色压根没有 ID）。所以这里先把两套
    // 档案真的写进清单，再让配置去引用它们的 id。
    const { VoiceProfiles } = await import('../host/profiles.js')
    const profiles = new VoiceProfiles()
    // 档案清单是三台共享的一份 JSON，所以"当前音色"也是共享的。而**第一套档案会自动
    // 成为当前音色** —— 于是这里先建一套与设置回退值同名的档案，把"当前音色"占住；
    // 否则旁白那套会顶上去，本该用`voice-1` 的那几个用例（roleplay:false、档案查不到
    // 时的回落）就全都跟着变了。
    profiles.put({ name: '当前音色', voiceId: 'voice-1', model: 'cosyvoice-v3.5-plus' })
    narration = profiles.put({
      name: '旁白音色',
      voiceId: 'voice-narration',
      model: 'cosyvoice-v3.5-plus',
    })
    character = profiles.put({
      name: '台词音色',
      voiceId: 'voice-character',
      model: 'cosyvoice-v3.5-plus',
    })

    // 这一台是**最后**才挂的：档案清单是三台共享的一份 JSON（`~/.dsh/voice/profiles.json`），
    // 提前建档案会污染前面那些"清单为空"的用例。
    const plugin = await import('../host/index.js')
    const routes = []
    const ctx = {
      effect: (fn) => { fn(); return () => {} },
      webServer: { register: (route) => { routes.push(route); return () => {} } },
      logger: { warn: () => {} },
    }
    plugin.apply(ctx, {
      apiKey: 'sk-test',
      voiceId: 'voice-1',
      model: 'cosyvoice-v3.5-plus',
      outputDir: join(home, 'audio-roleplay'),
      bootSound: true,
      mode: 'one-shot',
      roleplay: true,
      narrationProfileId: narration.id,
      characterProfileId: character.id,
    })

    roleplayServer = createServer((req, res) => {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname
      const route = routes.find(candidate => candidate.path === path)
      if (route === undefined) {
        res.writeHead(404).end()
        return
      }
      Promise.resolve(route.handler(req, res)).catch(() => { res.destroy() })
    })
    await new Promise((resolveListen) => { roleplayServer.listen(0, '127.0.0.1', resolveListen) })
    roleplayBase = `http://127.0.0.1:${String(roleplayServer.address().port)}`
  })

  after(() => {
    if (roleplayServer !== undefined) roleplayServer.close()
  })

  /** 往某一台服务器的 /speak 发一次请求。 */
  async function speakAt(target, body) {
    speakCalls = []
    const response = await realFetch(`${target}/dsh-cosyvoice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return json(response)
  }

  /** 每次合成请求用的音色，按发出顺序。 */
  function voicesAsked() {
    return speakCalls.map(call => JSON.parse(String(call.init.body)).input.voice)
  }

  it('配置开了角色扮演：一次朗读按段发多次请求', async () => {
    const spoken = await speakAt(roleplayBase, { text: SCRIPT })
    assert.equal(spoken.ok, true)
    assert.equal(spoken.mode, 'one-shot')
    // 三段，且音色来自各自那份档案的音色 ID（档案才是绑定值）。
    assert.deepEqual(voicesAsked(), ['voice-narration', 'voice-character', 'voice-narration'])
  })

  it('两套档案可以来自不同模型——绑定的是档案而不是音色 ID', async () => {
    // 把台词那份换成另一款模型（仍是百炼，于是请求形状不变、断言仍读得到 voice）。
    const { VoiceProfiles } = await import('../host/profiles.js')
    const profiles = new VoiceProfiles()
    const swapped = profiles.put({
      id: character.id,
      model: 'cosyvoice-v3.5-flash',
    })
    assert.equal(swapped.model, 'cosyvoice-v3.5-flash')
    // 旁白那份没动：档案内只给了 model 一个字段，voiceId 保留原值。
    assert.equal(profiles.list().find(item => item.id === narration.id).voiceId, 'voice-narration')

    await speakAt(roleplayBase, { text: SCRIPT })
    const asked = speakCalls.map(call => JSON.parse(String(call.init.body)))
    assert.equal(asked[0].model, 'cosyvoice-v3.5-plus')
    assert.equal(asked[1].model, 'cosyvoice-v3.5-flash')
    // 换模型并没有换音色：这套音色仍然念自己的那句话。
    assert.deepEqual(voicesAsked(), ['voice-narration', 'voice-character', 'voice-narration'])
  })

  it('拼出来的产物是 WAV，且能取回', async () => {
    const spoken = await speakAt(roleplayBase, { text: SCRIPT })
    assert.equal(spoken.clip.name.endsWith('.wav'), true)
    const audio = await realFetch(`${roleplayBase}${spoken.clip.url}`)
    const bytes = Buffer.from(await audio.arrayBuffer())
    // WAV 头之后应当是三段FAKE 音频按原文顺序相接 —— 顺序就写在字节里。
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF')
    assert.equal(bytes.length, 44 + 3 * FAKE_AUDIO.length)
  })

  it('关着的那一台仍然只发一次请求', async () => {
    const spoken = await speakAt(base, { text: SCRIPT })
    assert.equal(spoken.ok, true)
    assert.equal(speakCalls.length, 1)
    assert.deepEqual(voicesAsked(), ['voice-1'])
  })

  it('请求里的 roleplay 覆盖配置', async () => {
    // 配置开着，但这一次明确说不用 —— 于是只发一次、用当前音色。
    await speakAt(roleplayBase, { text: SCRIPT, roleplay: false })
    assert.deepEqual(voicesAsked(), ['voice-1'])
    // 反过来说要用，即使配置关着也照办。
    await speakAt(base, { text: SCRIPT, roleplay: true })
    assert.equal(speakCalls.length, 3)
  })

  it('请求里的档案覆盖配置里的绑定', async () => {
    // 请求里给的是**档案 id**，所以要先有这两套档案；给不存在的 id 会静默回落当前音色
    // （见下一个用例），不会拿一个查不到的档案去报错。
    const { VoiceProfiles } = await import('../host/profiles.js')
    const profiles = new VoiceProfiles()
    const reqNarration = profiles.put({ name: '临时旁白', voiceId: 'req-narration', model: 'cosyvoice-v3.5-plus' })
    const reqCharacter = profiles.put({ name: '临时台词', voiceId: 'req-character', model: 'cosyvoice-v3.5-plus' })

    await speakAt(roleplayBase, {
      text: SCRIPT,
      narrationProfileId: reqNarration.id,
      characterProfileId: reqCharacter.id,
    })
    assert.deepEqual(voicesAsked(), ['req-narration', 'req-character', 'req-narration'])

    // 档案不存在 → 静默跟随当前音色，而不是让整次朗读失败。
    await speakAt(roleplayBase, {
      text: SCRIPT,
      narrationProfileId: 'p_不存在的档案',
      characterProfileId: 'p_也不存在',
    })
    assert.deepEqual(voicesAsked(), ['voice-1'])
  })

  it('没有台词时不分段', async () => {
    await speakAt(roleplayBase, { text: '整段都是旁白，没有一句台词。' })
    assert.deepEqual(voicesAsked(), ['voice-narration'])
  })

  it('/status 回报角色扮演开关与两个绑定的档案 id', async () => {
    const body = await json(await realFetch(`${roleplayBase}/dsh-cosyvoice/status`))
    assert.equal(body.roleplay, true)
    assert.equal(body.narrationProfileId, narration.id)
    assert.equal(body.characterProfileId, character.id)
    // 回报的是档案 id，所以界面上能显示档案名称，而不是一串看不懂的 id。
    assert.notEqual(body.narrationProfileId, 'voice-narration')

    // 问"按关闭来算"：回报的应当是那一次会真正生效的值。
    const off = await json(await realFetch(`${roleplayBase}/dsh-cosyvoice/status?roleplay=false`))
    assert.equal(off.roleplay, false)
    assert.equal(off.configuredRoleplay, true)
  })
})
