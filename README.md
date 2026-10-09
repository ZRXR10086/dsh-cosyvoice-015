# dsh-cosyvoice

给 DeepSeek Harness 网页界面的**每条 AI 回答**末尾加一个语音播放键。点一下，就用你选中的音色把那条回答读出来。

- **没有系统提示注入**，也**没有给模型的工具**。模型不知道"语音"这件事，所以不存在"提醒了它却不说"的不确定性。
- **点了才合成**（pull 而不是 push），相同内容第二次点击走哈希缓存，零费用。
- 合成在 Node 侧直调云端 HTTP，**不依赖 Python**。

**v4.0（4.0.0）新增 —— 双引擎与"音色即模型"**：

- **接入小米 MiMo V2.5 TTS 系列三款模型**：`mimo-v2.5-tts`（预置音色，支持唱歌）、
  `mimo-v2.5-tts-voiceclone`（音频复刻）、`mimo-v2.5-tts-voicedesign`（文字描述生成）。
  至此百炼 CosyVoice 与 MiMo 共用一个播放键、同一套缓存与同一套播放队列。
- **音色即模型**：设置页不再有全局「合成模型」选择器。一套音色档案 = **音色 + 模型**，
  选哪套就用它绑定的那款模型合成，**模型名自动作为后缀附在档案名末尾**（`我的声音 · mimo-v2.5-tts-voiceclone`）。
  这一条顺带消灭了百炼那套"音色必须用注册它的那个模型合成"的经典踩坑——现在根本不存在选错模型的余地。
- **模型选择全部改成列表**：可选项只有服务端 `GET /models` 认得的那些，不可能填出一个不存在的模型名。
- **MiMo 内置音色可勾选添加**：`mimo_default`、冰糖、茉莉、苏打、白桦（中文）与 Mia、Chloe、Milo、Dean（英文），
  在设置页里勾几个点一下就进档案，不用复刻也不用手填 ID。
- **MiMo 的音色复刻改成"本机复用"**：MiMo 官方文档写明 *voice clone 只针对单次调用*——
  参考音频随每次请求附上，没有可长期持有的音色 ID。插件因此把上传的音频原样存到
  `~/.dsh/voice/samples/<档案 id>.<扩展名>`，**每次合成都把这段本地文件重新附在请求里**。
  上传一次，之后无限次复用，且这条链路**没有任何云端部署步骤**（建完档案当场可用）。
- 两家引擎的 API Key **分开配置**（签发形式不同，复用其中一把只会得到一个毫无指向的"Key 无效"）。
- MiMo 的设计/复刻两款官方写明流式"降级为兼容模式"，界面如实标注**非低延迟**，而不是假装它能实时。

**V2（2.0.0）新增**：

- **音色档案**：保存多套音色（名称 + 音色 + 模型），列表里一键切换当前用的那一套。
- **音色克隆**：上传一段 10~20 秒的人声，插件走完百炼的「声音复刻」自动拿到音色 ID **不需要自己准备 OSS**，也不需要手填 ID；还能一键把百炼控制台已有的音色同步进来。

**v2.1（2.1.0）新增**：

- **两种合成方式，随时切换**（设置页）：
  - **非实时（整段）** —— 默认。整篇一次合成完再播，**语调最连贯**；
  - **实时（流式）** —— 打开百炼 SSE，云端按句把音频推回来，**第一句合成好就开始念**，出声更早。
