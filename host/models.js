/**
 * 模型目录：两套引擎（阿里云百炼 CosyVoice / 小米 MiMo）的全部可用模型，以及
 * MiMo 的预置音色清单。
 *
 * **为什么要有这一层，而不是把模型名散落在各处当字符串**：音色档案是「名称 + 音色 +
 * 模型」三者绑定的（见 `./profiles.js`），于是"这个音色该用哪个模型"成了合成链路的
 * 第一等事实。如果模型名只是字符串，那么每加一个模型要改的地方就有七八处
 * ——设置页的草稿框、克隆表单、档案行的说明、合成时的分派，而漏掉任何一处的后果都是
 * "选了这个音色，却用那个模型去合成"，报出来的错还极其难懂（MiMo 会说音色不存在）。
 *
 * 所以这里把**一个模型的全部知识**收在一行里：
 *
 * | 字段 | 作用 |
 * | --- | --- |
 * | `id` | 发给云端的模型名 |
 * | `provider` | 走哪一套客户端（`dashscope` / `mimo`） |
 * | `kind` | 音色怎么来（内置 / 复刻 / 设计）—— 决定设置页给什么输入框 |
 * | `streaming` | 是否支持真正的低延迟流式 |
 * | `label` / `note` | 界面上给人看的说明 |
 *
 * `kind` 尤其关键：它让"新增音色"表单能按模型**换掉整段输入 UI**——
 * 选预置模型时给一份内置音色列表可勾选，选复刻模型时给文件选择器，选设计模型时给一个
 * 描述文本框。用户不需要知道自己填的到底是音色 ID 还是音色描述。
 * @module dsh-cosyvoice/models
 */

/** 阿里云百炼。 */
export const PROVIDER_DASHSCOPE = 'dashscope'

/** 小米 MiMo 开放平台。 */
export const PROVIDER_MIMO = 'mimo'

/**
 * 音色从哪来。
 *
 * - `preset`：模型自带一批音色，填音色名即可（MiMo 预置音色）；
 * - `clone`：用一段参考音频复刻出来的，填音色 ID（百炼复刻 / MiMo 克隆）；
 * - `design`：用一段文字描述生成的，填描述（MiMo 音色设计）。
 */
export const KIND_PRESET = 'preset'
export const KIND_CLONE = 'clone'
export const KIND_DESIGN = 'design'

/**
 * MiMo 的预置音色。
 *
 * `id` 就是请求里 `audio.voice` 要填的值，而 `name` 是它在文档与控制台里的中文名。
 * 两者的对应不是装饰：`mimo_default` 的实际音色**随部署集群而异**（中国集群是"冰糖"，
 * 其他集群是 "Mia"），所以 `mimo_default` 与 `冰糖` 在中国集群上是同一把嗓子。
 *
 * 语言一栏只影响合成质量，不影响请求；列出来是为了让人能一眼挑到合适的那一把。
 */
export const MIMO_BUILTIN_VOICES = [
  { id: 'mimo_default', name: 'MiMo-默认', language: '中文', gender: '女性', note: '默认音色，实际嗓音随部署集群而异' },
  { id: '冰糖', name: '冰糖', language: '中文', gender: '女性', note: '清澈甜美' },
  { id: '茉莉', name: '茉莉', language: '中文', gender: '女性', note: '温柔知性' },
  { id: '苏打', name: '苏打', language: '中文', gender: '男性', note: '阳光活力' },
  { id: '白桦', name: '白桦', language: '中文', gender: '男性', note: '沉稳磁性' },
  { id: 'Mia', name: 'Mia', language: '英文', gender: '女性', note: 'Bright, youthful' },
  { id: 'Chloe', name: 'Chloe', language: '英文', gender: '女性', note: 'Warm, sophisticated' },
  { id: 'Milo', name: 'Milo', language: '英文', gender: '男性', note: 'Energetic, friendly' },
  { id: 'Dean', name: 'Dean', language: '英文', gender: '男性', note: 'Deep, authoritative' },
]

/**
 * 全部可用模型的目录。
 *
 * 顺序即设置页里的呈现顺序：先是原来的百炼模型（保持老用户看到的顺序不变），再是
 * MiMo 三款，并按「预置 → 克隆 → 设计」排列，与用户脑子里"从简单到复杂"的次序一致。
 *
 * `streaming` 标注的是**真正的低延迟流式**：MiMo 官方文档明确写了 VoiceDesign 与
 * VoiceClone 的流式接口"暂未上线，目前降级为兼容模式，仅在所有推理完成后以流式格式
 * 返回一次结果"。这不是本插件能绕过的——所以那两款的界面上要如实说明，否则用户选了
 * "实时"却发现要等整段合成完，会觉得是本插件坏了。
 */
