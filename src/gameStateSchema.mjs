export const GAME_STATE_LIMITS = Object.freeze({
  knowledge: 80,
  arts: 80,
  projections: 80,
  messages: 80,
  coachMemories: 40,
  initiatives: 40,
  agentJournal: 60,
  storyChoices: 108,
  knowledgeContent: 5_000,
  messageText: 4_000,
})

const tabs = new Set(['cave', 'library', 'destiny', 'mirror'])
const stages = new Set(['初醒', '自省', '自驱', '同行', '归一'])
const rarities = new Set(['凡品', '玄品', '地品', '天品'])
const knowledgeTypes = new Set(['书籍', '观点', '笔记', '经历'])
const initiativeSources = new Set(['memory', 'goal', 'care', 'practice'])
const initiativeStatuses = new Set(['proposed', 'accepted', 'completed', 'dismissed'])
const journalKinds = new Set(['reflection', 'growth', 'decision'])

function object(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function text(value, fallback = '', limit = 500) {
  return typeof value === 'string' ? value.slice(0, limit) : fallback
}

function number(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Number(value))) : fallback
}

function integer(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Math.round(number(value, fallback, min, max))
}

function strings(value, fallback = [], limit = 80, itemLimit = 160) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string').slice(0, limit).map((item) => item.slice(0, itemLimit))
    : structuredClone(fallback)
}

function integers(value, fallback = [], limit = 80, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Array.isArray(value)
    ? value.filter((item) => Number.isFinite(item)).slice(0, limit).map((item) => integer(item, 0, min, max))
    : structuredClone(fallback)
}

function records(value, limit, sanitize) {
  return Array.isArray(value) ? value.slice(0, limit).map(sanitize).filter(Boolean) : []
}