- 流式播放走 Web Audio 做**采样级排期**：下一句排在上一句结束的那一刻，而不是"播完再去取下一段"，所以听不出句间断顿。
- 两种方式共用同一套内容哈希缓存，但产物不同（MP3 / WAV），来回切换不会串；同一条回答第二次播放都是零费用、零等待。`

**v3.0（3.0.0）新增 —— 角色扮演模式**：

- 开启后，回答里的文本被分成两类：**旁白**与**台词**（用「」括起来的那部分）。两者**各用各的音色**分别合成，再按**原文顺序**拼成一条音频——听起来是"旁白一句、角色一句"，顺序与读到的文字完全一致。
- 设置页可以分别绑定「旁白音色」和「角色音色」（从已保存的音色档案里挑）。留空表示跟随当前音色，不绑也能用。（v4.0 起绑的是**档案 id**，所以两段可以是不同引擎的音色。）
- 台词统一用同一个角色音色：**一段话里出现多个角色时暂不区分**（见下方"已知边界"）。

> **这是 dsh 0.1.5-rc.2 兼容版。**
>
> 主线仓库 [`ZRXR10086/dsh-cosyvoice`](https://github.com/ZRXR10086/dsh-cosyvoice) 面向 **0.2.1-alpha.1**；
> 本仓库 [`ZRXR10086/dsh-cosyvoice-015`](https://github.com/ZRXR10086/dsh-cosyvoice-015) 面向 **0.1.5-rc.2**，
> 只换了宿主-facing 的那层适配。
> **本仓库已领先主线**：v4.0 的 MiMo 接入与「音色即模型」目前只在这里，主仓库尚未同步。
> 包名仍是 `dsh-cosyvoice`，所以两版的配置文件、音频目录、音色档案、URL 全都一样，
> 换版本不需要重新配一遍。
>
> 两版差别只有两处，都已用「服务在不在」做运行时判别，**代码里没有版本号分支**：
>
> | | dsh 0.1.5-rc.2（本仓库） | dsh 0.2.1-alpha.1（主线） |
> |---|---|---|
> | 宿主登记设置面 | 插件必须自己调 `ctx.settings.register(namespace, schema)` | 宿主从 `export const Config` 自己推导 |
> | 浏览器端读写配置 | `ctx.settingsScope.bind({ namespace })`，写操作 resolve **`void`** | `ctx.configForms.get(entryId)`，写操作 resolve **`boolean`** |
>
> 其余共用同一份东西：slot 名与契约（`conversation.chat.assistant-actions` /
> `settings.section`）、`useChat` 与 `ChatSnapshot`、`WebRoute` 与 `webServer.register`、
> 6 个前端注入包、`@deepseek-ai/cordis` 4.x 的配置传递方式、`dsh.bundle.patch` 安装机制。
> 详见 [附录：0.1.5 兼容是怎么做的](#附录015-兼容是怎么做的)。

---

## 一、它长什么样

每条助手回答底部那排动作按钮（复制、点赞、点踩……）里会多出一个喇叭图标：

| 状态 | 图标 | 含义 |
| --- | --- | --- |
| 🔊 待播 | 喇叭 | 点一下开始朗读 |
| ⏳ 合成中 | 转圈 | 正在调百炼，播放键变灰 |
| ⏹ 播放中 | 方块 | 再点一下停止 |
| 红色喇叭 | 喇叭（红） | 上一次失败了，悬停看原因 |

同时只会有**一个**声音在响：点第二条消息的播放键会接管前一条。

设置 → **语音** 页里可以配置 Key、管理音色档案、上传音频克隆音色，以及试听、打开目录、清空缓存。

---

## 二、装之前：先把 dsh 自己那批漏声明的依赖填上

dsh 是 pnpm workspace 开发出来的，那里的 hoisting 让兄弟包互相可见，于是它发布时
少写一批 `dependencies` 也不会在开发机上露馅 —— 装到 npm 上就变成一片
`failed to import` / `ERR_MODULE_NOT_FOUND`。**这不是本插件的问题，但它必须先修**，
否则什么插件都跑不起来。0.1.5-rc.2 和 0.2.1-alpha.1 都有这个毛病，只是名单不同。

环境前提：

| 项目 | 要求 |
| --- | --- |
| Node | **≥ 22.19.0**（`undici@8` 等硬要求） |
| dsh | **0.1.5-rc.2**（本仓库）；主线请用 0.2.1-alpha.1 |
| pnpm | `dsh plugin add` 需要它 |

### 用脚本自动补齐（推荐，比手写名单可靠）

本仓库带一个 `scripts/fix-dsh-deps.mjs`。它**不硬编码名单**（名单会随 dsh 版本变），
而是扫真实的 `@deepseek-ai` 树，把"谁 import 了一个自己没声明的包"全找出来，再把
其中**真的缺**的那些写回 dsh 的 `package.json`：

```bash
npm i -g @deepseek-ai/dsh@0.1.5-rc.2
node scripts/fix-dsh-deps.mjs          # 或 node scripts/fix-dsh-deps.mjs /path/to/dsh
cd "$(npm root -g)/@deepseek-ai/dsh" && npm install
dsh --version                          # 应输出 0.1.5-rc.2
```

加 `--dry` 可以只看鉴定结果、不动文件。它会先把原 `package.json` 备份成
`package.json.orig`（已存在时不覆盖），再列出这次写了哪几个、依据是什么。

**它区分"没写"和"没有"。** 在一台真实的 dsh 0.2.1-alpha.1 上，被 import 却没写进
`package.json` 的自家包有 111 个，但其中 **84 个只是没写在纸上** —— hoisting 让它们在
`dsh/node_modules/@deepseek-ai/` 下有实体，Node 顺着目录往上冒泡就能解析到，把它们写
进依赖纯属噪音；真正**连目录都没有**、运行时必然 `ERR_MODULE_NOT_FOUND` 的是 **27 个**。
脚本只补这 27 个。

而"看着报错挨个补"通常只能找到十几个 —— 剩下的会在某个还没被触发的代码路径上再炸
一次。

**版本号的选法**（这步最容易做错，比名单本身更容易），脚本按三层顺序试：

| 顺序 | 依据 | 在本机的命中情况 |
| --- | --- | --- |
| 1 | registry 上为该 dsh 版本打的配对标签，如 `dist-tags["dsh-0-2-1-alpha-1"]` | 给不走主线版本的兄弟包用 |
| 2 | 与 dsh **完全同名**的版本 —— 这批内部包跟着主版本同步发版 | 27 个里有 26 个 |
| 3 | 兜底 `latest`，并单独列出来提醒留意 | 实际没用到 |

两个反例值得记着：**一律写 `latest`** 不行 —— 这批内部包的 latest 普遍停在旧线上
（0.2.1-alpha.1 时代 `dsh-scope` 的 latest 还停在 0.0.1-rc.1），装上去只是把"找不到包"
换成另一种长得几乎一样的报错 `does not provide an export named '...'`；**一律写 dsh 自己
的版本号**也不行 —— 个别包走独立版本线（`cordis-plugin-group` 已经到 1.0.x），registry
上没有同名版本，会让整次安装 ETARGET 全盘回滚。

> 重装或升级 dsh 之后，这段要重跑一次。建议顺手给官方提个 issue。

**这一步做对的判据**：`dsh web` 能打印出 `http://127.0.0.1:<port>/?token=...` 而不是
`startup failed`。漏装时是几十个 `failed to import`；版本装错时是
`does not provide an export named '...'` —— 两种报错长得很像，别认错了。

---

## 三、安装

```bash
cd /path/to/dsh-cosyvoice
dsh plugin --profile web add "$(pwd)"
dsh web
```

`package.json` 里的 `dsh.bundle.patch` 会让 `dsh plugin add` **一次装全**（宿主插件 + 浏览器端注入 + profile 里的 `- id: cosyvoice` 条目）。装完可以确认一下：

```bash
dsh --profile web --dump-config | grep -A 2 cosyvoice
# # == dsh-cosyvoice
# - id: cosyvoice
#   name: dsh-cosyvoice
```

### 装完怎么确认真的装上了

```bash
# 1) 插件进了配置树
dsh --profile web --dump-config | grep -A 2 cosyvoice
# # == dsh-cosyvoice
# - id: cosyvoice
#   name: dsh-cosyvoice

# 2) 宿主路由活着（启动 dsh web 后，端口换成实际那个）
curl http://127.0.0.1:<port>/dsh-cosyvoice/status
# {"ok":true,"configured":false,...,"dir":".../voice/audio","count":0}

# 3) 浏览器端被注入：首页的 boot graph 里应出现
#    {"id":"dsh-cosyvoice","url":"plugins/??dsh-cosyvoice/client.js&rev=...",...}
```

第 2 步返回 `configured: false` 是正常的 —— 还没填 Key。第 3 步要带 dsh 的会话
cookie，用浏览器 DevTools 看 `window.__DSH_BOOT__` 最直接。

改了 `client/` 下的源码后要重新构建（`lib/client.js` 是产物，别手改）：

