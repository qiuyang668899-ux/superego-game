import assert from 'node:assert/strict'
import test from 'node:test'
import { getFirstJourneyStage } from '../src/firstJourney.mjs'

test('new player is guided through one practice before the first tribulation', () => {
  assert.equal(getFirstJourneyStage({ clearedStoryChapters: [], quests: [] }), 'practice')
  assert.equal(getFirstJourneyStage({
    clearedStoryChapters: [],
    quests: [{ id: 'observe', completed: true }],
  }), 'tribulation')
})

test('first journey completes from chapter progress without a new save field', () => {
  assert.equal(getFirstJourneyStage({
    storyIndex: 1,
    clearedStoryChapters: [0],
    quests: [{ id: 'observe', completed: false }],
  }), 'complete')
})

test('legacy and partial saves receive a safe first-journey stage', () => {
  assert.equal(getFirstJourneyStage({}), 'practice')
  assert.equal(getFirstJourneyStage({ clearedStoryChapters: [0] }), 'complete')
})
