/**
 * 宿主端 0.1.5 兼容：设置命名空间的登记。
 *
 * 两版宿主在这里的分工不同 —— 0.2.1 由宿主从 `export const Config` 自己推导，
 * 0.1.5 必须插件显式登记（否则设置页里没有这一节，而 `Config` 只负责校验）。判别
 * 依据是 `settings` 服务在不在，所以这里的用例覆盖了三种情形：服务在、不在、
 * 以及登记本身抛错。
 *
 * 运行：`node --test test/`
 * @module dsh-cosyvoice/test
 */

import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'

import { stageHome } from './harness-home.mjs'

// `host/index.js` 在模块顶层就要从真实的 DSH 安装处解析 schemastery（理由见
// harness.js），所以必须先布置好 harness home，再把模块动态载进来 —— 静态 import
// 会在这一步之前就执行。
let mod
before(async () => {
  process.env.DSH_HOME = stageHome()
  mod = await import('../host/index.js')
})

const apply = (...args) => mod.apply(...args)

/**
 * 一个够用的假 ctx。
 *
 * 只需要 `apply` 真正会碰的那几样：`webServer`（路由挂上去就完事）、`effect`、
 * `inject`、`logger`。刻意不去 mock storage / speech / clone —— 它们在这条路径上
 * 什么都不做。
 * @param options - `withSettings` 决定 `settings` 服务是否存在；`registerImpl`
 *   是 `settings.register` 的实现。
 * @returns ctx 与收集到的观察结果。
 */
function fakeContext({ withSettings = true, registerImpl } = {}) {
  const seen = { routes: [], registrations: [], effects: [], warns: [] }
  const settings = { register: registerImpl ?? (() => () => {}) }
  const ctx = {
    logger: { warn: message => seen.warns.push(message) },
    effect(fn, label) {
      seen.effects.push(label)
      const dispose = fn()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    inject(deps, callback) {
      // 与 cordis 的语义一致：只有被依赖的服务真的在位时才回调。
      if (!withSettings) return
      if (!deps.includes('settings')) return
      callback({ settings })
    },
    webServer: {
      register(route) {
        seen.routes.push(route)
        return () => {}
      },
    },
  }
  return { ctx, seen, settings }
}

describe('0.1.5 的设置面登记', () => {
  it('服务在位时登记 cosyvoice 命名空间', () => {
    const calls = []
    const { ctx, seen } = fakeContext({
      registerImpl: (namespace, schema) => {
        calls.push({ namespace, schema })
        return () => {}
      },
    })

    apply(ctx, {})

    assert.equal(calls.length, 1)
    assert.equal(calls[0].namespace, 'cosyvoice')
    assert.equal(calls[0].schema, mod.Config, '交给宿主的就是 Config 本身')
    assert.ok(seen.effects.some(label => String(label).includes('settings namespace')))
  })

  it('服务不存在时不登记、也不报错（0.2.1 就是这个情形）', () => {
    const { ctx, seen } = fakeContext({ withSettings: false })

    let thrown = undefined
    try {
      apply(ctx, {})
    } catch (error) {
      thrown = error
    }

    assert.equal(thrown, undefined)
    assert.ok(seen.effects.every(label => !String(label).includes('settings namespace')))
    // 不能断言"零警告"——apply 末尾那条挂载日志走的就是 logger.warn。
    assert.ok(
      seen.warns.every(message => !String(message).includes('无法登记设置命名空间')),
      `不该报登记失败：${JSON.stringify(seen.warns)}`,
    )
  })

  it('登记抛错时不拖垮路由挂载', () => {
    const { ctx, seen } = fakeContext({
      registerImpl: () => { throw new Error('namespace taken') },
    })

    let thrown = undefined
    try {
      apply(ctx, {})
    } catch (error) {
      thrown = error
    }

    assert.equal(thrown, undefined, '登记的失败不该让 apply 失败')
    assert.ok(seen.routes.length > 0, '路由照旧挂上')
    assert.ok(seen.warns.some(message => String(message).includes('无法登记设置命名空间')))
  })

  it('插件名仍是 dsh-cosyvoice（两版共用同一个包名）', () => {
    assert.equal(mod.name, 'dsh-cosyvoice')
  })
})