```bash
npm run build     # 拼接到 lib/client.js
npm run verify    # 产物自检
npm test          # 单测 + 集成测试 + 构建 + 自检
```

---

## 四、配置

设置 → **语音**：

| 字段 | 说明 |
| --- | --- |
| **百炼 API Key** | 阿里云百炼的 `sk-...`。密钥字段：页面上永远只有掩码，输入即覆盖。只用 MiMo 可留空。 |
| **MiMo API Key** | 小米 MiMo 开放平台的 `sk-...`。与上面那把**相互独立**，因为两家签发形式不同，复用其中一把去调另一家只会得到一个毫无指向的"Key 无效"。 |
| **合成方式** | **非实时（整段）**（默认）/ **实时（流式）**。切换即时生效，不用重启。 |
| **输出目录** | 音频落盘位置。留空用 `~/.dsh/voice/audio`。 |
| **开机提示音** | 打开页面后首次交互时"叮"一声。 |
| **角色扮演模式** | 开启后「」里的算台词、其余算旁白，两者用不同音色档案合成后按原文顺序拼回一条。 |
| **旁白音色** | 角色扮演里旁白用哪**套档案**（含模型）；留空跟随当前音色。 |
| **角色音色** | 角色扮演里台词用哪**套档案**（含模型）；留空跟随当前音色。 |
| **默认音色 ID** | 兜底：**只有"音色档案"里一套都没有时才用它**。建好档案后模型跟着档案走，这一栏不再参与决策。 |

> **没有「合成模型」这一栏了。** v3.x 有一个全局模型输入框，那是"音色与模型各填各的"时代的产物——而它也是百炼最常见的一类报错来源（音色 ID 必须配注册它的那个模型，配错了直接被拒）。现在模型是**每套音色档案自带**的：新增音色或克隆时选模型，之后选哪套音色就用哪款模型，不存在配错的可能。

改完立即生效，不用重启。

### 音色档案 = 音色 + 模型（v4.0 的核心）

**这是这一版最重要的一条设计**，其余改动大多是它的推论。

在 v3.x 里，音色与模型是两个独立的设置项，你会得到"用 A 模型注册的音色，被 B 模型合成"这种组合——百炼直接拒绝，而报错完全指不到真实原因。现在：

- 一套档案 = **音色 + 模型**，不可分割；
- 合成时**以启用的档案为准**，`model` 跟着档案走（`host/synth.js` 按档案分派到对应引擎）；
- **模型名自动作为后缀附在档案名末尾**，所以"这套音色属于哪款模型"在列表上一眼可见；
- 角色扮演绑的是**档案 id**而不是音色 ID —— 绑音色 ID 会丢掉"用哪款模型"这个信息。

页面中间那块是档案列表：点「启用」切换当前音色，「编辑」把它装进下面的输入框，「删除」移除。

### 新增音色 / 音色克隆：先选模型，表单跟着变

两个表单都有一个**模型下拉**，选项来自服务端 `GET /models`（前端不复制一份清单，所以"页面上能选到的"永远等于"服务端认得的"）。选中哪款模型，下面那个输入框**整段换掉**：

| 选了哪款模型 | 音色从哪来 | 要填什么 |
| --- | --- | --- |
| 百炼 CosyVoice（6 款）/ `mimo-v2.5-tts-voiceclone` | 复刻 | 音色 ID（MiMo 那款则由上传音频得来，见下） |
| `mimo-v2.5-tts` | 内置 | 从内置音色列表里挑一个 |
| `mimo-v2.5-tts-voicedesign` | 设计 | 一句描述，例如"低沉沙哑的男声，语速偏慢" |

用户不需要知道自己填的到底是音色 ID、音色名还是一句描述——**换模型时旧的凭据会被自动清空**，因为上一款模型要的东西对这一款没有意义，留着只会存下一套"模型与凭据不匹配"的档案（它能创建成功，只在合成时报一个毫无信息量的错）。

档案存在 `~/.dsh/voice/profiles.json`（插件自管，不进 dsh 配置 schema：schemastery 的数组做增量写入不可靠，而克隆音色还要带 `pending → ready / failed` 状态机）。

### MiMo 内置音色：勾选即添加

MiMo 自带 9 个预置音色，在设置页里是一份可勾选的列表，勾几个点「添加选中的」就进档案——**不用复刻、不用手填 ID**：

| | |
| --- | --- |
| 中文（5 个） | `mimo_default`（默认，实际嗓音随部署集群而异）、冰糖、茉莉、苏打、白桦 |
| 英文（4 个） | Mia、Chloe、Milo、Dean |

> `mimo_default` 与「冰糖」在中国集群上是**同一把嗓子**——它不是"某个具体的嗓音"，而是"这一套集群的默认嗓音"。对不想挑的人它就是正确的默认值，所以它排在第一位。

### 音色克隆：两条链路，由所选模型决定

上传一段 **10~20 秒的清晰人声**，走哪条链路取决于你在上传框旁边选的那款模型。

**选百炼模型 —— 走云端四步：**

```
① POST /api/v1/files            上传音频         → file_id
② GET  /api/v1/files/{file_id}  取内网临时 URL   → url
③ POST /tts/customization       create_voice     → voice_id
④ POST /tts/customization       query_voice      → DEPLOYING → OK
```

> **② 不是多余的**：`create_voice` 的 `url` 只接受阿里云**内网可访问**的地址，公网直链会报 `AudioSilentError`。这正是必须走 Files 接口、也因此你不必自己准备 OSS 的原因。

上传后档案里会立刻出现一条「复刻中」，页面每 3 秒查一次状态；就绪后自动设为当前音色。**「从云端同步」**则把百炼控制台里已有的音色一键拉进档案。

约束：音色 **30 个 / 账号**（满了先删不用的）；文件名前缀只能是数字与小写字母（插件自动生成 `dsh******`）。

**选 MiMo 的 voiceclone —— 没有任何云端步骤：**

MiMo 官方文档写得很直白：*voice clone 只针对单次调用*。参考音频（base64 的 data URL）随**每一次**请求附在 `audio.voice` 上，音色是这一次即时复刻出来的，**不存在可长期持有的音色 ID**。所以"上传一次、以后都能用"必须由本机兜住：

