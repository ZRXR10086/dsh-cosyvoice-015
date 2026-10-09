/**
 * MiMo 那一半的单测：请求体长什么样、参考音频怎么复用、三款模型的差异。
 *
 * 这一层不花钱也不联网——`MimoSpeechClient` 的 fetch 可注入，于是"参考音频不见了"
 * "文本放错了消息角色""流式的帧被切在半截"都能就地复现。而这几处恰好是**错了不报
 * 语法错、只会念不出东西或念错内容**的地方：把它们放在真实环境里验，一次就是一次
 * 付费请求，而症状还极难定位。
 *
 * 最要紧的一条不变量在下面反复出现：**待合成文本必须落在 `role: assistant`**。
 * 写反了不会 400，只会让接口念出那句指令本身或者干脆沉默。
 * @module dsh-cosyvoice/test-mimo
 */

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'

import { SpeechEngine, formatFor } from '../host/engine.js'
import {
  MIMO_DEFAULT_VOICE,
  MIMO_ENDPOINT,
  MimoSpeechClient,
  audioDataUrl,
  describeMimoFailure,
  formatForStream,
  mimoFormatOf,
} from '../host/mimo.js'
import {
  DEFAULT_MODEL,
  MIMO_BUILTIN_VOICES,
  MODELS,
  catalogView,
  decorateName,
  isMimo,
  kindOf,
  normalizeModel,
  supportsStreaming,
} from '../host/models.js'
import { VoiceProfiles } from '../host/profiles.js'
import { ACCEPTED_EXTENSIONS, MAX_SAMPLE_BYTES, VoiceSamples, mimeOfSample, sampleNameFor } from '../host/samples.js'
import { AudioStore } from '../host/store.js'
import { VoiceSynthesizer } from '../host/synth.js'

/** 三款模型；断言里引用它们而不是硬写字符串，改了目录就一起改。 */
const M = {
  preset: 'mimo-v2.5-tts',
  clone: 'mimo-v2.5-tts-voiceclone',
  design: 'mimo-v2.5-tts-voicedesign',
}

/** 一段假音频：内容不重要，只有"它能被 base64 编码"这件事重要。 */
const SAMPLE = Buffer.from('RIFF-not-really-a-wav-but-bytes-are-bytes')

/**
 * 一套档案 + 一个合成器，`speech` 是假的 —— 只排定段序列，不真合成。
 *
 * 第一套档案自动成为当前音色，所以这里总是先建一套百炼的：它是"回落"的落点，
 * "没有回落到当前音色"这句话才有意义。
 * @param dir - 档案与音频目录。
 * @param entries - 除当前音色外要建的档案。
 * @returns `{ synth, profiles, samples }`。
 */
function withProfiles(dir, entries) {
  const samples = new VoiceSamples(() => dir)
  const profiles = new VoiceProfiles(() => join(dir, 'profiles.json'))
  profiles.put({ id: 'p_cur', name: '当前', voiceId: 'voice-1', model: 'cosyvoice-v3.5-plus' })
  for (const entry of entries) profiles.put(entry)
  const synth = new VoiceSynthesizer({
    speech: { synthesize: async () => { throw new Error('这一组用例只排定，不合成') } },
    store: new AudioStore(() => dir),
    getSettings: () => ({}),
    profiles,
    samples,
    log: () => {},
  })
  return { synth, profiles, samples }
}

