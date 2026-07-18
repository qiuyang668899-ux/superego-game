export default function handler(_req, res) {
  return res.status(200).json({
    ok: true,
    provider: 'deepseek',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    configured: Boolean(process.env.DEEPSEEK_API_KEY),
  })
}
