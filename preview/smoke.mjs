/**
 * 预览页冒烟：真的打开浏览器点一遍。
 * 断言的是行为（状态机、排期、侧边栏开合），不是像素。
 *
 * 依赖 playwright（此处写死的是沙箱里的全局安装路径，换机器请改成自己的）：
 *   npm i -D playwright && npx playwright install chromium
 *   node preview/smoke.mjs
 */
import { chromium } from '/root/.nvm/versions/node/v22.13.1/lib/node_modules/playwright/index.mjs'

const URL = 'file:///workspace/dsh-cosyvoice/preview/ui-preview.html'
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

/* 2. 音色档案 */
const voiceCount0 = await page.locator('.voice').count()
ok('预置音色 3 条', voiceCount0 === 3, `实际 ${voiceCount0}`)

/* 3. 非实时播一条长回答 */
await page.locator('.act[data-role="speak"]').nth(3).click()
await page.waitForFunction(() => document.getElementById('s-first').textContent !== '—', null, { timeout: 8000 })
const oneShot = {
  mode: await page.textContent('#s-mode'),
  first: await page.textContent('#s-first'),
  dur: await page.textContent('#s-dur'),
  chunks: await page.textContent('#s-chunks'),
}
ok('非实时：模式正确', oneShot.mode === '非实时（整段）', oneShot.mode)
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

/* 7. 克隆演示 */
await page.locator('#btn-clone-demo').click()
await page.waitForFunction(() => document.querySelectorAll('.voice').length === 4, null, { timeout: 8000 })
ok('克隆后音色列表 +1', (await page.locator('.voice').count()) === 4)
ok('克隆音色被选中', (await page.locator('.voice').nth(3).getAttribute('aria-pressed')) === 'true')
ok('克隆状态显示就绪', (await page.textContent('#clone-text')).startsWith('就绪：'))
ok('克隆后角色下拉也多一项', (await page.locator('#rp-narration option').count()) === 5,
   String(await page.locator('#rp-narration option').count()))

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
ok('旁白下拉 = 跟随 + 3 条档案',
   (await page.locator('#rp-narration option').count()) === 4,
   String(await page.locator('#rp-narration option').count()))

await page.locator('#rp-on').click()
ok('开启键高亮', (await page.getAttribute('#rp-on', 'aria-pressed')) === 'true')
ok('关闭键取消高亮', (await page.getAttribute('#rp-off', 'aria-pressed')) === 'false')
ok('开启后播放键说明带「分角色」',
   (await page.locator('.hint').first().textContent()).includes('分角色'),
   await page.locator('.hint').first().textContent())

await page.locator('#rp-narration').selectOption('longxiaochun')
await page.locator('#rp-character').selectOption('longlaotie')
const stored = await page.evaluate(() => ({
  nar: localStorage.getItem('dsh-cosyvoice.narrationVoice'),
  char: localStorage.getItem('dsh-cosyvoice.characterVoice'),
}))
ok('旁白绑定已落盘', stored.nar === 'longxiaochun', String(stored.nar))
ok('角色绑定已落盘', stored.char === 'longlaotie', String(stored.char))

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
  chunks: await page.textContent('#s-chunks'),
  dur: await page.textContent('#s-dur'),
}
ok('角色扮演：模式正确', rpStat.mode === '非实时（整段）', rpStat.mode)
ok('角色扮演：音色行列出两个音色', /^旁白：\S.* \/ 台词：\S.*$/.test(rpStat.voice), rpStat.voice)
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

/* 刷新后开关与绑定都还在 */
await stopAllButtons()
await page.locator('#rp-on').click()
await page.reload({ waitUntil: 'load' })
ok('刷新后记住角色扮演开启', (await page.getAttribute('#rp-on', 'aria-pressed')) === 'true')
ok('刷新后记住角色音色绑定',
   (await page.locator('#rp-character').inputValue()) === 'longlaotie',
   await page.locator('#rp-character').inputValue())

await page.screenshot({ path: '/tmp/preview-dark.png', full_page: false })
await page.locator('#btn-theme').click()
await page.screenshot({ path: '/tmp/preview-light.png', full_page: false })

ok('无运行时报错', errors.length === 0, errors.slice(0, 3).join(' | '))

await browser.close()
console.log(failed === 0 ? '\n全部通过' : `\n失败 ${failed} 项`)
process.exit(failed === 0 ? 0 : 1)
