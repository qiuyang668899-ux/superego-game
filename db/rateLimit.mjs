const WINDOW_MS = 60 * 60 * 1000

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export async function anonymousIdentity(request, salt = 'superego-rate-limit-v1') {
  // This legacy Worker helper is non-production. If re-enabled behind
  // Cloudflare, only Cloudflare's overwritten address header is trusted.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const data = new TextEncoder().encode(`${salt}|${ip}`)
  return hex(await crypto.subtle.digest('SHA-256', data))
}

export async function checkCoachRateLimit(db, identity, options = {}) {
  const now = Number(options.now) || Date.now()
  const limit = Math.max(1, Number(options.limit) || 30)
  const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + WINDOW_MS - now) / 1000))

  if (!db) return { allowed: true, remaining: limit - 1, retryAfterSeconds }

  await db.prepare(`
    INSERT INTO coach_rate_limits (identity, window_start, request_count, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(identity, window_start) DO UPDATE SET
      request_count = request_count + 1,
      updated_at = excluded.updated_at
  `).bind(identity, windowStart, now).run()

  const row = await db.prepare(`
    SELECT request_count
    FROM coach_rate_limits
    WHERE identity = ? AND window_start = ?
  `).bind(identity, windowStart).first()
  const count = Number(row?.request_count) || 1

  if (Math.random() < 0.02) {
    db.prepare('DELETE FROM coach_rate_limits WHERE updated_at < ?')
      .bind(now - (48 * WINDOW_MS))
      .run()
      .catch(() => {})
  }

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  }
}
