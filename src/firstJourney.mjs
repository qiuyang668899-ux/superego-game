export const FIRST_JOURNEY_STAGES = Object.freeze({
  practice: 'practice',
  tribulation: 'tribulation',
  complete: 'complete',
})

export function getFirstJourneyStage(state) {
  const cleared = Array.isArray(state?.clearedStoryChapters) ? state.clearedStoryChapters : []
  if (cleared.includes(0)) return FIRST_JOURNEY_STAGES.complete

  const quests = Array.isArray(state?.quests) ? state.quests : []
  const hasSeenHeart = quests.some((quest) => quest?.id === 'observe' && quest.completed === true)
  return hasSeenHeart ? FIRST_JOURNEY_STAGES.tribulation : FIRST_JOURNEY_STAGES.practice
}
