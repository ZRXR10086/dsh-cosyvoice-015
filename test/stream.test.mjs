/**
 * 流式链路的单测：SSE 怎么读、每一帧说了什么、PCM 怎么变成能听的文件。
 *
 * 这一层不需要网络：`SpeechClient` 的 fetch 是可注入的，所以"一份 SSE 恰好在半
 * 帧处被切开""最后一个包才给完整地址""某个包坏了"都能就地复现 —— 而它们恰好是
 * 最难在真实环境里等到、却最容易让用户听到停顿或杂音的几种情况。
 * @module dsh-cosyvoice/test-stream
 */

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'

import {
  STREAM_SAMPLE_RATE,
  interpretSseFrame,
  parseSseFrame,
  pickAudio,
  pickCharacters,
  pickUrl,
  readSse,
  wavFromPcm,
} from '../host/stream.js'
import { SSE_ENABLED, SSE_HEADER, SpeechClient } from '../host/speech.js'
import { AudioStore, mimeOf } from '../host/store.js'
import { VoiceSynthesizer } from '../host/synth.js'
import { MODE_ONE_SHOT, MODE_STREAM, normalizeMode } from '../host/settings.js'

/** 一块假 PCM：16 位小端，四个采样。 */
const CHUNK_ONE = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08])

/** 第二块假 PCM。 */
const CHUNK_TWO = Buffer.from([0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18])

/**
 * 一次假流式响应：按 SSE 文本构造 `ReadableStream`。
 * @param frames - SSE 帧文本，逐个 join。
 * @param slices - 投递多少块；>1 用于复现"一次读到半帧"。
 * @returns 假响应。
 */
function streamResponse(frames, slices = 1) {
  const text = frames.join('\n')
  const bytes = Buffer.from(text, 'utf8')
  return {
    ok: true,
    status: 200,
    text: async () => text,
    body: new ReadableStream({
      start(controller) {
        if (slices <= 1) {
          controller.enqueue(bytes)
        } else {
          const step = Math.ceil(bytes.length / slices)
          for (let at = 0; at < bytes.length; at += step) controller.enqueue(bytes.subarray(at, at + step))
        }
        controller.close()
      },
    }),
  }
}

/** 一份"标准"的云端 SSE：两句 + 收尾带完整地址。 */
const STANDARD_FRAMES = [
  'event: sentence-begin',
  'data: {"header":{"event":"sentence-begin"}}',
  '',
  'event: sentence-synthesis',
  `data: {"payload":{"data":"${CHUNK_ONE.toString('base64')}"}}`,
  '',
  'event: sentence-synthesis',
  `data: {"payload":{"data":"${CHUNK_TWO.toString('base64')}"}}`,
  '',
  'event: sentence-end',
  'data: {"header":{"event":"sentence-end"},"usage":{"characters":11}}',
  '',
  'event: sentence-synthesis',
  'data: {"header":{"event":"sentence-synthesis"},"output":{"audio":{"url":"https://audio.example.com/all.wav"}},"usage":{"characters":11}}',
  '',
]

/**
 * 一个假 SpeechClient。
 * @param response - 要吐出的响应。
 * @returns 客户端与它发出的请求。
 */
function speechClientReturning(response) {
  const sent = []
  const client = new SpeechClient({
    getSettings: () => ({ apiKey: 'sk-test', voiceId: 'voice-1', model: 'cosyvoice-v3.5-plus' }),
    fetchImpl: async (url, init) => {
      sent.push({ url, init })
      return response
    },
  })
  return { client, sent }
}

describe('SSE 帧切分', () => {
  it('认出 event 与 data 两行', () => {
    const frame = parseSseFrame('event: sentence-synthesis\ndata: {"a":1}')
    assert.deepEqual(frame, { event: 'sentence-synthesis', data: '{"a":1}' })
  })

  it('多行 data 拼回一段（换行 SSE 允许这样拆）', () => {
    const frame = parseSseFrame('data: {"a":\ndata: 1}')
    assert.deepEqual(frame, { event: '', data: '{"a":\n1}' })
  })

  it('没有 data 行的帧不算数（注释行、心跳都不是事件）', () => {
    assert.equal(parseSseFrame(': keep-alive'), undefined)
    assert.equal(parseSseFrame('event: ping'), undefined)
  })

  it('\\r\\n 也要能读 —— 有的中间层会改换行', () => {
    const frame = parseSseFrame('event: done\r\ndata: {}')
    assert.deepEqual(frame, { event: 'done', data: '{}' })
  })
})

