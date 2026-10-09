/**
 * 预览页冒烟：真的打开浏览器点一遍。
 * 断言的是行为（状态机、排期、侧边栏开合），不是像素。
 *
 * 依赖 playwright（此处写死的是沙箱里的全局安装路径，换机器请改成自己的）：
 *   npm i -D playwright && npx playwright install chromium
 *   node preview/smoke.mjs
 */
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * 预览页路径：从本文件出发，而不是写死一份。
 *
 * 之前这里写的是 `/workspace/dsh-cosyvoice/...`，而仓库目录其实叫
 * `dsh-cosyvoice-015` —— 于是换目录或换机器后冒烟直接报"页面打不开"，
 * 看起来像预览页坏了，其实是路径写错了。
 */
const PAGE = resolve(dirname(fileURLToPath(import.meta.url)), 'ui-preview.html')
const URL = pathToFileURL(PAGE).href
if (!existsSync(PAGE)) {
  console.error(`找不到预览页：${PAGE}`)
  process.exit(1)
}

/** playwright 的安装位置：先找项目里的，再退到全局（写死版本号换机器就会断）。 */
async function loadPlaywright() {
  for (const spec of ['playwright', '/root/.nvm/versions/node/v22.13.1/lib/node_modules/playwright/index.mjs']) {
    try {
      return await import(spec)
    } catch {}
  }
  console.error('找不到 playwright。请 `npm i -D playwright && npx playwright install chromium`。')
  process.exit(1)
}

const { chromium } = await loadPlaywright()

