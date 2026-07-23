import assert from 'node:assert/strict'
import test from 'node:test'
import { applySharePracticeReward, getBreakthroughGuide } from '../src/breakthroughRoutes.mjs'

const state = (overrides = {}) => ({
  xp: 264,
  energy: 7,
  shareRewardDate: '',
  quests: [
    { id: 'learn', completed: false },
    { id: 'act', completed: false },
    { id: 'observe', completed: false },
  ],
  projections: [],
  ...overrides,
})

test('a locked tribulation gets a concrete route that covers the exact deficit', () => {
  const guide = getBreakthroughGuide(state(), 320, '2026-07-22')
  assert.equal(guide.deficit, 56)
  assert.equal(guide.percent, 83)
  assert.deepEqual(guide.recommended.slice(0, 2).map((step) => [step.action, step.reward]), [['act', 32], ['learn', 28]])
  assert.ok(guide.projected >= guide.deficit)
})

test('completed daily tasks fall back to repeatable canon cultivation', () => {
  const guide = getBreakthroughGuide(state({
    quests: [
      { id: 'learn', completed: true },
      { id: 'act', completed: true },
      { id: 'observe', completed: true },
    ],
    shareRewardDate: '2026-07-22',
  }), 320, '2026-07-22')
  assert.equal(guide.routes.find((route) => route.id === 'learn').action, 'library')
  assert.equal(guide.routes.find((route) => route.id === 'learn').label, '再炼一卷')
  assert.deepEqual(guide.recommended.map((step) => step.action), ['library', 'library'])
  assert.deepEqual(guide.recommended.map((step) => step.label), ['再炼一卷', '万卷灵炉再炼一卷'])
  assert.equal(guide.projected, 56)
})

test('share cultivation is daily and never presented as a verified friend attribution', () => {
  const available = getBreakthroughGuide(state(), 400, '2026-07-22').routes.find((route) => route.id === 'share')
  const claimed = getBreakthroughGuide(state({ shareRewardDate: '2026-07-22' }), 400, '2026-07-22').routes.find((route) => route.id === 'share')
  assert.equal(available.ready, true)
  assert.match(available.detail, /分享|复制/)
  assert.equal(claimed.ready, false)
  assert.match(claimed.detail, /服务端核验/)
})

test('daily share cultivation rewards exactly once without counting a verified friend', () => {
  const initial = { ...state(), merit: 12 }
  const first = applySharePracticeReward(initial, '2026-07-22')
  const second = applySharePracticeReward(first.state, '2026-07-22')
  assert.equal(first.rewarded, true)
  assert.equal(first.state.xp, initial.xp + 10)
  assert.equal(first.state.merit, initial.merit + 2)
  assert.equal(second.rewarded, false)
  assert.equal(second.state.xp, first.state.xp)
  assert.equal(second.state.merit, first.state.merit)
})

test('an empty energy pool routes required repeatable cultivation through replenishment', () => {
  const guide = getBreakthroughGuide(state({
    energy: 0,
    quests: [
      { id: 'learn', completed: true },
      { id: 'act', completed: true },
      { id: 'observe', completed: true },
    ],
    shareRewardDate: '2026-07-22',
  }), 320, '2026-07-22')
  assert.equal(guide.primaryAction, 'shop')
  assert.deepEqual(guide.recommended.map((step) => [step.action, step.reward]), [
    ['shop', 0],
    ['library', 28],
    ['library', 28],
  ])
  assert.equal(guide.projected, 56)
})
