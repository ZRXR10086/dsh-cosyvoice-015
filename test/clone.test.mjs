/**
 * 音色克隆的单测。
 *
 * 全链路不碰网络：`VoiceCloner` 接收注入的 fetch，于是"上传成功""拿到内网 URL"
 * "注册成功""还在部署""部署失败""配额满了"都是可复现的本地状态。
 *
 * 这里最想守住的是**四步的顺序**与**② 不可省**：`create_voice` 只接受阿里云内网
 * 地址，直接把公网直链递过去会报 `AudioSilentError`。所以断言里明确检查了
 * 交给 `create_voice` 的 URL 是 Files 接口给的那一个，而不是上传时的原始地址。
 *
 * 运行：`node --test "test/*.test.mjs"`
 * @module dsh-cosyvoice/test-clone
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  CUSTOMIZATION_ENDPOINT,
  FILES_ENDPOINT,
  VoiceCloner,
  audioContentType,
  describeCloneFailure,
  modelFromVoiceId,
  normalizePrefix,
  phaseOfStatus,
  pickStatus,
  pickVoiceId,
  randomPrefix,
} from '../host/clone.js'

/** 一个 JSON 响应。 */
function jsonResponse(payload) {
  return { ok: true, status: 200, text: async () => JSON.stringify(payload) }
}

/**
 * 按 URL 分派的假 fetch，并把每次调用记下来。
 * @param handlers - URL（或包含片段）→ 响应。
 * @returns 可注入的 fetch 与调用记录。
 */
function fakeFetch(handlers) {
  const calls = []
  const impl = async (url, init) => {
    calls.push({ url: String(url), init })
    for (const [fragment, handler] of handlers) {
      if (String(url).includes(fragment)) return handler(init)
    }
    throw new Error(`unexpected request: ${String(url)}`)
  }
  return { impl, calls }
}

/** 一套能让整条链走通的假响应。 */
function happyHandlers() {
  return [
    [FILES_ENDPOINT, async (init) => {
      // 上传端点：POST 带 FormData。同一个 URL 片段也覆盖 GET 单个文件，
      // 所以用有没有 body 区分。
      if (init?.body !== undefined) return jsonResponse({ data: { uploaded_files: [{ file_id: 'file-1' }] } })
      return jsonResponse({ data: { url: 'https://intranet.example.com/a.wav' } })
    }],
    [CUSTOMIZATION_ENDPOINT, async (init) => {
      const body = JSON.parse(String(init.body ?? '{}'))
      if (body.input.action === 'create_voice') return jsonResponse({ output: { voice_id: 'cosyvoice-v3.5-plus-dsh-ab12cd' } })
      if (body.input.action === 'query_voice') return jsonResponse({ output: { voice_id: body.input.voice_id, status: 'OK' } })
      return jsonResponse({ output: { voice_list: [{ voice_id: 'cosyvoice-v2-cloud1', status: 'OK' }] } })
    }],
  ]
}

describe('音色前缀', () => {
  it('随机的前缀合法：dsh 开头、只有数字与小写字母、不超过 10 字符', () => {
    for (let i = 0; i < 50; i += 1) {
      const prefix = randomPrefix()
      assert.match(prefix, /^dsh[0-9a-z]*$/)
      assert.ok(prefix.length <= 10, `前缀过长：${prefix}`)
    }
  })

  it('用户输入被收敛：大写转小写、非法字符剔除、超长截断', () => {
    assert.equal(normalizePrefix('My Voice!'), 'myvoice')
    assert.equal(normalizePrefix('abcdefghijklmnop'), 'abcdefghij')
    assert.equal(normalizePrefix('中文'), undefined)
    assert.equal(normalizePrefix(''), undefined)
  })
})

describe('audioContentType', () => {
  it('按扩展名给出 MIME', () => {
    assert.equal(audioContentType('a.WAV'), 'audio/wav')
    assert.equal(audioContentType('a.mp3'), 'audio/mpeg')
    assert.equal(audioContentType('a.m4a'), 'audio/mp4')
  })

  it('认不出来时退回八位字节流', () => {
    assert.equal(audioContentType('a.bin'), 'application/octet-stream')
    assert.equal(audioContentType(undefined), 'application/octet-stream')
  })
})