let failed = 0
function ok(name, cond, extra = '') {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${name}${extra ? ' — ' + extra : ''}`)
  if (!cond) failed += 1
}

const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto(URL, { waitUntil: 'load' })

/* 1. 基本渲染 */
ok('渲染出 6 条消息', (await page.locator('.row').count()) === 6,
   String(await page.locator('.row').count()))
ok('每条 AI 回答一个朗读键', (await page.locator('.act[data-role="speak"]').count()) === 5,
   String(await page.locator('.act[data-role="speak"]').count()))
ok('侧边栏默认展开', (await page.getAttribute('#sidebar', 'data-open')) === '1')

/** 把还在响的都停掉，免得上一条的余音影响下一条的排期断言。 */
async function stopAllButtons() {
  await page.waitForFunction(
    () => !document.querySelector('.act[data-role="speak"][data-busy]'),
    null, { timeout: 15000 })
  const n = await page.locator('.act[data-role="speak"]').count()
  for (let i = 0; i < n; i++) {
    const el = page.locator('.act[data-role="speak"]').nth(i)
    if (await el.evaluate(e => !!e.dataset.on)) await el.click()
    await page.waitForTimeout(60)
  }
}

/** @returns 排期里最大的缝（s）。 */
function worstSeam(list) {
  let worst = 0
  for (let i = 1; i < list.length; i++) {
    const seam = Math.abs(list[i].start - (list[i - 1].start + list[i - 1].dur))
    if (seam > worst) worst = seam
  }
  return worst
}

/* 2. v4.0：音色档案 = 音色 + 模型，模型名附在名称末尾 */
const voiceCount0 = await page.locator('.voice').count()
ok('预置音色 3 条', voiceCount0 === 3, `实际 ${voiceCount0}`)
ok('档案名带模型后缀',
   (await page.locator('.voice').first().locator('.a').textContent()) === '龙小淳（女·温柔）'
   && (await page.locator('.voice').first().locator('.b').textContent()).endsWith('cosyvoice-v3.5-plus'),
   await page.locator('.voice').first().locator('.b').textContent())
ok('每条档案带引擎徽章', (await page.locator('.voice .tag-engine').count()) === 3)

/* 2b. 音色即模型：不同档案走不同模型，且设置页里没有全局模型选项 */
const modelsShown = await page.locator('#now-model').textContent()
ok('「使用模型」跟着当前档案', modelsShown === 'cosyvoice-v3.5-plus', String(modelsShown))
ok('引擎徽章标出百炼', (await page.getAttribute('#now-engine', 'data-e')) === 'dashscope')
// v4.0 取消了设置页的全局模型输入框：能选模型的地方只有"新增/克隆音色"里那两个下拉。
const modelSelects = await page.locator('select').evaluateAll(
  els => els.map(e => e.id).filter(id => id === 'model' || id === 'settings-model'))
ok('没有全局模型选择', modelSelects.length === 0, JSON.stringify(modelSelects))
ok('两把 API Key 都用 password 类型',
   (await page.getAttribute('#key-bailian', 'type')) === 'password'
   && (await page.getAttribute('#key-mimo', 'type')) === 'password')

/* 2c. 模型下拉是列表，不是自由文本 */
const addOptions = await page.locator('#add-model option').evaluateAll(
  els => els.map(e => e.value))
ok('新增音色的模型是下拉列表', await page.locator('#add-model').count() === 1
   && addOptions.length === 9 && addOptions.includes('mimo-v2.5-tts')
   && addOptions.includes('mimo-v2.5-tts-voiceclone')
   && addOptions.includes('mimo-v2.5-tts-voicedesign'),
   `${addOptions.length} 项`)
const cloneOptions = await page.locator('#clone-model option').evaluateAll(
  els => els.map(e => e.value))
// 「复刻类」= 6 款百炼复刻 + 1 款 MiMo 复刻；预置与设计类不列，因为它们不是"复刻"。
ok('克隆只列复刻类模型', cloneOptions.length === 7
   && cloneOptions.includes('mimo-v2.5-tts-voiceclone')
   && !cloneOptions.includes('mimo-v2.5-tts')
   && !cloneOptions.includes('mimo-v2.5-tts-voicedesign'),
   JSON.stringify(cloneOptions))

/* 2d. 表单跟着模型换输入 */
await page.locator('#add-model').selectOption('mimo-v2.5-tts')
ok('选内置音色模型 → 出现内置音色下拉',
   (await page.locator('#add-builtin-voice').count()) === 1)
await page.locator('#add-model').selectOption('mimo-v2.5-tts-voicedesign')
ok('选音色设计模型 → 变成描述输入框',
   (await page.locator('#add-voice').count()) === 1
   && (await page.getAttribute('#add-voice', 'placeholder')).includes('一句描述'))
await page.locator('#add-model').selectOption('mimo-v2.5-tts-voiceclone')
ok('选 MiMo 复刻模型 → 不给输入框，只指路去上传',
   (await page.locator('#add-voice').count()) === 0
   && (await page.textContent('#add-voice-field')).includes('音色克隆'))
await page.locator('#add-model').selectOption('cosyvoice-v3.5-plus')
ok('选百炼复刻模型 → 回到音色 ID 输入',
   (await page.locator('#add-voice').count()) === 1
   && (await page.getAttribute('#add-voice', 'placeholder')).includes('ID'))

/* 2e. 新增一套音色（走 MiMo 内置音色这条路） */
await page.locator('#add-model').selectOption('mimo-v2.5-tts')
await page.locator('#add-name').fill('预览内置女声')
await page.locator('#add-builtin-voice').selectOption('茉莉')
await page.locator('#btn-add').click()
ok('新增后档案 +1', (await page.locator('.voice').count()) === 4)
ok('新档案用上了所选模型',
   (await page.locator('#now-model').textContent()) === 'mimo-v2.5-tts',
   String(await page.locator('#now-model').textContent()))
ok('新档案引擎徽章是 MiMo', (await page.getAttribute('#now-engine', 'data-e')) === 'mimo')
ok('非实时时不给「非低延迟」提示', (await page.locator('#now-latency-row').isVisible()) === false)

/* 3. 非实时播一条长回答 */
await page.locator('.act[data-role="speak"]').nth(3).click()
await page.waitForFunction(() => document.getElementById('s-first').textContent !== '—', null, { timeout: 8000 })
const oneShot = {
  mode: await page.textContent('#s-mode'),
  model: await page.textContent('#s-model'),
  first: await page.textContent('#s-first'),
  dur: await page.textContent('#s-dur'),
  chunks: await page.textContent('#s-chunks'),
}
ok('非实时：模式正确', oneShot.mode === '非实时（整段）', oneShot.mode)
ok('非实时：报出这次用的模型', oneShot.model === 'mimo-v2.5-tts', oneShot.model)
ok('非实时：有音频时长', /^\d+\.\d{2} s$/.test(oneShot.dur), oneShot.dur)
const oneFirst = parseInt(oneShot.first, 10)
ok('非实时：首包延迟 > 400ms', oneFirst > 400, oneShot.first)
console.log(`       非实时 首包 ${oneShot.first} / 时长 ${oneShot.dur} / 分块 ${oneShot.chunks}`)

/* 播放中应显示停止图标 */
const stopVisible = await page.locator('.act[data-role="speak"]').nth(3).evaluate(el => !!el.dataset.on)
ok('播放中按钮转为停止态', stopVisible)

/* 4. 切到实时再播同一条 */
await page.locator('#m-stream').click()
ok('实时按钮高亮', (await page.getAttribute('#m-stream', 'aria-pressed')) === 'true')
ok('非实时按钮取消高亮', (await page.getAttribute('#m-one', 'aria-pressed')) === 'false')
ok('「当前生效」跟着变', (await page.textContent('#m-now')) === '实时（流式）')

await page.locator('.act[data-role="speak"]').nth(3).click() // 停止
await page.locator('.act[data-role="speak"]').nth(3).click() // 重新播
await page.waitForFunction(
  () => document.getElementById('s-mode').textContent === '实时（流式）', null, { timeout: 8000 })
const stream = {
  mode: await page.textContent('#s-mode'),
  first: await page.textContent('#s-first'),
  dur: await page.textContent('#s-dur'),
  chunks: await page.textContent('#s-chunks'),
}
const streamFirst = parseInt(stream.first, 10)
ok('实时：模式正确', stream.mode === '实时（流式）')
ok('实时：首包明显更快', streamFirst < oneFirst, `${streamFirst}ms vs ${oneFirst}ms`)
ok('实时：分块数 > 1', parseInt(stream.chunks, 10) > 1, stream.chunks)

/* 4b. 排期是否真的无缝：下一块的起点 == 上一块的终点 */
const sched = await page.evaluate(() => window.__sched || [])
ok('实时：排了多块', sched.length > 1, `${sched.length} 块`)
const worst = worstSeam(sched)
ok('实时：句间无缝（缝隙 < 1µs）', worst < 1e-6, `最大缝隙 ${worst.toExponential(2)} s`)
console.log('       排期 ' + sched.map(s => s.start.toFixed(3)).join(' → '))
console.log(`       实时   首包 ${stream.first} / 时长 ${stream.dur} / 分块 ${stream.chunks}`)

/* 4c. 选了实时 + 非低延迟模型 → 那条提示必须出现（否则用户以为是自己设错了） */
await page.locator('#add-model').selectOption('mimo-v2.5-tts')
await page.locator('#add-name').fill('预览非低延迟')
await page.locator('#add-builtin-voice').selectOption('冰糖')
await page.locator('#btn-add').click()
ok('选 MiMo 内置音色（低延迟）→ 实时下不提示',
   (await page.locator('#now-latency-row').isVisible()) === false)
await page.locator('#voices .voice').last().click()
await page.locator('#clone-model').selectOption('mimo-v2.5-tts-voiceclone')
await page.locator('#btn-clone-demo').click()
await page.waitForFunction(
  () => document.getElementById('clone-text').textContent.startsWith('就绪：'), null, { timeout: 8000 })
ok('选了实时 + 非低延迟模型 → 出现提示',
   (await page.locator('#now-latency-row').isVisible()) === true)
ok('档案行挂「非低延迟」徽章',
   (await page.locator('#voices .voice').last().locator('.pill').textContent()) === '非低延迟',
   await page.locator('#voices .voice').last().locator('.pill').textContent())
// 换回一款低延迟模型，提示随之消失。
await page.locator('#voices .voice').first().click()
ok('换回低延迟模型 → 提示消失',
   (await page.locator('#now-latency-row').isVisible()) === false)

/* 5. 模拟写入失败 → 提示可见 */
await page.locator('#m-fail').check()
await page.locator('#m-stream').click()
ok('未写入配置时给出警告', (await page.textContent('#m-saved')) === '未写入配置')
ok('未写入配置时展开说明', (await page.locator('#m-note').isVisible()) === true)
await page.locator('#m-fail').uncheck()
await page.locator('#m-one').click()
ok('写回成功时提示消失', (await page.locator('#m-note').isVisible()) === false)

/* 6. 侧边栏收起 / 拉起 */
await page.locator('#btn-toggle').click()
await page.waitForTimeout(400)
ok('收起后 data-open=0', (await page.getAttribute('#sidebar', 'data-open')) === '0')
ok('收起后把手出现', (await page.getAttribute('#fab', 'data-show')) === '1')
await page.locator('#fab').click()
await page.waitForTimeout(400)
ok('把手拉起侧边栏', (await page.getAttribute('#sidebar', 'data-open')) === '1')
ok('拉起后把手隐藏', (await page.getAttribute('#fab', 'data-show')) === '0')

/* 7. 克隆演示：两条链路由所选模型决定 */
const beforeClone = await page.locator('.voice').count()
await page.locator('#clone-model').selectOption('cosyvoice-v3.5-plus')
await page.locator('#btn-clone-demo').click()
await page.waitForFunction(
  () => document.querySelector('#clone-text').textContent.startsWith('就绪：'), null, { timeout: 8000 })
ok('百炼复刻后档案 +1', (await page.locator('.voice').count()) === beforeClone + 1)
ok('复刻音色被选中',
   (await page.locator('.voice').nth(beforeClone).getAttribute('aria-pressed')) === 'true')
ok('百炼链路：状态显示就绪（部署完成）',
   (await page.textContent('#clone-text')).includes('cosyvoice-v3.5-plus-dsh-'),
   await page.textContent('#clone-text'))
ok('百炼复刻：档案里带音色 ID',
   (await page.locator('.voice').nth(beforeClone).locator('.b').textContent()).includes('cosyvoice-v3.5-plus'),
   await page.locator('.voice').nth(beforeClone).locator('.b').textContent())
// 下拉项数要跟**当下**的档案数对齐：前面几段又新增过档案，写死一个常数只会在
// 有人往冒烟里加步骤时给出与 bug 无关的失败。
const profilesNow = await page.locator('.voice').count()
ok('克隆后角色下拉也多一项',
   (await page.locator('#rp-narration option').count()) === profilesNow + 1,
   `${await page.locator('#rp-narration option').count()} 项 vs ${profilesNow} 套档案`)

/* MiMo 复刻：没有云端部署，所以状态文案要说清"音频在本机" */
await page.locator('#clone-model').selectOption('mimo-v2.5-tts-voiceclone')
const beforeMimo = await page.locator('.voice').count()
await page.locator('#btn-clone-demo').click()
await page.waitForFunction(
  () => document.querySelector('#clone-text').textContent.startsWith('就绪：'), null, { timeout: 8000 })
ok('MiMo 复刻后档案 +1', (await page.locator('.voice').count()) === beforeMimo + 1)
ok('MiMo 链路：状态说明音频在本机可复用',
   (await page.textContent('#clone-text')).includes('本机'),
   await page.textContent('#clone-text'))
ok('MiMo 复刻：档案显示本地样本文件名',
   (await page.locator('.voice').nth(beforeMimo).locator('.b').textContent()).includes('.wav'),
   await page.locator('.voice').nth(beforeMimo).locator('.b').textContent())
ok('MiMo 复刻：音色 ID 为空（音色就是那段音频）',
   !(await page.locator('.voice').nth(beforeMimo).locator('.b').textContent()).includes('dsh-'),
   await page.locator('.voice').nth(beforeMimo).locator('.b').textContent())

/* 7b. MiMo 内置音色：勾选即添加 */
ok('内置音色列出 9 条', (await page.locator('.builtin').count()) === 9,
   String(await page.locator('.builtin').count()))
ok('内置音色里含 mimo_default 与冰糖',
   (await page.textContent('#builtins')).includes('mimo_default')
   && (await page.textContent('#builtins')).includes('冰糖'))
ok('没勾选时添加按钮禁用',
   (await page.locator('#btn-add-builtin').isDisabled()) === true)
const beforeBuiltin = await page.locator('.voice').count()
await page.locator('.builtin[data-voice="白桦"] input').check()
await page.locator('.builtin[data-voice="Dean"] input').check()
ok('勾选后按钮可点且显示数量',
   (await page.locator('#btn-add-builtin').isDisabled()) === false
   && (await page.textContent('#btn-add-builtin')).includes('2'),
   await page.textContent('#btn-add-builtin'))
await page.locator('#btn-add-builtin').click()
ok('勾选的两个都加进档案', (await page.locator('.voice').count()) === beforeBuiltin + 2)
ok('已添加的内置音色标为「已添加」',
   (await page.locator('.builtin[data-voice="白桦"] .tick').count()) === 1
   && await page.locator('.builtin[data-voice="白桦"] input').isDisabled())
ok('新加的内置音色用 MiMo 预置模型',
   (await page.locator('.voice').nth(beforeBuiltin + 1).locator('.b').textContent()).includes('mimo-v2.5-tts'),
   await page.locator('.voice').nth(beforeBuiltin + 1).locator('.b').textContent())

/* 8. 主题 */
await page.locator('#btn-theme').click()
ok('切到浅色', (await page.getAttribute('html', 'data-theme')) === 'light')
await page.locator('#btn-theme').click()

/* 9. 刷新后模式被记住 */
await page.locator('#m-stream').click()
await page.reload({ waitUntil: 'load' })
ok('刷新后记住实时模式', (await page.getAttribute('#m-stream', 'aria-pressed')) === 'true')

/* ────────────────────────────────────────────────────────────────
   10. 角色扮演：开关 / 音色绑定 / 分段顺序 / 顺序拼接
   ────────────────────────────────────────────────────────────── */
const RP_TEXT = '他推开门，屋里的灯还亮着。「你终于来了，」她说，声音很轻，'
  + '「我以为你不会来了。」他在门口站了几秒，才把门带上。'
const RP_ROW = 4   // MESSAGES 里那条旁白/台词交替的回答

ok('角色扮演默认关闭', (await page.getAttribute('#rp-off', 'aria-pressed')) === 'true')
ok('关闭态：开启键不高亮', (await page.getAttribute('#rp-on', 'aria-pressed')) === 'false')
// 下拉 = 跟随 + 每条可用档案。注意 MiMo 复刻那套的样本在，是可用的。
const profileOptions = await page.locator('#rp-narration option').evaluateAll(
  els => els.map(e => e.value))
ok('旁白下拉 = 跟随 + 全部可用档案',
   profileOptions.length === (await page.locator('.voice').count()) + 1,
   `${profileOptions.length} 项 vs ${await page.locator('.voice').count()} 套档案`)
ok('下拉里第一个是「跟随当前音色」',
   (await page.locator('#rp-narration option').first().textContent()) === '跟随当前音色')
// 绑定值必须是**档案 id**（p_ 开头），不是音色 ID —— 绑音色 ID 就丢了"用哪款模型"。
ok('下拉值是档案 id 而不是音色 ID',
   profileOptions.slice(1).every(v => v.startsWith('p_'))
   && !profileOptions.includes('longxiaochun'),
   JSON.stringify(profileOptions.slice(0, 3)))

await page.locator('#rp-on').click()
ok('开启键高亮', (await page.getAttribute('#rp-on', 'aria-pressed')) === 'true')
ok('关闭键取消高亮', (await page.getAttribute('#rp-off', 'aria-pressed')) === 'false')
ok('开启后播放键说明带「分角色」',
   (await page.locator('.hint').first().textContent()).includes('分角色'),
   await page.locator('.hint').first().textContent())

await page.locator('#rp-narration').selectOption('p_longxiaochun')
await page.locator('#rp-character').selectOption('p_longlaotie')
const stored = await page.evaluate(() => ({
  nar: localStorage.getItem('dsh-cosyvoice.narrationProfile'),
  char: localStorage.getItem('dsh-cosyvoice.characterProfile'),
}))
ok('旁白绑定已落盘（存档案 id）', stored.nar === 'p_longxiaochun', String(stored.nar))
ok('角色绑定已落盘（存档案 id）', stored.char === 'p_longlaotie', String(stored.char))

/* 切分：顺序是唯一硬要求 —— kinds 的次序 + 拼回原文 */
const seq = await page.evaluate(t => splitDialogue(t).map(p => p.kind + '|' + p.text), RP_TEXT)
ok('切出 5 段', seq.length === 5, JSON.stringify(seq))
ok('旁白/台词交替', seq.map(s => s.split('|')[0]).join(',')
   === 'narration,dialogue,narration,dialogue,narration',
   seq.map(s => s.split('|')[0]).join(','))
// 「」是分隔符、不属于内容，所以拼回去应当等于「原文剥掉引号」—— 这就是顺序没乱的证据。
ok('段序拼回原文（引号是分隔符）',
   (await page.evaluate(t => splitDialogue(t).map(p => p.text).join(''), RP_TEXT))
     === RP_TEXT.replace(/[「」]/g, ''),
   await page.evaluate(t => splitDialogue(t).map(p => p.text).join(''), RP_TEXT))
ok('未闭合的「不算台词',
   JSON.stringify(await page.evaluate(() => splitDialogue('前面「没说完')
     .map(p => p.kind + '|' + p.text))) === '["narration|前面没说完"]')
ok('空的「」丢掉',
   JSON.stringify(await page.evaluate(() => splitDialogue('前「」后')
     .map(p => p.kind + '|' + p.text))) === '["narration|前后"]')

/* 非实时 + 角色扮演：多段分别合成，再按原文顺序拼成一条 */
await page.locator('#m-one').click()
await stopAllButtons()
await page.locator('.act[data-role="speak"]').nth(RP_ROW).click()
await page.waitForFunction(
  () => (document.getElementById('s-voice').textContent || '').includes('台词'),
  null, { timeout: 15000 })
const rpStat = {
  mode: await page.textContent('#s-mode'),
  voice: await page.textContent('#s-voice'),
  model: await page.textContent('#s-model'),
  chunks: await page.textContent('#s-chunks'),
  dur: await page.textContent('#s-dur'),
}
ok('角色扮演：模式正确', rpStat.mode === '非实时（整段）', rpStat.mode)
ok('角色扮演：音色行列出两个音色', /^旁白：\S.* \/ 台词：\S.*$/.test(rpStat.voice), rpStat.voice)
// 名称后面挂着模型后缀，所以这一行能直接看出两段各走哪款模型。
ok('角色扮演：音色行带模型后缀',
   rpStat.voice.includes('cosyvoice-v3.5-plus') && rpStat.voice.includes('cosyvoice-v3.5-flash'),
   rpStat.voice)
ok('角色扮演：模型行报出两款模型',
   /cosyvoice-v3\.5-plus \+ cosyvoice-v3\.5-flash/.test(rpStat.model), rpStat.model)
ok('角色扮演：旁白 3 · 台词 2', rpStat.chunks === '旁白 3 · 台词 2', rpStat.chunks)
console.log(`       角色扮演 ${rpStat.dur} / ${rpStat.chunks}`)

const sched2 = await page.evaluate(() => window.__sched || [])
ok('角色扮演：排了 5 块', sched2.length === 5, `${sched2.length} 块`)
const worst2 = worstSeam(sched2)
ok('角色扮演：段间无缝（缝隙 < 1µs）', worst2 < 1e-6, `最大缝隙 ${worst2.toExponential(2)} s`)
console.log('       排期 ' + sched2.map(s => s.start.toFixed(3)).join(' → '))

/* 关掉 → 同一条回到整段一次合成 */
await stopAllButtons()
await page.locator('#rp-off').click()
await page.evaluate(() => { document.getElementById('s-voice').textContent = '—' })
await page.locator('.act[data-role="speak"]').nth(RP_ROW).click()
await page.waitForFunction(
  () => document.getElementById('s-voice').textContent !== '—', null, { timeout: 15000 })
const plainStat = {
  voice: await page.textContent('#s-voice'),
  chunks: await page.textContent('#s-chunks'),
}
ok('关闭后：音色行回到单个音色', !plainStat.voice.includes('台词'), plainStat.voice)
ok('关闭后：段落回到数字', /^\d+$/.test(plainStat.chunks), plainStat.chunks)

/* 刷新后开关与绑定都还在（档案是运行时新建的，刷新后回到预置那三条，
   所以绑定值要指向一条刷新后仍然存在的档案） */
await stopAllButtons()
await page.locator('#rp-on').click()
await page.reload({ waitUntil: 'load' })
ok('刷新后记住角色扮演开启', (await page.getAttribute('#rp-on', 'aria-pressed')) === 'true')
ok('刷新后记住角色音色绑定（档案 id）',
   (await page.locator('#rp-character').inputValue()) === 'p_longlaotie',
   await page.locator('#rp-character').inputValue())

await page.screenshot({ path: '/tmp/preview-dark.png', full_page: false })
await page.locator('#btn-theme').click()
await page.screenshot({ path: '/tmp/preview-light.png', full_page: false })

ok('无运行时报错', errors.length === 0, errors.slice(0, 3).join(' | '))

await browser.close()
console.log(failed === 0 ? '\n全部通过' : `\n失败 ${failed} 项`)
process.exit(failed === 0 ? 0 : 1)