describe('模型目录', () => {
  it('三款 MiMo 模型都在，音色来源各不相同', () => {
    assert.equal(kindOf(M.preset), 'preset')
    assert.equal(kindOf(M.clone), 'clone')
    assert.equal(kindOf(M.design), 'design')
  })

  it('只有预置那款是真的低延迟流式——另外两款官方写明降级为兼容模式', () => {
    assert.equal(supportsStreaming(M.preset), true)
    assert.equal(supportsStreaming(M.clone), false)
    assert.equal(supportsStreaming(M.design), false)
  })

  it('目录里仍然保留着百炼的那些模型，老用户看到的顺序不变', () => {
    // 这一条不是"顺便看一眼"：模型名改成"按档案绑定"之后，百炼那一半一个字都没改，
    // 它的存在是**老用户零改动继续可用**的前提。
    assert.equal(MODELS.some(model => model.id === DEFAULT_MODEL), true)
    assert.equal(MODELS[0].id, DEFAULT_MODEL)
  })

  it('内置音色清单里 `mimo_default` 与中文音色都在', () => {
    assert.equal(MIMO_BUILTIN_VOICES.some(voice => voice.id === MIMO_DEFAULT_VOICE), true)
    assert.equal(MIMO_BUILTIN_VOICES.filter(voice => voice.language === '中文').length >= 5, true)
  })

  it('没有登记的模型名照样被接受（老配置里写了什么就用什么）', () => {
    assert.equal(normalizeModel(''), DEFAULT_MODEL)
    assert.equal(normalizeModel('cosyvoice-v9-ultra'), 'cosyvoice-v9-ultra')
    assert.equal(isMimo('cosyvoice-v9-ultra'), false)
  })

  it('对外视图同时给出模型清单与内置音色，前端不必自己再抄一份', () => {
    const view = catalogView()
    assert.equal(Array.isArray(view.models), true)
    assert.equal(Array.isArray(view.builtinVoices), true)
    assert.equal(view.models.some(model => model.id === M.design), true)
    assert.equal(view.builtinVoices.length, MIMO_BUILTIN_VOICES.length)
  })

  it('模型名作为后缀附在名称末尾，且不会重复追加', () => {
    assert.equal(decorateName('我的声音', M.clone), `我的声音 · ${M.clone}`)
    // 幂等：编辑 → 保存不能让名字变成 `x · m · m`。
    assert.equal(decorateName(decorateName('我的声音', M.clone), M.clone), `我的声音 · ${M.clone}`)
  })
})

describe('格式名在两家之间的翻译', () => {
  it('MiMo 的流式格式恒为 pcm16（官方要求，否则拼不出完整音频）', () => {
    assert.equal(formatForStream(), 'pcm16')
    assert.equal(mimoFormatOf('pcm'), 'pcm16')
    assert.equal(mimoFormatOf('pcm16'), 'pcm16')
  })

  it('内部说的 pcm 在百炼那边就叫 pcm，在 MiMo 那边叫 pcm16', () => {
    assert.equal(formatFor('dashscope', 'pcm'), 'pcm')
    assert.equal(formatFor('mimo', 'pcm'), 'pcm16')
  })

  it('mp3 / wav 两家同名，空格式在 MiMo 侧落回 mp3', () => {
    assert.equal(formatFor('dashscope', 'mp3'), 'mp3')
    assert.equal(formatFor('mimo', 'mp3'), 'mp3')
    assert.equal(formatFor('mimo', ''), 'mp3')
  })
})

describe('样本仓库', () => {
  const dirs = []

  /**
   * 一个指到临时目录的样本仓库。
   * @returns 仓库实例与它的目录。
   */
  function harness() {
    const dir = mkdtempSync(join(tmpdir(), 'cosyvoice-samples-'))
    dirs.push(dir)
    return { dir, samples: new VoiceSamples(() => dir) }
  }

  after(() => {
    for (const dir of dirs) {
      try { rmSync(dir, { recursive: true, force: true }) } catch { /* 无所谓 */ }
    }
  })

  it('文件名用档案 id，于是用户在磁盘上认得出它', () => {
    assert.equal(sampleNameFor('p_abc', '录音.MP3'), 'p_abc.mp3')
    // 认不出的容器一律落 wav：真正的把关在上传时按扩展名拒绝，不在这里猜。
    assert.equal(sampleNameFor('p_abc', '录音.m4a'), 'p_abc.wav')
    assert.equal(sampleNameFor('p_abc', ''), 'p_abc.wav')
  })

  it('MIME 由扩展名决定，因为 MiMo 只认 audio/mpeg 与 audio/wav', () => {
    assert.equal(mimeOfSample('a.wav'), 'audio/wav')
    assert.equal(mimeOfSample('a.mp3'), 'audio/mpeg')
    assert.deepEqual(ACCEPTED_EXTENSIONS, ['wav', 'mp3'])
  })

  it('存进去再读出来是同一段字节，编码后的 data URL 带正确的 MIME 前缀', () => {
    const { samples } = harness()
    const stored = samples.put({ id: 'p1', filename: 'voice.wav', bytes: SAMPLE })
    assert.equal(stored.name, 'p1.wav')
    assert.deepEqual(samples.read('p1.wav').bytes, SAMPLE)
    const url = samples.dataUrlOf('p1.wav')
    assert.equal(url, audioDataUrl(SAMPLE, 'audio/wav'))
    assert.equal(url.startsWith('data:audio/wav;base64,'), true)
  })

  it('指纹跟着内容变——换了参考音频就一定要重新合成', () => {
    const { samples } = harness()
    samples.put({ id: 'p1', filename: 'voice.wav', bytes: SAMPLE })
    const before = samples.fingerprint('p1.wav')
    // 同一个文件名写进不同的音频：指纹必须变，否则会命中一个音色完全不同的旧缓存。
    samples.put({ id: 'p1', filename: 'voice.wav', bytes: Buffer.from('别的音频') })
    assert.notEqual(samples.fingerprint('p1.wav'), before)
  })

  it('读不到时给的是 undefined 而不是抛异常（缺文件是用户能修的状态）', () => {
    const { samples } = harness()
    assert.equal(samples.read('p_none.wav'), undefined)
    assert.equal(samples.dataUrlOf('p_none.wav'), undefined)
    assert.equal(samples.fingerprint('p_none.wav'), '')
  })

  it('删掉一个不存在的文件不算失败', () => {
    const { samples } = harness()
    samples.put({ id: 'p1', filename: 'voice.wav', bytes: SAMPLE })
    samples.remove('p1.wav')
    samples.remove('p1.wav')
    assert.equal(samples.read('p1.wav'), undefined)
  })

  it('体积上限按"Base64 之后不超过 10MB"倒推，且比它严格', () => {
    // Base64 放大 4/3，7MB 编码后约 9.3MB，留了余量。
    assert.equal(MAX_SAMPLE_BYTES < (10 * 1024 * 1024) * 3 / 4, true)
  })
})

