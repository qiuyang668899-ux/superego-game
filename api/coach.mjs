// The public production coach is self-hosted at mortals.online. This Vercel
// function is intentionally closed until it has the same signed proxy,
// limiter, concurrency and budget guarantees as the production entrypoint.
export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Superego-Environment', 'non-production-closed')
  return res.status(410).json({ error: '此问道入口已关闭，请使用 https://mortals.online' })
}
