/**
 * 设置页：挂在 `settings.section` 上，提供一个「语音」分区。
 *
 * 页面自己画表单而不是依赖自动生成的那一套，因为这里有几件自动表单做不到的事：
 * **试听**（要走一次真实合成）、**打开输出目录**、**清空缓存**。前两项是宿主路由
 * 上的副作用，不是字段写入。
 *
 * 字段读写走 `ctx.configForms`：它按 entry id 拿到本插件的配置镜像，写入是「按路径
 * 的增量编辑」，所以本页永远拿不到被脱敏的 API Key 明文，也就不会在提交时把它
 * 抹掉 —— 一个只读到掩码的页面若整份回写，会静默删掉用户存好的 Key。
 *
 * ## 这一页最重要的一条设计：音色即模型
 *
 * 这里**没有**"选一个模型"的全局开关。模型是**每套音色档案自带**的：选哪套音色，就
 * 用它自己绑定的那款模型合成（服务端在 `host/synth.js` 里按档案分派）。于是：
 *
 * - 「新增音色」与「音色克隆」表单里都有一个**模型列表**，选完它，表单的其余输入框
 *   会按这款模型的音色来源（内置 / 复刻 / 设计）整段换掉——用户不需要知道自己填的
 *   到底是音色 ID、音色名还是一句描述；
 * - 档案名由服务端把模型名作为后缀附在末尾（`decorateName`），所以"这套音色属于
 *   哪款模型"在列表上一眼可见；
 * - MiMo 的内置音色（`mimo_default`、冰糖、茉莉……）是可以**勾选添加**的现成音色，
 *   不需要走复刻也不需要手填 ID。
 *
 * 模型清单与内置音色清单都从 `GET /models` 拿（服务端 `host/models.js` 是唯一事实
 * 来源），前端**不复制一份**——否则"页面上能选到什么"迟早与服务端认得的模型对不上，
 * 而对不上的后果是"选了一个这里没有的模型，合成时报 404"。
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
 * 下拉框：模型选择、音色绑定、复刻模型都用它。
 *
 * 三处的可选值都是一个**有限集**（服务端认可的模型、已保存的档案），所以一律做成
 * 列表而不是自由文本：手填模型名的后果是"填错了但看不出来"，而百炼会直接拒绝请求、
 * MiMo 会报一个更费解的错。
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

/** 档案名下面那行等宽小字（音色凭据 + 模型）。 */
var PROFILE_META = {
  fontSize: '11px',
  lineHeight: '16px',
  color: T.textFaint,
  fontFamily: 'monospace',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

/** 一个块的小标题（音色档案 / 克隆 / 内置音色…）。 */
var BLOCK_TITLE = {
  fontSize: '13px',
  lineHeight: '20px',
  color: T.text,
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
  var user = (snapshot && snapshot.user) || {}
  var hasSecret = Object.prototype.hasOwnProperty.call(user, 'apiKey')
  var hasMimoSecret = Object.prototype.hasOwnProperty.call(user, 'mimoApiKey')
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

  // 绑的是**档案 id** 而不是音色 ID：模型跟着档案走，只绑音色就丢了"用哪款模型"
  // 这个信息（同一个音色 ID 在不同模型下未必是同一个嗓子）。
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

  // 档案清单**不**走 configForms：它是插件自管的一个 JSON（见 host/profiles.js），
  // 配置镜像里没有它。于是这里自己拉、自己存，写操作回包里带一份新清单，
  // 省掉一次往返也让列表和"当前音色"永远同一拍。
  var profilesState = React.useState(null)
  var profileData = profilesState[0]
  var setProfileData = profilesState[1]

  /**
   * 模型目录 + MiMo 内置音色，来自 `GET /models`。
   *
   * 拉不到时 `models` 是空数组：页面仍然渲染（其他设置照常可用），只是模型选择
   * 变成一个只有"暂不可用"的列表。用一个空列表而不是整页报错，是因为模型目录只
   * 影响"新增音色"这一件事，不该让它把试听、清缓存这些无关功能一起拖死。
   */
  var catalogState = React.useState(null)
  var catalog = catalogState[0]
  var setCatalog = catalogState[1]

  /** 正在编辑的草稿；`editId` 为空表示"新增"而不是"改这一套"。 */
  var draftState = React.useState({ name: '', model: '', voiceId: '', designPrompt: '' })
  var draft = draftState[0]
  var setDraft = draftState[1]

  var editIdState = React.useState('')
  var editId = editIdState[0]
  var setEditId = editIdState[1]

  /** 待上传的音频文件。 */
  var fileState = React.useState(null)
  var file = fileState[0]
  var setFile = fileState[1]

  /** 克隆用的模型：与草稿里的模型是**两件事**（复刻走的是另一条链路）。 */
  var cloneModelState = React.useState('')
  var cloneModel = cloneModelState[0]
  var setCloneModel = cloneModelState[1]

  /** 内置音色里被勾上的那些，键是音色 id。 */
  var pickedState = React.useState({})
  var picked = pickedState[0]
  var setPicked = pickedState[1]

  /** 克隆/同步这块的进度提示；与页面底部的 status 分开，因为它信息量更大。 */
  var cloneState = React.useState(null)
  var cloneNote = cloneState[0]
  var setCloneNote = cloneState[1]

  /** 目录还没到时，先按"百炼 + 复刻音色"处理——与 `host/models.js` 的回退一致。 */
  var modelList = catalog === null || catalog === undefined || !Array.isArray(catalog.models) ? [] : catalog.models
  var builtinList = catalog === null || catalog === undefined || !Array.isArray(catalog.builtinVoices) ? [] : catalog.builtinVoices

  /**
   * 在目录里查一个模型。
   * @param id - 模型名。
   * @returns 目录条目；查不到时返回 undefined（**不**在这里造一个假条目）。
   */
  function modelEntry(id) {
    for (var i = 0; i < modelList.length; i++) {
      if (modelList[i].id === id) return modelList[i]
    }
    return undefined
  }

  /**
   * 某一类音色的模型（音色来源决定用户要填什么，所以表单要按它换输入框）。
   * @param kind - `preset` / `clone` / `design`。
   * @returns 匹配的模型条目数组。
   */
  function modelsOfKind(kind) {
    return modelList.filter(function (item) { return item.kind === kind })
  }

  /** 草稿里那款模型的音色来源；目录里没有它时按"复刻"处理。 */
  function draftKind() {
    var entry = modelEntry(draft.model)
    return entry === undefined ? 'clone' : entry.kind
  }

  /** 草稿里那款模型是不是 MiMo 的。 */
  function draftIsMimo() {
    var entry = modelEntry(draft.model)
    return entry !== undefined && entry.provider === 'mimo'
  }

  /**
   * 一套档案现在能不能真的拿来合成。
   *
   * 三种档案的"能用"是三件不同的事，少判任何一件都会让用户选中一套注定失败的档案：
   *
   * - **还在部署**（百炼复刻要等音色上线）——`voiceId` 是有的，但拿去合成会被拒；
   * - **凭据缺失**——MiMo 复刻的凭据是**本地参考音频**而不是音色 ID（它没有音色 ID
   *   可持有），所以判定必须看 `sample`；
   * - **描述为空**（音色设计）。
   * @param profile - 档案。
   * @returns 是否可用。
   */
  function isUsable(profile) {
    if (profile.status !== undefined && profile.status !== '' && profile.status !== 'ready') return false
    if (profile.sample !== undefined && profile.sample !== null && profile.sample !== '') return true
    return String(profile.voiceId || '') !== '' || String(profile.designPrompt || '') !== ''
  }

  /** 目录到了之后给草稿与复刻各挑一个默认模型——但**不覆盖用户已经选的**。 */
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

  /** 拉档案清单与模型目录。 */
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
   * 改草稿的一个字段。
   *
   * 换模型时把音色凭据一起清空：上一款模型要的是音色 ID、这一款要的可能是内置音色名
   * 或一句描述，留着旧值就会存下一套"模型与凭据不匹配"的档案——而这种档案能创建成功、
   * 只是合成时报一个毫无信息量的错。
   * @param key - 字段名。
   * @param value - 字段值。
   * @param keep - 为真时不清空音色凭据（改名称时用）。
   */
  function setDraftField(key, value, keep) {
    setDraft(function (prev) {
      if (keep) return { ...prev, [key]: value }
      return { ...prev, [key]: value, voiceId: '', designPrompt: '' }
    })
  }

  /** 清空草稿。 */
  function resetDraft() {
    var fallbackModel = modelList.length === 0 ? '' : modelList[0].id
    setDraft({ name: '', model: fallbackModel, voiceId: '', designPrompt: '' })
    setEditId('')
  }

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

  /**
   * 保存草稿：有 editId 是更新，没有是新增。
   *
   * 校验按**所选模型的音色来源**走，而不是一律要求"音色 ID 非空"：音色设计没有音色
   * ID（它就是那段描述），内置音色填的是音色名。一律要求音色 ID 会让这两类永远存
   * 不进去，而用户看不出自己哪里填错了。
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
   * 把勾上的内置音色一批加进档案。
   *
   * 逐个 `POST` 而不是先本地攒一份再一次性提交：加到第三个失败时，前两个已经在服务端
   * 了，页面上也如实显示两个；而攒完一起提交会让"到底加上了几个"变得不可知。
   * @param ids - 音色 id 数组。
   * @param at - 数组里的第几个（只用于报错时说明是哪一个）。
   * @param added - 已经加上的数量。
   */
  function addPicked(ids, at, added) {
    if (at >= ids.length) {
      setCloneNote({
        kind: 'ok',
        message: t('profiles.builtinAddedCount') + '：' + String(added),
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
        message: voice.name + '：' + ((res && res.message) || t('error.generic')),
      })
    })
  }

  /** 把勾上的内置音色都加进来。 */
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

  /** 轮询一个正在部署的音色（只有百炼复刻需要等）。 */
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
    if (cloneModel === '') {
      setCloneNote({ kind: 'error', message: t('profiles.needModel') })
      return
    }
    setCloneNote({ kind: 'busy', message: t('clone.uploading') })
    var raw = file.name || 'voice.wav'
    file.arrayBuffer().then(function (buffer) {
      // 模型走查询串：这一条路由的 body 是裸音频字节，没地方放别的字段。
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
      // MiMo 复刻是**本地复用**：没有云端部署这一步，参考音频就存在
      // `~/.dsh/voice/samples/`，档案当场可用——所以不能去轮询一个不存在的部署。
      if (res.local === true) {
        setCloneNote({ kind: 'ok', message: t('clone.readyLocal') })
        return
      }
      pollClone(res.profile.id)
    })
  }

  /** 把云端已有的音色拉进档案（百炼复刻出来的那些）。 */
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

  // "能用"的判定要算上档案：一套档案启用着但没有可用音色时，照样可以朗读。
  // 这一行放在 profileData 之后，是因为它还是 undefined 时 `!= null` 会误判成 true。
  var hasVoice = String(value.voiceId || '') !== '' || (profileData !== null && profileData.activeId !== '')
  var configured = (hasSecret || hasMimoSecret || String(value.apiKey || '') !== '' || String(value.mimoApiKey || '') !== '') && hasVoice

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
        model: res.model,
        voiceId: res.voiceId,
        provider: res.provider,
        lowLatencyStream: res.lowLatencyStream,
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
   * 绑定一套音色档案。
   * @param which - `narration` 是旁白，`character` 是角色。
   * @param id - 档案 id；空串表示"跟随当前音色"。
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
   * 要的是"从已经配好的音色里挑一个"，而档案是唯一同时带着音色与模型的东西。
   * 不可用的档案（复刻还没部署好、参考音频丢了）不出现在列表里——让用户选中
   * 一套注定合成不了的档案，比不显示它更糟。
   * @param labelKey - 标签文案键。
   * @param current - 当前值（档案 id）。
   * @param onPick - 选中回调。
   * @returns 一行。
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
   * 模型下拉。
   * @param value - 当前模型名。
   * @param onPick - 选中回调。
   * @param onlyKind - 只列这一类音色的模型（缺省列全部）。
   * @param key - React key。
   * @returns 一个 `select`；目录还没到时是一个禁用的占位。
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
      }, shown[i].label + (shown[i].note === '' ? '' : '（' + shown[i].note + '）')))
    }
    return React.createElement('select', {
      key: key,
      value: value,
      style: SELECT,
      onChange: function (event) { onPick(event.target.value) },
    }, options)
  }

  /**
   * 草稿里"这个音色从哪来"的那一栏。
   *
   * 整段随所选模型的音色来源换掉，而不是三种输入框叠在一起只显示一个：叠着的话
   * 用户会以为"填了音色 ID 就够了"，而在音色设计那一档它压根不读那个字段。
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
      // 内置音色：一个有限集，所以是列表而不是文本框。
      var options = [React.createElement('option', { key: '', value: '' }, t('profiles.builtinPickOne'))]
      for (var i = 0; i < builtinList.length; i++) {
        options.push(React.createElement('option', {
          key: builtinList[i].id,
          value: builtinList[i].id,
        }, builtinList[i].name + '（' + builtinList[i].language + '·' + builtinList[i].gender + '）'))
      }
      return React.createElement('select', {
        key: 'builtin',
        value: draft.voiceId === undefined ? '' : draft.voiceId,
        style: SELECT,
        onChange: function (event) { setDraftField('voiceId', event.target.value, true) },
      }, options)
    }
    if (draftIsMimo()) {
      // MiMo 复刻：音色凭据是**一段参考音频**，不是任何可以手填的字符串。
      // 这里不能给输入框——给一个填了也存不进档案的框，比说清楚更糟。
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
   * 一套档案的"音色凭据"显示成什么。
   *
   * 三类档案的凭据形态完全不同（音色 ID / 内置音色名 / 本地参考音频文件名），而这一行
   * 是用户判断"这套音色到底是什么"的唯一依据，所以按类型分别显示，而不是都退回
   * `voiceId`（对 MiMo 复刻那会是一个空字符串）。
   * @param profile - 档案。
   * @returns 一行小字。
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
   * 一条档案。点"编辑"把它装进草稿，于是新增和编辑共用同一组输入框。
   * @param profile - 档案。
   * @returns 一行。
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
          meta + (profile.model === '' ? '' : ' · ' + profile.model))),
      // 这款模型的流式不是真正的低延迟（MiMo 的复刻与设计两款如此），于是徽章要说在
      // 行上：用户选了"实时"却要等整段合成完时，不该以为是本插件坏了。
      profile.lowLatencyStream === false
        ? React.createElement('span', {
          key: 'stream',
          style: { flex: 'none', fontSize: '11px', color: T.textFaint },
          title: t('profiles.lowLatencyHint'),
        }, t('profiles.lowLatency'))
        : null,
      // 克隆来的音色在部署好之前不能用，所以状态要摆在行上，别让人点了才发现问题。
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
          // 编辑时**不**走 setDraftField 的"清空凭据"那一支：那是给"换模型"用的，
          // 而这里模型没变，清掉等于让用户改个名字也要重新填音色。
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

  /** 内置音色列表里的一行（复选框 + 名字 + 说明 + 是否已添加）。 */
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
          voice.name + (voice.note === '' ? '' : '（' + voice.note + '）')),
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
    // ---- 新增 / 编辑：一行放不下，所以模型与名称一行、音色凭据一行 ----
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
    // ---- MiMo 内置音色：勾选添加 ----
    React.createElement('div', { style: { padding: '8px 0 0' } },
      React.createElement('div', { style: BLOCK_TITLE }, t('profiles.builtinTitle')),
      React.createElement('div', { style: HINT }, t('profiles.builtinHint')),
      builtinList.length === 0
        ? React.createElement('div', { style: HINT }, t('models.loading'))
        : React.createElement('div', null, builtinList.map(builtinRow)),
      builtinList.length === 0
        ? null
        : React.createElement('button', { type: 'button', style: BUTTON, onClick: addBuiltinPicked }, t('profiles.builtinAdd'))),
    // ---- 音色克隆 ----
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
    // 两家引擎的 Key 是**两把**：签发形式不同，复用其中一把去调另一家只会得到一个
    // 毫无指向的"API Key 无效"。分两栏各存一把，比让用户自己猜该填哪个更省事。
    row('settings.mimoKey', t('settings.mimoKeyHint'), [
      React.createElement('input', {
        key: 'mimoKey',
        type: 'password',
        defaultValue: '',
        placeholder: hasMimoSecret ? '••••••••（已保存，重新输入即覆盖）' : t('settings.mimoKeyPlaceholder'),
        style: INPUT,
        onBlur: function (event) {
          const entered = event.target.value
          if (entered === '') return
          event.target.value = ''
          write('mimoApiKey', entered)
        },
      }),
    ]),
    // 合成方式决定播放键"多久出声"，所以它的位置要在音色档案之前：先看怎么念，
    // 再看用谁念。
    row('settings.mode', t('settings.modeHint'), [
      modeButton('one-shot', 'settings.modeOnce'),
      modeButton('stream', 'settings.modeStream'),
    ]),
    // 宿主那边真正会走哪条路、真正会用哪款模型：这两行都是"点了按钮却看不到它变化"
    // 时唯一的解释来源。
    count === null || count.mode === undefined
      ? null
      : React.createElement('div', { style: HINT },
        t('settings.modeEffective') + '：' + (count.mode === 'stream'
          ? t('settings.modeStream')
          : t('settings.modeOnce'))
        + (count.configuredMode === count.mode ? '' : ' · ' + t('settings.modeUnsaved'))),
    count === null || count.model === undefined || count.model === ''
      ? null
      : React.createElement('div', { style: HINT },
        t('settings.modelEffective') + '：' + count.model
        + (count.provider === 'mimo' ? '（MiMo）' : '')
        + (count.lowLatencyStream === false ? ' · ' + t('profiles.lowLatencyHint') : '')),
    profilesBlock,
    // 角色扮演排在音色档案之后：它绑的就是档案里的音色，先有档案才有得挑。
    React.createElement('div', { style: { padding: '10px 0 4px' } },
      React.createElement('div', { style: BLOCK_TITLE }, t('settings.roleplay')),
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
      profileSelect('settings.narrationVoice', narrationProfile, function (id) { pickProfile('narration', id) }),
      profileSelect('settings.characterVoice', characterProfile, function (id) { pickProfile('character', id) }),
      React.createElement('div', { style: HINT }, t('settings.roleplayVoiceHint'))),
    // 其余字段同样是"失焦即写入"：每敲一个字符都发一次写请求会把 revision 用光，
    // 而且中间态（半个 Key）本身也不是一个合法配置。
    // 这里**没有模型选择**：模型跟着音色走。剩下的这个音色 ID 只是"一套档案都还没
    // 建起来时"的兜底，它走哪款模型由服务端按默认模型决定，页面上不再问第二遍。
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