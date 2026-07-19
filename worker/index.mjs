import { createCoachReply } from '../server/coach.mjs'
import { anonymousIdentity, checkCoachRateLimit } from '../db/rateLimit.mjs'

const MAX_BODY = 96 * 1024
const PUBLIC_ORIGIN = 'https://qiuyang668899-ux.github.io'
const APP_ORIGINS = new Set([PUBLIC_ORIGIN, 'https://mortals.online', 'https://www.mortals.online'])

function allowedOrigin(request, url) {
  const origin = request.headers.get('Origin')
  if (!origin) return ''
  if (origin === url.origin || APP_ORIGINS.has(origin) || /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin)) return origin
  return null
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })
}

async function readJson(request) {
  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY) {
    const error = new Error('问题和上下文太长了，请精简后再试')
    error.statusCode = 413
    throw error
  }
  return JSON.parse(raw || '{}')
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = allowedOrigin(request, url)
    const cors = origin ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      Vary: 'Origin',
    } : {}
    try {
      if (origin === null && url.pathname.startsWith('/api/')) return json({ error: '只接受来自《超我》本身的问道请求' }, 403)
      if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) return new Response(null, { status: 204, headers: cors })
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return json({
          ok: true,
          provider: 'deepseek',
          model: env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
          configured: Boolean(env.DEEPSEEK_API_KEY),
        }, 200, cors)
      }

      if (request.method === 'POST' && url.pathname === '/api/coach') {
        const identity = await anonymousIdentity(request, env.RATE_LIMIT_SALT)
        const limit = Math.max(5, Math.min(120, Number(env.COACH_RATE_LIMIT) || 30))
        const allowance = await checkCoachRateLimit(env.DB, identity, { limit })
        if (!allowance.allowed) {
          return json({ error: '这一炷香里问得有些密了，请稍后重试上一问。' }, 429, {
            'Retry-After': String(allowance.retryAfterSeconds),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            ...cors,
          })
        }

        const result = await createCoachReply(await readJson(request), {
          apiKey: env.DEEPSEEK_API_KEY,
          model: env.DEEPSEEK_MODEL,
        })
        return json(result, 200, {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(allowance.remaining),
          ...cors,
        })
      }

      return env.ASSETS.fetch(request)
    } catch (error) {
      return json({
        error: error instanceof SyntaxError ? '请求格式不正确' : error?.message || '超我暂时没有回应',
      }, Number(error?.statusCode) || 500, cors)
    }
  },
}