describe('请求体的形状', () => {
  /**
   * 一个只记住最后一次请求的假 fetch。
   * @param response - 要回给它的响应。
   * @returns fetch 实现与"最后那次请求"的读取口。
   */
  function fakeFetch(response) {
    const seen = { url: undefined, init: undefined }
    return {
      seen,
      fetchImpl: async (url, init) => {
        seen.url = String(url)
        seen.init = init
        return response
      },
    }
  }

  /** 一个合成的成功响应：音频是 base64 的假 MP3。 */
  function okResponse() {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { audio: { data: Buffer.from('fake-mp3').toString('base64') } } }],
        usage: { characters: 4 },
      }),
    }
  }

  /**
   * 一个装好本地样本的客户端。
   * @returns 客户端与它的样本仓库。
   */
  function harness() {
    const dir = mkdtempSync(join(tmpdir(), 'cosyvoice-mimo-'))
    const samples = new VoiceSamples(() => dir)
    samples.put({ id: 'p1', filename: 'voice.wav', bytes: SAMPLE })
    return { dir, samples }
  }

  it('待合成的文本必须落在 assistant 那一侧，user 那一侧留给指令', async () => {
    const { samples } = harness()
    const fake = fakeFetch(okResponse())
    const client = new MimoSpeechClient({
      getSettings: () => ({ mimoApiKey: 'sk-mimo' }),
      samples,
      fetchImpl: fake.fetchImpl,
    })
    await client.synthesize('要念的这一句', { model: M.preset, voiceId: '冰糖', kind: 'preset' }, 'mp3')

    const payload = JSON.parse(String(fake.seen.init.body))
    const user = payload.messages.find(message => message.role === 'user')
    const assistant = payload.messages.find(message => message.role === 'assistant')
    assert.equal(assistant.content, '要念的这一句')
    assert.equal(user.content, '')
    assert.equal(fake.seen.url, MIMO_ENDPOINT)
    assert.equal(fake.seen.init.headers.authorization, 'Bearer sk-mimo')
  })

  it('音色设计把描述放进 user —— 那是它唯一能被送达的位置', async () => {
    const { samples } = harness()
    const fake = fakeFetch(okResponse())
    const client = new MimoSpeechClient({
      getSettings: () => ({ mimoApiKey: 'sk-mimo' }),
      samples,
      fetchImpl: fake.fetchImpl,
    })
    await client.synthesize('要念的这一句', { model: M.design, voiceId: '低沉沙哑的男声', kind: 'design' }, 'mp3')

    const payload = JSON.parse(String(fake.seen.init.body))
    assert.equal(payload.messages.find(message => message.role === 'user').content, '低沉沙哑的男声')
    assert.equal(payload.messages.find(message => message.role === 'assistant').content, '要念的这一句')
    // 音色设计没有音色名也不能带一个空串：带空串会走到"预置音色"分支，
    // 然后接口报一个与真实原因毫无关系的"音色不存在"。
    assert.equal('voice' in payload.audio, false)
  })

  it('音色设计描述为空时在**发请求之前**就报错，不浪费一次往返', async () => {
    const { samples } = harness()
    const fake = fakeFetch(okResponse())
    const client = new MimoSpeechClient({
      getSettings: () => ({ mimoApiKey: 'sk-mimo' }),
      samples,
      fetchImpl: fake.fetchImpl,
    })
    await assert.rejects(
      async () => client.synthesize('念什么无所谓', { model: M.design, voiceId: '', kind: 'design' }, 'mp3'),
      /还没有写描述/,
    )
    assert.equal(fake.seen.url, undefined)
  })

  it('预置音色没有指定时落到 mimo_default', async () => {
    const { samples } = harness()
    const fake = fakeFetch(okResponse())
    const client = new MimoSpeechClient({
      getSettings: () => ({ mimoApiKey: 'sk-mimo' }),
      samples,
      fetchImpl: fake.fetchImpl,
    })
    await client.synthesize('一句话', { model: M.preset, voiceId: '', kind: 'preset' }, 'mp3')
    assert.equal(JSON.parse(String(fake.seen.init.body)).audio.voice, MIMO_DEFAULT_VOICE)
  })

  it('没有配 MiMo 的 Key 时说的是"去设置里填这一把"，不是泛泛的鉴权失败', async () => {
    const { samples } = harness()
    const client = new MimoSpeechClient({ getSettings: () => ({}), samples, fetchImpl: async () => okResponse() })
    await assert.rejects(
      async () => client.synthesize('一句话', { model: M.preset, voiceId: '冰糖', kind: 'preset' }, 'mp3'),
      /未配置 MiMo API Key/,
    )
  })

  it('把百炼的模型名塞给 MiMo 通道会被当场拒绝', async () => {
    const { samples } = harness()
    const client = new MimoSpeechClient({
      getSettings: () => ({ mimoApiKey: 'sk-mimo' }),
      samples,
      fetchImpl: async () => okResponse(),
    })
    await assert.rejects(
      async () => client.synthesize('一句话', { model: 'cosyvoice-v3.5-plus', voiceId: 'x', kind: 'clone' }, 'mp3'),
      /不是 MiMo 系列/,
    )
  })
})

