import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCoachReply } from './server/coach.mjs'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const DIST = resolve(ROOT, 'dist')
const PORT = Number(process.env.PORT || 4175)
const HOST = process.env.HOST || '127.0.0.1'
const MAX_BODY = 96 * 1024
const RATE_LIMIT = Number(process.env.COACH_RATE_LIMIT || 40)
const rateBuckets = new Map()

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

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

function allowRequest(req) {
  const ip = req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const bucket = rateBuckets.get(ip)
  if (!bucket || now - bucket.startedAt > 60 * 60 * 1000) {
    rateBuckets.set(ip, { startedAt: now, count: 1 })
    return true
  }
  bucket.count += 1
  return bucket.count <= RATE_LIMIT
}

async function readJson(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) throw Object.assign(new Error('问题和上下文太长了，请精简后再试'), { statusCode: 413 })
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
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
    'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  res.end(req.method === 'HEAD' ? undefined : body)
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/health') {
      return json(res, 200, {
        ok: true,
        provider: 'deepseek',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        configured: Boolean(process.env.DEEPSEEK_API_KEY),
      })
    }
    if (req.method === 'POST' && req.url === '/api/coach') {
      if (!allowRequest(req)) return json(res, 429, { error: '今天问得有些密了，稍后再打开镜门。' })
      const result = await createCoachReply(await readJson(req))
      return json(res, 200, result)
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

server.listen(PORT, HOST, () => {
  console.log(`Superego AI is listening on http://${HOST}:${PORT}`)
  console.log(`DeepSeek core: ${process.env.DEEPSEEK_API_KEY ? 'configured' : 'missing DEEPSEEK_API_KEY'}`)
})
