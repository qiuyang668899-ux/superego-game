export const SAVE_SCHEMA_VERSION: 2
export const SAVE_PRIMARY_KEY: string
export const SAVE_BACKUP_KEY: string
export const LEGACY_SAVE_KEY: string

export interface SaveLoadResult<T> {
  state: T
  status: 'ok' | 'new' | 'migrated' | 'recovered' | 'corrupt' | 'unavailable'
  blockAutosave: boolean
  reason: string
}

export class SaveStore<T> {
  constructor(storage: Storage | null, options?: { validate?: (value: unknown) => T | null; normalize?: (value: T) => T; clone?: (value: T) => T })
  load(defaultState: T): SaveLoadResult<T>
  save(state: T): { ok: boolean; reason: string }
  restoreBackup(defaultState: T): { state: T; ok: boolean; reason: string }
  importText(text: string): { ok: boolean; reason: string; state?: T }
  exportText(state: T): string
  clear(): { ok: boolean; reason: string }
}
