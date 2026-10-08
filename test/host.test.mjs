/**
 * 宿主端单测。
 *
 * 全部用例都不碰网络：`SpeechClient` 接收注入的 fetch，于是"合成成功""HTTP 418"
 * "连接失败"都是可复现的本地状态。缓存用例则落在一个临时目录里，跑完即删。
 *
 * 运行：`node --test test/`
 * @module dsh-cosyvoice/test
 */

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, it } from 'node:test'

import {
  DEFAULT_ENDPOINT,
  MAX_TEXT_CHARS,
  SpeechClient,
  describeFailure,
  normalizeText,
} from '../host/speech.js'
import { AudioStore, cacheKeyOf } from '../host/store.js'
import { VoiceSynthesizer } from '../host/synth.js'
import { MessageTextResolver } from '../host/texts.js'
import { VoiceProfiles } from '../host/profiles.js'

/** 一段"像百炼回的那种"合成响应：内层给 base64 音频。 */
function okResponse(audioBase64, characters = 12) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      output: { audio: { data: audioBase64 } },
      usage: { characters },
    }),
  }
}

/** 把注入的 fetch 收到的请求记下来，便于断言请求体。 */
function recordingFetch(handler) {
  const calls = []
  const impl = async (url, init) => {
    calls.push({ url, init })
    return handler(url, init)
  }
  return { impl, calls }
}

describe('normalizeText', () => {
  it('剥掉 Markdown 标记但保留可读内容', () => {
    const cleaned = normalizeText('# 标题\n\n这是 **重点** 与 `code`，见 [链接](https://example.com/x)。')
    assert.equal(cleaned, '标题\n\n这是 重点 与 code，见 链接。')
  })

  it('整块去掉代码块与图片', () => {
    const cleaned = normalizeText('看图：![a](b.png)\n\n```js\nconst a = 1\n```\n结束')
    assert.equal(cleaned, '看图：\n\n结束')
  })

  it('超长文本按上限截断', () => {
    const cleaned = normalizeText('あ'.repeat(MAX_TEXT_CHARS + 500))
    assert.equal(cleaned.length, MAX_TEXT_CHARS)
  })

  it('空白与空输入归一为空串', () => {
    assert.equal(normalizeText('   \n\n  '), '')
    assert.equal(normalizeText(undefined), '')
  })
})

describe('describeFailure', () => {
  it('401/403 指向 Key 问题', () => {
    assert.match(describeFailure(401, '{"message":"InvalidApiKey"}'), /API Key 无效或无权限/)
  })

  it('418 指向模型与音色不匹配', () => {
    assert.match(describeFailure(418, '{}'), /模型与.*音色.*不一致/)
  })

  it('429 指向限流', () => {
    assert.match(describeFailure(429, '{}'), /过于频繁/)
  })

  it('5xx 指向服务不可用', () => {
    assert.match(describeFailure(503, '{}'), /暂时不可用/)
  })
})

describe('cacheKeyOf', () => {
  it('同输入同键，任一输入变化即换键', () => {
    const a = cacheKeyOf('m', 'v', '文本')
    const b = cacheKeyOf('m', 'v', '文本')
    const c = cacheKeyOf('m', 'v2', '文本')
    assert.equal(a, b)
    assert.notEqual(a, c)
    assert.match(a, /^[0-9a-f]{64}$/)
  })
})

describe('AudioStore', () => {
  let dir
  let store

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cosyvoice-store-'))
    store = new AudioStore(() => dir)
  })

  it('写入后可读回，且落盘内容一致', () => {
    const clip = store.put(cacheKeyOf('m', 'v', 't'), Buffer.from([1, 2, 3, 4]))
    assert.equal(clip.bytes, 4)
    assert.deepEqual(readFileSync(clip.path), Buffer.from([1, 2, 3, 4]))
    assert.equal(store.hit(cacheKeyOf('m', 'v', 't')).name, clip.name)
  })

  it('未命中返回 undefined', () => {
    assert.equal(store.hit(cacheKeyOf('m', 'v', '没写过')), undefined)
  })

  it('拒绝走出目录的文件名', () => {
    assert.equal(store.pathOf('../../etc/passwd'), undefined)
    assert.equal(store.pathOf('not-a-hash.mp3'), undefined)
    assert.equal(store.pathOf(undefined), undefined)
  })

  it('清空只删本插件的缓存文件', () => {
    writeFileSync(join(dir, 'keep-me.txt'), 'x')
    store.put(cacheKeyOf('m', 'v', 'a'), Buffer.from('a'))
    store.put(cacheKeyOf('m', 'v', 'b'), Buffer.from('bb'))
    assert.equal(store.count(), 2)
    assert.equal(store.clear(), 2)
    assert.equal(store.count(), 0)
    assert.equal(readFileSync(join(dir, 'keep-me.txt'), 'utf8'), 'x')
  })
})

