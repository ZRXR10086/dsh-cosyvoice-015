/**
 * 设置页：挂在 `settings.section` 上，提供一个「语音」分区。
 *
 * 页面自己画表单而不是依赖自动生成的那一套，因为这里有三件自动表单做不到的事：
 * **试听**（要走一次真实合成）、**打开输出目录**、**清空缓存**。前两项是宿主路由
 * 上的副作用，不是字段写入。
 *
 * 字段读写走 `ctx.configForms`：它按 entry id 拿到本插件的配置镜像，写入是「按路径
 * 的增量编辑」，所以本页永远拿不到被脱敏的 API Key 明文，也就不会在提交时把它
 * 抹掉 —— 一个只读到掩码的页面若整份回写，会静默删掉用户存好的 Key。
 */

/** 一行设置：标签列 + 内容列。 */
var ROW = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '14px 0',
  borderBottom: '1px solid ' + T.borderSoft,
}

/** 标签列。 */
var ROW_LABEL = {
  flex: 'none',
  width: '96px',
  fontSize: '13px',
  lineHeight: '20px',
  color: T.textDim,
}

/** 内容列。 */
var ROW_BODY = {
  flex: '1',
  minWidth: '0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
}

/** 文本输入框，对齐宿主自己的行样式。 */
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

/** 次级按钮。 */
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

/** 行下方的说明文字。 */
var HINT = {
  fontSize: '12px',
  lineHeight: '18px',
  color: T.textFaint,
  padding: '2px 0 10px',
}

/** 原生复选框，用品牌色着色。 */
var CHECKBOX = {
  width: '18px',
  height: '18px',
  margin: '0',
  cursor: 'pointer',
  accentColor: T.accent,
}

/** 档案列表里的一行。 */
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

/** 档案行里的小按钮：一行挤了四个动作，用不着主按钮的体型。 */
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

/** 合成模式切换里的一个按钮。 */
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

/** 模式切换里选中的那一半：用品牌色描边 + 底色，一眼看得出当前是哪种。 */
/** 下拉框：音色绑定用它，因为可选的值是"已保存的档案"这个有限集。 */
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

