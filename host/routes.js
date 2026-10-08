/**
 * 本插件对外暴露的 HTTP 面：浏览器那一半需要宿主做的全部事情。
 *
 * 用路由而不是类型化的 remote-RPC，是因为路由就是一个普通 Node handler：
 * 送音频字节和 JSON 都不需要生成线上 schema，浏览器端也就不用为 RPC 客户端
 * 引入构建步骤，手写拼接即可（见 `build.mjs`）。
 *
 * 所有路由都在 `/dsh-cosyvoice/` 之下——这个前缀没人占，harness 自带的 SPA
 * fallback 和 `/api` 网关都不会挡路。
 *
 * 其中三个端点有真实副作用（合成花钱、打开目录、删文件），所以先过
 * {@link sameOrigin}：浏览器给任何跨站请求都会带上 `Origin`，拒绝不匹配的值，
 * 就能挡住用户浏览器里某个随机页面来驱动本插件。
 * @module dsh-cosyvoice/routes
 */

import { createReadStream, existsSync } from 'node:fs'
import { MAX_UPLOAD_BYTES, modelFromVoiceId } from './clone.js'
import { MODE_ONE_SHOT, MODE_STREAM, normalizeFlag, normalizeMode } from './settings.js'
import { STREAM_SAMPLE_RATE } from './stream.js'
import { mimeOf } from './store.js'

/** 接受的 JSON 请求体上限（字节）。文本很短，更大的都是误用或攻击。 */
const MAX_BODY_BYTES = 256 * 1024

/** 本插件占有的路由前缀。 */
export const ROUTE_PREFIX = '/dsh-cosyvoice'

/**
 * 请求是否来自本服务器的页面。
 *
 * 允许 `Origin` 缺失：同源 fetch 可能不带它，而跨站请求一定会带。
 * @param req - 入站请求。
 * @returns 是否可以继续处理。
 */
function sameOrigin(req) {
  const origin = req.headers.origin
  if (origin === undefined || origin === 'null') return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

/**
 * 用 JSON 回应一个请求。
 * @param res - 要接管的响应。
 * @param status - HTTP 状态码。
 * @param body - 可序列化的响应体。
 */
function sendJson(res, status, body) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(text)),
    'cache-control': 'no-store',
  })
  res.end(text)
}

/**
 * 读取并解析 JSON 请求体。
 * @param req - 入站请求。
 * @returns 解析出的对象；缺失、过大或格式错误时为 undefined。
 */
function readJson(req) {
  return new Promise((resolve) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        resolve(undefined)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim()
      if (text === '') return resolve({})
      try {
        const parsed = JSON.parse(text)
        resolve(parsed !== null && typeof parsed === 'object' ? parsed : undefined)
      } catch {
        resolve(undefined)
      }
    })
    req.on('error', () => { resolve(undefined) })
  })
}

/**
 * 读取整个请求体（用于上传的音频字节）。
 *
 * 客户端直接把文件字节作为 body 送过来，而不是 multipart：两端都是本插件自己
 * 写的，省掉一个 multipart 解析器就省掉一份依赖和一类解析 bug。
 * @param req - 入站请求。
 * @param limit - 字节上限；超了就放弃这次读取。
 * @returns 字节；超限或传输出错时为 undefined。
 */
function readBytes(req, limit) {
  return new Promise((resolve) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        resolve(undefined)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => { resolve(Buffer.concat(chunks)) })
    req.on('error', () => { resolve(undefined) })
  })
}

/**
 * 以音频字节流回应一个请求。
 * @param res - 要接管的响应。
 * @param path - 磁盘上的音频文件。
 * @param cacheable - 是否允许浏览器缓存（内容哈希命名，可以长期缓存）。
 */
function sendAudio(res, path, cacheable) {
  res.writeHead(200, {
    'content-type': mimeOf(path),
    'cache-control': cacheable ? 'private, max-age=31536000, immutable' : 'no-store',
  })
  const stream = createReadStream(path)
  stream.on('error', () => { res.destroy() })
  stream.pipe(res)
}