describe('SSE 流读取', () => {
  /**
   * 读一条流，返回所有事件。
   * @returns 事件列表。
   */
  async function drain(body) {
    const out = []
    for await (const frame of readSse(body)) out.push(frame)
    return out
  }

  it('一次读到半帧也照样组装起来', async () => {
    // 切成 7 块投递：帧边界一定落在某一趟的中间，而事件一个都不能少。
    const events = await drain(streamResponse(STANDARD_FRAMES, 7).body)
    assert.equal(events.length, 5)
    assert.equal(events[0].event, 'sentence-begin')
    assert.equal(events[3].event, 'sentence-end')
    assert.equal(events[4].event, 'sentence-synthesis')
  })

  it('最后一个事件后面没有空行也不丢', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(Buffer.from('event: sentence-end\ndata: {}', 'utf8'))
        controller.close()
      },
    })
    const events = await drain(body)
    assert.equal(events.length, 1)
    assert.equal(events[0].event, 'sentence-end')
  })

  it('async iterable 的响应体也能读（给不活在 Node 上的调用方留条路）', async () => {
    async function* source() {
      yield Buffer.from('event: alpha\ndata: 1\n\nevent: beta\ndata: 2\n\n', 'utf8')
    }
    const events = await drain(source())
    assert.deepEqual(events.map(item => item.event), ['alpha', 'beta'])
  })
})

describe('SSE 帧语义', () => {
  it('payload.data 里的 Base64 就是这一块的音频', () => {
    const frame = interpretSseFrame({
      event: 'sentence-synthesis',
      data: JSON.stringify({ payload: { data: CHUNK_ONE.toString('base64') } }),
    })
    assert.deepEqual(Buffer.from(frame.base64, 'base64'), CHUNK_ONE)
  })

  it('换个深度也认（output.audio.data）', () => {
    const frame = interpretSseFrame({
      event: '',
      data: JSON.stringify({ output: { audio: { data: CHUNK_TWO.toString('base64') } } }),
    })
    assert.equal(frame.kind, 'audio')
    assert.equal(frame.base64, CHUNK_TWO.toString('base64'))
  })

  it('句首 / 句尾各自只是节拍，不带音频', () => {
    assert.equal(interpretSseFrame({ event: 'sentence-begin', data: '{}' }).kind, 'begin')
    assert.equal(interpretSseFrame({ event: 'sentence-end', data: '{}' }).kind, 'end')
  })

  it('最后那一帧给的是完整音频地址与计费字符数', () => {
    const frame = interpretSseFrame({
      event: 'sentence-synthesis',
      data: JSON.stringify({
        output: { audio: { url: 'https://audio.example.com/all.wav' } },
        usage: { characters: 42 },
      }),
    })
    assert.equal(frame.kind, 'finish')
    assert.equal(frame.url, 'https://audio.example.com/all.wav')
    assert.equal(frame.characters, 42)
  })

  it('云端报失败时说的是人话', () => {
    const frame = interpretSseFrame({
      event: 'failed',
      data: JSON.stringify({ header: { error_message: '模型不支持流式' } }),
    })
    assert.equal(frame.kind, 'failed')
    assert.equal(frame.message, '模型不支持流式')
  })

  it('坏掉的 JSON 被忽略，而不是掀翻整次流式', () => {
    assert.equal(interpretSseFrame({ event: 'sentence-synthesis', data: 'not json' }).kind, 'ignored')
  })

  it('一组取值工具的边界', () => {
    const parsed = { output: { audio: { url: 'https://x/y.wav' } }, usage: { characters: 7 } }
    assert.equal(pickUrl(parsed), 'https://x/y.wav')
    assert.equal(pickCharacters(parsed), 7)
    // 只有 URL 没有音频的帧不该被当成一块空音频。
    assert.equal(pickAudio(parsed), undefined)
    assert.equal(pickCharacters({}), 0)
  })
})