/** 档案名下面那行等宽小字（音色 ID + 模型）。 */
var PROFILE_META = {
  fontSize: '11px',
  lineHeight: '16px',
  color: T.textFaint,
  fontFamily: 'monospace',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

/**
 * 订阅一个配置镜像。
 * @param form - `configForms` 给出的表单控制器。
 * @returns `[快照, 写字段]`。
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
 * 语音设置页。
 * @param props - `t`（本插件字典）、`close`（宿主给的关闭动作）与注入的表单。
 * @returns 页面内容。
 */
function CosyvoiceSettingsPage(props) {
  var t = props.t
  var form = props.form

  var pair = useConfigForm(form)
  var snapshot = pair[0]
  var write = pair[1]

  var value = (snapshot && snapshot.value) || {}
  var hasSecret = !!(snapshot && snapshot.user && typeof snapshot.user === 'object' && 'apiKey' in snapshot.user)
  // 合成方式有两个来源：**本地那一份优先** —— 它是"点了这一次"的结果，而配置
  // 镜像要等宿主把写入跑完才变。于是切换当场就能看见，写配置失败也不会把按钮
  // 变成"点了没反应"。
  var modeState = React.useState(readMode())
  var setMode = modeState[1]
  // 没在本地选过（初次安装）时，以配置镜像为准；之后一律听本地那一份。
  var mode = modeState[0] === ''
    ? (String(value.mode || '') === 'stream' ? 'stream' : 'one-shot')
    : modeState[0]

  // 角色扮演：与合成方式同一套处理方式 —— 本机那一份优先，配置镜像是"没选过时"
  // 的默认值。绑定音色同理，唯一区别是它还要区分"没选过（null）"与"选了跟随
  // （空串）"，否则选了跟随之后下一次打开又会跳回配置里那个值。
  var roleState = React.useState(readRoleplay())
  var setRoleLocal = roleState[1]
  var roleplayOn = roleState[0] === ''
    ? value.roleplay === true
    : roleState[0] === 'true'

  var narrationState = React.useState(readNarrationVoice())
  var setNarrationLocal = narrationState[1]
  var narrationVoice = narrationState[0] === null || narrationState[0] === undefined
    ? String(value.narrationVoiceId || '')
    : narrationState[0]

  var characterState = React.useState(readCharacterVoice())
  var setCharacterLocal = characterState[1]
  var characterVoice = characterState[0] === null || characterState[0] === undefined
    ? String(value.characterVoiceId || '')
    : characterState[0]

  var statusState = React.useState(null)
  var status = statusState[0]
  var setStatus = statusState[1]

  var countState = React.useState(null)
  var count = countState[0]
  var setCount = countState[1]

  // 档案清单**不**走 configForms：它是插件自管的一个 JSON（见 host/profiles.js），
  // 配置镜像里没有它。于是这里自己拉、自己存，写操作回包里带一份新清单，
  // 省掉一次往返也让列表和"当前音色"永远同一拍。
  var profilesState = React.useState(null)
  var profileData = profilesState[0]
  var setProfileData = profilesState[1]

  /** 正在编辑的草稿；`editId` 为空表示"新增"而不是"改这一套"。 */
  var draftState = React.useState({ name: '', voiceId: '', model: '' })
  var draft = draftState[0]
  var setDraft = draftState[1]

  var editIdState = React.useState('')
  var editId = editIdState[0]
  var setEditId = editIdState[1]

  /** 待上传的音频文件。 */
  var fileState = React.useState(null)
  var file = fileState[0]
  var setFile = fileState[1]

  /** 克隆/同步这块的进度提示；与页面底部的 status 分开，因为它信息量更大。 */
  var cloneState = React.useState(null)
  var cloneNote = cloneState[0]
  var setCloneNote = cloneState[1]

  /** 轮询一个正在部署的音色。 */
  function pollClone(id) {
    var tries = 0
    setCloneNote({ kind: 'busy', message: t('clone.pending') })
    // 客户端轮询而不是服务端挂长请求：关掉页面就不会留下 orphan 轮询。
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
        // 部署通常几秒到几分钟，两分钟足够；超时不判失败，列表里的状态仍在。
        if (tries >= 40) {
          setCloneNote({ kind: 'error', message: t('clone.timeout') })
          return
        }
        setTimeout(tick, 3000)
      })
    }
    setTimeout(tick, 1500)
  }

  /** 上传音频并复刻。 */
  function startClone() {
    if (file === null || file === undefined) {
      setCloneNote({ kind: 'error', message: t('clone.noFile') })
      return
    }
    setCloneNote({ kind: 'busy', message: t('clone.uploading') })
    var raw = file.name || 'voice.wav'
    file.arrayBuffer().then(function (buffer) {
      return rpcBytes('clone',
        'name=' + encodeURIComponent(raw.replace(/\.[^.]+$/, '')) + '&filename=' + encodeURIComponent(raw),
        buffer)
    }).then(function (res) {
      if (res === undefined || !res.ok) {
        setCloneNote({ kind: 'error', message: (res && res.message) || t('clone.failed') })
        return
      }
      setProfileData({ profiles: res.profiles || [], activeId: res.activeId || '' })
      pollClone(res.profile.id)
    })
  }

  /** 把云端已有的音色拉进档案。 */
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
        message: res.added > 0 ? t('clone.synced') + '：' + String(res.added) : t('clone.syncedNone'),
      })
    })
  }

  // "能用"的判定要算上档案：一套档案启用着但没有默认音色 ID 时，照样可以朗读。
  // 这一行放在 profileData 之后，是因为它还是 undefined 时 `!= null` 会误判成 true。
  var hasVoice = String(value.voiceId || '') !== '' || (profileData !== null && profileData.activeId !== '')
  var configured = (hasSecret || String(value.apiKey || '') !== '') && hasVoice

  /** 清空草稿。 */
  function resetDraft() {
    setDraft({ name: '', voiceId: '', model: '' })
    setEditId('')
  }

  /** 拉取档案清单。 */
  function refreshProfiles() {
    rpc('profiles').then(function (res) {
      if (res === undefined || !res.ok) return
      setProfileData({ profiles: res.profiles || [], activeId: res.activeId || '' })
    })
  }

  React.useEffect(function () { refreshProfiles() }, [])

  /** 启用一套档案。 */
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

  /** 删除一套档案。 */
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

  /** 保存草稿：有 editId 是更新，没有是新增。 */
  function saveProfile() {
    var voiceId = String(draft.voiceId || '').trim()
    if (voiceId === '') {
      setStatus({ kind: 'error', message: t('profiles.needVoice') })
      return
    }
    rpc('profiles', {
      id: editId,
      name: String(draft.name || '').trim(),
      voiceId: voiceId,
      model: String(draft.model || '').trim(),
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

  // 把自己的选择带上去问，于是拿回来的是"按这个选择真正会走哪条路"，而不是
  // 配置文档里那一行 —— 两者不一致时（配置没写进去）页面会明确说出来。
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
      })
    })
  }, [snapshot, mode, roleplayOn])

  /**
   * 试听：走一次真实合成，所以能一次性验出 Key、模型与音色是否匹配。
   */
  function preview() {
    setStatus(null)
    // 试听走的正是播放键那条路：`speakAs` 按服务端模式自己选整段还是流式，所以
    // 试听也是在验用户真正会用到的那一条链路。
    // 角色扮演开着的时候，试听文本得带一句台词，否则听不出"旁白/角色两种声音"。
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
   * 在系统文件管理器里打开输出目录。
   */
  function openDir() {
    rpc('open').then(function (res) {
      if (res === undefined || !res.ok) setStatus({ kind: 'error', message: (res && res.message) || '' })
    })
  }

  /**
   * 清空音频缓存。
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
   * 切换合成方式。
   *
   * 先本地生效（于是这一下**一定有反应**），再去试着把它写进宿主配置：写进去
   * 就持久化，写不进去（schema 还没跟着更新、或通道临时不可用）也在页面上说
   * 出来，而不是静默失败 —— 用户上一次遇到的正是"点了没变化也不知道为什么"。
   * @param target - 要切到的模式。
   */
  function switchMode(target) {
    setMode(target)
    saveMode(target)
    setStatus(null)
    // 走 form.set 而不是那个静默的 `write()`：这里的失败**必须**让人看见。
    var done
    try {
      done = form.set('mode', target)
    } catch (error) {
      setStatus({ kind: 'error', message: t('settings.modeFailed') })
      console.error('[dsh-cosyvoice] 写入合成方式失败：', error)
      return
    }
    if (done !== undefined && done !== null && typeof done.then === 'function') {
      done.then(function () {
        setStatus({ kind: 'ok', message: t('settings.modeSaved') })
      }).catch(function (error) {
        setStatus({ kind: 'error', message: t('settings.modeFailed') })
        console.error('[dsh-cosyvoice] 写入合成方式失败：', error)
      })
    }
  }

  /**
   * 模式切换里的一个按钮。
   * @param target - 它代表的模式。
   * @param labelKey - 文案键。
   * @returns 一个按钮。
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
   * 写回宿主配置，并且**把失败说出来**。
   *
   * `write()` 会静默吞掉 rejection（见 {@link useConfigForm}），那对"改个 Key"是
   * 合适的，但对开关不合适：用户拨了一下却毫无反馈，就无法区分"生效了"和"没生效"。
   * @param field - 配置字段名。
   * @param value - 要写入的值。
   * @param okKey - 成功文案键。
   * @param failKey - 失败文案键。
   */
  function writeVisible(field, value, okKey, failKey) {
    setStatus(null)
    var done
    try {
      done = form.set(field, value)
    } catch (error) {
      setStatus({ kind: 'error', message: t(failKey) })
      console.error('[dsh-cosyvoice] 写入 ' + field + ' 失败：', error)
      return
    }
    if (done !== undefined && done !== null && typeof done.then === 'function') {
      done.then(function () {
        setStatus({ kind: 'ok', message: t(okKey) })
      }).catch(function (error) {
        setStatus({ kind: 'error', message: t(failKey) })
        console.error('[dsh-cosyvoice] 写入 ' + field + ' 失败：', error)
      })
    }
  }

  /** 拨动角色扮演开关。 */
  function switchRoleplay(on) {
    setRoleLocal(on ? 'true' : 'false')
    saveRoleplay(on)
    writeVisible('roleplay', on, 'settings.roleplaySaved', 'settings.roleplayFailed')
  }

  /**
   * 绑定一个音色。
   * @param which - `narration` 是旁白，`character` 是角色。
   * @param id - 音色 ID；空串表示"跟随当前音色"。
   */
  function pickVoice(which, id) {
    if (which === 'narration') {
      setNarrationLocal(id)
      saveNarrationVoice(id)
      writeVisible('narrationVoiceId', id, 'settings.roleplayVoiceSaved', 'settings.roleplayVoiceFailed')
      return
    }
    setCharacterLocal(id)
    saveCharacterVoice(id)
    writeVisible('characterVoiceId', id, 'settings.roleplayVoiceSaved', 'settings.roleplayVoiceFailed')
  }

  /**
   * 角色扮演开关里的一个按钮。
   * @param on - 它代表的那个值。
   * @param labelKey - 文案键。
   * @returns 一个按钮。
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
   * 一个音色绑定下拉。
   *
   * 选项只有两类：跟随当前音色（空），以及已保存的档案。不做自由输入是因为这里
   * 要的是"从已经配好的音色里挑一个"，手填 ID 是上面「默认音色 ID」那一栏的事。
   * @param labelKey - 标签文案键。
   * @param current - 当前值。
   * @param onPick - 选中回调。
   * @returns 一行。
   */
  function voiceSelect(labelKey, current, onPick) {
    var options = [React.createElement('option', { key: '', value: '' }, t('settings.voiceFollow'))]
    var list = profileData === null || profileData === undefined ? [] : profileData.profiles
    for (var i = 0; i < list.length; i++) {
      var profile = list[i]
      if (profile.voiceId === '') continue
      options.push(React.createElement('option', {
        key: profile.id,
        value: profile.voiceId,
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
   * 草稿里的一个输入框。
   * @param key - `name` / `voiceId` / `model`。
   * @param placeholderKey - 占位文案的字典键。
   * @returns 受控输入框。
   */
  function draftField(key, placeholderKey) {
    return React.createElement('input', {
      key: key,
      type: 'text',
      value: draft[key] === undefined ? '' : draft[key],
      placeholder: t(placeholderKey),
      style: INPUT,
      onChange: function (event) {
        var next = { name: draft.name, voiceId: draft.voiceId, model: draft.model }
        next[key] = event.target.value
        setDraft(next)
      },
    })
  }

  /**
   * 一条档案。点"编辑"把它装进草稿，于是新增和编辑共用同一组输入框。
   * @param profile - 档案。
   * @returns 一行。
   */
  function profileRow(profile) {
    var isActive = profileData !== null && profile.id === profileData.activeId
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
          profile.voiceId + (profile.model === '' ? '' : ' · ' + profile.model))),
      // 克隆来的音色在部署好之前不能用，所以状态要摆在行上，别让人点了才发现问题。
      profile.status === 'ready' || profile.status === undefined
        ? null
        : React.createElement('span', {
          style: {
            flex: 'none',
            fontSize: '11px',
            color: profile.status === 'failed' ? '#d93025' : T.textFaint,
          },
        }, profile.status === 'failed' ? t('profiles.failed') : t('profiles.pending')),
      isActive
        ? React.createElement('span', { style: { flex: 'none', fontSize: '11px', color: T.accent } }, t('profiles.current'))
        : React.createElement('button', {
          type: 'button',
          style: MINI_BUTTON,
          onClick: function () { useProfile(profile.id) },
        }, t('profiles.use')),
      React.createElement('button', {
        type: 'button',
        style: MINI_BUTTON,
        onClick: function () {
          setEditId(profile.id)
          setDraft({ name: profile.name || '', voiceId: profile.voiceId || '', model: profile.model || '' })
        },
      }, t('profiles.edit')),
      React.createElement('button', {
        type: 'button',
        style: MINI_BUTTON,
        onClick: function () { removeProfile(profile.id) },
      }, t('profiles.delete')))
  }

  var profilesBlock = React.createElement('div', { style: { padding: '10px 0 4px' } },
    React.createElement('div', { style: { fontSize: '13px', lineHeight: '20px', color: T.text } }, t('profiles.title')),
    React.createElement('div', { style: HINT }, t('profiles.hint')),
    profileData === null || profileData.profiles.length === 0
      ? React.createElement('div', { style: HINT }, t('profiles.empty'))
      : React.createElement('div', null, profileData.profiles.map(profileRow)),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
      draftField('name', 'profiles.namePlaceholder'),
      draftField('voiceId', 'profiles.voicePlaceholder'),
      draftField('model', 'profiles.modelPlaceholder'),
      React.createElement('button', {
        type: 'button',
        style: BUTTON,
        onClick: saveProfile,
      }, editId === '' ? t('profiles.add') : t('profiles.save')),
      editId === ''
        ? null
        : React.createElement('button', { type: 'button', style: BUTTON, onClick: resetDraft }, t('profiles.cancel'))),
    React.createElement('div', { style: { fontSize: '13px', lineHeight: '20px', color: T.text, padding: '6px 0 0' } }, t('clone.title')),
    React.createElement('div', { style: HINT }, t('clone.hint')),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
      React.createElement('input', {
        type: 'file',
        accept: 'audio/*',
        style: { flex: 'none', fontSize: '12px', color: T.textDim, maxWidth: '220px' },
        onChange: function (event) {
          var picked = event.target.files === null || event.target.files === undefined ? null : event.target.files[0]
          setFile(picked === undefined ? null : picked)
        },
      }),
      React.createElement('button', { type: 'button', style: BUTTON, onClick: startClone }, t('clone.start')),
      React.createElement('button', { type: 'button', style: BUTTON, onClick: syncCloud }, t('clone.sync')),
      cloneNote === null
        ? null
        : React.createElement('span', {
          style: {
            fontSize: '12px',
            color: cloneNote.kind === 'error' ? '#d93025' : cloneNote.kind === 'ok' ? T.accent : T.textFaint,
          },
        }, cloneNote.message)))

  return React.createElement('div', { style: { display: 'block' } },
    React.createElement('div', { style: { fontSize: '16px', lineHeight: '24px', color: T.text, padding: '4px 0 2px' } }, t('settings.title')),
    React.createElement('div', { style: HINT }, t('settings.hint')),
    row('settings.key', undefined, [
      // 密码框，且**非受控**：本页永远读不到明文（密钥在通道上被脱敏），所以一个
      // 受控输入框会在每次按键后把自己清空。失焦即写入，写完把框清掉 —— 回填一个
      // 掩码没有任何信息量。
      React.createElement('input', {
        key: 'key',
        type: 'password',
        defaultValue: '',
        placeholder: hasSecret ? '••••••••（已保存，重新输入即覆盖）' : t('settings.keyPlaceholder'),
        style: INPUT,
        onBlur: function (event) {
          const entered = event.target.value
          if (entered === '') return
          event.target.value = ''
          write('apiKey', entered)
        },
      }),
    ]),
    // 合成方式决定播放键"多久出声"，所以它的位置要在音色档案之前：先看怎么念，
    // 再看用谁念。
    row('settings.mode', t('settings.modeHint'), [
      modeButton('one-shot', 'settings.modeOnce'),
      modeButton('stream', 'settings.modeStream'),
    ]),
    // 宿主那边真正会走哪条路：点了按钮却看不到它变化，就只能靠这一行来说明。
    count === null || count.mode === undefined
      ? null
      : React.createElement('div', { style: HINT },
        t('settings.modeEffective') + '：' + (count.mode === 'stream'
          ? t('settings.modeStream')
          : t('settings.modeOnce'))
        + (count.configuredMode === count.mode ? '' : ' · ' + t('settings.modeUnsaved'))),
    profilesBlock,
    // 角色扮演排在音色档案之后：它绑的就是档案里的音色，先有档案才有得挑。
    React.createElement('div', { style: { padding: '10px 0 4px' } },
      React.createElement('div', { style: { fontSize: '13px', lineHeight: '20px', color: T.text } }, t('settings.roleplay')),
      React.createElement('div', { style: HINT }, t('settings.roleplayHint')),
      React.createElement('div', { style: { display: 'flex', gap: '8px', padding: '6px 0 0' } },
        roleplayButton(true, 'settings.roleplayOn'),
        roleplayButton(false, 'settings.roleplayOff')),
      // 服务端回报的"真正会生效的那个"，与本地选择不一致时把话说出来。
      count === null || count.roleplay === undefined
        ? null
        : React.createElement('div', { style: HINT },
          t('settings.modeEffective') + '：' + (count.roleplay
            ? t('settings.roleplayOn')
            : t('settings.roleplayOff'))
          + (count.configuredRoleplay === count.roleplay ? '' : ' · ' + t('settings.modeUnsaved'))),
      voiceSelect('settings.narrationVoice', narrationVoice, function (id) { pickVoice('narration', id) }),
      voiceSelect('settings.characterVoice', characterVoice, function (id) { pickVoice('character', id) }),
      React.createElement('div', { style: HINT }, t('settings.roleplayVoiceHint'))),
    // 其余字段同样是"失焦即写入"：每敲一个字符都发一次写请求会把 revision 用光，
    // 而且中间态（半个 Key）本身也不是一个合法配置。
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
    row('settings.model', t('settings.modelHint'), [
      React.createElement('input', {
        key: 'model',
        type: 'text',
        defaultValue: String(value.model || ''),
        placeholder: 'cosyvoice-v3.5-plus',
        style: INPUT,
        onBlur: function (event) { write('model', event.target.value) },
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
          t('settings.count') + '：' + String(count.count)),
      status === null
        ? null
        : React.createElement('span', {
          style: { fontSize: '12px', color: status.kind === 'error' ? '#d93025' : T.textFaint },
        }, status.message)),
    React.createElement('div', {
      style: { fontSize: '12px', lineHeight: '18px', color: T.textFaint, padding: '2px 0 10px' },
    }, configured ? t('settings.ready') : t('settings.unconfigured')))
}