describe('SpeechClient', () => {
  const settings = { apiKey: 'sk-test', voiceId: 'voice-1', model: 'cosyvoice-v3.5-plus' }

  it('把文本 POST 到端点，并带上 Bearer 与音色', async () => {
    const { impl, calls } = recordingFetch(async () => okResponse(Buffer.from('AUDIO').toString('base64')))
    const client = new SpeechClient({ getSettings: () => settings, fetchImpl: impl })
    const result = await client.synthesize('你好')
    assert.equal(calls[0].url, DEFAULT_ENDPOINT)
    assert.equal(calls[0].init.headers.authorization, 'Bearer sk-test')
    const body = JSON.parse(calls[0].init.body)
    assert.equal(body.input.voice, 'voice-1')
    assert.equal(body.input.text, '你好')
    assert.equal(body.input.format, 'mp3')
    assert.equal(result.bytes.toString(), 'AUDIO')
    assert.equal(result.characters, 12)
  })

  it('响应给的是 URL 时改为下载', async () => {
    // 必须给一份独立的 ArrayBuffer：`Buffer#buffer` 指向 Node 的内存池，
    // 直接交出去会把池里相邻的字节一起读进来。
    const bytes = Buffer.from('FROM-OSS')
    const { impl, calls } = recordingFetch(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ output: { audio: { url: 'https://oss.example.com/a.mp3' } } }),
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    }))
    const client = new SpeechClient({ getSettings: () => settings, fetchImpl: impl })
    const result = await client.synthesize('你好')
    assert.equal(calls.length, 2)
    assert.equal(calls[1].url, 'https://oss.example.com/a.mp3')
    assert.equal(result.bytes.toString(), 'FROM-OSS')
  })

  it('缺 Key 或缺音色时给出可操作的中文提示', async () => {
    const { impl } = recordingFetch(async () => okResponse(''))
    const noKey = new SpeechClient({ getSettings: () => ({ ...settings, apiKey: '' }), fetchImpl: impl })
    await assert.rejects(noKey.synthesize('你好'), /未配置 API Key/)
    const noVoice = new SpeechClient({ getSettings: () => ({ ...settings, voiceId: '' }), fetchImpl: impl })
    await assert.rejects(noVoice.synthesize('你好'), /未配置音色/)
  })

  it('空文本直接拒绝，不发请求', async () => {
    const { impl, calls } = recordingFetch(async () => okResponse(''))
    const client = new SpeechClient({ getSettings: () => settings, fetchImpl: impl })
    await assert.rejects(client.synthesize('**'), /没有可朗读的文本/)
    assert.equal(calls.length, 0)
  })

  it('HTTP 418 翻成"模型与音色不一致"', async () => {
    const { impl } = recordingFetch(async () => ({
      ok: false,
      status: 418,
      text: async () => JSON.stringify({ message: 'model mismatch' }),
    }))
    const client = new SpeechClient({ getSettings: () => settings, fetchImpl: impl })
    await assert.rejects(client.synthesize('你好'), /模型与.*音色.*不一致/)
  })

  it('连接失败不抛裸网络异常', async () => {
    const { impl } = recordingFetch(async () => { throw new Error('ECONNREFUSED') })
    const client = new SpeechClient({ getSettings: () => settings, fetchImpl: impl })
    await assert.rejects(client.synthesize('你好'), /无法连接百炼服务/)
  })
})

