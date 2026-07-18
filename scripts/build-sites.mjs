import { cp, mkdir, rename, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')
const stagedClient = resolve(root, '.sites-client-build')

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status || 1)
}

await rm(stagedClient, { recursive: true, force: true })
run('npm', ['run', 'build'])
await rename(dist, stagedClient)
await mkdir(resolve(dist, 'client'), { recursive: true })
await cp(stagedClient, resolve(dist, 'client'), { recursive: true })
await rm(stagedClient, { recursive: true, force: true })
run(resolve(root, 'node_modules/.bin/vite'), ['build', '--config', 'vite.worker.config.ts'])
await mkdir(resolve(dist, '.openai'), { recursive: true })
await cp(resolve(root, '.openai/hosting.json'), resolve(dist, '.openai/hosting.json'))
