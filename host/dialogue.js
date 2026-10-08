/**
 * 角色扮演文本切分：把一段回答拆成「旁白」与「台词」交替出现的段序列。
 *
 * 顺序是这个模块唯一的硬要求：**切完之后按原顺序拼回去，必须还是原文**。
 * 旁白和台词会用不同音色分别合成，一旦顺序错乱，念出来就是"先说台词再补
 * 旁白"——所以切分只做**线性扫描**，`parts` 数组保持原文的先后，绝不按类型
 * 归类重排。
 *
 * 两个边界是有意这么定的：
 *
 * **只有半个括号的「不当台词。** 模型输出被截断时很常见（"他说：「你好"），
 * 把它当成台词会把后面所有旁白都吞进去。宁可漏一段台词，也不能把旁白念成
 * 角色的声音。
 *
 * **空的「」被丢掉，而不是留在旁白里。** 留着会让 TTS 念出"引号"两个字。
 * @module dsh-cosyvoice/dialogue
 */

/** 旁白：不是人物说的话。 */
export const KIND_NARRATION = 'narration'

/** 台词：被「」括起来的部分。 */
export const KIND_DIALOGUE = 'dialogue'

/** 台词左引号。 */
export const QUOTE_OPEN = '「'

/** 台词右引号。 */
export const QUOTE_CLOSE = '」'

/**
 * 一次朗读最多切成几段。
 *
 * 段数直接等于请求数。角色扮演里旁白与台词交替十几轮已经很长了，再往上多是
 * 整章小说那种规模——那不是本插件要覆盖的场景，而且几十个并发请求大概率撞上
 * 限流。超出部分并入末段：音色分界会退化，但不会出现几十个并发请求。
 */
export const MAX_PARTS = 12

/**
 * 把文本切成旁白段与台词段。
 *
 * @param rawText - 已清洗的文本（应当是 {@link import('./speech.js').normalizeText} 之后的结果）。
 * @returns 段序列；没有内容时是空数组。每段 `{ kind, text }`。
 */
export function splitDialogue(rawText) {
  const text = String(rawText ?? '')
  const parts = []
  let buffer = ''
  let i = 0

  const flush = () => {
    const trimmed = buffer.trim()
    buffer = ''
    if (trimmed === '') return
    parts.push({ kind: KIND_NARRATION, text: trimmed })
  }

  while (i < text.length) {
    const ch = text[i]
    if (ch === QUOTE_OPEN) {
      const end = text.indexOf(QUOTE_CLOSE, i + 1)
      if (end === i + 1) {
        // 空的「」：整对丢掉，别让 TTS 念出"引号"。
        i = end + 1
        continue
      }
      if (end > i + 1) {
        flush()
        const line = text.slice(i + 1, end).trim()
        if (line !== '') parts.push({ kind: KIND_DIALOGUE, text: line })
        i = end + 1
        continue
      }
      // 没找到右引号：输出多半被截断了，这个左引号不生效，丢掉它继续。
      i += 1
      continue
    }
    buffer += ch
    i += 1
  }
  flush()
  return parts
}

/**
 * 合并相邻的同类型段，并把段数压到 {@link MAX_PARTS} 以内。
 *
 * 合并同类段不只是省请求：连续的几段旁白本来就该一口气念完，切开反而会在中间
 * 插入一次合成往返。不同音色的是**类型分界**，不是每一段。
 * @param parts - {@link splitDialogue} 的结果。
 * @returns 合并后的段序列。
 */
export function mergeParts(parts) {
  const merged = []
  for (const part of parts) {
    const last = merged[merged.length - 1]
    if (last !== undefined && last.kind === part.kind) {
      last.text = last.text + part.text
      continue
    }
    merged.push({ kind: part.kind, text: part.text })
  }
  if (merged.length <= MAX_PARTS) return merged

  // 超长：末段吞掉剩下全部。音色分界退化，但总段数被压住了。
  const head = merged.slice(0, MAX_PARTS - 1)
  const tail = merged.slice(MAX_PARTS - 1)
  head.push({ kind: tail[0].kind, text: tail.map(part => part.text).join('') })
  return head
}

/**
 * 一次拿到最终要合成的段序列。
 * @param rawText - 已清洗的文本。
 * @returns 段序列。
 */
export function dialogueParts(rawText) {
  return mergeParts(splitDialogue(rawText))
}

/**
 * 有没有台词。
 *
 * 没有台词意味着整段都是旁白：那不需要分音色，按一次普通合成处理即可——
 * 于是关闭角色扮演和"开了但这条没台词"走的是同一条路，行为可预期。
 * @param parts - 段序列。
 * @returns 是否至少有一段台词。
 */
export function hasDialogue(parts) {
  return parts.some(part => part.kind === KIND_DIALOGUE)
}

/**
 * 段序列的统计，用于日志与状态回报。
 * @param parts - 段序列。
 * @returns 旁白段数、台词段数与总字数。
 */
export function summarizeParts(parts) {
  let narration = 0
  let dialogue = 0
  let characters = 0
  for (const part of parts) {
    if (part.kind === KIND_DIALOGUE) dialogue += 1
    else narration += 1
    characters += part.text.length
  }
  return { narration, dialogue, characters }
}
