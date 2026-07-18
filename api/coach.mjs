import { createCoachReply } from '../server/coach.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const result = await createCoachReply(req.body)
    return res.status(200).json(result)
  } catch (error) {
    return res.status(Number(error?.statusCode) || 500).json({ error: error?.message || '超我暂时没有回应' })
  }
}
