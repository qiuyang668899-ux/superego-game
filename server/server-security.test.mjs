import assert from 'node:assert/strict'
import test from 'node:test'
import { createSuperegoServer } from '../server.mjs'
import { DailyBudget } from './security.mjs'

async function start(options = {}) {
  const server = createSuperegoServer({
    productionMode: true,
    coach: async () => ({ reply: 'ok' }),
    budget: new DailyBudget({ limit: 1_000 }),
    ...options,
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

function coachRequest(url, options = {}) {
  return fetch(`${url}/api/coach`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://mortals.online',
      ...options.headers,
    },
    body: options.body ?? JSON.stringify({ message: 'hello' }),
  })
}

test('the same real IP receives 429 on request 31 even while XFF is rotated', async () => {
  const app = await start({ policy: { hourlyLimit: 30 } })
  try {
    const statuses = []
    for (let index = 0; index < 31; index += 1) {
      const response = await coachRequest(app.url, { headers: { 'X-Forwarded-For': `203.0.113.${index}` } })
      statuses.push(response.status)
    }
    assert.equal(statuses.slice(0, 30).every((status) => status === 200), true)
    assert.equal(statuses[30], 429)
  } finally {
    await app.close()
  }
})

test('oversized body and abnormal or missing Origin are explicitly rejected', async () => {
  const app = await start({ policy: { maxBodyBytes: 256 } })
  try {
    assert.equal((await coachRequest(app.url, { headers: { Origin: 'https://evil.example' } })).status, 403)
    assert.equal((await coachRequest(app.url, { headers: { Origin: '' } })).status, 403)
    assert.equal((await coachRequest(app.url, { body: JSON.stringify({ message: 'x'.repeat(300) }) })).status, 413)
  } finally {
    await app.close()
  }
})

test('global concurrency threshold returns 429 while an active request is held', async () => {
  let releaseCoach
  const held = new Promise((resolve) => { releaseCoach = resolve })
  const app = await start({
    coach: async () => { await held; return { reply: 'done' } },
    policy: { maxGlobalConcurrency: 1, maxIdentityConcurrency: 1 },
  })
  try {
    const first = coachRequest(app.url)
    await new Promise((resolve) => setTimeout(resolve, 25))
    const second = await coachRequest(app.url)
    assert.equal(second.status, 429)
    releaseCoach()
    assert.equal((await first).status, 200)
  } finally {
    releaseCoach()
    await app.close()
  }
})

test('daily budget threshold returns 503 before another model call', async () => {
  let calls = 0
  const app = await start({
    coach: async () => { calls += 1; return { reply: 'ok' } },
    budget: new DailyBudget({ limit: 1 }),
  })
  try {
    assert.equal((await coachRequest(app.url)).status, 200)
    assert.equal((await coachRequest(app.url)).status, 503)
    assert.equal(calls, 1)
  } finally {
    await app.close()
  }
})
