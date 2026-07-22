import type { GameState } from './types'

export type FirstJourneyStage = 'practice' | 'tribulation' | 'complete'

export const FIRST_JOURNEY_STAGES: Readonly<Record<FirstJourneyStage, FirstJourneyStage>>
export function getFirstJourneyStage(state: Pick<GameState, 'clearedStoryChapters' | 'quests'>): FirstJourneyStage