/** SSE 响应头；`x-accel-buffering` 是给反向代理看的：别替我攒着。 */
const SSE_HEADERS = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  'x-accel-buffering': 'no',
}

/**
 * 写回应流式的一组 SSE 头。
 * @param res - 要接管的响应。
 */
function openSse(res) {
  res.writeHead(200, SSE_HEADERS)
  // Node 的 http.ServerResponse 有它；某个壳层实现没有时也不影响流的语义。
  if (typeof res.flushHeaders === 'function') res.flushHeaders()
}

/**
 * 写一帧 SSE。
 *
 * 写失败不抛：浏览器关掉了页面或点了停止是最常见的原因，而那不是错误 —— 继续
 * 往一条已经断掉的响应上写，只会让整次流式以一个看起来像 bug 的异常收场。
 * @param res - 已被 {@link openSse} 接管的响应。
 * @param event - 事件名。
 * @param data - 可序列化的载荷。
 * @returns 是否真的写了出去。
 */
function sendFrame(res, event, data) {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    return true
  } catch {
    return false
  }
}

/**
 * 构建本插件的路由。
 * @param options - 每个路由需要的协作者。
 * @param options.getSettings - 读取当前语音设置。
 * @param options.synth - 带缓存的合成器。
 * @param options.store - 音频目录。
 * @param options.texts - messageId → 文本 的解析器。
 * @param options.profiles - 音色档案。
 * @param options.cloner - 音色复刻客户端。
 * @param options.bootClip - 内置开机音的绝对路径；不存在时为 undefined。
 * @param options.openDir - 在系统文件管理器里打开音频目录。
 * @param options.log - 诊断输出（不进响应）。
 * @returns 顺序稳定的路由注册项。
 */