describe('响应形状', () => {
  it('状态字段挪了位置也认得出来', () => {
    assert.equal(pickStatus({ output: { status: 'deploying' } }), 'DEPLOYING')
    assert.equal(pickStatus({ output: { voice_status: 'OK' } }), 'OK')
    assert.equal(pickStatus({ output: { voice: { status: 'UNDEPLOYED' } } }), 'UNDEPLOYED')
    assert.equal(pickStatus({ output: { voice_list: [{ status: 'OK' }] } }), 'OK')
    assert.equal(pickStatus({ output: {} }), 'UNKNOWN')
  })

  it('音色 ID 同样多处都认', () => {
    assert.equal(pickVoiceId({ output: { voice_id: 'v1' } }), 'v1')
    assert.equal(pickVoiceId({ output: { voice: { voice_id: 'v2' } } }), 'v2')
    assert.equal(pickVoiceId({ output: { voice_list: [{ voice_id: 'v3' }] } }), 'v3')
    assert.equal(pickVoiceId({ output: {} }), undefined)
  })

  it('状态翻译成三态', () => {
    assert.equal(phaseOfStatus('OK'), 'ready')
    assert.equal(phaseOfStatus('DEPLOYING'), 'pending')
    assert.equal(phaseOfStatus('UNDEPLOYED'), 'failed')
    // 没见过的状态宁可再等一次，也不要把马上就绪的音色判死。
    assert.equal(phaseOfStatus('SOMETHING-NEW'), 'pending')
  })
})

describe('modelFromVoiceId', () => {
  it('从音色 ID 前缀反推模型', () => {
    assert.equal(modelFromVoiceId('cosyvoice-v3.5-plus-dsh-ab12'), 'cosyvoice-v3.5-plus')
    assert.equal(modelFromVoiceId('cosyvoice-v2-cloud1'), 'cosyvoice-v2')
  })

  it('猜不出就返回 undefined，交给设置里的默认模型', () => {
    assert.equal(modelFromVoiceId('weird-voice'), undefined)
    assert.equal(modelFromVoiceId(''), undefined)
  })
})

describe('describeCloneFailure', () => {
  it('401/403 指向 Key', () => {
    assert.match(describeCloneFailure(401, '{}'), /API Key 无效或无权限/)
  })

  it('400 且提到音频时给出可操作的建议', () => {
    const message = describeCloneFailure(400, '{"message":"AudioSilentError"}')
    assert.match(message, /音频不符合复刻要求/)
    assert.match(message, /48kHz/)
  })

  it('429 指向限流或配额', () => {
    assert.match(describeCloneFailure(429, '{}'), /配额/)
  })

  it('5xx 指向服务不可用', () => {
    assert.match(describeCloneFailure(500, '{}'), /暂时不可用/)
  })

  it('带上百炼给的原文，别只说"失败"', () => {
    assert.match(describeCloneFailure(400, '{"message":"bad prefix"}'), /bad prefix/)
  })
})