describe('WAV 封装', () => {
  it('头是对的：RIFF/WAVE/fmt/data，且采样率与长度都写得准', () => {
    const pcm = Buffer.concat([CHUNK_ONE, CHUNK_TWO])
    const wav = wavFromPcm(pcm, 24000)
    assert.equal(wav.subarray(0, 4).toString('ascii'), 'RIFF')
    assert.equal(wav.subarray(8, 12).toString('ascii'), 'WAVE')
    assert.equal(wav.subarray(12, 16).toString('ascii'), 'fmt ')
    assert.equal(wav.subarray(36, 40).toString('ascii'), 'data')
    assert.equal(wav.readUInt32LE(24), 24000)
    assert.equal(wav.readUInt16LE(34), 16)
    assert.equal(wav.readUInt32LE(40), pcm.length)
    assert.equal(wav.readUInt32LE(4), 36 + pcm.length)
    assert.deepEqual(wav.subarray(44), pcm)
  })

  it('采样率是一回事：流式请求就是按这个值问云端的', () => {
    assert.equal(STREAM_SAMPLE_RATE, 24000)
  })

  it('磁盘上的名字决定它该以什么 MIME 出去', () => {
    assert.equal(mimeOf('a'.repeat(64) + '.wav'), 'audio/wav')
    assert.equal(mimeOf('a'.repeat(64) + '.mp3'), 'audio/mpeg')
  })
})

describe('SpeechClient 流式合成', () => {
  it('请求带上 SSE 头，且要的是 PCM', async () => {
    const { client, sent } = speechClientReturning(streamResponse(STANDARD_FRAMES))
    const frames = []
    for await (const frame of client.stream('第一句。第二句。', undefined)) frames.push(frame)

    assert.equal(sent.length, 1)
    assert.equal(sent[0].init.headers[SSE_HEADER], SSE_ENABLED)
    assert.equal(sent[0].init.headers.accept, 'text/event-stream')
    const body = JSON.parse(String(sent[0].init.body))
    assert.equal(body.input.format, 'pcm')
    assert.equal(body.input.sample_rate, 24000)
    assert.equal(body.input.voice, 'voice-1')
  })

  it('两块音频按到达顺序给出，最后才是 finish', async () => {
    const { client } = speechClientReturning(streamResponse(STANDARD_FRAMES))
    const kinds = []
    const bytes = []
    for await (const frame of client.stream('第一句。第二句。', undefined)) {
      kinds.push(frame.kind)
      if (frame.kind === 'audio') bytes.push(frame.bytes)
    }
    assert.deepEqual(kinds, ['audio', 'audio', 'finish'])
    assert.deepEqual(bytes[0], CHUNK_ONE)
    assert.deepEqual(bytes[1], CHUNK_TWO)
  })

  it('URL 与计费字符数跟着 finish 一起出来', async () => {
    const { client } = speechClientReturning(streamResponse(STANDARD_FRAMES))
    let finish
    for await (const frame of client.stream('第一句。第二句。', undefined)) {
      if (frame.kind === 'finish') finish = frame
    }
    assert.equal(finish.url, 'https://audio.example.com/all.wav')
    assert.equal(finish.characters, 11)
  })

  it('HTTP 错误翻译成既有的那一套中文提示', async () => {
    const { client } = speechClientReturning({ ok: false, status: 418, text: async () => '{"message":"no"}' })
    await assert.rejects(
      async () => {
        for await (const frame of client.stream('x', undefined)) void frame
      },
      /合成模型与注册音色时的模型不一致/,
    )
  })

  it('云端在流里报失败也算失败', async () => {
    const frames = [
      'event: failed',
      'data: {"header":{"error_message":"配额不足"}}',
      '',
    ]
    const { client } = speechClientReturning(streamResponse(frames))
    await assert.rejects(
      async () => {
        for await (const frame of client.stream('x', undefined)) void frame
      },
      /配额不足/,
    )
  })

  it('一个包都没有时明确报错，而不是静静地合成出一个空音频', async () => {
    const { client } = speechClientReturning(streamResponse(['event: sentence-begin', 'data: {}', '']))
    await assert.rejects(
      async () => {
        for await (const frame of client.stream('x', undefined)) void frame
      },
      /没有返回音频数据/,
    )
  })

  it('没配 API Key 时的提示与非流式那条链路是同一句', async () => {
    const client = new SpeechClient({
      getSettings: () => ({ apiKey: '', voiceId: 'v', model: 'm' }),
      fetchImpl: async () => streamResponse([]),
    })
    await assert.rejects(
      async () => {
        for await (const frame of client.stream('x', undefined)) void frame
      },
      /未配置 API Key/,
    )
  })
})