```
上传 → 存到 ~/.dsh/voice/samples/<档案 id>.<扩展名>
     → 档案里只记这个文件名，建完当场可用，无需轮询
每次合成 → 读出这段音频 → 重新编成 data URL → 附在 audio.voice 上
```

于是这条链路的复刻**一次云端往返都不需要**，档案即时可用，重复使用零成本。约束只有两条，都在**上传时**就拒掉（而不是等合成失败才花钱）：**只接受 mp3 / wav**，且体积 **≤ 7MB**（MiMo 要求 Base64 之后不超过 10MB，而 Base64 会把体积放大 4/3，所以原始音频的上限约 7.5MB，取 7MB 留余量）。

删除这套档案时，它对应的本地音频**一并删掉**——否则那个目录里会攒下一堆再也不会被用到的文件，而用户没有任何办法知道那些文件是什么。

### 关于流式：两款 MiMo 模型不是真正的低延迟

| 模型 | 流式 |
| --- | --- |
| 百炼 CosyVoice（全部 6 款） | 真正的低延迟，出声最快 |
| `mimo-v2.5-tts` | 真正的低延迟（官方文档写明已上线） |
| `mimo-v2.5-tts-voiceclone` | **兼容模式**：等全部推理完成后一次性返回 |
| `mimo-v2.5-tts-voicedesign` | **兼容模式**：同上 |

后两款是**云端的限制**，不是本插件能绕过的。插件**照样走流式路径**（于是 Web Audio 排期、缓存落盘、回退逻辑一行都不用改），只是你选"实时"时要等整段合成完才听到第一声。界面在这些档案的行上标了**「非低延迟」**徽章，而不是让你选了之后才发现是本插件坏了。

### 合成方式：实时（流式）/ 非实时（整段）

| | 非实时（整段） | 实时（流式） |
| --- | --- | --- |
| 请求 | 一次 POST，等整段合成完 | 百炼：`X-DashScope-SSE: enable` 云端按句推回来。MiMo：`stream: true`，OpenAI 形状的帧 |
| 出声 | 全文合成完之后 | **第一句好了就开始念** |
| 语调 | **最连贯**（一次成韵） | 略逊于整段（云端按句合成） |
| 播放 | `<audio src>` 一次播完 | Web Audio 采样级排期，句间无空白 |
| 缓存 | `<hash>.mp3` | `<hash>.wav`（同样只有在第二次起生效） |

两种模式的产物各用一个扩展名，所以在两者之间来回切不会串缓存，也不用白付第二次钱。

**切换是当场生效的**，不必等宿主把配置写回去：点击后本地立刻记住选择，随后的每一次朗读都把它带在请求里，服务端优先听请求里的那个。配置写入在后台照做 —— 成功就持久化，失败也不影响这一次使用，只是在页面底部说明"没能写进配置"。

按钮下面那行「当前生效」显示的就是服务端回报的真实结果；若它后面跟着「未写入配置」，说明这一次的切换只在页面内生效，重启 dsh 后会自动回到默认（不影响使用，只是要再点一次）。

> 流式播放用的是 **Web Audio**（`AudioBufferSourceNode`）。若浏览器拿不到 `AudioContext`，页面会直接提示你切回「非实时」—— 而不是给你一段没声音的 null stream。

### 角色扮演模式（v3.0）

开启后，一条回答会被切成**段序列**，每段带自己的类型：

```js
'他抬起头。「你来了。」他笑了笑。'
→ [
    { kind: 'narration', text: '他抬起头。',   voiceId: '<旁白音色>' },
    { kind: 'dialogue',  text: '你来了。',     voiceId: '<角色音色>' },
    { kind: 'narration', text: '他笑了笑。',   voiceId: '<旁白音色>' },
  ]
```

顺序**只在切分时确定一次**，之后任何一步都不重排：合成按这个顺序发请求，拼接按这个顺序拼字节，流式按这个顺序交付。

| | 非实时（整段） | 实时（流式） |
| --- | --- | --- |
| 做法 | 每段要 **PCM**，按序 `Buffer.concat` 后补一个 WAV 头 | 所有段的流**一起发起**，**按序消费** |
| 顺序 | 写在文件里，不可能错 | 交付顺序就是朗读顺序 |
| 段间 | 采样级相接，无空隙 | 采样级排期，无空隙 |

两个关键取舍：

- **为什么用 PCM 而不是 MP3**：MP3 直接字节拼接虽然大多能播，但帧边界和时长都是错的；PCM 拼接是采样级的，补个 WAV 头就是一条正经音频。
- **为什么"一起发起、按序消费"**：串行（第一条收完再开第二条）最简单，但每换一次音色就多一次完整网络往返——这正是 v2 分句方案被吐槽"两句间隔太大"的原因。反过来全并发再按到达顺序交付，顺序就乱了。所以请求全部先起飞，消费严格按下标走：后面的流在等待期间一直在缓冲，轮到它时数据基本已到。

缓存键把"每一段用了哪个音色"都算进去，所以换了角色音色绝不会命中旧的声音。

**切换与绑定同样当场生效**（与合成方式同一套机制）：本地记住 + 每次请求带上，服务端优先听请求里的。写配置失败不影响这次使用，页面会说明。

边界：**一条台词都没有时**就是整段旁白，用旁白音色一次念完，不分段；**没闭合的「** 不当台词（输出被截断时常见），宁可漏一段台词也不能把旁白念成角色的声音；**空的「」**被丢掉，不会被念成"引号"。

> 角色扮演绑的是**档案 id**，所以旁白与角色可以是**不同引擎**的音色（一边百炼复刻、一边 MiMo 内置），每一段各走各的模型。

---

## 五、它是怎么工作的

### 非实时（整段，默认）

```
浏览器                                    宿主（Node）
──────                                    ──────────
播放键（slot: conversation.chat.
  assistant-actions）
  │ ① 从 chat 快照取该条消息的文本
  │ ② POST /dsh-cosyvoice/speak-message
  │    { messageId, sessionId, text }
  ├──────────────────────────────────────▶ ③ 清洗 Markdown
  │                                        ④ sha256(模型+音色+文本) 查缓存
  │                                        ⑤ 未命中 → POST 百炼 SpeechSynthesizer
  │                                        ⑥ 落盘 <hash>.mp3
  │◀──────────────────────────────────────  ⑦ { mode: 'one-shot', clip: { url } }
  │ ⑧ <audio> 整段播放
```

