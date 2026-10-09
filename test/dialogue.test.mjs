/**
 * 角色扮演（v3.0）的单测：切分、音色分配、多段合成与多段流式。
 *
 * 这一组用例盯的是**顺序**。旁白和台词用不同音色分别合成，最后必须按原文顺序
 * 拼回去——顺序错了内容就是错的，而且这种错在音频里很难被发现（听起来依然是一
 * 段流畅的人声）。所以下面几乎每个用例都在断言"先旁白、后台词"。
 *
 * 运行：`node --test test/`
 * @module dsh-cosyvoice/test/dialogue
 */

import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, it } from 'node:test'

import {
  KIND_DIALOGUE,
  KIND_NARRATION,
  MAX_PARTS,
  dialogueParts,
  hasDialogue,
  mergeParts,
  splitDialogue,
  summarizeParts,
} from '../host/dialogue.js'
import { SpeechClient } from '../host/speech.js'
import { AudioStore, cacheKeyOfParts } from '../host/store.js'
import { VoiceProfiles } from '../host/profiles.js'
import { VoiceSynthesizer } from '../host/synth.js'

/** 一次非流式合成响应的形状：内层带 base64 音频。 */
function okResponse(audioBase64, characters = 5) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      output: { audio: { data: audioBase64 } },
      usage: { characters },
    }),
  }
}

/**
 * 一条 SSE 流响应。
 * @param events - 事件序列。
 * @returns 假响应。
 */
