export const COACH_SECURITY_DEFAULTS = Object.freeze({
  maxBodyBytes: 64 * 1024,
  hourlyLimit: 30,
  rateWindowMs: 60 * 60 * 1000,
  bucketTtlMs: 2 * 60 * 60 * 1000,
  maxRateBuckets: 10_000,
  maxGlobalConcurrency: 8,
  maxIdentityConcurrency: 2,
  dailyBudget: 2_000,
})

export const PRODUCTION_ORIGINS = new Set([
  'https://mortals.online',
])

export function coachOriginAllowed(origin, options = {}) {
  const value = String(origin || '')
  if (!value) return false
  const allowed = options.allowedOrigins || PRODUCTION_ORIGINS
  if (allowed.has(value)) return true
  return Boolean(options.allowLocalhost)
    && /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(value)
}

export class FixedWindowRateLimiter {
  constructor(options = {}) {
    this.limit = Math.max(1, Number(options.limit) || COACH_SECURITY_DEFAULTS.hourlyLimit)
    this.windowMs = Math.max(1_000, Number(options.windowMs) || COACH_SECURITY_DEFAULTS.rateWindowMs)
    this.bucketTtlMs = Math.max(this.windowMs, Number(options.bucketTtlMs) || COACH_SECURITY_DEFAULTS.bucketTtlMs)
    this.maxBuckets = Math.max(100, Number(options.maxBuckets) || COACH_SECURITY_DEFAULTS.maxRateBuckets)
    this.buckets = new Map()
    this.nextSweepAt = 0
  }

  check(identity, now = Date.now()) {
    this.sweep(now)
    const key = String(identity || 'unknown')
    const current = this.buckets.get(key)
    const bucket = !current || now >= current.resetAt
      ? { count: 0, resetAt: now + this.windowMs, lastSeenAt: now }
      : current
    bucket.count += 1
    bucket.lastSeenAt = now
    this.buckets.delete(key)
    this.buckets.set(key, bucket)
    this.trim()
    return {
      allowed: bucket.count <= this.limit,
      count: bucket.count,
      remaining: Math.max(0, this.limit - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  sweep(now = Date.now()) {
    if (now < this.nextSweepAt && this.buckets.size <= this.maxBuckets) return
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastSeenAt >= this.bucketTtlMs) this.buckets.delete(key)
    }
    this.nextSweepAt = now + Math.min(this.windowMs, 5 * 60 * 1000)
  }

  trim() {
    while (this.buckets.size > this.maxBuckets) {
      const oldest = this.buckets.keys().next().value
      if (oldest === undefined) break
      this.buckets.delete(oldest)
    }
  }

  get size() {
    return this.buckets.size
  }
}

export class ConcurrencyLimiter {
  constructor(options = {}) {
    this.globalLimit = Math.max(1, Number(options.globalLimit) || COACH_SECURITY_DEFAULTS.maxGlobalConcurrency)
    this.identityLimit = Math.max(1, Number(options.identityLimit) || COACH_SECURITY_DEFAULTS.maxIdentityConcurrency)
    this.globalActive = 0
    this.identityActive = new Map()
  }

  acquire(identity) {
    const key = String(identity || 'unknown')
    const active = this.identityActive.get(key) || 0
    if (this.globalActive >= this.globalLimit || active >= this.identityLimit) return null
    this.globalActive += 1
    this.identityActive.set(key, active + 1)
    let released = false
    return () => {
      if (released) return
      released = true
      this.globalActive = Math.max(0, this.globalActive - 1)
      const next = Math.max(0, (this.identityActive.get(key) || 1) - 1)
      if (next === 0) this.identityActive.delete(key)
      else this.identityActive.set(key, next)
    }
  }
}

function utcDay(now) {
  return new Date(now).toISOString().slice(0, 10)
}

export class DailyBudget {
  constructor(options = {}) {
    this.limit = Math.max(1, Number(options.limit) || COACH_SECURITY_DEFAULTS.dailyBudget)
    this.load = options.load || (async () => null)
    this.save = options.save || (async () => {})
    this.state = null
    this.queue = Promise.resolve()
  }

  consume(now = Date.now()) {
    const operation = this.queue.then(async () => {
      const day = utcDay(now)
      if (!this.state) this.state = await this.load()
      if (!this.state || this.state.day !== day) this.state = { day, count: 0 }
      if (this.state.count >= this.limit) {
        const resetAt = Date.parse(`${day}T00:00:00.000Z`) + 24 * 60 * 60 * 1000
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
        }
      }
      this.state = { day, count: this.state.count + 1 }
      await this.save(this.state)
      return {
        allowed: true,
        remaining: Math.max(0, this.limit - this.state.count),
        retryAfterSeconds: 0,
      }
    })
    this.queue = operation.catch(() => {})
    return operation
  }
}

export async function readJsonBody(req, maxBytes = COACH_SECURITY_DEFAULTS.maxBodyBytes) {
  const declared = Number(req.headers['content-length'])
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw Object.assign(new Error('问题和上下文太长了，请精简后再试'), { statusCode: 413, reason: 'body_too_large' })
  }
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) {
      throw Object.assign(new Error('问题和上下文太长了，请精简后再试'), { statusCode: 413, reason: 'body_too_large' })
    }
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}