describe('复刻音色的本地复用', () => {
  const dirs = []

  /**
   * 一套完整的"档案 + 本地样本 + 引擎"，fetch 是假的。
   * @param options.model - 档案绑定的模型。
   * @returns 引擎、档案、样本仓库，以及最后一次请求。
   */
  function harness({ model = M.clone, dropSample = false } = {}) {
    const dir = mkdtempSync(join(tmpdir(), 'cosyvoice-clone-'))
    dirs.push(dir)
    const samples = new VoiceSamples(() => dir)
    if (!dropSample) samples.put({ id: 'p_clone', filename: 'voice.wav', bytes: SAMPLE })

    const profiles = new VoiceProfiles(() => join(dir, 'profiles.json'))
    profiles.put({
      name: '我的嗓子',
      voiceId: '',
      model,
      sample: dropSample ? 'p_clone.wav' : samples.put({ id: 'p_clone', filename: 'voice.wav', bytes: SAMPLE }).name,
      source: 'clone',
      status: 'ready',
    })
    profiles.activate('p_clone')

    const seen = { init: undefined }
    const speech = new SpeechEngine({
      getSettings: () => ({ mimoApiKey: 'sk-mimo' }),
      samples,
      mimo: new MimoSpeechClient({
        getSettings: () => ({ mimoApiKey: 'sk-mimo' }),
        samples,
        fetchImpl: async (_url, init) => {
          seen.init = init
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
              choices: [{ message: { audio: { data: Buffer.from('fake').toString('base64') } } }],
              usage: { characters: 3 },
            }),
          }
        },
      }),
    })
    return { speech, profiles, samples, seen, dir }
  }

  after(() => {
    for (const dir of dirs) {
      try { rmSync(dir, { recursive: true, force: true }) } catch { /* 无所谓 */ }
    }
  })

  it('每次合成都把本地那段音频重新附在 audio.voice 上', async () => {
    const { speech, seen } = harness()
    await speech.synthesize('第一句', { model: M.clone, sample: 'p_clone.wav', voiceKind: 'clone' }, 'mp3')
    const first = JSON.parse(String(seen.init.body)).audio.voice
    assert.equal(first, audioDataUrl(SAMPLE, 'audio/wav'))

    // 复用：第二次合成同样带上同一段音频，且**不**需要用户再做任何事。
    await speech.synthesize('第二句', { model: M.clone, sample: 'p_clone.wav', voiceKind: 'clone' }, 'mp3')
    assert.equal(JSON.parse(String(seen.init.body)).audio.voice, first)
  })

  it('参考音频不见了时说的是"重新上传"，而不是一个云端错误码', async () => {
    const { speech } = harness({ dropSample: true })
    await assert.rejects(
      async () => speech.synthesize('一句话', { model: M.clone, sample: 'p_clone.wav', voiceKind: 'clone' }, 'mp3'),
      /参考音频已经不在了/,
    )
  })

  it('样本丢了之后这套档案不算数，合成静默回落到设置里的回退值', async () => {
    // 拿一个空音色去打云端，报出来的错（"音色不存在"）完全指不到真实原因；
    // 回落至少让朗读继续工作。回落走的是百炼那一侧，所以这里要给它一个假客户端，
    // 否则测到的会是"百炼没有 Key"——一个恰好也会发生、但完全无关的失败。
    const { profiles, samples, dir } = harness({ dropSample: true })
    const identity = new VoiceSynthesizer({
      speech: { synthesize: async () => { throw new Error('不该走到这里') } },
      store: new AudioStore(() => dir),
      getSettings: () => ({}),
      profiles,
      samples,
      log: () => {},
    }).identity()
    assert.notEqual(identity.model, M.clone)
    assert.equal(identity.voiceId, '')
  })
})