### 实时（流式）

```
浏览器                                    宿主（Node）                       百炼
──────                                    ──────────                       ────
播放键
  │ POST /speak-message
  ├──────────────────────────────────────▶ 查 <hash>.wav 缓存
  │                                        命中 → 直接回整段 clip（不握手 SSE）
  │                                        未命中 → POST + X-DashScope-SSE ──▶ 流式合成
  │◀── event: open ───────────────────────  已连上（还没出声）
  │◀── event: chunk { audio, sampleRate } ◀─ sentence-synthesis（每句一帧 PCM）
  │ 每一块到达就排进 Web Audio 的播放日程：  下一块排在**上一块结束的那一刻**
  │◀── event: done  { clip } ──────────────  全部合成完，整段已落盘成 <hash>.wav
  │ 播完最后一块 → 回到空闲
```

关键在于**中间的每一帧都不用等**：服务端的 SSE 解析是一边读一边写，客户端是一边收一边排，两端都没有"攒够再说"这一步。

### 为什么把"分句并行 + 按句依次播"回滚了

v2.0 用过那个方案：把回答切成若干句、并发合成、用 `<audio>` 依次播。它确实让首句出声更早，但听感上有两个硬伤：

1. **句间留白**：`<audio>` 切换一个 URL 就要付一次"加载完才能播"的往返；
2. **语速不连贯**：每句独立请求，云端不知道上下文，韵律对不上。

于是 v2.1 的取舍是：**要连贯就用整段**（默认），**要快就用云端自己的流式**（同一个请求、同一份上下文，由百炼侧决定怎么断句），而不是在客户端一层硬拼。

**取文本有两条路**，先走快的：

1. **客户端**：`useChat`（chat 为 session 级 slot 声明的标准 prop）直接从 chat 快照里取 —— 与"复制"按钮用的是同一份文本。
2. **宿主兜底**：消息不在已加载窗口时，客户端拿不到文本，宿主按 `messageId` 去 `$DSH_HOME/sessions` 的会话日志里解析；客户端给过的文本还会被记住，下次连 DOM 都不用读。

两条都落空才报"没找到这条回答的文本"，不会静默失败。

### 路由

| 路由 | 作用 |
| --- | --- |
| `GET /dsh-cosyvoice/status` | 是否已配置、**当前生效的**模型/音色/引擎、该模型是否低延迟流式、缓存数量、**当前合成方式**；带 `?mode=` 时报"按这个选择会走哪条路"，并另给配置里那个值 |
| `GET /dsh-cosyvoice/models` | **模型目录 + MiMo 内置音色清单**（设置页的模型下拉与"添加内置音色"列表都从这一份来） |
| `POST /dsh-cosyvoice/speak-message` | **播放键主入口**：按当前方式返回整段 JSON 或 SSE 流；请求体可用 `mode` / `roleplay` / `narrationProfileId` / `characterProfileId` 覆盖这一次 |
| `POST /dsh-cosyvoice/speak` | 同上，给一段文本（设置页试听用） |
| `GET /dsh-cosyvoice/audio?name=` | 取音频字节（文件名是内容哈希，可永久缓存） |
| `GET /dsh-cosyvoice/profiles` | 音色档案列表 + 当前激活 + 回退值；每条附 `kind` 与 `lowLatencyStream` |
| `POST /dsh-cosyvoice/profiles` | 新增/更新档案（给了 `id` 即更新）。按模型的音色来源校验必填项，名称自动附上模型后缀 |
| `DELETE /dsh-cosyvoice/profiles` | 删除档案（**顺带删掉它的本地参考音频**） |
| `POST /dsh-cosyvoice/profiles/activate` | 切换当前音色 |
| `POST /dsh-cosyvoice/clone` | **上传音频复刻音色**（body 为裸音频字节）。`?model=` 决定走百炼云端链路还是 MiMo 本地复用链路 |
| `GET /dsh-cosyvoice/clone/status?id=` | 查一个复刻音色的部署状态（**只有百炼链路需要轮询**） |
| `GET /dsh-cosyvoice/cloud-voices` | 列出百炼账号上已有的音色 |
| `POST /dsh-cosyvoice/cloud-voices/import` | 把云端音色批量导入档案 |
| `GET /dsh-cosyvoice/boot` | 开机提示音 |
| `POST /dsh-cosyvoice/open` | 在文件管理器里打开输出目录 |
| `POST /dsh-cosyvoice/clear` | 清空缓存 |

有副作用的都过同源校验，挡住跨站驱动。同一条 `/profiles` 路径按方法分叉（GET/POST/DELETE）——
宿主的分发只看路径，方法由 handler 自己判。

`/speak` 与 `/speak-message` 同理：**路径和方法都不变**，变的是响应形态 —— 非实时回 JSON，实时回 SSE。客户端按响应头的 `content-type` 自己选路，所以 mode 在两次请求之间被改掉也不会错。

<details>
<summary>流式响应的帧格式</summary>

```
event: open
data: {"sampleRate":24000}

event: chunk
data: {"audio":"<base64 pcm>","sampleRate":24000}

event: done
data: {"clip":{"name":"…wav","url":"/dsh-cosyvoice/audio?name=…","characters":42},"characters":42}

event: error
data: {"message":"……"}
```

</details>

---

## 六、排错

