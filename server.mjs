import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCoachReply } from './server/coach.mjs'
import {
  coachOriginAllowed,
  COACH_SECURITY_DEFAULTS,
  ConcurrencyLimiter,
  DailyBudget,
  FixedWindowRateLimiter,
  readJsonBody,
} from './server/security.mjs'
import { resolveClientIp, identityFingerprint } from './server/clientIdentity.mjs'
import { createFileBudgetStore } from './server/budgetStore.mjs'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const DIST = resolve(ROOT, 'dist')
const PORT = Number(process.env.PORT || 4175)
const HOST = process.env.HOST || '127.0.0.1'
const defaultProductionMode = process.env.NODE_ENV === 'production' || process.env.SUPEREGO_ENV === 'production'

const policy = {
  maxBodyBytes: Number(process.env.COACH_MAX_BODY_BYTES) || COACH_SECURITY_DEFAULTS.maxBodyBytes,
  hourlyLimit: Number(process.env.COACH_RATE_LIMIT) || COACH_SECURITY_DEFAULTS.hourlyLimit,
  maxGlobalConcurrency: Number(process.env.COACH_MAX_CONCURRENCY) || COACH_SECURITY_DEFAULTS.maxGlobalConcurrency,
  maxIdentityConcurrency: Number(process.env.COACH_MAX_IP_CONCURRENCY) || COACH_SECURITY_DEFAULTS.maxIdentityConcurrency,
  dailyBudget: Number(process.env.COACH_DAILY_BUDGET) || COACH_SECURITY_DEFAULTS.dailyBudget,
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  })
  res.end(JSON.stringify(body))
}

function logSecurity(reason, req, status, identity) {
  console.warn(JSON.stringify({
    event: 'coach_security_rejection',
    reason,
    status,
    method: req.method,
    path: req.url,
    identity,
    at: new Date().toISOString(),
  }))
}

function originGuard(req, res, { requireOrigin = false, productionMode = defaultProductionMode } = {}) {
  const origin = String(req.headers.origin || '')
  if (origin && !coachOriginAllowed(origin, { allowLocalhost: !productionMode })) {
    logSecurity('origin_rejected', req, 403, 'unknown')
    json(res, 403, { error: '只接受来自《超我》本身的问道请求' })
    return null
  }
  if (requireOrigin && !origin) {
    logSecurity('origin_missing', req, 403, 'unknown')
    json(res, 403, { error: '问道请求缺少来源校验' })
    return null
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin)
  if (origin) res.setHeader('Vary', 'Origin')
  return origin
}

async function handleCoach(req, res, coach, guards) {
  const { budget, concurrencyLimiter, policy: activePolicy, productionMode, rateLimiter } = guards
  const origin = originGuard(req, res, { requireOrigin: req.method === 'POST', productionMode })
  if (origin === null) return
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    logSecurity('content_type_rejected', req, 415, 'unknown')
    return json(res, 415, { error: '问道请求必须使用 JSON' })
  }

  let payload
  try {
    payload = await readJsonBody(req, activePolicy.maxBodyBytes)
  } catch (error) {
    logSecurity(error?.reason || (error instanceof SyntaxError ? 'invalid_json' : 'body_rejected'), req, Number(error?.statusCode) || 400, 'unknown')
    return json(res, Number(error?.statusCode) || 400, {
      error: error instanceof SyntaxError ? '请求格式不正确' : error?.message || '请求无法读取',
    })
  }

  const ip = resolveClientIp(req)
  const identity = identityFingerprint(ip, process.env.RATE_LIMIT_SALT || 'superego-rate-limit-v2')
  const allowance = rateLimiter.check(identity)
  res.setHeader('X-RateLimit-Limit', String(activePolicy.hourlyLimit))
  res.setHeader('X-RateLimit-Remaining', String(allowance.remaining))
  if (!allowance.allowed) {
    logSecurity('rate_limited', req, 429, identity)
    res.setHeader('Retry-After', String(allowance.retryAfterSeconds))
    return json(res, 429, { error: '这一炷香里问得有些密了，请稍后重试上一问。' })
  }

  const release = concurrencyLimiter.acquire(identity)
  if (!release) {
    logSecurity('concurrency_limited', req, 429, identity)
    res.setHeader('Retry-After', '5')
    return json(res, 429, { error: '镜门正在处理太多问道，请五秒后重试。' })
  }

  try {
    const budgetAllowance = await budget.consume()
    if (!budgetAllowance.allowed) {
      logSecurity('daily_budget_exhausted', req, 503, identity)
      res.setHeader('Retry-After', String(budgetAllowance.retryAfterSeconds))
      return json(res, 503, { error: '今日问道额度已用尽，明日再开镜门。' })
    }
    const result = await coach(payload, {
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL,
    })
    return json(res, 200, result)
  } finally {
    release()
  }
}

