import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile, appendFile, chmod } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const releaseCheck = fileURLToPath(new URL('../scripts/release-check.mjs', import.meta.url))

function command(commandName, args, cwd, env = process.env) {
  const result = spawnSync(commandName, args, { cwd, env, encoding: 'utf8' })
  if (result.error) throw result.error
  return result
}

async function fixture(options = {}) {
  const root = await mkdtemp(join(tmpdir(), 'superego-release-check-'))
  const bin = join(root, 'bin')
  await mkdir(join(root, 'deploy'), { recursive: true })
  await mkdir(join(root, 'docs'), { recursive: true })
  await mkdir(bin, { recursive: true })
  await writeFile(join(root, 'deploy/check.sh'), options.invalidScript
    ? '#!/usr/bin/env bash\nif then\n'
    : '#!/usr/bin/env bash\nset -euo pipefail\n')
  await writeFile(join(root, 'docs/release-candidate.template.md'), 'candidate={{CANDIDATE_HASH}} generated={{GENERATED_AT}}\n')
  await writeFile(join(root, 'package.json'), '{"private":true}\n')
  const fakeNpm = join(bin, 'npm')
  await writeFile(fakeNpm, '#!/usr/bin/env bash\nif [[ "$1" == "test" && "${FAKE_TEST_FAILURE:-0}" == "1" ]]; then exit 23; fi\nexit 0\n')
  await chmod(fakeNpm, 0o755)
  assert.equal(command('git', ['init', '-q'], root).status, 0)
  assert.equal(command('git', ['config', 'user.email', 'release-check@example.invalid'], root).status, 0)
  assert.equal(command('git', ['config', 'user.name', 'Release Check'], root).status, 0)
  assert.equal(command('git', ['add', '.'], root).status, 0)
  assert.equal(command('git', ['commit', '-qm', 'fixture'], root).status, 0)
  if (options.dirty) await appendFile(join(root, 'package.json'), ' ')
  return {
    root,
    env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}`, FAKE_TEST_FAILURE: options.testFailure ? '1' : '0' },
  }
}

function runCheck({ root, env }) {
  return command(process.execPath, [releaseCheck, '--root', root], dirname(releaseCheck), env)
}

test('release check returns non-zero for a dirty worktree', async (context) => {
  const sample = await fixture({ dirty: true })
  context.after(() => rm(sample.root, { recursive: true, force: true }))
  const result = runCheck(sample)
  assert.notEqual(result.status, 0)
  assert.match(`${result.stdout}${result.stderr}`, /Git 工作区不干净/)
})

test('release check returns non-zero for invalid deploy shell syntax', async (context) => {
  const sample = await fixture({ invalidScript: true })
  context.after(() => rm(sample.root, { recursive: true, force: true }))
  const result = runCheck(sample)
  assert.notEqual(result.status, 0)
  assert.match(`${result.stdout}${result.stderr}`, /脚本语法错误/)
})

test('release check returns non-zero when npm test fails', async (context) => {
  const sample = await fixture({ testFailure: true })
  context.after(() => rm(sample.root, { recursive: true, force: true }))
  const result = runCheck(sample)
  assert.notEqual(result.status, 0)
  assert.match(`${result.stdout}${result.stderr}`, /npm test 失败/)
})