describe('带缓存的流式合成', () => {
  const dirs = []

  /**
   * 一个落在临时目录上的合成器。
   * @param response - 假云端的响应。
   * @returns 合成器与它的 store。
   */
  function harness(response) {
    const dir = mkdtempSync(join(tmpdir(), 'cosyvoice-stream-'))
    dirs.push(dir)
    const store = new AudioStore(() => dir)
    const speech = new SpeechClient({
      getSettings: () => ({ apiKey: 'sk-test', voiceId: 'voice-1', model: 'cosyvoice-v3.5-plus' }),
      fetchImpl: async () => response,
    })
    return { store, synth: new VoiceSynthesizer({ speech, store, getSettings: () => ({ voiceId: 'voice-1', model: 'cosyvoice-v3.5-plus' }), log: () => {} }) }
  }

  after(() => {
    // 临时目录：留着无害，但别让它累积在一个跑测试的机器上。
    for (const dir of dirs) {
      try { new AudioStore(() => dir).clear() } catch { /* 无所谓 */ }
    }
  })

  it('第一次一路流出每一块，收尾给回一个能整段播放的 WAV', async () => {
    const { synth } = harness(streamResponse(STANDARD_FRAMES))
    const blocks = []
    let ready
    for await (const frame of synth.stream('第一句。第二句。')) {
      if (frame.kind === 'audio') blocks.push(frame.bytes)
      else ready = frame
    }
    assert.equal(blocks.length, 2)
    assert.equal(ready.clip.cached, false)
    assert.equal(ready.clip.name.endsWith('.wav'), true)
    assert.equal(ready.clip.characters, 11)

    // 落盘的那份是 WAV，且正当是从那些块拼出来的。
    const hit = synth.store.hit(ready.clip.name.replace('.wav', ''), 'wav')
    assert.notEqual(hit, undefined)
  })

  it('第二次直接命中缓存，一块都不再向云端要', async () => {
    const { synth, store } = harness(streamResponse(STANDARD_FRAMES))
    /**
     * 跑完一次流式。
     * @returns 终帧。
     */
    async function run() {
      for await (const frame of synth.stream('同一条回答')) {
        if (frame.kind === 'ready') return frame
      }
      return undefined
    }
    const first = await run()
    assert.equal(first.clip.cached, false)
    const second = await run()
    assert.equal(second.clip.cached, true)
    assert.equal(second.clip.name, first.clip.name)
    assert.equal(store.count(), 1)
  })

  it('空文本在该抛的地方抛：bad request 不该变成一次云端往返', async () => {
    const { synth } = harness(streamResponse(STANDARD_FRAMES))
    await assert.rejects(async () => {
      for await (const frame of synth.stream('  **  ')) void frame
    }, /没有可朗读的文本/)
  })
})

describe('合成方式的归一', () => {
  it('只有 stream 认作实时', () => {
    assert.equal(normalizeMode('stream'), MODE_STREAM)
    assert.equal(normalizeMode('  stream '), MODE_STREAM)
  })

  it('其余一切（含没配过）都落到非实时', () => {
    assert.equal(normalizeMode(undefined), MODE_ONE_SHOT)
    assert.equal(normalizeMode(''), MODE_ONE_SHOT)
    assert.equal(normalizeMode('Stream'), MODE_ONE_SHOT)
    assert.equal(normalizeMode('realtime'), MODE_ONE_SHOT)
  })
})