async function serveStatic(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname)
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '')
  let filePath = resolve(DIST, relativePath)
  if (filePath !== DIST && !filePath.startsWith(`${DIST}/`)) return json(res, 403, { error: 'Forbidden' })
  try {
    if (!(await stat(filePath)).isFile()) throw new Error('not a file')
  } catch {
    filePath = resolve(DIST, 'index.html')
  }
  const body = await readFile(filePath)
  res.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
    'Cache-Control': filePath.endsWith('index.html') || relativePath.startsWith('canon/') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(req.method === 'HEAD' ? undefined : body)
}

export function createSuperegoServer(options = {}) {
  const coach = options.coach || createCoachReply
  const activePolicy = { ...policy, ...options.policy }
  const activeRateLimiter = options.rateLimiter || new FixedWindowRateLimiter({
    limit: activePolicy.hourlyLimit,
    bucketTtlMs: COACH_SECURITY_DEFAULTS.bucketTtlMs,
    maxBuckets: COACH_SECURITY_DEFAULTS.maxRateBuckets,
  })
  const activeConcurrencyLimiter = options.concurrencyLimiter || new ConcurrencyLimiter({
    globalLimit: activePolicy.maxGlobalConcurrency,
    identityLimit: activePolicy.maxIdentityConcurrency,
  })
  const activeBudget = options.budget || new DailyBudget({
    limit: activePolicy.dailyBudget,
    ...createFileBudgetStore(process.env.COACH_BUDGET_FILE || '/srv/maiyi-tools/superego/shared/coach-budget.json'),
  })
  const guards = {
    budget: activeBudget,
    concurrencyLimiter: activeConcurrencyLimiter,
    policy: activePolicy,
    productionMode: options.productionMode ?? defaultProductionMode,
    rateLimiter: activeRateLimiter,
  }
  return createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/api/health') {
        return json(res, 200, {
          ok: true,
          provider: 'deepseek',
          model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
          configured: Boolean(process.env.DEEPSEEK_API_KEY),
          production: guards.productionMode,
        })
      }
      if ((req.method === 'POST' || req.method === 'OPTIONS' || req.method === 'GET') && req.url === '/api/coach') {
        return handleCoach(req, res, coach, guards)
      }
      if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res)
      return json(res, 404, { error: 'Not found' })
    } catch (error) {
      console.error('[superego]', error instanceof Error ? error.message : error)
      return json(res, Number(error?.statusCode) || 500, {
        error: error instanceof SyntaxError ? '请求格式不正确' : error?.message || '超我暂时没有回应',
      })
    }
  })
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const server = createSuperegoServer()
  server.listen(PORT, HOST, () => {
    console.log(`Superego AI is listening on http://${HOST}:${PORT}`)
    console.log(`DeepSeek core: ${process.env.DEEPSEEK_API_KEY ? 'configured' : 'missing DEEPSEEK_API_KEY'}`)
  })
}