| 现象 | 原因与处理 |
| --- | --- |
| 播放键没出现 | 跑 `dsh --profile web --dump-config \| grep cosyvoice` 确认插件进了配置树；再看启动日志的 `Failed plugins` 有没有 `cosyvoice`。 |
| 红色喇叭，提示「API Key 无效或无权限」 | HTTP 401/403：Key 填错，或该 Key 没开通语音合成。**确认填的是对的那一栏**——百炼与 MiMo 是两把独立的 Key。 |
| 提示「合成模型与注册音色时的模型不一致」 | HTTP 418：**这是 v3.x 时代的问题，v4.0 已经不会发生了**。模型现在跟着音色档案走，编辑档案时选对模型即可。若仍看到，多半是档案来自旧版本，点「编辑」重新选一次模型保存。 |
| 提示「未配置音色 ID」 | 既没有启用的音色档案，也没填默认音色 ID。先在设置页加一套：百炼模型去控制台复刻一个，或直接上传音频克隆；MiMo 则勾几个内置音色即可。 |
| 提示「这套复刻音色的参考音频已经不在了」 | `~/.dsh/voice/samples/` 里的文件被删了（多半是清理磁盘时顺手删的）。到设置页重新上传一段。 |
| MiMo 复刻提示「只接受 wav / mp3 音频」 | MiMo 只认这两种容器。m4a / flac / ogg 请先转成 wav。 |
| MiMo 复刻提示「音频太大了，请控制在 7 MB 以内」 | MiMo 要求 Base64 之后不超过 10MB，而 Base64 放大 4/3，所以原音频约 7.5MB 是上限。裁短到 30 秒以内即可。 |
| 选了「实时」却要等整段合成完 | 看档案行上的**「非低延迟」**徽章：MiMo 的复刻与设计两款官方写明流式是兼容模式。这是云端的限制，不是本插件坏了。 |
| 克隆提示「音频不符合复刻要求」 | 百炼报 `AudioSilentError` 一类：音频太短、静音、或采样率不对。换 48kHz 的 WAV、录 10~20 秒清晰人声。 |
| 克隆提示「配额已满」 | 音色上限 **30 个 / 账号**。去百炼控制台删掉不用的再试。 |
| 克隆一直显示「复刻中」 | 部署通常几秒到几分钟。页面会轮询两分钟；超时后列表里的状态仍在，稍后回到设置页即可看到结果。**MiMo 那条链路没有这一步**（本地存储，当场可用）。 |
| 提示「没找到这条回答的文本」 | 消息太旧、不在已加载窗口，且会话日志格式对不上。刷新页面让窗口覆盖它，或直接复制文本后在设置页试听验证链路。 |
| 提示音没响 | `assets/boot.mp3` 缺失，或浏览器不给自动播放。提示音不影响主功能。 |
| 设置页改了没生效 | 配置改动会让 cordis 重启本插件，路由随之重挂。若仍无效，看 `~/.dsh/logs/startup-*.log`。 |

---

## 七、目录结构

```
dsh-cosyvoice/
├── host/                宿主（Node）那一半
│   ├── index.js         apply 总装：Config + 路由
│   ├── settings.js      cosyvoice 配置 schema（apiKey / mimoApiKey 为密钥字段）
│   ├── models.js        模型目录：两家的全部模型 + MiMo 内置音色（唯一事实来源）
│   ├── engine.js        按模型 provider 分发的合成引擎（两个客户端 + 一个路由器）
│   ├── speech.js        直调百炼 HTTP：整段 + SSE 流式（fetch 可注入、可选 PCM）
│   ├── mimo.js          直调 MiMo HTTP：预置 / 复刻 / 设计三条路径
│   ├── stream.js        SSE 帧解析（百炼族 + OpenAI 族并列）、事件语义、PCM → WAV
│   ├── synth.js         合成编排：清洗 → 分段 → 缓存键 → 查缓存 → 调云端 → 落盘
│   ├── dialogue.js      角色扮演切分：旁白 / 台词 段序列（顺序为硬要求）
│   ├── profiles.js      音色档案（~/.dsh/voice/profiles.json）
│   ├── samples.js       MiMo 复刻音色的本地参考音频（~/.dsh/voice/samples/）
│   ├── clone.js         百炼声音复刻：上传 → 内网 URL → create_voice → 轮询
│   ├── store.js         音频目录与内容哈希缓存
│   ├── texts.js         messageId → 文本（会话日志解析 + 内存记忆）
│   ├── routes.js        /dsh-cosyvoice/* 路由
│   └── harness.js       harness 包解析（本地路径安装也不炸）
├── client/              浏览器那一半（源码，需构建）
│   ├── shared.js        rpc、SSE 读取、播放器（整段 + Web Audio 流式）、本机偏好
│   ├── locales.js       中英字典
│   ├── message-button.js  播放键
│   ├── settings-page.js   设置页
│   └── index.js         apply 总装
├── lib/client.js        构建产物（勿手改）
├── assets/boot.mp3      开机提示音
├── build.mjs            纯拼接构建（无打包器）
├── verify.mjs           产物自检
├── preview/             界面预览（不依赖 dsh，浏览器直接打开）
│   ├── ui-preview.html  模拟页：两种合成方式 + 角色扮演 + 克隆演示
│   └── smoke.mjs        Playwright 冒烟（57 项，行为断言而非像素）
└── test/                单测 + 集成测试
    ├── compat.test.mjs  0.1.5 适配：设置面登记的三种情形
    ├── mimo.test.mjs    MiMo：请求体形状、参考音频复用、流式、三款模型的能力差异
    ├── harness-home.mjs 共享脚手架：借真实 DSH 的 schemastery 布置临时 home
    └── integration.test.mjs 起真 HTTP 服务器打自己注册的路由
```

### 为什么 `models.js` 与 `engine.js` 是两个文件

模型目录（`models.js`）与分发（`engine.js`）分开，是为了让"一个模型的全部知识"只存在于一行里：

- `id` / `provider` / `kind` / `streaming` / `label` / `note` 收在 `MODELS` 的一行；
- 合成链路按 `provider` 分发，`kind` 决定请求里音色那一栏该填什么；
- 设置页的模型下拉与内置音色列表从 `GET /models` 拿，**前端不复制一份**。

如果模型名只是散落的字符串，每加一个模型要改的地方就有七八处（表单、克隆、档案行说明、合成分派、缓存键…），而漏掉任何一处的后果都是"选了这个音色，却用那个模型去合成"，报出来的错还极其难懂。

### 构建的两个约束

浏览器端产物必须是一个自包含的 classic script：

1. **纯拼接**，无打包器 —— `build.mjs` 按声明顺序把 `client/` 串起来。
2. **纯 ASCII** —— 所有中文/emoji 都转义成 `\uXXXX`，免得字符集被猜错变成乱码，`verify.mjs` 会断言还原后的文案正确。
3. 不得出现动态 `import()`、Node 内置模块 —— `verify.mjs` 同样会拦。

