import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function parseRoot(argv) {
  const index = argv.indexOf('--root')
  if (index === -1) return scriptRoot
  if (!argv[index + 1]) throw new Error('--root 需要一个目录')
  return resolve(argv[index + 1])
}

function run(command, args, root, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    stdio: options.capture ? 'pipe' : 'inherit',
  })
  if (result.error) throw result.error
  return result
}

function fail(label, result, detail = '') {
  console.error(`\n[NO-GO] ${label}`)
  if (detail) console.error(detail)
  if (result?.stdout) console.error(result.stdout.trim())
  if (result?.stderr) console.error(result.stderr.trim())
  process.exitCode = result?.status || 1
}

async function generateChecklist(root, hash) {
  const source = resolve(root, 'docs/release-candidate.template.md')
  const target = resolve(root, '.release/release-candidate.md')
  const template = await readFile(source, 'utf8')
  const rendered = template
    .replaceAll('{{CANDIDATE_HASH}}', hash)
    .replaceAll('{{GENERATED_AT}}', new Date().toISOString())
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, rendered)
  return target
}

export async function releaseCheck(root = scriptRoot) {
  console.log('《超我》发布候选门禁：仅执行本地只读/构建检查，不连接服务器。')

  const workspace = run('git', ['status', '--porcelain=v1', '--untracked-files=all'], root, { capture: true })
  if (workspace.status !== 0 || workspace.stdout.trim()) {
    fail('Git 工作区不干净', workspace, workspace.stdout.trim() || '无法读取 Git 状态')
    return false
  }
  console.log('[PASS 1/6] Git 工作区干净')

  const tests = run('npm', ['test'], root)
  if (tests.status !== 0) { fail('npm test 失败', tests); return false }
  console.log('[PASS 2/6] npm test')

  const build = run('npm', ['run', 'build'], root)
  if (build.status !== 0) { fail('npm run build 失败', build); return false }
  console.log('[PASS 3/6] npm run build')

  const audit = run('npm', ['audit', '--omit=dev'], root)
  if (audit.status !== 0) { fail('npm audit --omit=dev 失败', audit); return false }
  console.log('[PASS 4/6] npm audit --omit=dev')

  const whitespace = run('git', ['diff', '--check'], root)
  if (whitespace.status !== 0) { fail('git diff --check 失败', whitespace); return false }
  console.log('[PASS 5/6] git diff --check')

  const deployDir = resolve(root, 'deploy')
  const deployScripts = (await readdir(deployDir))
    .filter((name) => name.endsWith('.sh'))
    .sort()
  if (!deployScripts.length) {
    fail('未找到 deploy/*.sh', null)
    return false
  }
  for (const script of deployScripts) {
    const syntax = run('bash', ['-n', resolve(deployDir, script)], root, { capture: true })
    if (syntax.status !== 0) {
      fail(`脚本语法错误：deploy/${script}`, syntax)
      return false
    }
  }
  console.log(`[PASS 6/6] bash -n（${deployScripts.length} 个 deploy 脚本）`)

  const hashResult = run('git', ['rev-parse', 'HEAD'], root, { capture: true })
  if (hashResult.status !== 0) { fail('无法读取候选提交', hashResult); return false }
  const hash = hashResult.stdout.trim()
  const checklist = await generateChecklist(root, hash)
  console.log(`\n[GO] 候选 ${hash}`)
  console.log(`发布清单：${checklist}`)
  console.log('未执行 SSH、上传、软链切换、DNS 修改或线上健康检查。')
  return true
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try {
    const ok = await releaseCheck(parseRoot(process.argv.slice(2)))
    if (!ok && !process.exitCode) process.exitCode = 1
  } catch (error) {
    console.error(`\n[NO-GO] 门禁执行异常：${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  }
}
