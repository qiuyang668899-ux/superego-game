import assert from 'node:assert/strict'
import test from 'node:test'
import { ConcurrencyLimiter, DailyBudget, FixedWindowRateLimiter, coachOriginAllowed } from './security.mjs'
import { resolveClientIp } from './clientIdentity.mjs'

test('rate buckets expire and the map stays bounded', () => {
  const limiter = new FixedWindowRateLimiter({ limit: 2, windowMs: 1_000, bucketTtlMs: 1_000, maxBuckets: 100 })
  for (let index = 0; index < 120; index += 1) limiter.check(`ip-${index}`, 0)
  assert.equal(limiter.size, 100)
  limiter.check('fresh', 2_001)
  assert.equal(limiter.size, 1)
})

test('concurrency is bounded globally and per identity and releases cleanly', () => {
  const limiter = new ConcurrencyLimiter({ globalLimit: 2, identityLimit: 1 })
  const first = limiter.acquire('a')
  assert.equal(typeof first, 'function')
  assert.equal(limiter.acquire('a'), null)
  const second = limiter.acquire('b')
  assert.equal(typeof second, 'function')
  assert.equal(limiter.acquire('c'), null)
  first()
  second()
  assert.equal(limiter.globalActive, 0)
  assert.equal(limiter.identityActive.size, 0)
})

test('daily budget serializes concurrent consumption and rejects after its limit', async () => {
  const saved = []
  const budget = new DailyBudget({ limit: 2, load: async () => null, save: async (state) => saved.push({ ...state }) })
  const results = await Promise.all([budget.consume(1), budget.consume(1), budget.consume(1)])
  assert.deepEqual(results.map((item) => item.allowed), [true, true, false])
  assert.equal(saved.at(-1).count, 2)
})

test('production origin is exact and direct clients cannot spoof proxy identity', () => {
  assert.equal(coachOriginAllowed('https://mortals.online'), true)
  assert.equal(coachOriginAllowed('https://evil.example'), false)
  assert.equal(resolveClientIp({ socket: { remoteAddress: '203.0.113.5' }, headers: { 'x-real-ip': '198.51.100.9', 'x-forwarded-for': '192.0.2.1' } }), '203.0.113.5')
  assert.equal(resolveClientIp({ socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-real-ip': '198.51.100.9', 'x-forwarded-for': '192.0.2.1' } }), '198.51.100.9')
})
