import assert from 'node:assert/strict'
import test from 'node:test'
import { GAME_STATE_LIMITS, sanitizeGameState } from '../src/gameStateSchema.mjs'
import { LEGACY_SAVE_KEY, SAVE_PRIMARY_KEY, SaveStore } from '../src/saveSystem.mjs'

class MemoryStorage {
  constructor(entries = {}) { this.values = new Map(Object.entries(entries)); this.failGet = false; this.failSet = false }
  getItem(key) { if (this.failGet) throw new Error('privacy mode'); return this.values.get(key) ?? null }
  setItem(key, value) { if (this.failSet) { const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error } this.values.set(key, value) }
  removeItem(key) { this.values.delete(key) }
}

const defaultState = { xp: 1, playerName: '修行者' }
const validate = (value) => value && Number.isFinite(value.xp) ? { xp: value.xp, playerName: String(value.playerName || '修行者') } : null
const makeStore = (storage) => new SaveStore(storage, { validate, normalize: (value) => ({ ...value }) })

test('legacy save migrates without deletion and writes a versioned envelope', () => {
  const storage = new MemoryStorage({ [LEGACY_SAVE_KEY]: JSON.stringify({ xp: 42, playerName: '旧玩家' }) })
  const store = makeStore(storage)
  const loaded = store.load(defaultState)
  assert.equal(loaded.status, 'migrated')
  assert.equal(loaded.state.xp, 42)
  assert.equal(store.save(loaded.state).ok, true)
  assert.equal(JSON.parse(storage.getItem(SAVE_PRIMARY_KEY)).schemaVersion, 2)
  assert.notEqual(storage.getItem(LEGACY_SAVE_KEY), null)
})

test('corrupt primary restores last-known-good backup and never overwrites both-corrupt data', () => {
  const storage = new MemoryStorage()
  const store = makeStore(storage)
  store.save({ xp: 10, playerName: 'a' })
  store.save({ xp: 20, playerName: 'a' })
  storage.setItem(SAVE_PRIMARY_KEY, '{bad-json')
  const recovered = store.load(defaultState)
  assert.equal(recovered.status, 'recovered')
  assert.equal(recovered.state.xp, 10)
  storage.values.set('superego-save-backup', '{bad-backup')
  const corruptPrimary = storage.getItem(SAVE_PRIMARY_KEY)
  const blocked = store.load(defaultState)
  assert.equal(blocked.status, 'corrupt')
  assert.equal(blocked.blockAutosave, true)
  assert.equal(storage.getItem(SAVE_PRIMARY_KEY), corruptPrimary)
})

test('quota and Safari-like private storage failures are explicit', () => {
  const storage = new MemoryStorage()
  storage.failSet = true
  assert.equal(makeStore(storage).save(defaultState).reason, 'quota')
  storage.failSet = false
  storage.failGet = true
  const load = makeStore(storage).load(defaultState)
  assert.equal(load.status, 'unavailable')
  assert.equal(load.blockAutosave, true)
})

test('export import verifies checksum before replacing the current save', () => {
  const storage = new MemoryStorage()
  const store = makeStore(storage)
  const exported = store.exportText({ xp: 9, playerName: 'a' })
  assert.equal(store.importText(exported).ok, true)
  const tampered = JSON.parse(exported)
  tampered.state.xp = 999
  assert.equal(store.importText(JSON.stringify(tampered)).reason, 'import_checksum_mismatch')
})

test('runtime schema caps player-controlled collections and text sizes', () => {
  const defaults = {
    onboarded: false, playerName: '修行者', primeVow: '清醒', activeTab: 'cave', xp: 1, will: 1, karma: 1, ability: 1, insight: 1, merit: 1,
    energy: 1, maxEnergy: 12, lastEnergyAt: 1, streak: 0, storyIndex: 0, clearedStoryChapters: [], lastPracticeDate: '', soundOn: true,
    referralCode: 'SG', canonBookmarks: [], canonHistory: [],
    agent: { name: '超我', stage: '初醒', autonomy: 1, curiosity: 1, care: 1, discipline: 1, integrity: 1, traits: [], credo: '', lastCycleAt: 0, growthCount: 0 },
  }
  const input = {
    ...defaults,
    knowledge: Array.from({ length: 100 }, (_, index) => ({ id: String(index), title: '书', type: '书籍', content: 'x'.repeat(6_000), createdAt: 1, artId: '' })),
    messages: Array.from({ length: 100 }, (_, index) => ({ id: String(index), role: 'self', text: 'x'.repeat(5_000) })),
  }
  const sanitized = sanitizeGameState(input, defaults)
  assert.equal(sanitized.knowledge.length, GAME_STATE_LIMITS.knowledge)
  assert.equal(sanitized.knowledge[0].content.length, GAME_STATE_LIMITS.knowledgeContent)
  assert.equal(sanitized.messages.length, GAME_STATE_LIMITS.messages)
  assert.equal(sanitized.messages[0].text.length, GAME_STATE_LIMITS.messageText)
})