export const MODELS = [
  {
    id: 'cosyvoice-v3.5-plus',
    provider: PROVIDER_DASHSCOPE,
    kind: KIND_CLONE,
    streaming: true,
    label: 'CosyVoice v3.5 Plus',
    note: '百炼默认模型，语调最连贯',
  },
  {
    id: 'cosyvoice-v3.5-flash',
    provider: PROVIDER_DASHSCOPE,
    kind: KIND_CLONE,
    streaming: true,
    label: 'CosyVoice v3.5 Flash',
    note: '更快，音色需用同一模型注册',
  },
  {
    id: 'cosyvoice-v3-plus',
    provider: PROVIDER_DASHSCOPE,
    kind: KIND_CLONE,
    streaming: true,
    label: 'CosyVoice v3 Plus',
    note: '上一代模型',
  },
  {
    id: 'cosyvoice-v3-flash',
    provider: PROVIDER_DASHSCOPE,
    kind: KIND_CLONE,
    streaming: true,
    label: 'CosyVoice v3 Flash',
    note: '上一代模型的快速版',
  },
  {
    id: 'cosyvoice-v2',
    provider: PROVIDER_DASHSCOPE,
    kind: KIND_CLONE,
    streaming: true,
    label: 'CosyVoice v2',
    note: '旧版，仍可用',
  },
  {
    id: 'cosyvoice-v1',
    provider: PROVIDER_DASHSCOPE,
    kind: KIND_CLONE,
    streaming: true,
    label: 'CosyVoice v1',
    note: '最旧的一代',
  },
  {
    id: 'mimo-v2.5-tts',
    provider: PROVIDER_MIMO,
    kind: KIND_PRESET,
    streaming: true,
    label: 'MiMo-V2.5-TTS（预置音色）',
    note: '内置精品音色，支持唱歌模式；低延迟流式已上线',
  },
  {
    id: 'mimo-v2.5-tts-voiceclone',
    provider: PROVIDER_MIMO,
    kind: KIND_CLONE,
    streaming: false,
    label: 'MiMo-V2.5-TTS-VoiceClone（音色复刻）',
    note: '数秒参考音频即可复刻；流式为兼容模式，需等整段合成完',
  },
  {
    id: 'mimo-v2.5-tts-voicedesign',
    provider: PROVIDER_MIMO,
    kind: KIND_DESIGN,
    streaming: false,
    label: 'MiMo-V2.5-TTS-VoiceDesign（音色设计）',
    note: '一句文字描述生成新音色；流式为兼容模式，需等整段合成完',
  },
]

/** 未登记的模型名回落到它（保持 v1/v2 的行为：老配置写什么就用什么）。 */
export const DEFAULT_MODEL = 'cosyvoice-v3.5-plus'

/** 未登记模型时假定的引擎；与 v1~v3 一致，都走百炼。 */
export const DEFAULT_PROVIDER = PROVIDER_DASHSCOPE

/** 未登记模型的音色来源假定；老配置里的 `voiceId` 是复刻出来的音色。 */
export const DEFAULT_KIND = KIND_CLONE

/** `id → 目录条目` 的索引。构建一次，之后全是 O(1) 查表。 */
const BY_ID = new Map(MODELS.map(model => [model.id, model]))

/**
 * 查一个模型；没登记过就按"百炼 + 复刻音色"处理。
 *
 * 这样处理而不是报错，是为了**用户手写配置的老用户零改动继续可用**：配置文件里
 * 出现过的模型名永远被接受。代价是对着一个不存在的模型名会得到一个百炼 404，
 * 而不是一句"这个模型不在列表里"——所以下面 {@link describeModel} 会把已知模型
 * 与未知模型分开说，未知的那条把名字原样带出去。
 * @param id - 模型名。
 * @returns 目录条目。
 */
export function modelOf(id) {
  const key = String(id ?? '').trim()
  if (BY_ID.has(key)) return BY_ID.get(key)
  return {
    id: key,
    provider: DEFAULT_PROVIDER,
    kind: DEFAULT_KIND,
    streaming: true,
    label: key,
    note: '未登记的模型，按百炼复刻音色处理',
    unknown: true,
  }
}

