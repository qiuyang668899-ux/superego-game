import type { GameState } from './types'

export const GAME_STATE_LIMITS: Readonly<{
  knowledge: number
  arts: number
  projections: number
  messages: number
  coachMemories: number
  initiatives: number
  agentJournal: number
  storyChoices: number
  knowledgeContent: number
  messageText: number
}>

export function sanitizeGameState(value: unknown, defaults: GameState): GameState | null
