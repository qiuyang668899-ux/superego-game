import type { GameState } from './types'

export type BreakthroughAction = 'learn' | 'act' | 'observe' | 'library' | 'mirror' | 'share' | 'shop'

export interface BreakthroughRoute {
  id: 'learn' | 'act' | 'observe' | 'share'
  action: BreakthroughAction
  title: string
  label: string
  detail: string
  reward: number
  minutes: number
  ready: boolean
  status: string
  repeatable: boolean
}

export interface BreakthroughGuide {
  current: number
  requirement: number
  deficit: number
  percent: number
  routes: BreakthroughRoute[]
  recommended: Array<{ action: BreakthroughAction; label: string; reward: number }>
  projected: number
  primaryAction: BreakthroughAction
  primaryLabel: string
}

export const BREAKTHROUGH_REWARDS: Readonly<Record<'learn' | 'act' | 'observe' | 'projection' | 'share', number>>
export function getLocalDateKey(now?: Date): string
export function applySharePracticeReward(state: GameState, dateKey?: string): { state: GameState; rewarded: boolean }
export function getBreakthroughGuide(state: GameState, requirement: number, dateKey?: string): BreakthroughGuide