describe('VoiceSynthesizer', () => {
  let dir
  let store
  let synth
  let calls
  const settings = { apiKey: 'sk-test', voiceId: 'voice-1', model: 'cosyvoice-v3.5-plus', outputDir: '' }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cosyvoice-synth-'))
    settings.outputDir = dir
    calls = []
    const fetchImpl = async (url, init) => {
      calls.push({ url, init })
      return okResponse(Buffer.from('MP3BYTES').toString('base64'), 7)
    }
    store = new AudioStore(() => dir)
    synth = new VoiceSynthesizer({
      speech: new SpeechClient({ getSettings: () => settings, fetchImpl }),
      store,
      getSettings: () => settings,
    })
  })

  it('首次合成调用云端并落盘', async () => {
    const clip = await synth.synthesize('第一条回答')
    assert.equal(clip.cached, false)
    assert.equal(calls.length, 1)
    assert.equal(readFileSync(clip.path).toString(), 'MP3BYTES')
    assert.equal(clip.characters, 7)
  })

  it('相同文本第二次命中缓存，零 API 调用', async () => {
    await synth.synthesize('同一条')
    const second = await synth.synthesize('同一条')
    assert.equal(second.cached, true)
    assert.equal(calls.length, 1)
  })

  it('Markdown 差异不影响缓存命中', async () => {
    await synth.synthesize('**重点**')
    const second = await synth.synthesize('重点')
    assert.equal(second.cached, true)
    assert.equal(calls.length, 1)
  })

  it('换音色后不复用旧缓存', async () => {
    await synth.synthesize('同一条')
    settings.voiceId = 'voice-2'
    const second = await synth.synthesize('同一条')
    assert.equal(second.cached, false)
    assert.equal(calls.length, 2)
  })

  it('换模型后不复用旧缓存', async () => {
    await synth.synthesize('同一条')
    settings.model = 'cosyvoice-v3.5-flash'
    const second = await synth.synthesize('同一条')
    assert.equal(second.cached, false)
    assert.equal(calls.length, 2)
  })

  it('合成失败不写入缓存', async () => {
    settings.apiKey = ''
    await assert.rejects(synth.synthesize('会失败'), /未配置 API Key/)
    assert.equal(store.count(), 0)
    settings.apiKey = 'sk-test'
  })
})

describe('VoiceProfiles', () => {
  let dir
  let profiles

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cosyvoice-profiles-'))
    profiles = new VoiceProfiles(() => join(dir, 'profiles.json'))
  })

  it('文件不存在时给出空档案，而不是抛错', () => {
    assert.deepEqual(profiles.list(), [])
    assert.equal(profiles.active(), undefined)
  })

  it('第一套档案自动成为当前音色', () => {
    const saved = profiles.put({ name: '我的声音', voiceId: 'voice-a', model: 'cosyvoice-v3.5-plus' })
    assert.equal(profiles.active().id, saved.id)
    assert.equal(profiles.active().voiceId, 'voice-a')
    assert.equal(profiles.active().source, 'manual')
  })

  it('后面的档案不会抢走当前音色，要显式切换', () => {
    const first = profiles.put({ name: '一', voiceId: 'voice-a', model: 'm' })
    profiles.put({ name: '二', voiceId: 'voice-b', model: 'm' })
    assert.equal(profiles.active().id, first.id)
    assert.equal(profiles.activate(profiles.list()[1].id), true)
    assert.equal(profiles.active().voiceId, 'voice-b')
  })

  it('更新只覆盖这次给了的字段', () => {
    const saved = profiles.put({ name: '克隆中', voiceId: '', model: 'm', source: 'clone', status: 'pending' })
    profiles.put({ id: saved.id, voiceId: 'voice-cloned', status: 'ready' })
    const updated = profiles.list()[0]
    assert.equal(updated.voiceId, 'voice-cloned')
    // 来源没在这次请求里出现，就该保持 clone —— 否则克隆音色会被打回 manual。
    assert.equal(updated.source, 'clone')
    assert.equal(updated.status, 'ready')
    assert.equal(updated.name, '克隆中')
  })

  it('删掉当前音色后退回剩下第一条，删空则没有当前音色', () => {
    const first = profiles.put({ name: '一', voiceId: 'voice-a', model: 'm' })
    const second = profiles.put({ name: '二', voiceId: 'voice-b', model: 'm' })
    profiles.activate(second.id)
    assert.equal(profiles.remove(second.id), true)
    assert.equal(profiles.active().id, first.id)
    profiles.remove(first.id)
    assert.equal(profiles.active(), undefined)
    assert.equal(profiles.remove('不存在的 id'), false)
  })

  it('坏掉的 JSON 退化成空档案而不是让插件挂掉', () => {
    writeFileSync(profiles.path(), '{ 这不是 JSON')
    assert.deepEqual(profiles.list(), [])
    // 还能继续写：用户重新加一套就恢复了。
    profiles.put({ name: '重来', voiceId: 'voice-c', model: 'm' })
    assert.equal(profiles.list().length, 1)
  })

  it('非法字段被收敛成合法值', () => {
    profiles.save({ version: 1, activeId: '', profiles: [{ id: 'x', voiceId: 'v', source: '火星来的', status: '??' }] })
    const entry = profiles.list()[0]
    assert.equal(entry.source, 'manual')
    assert.equal(entry.status, 'ready')
    assert.equal(entry.name, '')
  })
})

