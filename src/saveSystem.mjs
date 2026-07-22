export const SAVE_SCHEMA_VERSION = 2
export const SAVE_PRIMARY_KEY = 'superego-save-primary'
export const SAVE_BACKUP_KEY = 'superego-save-backup'
export const LEGACY_SAVE_KEY = 'superego-game-v1'

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function checksum(value) {
  const text = JSON.stringify(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function parseEnvelope(raw, validate) {
  const envelope = JSON.parse(raw)
  if (!isObject(envelope) || envelope.schemaVersion !== SAVE_SCHEMA_VERSION || !isObject(envelope.state)) return null
  if (typeof envelope.savedAt !== 'number' || typeof envelope.revision !== 'number' || envelope.checksum !== checksum(envelope.state)) return null
  const state = validate(envelope.state)
  return state ? { ...envelope, state } : null
}

function safeGet(storage, key) {
  try {
    return { ok: true, value: storage.getItem(key) }
  } catch (error) {
    return { ok: false, error }
  }
}

export class SaveStore {
  constructor(storage, options = {}) {
    this.storage = storage
    this.validate = options.validate || ((value) => value)
    this.normalize = options.normalize || ((value) => value)
    this.clone = options.clone || ((value) => structuredClone(value))
  }

  load(defaultState) {
    if (!this.storage) return { state: this.clone(defaultState), status: 'unavailable', blockAutosave: true, reason: 'storage_unavailable' }
    const primary = safeGet(this.storage, SAVE_PRIMARY_KEY)
    const backup = safeGet(this.storage, SAVE_BACKUP_KEY)
    if (!primary.ok || !backup.ok) return { state: this.clone(defaultState), status: 'unavailable', blockAutosave: true, reason: 'storage_unavailable' }

    let primaryEnvelope = null
    let backupEnvelope = null
    let primaryCorrupt = false
    let backupCorrupt = false
    if (primary.value) {
      try { primaryEnvelope = parseEnvelope(primary.value, this.validate) } catch { primaryCorrupt = true }
      if (!primaryEnvelope) primaryCorrupt = true
    }
    if (backup.value) {
      try { backupEnvelope = parseEnvelope(backup.value, this.validate) } catch { backupCorrupt = true }
      if (!backupEnvelope) backupCorrupt = true
    }
    if (primaryEnvelope) return { state: this.normalize(primaryEnvelope.state), status: 'ok', blockAutosave: false, reason: '' }
    if (backupEnvelope) return { state: this.normalize(backupEnvelope.state), status: 'recovered', blockAutosave: false, reason: primaryCorrupt ? 'primary_corrupt' : 'primary_missing' }

    const legacy = safeGet(this.storage, LEGACY_SAVE_KEY)
    if (!legacy.ok) return { state: this.clone(defaultState), status: 'unavailable', blockAutosave: true, reason: 'storage_unavailable' }
    if (legacy.value) {
      try {
        const parsed = JSON.parse(legacy.value)
        const state = this.validate(parsed)
        if (state) return { state: this.normalize(state), status: 'migrated', blockAutosave: false, reason: 'legacy_v1' }
      } catch {
        // The old blob is retained; the player gets an explicit recovery UI.
      }
    }
    return {
      state: this.clone(defaultState),
      status: primaryCorrupt || backupCorrupt || legacy.value ? 'corrupt' : 'new',
      blockAutosave: Boolean(primaryCorrupt || backupCorrupt || legacy.value),
      reason: primaryCorrupt || backupCorrupt || legacy.value ? 'no_valid_save' : '',
    }
  }

  save(state) {
    if (!this.storage) return { ok: false, reason: 'storage_unavailable' }
    const normalized = this.normalize(state)
    if (!this.validate(normalized)) return { ok: false, reason: 'state_invalid' }
    const now = Date.now()
    const current = safeGet(this.storage, SAVE_PRIMARY_KEY)
    const previous = current.ok && current.value ? (() => {
      try { return parseEnvelope(current.value, this.validate) } catch { return null }
    })() : null
    const envelope = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: now,
      revision: (previous?.revision || 0) + 1,
      checksum: checksum(normalized),
      state: normalized,
    }
    try {
      if (previous) this.storage.setItem(SAVE_BACKUP_KEY, JSON.stringify(previous))
      this.storage.setItem(SAVE_PRIMARY_KEY, JSON.stringify(envelope))
      return { ok: true, reason: '' }
    } catch (error) {
      return { ok: false, reason: error?.name === 'QuotaExceededError' ? 'quota' : 'storage_write_failed' }
    }
  }

  restoreBackup(defaultState) {
    if (!this.storage) return { state: this.clone(defaultState), ok: false, reason: 'storage_unavailable' }
    const raw = safeGet(this.storage, SAVE_BACKUP_KEY)
    if (!raw.ok || !raw.value) return { state: this.clone(defaultState), ok: false, reason: 'backup_missing' }
    try {
      const envelope = parseEnvelope(raw.value, this.validate)
      if (!envelope) return { state: this.clone(defaultState), ok: false, reason: 'backup_corrupt' }
      const saved = this.save(envelope.state)
      return { state: this.normalize(envelope.state), ok: saved.ok, reason: saved.reason }
    } catch {
      return { state: this.clone(defaultState), ok: false, reason: 'backup_corrupt' }
    }
  }

  importText(text) {
    try {
      const parsed = JSON.parse(String(text))
      if (parsed?.schemaVersion === SAVE_SCHEMA_VERSION && parsed.checksum !== checksum(parsed.state)) {
        return { ok: false, reason: 'import_checksum_mismatch' }
      }
      const candidate = parsed?.schemaVersion === SAVE_SCHEMA_VERSION ? parsed.state : parsed
      const state = this.validate(candidate)
      if (!state) return { ok: false, reason: 'import_invalid' }
      const result = this.save(this.normalize(state))
      return { ok: result.ok, reason: result.reason, state: this.normalize(state) }
    } catch {
      return { ok: false, reason: 'import_invalid' }
    }
  }

  exportText(state) {
    const normalized = this.normalize(state)
    return JSON.stringify({
      schemaVersion: SAVE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      checksum: checksum(normalized),
      state: normalized,
    }, null, 2)
  }

  clear() {
    if (!this.storage) return { ok: false, reason: 'storage_unavailable' }
    try {
      this.storage.removeItem(SAVE_PRIMARY_KEY)
      this.storage.removeItem(SAVE_BACKUP_KEY)
      this.storage.removeItem(LEGACY_SAVE_KEY)
      return { ok: true, reason: '' }
    } catch {
      return { ok: false, reason: 'storage_write_failed' }
    }
  }
}
