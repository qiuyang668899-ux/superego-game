import { getRealm } from './gameEngine'
import type { GameState } from './types'

export interface CoachResult {
  reply: string
  memoryNotes: string[]
  mode: 'answer' | 'clarify' | 'coach' | 'support'
}

export interface CoachHealth {
  ok: boolean
  configured: boolean
  provider: string
  model: string
}

const configuredBase = (import.meta.env.VITE_SUPEREGO_API_URL || '').replace(/\/$/, '')

function compactContext(state: GameState) {
  return {
    profile: {
      playerName: state.playerName,
      primeVow: state.primeVow,
      realm: getRealm(state.xp).realm.name,
      will: state.will,
      karma: state.karma,
      ability: state.ability,
      agent: {
        name: state.agent.name,
        stage: state.agent.stage,
        traits: state.agent.traits,
        credo: state.agent.credo,
      },
    },
    memories: state.coachMemories.slice(-24).map((item) => item.text),
    arts: state.arts.slice(0, 8).map((art) => ({
      name: art.name,
      insight: art.insight.slice(0, 180),
      realAction: art.realAction.slice(0, 180),
    })),
    knowledge: state.knowledge.slice(-8).map((entry) => ({
      title: entry.title,
      type: entry.type,
      content: entry.content.slice(0, 480),
    })),
    initiatives: state.initiatives.filter((item) => item.status === 'proposed').slice(0, 4).map((item) => ({
      title: item.title,
      reason: item.reason,
      action: item.action,
    })),
  }
}

export async function checkSuperegoHealth(signal?: AbortSignal): Promise<CoachHealth> {
  const response = await fetch(`${configuredBase}/api/health`, { cache: 'no-store', signal })
  if (!response.ok) throw new Error(`智能心核未连接（${response.status}）`)
  const payload = await response.json() as Partial<CoachHealth>
  return {
    ok: Boolean(payload.ok),
    configured: Boolean(payload.configured),
    provider: String(payload.provider || ''),
    model: String(payload.model || ''),
  }
}

export async function askSuperego(message: string, state: GameState, signal?: AbortSignal): Promise<CoachResult> {
  const response = await fetch(`${configuredBase}/api/coach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history: state.messages.slice(-32).map((item) => ({
        role: item.role === 'self' ? 'user' : 'assistant',
        content: item.text.slice(0, 1600),
      })),
      context: compactContext(state),
    }),
    signal,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error || `心核暂时没有回应（${response.status}）`)
  }

  const payload = await response.json() as Partial<CoachResult>
  if (!payload.reply?.trim()) throw new Error('心核返回了空白回应')
  return {
    reply: payload.reply.trim(),
    memoryNotes: Array.isArray(payload.memoryNotes)
      ? payload.memoryNotes.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
      : [],
    mode: ['answer', 'clarify', 'coach', 'support'].includes(payload.mode || '')
      ? payload.mode as CoachResult['mode']
      : 'answer',
  }
}

export function needsImmediateSupport(message: string) {
  return /自杀|轻生|不想活|活不下去|伤害自己|结束生命/.test(message)
}
