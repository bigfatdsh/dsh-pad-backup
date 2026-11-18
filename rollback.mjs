#!/usr/bin/env node
/**
 * rollback.mjs —— 把 profile 退回这次还原之前的快照。
 *
 * 用法：
 *   node rollback.mjs --list            # 列出可用快照
 *   node rollback.mjs --dry-run         # 只打印会做什么
 *   node rollback.mjs --yes             # 真的回滚（用最新一份快照）
 *   node rollback.mjs --yes --snap .user-backup-2026-...
 *
 * 回滚会：还原 package.json / cordis.patch.yml / compatibility.json，
 *         卸载本包装进去的 9 个插件，删掉 profile/vendor，
 *         保留 ~/.dsh/optimizer.json 与 exec-optimizer.json（不删你的设置）。
 */
import { existsSync, readdirSync, readFileSync, rmSync, cpSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const profileName = process.env.DSH_PROFILE || 'web'
const profile = join(DSH_HOME, 'profiles', profileName)
const snapFlag = argv.indexOf('--snap')

const PLUGINS = [
  'dsh-exec-optimizer',
  '@alanzhao/dsh-memory-lite',
  'dsh-optimizer',
  'dsh-plugin-fast',
  'dsh-session-cost',
  'dsh-tool-token-optimizer',
  'dsh-cookie-guard',
  'dsh-wpac',
  'dsh-context',
]

const snaps = existsSync(profile)
  ? readdirSync(profile).filter((n) => n.startsWith('.user-backup-')).sort()
  : []

if (argv.includes('--list')) {
  console.log(snaps.length ? snaps.join('\n') : '（没有快照）')
  process.exit(0)
}
if (!snaps.length) {
  console.error('没有可用快照')
  process.exit(1)
}

const snap = snapFlag !== -1 ? argv[snapFlag + 1] : snaps[snaps.length - 1]
const dir = join(profile, snap)
const dry = argv.includes('--dry-run')
const yes = argv.includes('--yes')

console.log(`快照：${dir}`)
if (!existsSync(dir)) {
  console.error('快照不存在')
  process.exit(1)
}

if (dry) {
  console.log(`会还原：${readdirSync(dir).join(', ')}`)
  console.log(`会卸载：${PLUGINS.join(', ')}`)
  console.log(`会删除：${join(profile, 'vendor')}`)
  process.exit(0)
}
if (!yes) {
  console.error('加 --yes 才真的回滚（先 --dry-run 看看）')
  process.exit(1)
}

for (const f of readdirSync(dir)) {
  cpSync(join(dir, f), join(profile, f))
  console.log(`还原 ${f}`)
}

// 从 bundle 列表里摘掉本包加的行，再卸载
const manifestFile = join(profile, 'package.json')
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'))
const bundles = manifest.dsh?.profile?.bundles || []
manifest.dsh.profile.bundles = bundles.filter((n) => !PLUGINS.includes(n))
writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n')

try {
  execFileSync('dsh', ['plugin', '--profile', profileName, 'remove', ...PLUGINS], { encoding: 'utf8', stdio: 'inherit' })
} catch (e) {
  console.error('卸载失败（可以手动跑 dsh plugin --profile ' + profileName + ' remove …）：', e?.message)
}

rmSync(join(profile, 'vendor'), { recursive: true, force: true })
console.log('回滚完成，重启 App 生效。')
