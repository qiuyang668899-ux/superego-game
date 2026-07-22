import assert from 'node:assert/strict'
import { mkdtempSync, realpathSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { isMainModule } from '../server.mjs'

test('server entrypoint recognizes a systemd current symlink', () => {
  const serverPath = fileURLToPath(new URL('../server.mjs', import.meta.url))
  const directory = mkdtempSync(join(tmpdir(), 'superego-entrypoint-'))
  const currentPath = join(directory, 'server.mjs')
  symlinkSync(serverPath, currentPath)

  assert.equal(realpathSync(currentPath), realpathSync(serverPath))
  assert.equal(isMainModule(currentPath, serverPath), true)
})

test('server entrypoint rejects a different executable', () => {
  assert.equal(isMainModule(process.execPath, fileURLToPath(new URL('../server.mjs', import.meta.url))), false)
})
