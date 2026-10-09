// GENERATED FILE - do not edit by hand. Run `node build.mjs` instead.
// Sources: client/shared.js, client/locales.js, client/message-button.js, client/settings-page.js, client/index.js

window.__ModuleLoader__.load({
	id: "dsh-cosyvoice",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		var React = require("react");

		// ---- client/shared.js ----
		/**
		 * \u6d4f\u89c8\u5668\u7aef\u5404\u6a21\u5757\u5171\u7528\u7684\u7ba1\u9053\u3002
		 *
		 * \u8fd9\u4e9b\u6587\u4ef6\u7531 `build.mjs` \u62fc\u63a5\u6210\u4e00\u4e2a bundle\uff0c\u5171\u4eab\u540c\u4e00\u4e2a factory \u4f5c\u7528\u57df\uff0c\u6240\u4ee5\u8fd9\u91cc
		 * \u58f0\u660e\u7684\u51fd\u6570\u5728\u540e\u9762\u7684\u6587\u4ef6\u91cc\u53ef\u4ee5\u76f4\u63a5\u8c03\u7528\uff1b`build.mjs` \u91cc\u7684\u987a\u5e8f\u5c31\u662f\u58f0\u660e\u987a\u5e8f\u3002
		 *
		 * bundle \u662f\u4e00\u4e2a\u666e\u901a classic script\uff1a\u6ca1\u6709 TypeScript\u3001\u6ca1\u6709 JSX\u3001\u6ca1\u6709 import\uff0c
		 * \u4ece\u6a21\u5757\u8868\u91cc\u53ea\u53d6 `react`\u3002
		 */

		/** \u5bbf\u4e3b\u90a3\u4e00\u534a\u5360\u6709\u7684\u8def\u7531\u524d\u7f00\u3002 */
		var ROUTE_PREFIX = '/dsh-cosyvoice'

		/** \u8bbe\u7f6e\u547d\u540d\u7a7a\u95f4\uff1b\u5fc5\u987b\u7b49\u4e8e profile \u91cc\u7684 entry id\uff08`cordis.patch.yml` \u7684 `id`\uff09\u3002 */
		var SETTINGS_ENTRY = 'cosyvoice'

		/** \u5fc5\u987b\u7b49\u4e8e\u5305\u540d\uff1aboot-graph \u7684\u884c id \u5c31\u662f\u6ce8\u518c\u952e\u3002 */
		var PLUGIN_ID = 'dsh-cosyvoice'

		/** \u975e\u5b9e\u65f6\uff1a\u6574\u6bb5\u4e00\u6b21\u5408\u6210\u540e\u518d\u64ad\u3002 */
		var MODE_ONE_SHOT = 'one-shot'

		/** \u5b9e\u65f6\uff1aSSE \u8fb9\u5408\u6210\u8fb9\u64ad\u3002 */
		var MODE_STREAM = 'stream'

		/** \u5408\u6210\u65b9\u5f0f\u5b58\u5728\u6d4f\u89c8\u5668\u672c\u5730\u7684\u952e\uff1b\u5b83\u662f"\u70b9\u4e86\u7acb\u523b\u751f\u6548"\u7684\u90a3\u4e00\u4efd\u3002 */
		var MODE_KEY = 'dsh-cosyvoice.mode'

		/**
		 * \u53d6\u672c\u63d2\u4ef6\u7684\u914d\u7f6e\u8868\u5355\u3002
		 *
		 * \u4e24\u7248\u5bbf\u4e3b\u5728\u8fd9\u91cc\u4e0d\u662f\u540c\u4e00\u4e2a\u4e1c\u897f\uff0c\u800c**\u670d\u52a1\u7684\u6709\u65e0\u672c\u8eab\u5c31\u662f\u7248\u672c\u53f7**\uff0c\u4e0d\u5fc5\u5f15\u5165\u4efb\u4f55
		 * \u7248\u672c\u5224\u65ad\uff1a
		 *
		 * - **0.2.1**\uff1a`ctx.configForms.get(entryId)` \u2192 `ConfigForm`\uff0c
		 *   \u5199\u64cd\u4f5c resolve \u6210 `boolean`\uff08\u5bbf\u4e3b\u662f\u5426\u63a5\u53d7\uff09\uff1b
		 * - **0.1.5**\uff1a`ctx.settingsScope.bind({ namespace })` \u2192 `SettingsScope`\uff0c
		 *   \u5199\u64cd\u4f5c resolve \u6210 `void`\u3002
		 *
		 * \u5feb\u7167\u7684\u5f62\u72b6\u4e24\u7248\u662f\u9010\u5b57\u76f8\u540c\u7684\uff08`status` / `value` / `base` / `user` /
		 * `revision` / `writable` / `mode`\uff09\uff0c\u6240\u4ee5\u4e0a\u5c42\u4e0d\u5fc5\u5206\u652f \u2014\u2014 \u771f\u6b63\u9700\u8981\u5f52\u4e00\u5316\u7684\u53ea\u6709
		 * \u5199\u64cd\u4f5c\u7684**\u8fd4\u56de\u503c**\u3002\u8fd9\u4e00\u70b9\u662f\u5fc5\u987b\u7684\uff0c\u56e0\u4e3a `undefined` \u662f falsy\uff1a\u82e5\u76f4\u63a5\u628a 0.1.5
		 * \u7684 `set()` \u4ea4\u4e0a\u53bb\uff0c"\u5199\u5165\u6210\u529f"\u4f1a\u88ab\u5f53\u6210\u4e00\u4e2a\u5047\u503c\uff0c\u4e8e\u662f"\u5199\u4e86\u4e00\u770b\u6210\u529f\u4e86\u518d\u4e00\u6b21\u663e\u793a
		 * \u5931\u8d25"\u8fd9\u7c7b\u9519\u5224\u5c31\u4f1a\u91cd\u6f14 \u2014\u2014 v2.1.1 \u90a3\u6b21"\u5207\u6362\u6a21\u5f0f\u6ca1\u53cd\u5e94"\u7684\u6839\u56e0\u6b63\u662f\u8fd9\u4e00\u7c7b\u3002
		 * @param ctx - \u5ba2\u6237\u7aef\u63d2\u4ef6 context\u3002
		 * @param entryId - \u8bbe\u7f6e\u547d\u540d\u7a7a\u95f4\u3002
		 * @returns \u8868\u5355\u63a7\u5236\u5668\uff1b\u5bbf\u4e3b\u4e00\u4e2a\u90fd\u6ca1\u6709\u65f6 undefined\uff08\u6b64\u65f6\u4e0d\u8be5\u6e32\u67d3\u8bbe\u7f6e\u9875\uff09\u3002
		 */
		function configFormOf(ctx, entryId) {
		  if (!ctx) return undefined
		  try {
		    if (ctx.configForms && typeof ctx.configForms.get === 'function') {
		      return normalizeWrites(ctx.configForms.get(entryId))
		    }
		    if (ctx.settingsScope && typeof ctx.settingsScope.bind === 'function') {
		      return normalizeWrites(ctx.settingsScope.bind({ namespace: entryId }))
		    }
		  } catch (error) {
		    console.error('[dsh-cosyvoice] \u65e0\u6cd5\u53d6\u5f97\u914d\u7f6e\u8868\u5355\uff1a', error)
		  }
		  return undefined
		}

		/**
		 * \u628a\u5199\u64cd\u4f5c\u7684\u7ed3\u679c\u7edf\u4e00\u6210\u300cresolve = \u5df2\u63a5\u53d7\uff0creject = \u6ca1\u5199\u8fdb\u53bb\u300d\u3002
		 *
		 * \u4e4b\u6240\u4ee5\u7528 reject \u800c\u4e0d\u662f\u8fd4\u56de false\uff1a\u672c\u63d2\u4ef6\u7684\u8bbe\u7f6e\u9875\u7528 `promise.then(ok).catch(fail)`
		 * \u8868\u8fbe\u7ed3\u679c\uff08\u89c1 `settings-page.js` \u7684 `switchMode` / `writeVisible`\uff09\uff0c\u4e8e\u662f\u5f52\u4e00\u5316\u5230
		 * reject \u53ef\u4ee5\u8ba9 failure \u81ea\u52a8\u8d70\u5230\u5df2\u7ecf\u5b58\u5728\u7684\u90a3\u6761\u63d0\u793a\u5206\u652f\uff0c\u4e0a\u5c42\u4e00\u884c\u90fd\u4e0d\u7528\u6539\u3002
		 *
		 * 0.1.5 \u7684 `SettingsScope.set` \u6587\u6863\u5199\u660e"\u88ab\u62d2\u6216\u5931\u8d25\u7684\u5199\u5165\u4f1a\u6539\u4e3a\u91cd\u8f7d\u5bbf\u4e3b\u72b6\u6001"\u2014\u2014
		 * \u4e5f\u5c31\u662f\u5b83**\u4e0d reject\uff0c\u4e5f\u4e0d\u7ed9\u51fa\u7ed3\u8bba**\u3002\u4e8e\u662f\u90a3\u4e00\u7248\u552f\u4e00\u53ef\u9760\u7684\u5224\u636e\u662f `writable`\uff1a
		 * memory \u6a21\u5f0f\uff08\u8fdc\u7a0b/\u975e loopback \u9875\u9762\uff09\u4e0b\u6587\u6863\u6c38\u4e0d\u63a5\u53d7\u5199\u5165\u3002
		 * @param form - \u5bbf\u4e3b\u7ed9\u7684\u8868\u5355\u63a7\u5236\u5668\u3002
		 * @returns \u5199\u7ed3\u679c\u8bed\u4e49\u7edf\u4e00\u4e4b\u540e\u7684\u540c\u4e00\u4e2a\u8868\u5355\u3002
		 */
		function normalizeWrites(form) {
		  if (!form || typeof form.getSnapshot !== 'function') return undefined
		  return {
		    getSnapshot: function () { return form.getSnapshot() },
		    subscribe: function (listener) { return form.subscribe(listener) },
		    set: function (field, value) {
		      return Promise.resolve(form.set(field, value)).then(function (result) {
		        if (typeof result === 'boolean') {
		          if (result) return true
		          throw new Error('\u672a\u5199\u5165\u914d\u7f6e\uff1a\u5bbf\u4e3b\u62d2\u7edd\u4e86\u8fd9\u6b21\u5199\u5165')
		        }
		        // 0.1.5\uff1a\u5bbf\u4e3b\u4e0d\u544a\u8bc9\u7ed3\u8bba\uff0c\u53ea\u80fd\u81ea\u5df1\u770b\u8fd9\u4e00\u4efd\u6587\u6863\u53ef\u4e0d\u53ef\u5199\u3002
		        var snapshot = form.getSnapshot()
		        if (snapshot && snapshot.writable === false) {
		          throw new Error('\u672a\u5199\u5165\u914d\u7f6e\uff1a\u8fd9\u4e00\u4efd\u8bbe\u7f6e\u6587\u6863\u4e0d\u63a5\u53d7\u5199\u5165\uff08\u5bbf\u4e3b\u8fd0\u884c\u5728-memory \u6a21\u5f0f\uff09')
		        }
		        return true
		      })
		    },
		  }
		}

		/** localStorage \u4e0d\u53ef\u7528\u65f6\uff08\u65e0\u75d5\u6a21\u5f0f\u3001\u6c99\u7bb1\uff09\u515c\u5728\u8fd9\u4e00\u4efd\u91cc\uff0c\u9875\u9762\u5185\u4ecd\u7136\u80fd\u5207\u6362\u3002 */
		var modeMemory = ''

		/**
		 * \u5f53\u524d\u60f3\u8981\u7684\u5408\u6210\u65b9\u5f0f\u3002
		 *
		 * \u5b58\u5728\u672c\u5730\u800c\u4e0d\u662f\u53ea\u8bfb\u914d\u7f6e\u955c\u50cf\uff0c\u662f\u56e0\u4e3a\u5199\u914d\u7f6e\u8981\u8d70\u4e00\u8d9f\u5bbf\u4e3b\u901a\u9053\uff08\u6709\u65f6\u8fd8\u4f1a\u56e0\u4e3a schema
		 * \u6ca1\u91cd\u8f7d\u800c\u88ab\u62d2\uff09\uff0c\u800c"\u70b9\u4e86\u4e00\u4e0b\u6ca1\u53cd\u5e94"\u662f\u6700\u5dee\u7684\u4f53\u9a8c \u2014\u2014 \u8fd9\u91cc\u5148\u8ba9\u5b83\u7acb\u523b\u751f\u6548\uff0c\u914d\u7f6e\u7684
		 * \u5199\u5165\u518d\u5f02\u6b65\u53bb\u8bd5\uff0c\u5931\u8d25\u4e5f\u53ea\u662f\u63d0\u793a\uff0c\u4e0d\u5f71\u54cd\u8fd9\u4e00\u6b21\u64ad\u653e\u3002
		 * @returns `stream` / `one-shot` / `''`\uff08\u6ca1\u9009\u8fc7\uff0c\u4ea4\u7ed9\u670d\u52a1\u7aef\u914d\u7f6e\u51b3\u5b9a\uff09\u3002
		 */
		function readMode() {
		  try {
		    var stored = window.localStorage === undefined || window.localStorage === null
		      ? ''
		      : window.localStorage.getItem(MODE_KEY)
		    if (stored === MODE_STREAM || stored === MODE_ONE_SHOT) return stored
		  } catch (error) {
		    // \u8bfb\u4e0d\u5230\u5c31\u5f53\u6ca1\u9009\u8fc7\u3002
		  }
		  return modeMemory
		}

		/**
		 * \u8bb0\u4f4f\u5f53\u524d\u9009\u62e9\u7684\u5408\u6210\u65b9\u5f0f\u3002
		 * @param value - `stream` / `one-shot`\u3002
		 */
		function saveMode(value) {
		  modeMemory = value === MODE_STREAM ? MODE_STREAM : MODE_ONE_SHOT
		  try {
		    if (window.localStorage !== undefined && window.localStorage !== null) {
		      window.localStorage.setItem(MODE_KEY, modeMemory)
		    }
		  } catch (error) {
		    // \u5b58\u4e0d\u4e0b\u4e5f\u4e0d\u5f71\u54cd\u8fd9\u4e00\u9875\u3002
		  }
		}

		/** \u89d2\u8272\u626e\u6f14\u5f00\u5173\u7684\u5b58\u50a8\u952e\u3002 */
		var ROLEPLAY_KEY = 'dsh-cosyvoice.roleplay'

		/** \u65c1\u767d\u97f3\u8272\u6863\u6848\u7684\u5b58\u50a8\u952e\u3002 */
		var NARRATION_KEY = 'dsh-cosyvoice.narrationProfile'

		/** \u89d2\u8272\u97f3\u8272\u6863\u6848\u7684\u5b58\u50a8\u952e\u3002 */
		var CHARACTER_KEY = 'dsh-cosyvoice.characterProfile'

		/** localStorage \u4e0d\u53ef\u7528\u65f6\u7684\u515c\u5e95\uff1a\u952e \u2192 \u503c\u3002 */
		var prefMemory = {}

		/**
		 * \u8bfb\u4e00\u4e2a\u672c\u673a\u504f\u597d\u3002
		 *
		 * \u4e0e\u5408\u6210\u65b9\u5f0f\u540c\u4e00\u5957\u9053\u7406\uff1a\u7ed1\u5b9a\u97f3\u8272\u4e5f\u597d\u3001\u5f00\u5173\u4e5f\u597d\uff0c\u8d70\u5bbf\u4e3b\u914d\u7f6e\u901a\u9053\u90fd\u53ef\u80fd\u88ab\u62d2\uff0c
		 * \u800c"\u6539\u4e86\u6ca1\u53cd\u5e94"\u662f\u4e0d\u53ef\u63a5\u53d7\u7684\u3002\u6240\u4ee5\u672c\u673a\u5148\u8bb0\u4e00\u4efd\uff0c\u6bcf\u6b21\u6717\u8bfb\u8bf7\u6c42\u5e26\u4e0a\uff0c\u670d\u52a1\u7aef
		 * \u89c1\u5230\u5c31\u7528\u5b83 \u2014\u2014 \u9875\u9762\u5185\u5f53\u573a\u751f\u6548\uff0c\u914d\u7f6e\u5199\u5f97\u8fdb\u53bb\u5c31\u987a\u5e26\u6301\u4e45\u5316\u3002
		 * @param key - \u5b58\u50a8\u952e\u3002
		 * @returns \u5b58\u8fc7\u7684\u503c\uff1b**\u6ca1\u5b58\u8fc7\u662f null\uff0c\u5b58\u8fc7\u7a7a\u4e32\u662f\u7a7a\u4e32** \u2014\u2014 \u8fd9\u4e2a\u533a\u522b\u6709\u610f\u4e49\uff1a
		 *   "\u8ddf\u968f\u5f53\u524d\u97f3\u8272"\u5c31\u662f\u5b58\u4e00\u4e2a\u7a7a\u4e32\uff0c\u800c\u6ca1\u5b58\u8fc7\u5e94\u5f53\u542c\u914d\u7f6e\u7684\u3002
		 */
		function readPref(key) {
		  if (Object.prototype.hasOwnProperty.call(prefMemory, key)) return prefMemory[key]
		  try {
		    if (window.localStorage !== undefined && window.localStorage !== null) {
		      var stored = window.localStorage.getItem(key)
		      return stored === null || stored === undefined ? null : String(stored)
		    }
		  } catch (error) {
		    // \u8bfb\u4e0d\u5230\u5c31\u5f53\u6ca1\u5b58\u8fc7\u3002
		  }
		  return null
		}

		/**
		 * \u5199\u4e00\u4e2a\u672c\u673a\u504f\u597d\u3002
		 * @param key - \u5b58\u50a8\u952e\u3002
		 * @param value - \u503c\uff1b\u7a7a\u4e32\u8868\u793a"\u6e05\u6389\uff0c\u91cd\u65b0\u542c\u914d\u7f6e\u7684"\u3002
		 */
		function savePref(key, value) {
		  prefMemory[key] = value
		  try {
		    if (window.localStorage !== undefined && window.localStorage !== null) {
		      window.localStorage.setItem(key, value)
		    }
		  } catch (error) {
		    // \u5b58\u4e0d\u4e0b\u4e5f\u4e0d\u5f71\u54cd\u8fd9\u4e00\u9875\u3002
		  }
		}

		/** @returns `'true'` / `'false'` / `''`\uff08\u6ca1\u9009\u8fc7\uff09\u3002 */
		function readRoleplay() {
		  return readPref(ROLEPLAY_KEY) === 'true' ? 'true' : readPref(ROLEPLAY_KEY) === 'false' ? 'false' : ''
		}

		/** @param on - \u662f\u5426\u5f00\u542f\u3002 */
		function saveRoleplay(on) {
		  savePref(ROLEPLAY_KEY, on ? 'true' : 'false')
		}

		/**
		 * @returns \u7ed1\u5b9a\u7684\u65c1\u767d**\u6863\u6848 id**\uff1b\u6ca1\u5b58\u8fc7\u662f null\uff0c\u5b58\u8fc7"\u8ddf\u968f"\u662f\u7a7a\u4e32\u3002
		 *
		 * \u5b58\u7684\u662f\u6863\u6848 id \u800c\u4e0d\u662f\u97f3\u8272 ID\uff0c\u56e0\u4e3a**\u6a21\u578b\u8ddf\u7740\u97f3\u8272\u8d70**\uff08\u89c1 `settings-page.js`\uff09\uff1a\u97f3\u8272
		 * ID \u672c\u8eab\u4e0d\u5e26\u6a21\u578b\uff0c\u540c\u4e00\u4e2a\u97f3\u8272 ID \u5728\u4e0d\u540c\u6a21\u578b\u4e0b\u672a\u5fc5\u662f\u540c\u4e00\u4e2a\u55d3\u5b50\uff0c\u800c\u6863\u6848\u624d\u662f"\u97f3\u8272 +
		 * \u6a21\u578b"\u90a3\u4e2a\u4e0d\u53ef\u5206\u5272\u7684\u6574\u4f53\u3002\u5b58 id \u4e5f\u987a\u5e26\u89e3\u51b3\u4e86\u4e00\u4e2a\u771f\u5b9e\u5b58\u5728\u7684\u9519\u2014\u2014\u7ed1\u5b9a\u7684\u97f3\u8272\u88ab\u5220\u6389
		 * \u4e4b\u540e\uff0c\u670d\u52a1\u7aef\u80fd\u6309 id \u8ba4\u51fa"\u8fd9\u5957\u6ca1\u4e86"\u5e76\u56de\u843d\uff0c\u800c\u4e0d\u662f\u62ff\u7740\u4e00\u4e2a\u8fd8\u5728\u7684\u97f3\u8272 ID \u6084\u6084\u7ee7\u7eed\u3002
		 */
		function readNarrationProfile() {
		  return readPref(NARRATION_KEY)
		}

		/** @param id - \u65c1\u767d\u6863\u6848 id\u3002 */
		function saveNarrationProfile(id) {
		  savePref(NARRATION_KEY, String(id === undefined || id === null ? '' : id))
		}

		/** @returns \u7ed1\u5b9a\u7684\u89d2\u8272**\u6863\u6848 id**\uff1b\u6ca1\u5b58\u8fc7\u662f null\uff0c\u5b58\u8fc7"\u8ddf\u968f"\u662f\u7a7a\u4e32\u3002 */
		function readCharacterProfile() {
		  return readPref(CHARACTER_KEY)
		}

		/** @param id - \u89d2\u8272\u6863\u6848 id\u3002 */
		function saveCharacterProfile(id) {
		  savePref(CHARACTER_KEY, String(id === undefined || id === null ? '' : id))
		}

		/** \u4e3b\u673a\u540d\u4e3b\u9898 token\uff0c\u6bcf\u4e2a\u90fd\u5e26\u515c\u5e95\uff0c\u7f3a token \u65f6\u964d\u7ea7\u800c\u4e0d\u662f\u53d8\u7a7a\u767d\u3002 */
		var T = {
		  text: 'var(--dsw-alias-label-primary, inherit)',
		  textDim: 'var(--dsw-alias-label-secondary, inherit)',
		  textFaint: 'var(--dsw-alias-label-tertiary, inherit)',
		  border: 'var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.24))',
		  borderSoft: 'var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.16))',
		  panel: 'var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.06))',
		  accent: 'var(--dsw-alias-brand-primary, currentColor)',
		}

		/**
		 * \u8c03\u7528\u4e00\u4e2a\u5bbf\u4e3b\u8def\u7531\u3002
		 *
		 * \u6c38\u4e0d\u629b\u5f02\u5e38\uff1a\u5931\u8d25\u7684\u8c03\u7528 resolve \u6210 `{ ok: false, message }`\uff0c\u4e8e\u662f\u6e32\u67d3\u8def\u5f84\u4e0d\u4f1a
		 * \u56e0\u4e3a\u4e00\u6b21\u77ac\u65f6\u5bbf\u4e3b\u9519\u8bef\u800c\u5d29\u6389\u3002
		 * @param action - \u63d2\u4ef6\u524d\u7f00\u4e0b\u7684\u8def\u7531\u540d\uff08\u4f8b\u5982 `speak-message`\uff09\u3002
		 * @param body - JSON body\uff1b\u7701\u7565\u5373 GET\u3002
		 * @param method - \u8986\u76d6 HTTP \u65b9\u6cd5\uff08\u6863\u6848\u7684\u5220\u9664\u7528 DELETE\uff09\u3002
		 * @returns \u89e3\u6790\u540e\u7684\u54cd\u5e94\uff0c\u6216\u5931\u8d25\u4fe1\u5c01\u3002
		 */
		async function rpc(action, body, method) {
		  try {
		    const response = await fetch(ROUTE_PREFIX + '/' + action, {
		      method: method ?? (body === undefined ? 'GET' : 'POST'),
		      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
		      body: body === undefined ? undefined : JSON.stringify(body),
		    })
		    const text = await response.text()
		    if (text === '') return { ok: response.ok }
		    try {
		      return JSON.parse(text)
		    } catch (error) {
		      return { ok: false, message: '\u8fd4\u56de\u5185\u5bb9\u4e0d\u662f\u5408\u6cd5 JSON' }
		    }
		  } catch (error) {
		    return { ok: false, message: String(error) }
		  }
		}

		/**
		 * \u4e0a\u4f20\u4e00\u6bb5\u5b57\u8282\u5e76\u53d6\u56de JSON\uff08\u97f3\u8272\u514b\u9686\u7528\uff09\u3002
		 *
		 * \u4e0e {@link rpc} \u4e00\u6837\u6c38\u4e0d\u629b\u5f02\u5e38\uff0c\u4e8e\u662f"\u4e0a\u4f20\u5931\u8d25"\u4e0d\u4f1a\u628a\u8bbe\u7f6e\u9875\u6380\u7ffb\u3002
		 * @param action - \u63d2\u4ef6\u524d\u7f00\u4e0b\u7684\u8def\u7531\u540d\u3002
		 * @param query - \u67e5\u8be2\u4e32\uff08\u5df2\u7f16\u7801\uff09\u3002
		 * @param bytes - \u8981\u9001\u51fa\u53bb\u7684\u5b57\u8282\u3002
		 * @returns \u89e3\u6790\u540e\u7684\u54cd\u5e94\uff0c\u6216\u5931\u8d25\u4fe1\u5c01\u3002
		 */
		async function rpcBytes(action, query, bytes) {
		  try {
		    const response = await fetch(`${ROUTE_PREFIX}/${action}?${query}`, {
		      method: 'POST',
		      headers: { 'content-type': 'application/octet-stream' },
		      body: bytes,
		    })
		    const text = await response.text()
		    if (text === '') return { ok: response.ok }
		    try {
		      return JSON.parse(text)
		    } catch (error) {
		      return { ok: false, message: '\u8fd4\u56de\u5185\u5bb9\u4e0d\u662f\u5408\u6cd5 JSON' }
		    }
		  } catch (error) {
		    return { ok: false, message: String(error) }
		  }
		}

		/**
		 * \u64ad\u653e\u72b6\u6001\uff1a\u6309 messageId \u7d22\u5f15\u7684\u4e00\u6b21\u6027\u5feb\u7167\u3002
		 *
		 * \u5168\u5c40\u5355\u5b9e\u4f8b\u800c\u975e\u6bcf\u6309\u94ae\u4e00\u4efd\uff0c\u56e0\u4e3a**\u540c\u65f6\u53ea\u8be5\u6709\u4e00\u4e2a\u58f0\u97f3\u5728\u54cd**\uff1a\u4e00\u4e2a `Audio`
		 * \u5143\u7d20\u3001\u4e00\u4efd\u72b6\u6001\uff0c\u70b9\u7b2c\u4e8c\u6761\u6d88\u606f\u7684\u64ad\u653e\u952e\u81ea\u7136\u63a5\u7ba1\u524d\u4e00\u6761\u3002
		 */
		var player = (function () {
		  /** @type {{ idle: true } | { kind: 'loading' | 'playing' | 'error', messageId: string, message?: string }} */
		  var state = { idle: true }
		  var listeners = []
		  var audio = null

		  /**
		   * AudioContext\uff1a**\u61d2\u5efa**\u3002\u6d4f\u89c8\u5668\u7684\u81ea\u52a8\u64ad\u653e\u7b56\u7565\u8981\u6c42\u5b83\u5728\u4e00\u4e2a\u7528\u6237\u624b\u52bf\u91cc\u9192\u6765\uff0c\u800c
		   * \u64ad\u653e\u952e\u7684\u70b9\u51fb\u6b63\u662f\u90a3\u4e2a\u624b\u52bf \u2014\u2014 \u63d0\u524d\u5efa\u53ea\u662f\u591a\u4e00\u4e2a suspended \u7684\u4e0a\u4e0b\u6587\u3002
		   * @type {any}
		   */
		  var ctx = null

		  /** \u5df2\u7ecf\u6392\u4e0a\u65e5\u7a0b\u3001\u8fd8\u6ca1\u64ad\u5b8c\u7684\u97f3\u6e90\u3002 */
		  var sources = []

		  /** \u4e0b\u4e00\u5757\u97f3\u9891\u8be5\u5728\u4ec0\u4e48\u65f6\u523b\u5f00\u59cb\uff08\u76f8\u5bf9 AudioContext \u81ea\u5df1\u7684\u65f6\u949f\uff09\u3002 */
		  var nextStart = 0

		  /**
		   * \u6b63\u5728\u8fdb\u884c\u7684\u4e00\u6b21\u6d41\u5f0f\u64ad\u653e\uff1b`open` \u8868\u793a\u540e\u9762\u8fd8\u4f1a\u6709\u5757\u8fc7\u6765\u3002
		   * @type {{ messageId: string, open: boolean } | null}
		   */
		  var streaming = null

		  function emit() {
		    for (var i = 0; i < listeners.length; i += 1) listeners[i]()
		  }

		  function element() {
		    if (audio === null) audio = new Audio()
		    return audio
		  }

		  function set(next) {
		    state = next
		    emit()
		  }

		  /**
		   * \u53d6\u51fa AudioContext\uff0c\u5fc5\u8981\u65f6\u628a\u5b83\u53eb\u9192\u3002
		   * @returns AudioContext\u3002
		   */
		  function audioContext() {
		    if (ctx === null) {
		      var Ctor = window.AudioContext === undefined ? window.webkitAudioContext : window.AudioContext
		      if (Ctor === undefined) throw new Error('\u8fd9\u4e2a\u6d4f\u89c8\u5668\u4e0d\u652f\u6301 Web Audio\uff0c\u8bf7\u5230\u8bbe\u7f6e\u91cc\u6539\u7528\u300c\u975e\u5b9e\u65f6\u300d\u6a21\u5f0f\u3002')
		      ctx = new Ctor()
		    }
		    // \u9875\u9762\u521a\u6253\u5f00\u65f6\u5b83\u5e38\u5e38\u662f suspended\uff1aresume \u4e00\u6b21\u6ca1\u6709\u4efb\u4f55\u526f\u4f5c\u7528\u3002
		    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume()
		    return ctx
		  }

		  /**
		   * \u6536\u6389\u4e00\u6b21\u6d41\u5f0f\u64ad\u653e\uff1a\u505c\u6389\u6240\u6709\u8fd8\u5728\u6392\u961f\u7684\u97f3\u6e90\u5e76\u628a\u6e38\u6807\u62e8\u56de\u5f53\u4e0b\u3002
		   *
		   * \u90a3\u4e9b\u97f3\u6e90\u662f**\u5df2\u7ecf\u6392\u5230\u672a\u6765\u67d0\u523b**\u7684\uff0c\u5149 `currentTime` \u5f52\u96f6\u4e0d\u591f \u2014\u2014 \u4e0d\u53bb `stop()`
		   * \u5b83\u4eec\u7684\u8bdd\uff0c\u4e00\u6bb5\u542c\u8d77\u6765\u5df2\u7ecf\u505c\u4e86\u7684\u58f0\u97f3\u4f1a\u4ece\u534a\u4e2d\u95f4\u91cd\u65b0\u5192\u51fa\u6765\u3002
		   */
		  function resetStream() {
		    for (var i = 0; i < sources.length; i += 1) {
		      try {
		        sources[i].onended = null
		        sources[i].stop()
		      } catch (error) {
		        // \u5df2\u7ecf\u64ad\u5b8c\u7684\u97f3\u6e90\u518d stop \u4e00\u6b21\u4f1a\u629b\uff0c\u65e0\u6240\u8c13\u3002
		      }
		    }
		    sources = []
		    if (ctx !== null) nextStart = ctx.currentTime
		    streaming = null
		  }

		  /**
		   * \u628a\u4e00\u5c0f\u5757\u97f3\u9891\u6392\u5230\u64ad\u653e\u65e5\u7a0b\u4e0a\u3002
		   * @param base64 - Base64 \u7f16\u7801\u7684 16 \u4f4d\u5c0f\u7aef PCM\u3002
		   * @param sampleRate - \u91c7\u6837\u7387\u3002
		   */
		  function feed(base64, sampleRate) {
		    if (streaming === null) return
		    var messageId = streaming.messageId
		    var context = audioContext()
		    var floats = pcmToFloats(base64ToBytes(base64))
		    if (floats.length === 0) return

		    var rate = Number(sampleRate)
		    if (!isFinite(rate) || rate <= 0) rate = 24000
		    var buffer = context.createBuffer(1, floats.length, rate)
		    if (typeof buffer.copyToChannel === 'function') buffer.copyToChannel(floats, 0)
		    else buffer.getChannelData(0).set(floats)

		    var source = context.createBufferSource()
		    source.buffer = buffer
		    source.connect(context.destination)
		    var startedAt = nextStart < context.currentTime ? context.currentTime : nextStart
		    source.start(startedAt)
		    sources.push(source)
		    // \u6d41\u5f0f\u4e4b\u6240\u4ee5"\u542c\u4e0d\u51fa\u63a5\u7f1d"\uff0c\u5168\u5728\u8fd9\u4e00\u884c\uff1a\u4e0b\u4e00\u5757\u6392\u5728**\u4e0a\u4e00\u5757\u7ed3\u675f\u7684\u90a3\u4e00\u523b**\uff08\u7cbe\u786e
		    // \u5230\u91c7\u6837\uff09\uff0c\u800c\u4e0d\u662f"\u64ad\u5b8c\u518d\u53bb\u53d6\u4e0b\u4e00\u5757"\u3002\u540e\u8005\u6bcf\u4e24\u53e5\u4e4b\u95f4\u90fd\u8981\u4ed8\u4e00\u4e2a\u7f51\u7edc\u5f80\u8fd4\uff0c\u542c
		    // \u8d77\u6765\u5c31\u662f\u4e00\u987f\u4e00\u987f\u7684\u3002
		    nextStart = startedAt + buffer.duration

		    source.onended = function () {
		      var at = sources.indexOf(source)
		      if (at >= 0) sources.splice(at, 1)
		      // \u5168\u90e8\u64ad\u5b8c\u3001\u4e14\u670d\u52a1\u7aef\u8bf4\u8fc7\u4e0d\u4f1a\u518d\u6709\u5757\u4e86\uff0c\u624d\u56de\u5230\u7a7a\u95f2\u3002
		      if (sources.length === 0 && streaming !== null && !streaming.open) set({ idle: true })
		    }
		    set({ kind: 'playing', messageId: messageId })
		  }

		  return {
		    /**
		     * \u5f00\u59cb\u4e00\u6b21\u6d41\u5f0f\u64ad\u653e\u3002\u540e\u7eed\u6bcf\u4e00\u5757\u97f3\u9891\u7531 {@link feed} \u6392\u4e0a\u65e5\u7a0b\u3002
		     * @param messageId - \u5f52\u5c5e\u6d88\u606f\u3002
		     */
		    beginStream: function (messageId) {
		      resetStream()
		      streaming = { messageId: messageId, open: true }
		      nextStart = 0
		      set({ kind: 'loading', messageId: messageId })
		    },
		    /**
		     * \u6392\u4e00\u5757\u97f3\u9891\u4e0a\u64ad\u653e\u65e5\u7a0b\uff08\u89c1\u8be5\u7c7b\u91cc {@link feed} \u7684\u8bf4\u660e\uff09\u3002
		     * @param base64 - Base64 \u7f16\u7801\u7684 16 \u4f4d\u5c0f\u7aef PCM\u3002
		     * @param sampleRate - \u91c7\u6837\u7387\u3002
		     */
		    feed: feed,
		    /** \u670d\u52a1\u7aef\u4e0d\u4f1a\u518d\u6709\u5757\u8fc7\u6765\u4e86\uff1b\u64ad\u5b8c\u5df2\u6392\u7684\u90a3\u4e9b\u5c31\u56de\u5230\u7a7a\u95f2\u3002 */
		    endStream: function () {
		      if (streaming === null) return
		      streaming.open = false
		      if (sources.length === 0) set({ idle: true })
		    },
		    /** @returns \u5f53\u524d\u72b6\u6001\u5feb\u7167\u3002 */
		    getSnapshot: function () { return state },
		    /** @param listener - \u53d8\u66f4\u56de\u8c03\u3002 @returns \u53d6\u6d88\u8ba2\u9605\u51fd\u6570\u3002 */
		    subscribe: function (listener) {
		      listeners.push(listener)
		      return function () {
		        var at = listeners.indexOf(listener)
		        if (at >= 0) listeners.splice(at, 1)
		      }
		    },
		    /**
		     * \u5f00\u59cb\u64ad\u4e00\u6bb5\u97f3\u9891\u3002
		     * @param messageId - \u5f52\u5c5e\u6d88\u606f\uff0c\u7528\u4e8e\u628a"\u6b63\u5728\u64ad"\u843d\u5728\u6b63\u786e\u7684\u6309\u94ae\u4e0a\u3002
		     * @param url - \u97f3\u9891\u5730\u5740\u3002
		     */
		    play: function (messageId, url) {
		      const audio = element()
		      resetStream()
		      audio.pause()
		      audio.src = url
		      audio.currentTime = 0
		      set({ kind: 'loading', messageId: messageId })
		      const started = audio.play()
		      if (started && typeof started.then === 'function') {
		        started.then(function () {
		          set({ kind: 'playing', messageId: messageId })
		        }).catch(function () {
		          set({ kind: 'error', messageId: messageId, message: '\u6d4f\u89c8\u5668\u62d2\u7edd\u4e86\u81ea\u52a8\u64ad\u653e\uff0c\u8bf7\u518d\u70b9\u4e00\u6b21' })
		        })
		      } else {
		        set({ kind: 'playing', messageId: messageId })
		      }
		      audio.onended = function () { set({ idle: true }) }
		      audio.onerror = function () {
		        set({ kind: 'error', messageId: messageId, message: '\u97f3\u9891\u64ad\u653e\u5931\u8d25' })
		      }
		    },
		    /** \u505c\u6b62\u64ad\u653e\uff1a\u6574\u6bb5\u64ad\u653e\u4e0e\u6d41\u5f0f\u64ad\u653e\u4e00\u8d77\u6536\u6389\u3002 */
		    stop: function () {
		      const audio = element()
		      resetStream()
		      audio.pause()
		      audio.onended = null
		      audio.onerror = null
		      set({ idle: true })
		    },
		    /**
		     * \u6807\u8bb0\u67d0\u6761\u6d88\u606f\u6b63\u5728\u5408\u6210\u3002
		     * @param messageId - \u76ee\u6807\u6d88\u606f\u3002
		     */
		    loading: function (messageId) {
		      resetStream()
		      set({ kind: 'loading', messageId: messageId })
		    },
		    /**
		     * \u6807\u8bb0\u67d0\u6761\u6d88\u606f\u5931\u8d25\u3002
		     * @param messageId - \u76ee\u6807\u6d88\u606f\u3002
		     * @param message - \u5c55\u793a\u7ed9\u7528\u6237\u7684\u8bf4\u660e\u3002
		     */
		    fail: function (messageId, message) {
		      set({ kind: 'error', messageId: messageId, message: message })
		    },
		  }
		})()

		/**
		 * Base64 \u2192 \u5b57\u8282\u3002
		 *
		 * \u624b\u5199\u800c\u4e0d\u662f\u7528 `atob`\uff1a\u4e00\u662f\u4e00\u6bb5 base64 \u91cc\u6df7\u5165\u6362\u884c\u6216\u7f3a\u5931\u586b\u5145\u65f6\u5b83\u4f1a\u76f4\u63a5\u629b\uff0c\u4e8c\u662f\u5c11
		 * \u4e00\u4e2a\u5bbf\u4e3b API\uff0c\u4ea7\u7269\u81ea\u68c0\u5c31\u5c11\u4e00\u5904\u73af\u5883\u5dee\u5f02\u3002
		 * @param text - Base64 \u6587\u672c\u3002
		 * @returns \u5b57\u8282\u3002
		 */
		var base64ToBytes = (function () {
		  var table = null
		  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
		  /**
		   * @param base64 - Base64 \u6587\u672c\u3002
		   * @returns \u5b57\u8282\u3002
		   */
		  return function decode(base64) {
		    if (table === null) {
		      table = {}
		      for (var i = 0; i < ALPHABET.length; i += 1) table[ALPHABET.charAt(i)] = i
		    }
		    var clean = String(base64 === undefined ? '' : base64).replace(/[^A-Za-z0-9+/=]/g, '')
		    var length = clean.length
		    var padding = clean.charAt(length - 2) === '=' ? 2 : clean.charAt(length - 1) === '=' ? 1 : 0
		    var bytes = new Uint8Array(Math.floor((length * 3) / 4) - padding)
		    var at = 0
		    var acc = 0
		    var bits = 0
		    for (var i = 0; i < length; i += 1) {
		      var char = clean.charAt(i)
		      if (char === '=') break
		      acc = (acc << 6) | table[char]
		      bits += 6
		      if (bits >= 8) {
		        bits -= 8
		        bytes[at] = (acc >> bits) & 0xFF
		        at += 1
		      }
		    }
		    return bytes
		  }
		})()

		/**
		 * 16 \u4f4d\u5c0f\u7aef PCM \u2192 WebAudio \u8981\u7684 Float32\uff08-1 ~ 1\uff09\u3002
		 * @param bytes - \u539f\u59cb\u91c7\u6837\u3002
		 * @returns \u5f52\u4e00\u5316\u540e\u7684\u91c7\u6837\u3002
		 */
		function pcmToFloats(bytes) {
		  var count = Math.floor(bytes.length / 2)
		  var out = new Float32Array(count)
		  for (var i = 0; i < count; i += 1) {
		    var sample = (bytes[i * 2 + 1] << 8) | bytes[i * 2]
		    if (sample >= 32768) sample -= 65536
		    out[i] = sample / 32768
		  }
		  return out
		}

		/**
		 * \u5207\u51fa\u4e00\u4e2a SSE \u5e27\u3002
		 *
		 * \u4e0e\u5bbf\u4e3b `host/stream.js` \u91cc\u90a3\u4efd\u662f\u540c\u4e00\u4e2a\u5f62\u72b6\u7684\u4e24\u4efd\u5b9e\u73b0 \u2014\u2014 \u6d4f\u89c8\u5668\u7aef\u7684 bundle \u4e0d\u80fd
		 * \u5f15 Node \u6a21\u5757\uff0c\u800c\u8fd9\u91cc\u4e5f\u4e0d\u9700\u8981\u90a3\u4e9b Node \u4fa7\u7684\u7c7b\u578b\u3002
		 * @param frame - \u4e0d\u542b\u7ed3\u5c3e\u7a7a\u884c\u7684\u539f\u59cb\u5e27\u6587\u672c\u3002
		 * @returns `{ event, data }`\uff1b\u6ca1\u6709 data \u884c\u65f6\u4e3a undefined\u3002
		 */
		function parseFrame(frame) {
		  var name = ''
		  var lines = []
		  var parts = String(frame).split('\n')
		  for (var i = 0; i < parts.length; i += 1) {
		    var line = parts[i].trim()
		    if (line === '') continue
		    var colon = line.indexOf(':')
		    var key = colon < 0 ? line : line.slice(0, colon).trim()
		    var value = colon < 0 ? '' : line.slice(colon + 1).trim()
		    if (key === 'event') name = value
		    else if (key === 'data') lines.push(value)
		  }
		  if (lines.length === 0) return undefined
		  return { event: name, data: lines.join('\n') }
		}

		/**
		 * \u8bfb\u4e00\u6761 SSE \u6d41\uff0c\u9010\u4e2a\u4e8b\u4ef6\u4ea4\u7ed9\u56de\u8c03\u3002
		 * @param body - \u54cd\u5e94\u4f53\uff08StreamReader \u7684\u5bbf\u4e3b\uff09\u3002
		 * @param onFrame - \u6bcf\u5e27\u56de\u8c03\u3002
		 * @returns \u6d41\u7ed3\u675f\u65f6\u7684 Promise\u3002
		 */
		async function readSseFrames(body, onFrame) {
		  var decoder = new TextDecoder()
		  var reader = body.getReader()
		  var buffer = ''
		  while (true) {
		    var next = await reader.read()
		    if (next.done) break
		    buffer += decoder.decode(next.value, { stream: true })
		    // TCP \u4e0d\u4fdd\u8bc1\u4e00\u6b21\u8bfb\u5230\u6574\u5e27\uff0c\u6240\u4ee5\u7559\u4e0b\u5c3e\u5df4\u7b49\u4e0b\u4e00\u8d9f\u3002
		    var at = buffer.indexOf('\n\n')
		    while (at >= 0) {
		      var frame = parseFrame(buffer.slice(0, at))
		      buffer = buffer.slice(at + 2)
		      if (frame !== undefined) onFrame(frame)
		      at = buffer.indexOf('\n\n')
		    }
		  }
		  if (buffer.trim() !== '') {
		    var tail = parseFrame(buffer)
		    if (tail !== undefined) onFrame(tail)
		  }
		}

		/**
		 * \u8bf7\u6c42\u4e00\u6b21\u6717\u8bfb\u5e76\u628a\u7ed3\u679c\u4ea4\u7ed9\u64ad\u653e\u5668\u3002
		 *
		 * \u670d\u52a1\u7aef\u6309\u81ea\u5df1\u7684\u914d\u7f6e\u51b3\u5b9a\u56de\u6574\u6bb5 JSON \u8fd8\u662f SSE \u6d41\uff0c\u8fd9\u91cc\u4e0d\u5148\u53bb\u95ee `mode` \u2014\u2014 \u5c11\u4e00\u6b21
		 * \u5f80\u8fd4\uff0c\u800c `content-type` \u5df2\u7ecf\u662f\u552f\u4e00\u7684\u771f\u76f8\u6765\u6e90\uff1a\u6a21\u5f0f\u53ef\u80fd\u5728\u4e24\u6b21\u8bf7\u6c42\u4e4b\u95f4\u88ab\u6539\u6389\uff0c\u95ee
		 * \u6765\u7684\u7b54\u6848\u53cd\u800c\u53ef\u80fd\u662f\u8fc7\u671f\u7684\u3002
		 * @param action - \u63d2\u4ef6\u524d\u7f00\u4e0b\u7684\u8def\u7531\u540d\u3002
		 * @param body - JSON body\u3002
		 * @param messageId - \u5f52\u5c5e\u6d88\u606f\uff0c\u7528\u4e8e\u628a\u72b6\u6001\u843d\u5728\u6b63\u786e\u7684\u6309\u94ae\u4e0a\u3002
		 * @returns \u5904\u7406\u5b8c\u6bd5\u7684 Promise\u3002
		 */
		async function speakAs(action, body, messageId) {
		  player.loading(messageId)
		  var payload = {}
		  if (body !== undefined && body !== null) {
		    for (var key in body) if (Object.prototype.hasOwnProperty.call(body, key)) payload[key] = body[key]
		  }
		  // \u5e26\u4e0a"\u6211\u73b0\u5728\u60f3\u8981\u7684\u6a21\u5f0f"\uff1a\u670d\u52a1\u7aef\u53ea\u5728\u5b83\u5408\u6cd5\u65f6\u624d\u542c\u5b83\u7684\uff0c\u5426\u5219\u4ecd\u6309\u81ea\u5df1\u7684\u914d\u7f6e\u6765\u3002
		  // \u4e8e\u662f\u5207\u6362\u662f**\u5f53\u573a\u751f\u6548**\u7684\uff0c\u4e0d\u5fc5\u7b49\u5bbf\u4e3b\u628a\u914d\u7f6e\u5199\u56de\u53bb\u3002
		  var wanted = readMode()
		  if (wanted !== '') payload.mode = wanted

		  // \u89d2\u8272\u626e\u6f14\u540c\u7406\uff1a\u5f00\u5173\u4e0e\u4e24\u4e2a\u97f3\u8272\u90fd\u968f\u8bf7\u6c42\u8d70\uff0c\u670d\u52a1\u7aef\u89c1\u4e86\u5c31\u7528\u3002\u5199\u914d\u7f6e\u662f"\u987a\u5e26"\uff0c
		  // \u5199\u4e0d\u8fdb\u53bb\u4e5f\u4e0d\u4f1a\u8ba9\u8fd9\u4e00\u6b21\u6717\u8bfb\u56de\u5230\u65e7\u7684\u8bfb\u6cd5\u3002
		  var roleplay = readRoleplay()
		  if (roleplay === 'true') payload.roleplay = true
		  else if (roleplay === 'false') payload.roleplay = false
		  // \u7a7a\u4e32\u662f\u6709\u610f\u4e49\u7684\uff08"\u8ddf\u968f\u5f53\u524d\u97f3\u8272"\uff09\uff0c\u4f46\u90a3\u8be5\u7531\u914d\u7f6e\u53bb\u8868\u8fbe\uff0c\u4e0d\u5fc5\u5360\u7528\u8bf7\u6c42\u4f53\u3002
		  var narrationProfile = readNarrationProfile()
		  if (narrationProfile !== null && narrationProfile !== '') payload.narrationProfileId = narrationProfile
		  var characterProfile = readCharacterProfile()
		  if (characterProfile !== null && characterProfile !== '') payload.characterProfileId = characterProfile

		  var response
		  try {
		    response = await fetch(ROUTE_PREFIX + '/' + action, {
		      method: 'POST',
		      headers: { 'content-type': 'application/json' },
		      body: JSON.stringify(payload),
		    })
		  } catch (error) {
		    player.fail(messageId, String(error))
		    return
		  }

		  var type = response.headers === undefined || response.headers === null
		    ? ''
		    : String(response.headers.get('content-type') || '')

		  if (type.indexOf('text/event-stream') >= 0) {
		    if (response.body === undefined || response.body === null || typeof response.body.getReader !== 'function') {
		      player.fail(messageId, '\u8fd9\u4e2a\u6d4f\u89c8\u5668\u8bfb\u4e0d\u4e86\u6d41\u5f0f\u54cd\u5e94\uff0c\u8bf7\u5728\u8bbe\u7f6e\u91cc\u6539\u7528\u300c\u975e\u5b9e\u65f6\u300d\u6a21\u5f0f\u3002')
		      return
		    }
		    player.beginStream(messageId)
		    try {
		      await readSseFrames(response.body, function (frame) {
		        var data = {}
		        try { data = JSON.parse(frame.data) } catch (error) { data = {} }
		        if (frame.event === 'chunk') {
		          try {
		            player.feed(data.audio, data.sampleRate)
		          } catch (error) {
		            player.fail(messageId, String(error))
		          }
		        } else if (frame.event === 'done') {
		          player.endStream()
		        } else if (frame.event === 'error') {
		          player.fail(messageId, data.message === undefined ? '\u8bed\u97f3\u5408\u6210\u5931\u8d25' : data.message)
		        }
		      })
		    } catch (error) {
		      player.fail(messageId, String(error))
		    }
		    return
		  }

		  var text = ''
		  try {
		    text = await response.text()
		  } catch (error) {
		    player.fail(messageId, String(error))
		    return
		  }
		  var payload
		  try {
		    payload = text === '' ? { ok: response.ok } : JSON.parse(text)
		  } catch (error) {
		    player.fail(messageId, '\u8fd4\u56de\u5185\u5bb9\u4e0d\u662f\u5408\u6cd5 JSON')
		    return
		  }
		  if (payload === undefined || payload === null || !payload.ok) {
		    player.fail(messageId, (payload !== null && payload !== undefined && payload.message) || '\u8bed\u97f3\u5408\u6210\u5931\u8d25')
		    return
		  }
		  if (payload.clip === undefined || payload.clip === null || !payload.clip.url) {
		    player.fail(messageId, '\u8bed\u97f3\u5408\u6210\u5931\u8d25')
		    return
		  }
		  player.play(messageId, payload.clip.url)
		}

		/**
		 * \u8ba2\u9605\u64ad\u653e\u5668\u72b6\u6001\u3002
		 * @returns \u5f53\u524d\u72b6\u6001\u3002
		 */
		function usePlayerState() {
		  var pair = React.useState(function () { return player.getSnapshot() })
		  var snapshot = pair[0]
		  var setSnapshot = pair[1]
		  React.useEffect(function () {
		    setSnapshot(player.getSnapshot())
		    return player.subscribe(function () { setSnapshot(player.getSnapshot()) })
		  }, [])
		  return snapshot
		}

		/**
		 * \u67d0\u6761\u6d88\u606f\u6b64\u523b\u7684\u64ad\u653e\u72b6\u6001\u3002
		 * @param snapshot - \u64ad\u653e\u5668\u5feb\u7167\u3002
		 * @param messageId - \u76ee\u6807\u6d88\u606f\u3002
		 * @returns `'idle' | 'loading' | 'playing' | 'error'`\uff0c\u4ee5\u53ca\u9519\u8bef\u6d88\u606f\u3002
		 */
		function stateOf(snapshot, messageId) {
		  if (snapshot.idle === true) return { phase: 'idle', message: undefined }
		  if (snapshot.messageId !== messageId) return { phase: 'idle', message: undefined }
		  return { phase: snapshot.kind, message: snapshot.message }
		}

		/**
		 * \u4ece chat \u5feb\u7167\u91cc\u62bd\u51fa\u4e00\u6761\u52a9\u624b\u6d88\u606f\u7684\u7eaf\u6587\u672c\u3002
		 *
		 * \u4e0e\u5bbf\u4e3b\u6e32\u67d3"\u590d\u5236"\u6309\u94ae\u65f6\u7528\u540c\u4e00\u5957\u89c4\u5219\uff08\u53ea\u53d6 `kind === 'text'` \u7684\u5757\uff09\uff0c\u6240\u4ee5\u542c\u5230\u7684
		 * \u548c\u590d\u5236\u51fa\u6765\u7684\u662f\u540c\u4e00\u6bb5\u5185\u5bb9\u3002
		 * @param snapshot - chat \u5feb\u7167\u3002
		 * @param messageId - \u76ee\u6807\u6d88\u606f\u3002
		 * @returns \u6587\u672c\uff1b\u4e0d\u5728\u5df2\u52a0\u8f7d\u7a97\u53e3\u5185\u65f6\u8fd4\u56de undefined\u3002
		 */
		function textOfMessage(snapshot, messageId) {
		  if (snapshot === undefined || snapshot === null) return undefined
		  const nodes = snapshot.legacy === undefined ? undefined : snapshot.legacy.nodes
		  if (nodes === undefined) return undefined
		  for (let i = 0; i < nodes.length; i += 1) {
		    const node = nodes[i]
		    if (node === undefined || node.kind !== 'assistant' || node.messageId !== messageId) continue
		    const blocks = node.blocks === undefined ? [] : node.blocks
		    let text = ''
		    for (let j = 0; j < blocks.length; j += 1) {
		      const block = blocks[j]
		      if (block !== undefined && block.kind === 'text' && typeof block.text === 'string') text += block.text
		    }
		    return text === '' ? undefined : text
		  }
		  return undefined
		}

		// ---- client/locales.js ----
		/**
		 * \u672c\u63d2\u4ef6\u7684\u6587\u6848\u5b57\u5178\u3002
		 *
		 * \u4e24\u5957\u5b57\u5178\u7684\u952e\u96c6\u5fc5\u987b\u5b8c\u5168\u4e00\u81f4 \u2014\u2014 `zh` \u662f\u952e\u96c6\u7684\u4e8b\u5b9e\u6765\u6e90\uff0c`t()` \u5728\u7f3a\u952e\u65f6\u56de\u843d\u5230
		 * \u4e2d\u6587\uff0c\u6240\u4ee5\u82f1\u6587\u6f0f\u4e00\u4e2a\u952e\u4e0d\u4f1a\u628a\u754c\u9762\u53d8\u6210\u7a7a\u767d\uff0c\u4f46 `verify.mjs` \u4f1a\u628a\u5b83\u5f53\u4f5c\u6784\u5efa\u7f3a\u9677\u3002
		 */

		/** \u4e2d\u6587\u5b57\u5178\uff08\u952e\u96c6\u7684\u4e8b\u5b9e\u6765\u6e90\uff09\u3002 */
		var DICT_ZH = {
		  'action.speak': '\u6717\u8bfb\u8fd9\u6761\u56de\u7b54',
		  'action.retry': '\u91cd\u8bd5',
		  'action.stop': '\u505c\u6b62\u64ad\u653e',
		  'action.speaking': '\u6b63\u5728\u64ad\u653e',
		  'action.synthesizing': '\u6b63\u5728\u5408\u6210',
		  'error.missing': '\u6ca1\u627e\u5230\u8fd9\u6761\u56de\u7b54\u7684\u6587\u672c',
		  'error.generic': '\u8bed\u97f3\u5408\u6210\u5931\u8d25',
		  'section.label': '\u8bed\u97f3',
		  'settings.title': '\u8bed\u97f3\u6717\u8bfb',
		  'settings.hint': '\u6bcf\u6761 AI \u56de\u7b54\u672b\u5c3e\u4f1a\u51fa\u73b0\u4e00\u4e2a\u64ad\u653e\u952e\uff0c\u70b9\u51fb\u5373\u7528\u4f60\u9009\u4e2d\u7684\u97f3\u8272\u6717\u8bfb\u3002\u97f3\u8272\u4e0e\u6a21\u578b\u662f\u7ed1\u5728\u4e00\u8d77\u7684\uff1a\u9009\u54ea\u5957\u97f3\u8272\uff0c\u5c31\u7528\u5b83\u81ea\u5df1\u7ed1\u5b9a\u7684\u90a3\u6b3e\u6a21\u578b\u5408\u6210\u3002',
		  'settings.key': '\u767e\u70bc API Key',
		  'settings.keyPlaceholder': 'sk-...\uff08\u963f\u91cc\u4e91\u767e\u70bc\u63a7\u5236\u53f0\u83b7\u53d6\uff09',
		  'settings.keyHint': '\u7528\u4e8e\u767e\u70bc CosyVoice \u7cfb\u5217\u7684\u6a21\u578b\u3002\u53ea\u7528 MiMo \u7684\u8bdd\u53ef\u4ee5\u7559\u7a7a\u3002',
		  'settings.mimoKey': 'MiMo API Key',
		  'settings.mimoKeyPlaceholder': 'sk-...\uff08\u5c0f\u7c73 MiMo \u5f00\u653e\u5e73\u53f0\u83b7\u53d6\uff09',
		  'settings.mimoKeyHint': '\u7528\u4e8e MiMo V2.5 TTS \u7cfb\u5217\u7684\u4e09\u6b3e\u6a21\u578b\u3002\u53ea\u7528\u767e\u70bc\u7684\u8bdd\u53ef\u4ee5\u7559\u7a7a\u3002',
		  'settings.modelEffective': '\u5f53\u524d\u97f3\u8272\u4e0e\u6a21\u578b',
		  'settings.mode': '\u5408\u6210\u65b9\u5f0f',
		  'settings.modeHint': '\u5b9e\u65f6\uff1a\u4e91\u7aef\u6309\u53e5\u8fd4\u56de\uff0c\u7b2c\u4e00\u53e5\u5408\u6210\u597d\u5c31\u5f00\u59cb\u5ff5\uff0c\u51fa\u58f0\u6700\u5feb\u3002\u975e\u5b9e\u65f6\uff1a\u6574\u6bb5\u6587\u5b57\u4e00\u6b21\u5408\u6210\u540e\u518d\u5ff5\uff0c\u8bed\u8c03\u6700\u8fde\u8d2f\u3002\u4efb\u4f55\u65f6\u5019\u5207\u6362\u90fd\u7acb\u523b\u751f\u6548\u3002',
		  'settings.modeOnce': '\u975e\u5b9e\u65f6\uff08\u6574\u6bb5\uff09',
		  'settings.modeStream': '\u5b9e\u65f6\uff08\u6d41\u5f0f\uff09',
		  'settings.modeEffective': '\u5f53\u524d\u751f\u6548',
		  'settings.modeUnsaved': '\u672a\u5199\u5165\u914d\u7f6e\uff0c\u91cd\u542f\u540e\u56de\u5230\u9ed8\u8ba4',
		  'settings.modeSaved': '\u5df2\u5207\u6362\u5e76\u5199\u5165\u914d\u7f6e',
		  'settings.modeFailed': '\u5df2\u5728\u9875\u9762\u5185\u5207\u6362\uff0c\u4f46\u6ca1\u80fd\u5199\u8fdb\u914d\u7f6e\uff1a\u91cd\u542f dsh \u540e\u4f1a\u56de\u5230\u9ed8\u8ba4\uff08\u4e0d\u5f71\u54cd\u672c\u6b21\u4f7f\u7528\uff09',
		  'settings.voice': '\u9ed8\u8ba4\u97f3\u8272 ID',
		  'settings.voiceHint': '\u53ea\u6709\u5728\u4e00\u5957\u97f3\u8272\u6863\u6848\u90fd\u8fd8\u6ca1\u5efa\u8d77\u6765\u65f6\u624d\u7528\u5b83\u3002\u5efa\u597d\u6863\u6848\u4e4b\u540e\uff0c\u6a21\u578b\u8ddf\u7740\u6863\u6848\u8d70\uff0c\u8fd9\u91cc\u4e0d\u518d\u751f\u6548\u3002',
		  'settings.voicePlaceholder': '\u767e\u70bc\u63a7\u5236\u53f0\u91cc\u590d\u523b/\u8bbe\u8ba1\u7684\u97f3\u8272 ID',
		  'settings.roleplay': '\u89d2\u8272\u626e\u6f14\u6a21\u5f0f',
		  'settings.roleplayHint': '\u5f00\u542f\u540e\uff0c\u56de\u7b54\u91cc\u300c\u300d\u62ec\u8d77\u6765\u7684\u90e8\u5206\u7b97\u53f0\u8bcd\uff0c\u5176\u4f59\u7b97\u65c1\u767d\u3002\u4e24\u8005\u7528\u5404\u81ea\u7684\u97f3\u8272\u5206\u522b\u5408\u6210\uff0c\u518d\u6309\u539f\u6587\u987a\u5e8f\u62fc\u6210\u4e00\u6761\u97f3\u9891\u2014\u2014\u6240\u4ee5\u542c\u8d77\u6765\u662f"\u65c1\u767d\u4e00\u53e5\u3001\u89d2\u8272\u4e00\u53e5"\uff0c\u987a\u5e8f\u548c\u8bfb\u5230\u7684\u6587\u5b57\u4e00\u81f4\u3002',
		  'settings.roleplayOn': '\u5f00\u542f',
		  'settings.roleplayOff': '\u5173\u95ed',
		  'settings.roleplaySaved': '\u5df2\u5207\u6362\u5e76\u5199\u5165\u914d\u7f6e',
		  'settings.roleplayFailed': '\u5df2\u5728\u9875\u9762\u5185\u5207\u6362\uff0c\u4f46\u6ca1\u80fd\u5199\u8fdb\u914d\u7f6e\uff1a\u91cd\u542f dsh \u540e\u4f1a\u56de\u5230\u5173\u95ed\uff08\u4e0d\u5f71\u54cd\u672c\u6b21\u4f7f\u7528\uff09',
		  'settings.narrationVoice': '\u65c1\u767d\u97f3\u8272',
		  'settings.characterVoice': '\u89d2\u8272\u97f3\u8272',
		  'settings.roleplayVoiceHint': '\u4e24\u5957\u97f3\u8272\u6863\u6848\u5404\u7ed1\u4e00\u4e2a\uff0c\u7ed1\u7684\u662f\u6574\u5957\u6863\u6848\uff08\u97f3\u8272 + \u6a21\u578b\uff09\u3002\u7559\u7a7a\u8868\u793a\u8ddf\u968f\u300c\u5f53\u524d\u97f3\u8272\u300d\u3002\u53f0\u8bcd\u7edf\u4e00\u7528\u8fd9\u4e00\u4e2a\u89d2\u8272\u97f3\u8272\u2014\u2014\u4e00\u6bb5\u8bdd\u91cc\u51fa\u73b0\u591a\u4e2a\u89d2\u8272\u65f6\uff0c\u76ee\u524d\u4e0d\u9010\u4e2a\u533a\u5206\u3002',
		  'settings.voiceFollow': '\u8ddf\u968f\u5f53\u524d\u97f3\u8272',
		  'settings.roleplayVoiceSaved': '\u5df2\u7ed1\u5b9a',
		  'settings.roleplayVoiceFailed': '\u5df2\u5728\u672c\u9875\u751f\u6548\uff0c\u4f46\u6ca1\u80fd\u5199\u8fdb\u914d\u7f6e\uff1a\u91cd\u542f dsh \u540e\u4f1a\u56de\u5230\u300c\u8ddf\u968f\u5f53\u524d\u97f3\u8272\u300d\uff08\u4e0d\u5f71\u54cd\u672c\u6b21\u4f7f\u7528\uff09',
		  'settings.previewRoleplayText': '\u65c1\u767d\u5148\u7528\u65c1\u767d\u97f3\u8272\u5ff5\u8fd9\u4e00\u53e5\u3002\u300c\u8fd9\u4e00\u53e5\u662f\u89d2\u8272\u8bf4\u7684\uff0c\u7528\u7684\u662f\u89d2\u8272\u97f3\u8272\u3002\u300d\u6700\u540e\u65c1\u767d\u518d\u6536\u4e00\u53e5\u3002',
		  'profiles.title': '\u97f3\u8272\u6863\u6848',
		  'profiles.hint': '\u4e00\u5957\u6863\u6848 = \u4e00\u4e2a\u97f3\u8272 + \u4e00\u6b3e\u6a21\u578b\u3002\u9009\u54ea\u5957\u5c31\u7528\u54ea\u6b3e\u6a21\u578b\u5408\u6210\uff0c\u6a21\u578b\u540d\u4f1a\u81ea\u52a8\u9644\u5728\u540d\u79f0\u672b\u5c3e\u3002',
		  'profiles.empty': '\u8fd8\u6ca1\u6709\u97f3\u8272\u6863\u6848\u3002\u4e0b\u9762\u53ef\u4ee5\u65b0\u589e\u4e00\u5957\uff0c\u6216\u4ece MiMo \u5185\u7f6e\u97f3\u8272\u91cc\u6311\u4e00\u4e2a\u3002',
		  'profiles.add': '\u65b0\u589e\u97f3\u8272',
		  'profiles.edit': '\u7f16\u8f91',
		  'profiles.save': '\u4fdd\u5b58',
		  'profiles.cancel': '\u53d6\u6d88',
		  'profiles.delete': '\u5220\u9664',
		  'profiles.use': '\u542f\u7528',
		  'profiles.current': '\u5f53\u524d\u97f3\u8272',
		  'profiles.namePlaceholder': '\u540d\u79f0\uff0c\u4f8b\u5982"\u6211\u7684\u58f0\u97f3"',
		  'profiles.modelHint': '\u6a21\u578b\u51b3\u5b9a\u8fd9\u91cc\u8981\u586b\u4ec0\u4e48\uff1a\u5185\u7f6e\u97f3\u8272\u586b\u97f3\u8272\u540d\uff0c\u590d\u523b/\u8bbe\u8ba1\u586b\u97f3\u8272 ID \u6216\u4e00\u53e5\u63cf\u8ff0\u3002',
		  'profiles.voicePlaceholder': '\u97f3\u8272 ID',
		  'profiles.designPlaceholder': '\u4e00\u53e5\u63cf\u8ff0\uff0c\u4f8b\u5982"\u6e29\u67d4\u77e5\u6027\u7684\u5973\u58f0\uff0c\u8bed\u901f\u504f\u6162"',
		  'profiles.needVoice': '\u97f3\u8272 ID \u4e0d\u80fd\u4e3a\u7a7a\u3002',
		  'profiles.needModel': '\u5148\u9009\u4e00\u6b3e\u6a21\u578b\u3002',
		  'profiles.needDesign': '\u97f3\u8272\u8bbe\u8ba1\u8981\u5199\u4e00\u53e5\u63cf\u8ff0\u3002',
		  'profiles.cloneViaUpload': '\u8fd9\u6b3e\u6a21\u578b\u7684\u97f3\u8272\u6765\u81ea\u53c2\u8003\u97f3\u9891\uff0c\u8bf7\u7528\u4e0b\u9762\u7684\u300c\u97f3\u8272\u514b\u9686\u300d\u4e0a\u4f20\u3002',
		  'profiles.sampleLabel': '\u53c2\u8003\u97f3\u9891 ',
		  'profiles.builtinTitle': 'MiMo \u5185\u7f6e\u97f3\u8272',
		  'profiles.builtinHint': '\u8fd9\u51e0\u628a\u55d3\u5b50\u662f MiMo \u81ea\u5e26\u7684\uff0c\u9009\u4e2d\u540e\u4e00\u952e\u52a0\u8fdb\u6863\u6848\uff0c\u4e0d\u7528\u590d\u523b\u4e5f\u4e0d\u7528\u586b ID\u3002',
		  'profiles.builtinAdd': '\u6dfb\u52a0\u9009\u4e2d\u7684',
		  'profiles.builtinAdded': '\u5df2\u6dfb\u52a0',
		  'profiles.builtinAdding': '\u6b63\u5728\u6dfb\u52a0\u2026',
		  'profiles.builtinAddedCount': '\u5df2\u6dfb\u52a0\u5185\u7f6e\u97f3\u8272',
		  'profiles.builtinPickNone': '\u5148\u52fe\u9009\u60f3\u6dfb\u52a0\u7684\u97f3\u8272\u3002',
		  'profiles.builtinPickOne': '\u9009\u4e00\u4e2a\u5185\u7f6e\u97f3\u8272',
		  'profiles.lowLatency': '\u975e\u4f4e\u5ef6\u8fdf',
		  'profiles.lowLatencyHint': '\u8fd9\u6b3e\u6a21\u578b\u7684\u6d41\u5f0f\u662f\u517c\u5bb9\u6a21\u5f0f\uff0c\u8981\u7b49\u6574\u6bb5\u5408\u6210\u5b8c\u624d\u51fa\u58f0',
		  'profiles.pending': '\u590d\u523b\u4e2d',
		  'profiles.failed': '\u5931\u8d25',
		  'models.loading': '\u6b63\u5728\u8bfb\u53d6\u6a21\u578b\u6e05\u5355\u2026',
		  'clone.title': '\u97f3\u8272\u514b\u9686',
		  'clone.hint': '\u4e0a\u4f20\u4e00\u6bb5 10~20 \u79d2\u7684\u6e05\u6670\u4eba\u58f0\u3002\u9009\u767e\u70bc\u6a21\u578b\u4f1a\u5728\u4e91\u7aef\u590d\u523b\uff08\u8981\u7b49\u90e8\u7f72\uff09\uff1b\u9009 MiMo \u5219\u628a\u97f3\u9891\u5b58\u5728\u672c\u673a\uff0c\u6bcf\u6b21\u5408\u6210\u90fd\u9644\u5e26\u4e0a\u4f20\uff0c\u53ef\u4ee5\u53cd\u590d\u590d\u7528\u3002',
		  'clone.start': '\u5f00\u59cb\u590d\u523b',
		  'clone.uploading': '\u6b63\u5728\u4e0a\u4f20\u5e76\u590d\u523b\u2026',
		  'clone.pending': '\u97f3\u8272\u90e8\u7f72\u4e2d\uff0c\u8bf7\u7a0d\u5019\u2026',
		  'clone.ready': '\u590d\u523b\u5b8c\u6210\uff0c\u5df2\u8bbe\u4e3a\u5f53\u524d\u97f3\u8272\u3002',
		  'clone.readyLocal': '\u5df2\u5b58\u5728\u672c\u673a\u5e76\u8bbe\u4e3a\u5f53\u524d\u97f3\u8272\uff0c\u4e4b\u540e\u6bcf\u6b21\u5408\u6210\u90fd\u4f1a\u590d\u7528\u8fd9\u6bb5\u53c2\u8003\u97f3\u9891\u3002',
		  'clone.failed': '\u97f3\u8272\u590d\u523b\u5931\u8d25',
		  'clone.timeout': '\u7b49\u5f85\u90e8\u7f72\u8d85\u65f6\uff0c\u53ef\u7a0d\u540e\u5728\u5217\u8868\u91cc\u770b\u5b83\u7684\u72b6\u6001\u3002',
		  'clone.noFile': '\u5148\u9009\u4e00\u4e2a\u97f3\u9891\u6587\u4ef6\u3002',
		  'clone.sync': '\u4ece\u4e91\u7aef\u540c\u6b65',
		  'clone.syncing': '\u6b63\u5728\u8bfb\u53d6\u4e91\u7aef\u97f3\u8272\u2026',
		  'clone.synced': '\u5df2\u5bfc\u5165\u4e91\u7aef\u97f3\u8272',
		  'clone.syncedNone': '\u4e91\u7aef\u6ca1\u6709\u65b0\u7684\u97f3\u8272\u3002',
		  'settings.dir': '\u8f93\u51fa\u76ee\u5f55',
		  'settings.dirPlaceholder': '\u7559\u7a7a\u5219\u4f7f\u7528\u63d2\u4ef6\u9ed8\u8ba4\u76ee\u5f55',
		  'settings.boot': '\u6253\u5f00\u9875\u9762\u540e\u64ad\u653e\u4e00\u6b21\u63d0\u793a\u97f3',
		  'settings.preview': '\u8bd5\u542c',
		  'settings.previewText': '\u8fd9\u662f\u4e00\u6b21\u8bed\u97f3\u8bd5\u542c\uff0c\u97f3\u8272\u4e0e\u6a21\u578b\u914d\u7f6e\u6b63\u786e\u5c31\u80fd\u542c\u5230\u8fd9\u53e5\u8bdd\u3002',
		  'settings.open': '\u6253\u5f00\u76ee\u5f55',
		  'settings.clear': '\u6e05\u7a7a\u7f13\u5b58',
		  'settings.cleared': '\u5df2\u6e05\u7a7a',
		  'settings.count': '\u5f53\u524d\u7f13\u5b58',
		  'settings.unconfigured': '\u5c1a\u672a\u914d\u7f6e API Key \u6216\u97f3\u8272 ID\uff0c\u64ad\u653e\u952e\u4f1a\u63d0\u793a\u914d\u7f6e\u3002',
		  'settings.ready': '\u5df2\u914d\u7f6e\uff0c\u53ef\u4ee5\u5f00\u59cb\u6717\u8bfb\u3002',
		  'settings.saved': '\u5df2\u4fdd\u5b58',
		}

		/** \u82f1\u6587\u5b57\u5178\uff0c\u952e\u96c6\u5bf9\u7740 zh \u6821\u6838\u3002 */
		var DICT_EN = {
		  'action.speak': 'Read this reply aloud',
		  'action.retry': 'Retry',
		  'action.stop': 'Stop playback',
		  'action.speaking': 'Playing',
		  'action.synthesizing': 'Synthesizing',
		  'error.missing': 'Could not find the text of this reply',
		  'error.generic': 'Speech synthesis failed',
		  'section.label': 'Voice',
		  'settings.title': 'Voice playback',
		  'settings.hint': 'Every AI reply gets a play button at its end; clicking it reads the reply in the voice you picked. Each voice is bound to its own model: pick a voice and it is synthesized with the model that voice was added with.',
		  'settings.key': 'DashScope API key',
		  'settings.keyPlaceholder': 'sk-... (from the DashScope console)',
		  'settings.keyHint': 'Used by the DashScope CosyVoice models. You can leave it empty if you only use MiMo.',
		  'settings.mimoKey': 'MiMo API key',
		  'settings.mimoKeyPlaceholder': 'sk-... (from the Xiaomi MiMo open platform)',
		  'settings.mimoKeyHint': 'Used by the three MiMo V2.5 TTS models. You can leave it empty if you only use DashScope.',
		  'settings.modelEffective': 'Current voice and model',
		  'settings.mode': 'Synthesis mode',
		  'settings.modeHint': 'Realtime: DashScope streams the voice sentence by sentence, so playback starts as soon as the first sentence is ready. Non-realtime: the whole reply is synthesized first, which keeps the intonation smoothest. Switching takes effect immediately.',
		  'settings.modeOnce': 'Non-realtime (whole reply)',
		  'settings.modeStream': 'Realtime (streaming)',
		  'settings.modeEffective': 'Effective now',
		  'settings.modeUnsaved': 'not saved to config; it reverts after a restart',
		  'settings.modeSaved': 'Switched and saved to config',
		  'settings.modeFailed': 'Switched for this page, but it could not be saved: it reverts after a dsh restart (this session is unaffected)',
		  'settings.voice': 'Default voice ID',
		  'settings.voiceHint': 'Only used while no voice profile exists yet. Once you have profiles, the model follows the profile and this field no longer applies.',
		  'settings.voicePlaceholder': 'Cloned or designed voice ID from the console',
		  'settings.roleplay': 'Role-play mode',
		  'settings.roleplayHint': 'When on, text in \u300c\u300d is treated as speech and the rest as narration. Each is synthesized with its own voice, then joined in the original order \u2014 so you hear narration, then the character, in the same order as the text.',
		  'settings.roleplayOn': 'On',
		  'settings.roleplayOff': 'Off',
		  'settings.roleplaySaved': 'Switched and saved to config',
		  'settings.roleplayFailed': 'Switched for this page, but it could not be saved: it reverts to off after a dsh restart (this session is unaffected)',
		  'settings.narrationVoice': 'Narration voice',
		  'settings.characterVoice': 'Character voice',
		  'settings.roleplayVoiceHint': 'Bind one profile to each \u2014 a profile carries both the voice and its model. Leave empty to follow the active voice. All speech uses this single character profile; several characters in one reply are not told apart yet.',
		  'settings.voiceFollow': 'Follow the active voice',
		  'settings.roleplayVoiceSaved': 'Bound',
		  'settings.roleplayVoiceFailed': 'Applied on this page, but it could not be saved: it reverts to following the active voice after a dsh restart (this session is unaffected)',
		  'settings.previewRoleplayText': 'Narration speaks this sentence first. \u300cThis line is spoken by the character, with the character voice.\u300d Then narration closes it off.',
		  'profiles.title': 'Voice profiles',
		  'profiles.hint': 'A profile is one voice plus one model. Whatever you pick is synthesized with the model bound to it, and the model name is appended to the profile name.',
		  'profiles.empty': 'No voice profiles yet. Add one below, or pick a MiMo built-in voice.',
		  'profiles.add': 'New voice',
		  'profiles.edit': 'Edit',
		  'profiles.save': 'Save',
		  'profiles.cancel': 'Cancel',
		  'profiles.delete': 'Delete',
		  'profiles.use': 'Use',
		  'profiles.current': 'In use',
		  'profiles.namePlaceholder': 'Name, e.g. "My voice"',
		  'profiles.modelHint': 'The model decides what this field asks for: a built-in voice name, a voice ID, or a one-line description.',
		  'profiles.voicePlaceholder': 'Voice ID',
		  'profiles.designPlaceholder': 'A description, e.g. "a gentle, composed female voice, a little slow"',
		  'profiles.needVoice': 'Voice ID cannot be empty.',
		  'profiles.needModel': 'Pick a model first.',
		  'profiles.needDesign': 'Voice design needs a description.',
		  'profiles.cloneViaUpload': 'This model takes its voice from a reference audio clip; upload one under Voice cloning below.',
		  'profiles.sampleLabel': 'sample ',
		  'profiles.builtinTitle': 'MiMo built-in voices',
		  'profiles.builtinHint': 'These voices ship with MiMo. Tick them and add them to your profiles in one go \u2014 no cloning and no IDs to type.',
		  'profiles.builtinAdd': 'Add selected',
		  'profiles.builtinAdded': 'Added',
		  'profiles.builtinAdding': 'Adding\u2026',
		  'profiles.builtinAddedCount': 'Built-in voices added',
		  'profiles.builtinPickNone': 'Tick the voices you want to add first.',
		  'profiles.builtinPickOne': 'Pick a built-in voice',
		  'profiles.lowLatency': 'Not low-latency',
		  'profiles.lowLatencyHint': 'streaming is in compatibility mode for this model, so playback starts only after the whole reply is synthesized',
		  'profiles.pending': 'Enrolling',
		  'profiles.failed': 'Failed',
		  'models.loading': 'Loading the model catalog\u2026',
		  'clone.title': 'Voice cloning',
		  'clone.hint': 'Upload 10-20 seconds of clear speech. With a DashScope model the voice is enrolled in the cloud (which takes a while to deploy); with MiMo the audio is stored on this machine and attached to every synthesis, so it can be reused as often as you like.',
		  'clone.start': 'Clone voice',
		  'clone.uploading': 'Uploading and enrolling\u2026',
		  'clone.pending': 'Deploying the voice, please wait\u2026',
		  'clone.ready': 'Cloned, and now set as the active voice.',
		  'clone.readyLocal': 'Stored on this machine and set as the active voice; every later synthesis reuses this clip.',
		  'clone.failed': 'Voice cloning failed',
		  'clone.timeout': 'Timed out waiting for deployment; check its status in the list later.',
		  'clone.noFile': 'Pick an audio file first.',
		  'clone.sync': 'Sync from cloud',
		  'clone.syncing': 'Reading cloud voices\u2026',
		  'clone.synced': 'Imported cloud voices',
		  'clone.syncedNone': 'No new voices in the cloud.',
		  'settings.dir': 'Output directory',
		  'settings.dirPlaceholder': 'Leave empty for the plugin default',
		  'settings.boot': 'Play a chime once after the page opens',
		  'settings.preview': 'Preview',
		  'settings.previewText': 'This is a voice preview. If the voice and model are configured correctly, you will hear this sentence.',
		  'settings.open': 'Open folder',
		  'settings.clear': 'Clear cache',
		  'settings.cleared': 'Cleared',
		  'settings.count': 'Cached clips',
		  'settings.unconfigured': 'No API key or voice ID yet; the play button will ask you to configure one.',
		  'settings.ready': 'Configured and ready to speak.',
		  'settings.saved': 'Saved',
		}

		// ---- client/message-button.js ----
		/**
		 * \u64ad\u653e\u952e\uff1a\u6302\u5728 `conversation.chat.assistant-actions` \u4e0a\uff0c\u4e8e\u662f\u5b83\u51fa\u73b0\u5728\u6bcf\u6761 AI
		 * \u56de\u7b54\u672b\u5c3e\u90a3\u4e00\u6392\u52a8\u4f5c\u6309\u94ae\u91cc\uff08\u4e0e\u70b9\u8d5e/\u70b9\u8e29\u540c\u4e00\u884c\uff09\u3002
		 *
		 * \u8fd9\u662f v1 \u7684\u5168\u90e8\u4ea4\u4e92\u9762 \u2014\u2014 **\u6ca1\u6709\u7cfb\u7edf\u63d0\u793a\u6ce8\u5165\uff0c\u4e5f\u6ca1\u6709\u7ed9\u6a21\u578b\u7684\u5de5\u5177**\u3002\u6a21\u578b\u4e0d\u77e5\u9053
		 * \u8bed\u97f3\u8fd9\u4ef6\u4e8b\uff0c\u7528\u6237\u70b9\u54ea\u4e2a\u6309\u94ae\u5c31\u8bfb\u54ea\u4e00\u6761\u3002pull \u800c\u4e0d\u662f push\uff0c\u6240\u4ee5\u4e0d\u5b58\u5728"\u63d0\u9192\u4e86\u5b83
		 * \u5374\u4e0d\u8bf4"\u7684\u4e0d\u786e\u5b9a\u6027\u3002
		 *
		 * \u6587\u672c\u4ece chat \u5feb\u7167\u91cc\u53d6\uff08`useChat` \u662f chat \u4e3a session \u7ea7 slot \u58f0\u660e\u7684\u6807\u51c6 prop\uff09\u3002
		 * \u53d6\u4e0d\u5230\u65f6\uff08\u6d88\u606f\u4e0d\u5728\u5df2\u52a0\u8f7d\u7a97\u53e3\u5185\uff09\u628a messageId \u4ea4\u7ed9\u5bbf\u4e3b\u53bb\u89e3\u6790\uff0c\u4e24\u6761\u8def\u90fd\u8d70\u4e0d\u901a
		 * \u624d\u62a5"\u6ca1\u627e\u5230\u6587\u672c"\u3002
		 */

		/** \u56fe\u6807\u7edf\u4e00\u5c3a\u5bf8\uff1a\u4e0e\u5bbf\u4e3b\u90a3\u4e00\u6392\u52a8\u4f5c\u6309\u94ae\u7684\u89c6\u89c9\u91cd\u91cf\u4e00\u81f4\u3002 */
		var ICON = {
		  width: '16',
		  height: '16',
		  viewBox: '0 0 24 24',
		  fill: 'none',
		  stroke: 'currentColor',
		  strokeWidth: '1.8',
		  strokeLinecap: 'round',
		  strokeLinejoin: 'round',
		}

		/**
		 * \u5587\u53ed\u56fe\u6807\uff1a\u5f85\u64ad\u3002
		 * @returns SVG \u5143\u7d20\u3002
		 */
		function IconSpeak() {
		  return React.createElement('svg', ICON,
		    React.createElement('path', { d: 'M11 5 6 9H3v6h3l5 4V5z' }),
		    React.createElement('path', { d: 'M15.5 8.5a5 5 0 0 1 0 7' }),
		    React.createElement('path', { d: 'M18.5 5.5a9 9 0 0 1 0 13' }))
		}

		/**
		 * \u505c\u6b62\u56fe\u6807\uff1a\u64ad\u653e\u4e2d\u3002
		 * @returns SVG \u5143\u7d20\u3002
		 */
		function IconStop() {
		  return React.createElement('svg', ICON,
		    React.createElement('rect', { x: '7', y: '7', width: '10', height: '10', rx: '2', fill: 'currentColor' }))
		}

		/**
		 * \u8f6c\u5708\u56fe\u6807\uff1a\u5408\u6210\u4e2d\u3002\u7528 SVG \u539f\u751f\u52a8\u753b\uff0c\u6240\u4ee5\u4e0d\u9700\u8981\u989d\u5916\u7684\u6837\u5f0f\u8868\u3002
		 * @returns SVG \u5143\u7d20\u3002
		 */
		function IconBusy() {
		  // animateTransform \u5fc5\u987b\u5f85\u5728 <g> \u91cc\uff1aSVG \u7684\u52a8\u753b\u5143\u7d20\u4f5c\u7528\u4e8e\u5176**\u7236\u5143\u7d20**\u3002
		  // \u82e5\u76f4\u63a5\u6302\u5728 <svg> \u4e0b\uff0c\u65cb\u8f6c\u7684\u662f\u6574\u4e2a\u56fe\u6807\uff08\u8fde\u5e26\u5b83\u5728\u6309\u94ae\u91cc\u7684\u4f4d\u7f6e\u4e00\u8d77\u7ed5\u5708\uff09\uff0c
		  // \u770b\u8d77\u6765\u5c31\u662f"\u6574\u4f53\u4e5f\u5728\u8f6c"\u3002\u653e\u8fdb <g> \u540e\u53ea\u6709\u8fd9\u6761\u5f27\u7ed5\u4e2d\u5fc3\u8f6c\u3002
		  return React.createElement('svg', ICON,
		    React.createElement('g', null,
		      React.createElement('path', { d: 'M12 3a9 9 0 1 0 9 9', opacity: '0.85' }),
		      React.createElement('animateTransform', {
		        attributeName: 'transform',
		        type: 'rotate',
		        from: '0 12 12',
		        to: '360 12 12',
		        dur: '0.9s',
		        repeatCount: 'indefinite',
		      })))
		}

		/**
		 * \u64ad\u653e\u952e\u3002
		 * @param props - slot \u8fd0\u884c\u65f6 props\uff08`messageId`\u3001`sessionId`\u3001`useChat`\uff09\u4e0e `t`\u3002
		 * @returns \u4e00\u4e2a\u6309\u94ae\u3002
		 */
		function CosyvoiceSpeakButton(props) {
		  var messageId = props.messageId
		  var sessionId = props.sessionId
		  var useChat = props.useChat
		  var t = props.t

		  var snapshot = usePlayerState()
		  var current = stateOf(snapshot, messageId)
		  var busy = current.phase === 'loading'
		  var playing = current.phase === 'playing'

		  // chat \u6302\u8f7d\u540e\u624d\u4f1a\u6709 useChat\uff1b\u7f3a\u5931\u65f6\u7ec4\u4ef6\u4ecd\u7136\u6e32\u67d3\uff0c\u6587\u672c\u6539\u7531\u5bbf\u4e3b\u89e3\u6790\u3002
		  var text = typeof useChat === 'function'
		    ? useChat(function (chat) { return textOfMessage(chat, messageId) })
		    : undefined

		  var label = playing
		    ? t('action.stop')
		    : busy
		      ? t('action.synthesizing')
		      : t('action.speak')

		  var title = current.phase === 'error' && current.message !== undefined
		    ? current.message
		    : label

		  /**
		   * \u70b9\u51fb\uff1a\u64ad\u653e\u4e2d\u5373\u505c\u6b62\uff0c\u5426\u5219\u53d6\u6587\u672c \u2192 \u5408\u6210 \u2192 \u64ad\u653e\u3002
		   */
		  function onActivate() {
		    if (playing) {
		      player.stop()
		      return
		    }
		    if (busy) return
		    // \u8bf4\u8bdd\u5feb\u6162\u7531\u670d\u52a1\u7aef\u5b9a\uff1a\u6574\u6bb5\u6a21\u5f0f\u7b49\u4e00\u6b21\u5408\u6210\u5b8c\u518d\u54cd\uff0c\u5b9e\u65f6\u6a21\u5f0f\u7b2c\u4e00\u53e5\u597d\u4e86\u5c31\u51fa\u58f0\u3002
		    // \u4e24\u79cd\u60c5\u51b5\u5171\u7528\u8fd9\u4e00\u4e2a\u5165\u53e3\uff0c\u56e0\u4e3a\u5b83\u6309\u54cd\u5e94\u7684 content-type \u81ea\u5df1\u5206\u5c94\u3002
		    speakAs('speak-message', {
		      messageId: messageId,
		      sessionId: sessionId,
		      text: typeof text === 'string' ? text : '',
		    }, messageId)
		  }

		  var glyph = playing ? React.createElement(IconStop) : busy ? React.createElement(IconBusy) : React.createElement(IconSpeak)

		  return React.createElement('button', {
		    type: 'button',
		    'aria-label': title,
		    'aria-pressed': playing,
		    'data-active': playing || undefined,
		    'data-busy': busy || undefined,
		    title: title,
		    onClick: onActivate,
		    style: {
		      display: 'inline-flex',
		      alignItems: 'center',
		      justifyContent: 'center',
		      width: '28px',
		      height: '28px',
		      padding: '0',
		      borderRadius: '6px',
		      border: '1px solid ' + (playing ? T.accent : 'transparent'),
		      background: playing ? T.panel : 'transparent',
		      color: current.phase === 'error' ? '#d93025' : T.textDim,
		      cursor: busy ? 'progress' : 'pointer',
		      opacity: busy ? '0.6' : '1',
		      transition: 'background-color .12s, color .12s',
		    },
		  }, glyph)
		}

		// ---- client/settings-page.js ----
		/**
		 * \u8bbe\u7f6e\u9875\uff1a\u6302\u5728 `settings.section` \u4e0a\uff0c\u63d0\u4f9b\u4e00\u4e2a\u300c\u8bed\u97f3\u300d\u5206\u533a\u3002
		 *
		 * \u9875\u9762\u81ea\u5df1\u753b\u8868\u5355\u800c\u4e0d\u662f\u4f9d\u8d56\u81ea\u52a8\u751f\u6210\u7684\u90a3\u4e00\u5957\uff0c\u56e0\u4e3a\u8fd9\u91cc\u6709\u51e0\u4ef6\u81ea\u52a8\u8868\u5355\u505a\u4e0d\u5230\u7684\u4e8b\uff1a
		 * **\u8bd5\u542c**\uff08\u8981\u8d70\u4e00\u6b21\u771f\u5b9e\u5408\u6210\uff09\u3001**\u6253\u5f00\u8f93\u51fa\u76ee\u5f55**\u3001**\u6e05\u7a7a\u7f13\u5b58**\u3002\u524d\u4e24\u9879\u662f\u5bbf\u4e3b\u8def\u7531
		 * \u4e0a\u7684\u526f\u4f5c\u7528\uff0c\u4e0d\u662f\u5b57\u6bb5\u5199\u5165\u3002
		 *
		 * \u5b57\u6bb5\u8bfb\u5199\u8d70 `ctx.configForms`\uff1a\u5b83\u6309 entry id \u62ff\u5230\u672c\u63d2\u4ef6\u7684\u914d\u7f6e\u955c\u50cf\uff0c\u5199\u5165\u662f\u300c\u6309\u8def\u5f84
		 * \u7684\u589e\u91cf\u7f16\u8f91\u300d\uff0c\u6240\u4ee5\u672c\u9875\u6c38\u8fdc\u62ff\u4e0d\u5230\u88ab\u8131\u654f\u7684 API Key \u660e\u6587\uff0c\u4e5f\u5c31\u4e0d\u4f1a\u5728\u63d0\u4ea4\u65f6\u628a\u5b83
		 * \u62b9\u6389 \u2014\u2014 \u4e00\u4e2a\u53ea\u8bfb\u5230\u63a9\u7801\u7684\u9875\u9762\u82e5\u6574\u4efd\u56de\u5199\uff0c\u4f1a\u9759\u9ed8\u5220\u6389\u7528\u6237\u5b58\u597d\u7684 Key\u3002
		 *
		 * ## \u8fd9\u4e00\u9875\u6700\u91cd\u8981\u7684\u4e00\u6761\u8bbe\u8ba1\uff1a\u97f3\u8272\u5373\u6a21\u578b
		 *
		 * \u8fd9\u91cc**\u6ca1\u6709**"\u9009\u4e00\u4e2a\u6a21\u578b"\u7684\u5168\u5c40\u5f00\u5173\u3002\u6a21\u578b\u662f**\u6bcf\u5957\u97f3\u8272\u6863\u6848\u81ea\u5e26**\u7684\uff1a\u9009\u54ea\u5957\u97f3\u8272\uff0c\u5c31
		 * \u7528\u5b83\u81ea\u5df1\u7ed1\u5b9a\u7684\u90a3\u6b3e\u6a21\u578b\u5408\u6210\uff08\u670d\u52a1\u7aef\u5728 `host/synth.js` \u91cc\u6309\u6863\u6848\u5206\u6d3e\uff09\u3002\u4e8e\u662f\uff1a
		 *
		 * - \u300c\u65b0\u589e\u97f3\u8272\u300d\u4e0e\u300c\u97f3\u8272\u514b\u9686\u300d\u8868\u5355\u91cc\u90fd\u6709\u4e00\u4e2a**\u6a21\u578b\u5217\u8868**\uff0c\u9009\u5b8c\u5b83\uff0c\u8868\u5355\u7684\u5176\u4f59\u8f93\u5165\u6846
		 *   \u4f1a\u6309\u8fd9\u6b3e\u6a21\u578b\u7684\u97f3\u8272\u6765\u6e90\uff08\u5185\u7f6e / \u590d\u523b / \u8bbe\u8ba1\uff09\u6574\u6bb5\u6362\u6389\u2014\u2014\u7528\u6237\u4e0d\u9700\u8981\u77e5\u9053\u81ea\u5df1\u586b\u7684
		 *   \u5230\u5e95\u662f\u97f3\u8272 ID\u3001\u97f3\u8272\u540d\u8fd8\u662f\u4e00\u53e5\u63cf\u8ff0\uff1b
		 * - \u6863\u6848\u540d\u7531\u670d\u52a1\u7aef\u628a\u6a21\u578b\u540d\u4f5c\u4e3a\u540e\u7f00\u9644\u5728\u672b\u5c3e\uff08`decorateName`\uff09\uff0c\u6240\u4ee5"\u8fd9\u5957\u97f3\u8272\u5c5e\u4e8e
		 *   \u54ea\u6b3e\u6a21\u578b"\u5728\u5217\u8868\u4e0a\u4e00\u773c\u53ef\u89c1\uff1b
		 * - MiMo \u7684\u5185\u7f6e\u97f3\u8272\uff08`mimo_default`\u3001\u51b0\u7cd6\u3001\u8309\u8389\u2026\u2026\uff09\u662f\u53ef\u4ee5**\u52fe\u9009\u6dfb\u52a0**\u7684\u73b0\u6210\u97f3\u8272\uff0c
		 *   \u4e0d\u9700\u8981\u8d70\u590d\u523b\u4e5f\u4e0d\u9700\u8981\u624b\u586b ID\u3002
		 *
		 * \u6a21\u578b\u6e05\u5355\u4e0e\u5185\u7f6e\u97f3\u8272\u6e05\u5355\u90fd\u4ece `GET /models` \u62ff\uff08\u670d\u52a1\u7aef `host/models.js` \u662f\u552f\u4e00\u4e8b\u5b9e
		 * \u6765\u6e90\uff09\uff0c\u524d\u7aef**\u4e0d\u590d\u5236\u4e00\u4efd**\u2014\u2014\u5426\u5219"\u9875\u9762\u4e0a\u80fd\u9009\u5230\u4ec0\u4e48"\u8fdf\u65e9\u4e0e\u670d\u52a1\u7aef\u8ba4\u5f97\u7684\u6a21\u578b\u5bf9\u4e0d\u4e0a\uff0c
		 * \u800c\u5bf9\u4e0d\u4e0a\u7684\u540e\u679c\u662f"\u9009\u4e86\u4e00\u4e2a\u8fd9\u91cc\u6ca1\u6709\u7684\u6a21\u578b\uff0c\u5408\u6210\u65f6\u62a5 404"\u3002
		 */

		/** \u4e00\u884c\u8bbe\u7f6e\uff1a\u6807\u7b7e\u5217 + \u5185\u5bb9\u5217\u3002 */
		var ROW = {
		  display: 'flex',
		  alignItems: 'center',
		  gap: '8px',
		  padding: '14px 0',
		  borderBottom: '1px solid ' + T.borderSoft,
		}

		/** \u6807\u7b7e\u5217\u3002 */
		var ROW_LABEL = {
		  flex: 'none',
		  width: '96px',
		  fontSize: '13px',
		  lineHeight: '20px',
		  color: T.textDim,
		}

		/** \u5185\u5bb9\u5217\u3002 */
		var ROW_BODY = {
		  flex: '1',
		  minWidth: '0',
		  display: 'flex',
		  alignItems: 'center',
		  gap: '8px',
		}

		/** \u6587\u672c\u8f93\u5165\u6846\uff0c\u5bf9\u9f50\u5bbf\u4e3b\u81ea\u5df1\u7684\u884c\u6837\u5f0f\u3002 */
		var INPUT = {
		  flex: '1',
		  minWidth: '0',
		  padding: '6px 9px',
		  borderRadius: '6px',
		  border: '1px solid ' + T.border,
		  background: 'var(--dsw-alias-bg-layer-1, transparent)',
		  color: T.text,
		  font: 'inherit',
		  fontSize: '12px',
		  fontFamily: 'monospace',
		  boxSizing: 'border-box',
		}

		/** \u6b21\u7ea7\u6309\u94ae\u3002 */
		var BUTTON = {
		  flex: 'none',
		  padding: '6px 12px',
		  borderRadius: '6px',
		  border: '1px solid ' + T.border,
		  background: 'transparent',
		  color: T.text,
		  font: 'inherit',
		  fontSize: '12px',
		  cursor: 'pointer',
		}

		/** \u884c\u4e0b\u65b9\u7684\u8bf4\u660e\u6587\u5b57\u3002 */
		var HINT = {
		  fontSize: '12px',
		  lineHeight: '18px',
		  color: T.textFaint,
		  padding: '2px 0 10px',
		}

		/** \u539f\u751f\u590d\u9009\u6846\uff0c\u7528\u54c1\u724c\u8272\u7740\u8272\u3002 */
		var CHECKBOX = {
		  width: '18px',
		  height: '18px',
		  margin: '0',
		  cursor: 'pointer',
		  accentColor: T.accent,
		}

		/** \u6863\u6848\u5217\u8868\u91cc\u7684\u4e00\u884c\u3002 */
		var PROFILE_ROW = {
		  display: 'flex',
		  alignItems: 'center',
		  gap: '8px',
		  padding: '7px 10px',
		  borderRadius: '6px',
		  border: '1px solid ' + T.borderSoft,
		  marginBottom: '6px',
		  background: 'var(--dsw-alias-bg-layer-1, transparent)',
		}

		/** \u6863\u6848\u884c\u91cc\u7684\u5c0f\u6309\u94ae\uff1a\u4e00\u884c\u6324\u4e86\u56db\u4e2a\u52a8\u4f5c\uff0c\u7528\u4e0d\u7740\u4e3b\u6309\u94ae\u7684\u4f53\u578b\u3002 */
		var MINI_BUTTON = {
		  flex: 'none',
		  padding: '3px 8px',
		  borderRadius: '5px',
		  border: '1px solid ' + T.border,
		  background: 'transparent',
		  color: T.textDim,
		  font: 'inherit',
		  fontSize: '11px',
		  cursor: 'pointer',
		}

		/** \u5408\u6210\u6a21\u5f0f\u5207\u6362\u91cc\u7684\u4e00\u4e2a\u6309\u94ae\u3002 */
		var MODE_BUTTON = {
		  flex: 'none',
		  padding: '5px 14px',
		  borderRadius: '6px',
		  border: '1px solid ' + T.border,
		  background: 'transparent',
		  color: T.textDim,
		  font: 'inherit',
		  fontSize: '12px',
		  cursor: 'pointer',
		}

		/** \u6a21\u5f0f\u5207\u6362\u91cc\u9009\u4e2d\u7684\u90a3\u4e00\u534a\uff1a\u7528\u54c1\u724c\u8272\u63cf\u8fb9 + \u5e95\u8272\uff0c\u4e00\u773c\u770b\u5f97\u51fa\u5f53\u524d\u662f\u54ea\u79cd\u3002 */
		var MODE_BUTTON_ACTIVE = {
		  flex: 'none',
		  padding: '5px 14px',
		  borderRadius: '6px',
		  border: '1px solid ' + T.accent,
		  background: T.panel,
		  color: T.text,
		  font: 'inherit',
		  fontSize: '12px',
		  cursor: 'default',
		}

		/**
		 * \u4e0b\u62c9\u6846\uff1a\u6a21\u578b\u9009\u62e9\u3001\u97f3\u8272\u7ed1\u5b9a\u3001\u590d\u523b\u6a21\u578b\u90fd\u7528\u5b83\u3002
		 *
		 * \u4e09\u5904\u7684\u53ef\u9009\u503c\u90fd\u662f\u4e00\u4e2a**\u6709\u9650\u96c6**\uff08\u670d\u52a1\u7aef\u8ba4\u53ef\u7684\u6a21\u578b\u3001\u5df2\u4fdd\u5b58\u7684\u6863\u6848\uff09\uff0c\u6240\u4ee5\u4e00\u5f8b\u505a\u6210
		 * \u5217\u8868\u800c\u4e0d\u662f\u81ea\u7531\u6587\u672c\uff1a\u624b\u586b\u6a21\u578b\u540d\u7684\u540e\u679c\u662f"\u586b\u9519\u4e86\u4f46\u770b\u4e0d\u51fa\u6765"\uff0c\u800c\u767e\u70bc\u4f1a\u76f4\u63a5\u62d2\u7edd\u8bf7\u6c42\u3001
		 * MiMo \u4f1a\u62a5\u4e00\u4e2a\u66f4\u8d39\u89e3\u7684\u9519\u3002
		 */
		var SELECT = {
		  flex: '1',
		  minWidth: '0',
		  height: '28px',
		  padding: '0 6px',
		  borderRadius: '6px',
		  border: '1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.24))',
		  background: 'transparent',
		  color: 'var(--dsw-alias-label-primary, inherit)',
		  fontSize: '13px',
		}

		/** \u6863\u6848\u540d\u4e0b\u9762\u90a3\u884c\u7b49\u5bbd\u5c0f\u5b57\uff08\u97f3\u8272\u51ed\u636e + \u6a21\u578b\uff09\u3002 */
		var PROFILE_META = {
		  fontSize: '11px',
		  lineHeight: '16px',
		  color: T.textFaint,
		  fontFamily: 'monospace',
		  overflow: 'hidden',
		  textOverflow: 'ellipsis',
		  whiteSpace: 'nowrap',
		}

		/** \u4e00\u4e2a\u5757\u7684\u5c0f\u6807\u9898\uff08\u97f3\u8272\u6863\u6848 / \u514b\u9686 / \u5185\u7f6e\u97f3\u8272\u2026\uff09\u3002 */
		var BLOCK_TITLE = {
		  fontSize: '13px',
		  lineHeight: '20px',
		  color: T.text,
		}

		/**
		 * \u8ba2\u9605\u4e00\u4e2a\u914d\u7f6e\u955c\u50cf\u3002
		 * @param form - `configForms` \u7ed9\u51fa\u7684\u8868\u5355\u63a7\u5236\u5668\u3002
		 * @returns `[\u5feb\u7167, \u5199\u5b57\u6bb5]`\u3002
		 */
		function useConfigForm(form) {
		  var pair = React.useState(function () { return form.getSnapshot() })
		  var snapshot = pair[0]
		  var setSnapshot = pair[1]
		  React.useEffect(function () {
		    setSnapshot(form.getSnapshot())
		    return form.subscribe(function () { setSnapshot(form.getSnapshot()) })
		  }, [form])
		  const write = React.useCallback(function (field, value) {
		    form.set(field, value).catch(function () {})
		  }, [form])
		  return [snapshot, write]
		}

		/**
		 * \u8bed\u97f3\u8bbe\u7f6e\u9875\u3002
		 * @param props - `t`\uff08\u672c\u63d2\u4ef6\u5b57\u5178\uff09\u3001`close`\uff08\u5bbf\u4e3b\u7ed9\u7684\u5173\u95ed\u52a8\u4f5c\uff09\u4e0e\u6ce8\u5165\u7684\u8868\u5355\u3002
		 * @returns \u9875\u9762\u5185\u5bb9\u3002
		 */
		function CosyvoiceSettingsPage(props) {
		  var t = props.t
		  var form = props.form

		  var pair = useConfigForm(form)
		  var snapshot = pair[0]
		  var write = pair[1]

		  var value = (snapshot && snapshot.value) || {}
		  var user = (snapshot && snapshot.user) || {}
		  var hasSecret = Object.prototype.hasOwnProperty.call(user, 'apiKey')
		  var hasMimoSecret = Object.prototype.hasOwnProperty.call(user, 'mimoApiKey')
		  // \u5408\u6210\u65b9\u5f0f\u6709\u4e24\u4e2a\u6765\u6e90\uff1a**\u672c\u5730\u90a3\u4e00\u4efd\u4f18\u5148** \u2014\u2014 \u5b83\u662f"\u70b9\u4e86\u8fd9\u4e00\u6b21"\u7684\u7ed3\u679c\uff0c\u800c\u914d\u7f6e
		  // \u955c\u50cf\u8981\u7b49\u5bbf\u4e3b\u628a\u5199\u5165\u8dd1\u5b8c\u624d\u53d8\u3002\u4e8e\u662f\u5207\u6362\u5f53\u573a\u5c31\u80fd\u770b\u89c1\uff0c\u5199\u914d\u7f6e\u5931\u8d25\u4e5f\u4e0d\u4f1a\u628a\u6309\u94ae
		  // \u53d8\u6210"\u70b9\u4e86\u6ca1\u53cd\u5e94"\u3002
		  var modeState = React.useState(readMode())
		  var setMode = modeState[1]
		  // \u6ca1\u5728\u672c\u5730\u9009\u8fc7\uff08\u521d\u6b21\u5b89\u88c5\uff09\u65f6\uff0c\u4ee5\u914d\u7f6e\u955c\u50cf\u4e3a\u51c6\uff1b\u4e4b\u540e\u4e00\u5f8b\u542c\u672c\u5730\u90a3\u4e00\u4efd\u3002
		  var mode = modeState[0] === ''
		    ? (String(value.mode || '') === 'stream' ? 'stream' : 'one-shot')
		    : modeState[0]

		  // \u89d2\u8272\u626e\u6f14\uff1a\u4e0e\u5408\u6210\u65b9\u5f0f\u540c\u4e00\u5957\u5904\u7406\u65b9\u5f0f \u2014\u2014 \u672c\u673a\u90a3\u4e00\u4efd\u4f18\u5148\uff0c\u914d\u7f6e\u955c\u50cf\u662f"\u6ca1\u9009\u8fc7\u65f6"
		  // \u7684\u9ed8\u8ba4\u503c\u3002\u7ed1\u5b9a\u97f3\u8272\u540c\u7406\uff0c\u552f\u4e00\u533a\u522b\u662f\u5b83\u8fd8\u8981\u533a\u5206"\u6ca1\u9009\u8fc7\uff08null\uff09"\u4e0e"\u9009\u4e86\u8ddf\u968f
		  // \uff08\u7a7a\u4e32\uff09"\uff0c\u5426\u5219\u9009\u4e86\u8ddf\u968f\u4e4b\u540e\u4e0b\u4e00\u6b21\u6253\u5f00\u53c8\u4f1a\u8df3\u56de\u914d\u7f6e\u91cc\u90a3\u4e2a\u503c\u3002
		  var roleState = React.useState(readRoleplay())
		  var setRoleLocal = roleState[1]
		  var roleplayOn = roleState[0] === ''
		    ? value.roleplay === true
		    : roleState[0] === 'true'

		  // \u7ed1\u7684\u662f**\u6863\u6848 id** \u800c\u4e0d\u662f\u97f3\u8272 ID\uff1a\u6a21\u578b\u8ddf\u7740\u6863\u6848\u8d70\uff0c\u53ea\u7ed1\u97f3\u8272\u5c31\u4e22\u4e86"\u7528\u54ea\u6b3e\u6a21\u578b"
		  // \u8fd9\u4e2a\u4fe1\u606f\uff08\u540c\u4e00\u4e2a\u97f3\u8272 ID \u5728\u4e0d\u540c\u6a21\u578b\u4e0b\u672a\u5fc5\u662f\u540c\u4e00\u4e2a\u55d3\u5b50\uff09\u3002
		  var narrationState = React.useState(readNarrationProfile())
		  var setNarrationLocal = narrationState[1]
		  var narrationProfile = narrationState[0] === null || narrationState[0] === undefined
		    ? String(value.narrationProfileId || '')
		    : narrationState[0]

		  var characterState = React.useState(readCharacterProfile())
		  var setCharacterLocal = characterState[1]
		  var characterProfile = characterState[0] === null || characterState[0] === undefined
		    ? String(value.characterProfileId || '')
		    : characterState[0]

		  var statusState = React.useState(null)
		  var status = statusState[0]
		  var setStatus = statusState[1]

		  var countState = React.useState(null)
		  var count = countState[0]
		  var setCount = countState[1]

		  // \u6863\u6848\u6e05\u5355**\u4e0d**\u8d70 configForms\uff1a\u5b83\u662f\u63d2\u4ef6\u81ea\u7ba1\u7684\u4e00\u4e2a JSON\uff08\u89c1 host/profiles.js\uff09\uff0c
		  // \u914d\u7f6e\u955c\u50cf\u91cc\u6ca1\u6709\u5b83\u3002\u4e8e\u662f\u8fd9\u91cc\u81ea\u5df1\u62c9\u3001\u81ea\u5df1\u5b58\uff0c\u5199\u64cd\u4f5c\u56de\u5305\u91cc\u5e26\u4e00\u4efd\u65b0\u6e05\u5355\uff0c
		  // \u7701\u6389\u4e00\u6b21\u5f80\u8fd4\u4e5f\u8ba9\u5217\u8868\u548c"\u5f53\u524d\u97f3\u8272"\u6c38\u8fdc\u540c\u4e00\u62cd\u3002
		  var profilesState = React.useState(null)
		  var profileData = profilesState[0]
		  var setProfileData = profilesState[1]

		  /**
		   * \u6a21\u578b\u76ee\u5f55 + MiMo \u5185\u7f6e\u97f3\u8272\uff0c\u6765\u81ea `GET /models`\u3002
		   *
		   * \u62c9\u4e0d\u5230\u65f6 `models` \u662f\u7a7a\u6570\u7ec4\uff1a\u9875\u9762\u4ecd\u7136\u6e32\u67d3\uff08\u5176\u4ed6\u8bbe\u7f6e\u7167\u5e38\u53ef\u7528\uff09\uff0c\u53ea\u662f\u6a21\u578b\u9009\u62e9
		   * \u53d8\u6210\u4e00\u4e2a\u53ea\u6709"\u6682\u4e0d\u53ef\u7528"\u7684\u5217\u8868\u3002\u7528\u4e00\u4e2a\u7a7a\u5217\u8868\u800c\u4e0d\u662f\u6574\u9875\u62a5\u9519\uff0c\u662f\u56e0\u4e3a\u6a21\u578b\u76ee\u5f55\u53ea
		   * \u5f71\u54cd"\u65b0\u589e\u97f3\u8272"\u8fd9\u4e00\u4ef6\u4e8b\uff0c\u4e0d\u8be5\u8ba9\u5b83\u628a\u8bd5\u542c\u3001\u6e05\u7f13\u5b58\u8fd9\u4e9b\u65e0\u5173\u529f\u80fd\u4e00\u8d77\u62d6\u6b7b\u3002
		   */
		  var catalogState = React.useState(null)
		  var catalog = catalogState[0]
		  var setCatalog = catalogState[1]

		  /** \u6b63\u5728\u7f16\u8f91\u7684\u8349\u7a3f\uff1b`editId` \u4e3a\u7a7a\u8868\u793a"\u65b0\u589e"\u800c\u4e0d\u662f"\u6539\u8fd9\u4e00\u5957"\u3002 */
		  var draftState = React.useState({ name: '', model: '', voiceId: '', designPrompt: '' })
		  var draft = draftState[0]
		  var setDraft = draftState[1]

		  var editIdState = React.useState('')
		  var editId = editIdState[0]
		  var setEditId = editIdState[1]

		  /** \u5f85\u4e0a\u4f20\u7684\u97f3\u9891\u6587\u4ef6\u3002 */
		  var fileState = React.useState(null)
		  var file = fileState[0]
		  var setFile = fileState[1]

		  /** \u514b\u9686\u7528\u7684\u6a21\u578b\uff1a\u4e0e\u8349\u7a3f\u91cc\u7684\u6a21\u578b\u662f**\u4e24\u4ef6\u4e8b**\uff08\u590d\u523b\u8d70\u7684\u662f\u53e6\u4e00\u6761\u94fe\u8def\uff09\u3002 */
		  var cloneModelState = React.useState('')
		  var cloneModel = cloneModelState[0]
		  var setCloneModel = cloneModelState[1]

		  /** \u5185\u7f6e\u97f3\u8272\u91cc\u88ab\u52fe\u4e0a\u7684\u90a3\u4e9b\uff0c\u952e\u662f\u97f3\u8272 id\u3002 */
		  var pickedState = React.useState({})
		  var picked = pickedState[0]
		  var setPicked = pickedState[1]

		  /** \u514b\u9686/\u540c\u6b65\u8fd9\u5757\u7684\u8fdb\u5ea6\u63d0\u793a\uff1b\u4e0e\u9875\u9762\u5e95\u90e8\u7684 status \u5206\u5f00\uff0c\u56e0\u4e3a\u5b83\u4fe1\u606f\u91cf\u66f4\u5927\u3002 */
		  var cloneState = React.useState(null)
		  var cloneNote = cloneState[0]
		  var setCloneNote = cloneState[1]

		  /** \u76ee\u5f55\u8fd8\u6ca1\u5230\u65f6\uff0c\u5148\u6309"\u767e\u70bc + \u590d\u523b\u97f3\u8272"\u5904\u7406\u2014\u2014\u4e0e `host/models.js` \u7684\u56de\u9000\u4e00\u81f4\u3002 */
		  var modelList = catalog === null || catalog === undefined || !Array.isArray(catalog.models) ? [] : catalog.models
		  var builtinList = catalog === null || catalog === undefined || !Array.isArray(catalog.builtinVoices) ? [] : catalog.builtinVoices

		  /**
		   * \u5728\u76ee\u5f55\u91cc\u67e5\u4e00\u4e2a\u6a21\u578b\u3002
		   * @param id - \u6a21\u578b\u540d\u3002
		   * @returns \u76ee\u5f55\u6761\u76ee\uff1b\u67e5\u4e0d\u5230\u65f6\u8fd4\u56de undefined\uff08**\u4e0d**\u5728\u8fd9\u91cc\u9020\u4e00\u4e2a\u5047\u6761\u76ee\uff09\u3002
		   */
		  function modelEntry(id) {
		    for (var i = 0; i < modelList.length; i++) {
		      if (modelList[i].id === id) return modelList[i]
		    }
		    return undefined
		  }

		  /**
		   * \u67d0\u4e00\u7c7b\u97f3\u8272\u7684\u6a21\u578b\uff08\u97f3\u8272\u6765\u6e90\u51b3\u5b9a\u7528\u6237\u8981\u586b\u4ec0\u4e48\uff0c\u6240\u4ee5\u8868\u5355\u8981\u6309\u5b83\u6362\u8f93\u5165\u6846\uff09\u3002
		   * @param kind - `preset` / `clone` / `design`\u3002
		   * @returns \u5339\u914d\u7684\u6a21\u578b\u6761\u76ee\u6570\u7ec4\u3002
		   */
		  function modelsOfKind(kind) {
		    return modelList.filter(function (item) { return item.kind === kind })
		  }

		  /** \u8349\u7a3f\u91cc\u90a3\u6b3e\u6a21\u578b\u7684\u97f3\u8272\u6765\u6e90\uff1b\u76ee\u5f55\u91cc\u6ca1\u6709\u5b83\u65f6\u6309"\u590d\u523b"\u5904\u7406\u3002 */
		  function draftKind() {
		    var entry = modelEntry(draft.model)
		    return entry === undefined ? 'clone' : entry.kind
		  }

		  /** \u8349\u7a3f\u91cc\u90a3\u6b3e\u6a21\u578b\u662f\u4e0d\u662f MiMo \u7684\u3002 */
		  function draftIsMimo() {
		    var entry = modelEntry(draft.model)
		    return entry !== undefined && entry.provider === 'mimo'
		  }

		  /**
		   * \u4e00\u5957\u6863\u6848\u73b0\u5728\u80fd\u4e0d\u80fd\u771f\u7684\u62ff\u6765\u5408\u6210\u3002
		   *
		   * \u4e09\u79cd\u6863\u6848\u7684"\u80fd\u7528"\u662f\u4e09\u4ef6\u4e0d\u540c\u7684\u4e8b\uff0c\u5c11\u5224\u4efb\u4f55\u4e00\u4ef6\u90fd\u4f1a\u8ba9\u7528\u6237\u9009\u4e2d\u4e00\u5957\u6ce8\u5b9a\u5931\u8d25\u7684\u6863\u6848\uff1a
		   *
		   * - **\u8fd8\u5728\u90e8\u7f72**\uff08\u767e\u70bc\u590d\u523b\u8981\u7b49\u97f3\u8272\u4e0a\u7ebf\uff09\u2014\u2014`voiceId` \u662f\u6709\u7684\uff0c\u4f46\u62ff\u53bb\u5408\u6210\u4f1a\u88ab\u62d2\uff1b
		   * - **\u51ed\u636e\u7f3a\u5931**\u2014\u2014MiMo \u590d\u523b\u7684\u51ed\u636e\u662f**\u672c\u5730\u53c2\u8003\u97f3\u9891**\u800c\u4e0d\u662f\u97f3\u8272 ID\uff08\u5b83\u6ca1\u6709\u97f3\u8272 ID
		   *   \u53ef\u6301\u6709\uff09\uff0c\u6240\u4ee5\u5224\u5b9a\u5fc5\u987b\u770b `sample`\uff1b
		   * - **\u63cf\u8ff0\u4e3a\u7a7a**\uff08\u97f3\u8272\u8bbe\u8ba1\uff09\u3002
		   * @param profile - \u6863\u6848\u3002
		   * @returns \u662f\u5426\u53ef\u7528\u3002
		   */
		  function isUsable(profile) {
		    if (profile.status !== undefined && profile.status !== '' && profile.status !== 'ready') return false
		    if (profile.sample !== undefined && profile.sample !== null && profile.sample !== '') return true
		    return String(profile.voiceId || '') !== '' || String(profile.designPrompt || '') !== ''
		  }

		  /** \u76ee\u5f55\u5230\u4e86\u4e4b\u540e\u7ed9\u8349\u7a3f\u4e0e\u590d\u523b\u5404\u6311\u4e00\u4e2a\u9ed8\u8ba4\u6a21\u578b\u2014\u2014\u4f46**\u4e0d\u8986\u76d6\u7528\u6237\u5df2\u7ecf\u9009\u7684**\u3002 */
		  React.useEffect(function () {
		    if (modelList.length === 0) return
		    if (draft.model === '') {
		      setDraft(function (prev) { return prev.model === '' ? { ...prev, model: modelList[0].id } : prev })
		    }
		    if (cloneModel === '') {
		      var clones = modelList.filter(function (item) { return item.kind === 'clone' })
		      if (clones.length > 0) setCloneModel(clones[0].id)
		    }
		  }, [catalog])

		  /** \u62c9\u6863\u6848\u6e05\u5355\u4e0e\u6a21\u578b\u76ee\u5f55\u3002 */
		  function refreshAll() {
		    rpc('profiles').then(function (res) {
		      if (res === undefined || !res.ok) return
		      setProfileData({ profiles: res.profiles || [], activeId: res.activeId || '' })
		    })
		    rpc('models').then(function (res) {
		      if (res === undefined || !res.ok) return
		      setCatalog({ models: res.models || [], builtinVoices: res.builtinVoices || [] })
		    })
		  }

		  React.useEffect(function () { refreshAll() }, [])

		  /**
		   * \u6539\u8349\u7a3f\u7684\u4e00\u4e2a\u5b57\u6bb5\u3002
		   *
		   * \u6362\u6a21\u578b\u65f6\u628a\u97f3\u8272\u51ed\u636e\u4e00\u8d77\u6e05\u7a7a\uff1a\u4e0a\u4e00\u6b3e\u6a21\u578b\u8981\u7684\u662f\u97f3\u8272 ID\u3001\u8fd9\u4e00\u6b3e\u8981\u7684\u53ef\u80fd\u662f\u5185\u7f6e\u97f3\u8272\u540d
		   * \u6216\u4e00\u53e5\u63cf\u8ff0\uff0c\u7559\u7740\u65e7\u503c\u5c31\u4f1a\u5b58\u4e0b\u4e00\u5957"\u6a21\u578b\u4e0e\u51ed\u636e\u4e0d\u5339\u914d"\u7684\u6863\u6848\u2014\u2014\u800c\u8fd9\u79cd\u6863\u6848\u80fd\u521b\u5efa\u6210\u529f\u3001
		   * \u53ea\u662f\u5408\u6210\u65f6\u62a5\u4e00\u4e2a\u6beb\u65e0\u4fe1\u606f\u91cf\u7684\u9519\u3002
		   * @param key - \u5b57\u6bb5\u540d\u3002
		   * @param value - \u5b57\u6bb5\u503c\u3002
		   * @param keep - \u4e3a\u771f\u65f6\u4e0d\u6e05\u7a7a\u97f3\u8272\u51ed\u636e\uff08\u6539\u540d\u79f0\u65f6\u7528\uff09\u3002
		   */
		  function setDraftField(key, value, keep) {
		    setDraft(function (prev) {
		      if (keep) return { ...prev, [key]: value }
		      return { ...prev, [key]: value, voiceId: '', designPrompt: '' }
		    })
		  }

		  /** \u6e05\u7a7a\u8349\u7a3f\u3002 */
		  function resetDraft() {
		    var fallbackModel = modelList.length === 0 ? '' : modelList[0].id
		    setDraft({ name: '', model: fallbackModel, voiceId: '', designPrompt: '' })
		    setEditId('')
		  }

		  /** \u542f\u7528\u4e00\u5957\u6863\u6848\u3002 */
		  function useProfile(id) {
		    rpc('profiles/activate', { id: id }).then(function (res) {
		      if (res === undefined || !res.ok) {
		        setStatus({ kind: 'error', message: (res && res.message) || t('error.generic') })
		        return
		      }
		      setProfileData({ profiles: res.profiles || [], activeId: res.activeId || '' })
		      setStatus({ kind: 'ok', message: t('settings.saved') })
		    })
		  }

		  /** \u5220\u9664\u4e00\u5957\u6863\u6848\u3002 */
		  function removeProfile(id) {
		    rpc('profiles', { id: id }, 'DELETE').then(function (res) {
		      if (res === undefined || !res.ok) {
		        setStatus({ kind: 'error', message: (res && res.message) || t('error.generic') })
		        return
		      }
		      setProfileData({ profiles: res.profiles || [], activeId: res.activeId || '' })
		      if (editId === id) resetDraft()
		      setStatus({ kind: 'ok', message: t('settings.saved') })
		    })
		  }

		  /**
		   * \u4fdd\u5b58\u8349\u7a3f\uff1a\u6709 editId \u662f\u66f4\u65b0\uff0c\u6ca1\u6709\u662f\u65b0\u589e\u3002
		   *
		   * \u6821\u9a8c\u6309**\u6240\u9009\u6a21\u578b\u7684\u97f3\u8272\u6765\u6e90**\u8d70\uff0c\u800c\u4e0d\u662f\u4e00\u5f8b\u8981\u6c42"\u97f3\u8272 ID \u975e\u7a7a"\uff1a\u97f3\u8272\u8bbe\u8ba1\u6ca1\u6709\u97f3\u8272
		   * ID\uff08\u5b83\u5c31\u662f\u90a3\u6bb5\u63cf\u8ff0\uff09\uff0c\u5185\u7f6e\u97f3\u8272\u586b\u7684\u662f\u97f3\u8272\u540d\u3002\u4e00\u5f8b\u8981\u6c42\u97f3\u8272 ID \u4f1a\u8ba9\u8fd9\u4e24\u7c7b\u6c38\u8fdc\u5b58
		   * \u4e0d\u8fdb\u53bb\uff0c\u800c\u7528\u6237\u770b\u4e0d\u51fa\u81ea\u5df1\u54ea\u91cc\u586b\u9519\u4e86\u3002
		   */
		  function saveProfile() {
		    var model = String(draft.model || '').trim()
		    if (model === '') {
		      setStatus({ kind: 'error', message: t('profiles.needModel') })
		      return
		    }
		    var kind = draftKind()
		    var voiceId = String(draft.voiceId || '').trim()
		    var designPrompt = String(draft.designPrompt || '').trim()
		    if (kind === 'design' && designPrompt === '') {
		      setStatus({ kind: 'error', message: t('profiles.needDesign') })
		      return
		    }
		    if (kind !== 'design' && voiceId === '') {
		      setStatus({ kind: 'error', message: t('profiles.needVoice') })
		      return
		    }
		    rpc('profiles', {
		      id: editId,
		      name: String(draft.name || '').trim(),
		      voiceId: kind === 'design' ? '' : voiceId,
		      model: model,
		      designPrompt: kind === 'design' ? designPrompt : '',
		    }).then(function (res) {
		      if (res === undefined || !res.ok) {
		        setStatus({ kind: 'error', message: (res && res.message) || t('error.generic') })
		        return
		      }
		      setProfileData({ profiles: res.profiles || [], activeId: res.activeId || '' })
		      resetDraft()
		      setStatus({ kind: 'ok', message: t('settings.saved') })
		    })
		  }

		  /**
		   * \u628a\u52fe\u4e0a\u7684\u5185\u7f6e\u97f3\u8272\u4e00\u6279\u52a0\u8fdb\u6863\u6848\u3002
		   *
		   * \u9010\u4e2a `POST` \u800c\u4e0d\u662f\u5148\u672c\u5730\u6512\u4e00\u4efd\u518d\u4e00\u6b21\u6027\u63d0\u4ea4\uff1a\u52a0\u5230\u7b2c\u4e09\u4e2a\u5931\u8d25\u65f6\uff0c\u524d\u4e24\u4e2a\u5df2\u7ecf\u5728\u670d\u52a1\u7aef
		   * \u4e86\uff0c\u9875\u9762\u4e0a\u4e5f\u5982\u5b9e\u663e\u793a\u4e24\u4e2a\uff1b\u800c\u6512\u5b8c\u4e00\u8d77\u63d0\u4ea4\u4f1a\u8ba9"\u5230\u5e95\u52a0\u4e0a\u4e86\u51e0\u4e2a"\u53d8\u5f97\u4e0d\u53ef\u77e5\u3002
		   * @param ids - \u97f3\u8272 id \u6570\u7ec4\u3002
		   * @param at - \u6570\u7ec4\u91cc\u7684\u7b2c\u51e0\u4e2a\uff08\u53ea\u7528\u4e8e\u62a5\u9519\u65f6\u8bf4\u660e\u662f\u54ea\u4e00\u4e2a\uff09\u3002
		   * @param added - \u5df2\u7ecf\u52a0\u4e0a\u7684\u6570\u91cf\u3002
		   */
		  function addPicked(ids, at, added) {
		    if (at >= ids.length) {
		      setCloneNote({
		        kind: 'ok',
		        message: t('profiles.builtinAddedCount') + '\uff1a' + String(added),
		      })
		      setPicked({})
		      return
		    }
		    var voice = builtinList.filter(function (item) { return item.id === ids[at] })[0]
		    if (voice === undefined) {
		      addPicked(ids, at + 1, added)
		      return
		    }
		    var presetModels = modelsOfKind('preset')
		    var presetModel = presetModels.length === 0 ? modelList[0].id : presetModels[0].id
		    rpc('profiles', {
		      name: voice.name,
		      voiceId: voice.id,
		      model: presetModel,
		      source: 'preset',
		    }).then(function (res) {
		      if (res !== undefined && res.ok) {
		        setProfileData({ profiles: res.profiles || [], activeId: res.activeId || '' })
		        addPicked(ids, at + 1, added + 1)
		        return
		      }
		      setCloneNote({
		        kind: 'error',
		        message: voice.name + '\uff1a' + ((res && res.message) || t('error.generic')),
		      })
		    })
		  }

		  /** \u628a\u52fe\u4e0a\u7684\u5185\u7f6e\u97f3\u8272\u90fd\u52a0\u8fdb\u6765\u3002 */
		  function addBuiltinPicked() {
		    var ids = []
		    for (var key in picked) {
		      if (Object.prototype.hasOwnProperty.call(picked, key) && picked[key] === true) ids.push(key)
		    }
		    if (ids.length === 0) {
		      setCloneNote({ kind: 'error', message: t('profiles.builtinPickNone') })
		      return
		    }
		    setCloneNote({ kind: 'busy', message: t('profiles.builtinAdding') })
		    addPicked(ids, 0, 0)
		  }

		  /** \u8f6e\u8be2\u4e00\u4e2a\u6b63\u5728\u90e8\u7f72\u7684\u97f3\u8272\uff08\u53ea\u6709\u767e\u70bc\u590d\u523b\u9700\u8981\u7b49\uff09\u3002 */
		  function pollClone(id) {
		    var tries = 0
		    setCloneNote({ kind: 'busy', message: t('clone.pending') })
		    // \u5ba2\u6237\u7aef\u8f6e\u8be2\u800c\u4e0d\u662f\u670d\u52a1\u7aef\u6302\u957f\u8bf7\u6c42\uff1a\u5173\u6389\u9875\u9762\u5c31\u4e0d\u4f1a\u7559\u4e0b orphan \u8f6e\u8be2\u3002
		    function tick() {
		      tries += 1
		      rpc('clone/status?id=' + encodeURIComponent(id)).then(function (res) {
		        if (res === undefined || !res.ok) {
		          setCloneNote({ kind: 'error', message: (res && res.message) || t('clone.failed') })
		          return
		        }
		        setProfileData({ profiles: res.profiles || [], activeId: res.activeId || '' })
		        if (res.phase === 'ready') {
		          setCloneNote({ kind: 'ok', message: t('clone.ready') })
		          return
		        }
		        if (res.phase === 'failed') {
		          setCloneNote({ kind: 'error', message: t('clone.failed') })
		          return
		        }
		        // \u90e8\u7f72\u901a\u5e38\u51e0\u79d2\u5230\u51e0\u5206\u949f\uff0c\u4e24\u5206\u949f\u8db3\u591f\uff1b\u8d85\u65f6\u4e0d\u5224\u5931\u8d25\uff0c\u5217\u8868\u91cc\u7684\u72b6\u6001\u4ecd\u5728\u3002
		        if (tries >= 40) {
		          setCloneNote({ kind: 'error', message: t('clone.timeout') })
		          return
		        }
		        setTimeout(tick, 3000)
		      })
		    }
		    setTimeout(tick, 1500)
		  }

		  /** \u4e0a\u4f20\u97f3\u9891\u5e76\u590d\u523b\u3002 */
		  function startClone() {
		    if (file === null || file === undefined) {
		      setCloneNote({ kind: 'error', message: t('clone.noFile') })
		      return
		    }
		    if (cloneModel === '') {
		      setCloneNote({ kind: 'error', message: t('profiles.needModel') })
		      return
		    }
		    setCloneNote({ kind: 'busy', message: t('clone.uploading') })
		    var raw = file.name || 'voice.wav'
		    file.arrayBuffer().then(function (buffer) {
		      // \u6a21\u578b\u8d70\u67e5\u8be2\u4e32\uff1a\u8fd9\u4e00\u6761\u8def\u7531\u7684 body \u662f\u88f8\u97f3\u9891\u5b57\u8282\uff0c\u6ca1\u5730\u65b9\u653e\u522b\u7684\u5b57\u6bb5\u3002
		      return rpcBytes('clone',
		        'name=' + encodeURIComponent(raw.replace(/\.[^.]+$/, ''))
		        + '&filename=' + encodeURIComponent(raw)
		        + '&model=' + encodeURIComponent(cloneModel),
		        buffer)
		    }).then(function (res) {
		      if (res === undefined || !res.ok) {
		        setCloneNote({ kind: 'error', message: (res && res.message) || t('clone.failed') })
		        return
		      }
		      setProfileData({ profiles: res.profiles || [], activeId: res.activeId || '' })
		      // MiMo \u590d\u523b\u662f**\u672c\u5730\u590d\u7528**\uff1a\u6ca1\u6709\u4e91\u7aef\u90e8\u7f72\u8fd9\u4e00\u6b65\uff0c\u53c2\u8003\u97f3\u9891\u5c31\u5b58\u5728
		      // `~/.dsh/voice/samples/`\uff0c\u6863\u6848\u5f53\u573a\u53ef\u7528\u2014\u2014\u6240\u4ee5\u4e0d\u80fd\u53bb\u8f6e\u8be2\u4e00\u4e2a\u4e0d\u5b58\u5728\u7684\u90e8\u7f72\u3002
		      if (res.local === true) {
		        setCloneNote({ kind: 'ok', message: t('clone.readyLocal') })
		        return
		      }
		      pollClone(res.profile.id)
		    })
		  }

		  /** \u628a\u4e91\u7aef\u5df2\u6709\u7684\u97f3\u8272\u62c9\u8fdb\u6863\u6848\uff08\u767e\u70bc\u590d\u523b\u51fa\u6765\u7684\u90a3\u4e9b\uff09\u3002 */
		  function syncCloud() {
		    setCloneNote({ kind: 'busy', message: t('clone.syncing') })
		    rpc('cloud-voices/import', {}).then(function (res) {
		      if (res === undefined || !res.ok) {
		        setCloneNote({ kind: 'error', message: (res && res.message) || t('error.generic') })
		        return
		      }
		      setProfileData({ profiles: res.profiles || [], activeId: res.activeId || '' })
		      setCloneNote({
		        kind: 'ok',
		        message: res.added > 0 ? t('clone.synced') + '\uff1a' + String(res.added) : t('clone.syncedNone'),
		      })
		    })
		  }

		  // "\u80fd\u7528"\u7684\u5224\u5b9a\u8981\u7b97\u4e0a\u6863\u6848\uff1a\u4e00\u5957\u6863\u6848\u542f\u7528\u7740\u4f46\u6ca1\u6709\u53ef\u7528\u97f3\u8272\u65f6\uff0c\u7167\u6837\u53ef\u4ee5\u6717\u8bfb\u3002
		  // \u8fd9\u4e00\u884c\u653e\u5728 profileData \u4e4b\u540e\uff0c\u662f\u56e0\u4e3a\u5b83\u8fd8\u662f undefined \u65f6 `!= null` \u4f1a\u8bef\u5224\u6210 true\u3002
		  var hasVoice = String(value.voiceId || '') !== '' || (profileData !== null && profileData.activeId !== '')
		  var configured = (hasSecret || hasMimoSecret || String(value.apiKey || '') !== '' || String(value.mimoApiKey || '') !== '') && hasVoice

		  // \u628a\u81ea\u5df1\u7684\u9009\u62e9\u5e26\u4e0a\u53bb\u95ee\uff0c\u4e8e\u662f\u62ff\u56de\u6765\u7684\u662f"\u6309\u8fd9\u4e2a\u9009\u62e9\u771f\u6b63\u4f1a\u8d70\u54ea\u6761\u8def"\uff0c\u800c\u4e0d\u662f
		  // \u914d\u7f6e\u6587\u6863\u91cc\u90a3\u4e00\u884c \u2014\u2014 \u4e24\u8005\u4e0d\u4e00\u81f4\u65f6\uff08\u914d\u7f6e\u6ca1\u5199\u8fdb\u53bb\uff09\u9875\u9762\u4f1a\u660e\u786e\u8bf4\u51fa\u6765\u3002
		  React.useEffect(function () {
		    var query = 'mode=' + encodeURIComponent(mode)
		      + '&roleplay=' + encodeURIComponent(roleplayOn ? 'true' : 'false')
		    rpc('status?' + query).then(function (res) {
		      if (res === undefined || !res.ok) return
		      setCount({
		        count: res.count,
		        dir: res.dir,
		        configured: res.configured,
		        mode: res.mode,
		        configuredMode: res.configuredMode,
		        roleplay: res.roleplay === true,
		        configuredRoleplay: res.configuredRoleplay === true,
		        model: res.model,
		        voiceId: res.voiceId,
		        provider: res.provider,
		        lowLatencyStream: res.lowLatencyStream,
		      })
		    })
		  }, [snapshot, mode, roleplayOn])

		  /**
		   * \u8bd5\u542c\uff1a\u8d70\u4e00\u6b21\u771f\u5b9e\u5408\u6210\uff0c\u6240\u4ee5\u80fd\u4e00\u6b21\u6027\u9a8c\u51fa Key\u3001\u6a21\u578b\u4e0e\u97f3\u8272\u662f\u5426\u5339\u914d\u3002
		   */
		  function preview() {
		    setStatus(null)
		    // \u8bd5\u542c\u8d70\u7684\u6b63\u662f\u64ad\u653e\u952e\u90a3\u6761\u8def\uff1a`speakAs` \u6309\u670d\u52a1\u7aef\u6a21\u5f0f\u81ea\u5df1\u9009\u6574\u6bb5\u8fd8\u662f\u6d41\u5f0f\uff0c\u6240\u4ee5
		    // \u8bd5\u542c\u4e5f\u662f\u5728\u9a8c\u7528\u6237\u771f\u6b63\u4f1a\u7528\u5230\u7684\u90a3\u4e00\u6761\u94fe\u8def\u3002
		    // \u89d2\u8272\u626e\u6f14\u5f00\u7740\u7684\u65f6\u5019\uff0c\u8bd5\u542c\u6587\u672c\u5f97\u5e26\u4e00\u53e5\u53f0\u8bcd\uff0c\u5426\u5219\u542c\u4e0d\u51fa"\u65c1\u767d/\u89d2\u8272\u4e24\u79cd\u58f0\u97f3"\u3002
		    speakAs('speak', {
		      text: roleplayOn ? t('settings.previewRoleplayText') : t('settings.previewText'),
		    }, '__preview__').then(function () {
		      var snapshot = player.getSnapshot()
		      if (snapshot.idle === true || snapshot.kind !== 'error') {
		        setStatus({ kind: 'ok', message: t('settings.saved') })
		        return
		      }
		      setStatus({ kind: 'error', message: snapshot.message === undefined ? t('error.generic') : snapshot.message })
		    })
		  }

		  /**
		   * \u5728\u7cfb\u7edf\u6587\u4ef6\u7ba1\u7406\u5668\u91cc\u6253\u5f00\u8f93\u51fa\u76ee\u5f55\u3002
		   */
		  function openDir() {
		    rpc('open').then(function (res) {
		      if (res === undefined || !res.ok) setStatus({ kind: 'error', message: (res && res.message) || '' })
		    })
		  }

		  /**
		   * \u6e05\u7a7a\u97f3\u9891\u7f13\u5b58\u3002
		   */
		  function clearCache() {
		    rpc('clear').then(function (res) {
		      if (res === undefined || !res.ok) return
		      setCount({ count: 0, dir: count === null ? '' : count.dir, configured: count === null ? false : count.configured })
		      setStatus({ kind: 'ok', message: t('settings.cleared') })
		    })
		  }

		  function row(labelKey, hint, body) {
		    return React.createElement('div', null,
		      React.createElement('div', { style: ROW },
		        React.createElement('div', { style: ROW_LABEL }, t(labelKey)),
		        React.createElement('div', { style: ROW_BODY }, body)),
		      hint === undefined ? null : React.createElement('div', { style: HINT }, hint))
		  }

		  /**
		   * \u5207\u6362\u5408\u6210\u65b9\u5f0f\u3002
		   *
		   * \u5148\u672c\u5730\u751f\u6548\uff08\u4e8e\u662f\u8fd9\u4e00\u4e0b**\u4e00\u5b9a\u6709\u53cd\u5e94**\uff09\uff0c\u518d\u53bb\u8bd5\u7740\u628a\u5b83\u5199\u8fdb\u5bbf\u4e3b\u914d\u7f6e\uff1a\u5199\u8fdb\u53bb
		   * \u5c31\u6301\u4e45\u5316\uff0c\u5199\u4e0d\u8fdb\u53bb\uff08schema \u8fd8\u6ca1\u8ddf\u7740\u66f4\u65b0\u3001\u6216\u901a\u9053\u4e34\u65f6\u4e0d\u53ef\u7528\uff09\u4e5f\u5728\u9875\u9762\u4e0a\u8bf4
		   * \u51fa\u6765\uff0c\u800c\u4e0d\u662f\u9759\u9ed8\u5931\u8d25 \u2014\u2014 \u7528\u6237\u4e0a\u4e00\u6b21\u9047\u5230\u7684\u6b63\u662f"\u70b9\u4e86\u6ca1\u53d8\u5316\u4e5f\u4e0d\u77e5\u9053\u4e3a\u4ec0\u4e48"\u3002
		   * @param target - \u8981\u5207\u5230\u7684\u6a21\u5f0f\u3002
		   */
		  function switchMode(target) {
		    setMode(target)
		    saveMode(target)
		    setStatus(null)
		    // \u8d70 form.set \u800c\u4e0d\u662f\u90a3\u4e2a\u9759\u9ed8\u7684 `write()`\uff1a\u8fd9\u91cc\u7684\u5931\u8d25**\u5fc5\u987b**\u8ba9\u4eba\u770b\u89c1\u3002
		    var done
		    try {
		      done = form.set('mode', target)
		    } catch (error) {
		      setStatus({ kind: 'error', message: t('settings.modeFailed') })
		      console.error('[dsh-cosyvoice] \u5199\u5165\u5408\u6210\u65b9\u5f0f\u5931\u8d25\uff1a', error)
		      return
		    }
		    if (done !== undefined && done !== null && typeof done.then === 'function') {
		      done.then(function () {
		        setStatus({ kind: 'ok', message: t('settings.modeSaved') })
		      }).catch(function (error) {
		        setStatus({ kind: 'error', message: t('settings.modeFailed') })
		        console.error('[dsh-cosyvoice] \u5199\u5165\u5408\u6210\u65b9\u5f0f\u5931\u8d25\uff1a', error)
		      })
		    }
		  }

		  /**
		   * \u6a21\u5f0f\u5207\u6362\u91cc\u7684\u4e00\u4e2a\u6309\u94ae\u3002
		   * @param target - \u5b83\u4ee3\u8868\u7684\u6a21\u5f0f\u3002
		   * @param labelKey - \u6587\u6848\u952e\u3002
		   * @returns \u4e00\u4e2a\u6309\u94ae\u3002
		   */
		  function modeButton(target, labelKey) {
		    var active = mode === target
		    return React.createElement('button', {
		      key: target,
		      type: 'button',
		      'aria-pressed': active,
		      style: active ? MODE_BUTTON_ACTIVE : MODE_BUTTON,
		      onClick: function () { switchMode(target) },
		    }, t(labelKey))
		  }

		  /**
		   * \u5199\u56de\u5bbf\u4e3b\u914d\u7f6e\uff0c\u5e76\u4e14**\u628a\u5931\u8d25\u8bf4\u51fa\u6765**\u3002
		   *
		   * `write()` \u4f1a\u9759\u9ed8\u541e\u6389 rejection\uff08\u89c1 {@link useConfigForm}\uff09\uff0c\u90a3\u5bf9"\u6539\u4e2a Key"\u662f
		   * \u5408\u9002\u7684\uff0c\u4f46\u5bf9\u5f00\u5173\u4e0d\u5408\u9002\uff1a\u7528\u6237\u62e8\u4e86\u4e00\u4e0b\u5374\u6beb\u65e0\u53cd\u9988\uff0c\u5c31\u65e0\u6cd5\u533a\u5206"\u751f\u6548\u4e86"\u548c"\u6ca1\u751f\u6548"\u3002
		   * @param field - \u914d\u7f6e\u5b57\u6bb5\u540d\u3002
		   * @param value - \u8981\u5199\u5165\u7684\u503c\u3002
		   * @param okKey - \u6210\u529f\u6587\u6848\u952e\u3002
		   * @param failKey - \u5931\u8d25\u6587\u6848\u952e\u3002
		   */
		  function writeVisible(field, value, okKey, failKey) {
		    setStatus(null)
		    var done
		    try {
		      done = form.set(field, value)
		    } catch (error) {
		      setStatus({ kind: 'error', message: t(failKey) })
		      console.error('[dsh-cosyvoice] \u5199\u5165 ' + field + ' \u5931\u8d25\uff1a', error)
		      return
		    }
		    if (done !== undefined && done !== null && typeof done.then === 'function') {
		      done.then(function () {
		        setStatus({ kind: 'ok', message: t(okKey) })
		      }).catch(function (error) {
		        setStatus({ kind: 'error', message: t(failKey) })
		        console.error('[dsh-cosyvoice] \u5199\u5165 ' + field + ' \u5931\u8d25\uff1a', error)
		      })
		    }
		  }

		  /** \u62e8\u52a8\u89d2\u8272\u626e\u6f14\u5f00\u5173\u3002 */
		  function switchRoleplay(on) {
		    setRoleLocal(on ? 'true' : 'false')
		    saveRoleplay(on)
		    writeVisible('roleplay', on, 'settings.roleplaySaved', 'settings.roleplayFailed')
		  }

		  /**
		   * \u7ed1\u5b9a\u4e00\u5957\u97f3\u8272\u6863\u6848\u3002
		   * @param which - `narration` \u662f\u65c1\u767d\uff0c`character` \u662f\u89d2\u8272\u3002
		   * @param id - \u6863\u6848 id\uff1b\u7a7a\u4e32\u8868\u793a"\u8ddf\u968f\u5f53\u524d\u97f3\u8272"\u3002
		   */
		  function pickProfile(which, id) {
		    if (which === 'narration') {
		      setNarrationLocal(id)
		      saveNarrationProfile(id)
		      writeVisible('narrationProfileId', id, 'settings.roleplayVoiceSaved', 'settings.roleplayVoiceFailed')
		      return
		    }
		    setCharacterLocal(id)
		    saveCharacterProfile(id)
		    writeVisible('characterProfileId', id, 'settings.roleplayVoiceSaved', 'settings.roleplayVoiceFailed')
		  }

		  /**
		   * \u89d2\u8272\u626e\u6f14\u5f00\u5173\u91cc\u7684\u4e00\u4e2a\u6309\u94ae\u3002
		   * @param on - \u5b83\u4ee3\u8868\u7684\u90a3\u4e2a\u503c\u3002
		   * @param labelKey - \u6587\u6848\u952e\u3002
		   * @returns \u4e00\u4e2a\u6309\u94ae\u3002
		   */
		  function roleplayButton(on, labelKey) {
		    var active = roleplayOn === on
		    return React.createElement('button', {
		      key: on ? 'on' : 'off',
		      type: 'button',
		      'aria-pressed': active,
		      style: active ? MODE_BUTTON_ACTIVE : MODE_BUTTON,
		      onClick: function () { switchRoleplay(on) },
		    }, t(labelKey))
		  }

		  /**
		   * \u4e00\u4e2a\u97f3\u8272\u7ed1\u5b9a\u4e0b\u62c9\u3002
		   *
		   * \u9009\u9879\u53ea\u6709\u4e24\u7c7b\uff1a\u8ddf\u968f\u5f53\u524d\u97f3\u8272\uff08\u7a7a\uff09\uff0c\u4ee5\u53ca\u5df2\u4fdd\u5b58\u7684\u6863\u6848\u3002\u4e0d\u505a\u81ea\u7531\u8f93\u5165\u662f\u56e0\u4e3a\u8fd9\u91cc
		   * \u8981\u7684\u662f"\u4ece\u5df2\u7ecf\u914d\u597d\u7684\u97f3\u8272\u91cc\u6311\u4e00\u4e2a"\uff0c\u800c\u6863\u6848\u662f\u552f\u4e00\u540c\u65f6\u5e26\u7740\u97f3\u8272\u4e0e\u6a21\u578b\u7684\u4e1c\u897f\u3002
		   * \u4e0d\u53ef\u7528\u7684\u6863\u6848\uff08\u590d\u523b\u8fd8\u6ca1\u90e8\u7f72\u597d\u3001\u53c2\u8003\u97f3\u9891\u4e22\u4e86\uff09\u4e0d\u51fa\u73b0\u5728\u5217\u8868\u91cc\u2014\u2014\u8ba9\u7528\u6237\u9009\u4e2d
		   * \u4e00\u5957\u6ce8\u5b9a\u5408\u6210\u4e0d\u4e86\u7684\u6863\u6848\uff0c\u6bd4\u4e0d\u663e\u793a\u5b83\u66f4\u7cdf\u3002
		   * @param labelKey - \u6807\u7b7e\u6587\u6848\u952e\u3002
		   * @param current - \u5f53\u524d\u503c\uff08\u6863\u6848 id\uff09\u3002
		   * @param onPick - \u9009\u4e2d\u56de\u8c03\u3002
		   * @returns \u4e00\u884c\u3002
		   */
		  function profileSelect(labelKey, current, onPick) {
		    var options = [React.createElement('option', { key: '', value: '' }, t('settings.voiceFollow'))]
		    var list = profileData === null || profileData === undefined ? [] : profileData.profiles
		    for (var i = 0; i < list.length; i++) {
		      var profile = list[i]
		      if (!isUsable(profile)) continue
		      options.push(React.createElement('option', {
		        key: profile.id,
		        value: profile.id,
		      }, profile.name === '' || profile.name === undefined ? profile.voiceId : profile.name))
		    }
		    return row(labelKey, undefined, [
		      React.createElement('select', {
		        key: labelKey,
		        value: current,
		        style: SELECT,
		        onChange: function (event) { onPick(event.target.value) },
		      }, options),
		    ])
		  }

		  /**
		   * \u6a21\u578b\u4e0b\u62c9\u3002
		   * @param value - \u5f53\u524d\u6a21\u578b\u540d\u3002
		   * @param onPick - \u9009\u4e2d\u56de\u8c03\u3002
		   * @param onlyKind - \u53ea\u5217\u8fd9\u4e00\u7c7b\u97f3\u8272\u7684\u6a21\u578b\uff08\u7f3a\u7701\u5217\u5168\u90e8\uff09\u3002
		   * @param key - React key\u3002
		   * @returns \u4e00\u4e2a `select`\uff1b\u76ee\u5f55\u8fd8\u6ca1\u5230\u65f6\u662f\u4e00\u4e2a\u7981\u7528\u7684\u5360\u4f4d\u3002
		   */
		  function modelSelect(value, onPick, onlyKind, key) {
		    if (modelList.length === 0) {
		      return React.createElement('select', { key: key, value: '', style: SELECT, disabled: true },
		        React.createElement('option', { key: '', value: '' }, t('models.loading')))
		    }
		    var shown = onlyKind === undefined ? modelList : modelsOfKind(onlyKind)
		    var options = []
		    for (var i = 0; i < shown.length; i++) {
		      options.push(React.createElement('option', {
		        key: shown[i].id,
		        value: shown[i].id,
		      }, shown[i].label + (shown[i].note === '' ? '' : '\uff08' + shown[i].note + '\uff09')))
		    }
		    return React.createElement('select', {
		      key: key,
		      value: value,
		      style: SELECT,
		      onChange: function (event) { onPick(event.target.value) },
		    }, options)
		  }

		  /**
		   * \u8349\u7a3f\u91cc"\u8fd9\u4e2a\u97f3\u8272\u4ece\u54ea\u6765"\u7684\u90a3\u4e00\u680f\u3002
		   *
		   * \u6574\u6bb5\u968f\u6240\u9009\u6a21\u578b\u7684\u97f3\u8272\u6765\u6e90\u6362\u6389\uff0c\u800c\u4e0d\u662f\u4e09\u79cd\u8f93\u5165\u6846\u53e0\u5728\u4e00\u8d77\u53ea\u663e\u793a\u4e00\u4e2a\uff1a\u53e0\u7740\u7684\u8bdd
		   * \u7528\u6237\u4f1a\u4ee5\u4e3a"\u586b\u4e86\u97f3\u8272 ID \u5c31\u591f\u4e86"\uff0c\u800c\u5728\u97f3\u8272\u8bbe\u8ba1\u90a3\u4e00\u6863\u5b83\u538b\u6839\u4e0d\u8bfb\u90a3\u4e2a\u5b57\u6bb5\u3002
		   */
		  function draftVoiceField() {
		    var kind = draftKind()
		    if (kind === 'design') {
		      return React.createElement('input', {
		        key: 'designPrompt',
		        type: 'text',
		        value: draft.designPrompt === undefined ? '' : draft.designPrompt,
		        placeholder: t('profiles.designPlaceholder'),
		        style: INPUT,
		        onChange: function (event) { setDraftField('designPrompt', event.target.value, true) },
		      })
		    }
		    if (kind === 'preset') {
		      // \u5185\u7f6e\u97f3\u8272\uff1a\u4e00\u4e2a\u6709\u9650\u96c6\uff0c\u6240\u4ee5\u662f\u5217\u8868\u800c\u4e0d\u662f\u6587\u672c\u6846\u3002
		      var options = [React.createElement('option', { key: '', value: '' }, t('profiles.builtinPickOne'))]
		      for (var i = 0; i < builtinList.length; i++) {
		        options.push(React.createElement('option', {
		          key: builtinList[i].id,
		          value: builtinList[i].id,
		        }, builtinList[i].name + '\uff08' + builtinList[i].language + '\u00b7' + builtinList[i].gender + '\uff09'))
		      }
		      return React.createElement('select', {
		        key: 'builtin',
		        value: draft.voiceId === undefined ? '' : draft.voiceId,
		        style: SELECT,
		        onChange: function (event) { setDraftField('voiceId', event.target.value, true) },
		      }, options)
		    }
		    if (draftIsMimo()) {
		      // MiMo \u590d\u523b\uff1a\u97f3\u8272\u51ed\u636e\u662f**\u4e00\u6bb5\u53c2\u8003\u97f3\u9891**\uff0c\u4e0d\u662f\u4efb\u4f55\u53ef\u4ee5\u624b\u586b\u7684\u5b57\u7b26\u4e32\u3002
		      // \u8fd9\u91cc\u4e0d\u80fd\u7ed9\u8f93\u5165\u6846\u2014\u2014\u7ed9\u4e00\u4e2a\u586b\u4e86\u4e5f\u5b58\u4e0d\u8fdb\u6863\u6848\u7684\u6846\uff0c\u6bd4\u8bf4\u6e05\u695a\u66f4\u7cdf\u3002
		      return React.createElement('div', { key: 'localOnly', style: { ...HINT, padding: '0' } }, t('profiles.cloneViaUpload'))
		    }
		    return React.createElement('input', {
		      key: 'voiceId',
		      type: 'text',
		      value: draft.voiceId === undefined ? '' : draft.voiceId,
		      placeholder: t('profiles.voicePlaceholder'),
		      style: INPUT,
		      onChange: function (event) { setDraftField('voiceId', event.target.value, true) },
		    })
		  }

		  /**
		   * \u4e00\u5957\u6863\u6848\u7684"\u97f3\u8272\u51ed\u636e"\u663e\u793a\u6210\u4ec0\u4e48\u3002
		   *
		   * \u4e09\u7c7b\u6863\u6848\u7684\u51ed\u636e\u5f62\u6001\u5b8c\u5168\u4e0d\u540c\uff08\u97f3\u8272 ID / \u5185\u7f6e\u97f3\u8272\u540d / \u672c\u5730\u53c2\u8003\u97f3\u9891\u6587\u4ef6\u540d\uff09\uff0c\u800c\u8fd9\u4e00\u884c
		   * \u662f\u7528\u6237\u5224\u65ad"\u8fd9\u5957\u97f3\u8272\u5230\u5e95\u662f\u4ec0\u4e48"\u7684\u552f\u4e00\u4f9d\u636e\uff0c\u6240\u4ee5\u6309\u7c7b\u578b\u5206\u522b\u663e\u793a\uff0c\u800c\u4e0d\u662f\u90fd\u9000\u56de
		   * `voiceId`\uff08\u5bf9 MiMo \u590d\u523b\u90a3\u4f1a\u662f\u4e00\u4e2a\u7a7a\u5b57\u7b26\u4e32\uff09\u3002
		   * @param profile - \u6863\u6848\u3002
		   * @returns \u4e00\u884c\u5c0f\u5b57\u3002
		   */
		  function profileMeta(profile) {
		    if (profile.sample !== undefined && profile.sample !== null && profile.sample !== '') {
		      return t('profiles.sampleLabel') + profile.sample
		    }
		    if (profile.kind === 'design' && String(profile.designPrompt || '') !== '') {
		      return profile.designPrompt
		    }
		    return String(profile.voiceId || '')
		  }

		  /**
		   * \u4e00\u6761\u6863\u6848\u3002\u70b9"\u7f16\u8f91"\u628a\u5b83\u88c5\u8fdb\u8349\u7a3f\uff0c\u4e8e\u662f\u65b0\u589e\u548c\u7f16\u8f91\u5171\u7528\u540c\u4e00\u7ec4\u8f93\u5165\u6846\u3002
		   * @param profile - \u6863\u6848\u3002
		   * @returns \u4e00\u884c\u3002
		   */
		  function profileRow(profile) {
		    var isActive = profileData !== null && profile.id === profileData.activeId
		    var meta = profileMeta(profile)
		    return React.createElement('div', { key: profile.id, style: PROFILE_ROW },
		      React.createElement('span', {
		        style: {
		          flex: 'none',
		          width: '8px',
		          height: '8px',
		          borderRadius: '50%',
		          background: isActive ? T.accent : 'transparent',
		          border: '1px solid ' + T.border,
		        },
		      }),
		      React.createElement('div', { style: { flex: '1', minWidth: '0' } },
		        React.createElement('div', { style: { fontSize: '13px', lineHeight: '18px', color: T.text } },
		          profile.name === '' ? profile.voiceId : profile.name),
		        React.createElement('div', { style: PROFILE_META },
		          meta + (profile.model === '' ? '' : ' \u00b7 ' + profile.model))),
		      // \u8fd9\u6b3e\u6a21\u578b\u7684\u6d41\u5f0f\u4e0d\u662f\u771f\u6b63\u7684\u4f4e\u5ef6\u8fdf\uff08MiMo \u7684\u590d\u523b\u4e0e\u8bbe\u8ba1\u4e24\u6b3e\u5982\u6b64\uff09\uff0c\u4e8e\u662f\u5fbd\u7ae0\u8981\u8bf4\u5728
		      // \u884c\u4e0a\uff1a\u7528\u6237\u9009\u4e86"\u5b9e\u65f6"\u5374\u8981\u7b49\u6574\u6bb5\u5408\u6210\u5b8c\u65f6\uff0c\u4e0d\u8be5\u4ee5\u4e3a\u662f\u672c\u63d2\u4ef6\u574f\u4e86\u3002
		      profile.lowLatencyStream === false
		        ? React.createElement('span', {
		          key: 'stream',
		          style: { flex: 'none', fontSize: '11px', color: T.textFaint },
		          title: t('profiles.lowLatencyHint'),
		        }, t('profiles.lowLatency'))
		        : null,
		      // \u514b\u9686\u6765\u7684\u97f3\u8272\u5728\u90e8\u7f72\u597d\u4e4b\u524d\u4e0d\u80fd\u7528\uff0c\u6240\u4ee5\u72b6\u6001\u8981\u6446\u5728\u884c\u4e0a\uff0c\u522b\u8ba9\u4eba\u70b9\u4e86\u624d\u53d1\u73b0\u95ee\u9898\u3002
		      profile.status === 'ready' || profile.status === undefined
		        ? null
		        : React.createElement('span', {
		          key: 'status',
		          style: {
		            flex: 'none',
		            fontSize: '11px',
		            color: profile.status === 'failed' ? '#d93025' : T.textFaint,
		          },
		        }, profile.status === 'failed' ? t('profiles.failed') : t('profiles.pending')),
		      isActive
		        ? React.createElement('span', { key: 'cur', style: { flex: 'none', fontSize: '11px', color: T.accent } }, t('profiles.current'))
		        : React.createElement('button', {
		          key: 'use',
		          type: 'button',
		          style: MINI_BUTTON,
		          onClick: function () { useProfile(profile.id) },
		        }, t('profiles.use')),
		      React.createElement('button', {
		        key: 'edit',
		        type: 'button',
		        style: MINI_BUTTON,
		        onClick: function () {
		          setEditId(profile.id)
		          // \u7f16\u8f91\u65f6**\u4e0d**\u8d70 setDraftField \u7684"\u6e05\u7a7a\u51ed\u636e"\u90a3\u4e00\u652f\uff1a\u90a3\u662f\u7ed9"\u6362\u6a21\u578b"\u7528\u7684\uff0c
		          // \u800c\u8fd9\u91cc\u6a21\u578b\u6ca1\u53d8\uff0c\u6e05\u6389\u7b49\u4e8e\u8ba9\u7528\u6237\u6539\u4e2a\u540d\u5b57\u4e5f\u8981\u91cd\u65b0\u586b\u97f3\u8272\u3002
		          setDraft({
		            name: profile.name || '',
		            model: profile.model || '',
		            voiceId: profile.voiceId || '',
		            designPrompt: profile.designPrompt || '',
		          })
		        },
		      }, t('profiles.edit')),
		      React.createElement('button', {
		        key: 'del',
		        type: 'button',
		        style: MINI_BUTTON,
		        onClick: function () { removeProfile(profile.id) },
		      }, t('profiles.delete')))
		  }

		  /** \u5185\u7f6e\u97f3\u8272\u5217\u8868\u91cc\u7684\u4e00\u884c\uff08\u590d\u9009\u6846 + \u540d\u5b57 + \u8bf4\u660e + \u662f\u5426\u5df2\u6dfb\u52a0\uff09\u3002 */
		  function builtinRow(voice) {
		    var already = false
		    var list = profileData === null || profileData === undefined ? [] : profileData.profiles
		    for (var i = 0; i < list.length; i++) {
		      if (list[i].voiceId === voice.id && list[i].sample === undefined) { already = true; break }
		    }
		    return React.createElement('div', { key: voice.id, style: PROFILE_ROW },
		      React.createElement('input', {
		        key: 'box',
		        type: 'checkbox',
		        checked: picked[voice.id] === true,
		        style: CHECKBOX,
		        onChange: function (event) {
		          var next = {}
		          for (var key in picked) {
		            if (Object.prototype.hasOwnProperty.call(picked, key)) next[key] = picked[key]
		          }
		          next[voice.id] = event.target.checked
		          setPicked(next)
		        },
		      }),
		      React.createElement('div', { style: { flex: '1', minWidth: '0' } },
		        React.createElement('div', { style: { fontSize: '13px', lineHeight: '18px', color: T.text } },
		          voice.name + (voice.note === '' ? '' : '\uff08' + voice.note + '\uff09')),
		        React.createElement('div', { style: PROFILE_META }, voice.id)),
		      already
		        ? React.createElement('span', { key: 'has', style: { flex: 'none', fontSize: '11px', color: T.textFaint } }, t('profiles.builtinAdded'))
		        : null)
		  }

		  var profileList = profileData === null || profileData === undefined
		    ? []
		    : profileData.profiles

		  var profilesBlock = React.createElement('div', { style: { padding: '10px 0 4px' } },
		    React.createElement('div', { style: BLOCK_TITLE }, t('profiles.title')),
		    React.createElement('div', { style: HINT }, t('profiles.hint')),
		    profileList.length === 0
		      ? React.createElement('div', { style: HINT }, t('profiles.empty'))
		      : React.createElement('div', null, profileList.map(profileRow)),
		    // ---- \u65b0\u589e / \u7f16\u8f91\uff1a\u4e00\u884c\u653e\u4e0d\u4e0b\uff0c\u6240\u4ee5\u6a21\u578b\u4e0e\u540d\u79f0\u4e00\u884c\u3001\u97f3\u8272\u51ed\u636e\u4e00\u884c ----
		    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '6px' } },
		      modelSelect(draft.model, function (id) { setDraftField('model', id) }, undefined, 'draft-model'),
		      React.createElement('input', {
		        key: 'draft-name',
		        type: 'text',
		        value: draft.name === undefined ? '' : draft.name,
		        placeholder: t('profiles.namePlaceholder'),
		        style: INPUT,
		        onChange: function (event) { setDraftField('name', event.target.value, true) },
		      })),
		    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '6px' } },
		      draftVoiceField(),
		      React.createElement('button', {
		        key: 'save',
		        type: 'button',
		        style: BUTTON,
		        onClick: saveProfile,
		      }, editId === '' ? t('profiles.add') : t('profiles.save')),
		      editId === ''
		        ? null
		        : React.createElement('button', { key: 'cancel', type: 'button', style: BUTTON, onClick: resetDraft }, t('profiles.cancel'))),
		    React.createElement('div', { style: HINT }, t('profiles.modelHint')),
		    // ---- MiMo \u5185\u7f6e\u97f3\u8272\uff1a\u52fe\u9009\u6dfb\u52a0 ----
		    React.createElement('div', { style: { padding: '8px 0 0' } },
		      React.createElement('div', { style: BLOCK_TITLE }, t('profiles.builtinTitle')),
		      React.createElement('div', { style: HINT }, t('profiles.builtinHint')),
		      builtinList.length === 0
		        ? React.createElement('div', { style: HINT }, t('models.loading'))
		        : React.createElement('div', null, builtinList.map(builtinRow)),
		      builtinList.length === 0
		        ? null
		        : React.createElement('button', { type: 'button', style: BUTTON, onClick: addBuiltinPicked }, t('profiles.builtinAdd'))),
		    // ---- \u97f3\u8272\u514b\u9686 ----
		    React.createElement('div', { style: { padding: '10px 0 0' } },
		      React.createElement('div', { style: BLOCK_TITLE }, t('clone.title')),
		      React.createElement('div', { style: HINT }, t('clone.hint')),
		      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px' } },
		        modelSelect(cloneModel, function (id) { setCloneModel(id) }, 'clone', 'clone-model')),
		      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
		        React.createElement('input', {
		          key: 'file',
		          type: 'file',
		          accept: 'audio/*',
		          style: { flex: 'none', fontSize: '12px', color: T.textDim, maxWidth: '220px' },
		          onChange: function (event) {
		            var pickedFile = event.target.files === null || event.target.files === undefined ? null : event.target.files[0]
		            setFile(pickedFile === undefined ? null : pickedFile)
		          },
		        }),
		        React.createElement('button', { key: 'start', type: 'button', style: BUTTON, onClick: startClone }, t('clone.start')),
		        React.createElement('button', { key: 'sync', type: 'button', style: BUTTON, onClick: syncCloud }, t('clone.sync')),
		        cloneNote === null
		          ? null
		          : React.createElement('span', {
		            key: 'note',
		            style: {
		              fontSize: '12px',
		              color: cloneNote.kind === 'error' ? '#d93025' : cloneNote.kind === 'ok' ? T.accent : T.textFaint,
		            },
		          }, cloneNote.message))))

		  return React.createElement('div', { style: { display: 'block' } },
		    React.createElement('div', { style: { fontSize: '16px', lineHeight: '24px', color: T.text, padding: '4px 0 2px' } }, t('settings.title')),
		    React.createElement('div', { style: HINT }, t('settings.hint')),
		    row('settings.key', t('settings.keyHint'), [
		      // \u5bc6\u7801\u6846\uff0c\u4e14**\u975e\u53d7\u63a7**\uff1a\u672c\u9875\u6c38\u8fdc\u8bfb\u4e0d\u5230\u660e\u6587\uff08\u5bc6\u94a5\u5728\u901a\u9053\u4e0a\u88ab\u8131\u654f\uff09\uff0c\u6240\u4ee5\u4e00\u4e2a
		      // \u53d7\u63a7\u8f93\u5165\u6846\u4f1a\u5728\u6bcf\u6b21\u6309\u952e\u540e\u628a\u81ea\u5df1\u6e05\u7a7a\u3002\u5931\u7126\u5373\u5199\u5165\uff0c\u5199\u5b8c\u628a\u6846\u6e05\u6389 \u2014\u2014 \u56de\u586b\u4e00\u4e2a
		      // \u63a9\u7801\u6ca1\u6709\u4efb\u4f55\u4fe1\u606f\u91cf\u3002
		      React.createElement('input', {
		        key: 'key',
		        type: 'password',
		        defaultValue: '',
		        placeholder: hasSecret ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\uff08\u5df2\u4fdd\u5b58\uff0c\u91cd\u65b0\u8f93\u5165\u5373\u8986\u76d6\uff09' : t('settings.keyPlaceholder'),
		        style: INPUT,
		        onBlur: function (event) {
		          const entered = event.target.value
		          if (entered === '') return
		          event.target.value = ''
		          write('apiKey', entered)
		        },
		      }),
		    ]),
		    // \u4e24\u5bb6\u5f15\u64ce\u7684 Key \u662f**\u4e24\u628a**\uff1a\u7b7e\u53d1\u5f62\u5f0f\u4e0d\u540c\uff0c\u590d\u7528\u5176\u4e2d\u4e00\u628a\u53bb\u8c03\u53e6\u4e00\u5bb6\u53ea\u4f1a\u5f97\u5230\u4e00\u4e2a
		    // \u6beb\u65e0\u6307\u5411\u7684"API Key \u65e0\u6548"\u3002\u5206\u4e24\u680f\u5404\u5b58\u4e00\u628a\uff0c\u6bd4\u8ba9\u7528\u6237\u81ea\u5df1\u731c\u8be5\u586b\u54ea\u4e2a\u66f4\u7701\u4e8b\u3002
		    row('settings.mimoKey', t('settings.mimoKeyHint'), [
		      React.createElement('input', {
		        key: 'mimoKey',
		        type: 'password',
		        defaultValue: '',
		        placeholder: hasMimoSecret ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\uff08\u5df2\u4fdd\u5b58\uff0c\u91cd\u65b0\u8f93\u5165\u5373\u8986\u76d6\uff09' : t('settings.mimoKeyPlaceholder'),
		        style: INPUT,
		        onBlur: function (event) {
		          const entered = event.target.value
		          if (entered === '') return
		          event.target.value = ''
		          write('mimoApiKey', entered)
		        },
		      }),
		    ]),
		    // \u5408\u6210\u65b9\u5f0f\u51b3\u5b9a\u64ad\u653e\u952e"\u591a\u4e45\u51fa\u58f0"\uff0c\u6240\u4ee5\u5b83\u7684\u4f4d\u7f6e\u8981\u5728\u97f3\u8272\u6863\u6848\u4e4b\u524d\uff1a\u5148\u770b\u600e\u4e48\u5ff5\uff0c
		    // \u518d\u770b\u7528\u8c01\u5ff5\u3002
		    row('settings.mode', t('settings.modeHint'), [
		      modeButton('one-shot', 'settings.modeOnce'),
		      modeButton('stream', 'settings.modeStream'),
		    ]),
		    // \u5bbf\u4e3b\u90a3\u8fb9\u771f\u6b63\u4f1a\u8d70\u54ea\u6761\u8def\u3001\u771f\u6b63\u4f1a\u7528\u54ea\u6b3e\u6a21\u578b\uff1a\u8fd9\u4e24\u884c\u90fd\u662f"\u70b9\u4e86\u6309\u94ae\u5374\u770b\u4e0d\u5230\u5b83\u53d8\u5316"
		    // \u65f6\u552f\u4e00\u7684\u89e3\u91ca\u6765\u6e90\u3002
		    count === null || count.mode === undefined
		      ? null
		      : React.createElement('div', { style: HINT },
		        t('settings.modeEffective') + '\uff1a' + (count.mode === 'stream'
		          ? t('settings.modeStream')
		          : t('settings.modeOnce'))
		        + (count.configuredMode === count.mode ? '' : ' \u00b7 ' + t('settings.modeUnsaved'))),
		    count === null || count.model === undefined || count.model === ''
		      ? null
		      : React.createElement('div', { style: HINT },
		        t('settings.modelEffective') + '\uff1a' + count.model
		        + (count.provider === 'mimo' ? '\uff08MiMo\uff09' : '')
		        + (count.lowLatencyStream === false ? ' \u00b7 ' + t('profiles.lowLatencyHint') : '')),
		    profilesBlock,
		    // \u89d2\u8272\u626e\u6f14\u6392\u5728\u97f3\u8272\u6863\u6848\u4e4b\u540e\uff1a\u5b83\u7ed1\u7684\u5c31\u662f\u6863\u6848\u91cc\u7684\u97f3\u8272\uff0c\u5148\u6709\u6863\u6848\u624d\u6709\u5f97\u6311\u3002
		    React.createElement('div', { style: { padding: '10px 0 4px' } },
		      React.createElement('div', { style: BLOCK_TITLE }, t('settings.roleplay')),
		      React.createElement('div', { style: HINT }, t('settings.roleplayHint')),
		      React.createElement('div', { style: { display: 'flex', gap: '8px', padding: '6px 0 0' } },
		        roleplayButton(true, 'settings.roleplayOn'),
		        roleplayButton(false, 'settings.roleplayOff')),
		      // \u670d\u52a1\u7aef\u56de\u62a5\u7684"\u771f\u6b63\u4f1a\u751f\u6548\u7684\u90a3\u4e2a"\uff0c\u4e0e\u672c\u5730\u9009\u62e9\u4e0d\u4e00\u81f4\u65f6\u628a\u8bdd\u8bf4\u51fa\u6765\u3002
		      count === null || count.roleplay === undefined
		        ? null
		        : React.createElement('div', { style: HINT },
		          t('settings.modeEffective') + '\uff1a' + (count.roleplay
		            ? t('settings.roleplayOn')
		            : t('settings.roleplayOff'))
		          + (count.configuredRoleplay === count.roleplay ? '' : ' \u00b7 ' + t('settings.modeUnsaved'))),
		      profileSelect('settings.narrationVoice', narrationProfile, function (id) { pickProfile('narration', id) }),
		      profileSelect('settings.characterVoice', characterProfile, function (id) { pickProfile('character', id) }),
		      React.createElement('div', { style: HINT }, t('settings.roleplayVoiceHint'))),
		    // \u5176\u4f59\u5b57\u6bb5\u540c\u6837\u662f"\u5931\u7126\u5373\u5199\u5165"\uff1a\u6bcf\u6572\u4e00\u4e2a\u5b57\u7b26\u90fd\u53d1\u4e00\u6b21\u5199\u8bf7\u6c42\u4f1a\u628a revision \u7528\u5149\uff0c
		    // \u800c\u4e14\u4e2d\u95f4\u6001\uff08\u534a\u4e2a Key\uff09\u672c\u8eab\u4e5f\u4e0d\u662f\u4e00\u4e2a\u5408\u6cd5\u914d\u7f6e\u3002
		    // \u8fd9\u91cc**\u6ca1\u6709\u6a21\u578b\u9009\u62e9**\uff1a\u6a21\u578b\u8ddf\u7740\u97f3\u8272\u8d70\u3002\u5269\u4e0b\u7684\u8fd9\u4e2a\u97f3\u8272 ID \u53ea\u662f"\u4e00\u5957\u6863\u6848\u90fd\u8fd8\u6ca1
		    // \u5efa\u8d77\u6765\u65f6"\u7684\u515c\u5e95\uff0c\u5b83\u8d70\u54ea\u6b3e\u6a21\u578b\u7531\u670d\u52a1\u7aef\u6309\u9ed8\u8ba4\u6a21\u578b\u51b3\u5b9a\uff0c\u9875\u9762\u4e0a\u4e0d\u518d\u95ee\u7b2c\u4e8c\u904d\u3002
		    row('settings.voice', t('settings.voiceHint'), [
		      React.createElement('input', {
		        key: 'voice',
		        type: 'text',
		        defaultValue: String(value.voiceId || ''),
		        placeholder: t('settings.voicePlaceholder'),
		        style: INPUT,
		        onBlur: function (event) { write('voiceId', event.target.value) },
		      }),
		    ]),
		    row('settings.dir', undefined, [
		      React.createElement('input', {
		        key: 'dir',
		        type: 'text',
		        defaultValue: String(value.outputDir || ''),
		        placeholder: t('settings.dirPlaceholder'),
		        style: INPUT,
		        onBlur: function (event) { write('outputDir', event.target.value) },
		      }),
		      React.createElement('button', { key: 'open', type: 'button', style: BUTTON, onClick: openDir }, t('settings.open')),
		    ]),
		    row('settings.boot', undefined, [
		      React.createElement('input', {
		        key: 'boot',
		        type: 'checkbox',
		        checked: value.bootSound !== false,
		        style: CHECKBOX,
		        onChange: function (event) { write('bootSound', event.target.checked) },
		      }),
		    ]),
		    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 0' } },
		      React.createElement('button', { type: 'button', style: BUTTON, onClick: preview }, t('settings.preview')),
		      React.createElement('button', { type: 'button', style: BUTTON, onClick: clearCache }, t('settings.clear')),
		      count === null
		        ? null
		        : React.createElement('span', { style: { fontSize: '12px', color: T.textFaint } },
		          t('settings.count') + '\uff1a' + String(count.count)),
		      status === null
		        ? null
		        : React.createElement('span', {
		          style: { fontSize: '12px', color: status.kind === 'error' ? '#d93025' : T.textFaint },
		        }, status.message)),
		    React.createElement('div', {
		      style: { fontSize: '12px', lineHeight: '18px', color: T.textFaint, padding: '2px 0 10px' },
		    }, configured ? t('settings.ready') : t('settings.unconfigured')))
		}

		// ---- client/index.js ----
		/**
		 * Bundle \u5165\u53e3\uff1a\u628a\u672c\u63d2\u4ef6\u7684\u5404\u6a21\u5757\u63a5\u8d77\u6765\u3002
		 *
		 * `apply` \u7edd\u4e0d\u80fd\u629b\u5f02\u5e38\u3002\u8fd9\u91cc\u6bcf\u4e2a\u6a21\u5757\u8d21\u732e\u7684\u662f UI\uff0c\u5176\u4e2d\u4e00\u4e2a\u5931\u8d25\u4e0d\u8be5\u628a\u6574\u9875\u62d6\u57ae\uff0c
		 * \u6240\u4ee5\u6bcf\u4e00\u9879\u90fd\u72ec\u7acb try/catch \u2014\u2014 \u4e00\u4e2a\u574f\u6389\u7684\u6a21\u5757\u6700\u574f\u7684\u7ed3\u679c\u662f"\u8fd9\u4e2a\u529f\u80fd\u6ca1\u51fa\u73b0"\uff0c
		 * \u800c\u4e0d\u662f"\u6574\u4e2a\u4f1a\u8bdd\u9762\u677f\u7a7a\u767d"\u3002
		 *
		 * \u4e09\u4ef6\u8d21\u732e\uff1a
		 *
		 * 1. **\u64ad\u653e\u952e**\uff08`conversation.chat.assistant-actions`\uff09\u2014\u2014 v1 \u7684\u5168\u90e8\u4ea4\u4e92\u9762\uff1b
		 * 2. **\u8bbe\u7f6e\u9875**\uff08`settings.section`\uff09\u2014\u2014 \u914d\u7f6e\u3001\u8bd5\u542c\u3001\u6253\u5f00\u76ee\u5f55\u3001\u6e05\u7a7a\u7f13\u5b58\uff1b
		 * 3. **\u5f00\u673a\u97f3** \u2014\u2014 \u9875\u9762\u9996\u6b21\u4ea4\u4e92\u65f6\u6309\u5f00\u5173\u64ad\u4e00\u6b21\u63d0\u793a\u97f3\u3002
		 */

		/** \u672c\u63d2\u4ef6\u62e5\u6709\u7684\u6587\u6848\u547d\u540d\u7a7a\u95f4\u3002 */
		var NS = 'cosyvoice'

		/**
		 * \u5fc5\u9700\u670d\u52a1\uff1aslot \u6ce8\u518c\u8868\u3001\u6587\u6848\u3002
		 *
		 * **\u523b\u610f\u4e0d\u628a\u914d\u7f6e\u8868\u5355\u5199\u8fdb\u6765\u3002**\u5b83\u5728\u65b0\u65e7\u4e24\u7248\u5bbf\u4e3b\u91cc\u7684\u670d\u52a1\u540d\u4e0d\u540c\uff080.2.1 \u662f
		 * `configForms`\uff0c0.1.5 \u662f `settingsScope`\uff09\uff0c\u800c `inject` \u58f0\u660e\u7684\u662f**\u786c\u4f9d\u8d56** \u2014\u2014
		 * \u58f0\u660e\u4e00\u4e2a\u5bbf\u4e3b\u6ca1\u6709\u7684\u670d\u52a1\uff0ccordis \u4f1a\u4e00\u76f4\u7b49\u5b83\uff0c\u63d2\u4ef6\u4e8e\u662f\u6c38\u8fdc\u6302\u8f7d\u4e0d\u4e0a\uff0c\u9875\u9762\u4e0a\u4e00\u4e2a
		 * \u6309\u94ae\u90fd\u4e0d\u4f1a\u51fa\u73b0\u3002\u6240\u4ee5\u8868\u5355\u6539\u4e3a\u8fd0\u884c\u65f6\u63a2\u6d4b\uff08\u89c1 `shared.js` \u7684 `configFormOf`\uff09\uff1a
		 * \u6709\u5c31\u6e32\u67d3\u8bbe\u7f6e\u9875\uff0c\u4e24\u4e2a\u90fd\u6ca1\u6709\u4e5f\u53ea\u635f\u5931\u8bbe\u7f6e\u9875\uff0c\u64ad\u653e\u952e\u7167\u5e38\u5de5\u4f5c\u3002
		 */
		var inject = ['slots', 'locale']

		/**
		 * \u5728\u9875\u9762\u9996\u6b21\u771f\u5b9e\u4ea4\u4e92\u65f6\u64ad\u4e00\u6b21\u63d0\u793a\u97f3\u3002
		 *
		 * \u5fc5\u987b\u662f"\u9996\u6b21\u4ea4\u4e92\u65f6"\u800c\u4e0d\u662f"\u52a0\u8f7d\u5b8c\u6210\u65f6"\uff1a\u6d4f\u89c8\u5668\u7684\u81ea\u52a8\u64ad\u653e\u7b56\u7565\u4f1a\u62e6\u6389\u6ca1\u6709\u7528\u6237\u624b\u52bf
		 * \u7684\u64ad\u653e\uff0c\u800c\u4e00\u6b21\u88ab\u62d2\u7684 `play()` \u518d\u4e5f\u4e0d\u4f1a\u91cd\u6765 \u2014\u2014 \u6240\u4ee5\u8fd9\u91cc\u7b49\u5230\u7528\u6237\u771f\u7684\u78b0\u4e86\u9875\u9762\u3002
		 * @param form - `cosyvoice` \u914d\u7f6e\u8868\u5355\uff0c\u7528\u6765\u8bfb\u5f00\u5173\u3002
		 */
		function armBootSound(form) {
		  var played = false
		  /**
		   * \u4e00\u6b21\u6027\u64ad\u653e\u3002
		   *
		   * \u7528**\u81ea\u5df1\u7684** `Audio` \u800c\u4e0d\u662f\u5171\u4eab\u64ad\u653e\u5668\uff1a\u63d0\u793a\u97f3\u4e0d\u8be5\u62a2\u8d70\u7528\u6237\u6b63\u5728\u542c\u7684\u90a3\u6761\u56de\u7b54\uff0c
		   * \u4e5f\u4e0d\u8be5\u628a\u64ad\u653e\u5668\u7684\u72b6\u6001\u5360\u4f4f\u3002\u6587\u4ef6\u7f3a\u5931\u65f6\u53ea\u662f\u6ca1\u6709\u58f0\u97f3\uff0c\u4e0d\u62a5\u4efb\u4f55\u9519 \u2014\u2014 \u63d0\u793a\u97f3\u4ece\u6765
		   * \u4e0d\u662f\u5173\u952e\u529f\u80fd\u3002
		   */
		  function once() {
		    if (played) return
		    played = true
		    const snapshot = form.getSnapshot()
		    const value = snapshot && snapshot.value ? snapshot.value : {}
		    if (value.bootSound === false) return
		    try {
		      const audio = new Audio(ROUTE_PREFIX + '/boot')
		      audio.volume = 0.5
		      const started = audio.play()
		      if (started && typeof started.catch === 'function') started.catch(function () {})
		    } catch (error) {
		      // \u6ca1\u6709\u63d0\u793a\u97f3\u6587\u4ef6\u3001\u6216\u6d4f\u89c8\u5668\u4e0d\u7ed9\u64ad\uff1a\u9759\u9ed8\u8df3\u8fc7\u3002
		    }
		  }
		  if (typeof document === 'undefined') return
		  document.addEventListener('pointerdown', once, { once: true, passive: true })
		  document.addEventListener('keydown', once, { once: true })
		}

		/**
		 * \u63d2\u4ef6\u4e3b\u4f53\u3002
		 * @param ctx - \u5ba2\u6237\u7aef\u63d2\u4ef6 context\u3002
		 */
		function apply(ctx) {
		  ctx.effect(function () {
		    return ctx.locale.register(NS, { zh: DICT_ZH, en: DICT_EN })
		  }, 'dsh-cosyvoice: dictionaries')
		  const t = ctx.locale.bind(NS)

		  try {
		    ctx.slots.inject('conversation.chat.assistant-actions', function () {
		      return ctx.slots.register({
		        name: 'conversation.chat.assistant-actions',
		        id: 'cosyvoice',
		        order: 20,
		        locale: NS,
		        inject: function () { return {} },
		      }, CosyvoiceSpeakButton)
		    })
		  } catch (error) {
		    console.error('[dsh-cosyvoice] play button failed:', error)
		  }

		  try {
		    // \u4e24\u7248\u5bbf\u4e3b\u7ed9\u7684\u4e0d\u662f\u540c\u4e00\u4e2a\u670d\u52a1\uff0c\u7531 configFormOf \u8fd0\u884c\u65f6\u8ba4\u9886\uff1b\u53d6\u4e0d\u5230\u65f6\u629b\u9519\u843d\u5728
		    // \u4e0b\u9762\u7684 catch \u91cc\uff0c\u4e8e\u662f\u53ea\u5c11\u4e86\u8bbe\u7f6e\u9875\uff0c\u64ad\u653e\u952e\u4e0d\u53d7\u5f71\u54cd\u3002
		    var form = configFormOf(ctx, SETTINGS_ENTRY)
		    if (!form) throw new Error('\u5bbf\u4e3b\u6ca1\u6709\u63d0\u4f9b\u53ef\u7528\u7684\u914d\u7f6e\u8868\u5355\u670d\u52a1')
		    ctx.slots.inject('settings.section', function () {
		      return ctx.slots.register({
		        name: 'settings.section',
		        id: 'cosyvoice',
		        order: 100,
		        locale: NS,
		        label: t('section.label'),
		        inject: function () { return { form: form } },
		      }, CosyvoiceSettingsPage)
		    })
		    armBootSound(form)
		  } catch (error) {
		    console.error('[dsh-cosyvoice] settings page failed:', error)
		  }
		}

		exports.apply = apply;
		exports.inject = inject;
		exports.CosyvoiceSettingsPage = CosyvoiceSettingsPage;
		exports.player = player;
		exports.speakAs = speakAs;
		exports.configFormOf = configFormOf;
		exports.normalizeWrites = normalizeWrites;
		return module.exports;
	}
});
