const PUBLIC_ORIGIN = 'https://qiuyang668899-ux.github.io'
const APP_ORIGINS = new Set([PUBLIC_ORIGIN, 'https://mortals.online', 'https://www.mortals.online'])

export default function handler(req, res) {
  const origin = String(req.headers.origin || '')
  if (origin && !APP_ORIGINS.has(origin) && !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  return res.status(200).json({
    ok: true,
    provider: 'deepseek',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
    configured: Boolean(process.env.DEEPSEEK_API_KEY),
  })
}