describe('流式合成', () => {
  /**
   * 一条假 SSE 响应：OpenAI 形状的帧。
   * @param frames - 帧文本。
   * @returns 响应。
   */
  function sseResponse(frames) {
    const bytes = Buffer.from(frames.join(''), 'utf8')
    return {
      ok: true,
      status: 200,
      text: async () => bytes.toString('utf8'),
      body: new ReadableStream({
        start(controller) {
          // 故意在帧中间切开：SSE 的帧边界落在一次读取的中间才是网络上的常态。
          const half = Math.ceil(bytes.length / 2)
          controller.enqueue(bytes.subarray(0, half))
          controller.enqueue(bytes.subarray(half))
          controller.close()
        },
      }),
    }
  }

  /** 一块 base64 的假 PCM。 */
  function pcm(fill) {
    return Buffer.alloc(4, fill).toString('base64')
  }

  /**
   * 一个带假 SSE 的客户端。
   * @param frames - 帧文本。
   * @param seen - 用来读回最后一次请求。
   * @returns 客户端。
   */
  function harness(frames, seen = {}) {
    return new MimoSpeechClient({
      getSettings: () => ({ mimoApiKey: 'sk-mimo' }),
      samples: new VoiceSamples(() => mkdtempSync(join(tmpdir(), 'cosyvoice-mimo-stream-'))),
      fetchImpl: async (_url, init) => {
        seen.init = init
        return sseResponse(frames)
      },
    })
  }

  it('流式请求恒用 pcm16，并把 stream 打开', async () => {
    const seen = {}
    const client = harness([
      `data: {"choices":[{"delta":{"audio":{"data":"${pcm(1)}"}}}]}\n\n`,
      'data: [DONE]\n\n',
    ], seen)
    for await (const _frame of client.stream('一句话', { model: M.preset, voiceId: '冰糖', kind: 'preset' })) void _frame

    const payload = JSON.parse(String(seen.init.body))
    assert.equal(payload.stream, true)
    assert.equal(payload.audio.format, 'pcm16')
  })

  it('每一块音频都被交出来，采样率是官方那个 24000', async () => {
    const client = harness([
      `data: {"choices":[{"delta":{"audio":{"data":"${pcm(1)}"}}}]}\n\n`,
      `data: {"choices":[{"delta":{"audio":{"data":"${pcm(2)}"}}}]}\n\n`,
      'data: {"choices":[{"finish_reason":"stop"}],"usage":{"characters":5}}\n\n',
      'data: [DONE]\n\n',
    ])
    const blocks = []
    let characters = 0
    for await (const frame of client.stream('第一句。第二句。', { model: M.preset, voiceId: '茉莉', kind: 'preset' })) {
      if (frame.kind === 'audio') blocks.push(frame)
      // 与 `synth.js` 同一套取法：MiMo 会在真实用量之后再给一个不带用量的
      // `[DONE]`，所以"最后一个赢"会把字符数抹成 0。
      else if (frame.kind === 'finish') characters = Math.max(characters, frame.characters)
    }
    assert.equal(blocks.length, 2)
    assert.equal(blocks[0].sampleRate, 24000)
    assert.equal(characters, 5)
  })

  it('一条音频都没收到时报错，而不是静默收尾（用户会以为"读完了"）', async () => {
    const client = harness(['data: [DONE]\n\n'])
    await assert.rejects(async () => {
      for await (const _frame of client.stream('一句话', { model: M.preset, voiceId: '茉莉', kind: 'preset' })) void _frame
    }, /没有返回音频数据/)
  })

  it('流式的请求体同样把文本放在 assistant 那一侧', async () => {
    const seen = {}
    const client = harness([
      `data: {"choices":[{"delta":{"audio":{"data":"${pcm(9)}"}}}]}\n\n`,
      'data: [DONE]\n\n',
    ], seen)
    for await (const _frame of client.stream('要念的这一句', { model: M.preset, voiceId: '苏打', kind: 'preset' })) void _frame
    const payload = JSON.parse(String(seen.init.body))
    assert.equal(payload.messages.find(message => message.role === 'assistant').content, '要念的这一句')
  })
})

