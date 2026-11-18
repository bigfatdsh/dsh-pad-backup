#!/usr/bin/env node
/**
 * restore.mjs —— 把「bigfatdsh/dsh-user-backup 手机适配版」装进 dsh-go 的 web profile。
 *
 * 用法：
 *   node restore.mjs --dry-run     # 只打印会做什么
 *   node restore.mjs               # 真正写文件（需要完整文件权限，别用沙箱 shell）
 *
 * 前提：DSH 已经启动过一次，~/.dsh/profiles/web 存在。
 * 装完要重启 App（引擎只在启动时装载 bundle）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = dirname(fileURLToPath(import.meta.url))
const dry = process.argv.includes('--dry-run')
const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const profileName = process.env.DSH_PROFILE || 'web'
const profile = join(DSH_HOME, 'profiles', profileName)

/** 手机适配后的加载顺序：优化层 → 记忆 → 预设 → 界面 */
const VENDORED = [
  'dsh-exec-optimizer',
  '@alanzhao/dsh-memory-lite',
  'dsh-optimizer',
  'dsh-plugin-fast',
  'dsh-session-cost',
  'dsh-tool-token-optimizer',
  'dsh-cookie-guard',
  'dsh-univer-turbo',
  'dsh-wpac',
  'dsh-pet-bibo-voice',
]
const NPM = ['dsh-univer-office@0.3.7', 'dsh-context@0.82.1', 'dsh-whale-widget@0.4.2', 'dsh-pet@0.4.9']
/** bundle 层顺序：优化 → 记忆 → 文档 → 预设 → 界面（univer-turbo 必须在 univer-office 之后） */
const BUNDLES = [
  'dsh-exec-optimizer',
  '@alanzhao/dsh-memory-lite',
  'dsh-optimizer',
  'dsh-plugin-fast',
  'dsh-session-cost',
  'dsh-tool-token-optimizer',
  'dsh-cookie-guard',
  'dsh-univer-office',
  'dsh-univer-turbo',
  'dsh-wpac',
  'dsh-context',
  'dsh-whale-widget',
  'dsh-pet',
  'dsh-pet-bibo-voice',
]
const BASE = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@deepseek-ai/dsh-experimental-voice-input-bundle']

const log = (...a) => console.log(...a)
const run = (cmd, args, cwd) => {
  log(`$ ${cmd} ${args.join(' ')}`)
  if (dry) return ''
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

if (!existsSync(join(profile, 'package.json'))) {
  console.error(`找不到 profile：${profile}（先启动一次 App）`)
  process.exit(1)
}

// 0. 快照
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const snapshot = join(profile, `.user-backup-${stamp}`)
log(`快照 → ${snapshot}`)
if (!dry) {
  mkdirSync(snapshot, { recursive: true })
  for (const f of ['package.json', 'cordis.patch.yml', 'compatibility.json']) {
    if (existsSync(join(profile, f))) cpSync(join(profile, f), join(snapshot, f))
  }
}

// 1. 插件放进 profile/vendor/（必须在 profile 内，宿主包才解析得到）
const vendorDir = join(profile, 'vendor')
if (!dry) mkdirSync(vendorDir, { recursive: true })
for (const name of VENDORED) {
  const dirName = name.includes('/') ? name.split('/')[1] : name
  const src = join(root, 'payload', dirName)
  const dst = join(vendorDir, dirName)
  log(`复制 ${dirName} → ${dst}`)
  if (!dry) {
    cpSync(src, dst, { recursive: true, force: true })
  }
}

// 2. pnpm 安装（link: 指向 profile 内的 vendor 副本）
const specs = [
  ...VENDORED.map((n) => {
    const dirName = n.includes('/') ? n.split('/')[1] : n
    return `link:${join(vendorDir, dirName)}`
  }),
  ...NPM,
]
run('dsh', ['plugin', '--profile', profileName, 'add', ...specs], root)

// 3. bundle 顺序（bundle 层的顺序就是覆盖顺序）
if (!dry) {
  const p = JSON.parse(readFileSync(join(profile, 'package.json'), 'utf8'))
  const extra = BUNDLES
  const keep = (p.dsh?.profile?.bundles || []).filter((n) => !BASE.includes(n) && !extra.includes(n))
  p.dsh ??= {}
  p.dsh.profile ??= {}
  p.dsh.profile.bundles = [...BASE, ...extra, ...keep]
  writeFileSync(join(profile, 'package.json'), JSON.stringify(p, null, 2) + '\n')
  log(`bundles: ${p.dsh.profile.bundles.length} 个`)
}

// 4. 插件设置：只补缺失，不覆盖用户改过的
for (const [file, target] of [
  ['optimizer.json', join(DSH_HOME, 'optimizer.json')],
  ['exec-optimizer.json', join(DSH_HOME, 'exec-optimizer.json')],
]) {
  if (existsSync(target)) {
    log(`保留已有 ${target}`)
    continue
  }
  log(`写入 ${target}`)
  if (!dry) cpSync(join(root, 'settings', file), target)
}

// 5. profile 覆盖层：手机端把 memory-lite 的抽取窗口放宽、schema 精简
const patchFile = join(profile, 'cordis.patch.yml')
const patchText = existsSync(patchFile) ? readFileSync(patchFile, 'utf8') : ''
if (!patchText.includes('id: memory-lite')) {
  const block = `
# ── 手机适配层（bigfatdsh 用户备份还原后加的本地覆盖）──
- id: memory-lite
  name: "@alanzhao/dsh-memory-lite"
  config:
    defaultPeer: dsh-web
    extraction:
      windowTurns: 80
      idleTimeoutMin: 45
    tools:
      schemaMinimal: true
`
  log(`追加 memory-lite 覆盖 → ${patchFile}`)
  if (!dry) writeFileSync(patchFile, patchText.replace(/\s*$/, '\n') + block)
} else {
  log('memory-lite 覆盖已存在，跳过')
}

// 6. 桌宠：手机上没有图形显示，桌面 helper 会被自动跳过；这里把配置调成手机尺寸 + 降频
const petConfig = join(DSH_HOME, 'dsh-pet', 'main-config.jsonc')
if (existsSync(petConfig)) {
  log(`调整桌宠配置 → ${petConfig}`)
  if (!dry) {
    const cfg = JSON.parse(readFileSync(petConfig, 'utf8'))
    for (const pet of cfg.pets || []) {
      pet.size = 200
      pet.display = 'web'
      pet.position = { corner: 'top-right', marginX: 8, marginY: 56 }
    }
    cfg.eventsRefreshSec = { whisper: 1800, balance: 900, sleepTalk: 3600 }
    writeFileSync(petConfig, JSON.stringify(cfg, null, 2) + '\n')
  }
} else {
  log('桌宠还没生成配置（首次启动后才有），跳过；重启后再跑一次即可')
}

// 7. wpac 技能装进技能根目录
log('安装 wpac 技能')
run(process.execPath, [join(vendorDir, 'dsh-wpac', 'scripts', 'install-skill.mjs')], root)

log('\n完成。重启 App 后生效；自检：dsh plugin doctor / 插件面板 或 plugin_doctor 工具。')