function sseResponse(events) {
  const body = events
    .map(event => `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`)
    .join('')
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

/** 一段能认出归属的 PCM：旁白全 0xAA，台词全 0xBB。 */
function pcmOf(marker, samples = 8) {
  return Buffer.alloc(samples, marker === 'dialogue' ? 0xBB : 0xAA).toString('base64')
}

describe('splitDialogue', () => {
  it('按「」切开，顺序与原文一致', () => {
    const parts = splitDialogue('他抬起头。「你来了。」他说完就走了。')
    assert.deepEqual(parts.map(part => part.kind), [KIND_NARRATION, KIND_DIALOGUE, KIND_NARRATION])
    assert.deepEqual(parts.map(part => part.text), ['他抬起头。', '你来了。', '他说完就走了。'])
  })

  it('多组台词交替出现时也保持原文顺序', () => {
    const parts = splitDialogue('甲说。「一」乙说。「二」结束。')
    assert.deepEqual(parts.map(part => part.kind), [
      KIND_NARRATION, KIND_DIALOGUE, KIND_NARRATION, KIND_DIALOGUE, KIND_NARRATION,
    ])
  })

  it('整段没有台词时就是一段旁白', () => {
    const parts = splitDialogue('这是一段没有任何台词的旁白。')
    assert.equal(parts.length, 1)
    assert.equal(parts[0].kind, KIND_NARRATION)
    assert.equal(hasDialogue(parts), false)
  })

  it('只有开头就是台词时，旁白段不出现', () => {
    const parts = splitDialogue('「先声夺人。」然后才是旁白。')
    assert.deepEqual(parts.map(part => part.kind), [KIND_DIALOGUE, KIND_NARRATION])
  })

  it('没闭合的「不当台词，避免把后面的旁白吞进去', () => {
    // 输出被截断时很常见。宁可漏一段台词，也不能让旁白用角色的声音念出来。
    const parts = splitDialogue('他说：「你来了')
    assert.equal(hasDialogue(parts), false)
    assert.equal(parts.length, 1)
    assert.equal(parts[0].text, '他说：你来了')
  })

  it('空的「」被丢掉，不会被念成"引号"', () => {
    const parts = splitDialogue('前面「」后面')
    assert.equal(parts.length, 1)
    assert.equal(parts[0].text, '前面后面')
  })

  it('台词两侧的空白被压掉', () => {
    const parts = splitDialogue('旁白。「 你好 」')
    assert.equal(parts[1].text, '你好')
  })
})

describe('mergeParts', () => {
  it('合并相邻的同类型段', () => {
    const merged = mergeParts([
      { kind: KIND_NARRATION, text: '一' },
      { kind: KIND_NARRATION, text: '二' },
      { kind: KIND_DIALOGUE, text: '三' },
    ])
    assert.deepEqual(merged, [
      { kind: KIND_NARRATION, text: '一二' },
      { kind: KIND_DIALOGUE, text: '三' },
    ])
  })

  it('交替的段不会被合并', () => {
    const merged = mergeParts([
      { kind: KIND_NARRATION, text: '一' },
      { kind: KIND_DIALOGUE, text: '二' },
      { kind: KIND_NARRATION, text: '三' },
    ])
    assert.equal(merged.length, 3)
  })

  it('段数超过上限时压到上限', () => {
    const many = []
    for (let i = 0; i < MAX_PARTS + 8; i += 1) {
      many.push({ kind: i % 2 === 0 ? KIND_NARRATION : KIND_DIALOGUE, text: String(i) })
    }
    const merged = mergeParts(many)
    assert.equal(merged.length, MAX_PARTS)
  })

  it('dialogueParts 端到端：切分 + 合并', () => {
    const parts = dialogueParts('旁白一。「台词一」旁白二。「台词二」')
    assert.deepEqual(parts.map(part => part.kind), [
      KIND_NARRATION, KIND_DIALOGUE, KIND_NARRATION, KIND_DIALOGUE,
    ])
  })
})

describe('summarizeParts', () => {
  it('分别统计旁白段、台词段与字数', () => {
    const summary = summarizeParts(dialogueParts('旁白。「台词。」收尾。'))
    assert.deepEqual(summary, { narration: 2, dialogue: 1, characters: 9 })
  })
})

describe('cacheKeyOfParts', () => {
  it('换任意一个音色就换键', () => {
    const base = [{ kind: KIND_NARRATION, model: 'm', voiceId: 'a', text: '旁白' }]
    const changed = [{ kind: KIND_NARRATION, model: 'm', voiceId: 'b', text: '旁白' }]
    assert.notEqual(cacheKeyOfParts(base), cacheKeyOfParts(changed))
  })

  it('同样的段序列得到同样的键', () => {
    const parts = [
      { kind: KIND_NARRATION, model: 'm', voiceId: 'a', text: '旁白' },
      { kind: KIND_DIALOGUE, model: 'm', voiceId: 'b', text: '台词' },
    ]
    assert.equal(cacheKeyOfParts(parts), cacheKeyOfParts([...parts]))
  })
})

describe('角色扮演的段与音色分配', () => {
  let dir
  let store
  let synth
  let calls
  let profilesPath
  let profiles
  const settings = {
    apiKey: 'sk-test',
    voiceId: 'voice-base',
    model: 'cosyvoice-v3.5-plus',
    roleplay: true,
    // 绑定的是**音色档案 id**，不再是音色 ID：音色 ID 单独一个字段不足以确定一套音色
    // （模型不同则请求不同，MiMo 复刻音色压根没有 ID），档案才是完整的一单位。
    narrationProfileId: 'p_narration',
    characterProfileId: 'p_character',
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cosyvoice-role-'))
    settings.outputDir = dir
    calls = []
    store = new AudioStore(() => dir)
    profilesPath = join(dir, 'profiles.json')
    profiles = new VoiceProfiles(() => profilesPath)
    profiles.put({ id: 'p_narration', name: '旁白', voiceId: 'voice-narration', model: 'cosyvoice-v3.5-plus' })
    profiles.put({ id: 'p_character', name: '角色', voiceId: 'voice-character', model: 'cosyvoice-v3.5-plus' })
    synth = new VoiceSynthesizer({
      speech: new SpeechClient({
        getSettings: () => settings,
        fetchImpl: async (url, init) => {
          const body = JSON.parse(init.body)
          calls.push({ voice: body.input.voice, text: body.input.text, format: body.input.format })
          return okResponse(pcmOf(body.input.voice === 'voice-character' ? 'dialogue' : 'narration'))
        },
      }),
      store,
      getSettings: () => settings,
      profiles,
    })
  })

  const SCRIPT = '他抬起头。「你来了。」他笑了笑。'

  it('旁白与台词各自拿到绑定的音色', () => {
    const plan = synth.plan(SCRIPT, { roleplay: true })
    assert.equal(plan.multi, true)
    assert.deepEqual(plan.parts.map(part => part.voiceId), [
      'voice-narration', 'voice-character', 'voice-narration',
    ])
  })

  it('每段连模型一起带出去（音色即模型）', () => {
    // 这是本次的核心不变量：绑定音色档案之后，模型不必再单独问一遍，
    // 它是档案的一部分 —— 否则"选了这个音色却用那个模型合成"就会发生。
    profiles.put({ id: 'p_character', model: 'cosyvoice-v3.5-flash' })
    const plan = synth.plan(SCRIPT, { roleplay: true })
    assert.deepEqual(plan.parts.map(part => part.model), [
      'cosyvoice-v3.5-plus', 'cosyvoice-v3.5-flash', 'cosyvoice-v3.5-plus',
    ])
  })

  it('请求里的音色覆盖配置', () => {
    profiles.put({ id: 'p_req_narration', name: '临时旁白', voiceId: 'req-narration', model: 'cosyvoice-v3.5-plus' })
    profiles.put({ id: 'p_req_character', name: '临时角色', voiceId: 'req-character', model: 'cosyvoice-v3.5-plus' })
    const plan = synth.plan(SCRIPT, {
      roleplay: true,
      narrationProfileId: 'p_req_narration',
      characterProfileId: 'p_req_character',
    })
    assert.deepEqual(plan.parts.map(part => part.voiceId), [
      'req-narration', 'req-character', 'req-narration',
    ])
  })

  it('绑定的档案已被删除时回落到当前音色，而不是报错', () => {
    profiles.remove('p_character')
    const plan = synth.plan(SCRIPT, { roleplay: true, characterProfileId: 'p_character' })
    // 回落到**当前激活的档案**（本组用例里第一套档案自动成为当前音色），
    // 而不是报错 —— 绑定是在设置页里选的，而档案随时可能被删掉。
    assert.equal(plan.parts[1].voiceId, 'voice-narration')
  })

  it('没绑定音色时跟随当前音色', () => {
    const bare = { ...settings, narrationProfileId: '', characterProfileId: '' }
    const local = new VoiceSynthesizer({
      speech: new SpeechClient({ getSettings: () => bare, fetchImpl: async () => okResponse(pcmOf('narration')) }),
      store,
      getSettings: () => bare,
    })
    const plan = local.plan(SCRIPT, { roleplay: true })
    assert.deepEqual(plan.parts.map(part => part.voiceId), [
      'voice-base', 'voice-base', 'voice-base',
    ])
  })

  it('没有台词时不分段，用旁白音色一次念完', () => {
    const plan = synth.plan('整段都是旁白，一句台词也没有。', { roleplay: true })
    assert.equal(plan.multi, false)
    assert.equal(plan.parts.length, 1)
    assert.equal(plan.parts[0].voiceId, 'voice-narration')
  })

  it('关闭角色扮演时整段用当前音色', () => {
    const plan = synth.plan(SCRIPT, { roleplay: false })
    assert.equal(plan.multi, false)
    // 当前音色 = 激活的档案（本组用例里第一套自动成为激活项），它连模型一起带出来。
    assert.equal(plan.parts[0].voiceId, 'voice-narration')
    assert.equal(plan.parts[0].model, 'cosyvoice-v3.5-plus')
    assert.equal(plan.parts[0].text, SCRIPT)
  })

  it('多段合成按原文顺序发出请求，且要的是 PCM', async () => {
    await synth.synthesize(SCRIPT, { roleplay: true })
    assert.deepEqual(calls.map(call => call.text), ['他抬起头。', '你来了。', '他笑了笑。'])
    assert.deepEqual(calls.map(call => call.voice), ['voice-narration', 'voice-character', 'voice-narration'])
    for (const call of calls) assert.equal(call.format, 'pcm')
  })

  it('拼出来的音频顺序与文字一致', async () => {
    const clip = await synth.synthesize(SCRIPT, { roleplay: true })
    const bytes = readFileSync(clip.path)
    // 44 字节 WAV 头之后，应当正好是"旁白 + 台词 + 旁白"的 PCM。
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF')
    assert.deepEqual(
      bytes.subarray(44).toString('hex'),
      Buffer.concat([
        Buffer.alloc(8, 0xAA),
        Buffer.alloc(8, 0xBB),
        Buffer.alloc(8, 0xAA),
      ]).toString('hex'),
    )
  })

  it('多段也有缓存：第二次零请求', async () => {
    const first = await synth.synthesize(SCRIPT, { roleplay: true })
    const second = await synth.synthesize(SCRIPT, { roleplay: true })
    assert.equal(first.cached, false)
    assert.equal(second.cached, true)
    assert.equal(calls.length, 3)
  })

  it('换了角色音色不会命中旧缓存', async () => {
    await synth.synthesize(SCRIPT, { roleplay: true })
    profiles.put({ id: 'p_another', name: '另一个角色', voiceId: 'another', model: 'cosyvoice-v3.5-plus' })
    const second = await synth.synthesize(SCRIPT, { roleplay: true, characterProfileId: 'p_another' })
    assert.equal(second.cached, false)
    assert.equal(calls.length, 6)
  })
})