describe('失败的说法', () => {
  it('Key 问题的提示要指向"去设置里填 MiMo 的 Key"', () => {
    assert.match(describeMimoFailure(401, '{"error":{"message":"bad key"}}', {}), /设置 → 语音/)
  })

  it('音色被拒时要说清复刻音色需要一段清晰的 mp3/wav', () => {
    const message = describeMimoFailure(400, '{"error":{"message":"invalid voice audio"}}', { voiceId: '我的嗓子' })
    assert.match(message, /mp3\/wav/)
    assert.match(message, /我的嗓子/)
  })

  it('500 与 429 说的话不一样：前者让人重试，后者是额度问题', () => {
    assert.match(describeMimoFailure(500, '', {}), /稍后重试/)
    assert.match(describeMimoFailure(429, '', {}), /额度/)
  })

  it('正文不是 JSON 时也不会崩，截一段当细节', () => {
    const message = describeMimoFailure(400, '<html>gateway</html>', {})
    assert.match(message, /gateway/)
  })
})

describe('引擎路由', () => {
  it('按模型分给两家，且把音色来源显式转达给 MiMo 客户端', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cosyvoice-engine-'))
    const samples = new VoiceSamples(() => dir)
    samples.put({ id: 'p1', filename: 'voice.wav', bytes: SAMPLE })
    const seen = { init: undefined }
    const engine = new SpeechEngine({
      getSettings: () => ({ mimoApiKey: 'sk-mimo' }),
      samples,
      dashscope: {
        synthesize: async () => ({ bytes: Buffer.from('dash'), model: 'cosyvoice-v3.5-plus', voiceId: 'v', characters: 1 }),
        openStream: () => ({ frames: [] }),
      },
      mimo: new MimoSpeechClient({
        getSettings: () => ({ mimoApiKey: 'sk-mimo' }),
        samples,
        fetchImpl: async (_url, init) => {
          seen.init = init
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ choices: [{ message: { audio: { data: 'ZmFrZQ==' } } }] }),
          }
        },
      }),
    })

    // 传的是 `voiceKind`（synth.js 的字段名），引擎负责转成 MiMo 客户端读的 `kind`。
    // 这一步要是漏了，档案里的复刻音色会被当成预置音色，拿文件名去问接口报"音色不存在"。
    const result = await engine.synthesize(
      '一句话',
      { model: M.clone, sample: 'p1.wav', voiceId: '', voiceKind: 'clone' },
      'mp3',
    )
    assert.equal(result.model, M.clone)
    assert.equal(JSON.parse(String(seen.init.body)).audio.voice, audioDataUrl(SAMPLE, 'audio/wav'))

    // 百炼那侧完全不收到这两个新增字段。
    const dash = await engine.synthesize('一句话', { model: 'cosyvoice-v3.5-plus', voiceId: 'v' }, 'mp3')
    assert.equal(dash.bytes.toString(), 'dash')
  })

  it('两段用不同档案时各自认自己的模型，不串到当前音色上去', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cosyvoice-two-voices-'))
    try {
      // 旁白是百炼复刻、台词是 MiMo 内置 —— 跨引擎、跨模型同时用。
      const { synth } = withProfiles(dir, [
        { id: 'p_dash', name: '百炼旁白', voiceId: 'longxiaochun', model: 'cosyvoice-v3.5-plus' },
        { id: 'p_mimo', name: 'MiMo 台词', voiceId: '冰糖', model: M.preset },
      ])
      const plan = synth.plan('他敲了敲门。「谁？」', {
        roleplay: true,
        narrationProfileId: 'p_dash',
        characterProfileId: 'p_mimo',
      })
      assert.equal(plan.multi, true)
      assert.deepEqual(plan.parts.map(part => part.kind), ['narration', 'dialogue'])
      assert.deepEqual(plan.parts.map(part => part.model), ['cosyvoice-v3.5-plus', M.preset])
      assert.deepEqual(plan.parts.map(part => part.voiceKind), ['clone', 'preset'])
      assert.deepEqual(plan.parts.map(part => part.voiceId), ['longxiaochun', '冰糖'])
      assert.deepEqual(plan.parts.map(part => part.profileId), ['p_dash', 'p_mimo'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('音色档案的可用性判定', () => {
  it('描述写在 voiceId 里的设计档案也算数，不会静默回落到当前音色', () => {
    // 界面新增"音色设计"时把描述存进 `voiceId`（`profiles.normalize()` 另外还会补一个
    // 空的 `designPrompt` 键）。这里曾用 `profile.designPrompt ?? profile.voiceId`：
    // `??` 只对 null/undefined 回落，而空串不回落 —— 于是描述明明在档案里，这套档案
    // 却被判成"没有描述"而不可用，接着静默回落到百炼当前音色。症状是"选了 MiMo 音色
    // 设计，念出来却是百炼那个声音"，且一路没有任何报错。
    const dir = mkdtempSync(join(tmpdir(), 'cosyvoice-design-'))
    try {
      const { synth, profiles } = withProfiles(dir, [
        { id: 'p_design', name: '温柔女声', voiceId: '二十多岁女声，语速偏慢', model: M.design },
      ])
      profiles.activate('p_design')
      const identity = synth.identity()
      assert.equal(identity.model, M.design)
      assert.equal(identity.voiceKind, 'design')
      assert.equal(identity.voiceId, '二十多岁女声，语速偏慢')
      assert.equal(synth.plan('一句台词。', { roleplay: true, characterProfileId: 'p_design' }).parts[0].model, M.design)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('描述写在 designPrompt 里的设计档案同样算数', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cosyvoice-design-'))
    try {
      const { synth, profiles } = withProfiles(dir, [
        { id: 'p_design', name: '设计', voiceId: '', designPrompt: '沙哑的中年男声', model: M.design },
      ])
      profiles.activate('p_design')
      assert.equal(synth.identity().model, M.design)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('两处都没有描述的设计档案判为不可用，回落到设置里的回退值', () => {
    // 上一条的反面：判定必须真的看内容，不能为了"别回落"而一律放行 —— 一套空描述
    // 的设计档案打过去，MiMo 会拿一个空 `user` 消息去请求。
    const dir = mkdtempSync(join(tmpdir(), 'cosyvoice-design-'))
    try {
      const { synth, profiles } = withProfiles(dir, [
        { id: 'p_design', name: '空的', voiceId: '', model: M.design },
      ])
      profiles.activate('p_design')
      assert.equal(synth.identity().model, 'cosyvoice-v3.5-plus')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('档案查不到时也回落，不报错', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cosyvoice-design-'))
    try {
      const { synth } = withProfiles(dir, [])
      const plan = synth.plan('一句台词。', { roleplay: true, characterProfileId: 'p_不存在' })
      assert.equal(plan.parts[0].model, 'cosyvoice-v3.5-plus')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})