### 测试命令

```bash
npm test        # 只跑单测与集成测试
npm run build   # 重新生成 lib/client.js
npm run verify  # 对产物做静态自检（在产物上真渲染一遍设置页）
npm run test:all # 三件事按顺序全跑
```

> 分成两条是因为 `compat` / `integration` 里有一部分用例**需要真实 DSH 安装**（它们要借
> `@deepseek-ai/schemastery` 布置临时 home）。在没有 DSH 的机器上这些用例会显示成
> `cancelled`（**不是 `fail`**），而 `node --test` 遇到 cancelled 仍返回退出码 1 ——
> 于是把它和 `build` / `verify` 串在一起的话，后两步在那台机器上永远跑不到。

---

## 八、开发

```bash
npm test          # 196 项用例（单测 + 集成）
node --test "test/*.test.mjs"
```

集成测试会真的起**三台** HTTP 服务器（同一个进程里按 `one-shot` / `stream` / 角色扮演三种配置各注册一次插件）、把 `apply()` 注册的路由挂上去、再用真实 `fetch` 打它 —— 合成与复刻都走注入的假 fetch，所以不花钱也不联网。流式那条用例会把 SSE 响应切成两块投递，于是"一次读到半帧"也是被覆盖的。

角色扮演那一台是**最后**才挂的：音色档案是三台共享的一份 JSON（`~/.dsh/voice/profiles.json`，插件自管），提前建档案会污染前面那些"档案清单为空"的用例。它绑的是**档案 id** 而不是音色 ID —— 绑音色 ID 会把"这套音色用哪款模型"这一半信息丢掉，而模型现在是档案不可分割的一部分。

「一套档案此刻能不能用」的判定按模型分三种看法：百炼复刻看音色 ID、MiMo 复刻看本地样本文件在不在、音色设计看描述文本非空。这三处判定里最隐蔽的是**不可用之后的回落** —— 它是**静默**的：不报错、不提示，只是换回当前音色去念，于是"选了 MiMo 音色设计，念出来却是百炼那个声音"。所以判定里凡是用到"两个键二选一"的地方都写成 `||` 而不是 `??`：`normalize()` 保证 `designPrompt` 这个键**总是**存在（空档案里是空串），而 `??` 只对 null/undefined 回落，空串不会。

产物自检（`verify.mjs`）除了静态检查，还会**真渲染一遍设置页**、**在树上找到并点一下"实时（流式）"与"开启"（角色扮演）两个按钮**（断言它们立刻变选中、且下一次朗读请求带着新的 mode / roleplay）、**整段播放**跑一遍、并**真喂一条 SSE 进去驱动流式播放**：断言两块音频被排上日程、且第二块的开始时刻精确等于第一块的结束时刻（也就是"无缝"）—— 设置页里的崩溃、按钮点了没反应、以及流式链路上的时序错误，都要到用户真的点下去那一刻才现形，注册期是安静的。

### 界面预览（不装 dsh 也能看）

`preview/ui-preview.html` 是一个**纯前端单文件**的模拟页：左侧会话、中间带播放键的回答、右侧语音设置边栏（双 API Key / 当前音色与模型 / 合成方式 / 角色扮演 / 音色档案 / MiMo 内置音色 / 克隆演示 / 试听），观感对齐插件真身。音频由浏览器 Web Audio 本地合成，**不连宿主、不调百炼、不调 MiMo、不花钱**，用来离线核对交互与排期 —— 播放排期照 `client/shared.js` 的同一套算法，角色扮演那条回答能直接听出旁白（女声）与台词（男声）的交替、且顺序与原文一致。

界面按 v4.0 的形态还原，所以下面这几件事在预览里就能先看到：模型只在「新增音色 / 音色克隆」里选（且是列表）、档案名后面挂着模型后缀、MiMo 的 9 个内置音色勾选即添加、选了非低延迟模型时会挂「非低延迟」徽章。

```bash
node preview/smoke.mjs   # Playwright 冒烟 89 项：全绿才算过（需先装 playwright + chromium）
```

冒烟断言的是**行为**而非像素：开关状态机、绑定落盘、切分顺序（段序拼回原文）、两种模式的首包对比、句间/段间排期缝隙 < 1µs、侧边栏开合、刷新后记住偏好。

---

## 九、已知边界

- **只做 TTS**，不做语音输入。0.2.1 自带 `dsh-experimental-client-ui-voice-input`，后续若要双向对话，优先实现它的 provider 接口而不是另起炉灶。
- **消息文本依赖 chat 快照**：极老的消息滑出加载窗口后，只能靠宿主解析会话日志兜底，而日志格式不保证稳定。
- **宿主兜底需要 Node ≥ 23.8** 才能解 zstd 压缩的会话日志；低版本会跳过压缩文件。
- 播放键依赖 `conversation.chat.assistant-actions` 这个 slot；dsh 后续版本若改名，只需改 `client/index.js` 里的一个字符串。
- **流式要浏览器支持 Web Audio**（所有现代浏览器都有）。拿不到 `AudioContext` 时会在播放那一刻提示切回「非实时」，而不是静默失败。
- 流式音频**按句拼接**：云端一次 SSE 里按句返回，这里用 `AudioBufferSourceNode` 把它们排在一条时间轴上，所以听不出接缝；但**跨句的韵律仍略逊于整段合成** —— 这是云端的特性，不是这里的 bug。想要最连贯就用默认的非实时。
- 缓存下来的流式产物是 **WAV**（比 MP3 大，约 10 倍）；长期不用可以在设置页清空。
- 百炼这套接口的返回形状在不同版本间挪过位置，`clone.js` 里的状态字段按多处兜底取值；若将来固定下来可以收窄。
- **角色扮演目前只认一个角色**：一段话里出现多个人物时，所有台词共用「角色音色」。要按人物分音色，得先约定台词格式（例如「名字：台词」），这是 v3 之后的事。
- **角色扮演一次朗读会发多个请求**（旁白与台词交替 N 轮就是 N 次），所以计费与耗时都高于单音色朗读；段数上限 12，超长文本会把多余部分并入末段。
- **台词标记目前只认「」**，不认 `""` 或英文引号——避免把英文文本里的引号误当成台词。
- **MiMo 复刻音色会占本机空间**：参考音频存在 `~/.dsh/voice/samples/`，且**每次合成都要读它并 Base64 编码**。所以段落多、文本长时，MiMo 复刻音色的请求体会明显比百炼大（受 10MB 限制，这也是上传上限定在 7MB 的原因）。
- **MiMo 的复刻与设计两款不是低延迟流式**：官方写明降级为兼容模式（等全部推理完成后一次性返回）。这是云端限制，插件照常走流式路径，只是出声晚。档案行上有「非低延迟」徽章。
- **MiMo 目前没有"从云端同步音色"的等价能力**：那一条只对百炼账号有效。MiMo 的音色来自内置清单或本地参考音频。
- **单次请求文本上限 20000 字**（两家一致），超长文本会被截断。
- **0.1.5 设置写的可见性**：设置页里改动能否真的落盘取决于宿主接不接受写入。远程/非 loopback
  页面跑在 **memory 模式**下，那一版宿主不会报错也不会告知结论，插件只能依据快照的
  `writable` 判定 —— 此时按钮会在**本机**立刻生效，并在提示里说明"没写进宿主配置，
  重启后回到默认"。这不是 bug：0.1.5 的 `SettingsScope.set` 契约就是如此。

