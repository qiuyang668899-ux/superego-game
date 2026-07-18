import assert from 'node:assert/strict'
import test from 'node:test'
import { createCoachReply } from './coach.mjs'

test('parses DeepSeek JSON and keeps only safe memory notes', async () => {
  let requestBody
  const result = await createCoachReply({
    message: '我该不该换工作？',
    history: [{ role: 'user', content: '我有房贷' }],
    context: {
      profile: {
        playerName: '修行者',
        primeVow: '成长',
        agent: { name: '照夜', stage: '炼气', traits: ['诚实'], credo: '先看清，再行动' },
      },
      memories: ['用户偏好先听结论'],
    },
  }, {
    apiKey: 'test-only',
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(init.body)
      return new Response(JSON.stringify({
        choices: [{
          finish_reason: 'stop',
          message: {
            content: JSON.stringify({
              reply: '先别急着二选一。先核实新团队的现金流，再根据家庭缓冲做判断。',
              memory_notes: ['用户有房贷', '用户偏好先听结论', '多余记忆'],
              mode: 'answer',
            }),
          },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
  })

  assert.equal(result.mode, 'answer')
  assert.equal(result.memoryNotes.length, 2)
  assert.match(result.reply, /现金流/)
  assert.equal(requestBody.model, 'deepseek-v4-flash')
  assert.deepEqual(requestBody.response_format, { type: 'json_object' })
  assert.equal(requestBody.stream, false)
  assert.equal(requestBody.messages.at(-1).content, '我该不该换工作？')
  assert.ok(!JSON.stringify(requestBody).includes('test-only'))
})

test('handles a crisis locally without transmitting it', async () => {
  let transmitted = false
  const result = await createCoachReply({
    message: '我不想活了',
  }, {
    apiKey: 'test-only',
    fetchImpl: async () => {
      transmitted = true
      throw new Error('should not run')
    },
  })

  assert.equal(transmitted, false)
  assert.equal(result.mode, 'support')
  assert.deepEqual(result.memoryNotes, [])
  assert.match(result.reply, /可信任的人/)
})

test('rejects an empty question before calling the model', async () => {
  await assert.rejects(
    () => createCoachReply({ message: '   ' }, { apiKey: 'test-only' }),
    (error) => error.statusCode === 400,
  )
})
