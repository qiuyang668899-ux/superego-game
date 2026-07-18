import assert from 'node:assert/strict'
import test from 'node:test'
import { anonymousIdentity, checkCoachRateLimit } from '../db/rateLimit.mjs'

class FakeD1 {
  rows = new Map()

  prepare(sql) {
    return {
      bind: (...values) => ({
        run: async () => {
          if (sql.includes('INSERT INTO coach_rate_limits')) {
            const [identity, windowStart, now] = values
            const key = `${identity}:${windowStart}`
            const previous = this.rows.get(key)?.request_count || 0
            this.rows.set(key, { request_count: previous + 1, updated_at: now })
          }
          return { success: true }
        },
        first: async () => {
          const [identity, windowStart] = values
          return this.rows.get(`${identity}:${windowStart}`) || null
        },
      }),
    }
  }
}

test('hashes the network identifier without retaining the raw address', async () => {
  const request = new Request('https://superego.test/api/coach', {
    headers: { 'CF-Connecting-IP': '203.0.113.42' },
  })
  const identity = await anonymousIdentity(request, 'test-salt')
  assert.equal(identity.length, 64)
  assert.doesNotMatch(identity, /203\.0\.113\.42/)
})

test('allows requests up to the hourly limit and rejects the next one', async () => {
  const db = new FakeD1()
  const options = { limit: 2, now: 1_800_000 }
  const first = await checkCoachRateLimit(db, 'anon', options)
  const second = await checkCoachRateLimit(db, 'anon', options)
  const third = await checkCoachRateLimit(db, 'anon', options)

  assert.deepEqual([first.allowed, second.allowed, third.allowed], [true, true, false])
  assert.equal(third.remaining, 0)
  assert.ok(third.retryAfterSeconds > 0)
})