export function cosyvoiceRoutes({ getSettings, synth, store, texts, profiles, cloner, bootClip, openDir, log }) {
  /**
   * 本次请求要用的合成方式。
   *
   * 配置是**默认值**，而请求里带的那个是"用户刚刚点的"：宿主的配置通道要绕一趟
   * （写入、校验、重载插件），有时还会因为 schema 没跟着更新而写不进去 —— 让那
   * 种情况把按钮变成"点了没反应"是不可接受的。所以只要请求给了合法值就听它的。
   * @param explicit - 请求体里的 `mode`；不合法（含没给）时回落到配置。
   * @returns {@link import('./settings.js').MODE_STREAM} 或 {@link import('./settings.js').MODE_ONE_SHOT}。
   */
  const modeOf = (explicit) => {
    const wanted = String(explicit ?? '').trim()
    if (wanted === MODE_STREAM || wanted === MODE_ONE_SHOT) return wanted
    return normalizeMode((getSettings() ?? {}).mode)
  }

  /**
   * 本次请求是否按角色扮演处理。
   *
   * 与 {@link modeOf} 同一个道理：请求里给的是"用户刚刚拨的开关"，配置里是持久化
   * 的那一份。宿主配置通道未必写得进去（schema 没跟着重载时就会失败），而开关
   * 拨了却没反应是最难受的——所以请求给了就听请求的。
   * @param explicit - 请求里的 `roleplay`（布尔或 'true'/'false'）。
   * @returns 是否开启。
   */
  const roleplayOf = (explicit) => {
    if (explicit === true) return true
    if (explicit === false) return false
    const wanted = String(explicit ?? '').trim().toLowerCase()
    if (wanted === 'true') return true
    if (wanted === 'false') return false
    return normalizeFlag((getSettings() ?? {}).roleplay)
  }

  /**
   * 一次请求的语音偏好：开不开角色扮演、旁白与台词各自用哪个音色。
   *
   * 两个音色 ID 允许为空，空表示"听配置的"——客户端没在本地存过就不必把配置
   * 原样回传一遍。
   * @param body - 请求体。
   * @returns 交给 {@link import('./synth.js').VoiceSynthesizer} 的偏好。
   */
  const prefsOf = (body) => ({
    roleplay: roleplayOf(body === undefined || body === null ? undefined : body.roleplay),
    narrationVoiceId: String(body?.narrationVoiceId ?? '').trim(),
    characterVoiceId: String(body?.characterVoiceId ?? '').trim(),
  })

  /**
   * 给一段音频补上浏览器该去取的 URL。
   * @param clip - 音频描述。
   * @returns 带 url 的描述；clip 为空时返回 null。
   */
  const describe = clip => (clip === undefined ? null : {
    name: clip.name,
    bytes: clip.bytes,
    cached: clip.cached === true,
    characters: Number(clip.characters ?? 0),
    url: `${ROUTE_PREFIX}/audio?name=${encodeURIComponent(clip.name)}`,
  })

  /**
   * 流式出口：云端的每一句一就绪就写一帧给浏览器。
   *
   * 命中缓存时不握手 SSE —— 音频已经在磁盘上了，回一个整段地址让浏览器去取，
   * 比假装再流一次更快也更省。
   * @param res - 响应。
   * @param text - 要朗读的文本。
   * @param prefs - 语音偏好（角色扮演开关与两个音色）。
   * @throws {Error} 合成失败时抛出，由 {@link respond} 翻译成响应。
   */
  const streamInto = async (res, text, prefs) => {
    let opened = false
    for await (const frame of synth.stream(text, prefs)) {
      if (frame.kind === 'ready' && !opened) {
        return sendJson(res, 200, { ok: true, mode: MODE_STREAM, clip: describe(frame.clip) })
      }
      if (!opened) {
        openSse(res)
        opened = true
        if (!sendFrame(res, 'open', { sampleRate: STREAM_SAMPLE_RATE })) return undefined
      }
      if (frame.kind === 'audio') {
        if (!sendFrame(res, 'chunk', { audio: frame.bytes.toString('base64'), sampleRate: frame.sampleRate })) {
          return undefined
        }
      } else if (frame.kind === 'ready') {
        if (!sendFrame(res, 'done', { clip: describe(frame.clip), characters: Number(frame.clip.characters ?? 0) })) {
          return undefined
        }
      }
    }
    // 一帧都没产出：这不是错误，但也不是一次成功的流。
    if (!opened) return sendJson(res, 500, { ok: false, message: '这次合成没有产出任何音频。' })
    try { res.end() } catch { /* 连接已经断了 */ }
    return undefined
  }

  /**
   * 统一的合成出口：整段文本一次合成、一次返回。
   * @param res - 响应。
   * @param text - 要朗读的文本。
   * @param wanted - 请求里指定的合成方式；省略则按配置。
   * @param prefs - 语音偏好；省略则按配置。
   */
  const respond = async (res, text, wanted, prefs) => {
    const mode = modeOf(wanted)
    try {
      if (mode === MODE_STREAM) return await streamInto(res, text, prefs)
      const clip = await synth.synthesize(text, prefs)
      return sendJson(res, 200, { ok: true, mode: MODE_ONE_SHOT, clip: describe(clip) })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log(`synthesize failed: ${message}`)
      // 流式可能已经把头发出去了：那时只能在同一条流上报错误，而不能改状态码。
      if (res.headersSent) {
        if (sendFrame(res, 'error', { message })) {
          try { res.end() } catch { /* 连接已经断了 */ }
        }
        return undefined
      }
      return sendJson(res, 500, { ok: false, message })
    }
  }

  /**
   * 档案清单 + 当前激活项，附一份"没有档案时会用到什么"的回退值。
   * @returns 给设置页的档案视图。
   */
  const describeProfiles = () => {
    const data = profiles === undefined ? { profiles: [], activeId: '' } : profiles.load()
    return {
      profiles: data.profiles,
      activeId: data.activeId,
      fallback: {
        model: String((getSettings() ?? {}).model ?? '').trim(),
        voiceId: String((getSettings() ?? {}).voiceId ?? '').trim(),
      },
    }
  }

  return [
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/status`,
      handler(req, res) {
        const settings = getSettings() ?? {}
        // 允许问"按某个模式来算，会是怎么回事"：设置页把自己的选择带上来，于是
        // 它显示的是**真正会生效的那个值**，而不是配置文档里那一行。
        const search = new URL(req.url ?? '/', 'http://localhost').searchParams
        const wanted = search.get('mode')
        const wantedRoleplay = search.get('roleplay')
        // 报的是"真正会生效的那一套"（档案优先于回退值），否则用户切了音色，
        // 状态页却还在说旧的那套，试听与播放用的又不是同一个。
        const identity = synth.identity()
        sendJson(res, 200, {
          ok: true,
          configured: String(settings.apiKey ?? '').trim() !== '' && identity.voiceId !== '',
          hasKey: String(settings.apiKey ?? '').trim() !== '',
          model: identity.model,
          voiceId: identity.voiceId,
          profileId: identity.profileId ?? '',
          mode: modeOf(wanted),
          configuredMode: modeOf(),
          // 角色扮演的两个音色是"绑定"在设置页的，报出来是为了让页面显示
          // 真正会生效的那一套 —— 而不是让人以为绑了却没生效。
          roleplay: roleplayOf(wantedRoleplay),
          configuredRoleplay: roleplayOf(),
          narrationVoiceId: String(settings.narrationVoiceId ?? '').trim(),
          characterVoiceId: String(settings.characterVoiceId ?? '').trim(),
          bootSound: settings.bootSound === true,
          dir: store.dir(),
          count: store.count(),
        })
      },
    },
    {
      // 一条路径、三种方法：GET 列清单，POST 新增/更新，DELETE 删除。
      // 宿主的分发只看路径（`match(rawPath)` 之后整只 request 交下来），所以方法
      // 由这里自己判 —— 也因此一条路径只能注册一次，重复注册会被判为配置冲突。
      kind: 'exact',
      path: `${ROUTE_PREFIX}/profiles`,
      async handler(req, res) {
        if (req.method === 'GET') return sendJson(res, 200, { ok: true, ...describeProfiles() })

        if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: '跨站请求被拒绝' })
        if (profiles === undefined) return sendJson(res, 500, { ok: false, message: '音色档案未初始化' })
        const body = await readJson(req)
        if (body === undefined) return sendJson(res, 400, { ok: false, message: '请求体不是合法 JSON' })

        if (req.method === 'DELETE') {
          if (!profiles.remove(String(body.id ?? '').trim())) {
            return sendJson(res, 404, { ok: false, message: '没有这套音色档案。' })
          }
          return sendJson(res, 200, { ok: true, ...describeProfiles() })
        }

        // 给了 id 就是更新，没给就是新建。
        const id = String(body.id ?? '').trim()
        const voiceId = String(body.voiceId ?? '').trim()
        if (voiceId === '') return sendJson(res, 400, { ok: false, message: '音色 ID 不能为空。' })
        const name = String(body.name ?? '').trim()
        const saved = profiles.put({
          id: id === '' ? undefined : id,
          name: name === '' ? voiceId : name,
          voiceId,
          model: String(body.model ?? '').trim(),
          source: body.source,
          status: body.status,
        })
        log(`profiles: ${id === '' ? '新增' : '更新'} ${saved.id}（${saved.voiceId}）`)
        return sendJson(res, 200, { ok: true, ...describeProfiles() })
      },
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/profiles/activate`,
      async handler(req, res) {
        if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: '跨站请求被拒绝' })
        if (profiles === undefined) return sendJson(res, 500, { ok: false, message: '音色档案未初始化' })
        const body = await readJson(req)
        if (body === undefined) return sendJson(res, 400, { ok: false, message: '请求体不是合法 JSON' })
        if (!profiles.activate(String(body.id ?? '').trim())) {
          return sendJson(res, 404, { ok: false, message: '没有这套音色档案。' })
        }
        sendJson(res, 200, { ok: true, ...describeProfiles() })
      },
    },
    {
      // 上传音频复刻音色。body 是裸音频字节（不是 multipart），文件名与显示名走
      // 查询串：两端都是本插件，没必要为一个 multipart 解析器引入依赖。
      kind: 'exact',
      path: `${ROUTE_PREFIX}/clone`,
      async handler(req, res) {
        if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: '跨站请求被拒绝' })
        if (cloner === undefined || profiles === undefined) return sendJson(res, 500, { ok: false, message: '音色克隆未初始化' })

        const query = new URL(req.url ?? '/', 'http://localhost').searchParams
        const bytes = await readBytes(req, MAX_UPLOAD_BYTES)
        if (bytes === undefined) {
          return sendJson(res, 413, { ok: false, message: `音频太大了，请控制在 ${String(Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024))} MB 以内。` })
        }
        if (bytes.length === 0) return sendJson(res, 400, { ok: false, message: '没有收到音频数据。' })

        const filename = String(query.get('filename') ?? '').trim() || 'voice.wav'
        const name = String(query.get('name') ?? '').trim() || filename
        const settings = getSettings() ?? {}
        const targetModel = String(query.get('model') ?? '').trim() || String(settings.model ?? '').trim()

        try {
          const made = await cloner.clone({ bytes, filename, targetModel })
          // 先落一条 pending 档案：音色要几秒到几分钟才部署好，但用户此刻就该在
          // 列表里看见它，而不是盯着一个转圈的请求干等。
          const saved = profiles.put({
            name,
            voiceId: made.voiceId,
            model: targetModel,
            source: 'clone',
            status: 'pending',
            createdAt: new Date().toISOString(),
          })
          log(`clone: ${filename} → ${made.voiceId}（等待部署）`)
          sendJson(res, 200, { ok: true, profile: saved, ...describeProfiles() })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          log(`clone failed: ${message}`)
          sendJson(res, 500, { ok: false, message })
        }
      },
    },
    {
      // 轮询一个复刻中的音色。客户端按固定间隔来问，而不是让服务端挂着一个长
      // 请求：页面关掉也不会留下 orphan 轮询，服务端也不用管超时与重连。
      kind: 'exact',
      path: `${ROUTE_PREFIX}/clone/status`,
      async handler(req, res) {
        if (cloner === undefined || profiles === undefined) return sendJson(res, 500, { ok: false, message: '音色克隆未初始化' })
        const query = new URL(req.url ?? '/', 'http://localhost').searchParams
        const id = String(query.get('id') ?? '').trim()
        const profile = profiles.list().find(item => item.id === id)
        if (profile === undefined) return sendJson(res, 404, { ok: false, message: '没有这套音色档案。' })
        if (profile.voiceId === '') return sendJson(res, 400, { ok: false, message: '这套档案还没有音色 ID。' })

        try {
          const queried = await cloner.queryVoice(profile.voiceId)
          // 只有终态才落盘：pending 期间反复写同一个值毫无意义。
          if (queried.phase === 'ready' || queried.phase === 'failed') {
            profiles.put({ id: profile.id, status: queried.phase })
            // 复刻成功的音色直接设为当前音色：用户上传一段音频，默认就是想用它的。
            if (queried.phase === 'ready') profiles.activate(profile.id)
          }
          sendJson(res, 200, {
            ok: true,
            phase: queried.phase,
            status: queried.status,
            profileId: profile.id,
            ...describeProfiles(),
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          log(`clone status failed: ${message}`)
          sendJson(res, 500, { ok: false, message })
        }
      },
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/cloud-voices`,
      async handler(req, res) {
        if (cloner === undefined) return sendJson(res, 500, { ok: false, message: '音色克隆未初始化' })
        try {
          sendJson(res, 200, { ok: true, voices: await cloner.listVoices() })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          log(`cloud-voices failed: ${message}`)
          sendJson(res, 500, { ok: false, message })
        }
      },
    },
    {
      // 把云端已有的音色批量拉进档案（控制台里手建的那些）。
      kind: 'exact',
      path: `${ROUTE_PREFIX}/cloud-voices/import`,
      async handler(req, res) {
        if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: '跨站请求被拒绝' })
        if (cloner === undefined || profiles === undefined) return sendJson(res, 500, { ok: false, message: '音色克隆未初始化' })
        try {
          const voices = await cloner.listVoices()
          const known = new Set(profiles.list().map(item => item.voiceId))
          let added = 0
          for (const voice of voices) {
            if (known.has(voice.voiceId)) continue
            profiles.put({
              name: voice.voiceId,
              voiceId: voice.voiceId,
              // 从音色 ID 前缀反推模型；猜不出就留空，合成时回落设置里的模型。
              model: modelFromVoiceId(voice.voiceId) ?? '',
              source: 'cloud',
              status: voice.phase === 'ready' ? 'ready' : 'pending',
              createdAt: new Date().toISOString(),
            })
            added += 1
          }
          log(`cloud-voices: 导入 ${String(added)} / ${String(voices.length)} 个云端音色`)
          sendJson(res, 200, { ok: true, added, total: voices.length, ...describeProfiles() })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          log(`cloud-voices import failed: ${message}`)
          sendJson(res, 500, { ok: false, message })
        }
      },
    },
    {
      // 播放键的主入口。文本优先用客户端给的（它就在 DOM 上，最准），
      // 拿不到才回落到服务端按 messageId 解析。
      kind: 'exact',
      path: `${ROUTE_PREFIX}/speak-message`,
      async handler(req, res) {
        if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: '跨站请求被拒绝' })
        const body = await readJson(req)
        if (body === undefined) return sendJson(res, 400, { ok: false, message: '请求体不是合法 JSON' })

        const messageId = String(body.messageId ?? '').trim()
        const sessionId = String(body.sessionId ?? '').trim()
        const supplied = typeof body.text === 'string' ? body.text.trim() : ''
        const text = supplied !== '' ? supplied : texts.resolve(messageId, sessionId)

        if (text === undefined || text === '') {
          log(`speak-message: 取不到 ${messageId || '(无 id)'} 的文本`)
          return sendJson(res, 404, { ok: false, message: '没找到这条回答的文本，无法朗读。' })
        }
        // 客户端给的文本顺手登记，下次点击连 DOM 都不用读。
        if (supplied !== '' && messageId !== '') texts.remember(messageId, supplied)
        return respond(res, text, body.mode, prefsOf(body))
      },
    },
    {
      // 设置页试听、以及任何"直接给一段文本"的场景。
      kind: 'exact',
      path: `${ROUTE_PREFIX}/speak`,
      async handler(req, res) {
        if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: '跨站请求被拒绝' })
        const body = await readJson(req)
        if (body === undefined) return sendJson(res, 400, { ok: false, message: '请求体不是合法 JSON' })
        const text = typeof body.text === 'string' ? body.text : ''
        return respond(res, text, body.mode, prefsOf(body))
      },
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/audio`,
      handler(req, res) {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const path = store.pathOf(url.searchParams.get('name') ?? '')
        if (path === undefined) {
          sendJson(res, 404, { ok: false, message: '语音文件不存在' })
          return
        }
        // 文件名是内容哈希，同名必然同内容，可以放心让浏览器永久缓存。
        sendAudio(res, path, true)
      },
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/boot`,
      handler(req, res) {
        if (bootClip === undefined || !existsSync(bootClip)) {
          sendJson(res, 404, { ok: false, message: '未找到开机音文件 assets/boot.mp3' })
          return
        }
        // 从磁盘读而不是打进客户端产物，于是换提示音不用重新构建。
        sendAudio(res, bootClip, false)
      },
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/open`,
      async handler(req, res) {
        if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: '跨站请求被拒绝' })
        try {
          await openDir(store.ensure())
          sendJson(res, 200, { ok: true, dir: store.dir() })
        } catch (error) {
          sendJson(res, 500, { ok: false, message: error instanceof Error ? error.message : String(error) })
        }
      },
    },
    {
      kind: 'exact',
      path: `${ROUTE_PREFIX}/clear`,
      async handler(req, res) {
        if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: '跨站请求被拒绝' })
        try {
          sendJson(res, 200, { ok: true, removed: store.clear() })
        } catch (error) {
          sendJson(res, 500, { ok: false, message: error instanceof Error ? error.message : String(error) })
        }
      },
    },
  ]
}
