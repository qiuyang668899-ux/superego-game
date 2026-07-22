import assert from 'node:assert/strict'
import test from 'node:test'
import vercelCoach from '../api/coach.mjs'
import worker from '../worker/index.mjs'

test('the Vercel coach endpoint is explicitly closed', () => {
  const headers = new Map()
  let statusCode = 0
  let payload
  const res = {
    setHeader: (name, value) => headers.set(name, value),
    status(code) { statusCode = code; return this },
    json(body) { payload = body; return this },
  }
  vercelCoach({}, res)
  assert.equal(statusCode, 410)
  assert.equal(headers.get('X-Superego-Environment'), 'non-production-closed')
  assert.match(payload.error, /mortals\.online/)
})

test('the Worker coach endpoint is explicitly closed', async () => {
  const response = await worker.fetch(new Request('https://worker.example/api/coach'), { ASSETS: { fetch: () => new Response('asset') } })
  assert.equal(response.status, 410)
  assert.equal(response.headers.get('X-Superego-Environment'), 'non-production-closed')
})
