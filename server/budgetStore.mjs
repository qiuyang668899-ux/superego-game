import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export function createFileBudgetStore(path) {
  return {
    async load() {
      try {
        const value = JSON.parse(await readFile(path, 'utf8'))
        if (typeof value?.day === 'string' && Number.isFinite(value?.count)) return value
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error
      }
      return null
    },
    async save(value) {
      await mkdir(dirname(path), { recursive: true })
      const temporary = `${path}.tmp`
      await writeFile(temporary, `${JSON.stringify(value)}\n`, { mode: 0o600 })
      await rename(temporary, path)
    },
  }
}
