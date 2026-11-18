# 用户备份 · 手机（dsh-go）适配版

把 GitHub 上 [bigfatdsh/dsh-user-backup](https://github.com/bigfatdsh/dsh-user-backup)（2026-11-17 快照，25 个插件的桌面版 desktop profile）还原到这台手机的 dsh-go 上，并按 **Android + proot + 原生 Flutter 界面 + DSH 0.2.2-rc.1** 重做了取舍与适配。

- 备份原环境：DSH 0.2.2-rc.3 · macOS arm64 · Node 24 · profile `desktop`
- 本机环境：dsh-go App 1.1.0 · DSH 0.2.2-rc.1 · Node 24.22.1 · Android 16（arm64, proot）· profile `web`
- 结果：**14 个插件**（另 3 个内置 bundle 原样保留）全部装载成功，体检 17/17 通过

## 一、装了什么

| 插件 | 版本 | 作用 | 手机上的形态 |
|---|---|---|---|
| dsh-exec-optimizer | 1.1.0 | 并行 / 重试 / 截断 / 按需加载 / 防复读 | 全功能 |
| @alanzhao/dsh-memory-lite | 0.4.1-adapted.1 | 跨会话 Markdown 记忆 + 5 个记忆工具 | 工具全功能；标题栏胶囊属于网页端 |
| dsh-optimizer | 4.8.0 | 精简化输出、推理等级 auto、花费预警 | 全功能 |
| dsh-plugin-fast | 1.0.0 | 一次调用装插件 + 体检（`plugin_install_fast` / `plugin_doctor`） | 全功能（已修手机版路径探测） |
| dsh-session-cost | 1.1.0 | 本轮 / 本会话花费、峰谷价 | 数据随会话；展示在网页端 |
| dsh-tool-token-optimizer | 1.0.16 | 工具结果落盘前压缩（省 token） | 全功能 |
| dsh-cookie-guard | 1.0.0 | 清理登录 Cookie 累积，防 Web UI 打不开 | 全功能（网页模式下最有用） |
| dsh-context | 0.82.1 | Context 标签页、`/context` 命令、上下文看板 | 命令与工具可用；标签页在网页端 |
| dsh-univer-office | 0.3.7 | Univer 文档 / 表格 / 幻灯片工具（`.univer` 与 xlsx/docx/pptx 导入导出） | 全功能；预览截图需要 Chromium，这台没装 |
| dsh-univer-turbo | 1.0.10 | 把 14 个 `univer_*` 收成一个 `univer` 门面 + 结果压缩 | 全功能 |
| dsh-whale-widget | 0.4.2 | 右下角余额 / 用量小鲸鱼挂件 | 只在网页模式可见 |
| dsh-pet | 0.4.9 | 桌宠：网页内宠物、余额气泡、碎碎念、陪你聊天 | 网页模式可见；桌面窗口与托盘自动跳过 |
| dsh-pet-bibo-voice | 0.1.0 | 给桌宠加「哔哔啵啵」语音（bibo/fish，本地合成） | 全功能，不联网不调 TTS |
| dsh-wpac | 0.8.3 | WPAC 预设（W/P/A/C 四要素先补全再交付） | 预设 + `wpac` 技能 |

加载顺序（bundle 层顺序 = 覆盖顺序）：

```
@deepseek-ai/dsh-base
@deepseek-ai/dsh-web-app
@deepseek-ai/dsh-experimental-voice-input-bundle
dsh-exec-optimizer
@alanzhao/dsh-memory-lite
dsh-optimizer
dsh-plugin-fast
dsh-session-cost
dsh-tool-token-optimizer
dsh-cookie-guard
dsh-univer-office
dsh-univer-turbo
dsh-wpac
dsh-context
dsh-whale-widget
dsh-pet
dsh-pet-bibo-voice
```

## 二、舍掉了什么，为什么

| 插件 | 取舍原因 |
|---|---|
| dsh-fish 0.6.1 | 你同意舍弃（大肥鱼本体，桌面 / B站 / 微信链路） |
| dsh-fish-memory 0.1.0 | 同上；它的 patch 里还写死了 `/Users/yangletian/...` 三处路径 |
| dsh-yishi-whale 0.4.26-whale.1 | 你同意舍弃（跨会话记忆只挂 whale-lean 预设） |
| dsh-orb 0.2.0 | Electron 桌面悬浮球，149 MB，手机没有桌面环境 |
| dsh-computer-use-turbo 1.0.0 | 面向桌面 Computer Use（截图/键鼠）；手机上走 MCP 手机操控，链路不同 |
| dsh-sd-bridge-mac 1.0.0 | macOS 本地 A1111 桥，手机上既没有 webui 也没有模型 |
| dsh-sd-turbo 1.0.0 | 依赖上面的 SD 桥 |
| dsh-wechat-media 1.6.3 | iLink 微信桥：要扫码登录，且它的精简预设挂着 fish 的 whale-lean，鱼没了链路就断 |
| dsh-wechat-media-turbo 0.1.0 | 同上（鲸鱼娘人设 preset） |
| dsh-bili-scroll 2.2.0 | 需另装约 84 MB 本地依赖（Python 环境 / 转写）、B 站扫码登录，还要一条版本豁免；手机上收益低于维护成本 |
| dshmarket 1.73.20 | 网页版可视化插件市场；App 自带插件面板 |

> `dsh-bili-scroll` 想加回来是可以的：`dsh plugin --profile web add dsh-bili-scroll@2.2.0` + 在 `compatibility.json` 里给 `0.2.2-rc.1` 开豁免 + 扫码登录。

## 三、做了哪些适配（不是照抄）

1. **profile 换名**：备份写给 `desktop`，本机只有 `web`；bundle 列表、`dsh plugin --profile` 全部改成 `web`。
2. **插件落位改造（关键）**：备份用 `link:` 指向仓库外目录，实测这样装载 memory-lite 会直接
   `ERR_MODULE_NOT_FOUND: @deepseek-ai/schemastery` —— 宿主包只对 **profile 目录内**的插件做解析映射。
   现在 8 个仓库内插件都复制到 `~/.dsh/profiles/web/vendor/`，再用 `link:` 安装，解析链落在 profile 里。
3. **dsh-plugin-fast 手机版修复**（两处）：
   - `profileDir()` 只认 `desktop`、依赖 Electron 环境变量 → 补 `web` 探测、`DSH_HOME`、以及「从插件自身位置向上找带 `dsh.profile` 的 package.json」。
   - `hostModuleRoots()` 只找 `app.asar` 里的宿主 node_modules → 补「从 `argv[1]` / `DSH_ENTRY` 向上找 `node_modules`」，手机版宿主在 `/opt/dsh/node_modules`。修完体检从 3 个误报变成 0。
4. **dsh-wpac 预设重生成**：它的工具面是从标准预设手抄的，本机 DSH 是 rc.1，抄来的列表里有一个本机不存在的
   `@deepseek-ai/dsh-tool-office`。跑 `scripts/adapt-tools.mjs --source <本机 standard.patch.yml> --write` 重新对齐（33 行，去掉那一行），其余与本机 standard 一致。
5. **wpac 技能落地**：`~/.dsh/skills/wpac`（SKILL.md 21 KB），preset 里点名的技能目录因此可用。
6. **memory-lite 手机调参**：后台抽取从默认 50 回合 / 30 分钟放宽到 **80 回合 / 45 分钟**，工具 schema 走精简档 —— 手机上省电、省 token；其余默认（记忆根 `~/.agent-memory`、peer 按工作目录推导）不变。
7. **沿用备份的运行时设置**：`~/.dsh/optimizer.json`（`concise: true`）与 `~/.dsh/exec-optimizer.json`（`resultCap:false / cacheSafe / lazyTools / autoCompact`）。
8. **版本豁免没照抄**：备份的 `compatibility.json` 写的是 `0.2.1-rc.3`，在 rc.1 上无效；需要豁免的两个包（bili-scroll / plugin-fast）一个没装、一个本身没有 `engines` 约束，所以干脆不写豁免文件，少一处升级就会失效的坑。
9. **桌宠按手机改配置**：这台没有图形显示（`DISPLAY` 空），dsh-pet 会自己跳过桌面 helper，改用网页内宠物 —— 日志里就是「未检测到图形显示环境…已跳过桌面宠物，浏览器内宠物不受影响」。另外把 `size` 从 462 调到 200、`display` 改成 `web`、边距改成 8/56（贴手机网页宽度），碎碎念从 300 秒放宽到 1800 秒（`eventsRefreshSec.whisper`，全局段），余额刷新 900 秒、梦话 3600 秒 —— 手机上少调模型、少耗电。
10. **体检不再误报网页依赖**：dsh-pet 声明了 `react` / `react-dom` / `@deepseek-ai/dsh-client-*` 这类 peer，桌面版从 app.asar 取，手机版由网页端模块图提供。给 `plugin_doctor` 加了判定：`dsh.client.platform === 'web'` 的插件，这些依赖算「宿主提供」，不再报成必炸项。
11. **登录态照旧不还原**：微信 / B 站 / SD 模型 / 记忆文件本来就不在备份里，恢复后仍是空的。

## 四、验证

- `dsh --profile web --dump-config`：组合通过，`memory-lite` 覆盖行已生效（写入的是 80/45 + schemaMinimal）
- `plugin_doctor`：`ok: true`，17 个 bundle（3 内置 + 14 安装）无缺失 import / peer
- 用 profile 副本在隔离 `DSH_HOME` 启动 `dsh web`：**零** `did not activate` 警告（有插件导入失败时 DSH 一定会打这条）
- `~/.dsh/skills` 里已出现 `wpac`

## 五、生效与自检

**要重启引擎才完整生效** —— bundle 只在引擎启动时装载。当前会话里只热加载了一部分，工具注册不完整。

重启入口：`设置 › 插件` 里会提示「需要重启引擎」，点它即可（会中断进行中的回复）。然后按这三条自检：

1. 对 Agent 说「跑一下 plugin_doctor」→ 应返回 `ok: true`、17 个 bundle；
2. `设置 › 插件 › 已安装` 里能看到新装的 14 个插件；只适用网页版的几个（session-cost / context / memory-lite 的面板）要按页面提示点「显示网页版插件」才列出来；
3. 对 Agent 说「记住：我在用手机」→ 应调用 `remember`（memory-lite），文件落到 `~/.agent-memory/`。

看到 `wpac模式` 预设、技能列表里有 `wpac`，就说明预设和技能都到位了。

## 六、回滚与重装

```bash
# 重装这套适配（会自动快照现有配置）
node restore.mjs --dry-run
node restore.mjs

# 列快照 / 回滚
node rollback.mjs --list
node rollback.mjs --yes
```

回滚会还原 `package.json` / `cordis.patch.yml`、卸载这 9 个插件、删掉 `vendor/`，但**不动**你的 `optimizer.json`、`exec-optimizer.json`。

## 七、已知限制

- **界面归界面**：session-cost 的花费行、context 的 Context 标签页、memory-lite 的标题栏胶囊都长在网页端（`网页模式` / :3080 能看到）；Flutter 原生界面只显示工具与命令的结果。工具层不受影响。
- **宠物只在网页模式**：dsh-go 的原生 Flutter 界面不渲染网页宠物，宠物、它的余额气泡和碎碎念气泡要在网页模式里看；桌面独立窗口 / 托盘在这台机器上不可用（无图形环境，插件自己跳过）。
- **碎碎念会花 token**：每次生成是一次模型调用，已从 5 分钟一次放宽到 30 分钟一次；嫌多就在 `~/.dsh/dsh-pet/main-config.jsonc` 把 `whisperEnabled` 改 `false`。
- **vendor 是冻结副本**：插件版本锁在这里，不会自己跟着 npm 更新；DSH 升级后要重跑 `restore.mjs`，wpac 还要再跑一次 `adapt-tools.mjs`。
- **记忆是新的**：`~/.agent-memory` 从空开始，要重新攒。