---

## 附录：0.1.5 兼容是怎么做的

这一段写给要维护这个分支的人。结论先摆出来：**两版的差别比想象中小得多**，
绝大部分 API 是逐字相同的，真正要改的只有两处。

### 逐API比对（拉取两版 npm 包实测）

| 面 | 0.1.5-rc.2 | 0.2.1-alpha.1 | 结论 |
|---|---|---|---|
| slot 名与契约 | `conversation.chat.assistant-actions`（kind list / scope session / ownerProps `{messageId}`）、`settings.section`（kind list / scope root） | 完全相同 | **零改动** |
| `useChat` / `sessionId` / `t` 标准 prop | 在 `standardProps` 里 | 在 | **零改动** |
| `ChatSnapshot` | `order/nodes/locations/navigation/timeline/legacy` | 逐字相同 | **零改动** |
| `AssistantMessageNode` | `{ kind:'assistant', seq, messageId?, ... blocks:[{kind:'text',text}] }` | 逐字相同 | **零改动** |
| `WebRoute` / `webServer.register` | `dsh-host-webserver` 的 index.d.ts | **diff 为空** | **零改动** |
| `cordis` | 4.0.2 | 4.0.5-alpha.1 | 源码 diff 仅 3 处，均与本插件无关 |
| `ctx.locale.register/bind` | 在 | 在 | **零改动** |
| 6 个前端注入包 | 全部存在（`^0.1.5-rc.2`） | 存在（`0.2.1-alpha.1`） | 版本范围随宿主 |
| 命名空间短名规则 | `'ui-chat'` / `'locale'` … | 同一套 | `'cosyvoice'` 两版通用 |
| `dsh.bundle.patch` / `dsh plugin add` | 支持（单值） | 支持（单值或数组） | 安装命令不变 |

### 改动一：宿主要自己登记设置面

0.2.1 的宿主会从 `export const Config` 自动推导出设置命名空间；0.1.5 不做这件事 ——
那里的 `Config` **只负责校验交给 `apply` 的那份配置**，不负责让它出现在 UI 上。
官方插件 `client-ui-chat` 在 0.1.5 上是这样写的：

```js
function apply(ctx) {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(CHAT_SETTINGS_NAMESPACE, ChatSettingsSchema)
  })
}
```

本插件照做（`host/index.js` 的 `registerSettingsNamespace`），并且刻意**用服务的有无
代替版本号分支**：0.2.1 上 `ctx.settings` 不存在，`ctx.inject` 于是永不触发；0.1.5 上
它存在，登记就发生。一条代码同时在两版上正确。

### 改动二：浏览器端两个服务名不同，且写操作返回值不同

| | 0.1.5 | 0.2.1 |
|---|---|---|
| 取表单 | `ctx.settingsScope.bind({ namespace })` | `ctx.configForms.get(entryId)` |
| 快照 | `SettingsScopeSnapshot` | `ConfigFormSnapshot`（**字段逐字相同**） |
| 写结果 | `Promise<void>` | `Promise<boolean>` |

这里有两个坑，都在注册期完全安静：

1. **`inject` 不能写死服务名。** `inject` 声明的是**硬依赖**；声明一个宿主没有的服务，
   cordis 就一直等它，插件**一次都不会挂载** —— 页面上连播放键都不出现，且没有任何报错。
   所以 `inject` 只剩 `['slots','locale']`，表单改为运行时探测（见
   `client/shared.js` 的 `configFormOf`）：两个都没有时只损失设置页，播放键照常。
   `verify.mjs` 里有两条静态断言把这条不变量钉住。

2. **`void` 不能当布尔用。** 0.1.5 的 `set()` resolve `undefined`，而它是 falsy ——
   直接透传会让每一次**成功**的写入都被报告成失败，正是 v2.1.1 那次"切换模式没反应"
   的成因之一。`normalizeWrites` 把它统一成「resolve = 已接受 / reject = 没写进去」，
   于是设置页里已经存在的那条 `.catch()` 分支自动接住失败，上层一行都没改。
   0.1.5 唯一可靠的判据是快照的 `writable`（memory 模式永不可写）。

### 测试

```bash
npm test        # 190 项：149（v3.x 原有）+ 4（0.1.5 适配层）+ 37（MiMo 与音色即模型）
npm run verify  # 84 项产物自检：包含一条 settingsScope 形态下仍登记设置页的真跑，
                # 写操作四种返回值语义（true / false / void / 抛错），
                # 以及在产物上真渲染一遍设置页并驱动它的交互
```

> 在**没有 DSH 安装**的机器上，`compat` / `integration` 里要借 schemastery 的那 35 个
> 用例会显示为 `cancelled` 而非 `fail`（总数不变，`fail` 仍是 0）。

`test/harness-home.mjs` 是抽出来的共享脚手架：`host/harness.js` 刻意从真实 DSH 安装处
解析 schemastery，所以凡是 `* --test` 里要 `import('../host/index.js')` 的用例，都得先
布置一个借了 schemastery 链接的临时 harness home。