describe('VoiceCloner', () => {
  const settings = { apiKey: 'sk-test', model: 'cosyvoice-v3.5-plus' }
  const cloner = () => new VoiceCloner({ getSettings: () => settings, fetchImpl: fakeFetch(happyHandlers()).impl })

  it('缺 Key 时直接拒绝，一次请求都不发', async () => {
    const { impl, calls } = fakeFetch(happyHandlers())
    const noKey = new VoiceCloner({ getSettings: () => ({ ...settings, apiKey: '' }), fetchImpl: impl })
    await assert.rejects(noKey.clone({ bytes: Buffer.from('x'), filename: 'a.wav' }), /未配置 API Key/)
    assert.equal(calls.length, 0)
  })

  it('四步按顺序走完，且 create_voice 拿到的是内网 URL', async () => {
    const { impl, calls } = fakeFetch(happyHandlers())
    const made = await new VoiceCloner({ getSettings: () => settings, fetchImpl: impl })
      .clone({ bytes: Buffer.from('RIFF....'), filename: 'my-voice.wav', targetModel: 'cosyvoice-v3.5-plus' })

    assert.equal(made.voiceId, 'cosyvoice-v3.5-plus-dsh-ab12cd')
    assert.equal(calls.length, 3)
    assert.ok(calls[0].url.includes('/api/v1/files'))
    assert.ok(calls[1].url.includes('/api/v1/files/file-1'))
    assert.ok(calls[2].url.includes('customization'))

    const payload = JSON.parse(calls[2].init.body)
    assert.equal(payload.model, 'voice-enrollment')
    assert.equal(payload.input.action, 'create_voice')
    assert.equal(payload.input.target_model, 'cosyvoice-v3.5-plus')
    // 关键：交给 create_voice 的是 Files 接口给的内网地址，不是上传时的原始地址。
    assert.equal(payload.input.url, 'https://intranet.example.com/a.wav')
  })

  it('上传用 multipart，并带上 purpose=voice_clone', async () => {
    const { impl, calls } = fakeFetch(happyHandlers())
    await new VoiceCloner({ getSettings: () => settings, fetchImpl: impl }).upload({
      bytes: Buffer.from('RIFF'),
      filename: 'a.wav',
    })
    const body = calls[0].init.body
    assert.ok(body instanceof FormData, '上传必须是 multipart')
    assert.equal(body.get('purpose'), 'voice_clone')
    // 手动设 Content-Type 会丢掉 boundary，所以这里一个都不设。
    assert.equal(calls[0].init.headers['content-type'], undefined)
    assert.equal(calls[0].init.headers.authorization, 'Bearer sk-test')
  })

  it('部署中 / 就绪 / 失败 三种状态都能读出来', async () => {
    for (const [status, phase] of [['DEPLOYING', 'pending'], ['OK', 'ready'], ['UNDEPLOYED', 'failed']]) {
      const { impl } = fakeFetch([[CUSTOMIZATION_ENDPOINT, async () => jsonResponse({ output: { status } })]])
      const result = await new VoiceCloner({ getSettings: () => settings, fetchImpl: impl }).queryVoice('v')
      assert.equal(result.phase, phase, `status=${status}`)
    }
  })

  it('克隆失败时给出中文原因，不抛裸网络异常', async () => {
    const { impl } = fakeFetch([[FILES_ENDPOINT, async () => ({ ok: false, status: 400, text: async () => '{"message":"AudioSilentError"}' })]])
    await assert.rejects(
      new VoiceCloner({ getSettings: () => settings, fetchImpl: impl }).clone({ bytes: Buffer.from('x'), filename: 'a.wav' }),
      /音频不符合复刻要求/,
    )
  })

  it('连接不上时提示连不上，而不是抛 ERR_xxx', async () => {
    const impl = async () => { throw new Error('ECONNREFUSED') }
    await assert.rejects(
      new VoiceCloner({ getSettings: () => settings, fetchImpl: impl }).upload({ bytes: Buffer.from('x'), filename: 'a.wav' }),
      /无法连接百炼服务/,
    )
  })

  it('云端音色列表能被读出来', async () => {
    const { impl } = fakeFetch(happyHandlers())
    const voices = await new VoiceCloner({ getSettings: () => settings, fetchImpl: impl }).listVoices()
    assert.equal(voices.length, 1)
    assert.equal(voices[0].voiceId, 'cosyvoice-v2-cloud1')
    assert.equal(voices[0].phase, 'ready')
  })

  it('百炼没给 file_id 时报错，而不是拿着 undefined 继续走', async () => {
    const { impl } = fakeFetch([[FILES_ENDPOINT, async () => jsonResponse({ data: { uploaded_files: [] } })]])
    await assert.rejects(
      new VoiceCloner({ getSettings: () => settings, fetchImpl: impl }).upload({ bytes: Buffer.from('x'), filename: 'a.wav' }),
      /没有返回 file_id/,
    )
  })
})