export function sanitizeGameState(value, defaults) {
  const input = object(value)
  if (!input) return null
  const recognized = ['xp', 'playerName', 'onboarded', 'quests', 'knowledge', 'arts', 'messages', 'agent'].some((key) => key in input)
  if (!recognized) return null
  const defaultAgent = defaults.agent
  const agent = object(input.agent) || {}
  const canonProgressInput = object(input.canonProgress) || {}
  const canonProgress = {}
  Object.entries(canonProgressInput).slice(0, 500).forEach(([key, progress]) => {
    if (key.length <= 120 && Number.isFinite(progress)) canonProgress[key] = integer(progress, 0, 0, 100)
  })

  return {
    onboarded: Boolean(input.onboarded),
    playerName: text(input.playerName, defaults.playerName, 40),
    primeVow: text(input.primeVow, defaults.primeVow, 40),
    activeTab: tabs.has(input.activeTab) ? input.activeTab : defaults.activeTab,
    xp: integer(input.xp, defaults.xp, 0, 10_000_000),
    will: integer(input.will, defaults.will, 0, 100),
    karma: integer(input.karma, defaults.karma, 0, 100),
    ability: integer(input.ability, defaults.ability, 0, 100),
    insight: integer(input.insight, defaults.insight, 0, 100),
    merit: integer(input.merit, defaults.merit, 0, 10_000_000),
    energy: integer(input.energy, defaults.energy, 0, 100_000),
    maxEnergy: integer(input.maxEnergy, defaults.maxEnergy, 1, 1_000),
    lastEnergyAt: integer(input.lastEnergyAt, defaults.lastEnergyAt, 0),
    streak: integer(input.streak, defaults.streak, 0, 100_000),
    storyIndex: integer(input.storyIndex, defaults.storyIndex, 0, 107),
    clearedStoryChapters: integers(input.clearedStoryChapters, defaults.clearedStoryChapters, 108, 0, 107),
    storyChoices: records(input.storyChoices, GAME_STATE_LIMITS.storyChoices, (item) => {
      const record = object(item)
      if (!record) return null
      return {
        chapterIndex: integer(record.chapterIndex, 0, 0, 107),
        choiceId: text(record.choiceId, '', 120),
        label: text(record.label, '', 160),
        createdAt: integer(record.createdAt, 0, 0),
      }
    }),
    lastPracticeDate: text(input.lastPracticeDate, defaults.lastPracticeDate, 20),
    soundOn: input.soundOn === undefined ? defaults.soundOn : Boolean(input.soundOn),
    referralCode: text(input.referralCode, defaults.referralCode, 40),
    inviteCount: integer(input.inviteCount, 0, 0, 1_000_000),
    claimedInviteMilestones: integers(input.claimedInviteMilestones, [], 10, 0, 1_000_000),
    shareRewardDate: text(input.shareRewardDate, '', 20),
    purchaseHistory: strings(input.purchaseHistory, [], 30, 160),
    quests: records(input.quests, 12, (item) => {
      const record = object(item)
      return record ? { id: text(record.id, '', 80), completed: Boolean(record.completed) } : null
    }),
    knowledge: records(input.knowledge, GAME_STATE_LIMITS.knowledge, (item) => {
      const record = object(item)
      if (!record) return null
      return {
        id: text(record.id, '', 120),
        title: text(record.title, '无题', 120),
        type: knowledgeTypes.has(record.type) ? record.type : '笔记',
        content: text(record.content, '', GAME_STATE_LIMITS.knowledgeContent),
        createdAt: integer(record.createdAt, 0, 0),
        artId: text(record.artId, '', 120),
      }
    }),
    arts: records(input.arts, GAME_STATE_LIMITS.arts, (item) => {
      const record = object(item)
      if (!record) return null
      return {
        id: text(record.id, '', 120),
        name: text(record.name, '未名神通', 120),
        school: text(record.school, '', 120),
        rarity: rarities.has(record.rarity) ? record.rarity : '凡品',
        insight: text(record.insight, '', 1_000),
        mantra: text(record.mantra, '', 500),
        realAction: text(record.realAction, '', 1_000),
        mastery: integer(record.mastery, 0, 0, 100),
        createdAt: integer(record.createdAt, 0, 0),
      }
    }),
    messages: records(input.messages, GAME_STATE_LIMITS.messages, (item) => {
      const record = object(item)
      if (!record || !['superego', 'self'].includes(record.role)) return null
      return { id: text(record.id, '', 120), role: record.role, text: text(record.text, '', GAME_STATE_LIMITS.messageText) }
    }),
    aiConsent: Boolean(input.aiConsent),
    aiConsentAt: integer(input.aiConsentAt, 0, 0),
    coachMemories: records(input.coachMemories, GAME_STATE_LIMITS.coachMemories, (item) => {
      const record = object(item)
      return record ? { id: text(record.id, '', 120), text: text(record.text, '', 1_000), createdAt: integer(record.createdAt, 0, 0) } : null
    }),
    projections: records(input.projections, GAME_STATE_LIMITS.projections, (item) => {
      const record = object(item)
      if (!record) return null
      return {
        id: text(record.id, '', 120),
        artId: text(record.artId, '', 120),
        ...(record.initiativeId ? { initiativeId: text(record.initiativeId, '', 120) } : {}),
        title: text(record.title, '', 200),
        action: text(record.action, '', 1_000),
        completed: Boolean(record.completed),
        createdAt: integer(record.createdAt, 0, 0),
      }
    }),
    agent: {
      name: text(agent.name, defaultAgent.name, 80),
      stage: stages.has(agent.stage) ? agent.stage : defaultAgent.stage,
      autonomy: integer(agent.autonomy, defaultAgent.autonomy, 0, 99),
      curiosity: integer(agent.curiosity, defaultAgent.curiosity, 0, 99),
      care: integer(agent.care, defaultAgent.care, 0, 99),
      discipline: integer(agent.discipline, defaultAgent.discipline, 0, 99),
      integrity: integer(agent.integrity, defaultAgent.integrity, 0, 99),
      traits: strings(agent.traits, defaultAgent.traits, 12, 40),
      credo: text(agent.credo, defaultAgent.credo, 500),
      lastCycleAt: integer(agent.lastCycleAt, 0, 0),
      growthCount: integer(agent.growthCount, 0, 0, 1_000_000),
    },
    initiatives: records(input.initiatives, GAME_STATE_LIMITS.initiatives, (item) => {
      const record = object(item)
      if (!record) return null
      return {
        id: text(record.id, '', 120),
        title: text(record.title, '', 200),
        reason: text(record.reason, '', 1_000),
        action: text(record.action, '', 1_000),
        source: initiativeSources.has(record.source) ? record.source : 'care',
        status: initiativeStatuses.has(record.status) ? record.status : 'dismissed',
        createdAt: integer(record.createdAt, 0, 0),
      }
    }),
    agentJournal: records(input.agentJournal, GAME_STATE_LIMITS.agentJournal, (item) => {
      const record = object(item)
      if (!record) return null
      return {
        id: text(record.id, '', 120),
        kind: journalKinds.has(record.kind) ? record.kind : 'reflection',
        text: text(record.text, '', 1_500),
        createdAt: integer(record.createdAt, 0, 0),
      }
    }),
    canonBookmarks: strings(input.canonBookmarks, defaults.canonBookmarks, 200, 120),
    canonHistory: strings(input.canonHistory, defaults.canonHistory, 100, 120),
    canonProgress,
  }
}
