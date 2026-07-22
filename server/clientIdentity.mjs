import { createHash } from 'node:crypto'
import { isIP } from 'node:net'

function normalizeAddress(value) {
  const raw = String(value || '').trim()
  const normalized = raw.startsWith('::ffff:') ? raw.slice(7) : raw
  return isIP(normalized) ? normalized : ''
}

function isLoopback(value) {
  return value === '127.0.0.1' || value === '::1'
}

export function resolveClientIp(req) {
  const remote = normalizeAddress(req.socket?.remoteAddress) || 'unknown'
  // The Node process only listens on loopback. Nginx overwrites X-Real-IP with
  // its own $remote_addr value, so client-provided X-Forwarded-For is never a
  // source of identity and cannot rotate the limiter key.
  if (isLoopback(remote)) {
    const proxyValue = normalizeAddress(req.headers['x-real-ip'])
    if (proxyValue) return proxyValue
  }
  return remote
}

export function identityFingerprint(ip, salt = 'superego-rate-limit-v2') {
  return createHash('sha256').update(`${salt}|${ip}`).digest('hex')
}
