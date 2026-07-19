import { createCoachReply } from '../server/coach.mjs'

const PUBLIC_ORIGIN = 'https://qiuyang668899-ux.github.io'
const APP_ORIGINS = new Set([PUBLIC_ORIGIN, 'https://mortals.online', 'https://www.mortals.online'])

function corsOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return ''
  if (APP_ORIGINS.has(origin) || /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin)) return origin
  return null
}

export default async function handler(req, res) {
  const allowedOrigin = corsOrigin(req)
  if (allowedOrigin === null) return res.status(403).json({ error: '只接受来自《超我》本身的问道请求' })
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const result = await createCoachReply(req.body)
    return res.status(200).json(result)
  } catch (error) {
    return res.status(Number(error?.statusCode) || 500).json({ error: error?.message || '超我暂时没有回应' })
  }
}
