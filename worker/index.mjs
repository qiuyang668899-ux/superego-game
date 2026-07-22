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

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/coach') {
      return json({ error: '此问道入口已关闭，请使用 https://mortals.online' }, 410, {
        'X-Superego-Environment': 'non-production-closed',
      })
    }
    if (url.pathname === '/api/health') {
      return json({ ok: false, production: false, provider: 'deepseek', configured: false }, 503, {
        'X-Superego-Environment': 'non-production-closed',
      })
    }
    return env.ASSETS.fetch(request)
  },
}
