import { createCoachReply } from '../server/coach.mjs'

const MAX_BODY = 96 * 1024

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
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
    try {
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return json({
          ok: true,
          provider: 'deepseek',
          model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
          configured: Boolean(env.DEEPSEEK_API_KEY),
        })
      }

      if (request.method === 'POST' && url.pathname === '/api/coach') {
        const result = await createCoachReply(await readJson(request), {
          apiKey: env.DEEPSEEK_API_KEY,
          model: env.DEEPSEEK_MODEL,
        })
        return json(result)
      }

      return env.ASSETS.fetch(request)
    } catch (error) {
      return json({
        error: error instanceof SyntaxError ? '请求格式不正确' : error?.message || '超我暂时没有回应',
      }, Number(error?.statusCode) || 500)
    }
  },
}
