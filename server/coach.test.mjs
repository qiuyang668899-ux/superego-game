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
  assert.equal(result.memoryNotes.length, 3)
  assert.match(result.reply, /现金流/)
  assert.equal(requestBody.model, 'deepseek-v4-pro')
  assert.deepEqual(requestBody.thinking, { type: 'enabled' })
  assert.equal(requestBody.reasoning_effort, 'high')
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

test('repairs a truncated JSON response before it reaches the user', async () => {
  let calls = 0
  const result = await createCoachReply({
    message: '结合刚才的内容给我一个办法。',
    history: [{ role: 'user', content: '我想创业，又怕失去收入。' }],
    context: { profile: { playerName: '修行者' } },
  }, {
    apiKey: 'test-only',
    fetchImpl: async () => {
      calls += 1
      const content = calls === 1
        ? '{"reply":"先保留工作，同时用'
        : JSON.stringify({ reply: '**第一步：**\n- 先保留工作，用两个周末访谈十位潜在用户，再决定是否投入。', memory_notes: [], mode: 'coach' })
      return new Response(JSON.stringify({
        choices: [{ finish_reason: calls === 1 ? 'length' : 'stop', message: { content } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
  })

  assert.equal(calls, 2)
  assert.equal(result.mode, 'coach')
  assert.match(result.reply, /十位潜在用户/)
  assert.doesNotMatch(result.reply, /\*\*/)
  assert.match(result.reply, /• 先保留工作/)
})

test('rejects an empty question before calling the model', async () => {
  await assert.rejects(
    () => createCoachReply({ message: '   ' }, { apiKey: 'test-only' }),
    (error) => error.statusCode === 400,
  )
})