describe('VoiceSynthesizer 与音色档案', () => {
  let dir
  let store
  let profiles

  const settings = { apiKey: 'sk-test', voiceId: 'voice-fallback', model: 'model-fallback' }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cosyvoice-synth-profile-'))
    profiles = new VoiceProfiles(() => join(dir, 'profiles.json'))
    store = new AudioStore(() => dir)
  })

  /** 一个只记请求体的合成客户端。 */
  function synthWith(calls) {
    const fetchImpl = async (url, init) => {
      calls.push(JSON.parse(init.body))
      return okResponse(Buffer.from('MP3BYTES').toString('base64'), 7)
    }
    return new VoiceSynthesizer({
      speech: new SpeechClient({ getSettings: () => settings, fetchImpl }),
      store,
      getSettings: () => settings,
      profiles,
    })
  }

  it('没有档案时用设置里的回退值', async () => {
    const calls = []
    await synthWith(calls).synthesize('你好')
    assert.equal(calls[0].input.voice, 'voice-fallback')
    assert.equal(calls[0].model, 'model-fallback')
  })

  it('启用档案后按档案的音色与模型合成', async () => {
    profiles.put({ name: '档案音色', voiceId: 'voice-profile', model: 'model-profile' })
    const calls = []
    await synthWith(calls).synthesize('你好')
    assert.equal(calls[0].input.voice, 'voice-profile')
    assert.equal(calls[0].model, 'model-profile')
  })

  it('克隆中（还没有音色 ID）的档案不算数，回落到设置', async () => {
    profiles.put({ name: '克隆中', voiceId: '', model: 'model-profile', source: 'clone', status: 'pending' })
    const calls = []
    await synthWith(calls).synthesize('你好')
    assert.equal(calls[0].input.voice, 'voice-fallback')
  })

  it('换档案后缓存不串味', async () => {
    const first = profiles.put({ name: '一', voiceId: 'voice-a', model: 'm' })
    const second = profiles.put({ name: '二', voiceId: 'voice-b', model: 'm' })
    const calls = []
    const synth = synthWith(calls)
    await synth.synthesize('同一条')
    profiles.activate(second.id)
    const again = await synth.synthesize('同一条')
    assert.equal(again.cached, false)
    assert.equal(calls.length, 2)
    assert.equal(first.id !== second.id, true)
  })
})

describe('MessageTextResolver', () => {
  let dir

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cosyvoice-texts-'))
  })

  it('记得住显式登记的文本', () => {
    const texts = new MessageTextResolver({ home: dir })
    texts.remember('m1', '登记的内容')
    assert.equal(texts.resolve('m1'), '登记的内容')
  })

  it('从会话日志里按 messageId 抽出助手文本', () => {
    const sessions = join(dir, 'sessions')
    mkdirSync(sessions, { recursive: true })
    const log = [
      JSON.stringify({ type: 'user', messageId: 'u1', blocks: [{ kind: 'text', text: '问题' }] }),
      JSON.stringify({ type: 'assistant', messageId: 'a1', blocks: [{ kind: 'text', text: '这是回答' }] }),
    ].join('\n')
    writeFileSync(join(sessions, 's1.jsonl'), log)
    const texts = new MessageTextResolver({ home: dir })
    assert.equal(texts.resolve('a1', 's1'), '这是回答')
  })

  it('解析不到时返回 undefined 而不是抛错', () => {
    const texts = new MessageTextResolver({ home: dir })
    assert.equal(texts.resolve('不存在'), undefined)
    assert.equal(texts.resolve(''), undefined)
  })
})