/**
 * 模型名归一化：空值回落到默认模型。
 *
 * 与 `modelOf` 的区别是不引入"未知"这个概念——它在**要给云端发请求**的地方用，
 * 那里必须有一个非空的模型名。
 * @param id - 模型名。
 * @returns 非空的模型名。
 */
export function normalizeModel(id) {
  const key = String(id ?? '').trim()
  return key === '' ? DEFAULT_MODEL : key
}

/**
 * 这个模型该走哪一套客户端。
 * @param id - 模型名。
 * @returns `mimo` / `dashscope`。
 */
export function providerOf(id) {
  return modelOf(id).provider
}

/**
 * 这个模型的音色从哪来。
 * @param id - 模型名。
 * @returns `preset` / `clone` / `design`。
 */
export function kindOf(id) {
  return modelOf(id).kind
}

/**
 * 这个模型是否支持真正的低延迟流式。
 * @param id - 模型名。
 * @returns 是否支持。
 */
export function supportsStreaming(id) {
  return modelOf(id).streaming === true
}

/**
 * 这个模型是不是 MiMo 家的。
 *
 * MiMo 的音色克隆**只对单次调用生效**——参考音频随请求发过去，不存在"音色 ID"这种
 * 可长期复用的句柄。所以 MiMo 的复刻音色在档案里记的不是音色 ID，而是**本地样本文件
 * 的名字**（见 `./samples.js`），每次合成时把文件读出来重新附在请求里。这条差异是
 * 本插件对"复刻"这一类音色的核心适配，判定它只需要这一个函数。
 * @param id - 模型名。
 * @returns 是否是 MiMo。
 */
export function isMimo(id) {
  return providerOf(id) === PROVIDER_MIMO
}

/**
 * 把模型名挂到音色名末尾，作为"这是哪套模型的音色"的可视标记。
 *
 * 用户在档案列表里看到的是**名字**，而同名档案可能分属不同引擎——`冰糖` 是 MiMo 的预置
 * 音色、`cosyvoice-v3.5-plus-dsh1234` 是百炼复刻的，两者在界面上都只是一个字符串。
 * 于是把模型名作为后缀自动附在名称末尾（`冰糖 · mimo-v2.5-tts`），"选哪个音色就用哪个
 * 模型"这件事在界面上就是**看得见**的，而不只存在于 `profiles.json` 里。
 *
 * 已经有同名后缀时不重复追加，否则"编辑 → 保存"会让名字变成 `x · m · m`。
 * @param name - 音色名。
 * @param model - 模型名。
 * @returns 带模型后缀的名字。
 */
export function decorateName(name, model) {
  const title = String(name ?? '').trim()
  const id = normalizeModel(model)
  if (title === '') return id
  // 后缀用的是同一个分隔符，所以"名字里已经有这个模型的尾巴"是可判定的。
  const tail = ` · ${id}`
  if (title.endsWith(tail)) return title
  return `${title}${tail}`
}

/**
 * 把一份目录条目转成能过 JSON 的形状（去掉不可枚举的字段）。
 *
 * 设置页只需要 `id` / `provider` / `kind` / `streaming` / `label` / `note`；
 * `unknown` 只在服务端内部有意义，但一并带上无害且便于前端区分自定义模型。
 * @param model - 目录条目。
 * @returns 可序列化条目。
 */
function serialize(model) {
  return {
    id: model.id,
    provider: model.provider,
    kind: model.kind,
    streaming: model.streaming,
    label: model.label,
    note: model.note,
  }
}

/**
 * 整个目录的对外视图：模型清单 + MiMo 内置音色。
 *
 * 设置页的模型下拉与内置音色列表**都从这一份来**，于是"页面上能选到什么"永远等于
 * "服务端认得什么"。多写一份到前端只会带来一个迟早对不上的副本。
 * @returns `{ models, builtinVoices }`。
 */
export function catalogView() {
  return {
    models: MODELS.map(serialize),
    builtinVoices: MIMO_BUILTIN_VOICES.map(voice => ({
      id: voice.id,
      name: voice.name,
      language: voice.language,
      gender: voice.gender,
      note: voice.note,
    })),
    separator: ' · ',
  }
}

/**
 * 一个模型名在界面上该怎么被称呼。
 * @param id - 模型名。
 * @returns 人类可读的名字。
 */
export function describeModel(id) {
  const model = modelOf(id)
  return model.unknown === true ? `${model.id}（未登记）` : model.label
}
