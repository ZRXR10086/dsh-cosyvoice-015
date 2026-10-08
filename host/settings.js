/**
 * `cosyvoice` 设置命名空间：本插件的全部配置面。
 *
 * 注册在宿主侧，所以 DSH 会把它持久化进用户设置文档（`$DSH_HOME/settings.yaml`），
 * 保持可手工编辑 —— 这也是字段名取朴素名字、每个默认值都能独立使用的原因。
 *
 * `apiKey` 带 `role('secret')`：每一条发往浏览器的通道都会把它剥离，
 * 所以页面只能知道"是否已配置"，永远读不到明文。写入仍然可用，因为设置通道
 * 写的是**按路径的增量编辑**，而不是重述整份文档。
 *
 * schema 是工厂函数而非常量，因为 schemastery 要在 apply 时从 harness 安装处
 * 解析（见 `./harness.js`）；在模块作用域 import 它会重新引入那个会破坏
 * 本地路径安装的裸 import。
 * @module dsh-cosyvoice/settings
 */

/** 本插件拥有的设置命名空间（小写，DSH 要求）。 */
export const VOICE_NAMESPACE = 'cosyvoice'

/** 默认合成模型。必须与音色注册时使用的模型一致。 */
export const DEFAULT_MODEL = 'cosyvoice-v3.5-plus'

/** 非实时：整段文本一次合成，拿到完整音频才播（默认；语调最连贯）。 */
export const MODE_ONE_SHOT = 'one-shot'

/** 实时：开启百炼 SSE，第一句合成出来就开始播，边合成边播。 */
export const MODE_STREAM = 'stream'

/**
 * 归一化一个 mode 配置值。
 *
 * 只有一个值被认作实时，其余一律落到非实时：这是一个开关而不是枚举成员 Unknown，
 * 写错的人应当得到一个"能出声的默认值"，而不是一条要用户去猜的校验错误。
 * @param raw - 配置里的值。
 * @returns {@link MODE_STREAM} 或 {@link MODE_ONE_SHOT}。
 */
export function normalizeMode(raw) {
  return String(raw ?? '').trim() === MODE_STREAM ? MODE_STREAM : MODE_ONE_SHOT
}

/** 承载百炼 API Key 的字段。密钥：在所有通道上脱敏。 */
export const API_KEY_FIELD = 'apiKey'

/** 角色扮演模式：把回答拆成旁白与台词，分别用不同音色合成。 */
export const ROLEPLAY_FIELD = 'roleplay'

/** 旁白音色的配置字段。 */
export const NARRATION_VOICE_FIELD = 'narrationVoiceId'

/** 角色（台词）音色的配置字段。 */
export const CHARACTER_VOICE_FIELD = 'characterVoiceId'

/**
 * 归一化一个开关型配置值。
 *
 * 只有显式为真才算开：`'true'`、布尔 `true`。写错的人得到关，而不是一个让人
 * 去猜的校验错误——关是"和以前一样"，开才会改变所有回答的读法。
 * @param raw - 配置里的值。
 * @returns 是否开启。
 */
export function normalizeFlag(raw) {
  if (raw === true) return true
  return String(raw ?? '').trim().toLowerCase() === 'true'
}

/**
 * 构建持久化的语音设置 schema。
 * @param z - schemastery 入口，从 harness 安装处解析。
 * @returns 为 {@link VOICE_NAMESPACE} 注册的 schema。
 */
export function voiceSettingsSchema(z) {
  return z.object({
    /** 阿里云百炼 API Key（`sk-...`）。密钥字段。 */
    apiKey: z.string().role('secret').default(''),
    /** 合成模型；与音色注册模型不一致会让引擎直接拒绝请求。 */
    model: z.string().default(DEFAULT_MODEL),
    /** 百炼控制台里的复刻/设计音色 ID。 */
    voiceId: z.string().default(''),
    /** 合成音频的落盘目录。留空表示使用插件自己在 harness home 下的目录。 */
    outputDir: z.string().default(''),
    /**
     * 合成方式：`stream` 为实时（SSE 边合成边播），`one-shot` 为整段合成后播放。
     * 以外的任何值都落到 one-shot，所以手改配置不会让播放键失效。
     */
    mode: z.string().default(MODE_ONE_SHOT),
    /** 打开页面后首次交互时播放一次提示音。 */
    bootSound: z.boolean().default(true),
    /**
     * 角色扮演模式。开启后回答里的「」内容按台词处理，其余按旁白处理，两者
     * 用不同音色合成，再按原文顺序拼成一条音频。
     */
    roleplay: z.boolean().default(false),
    /** 旁白的音色 ID；留空表示跟随当前音色（激活的档案）。 */
    narrationVoiceId: z.string().default(''),
    /** 角色台词的音色 ID；留空表示跟随当前音色。 */
    characterVoiceId: z.string().default(''),
  })
}