describe('角色扮演的流式合成', () => {
  let dir
  let store
  let synth
  let calls
  let profilesPath
  let profiles
  const settings = {
    apiKey: 'sk-test',
    voiceId: 'voice-base',
    model: 'cosyvoice-v3.5-plus',
    narrationProfileId: 'p_narration',
    characterProfileId: 'p_character',
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cosyvoice-role-stream-'))
    settings.outputDir = dir
    calls = []
    store = new AudioStore(() => dir)
    profilesPath = join(dir, 'profiles.json')
    profiles = new VoiceProfiles(() => profilesPath)
    profiles.put({ id: 'p_narration', name: '旁白', voiceId: 'voice-narration', model: 'cosyvoice-v3.5-plus' })
    profiles.put({ id: 'p_character', name: '角色', voiceId: 'voice-character', model: 'cosyvoice-v3.5-plus' })
    synth = new VoiceSynthesizer({
      speech: new SpeechClient({
        getSettings: () => settings,
        fetchImpl: async (url, init) => {
          const body = JSON.parse(init.body)
          const isCharacter = body.input.voice === 'voice-character'
          calls.push({ voice: body.input.voice, text: body.input.text })
          return sseResponse([
            {
              event: 'sentence-synthesis',
              data: { output: { audio: { data: pcmOf(isCharacter ? 'dialogue' : 'narration') } } },
            },
            { event: 'sentence-end', data: { output: {} } },
            { event: 'finished', data: { output: {}, usage: { characters: 3 } } },
          ])
        },
      }),
      store,
      getSettings: () => settings,
      profiles,
    })
  })

  const SCRIPT = '他抬起头。「你来了。」他笑了笑。'

  it('所有段一起发起：第一段还没读完，三条请求都已经出去了', async () => {
    const iterator = synth.stream(SCRIPT, { roleplay: true })
    await iterator.next()
    // 串行实现在这里只会有 1 条；一起发起是"段与段之间没有额外等待"的前提。
    assert.equal(calls.length, 3)
  })

  it('音频块按原文顺序交付，不是按到达顺序', async () => {
    const seen = []
    for await (const frame of synth.stream(SCRIPT, { roleplay: true })) {
      if (frame.kind === 'audio') seen.push(frame.bytes[0])
    }
    assert.deepEqual(seen, [0xAA, 0xBB, 0xAA])
  })

  it('请求顺序就是朗读顺序', async () => {
    for await (const frame of synth.stream(SCRIPT, { roleplay: true })) { void frame }
    assert.deepEqual(calls.map(call => call.text), ['他抬起头。', '你来了。', '他笑了笑。'])
    assert.deepEqual(calls.map(call => call.voice), ['voice-narration', 'voice-character', 'voice-narration'])
  })

  it('流式结束后落一份完整的 WAV 供下次命中', async () => {
    let clip
    for await (const frame of synth.stream(SCRIPT, { roleplay: true })) {
      if (frame.kind === 'ready') clip = frame.clip
    }
    assert.ok(clip !== undefined)
    const bytes = readFileSync(clip.path)
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF')
    assert.equal(bytes.length, 44 + 24)
  })

  it('某一段失败时整个流报错，且不留半个产物', async () => {
    const failing = new VoiceSynthesizer({
      speech: new SpeechClient({
        getSettings: () => settings,
        fetchImpl: async (url, init) => {
          const body = JSON.parse(init.body)
          if (body.input.voice === 'voice-character') {
            return sseResponse([
              { event: 'failed', data: { output: { error_message: '音色不可用' } } },
            ])
          }
          return sseResponse([
            { event: 'sentence-synthesis', data: { output: { audio: { data: pcmOf('narration') } } } },
            { event: 'finished', data: { output: {} } },
          ])
        },
      }),
      store,
      getSettings: () => settings,
      profiles,
    })
    await assert.rejects(async () => {
      for await (const frame of failing.stream(SCRIPT, { roleplay: true })) { void frame }
    }, /音色不可用/)
    assert.equal(store.count(), 0)
  })
})
