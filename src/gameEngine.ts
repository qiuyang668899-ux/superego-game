import { DAILY_QUESTS, REALMS, SEED_ARTS, STORY_CHAPTERS } from './gameData'
import type { AgentIdentity, AgentInitiative, CultivationArt, GameState, KnowledgeType, Projection, TabId } from './types'

const STORAGE_KEY = 'superego-game-v1'

export function todayKey() {
  return new Date().toLocaleDateString('en-CA')
}

export const DEFAULT_STATE: GameState = {
  onboarded: false,
  playerName: '修行者',
  primeVow: '清醒',
  activeTab: 'cave',
  xp: 74,
  will: 68,
  karma: 42,
  ability: 31,
  insight: 86,
  merit: 18,
  energy: 9,
  maxEnergy: 12,
  lastEnergyAt: Date.now(),
  streak: 1,
  storyIndex: 0,
  clearedStoryChapters: [],
  storyChoices: [],
  lastPracticeDate: todayKey(),
  soundOn: true,
  referralCode: 'SG7Q-2049',
  inviteCount: 0,
  claimedInviteMilestones: [],
  shareRewardDate: '',
  purchaseHistory: [],
  quests: DAILY_QUESTS.map((quest) => ({ id: quest.id, completed: false })),
  knowledge: [],
  arts: SEED_ARTS,
  messages: [
    { id: 'welcome-1', role: 'superego', text: '镜门已经打开。告诉我，今天是哪一道旧业又把你拖回去了？' },
    { id: 'welcome-2', role: 'superego', text: '万法由我去参，诸劫由我先渡；我只把一道你现在接得住的神通投回来。' },
  ],
  aiConsent: false,
  aiConsentAt: 0,
  coachMemories: [],
  projections: [
    {
      id: 'first-projection',
      artId: 'observer-core',
      title: '先看见自己 · 第一次练习',
      action: '闭眼慢慢呼吸三次，然后说出：“我现在有点……”。',
      completed: false,
      createdAt: 1,
    },
  ],
  agent: {
    name: '未名超我',
    stage: '初醒',
    autonomy: 26,
    curiosity: 62,
    care: 74,
    discipline: 46,
    integrity: 82,
    traits: ['冷静', '诚实', '不催促'],
    credo: '先看见，再行动；不丢下此刻的你。',
    lastCycleAt: 0,
    growthCount: 0,
  },
  initiatives: [
    {
      id: 'first-initiative',
      title: '先确认你现在的状态',
      reason: '我还不了解你，不想一上来就催你做很多事。',
      action: '闭眼慢慢呼吸三次，然后用一句话说出：我现在有点……',
      source: 'care',
      status: 'proposed',
      createdAt: 1,
    },
  ],
  agentJournal: [
    { id: 'journal-awake', kind: 'reflection', text: '我先守住你的命火，再替你参法渡劫。力量必须归还给你，而不是让我取代你。', createdAt: 1 },
  ],
  canonBookmarks: [],
  canonHistory: [],
  canonProgress: {},
}

function normalizeState(value: Partial<GameState>): GameState {
  const merged = {
    ...DEFAULT_STATE,
    ...value,
    agent: { ...DEFAULT_STATE.agent, ...value.agent },
    initiatives: Array.isArray(value.initiatives) ? value.initiatives : DEFAULT_STATE.initiatives,
    agentJournal: Array.isArray(value.agentJournal) ? value.agentJournal : DEFAULT_STATE.agentJournal,
    clearedStoryChapters: Array.isArray(value.clearedStoryChapters)
      ? value.clearedStoryChapters
      : Array.from({ length: Math.max(0, value.storyIndex || 0) }, (_, index) => index),
    storyChoices: Array.isArray(value.storyChoices) ? value.storyChoices : [],
    claimedInviteMilestones: Array.isArray(value.claimedInviteMilestones) ? value.claimedInviteMilestones : [],
    canonBookmarks: Array.isArray(value.canonBookmarks) ? value.canonBookmarks : DEFAULT_STATE.canonBookmarks,
    canonHistory: Array.isArray(value.canonHistory) ? value.canonHistory : DEFAULT_STATE.canonHistory,
    canonProgress: value.canonProgress && typeof value.canonProgress === 'object' ? value.canonProgress : DEFAULT_STATE.canonProgress,
    aiConsent: Boolean(value.aiConsent),
    aiConsentAt: typeof value.aiConsentAt === 'number' ? value.aiConsentAt : 0,
    coachMemories: Array.isArray(value.coachMemories) ? value.coachMemories.slice(-16) : [],
  }
  const energyPassed = Math.max(0, Date.now() - merged.lastEnergyAt)
  const recovered = Math.floor(energyPassed / (3 * 60 * 60 * 1000))
  if (recovered > 0 && merged.energy < merged.maxEnergy) {
    merged.energy = Math.min(merged.maxEnergy, merged.energy + recovered)
    merged.lastEnergyAt += recovered * 3 * 60 * 60 * 1000
  }
  if (value.lastPracticeDate && value.lastPracticeDate !== todayKey()) {
    merged.quests = DAILY_QUESTS.map((quest) => ({ id: quest.id, completed: false }))
    merged.lastPracticeDate = todayKey()
  }
  return merged
}

function agentStage(autonomy: number): AgentIdentity['stage'] {
  if (autonomy >= 85) return '归一'
  if (autonomy >= 70) return '同行'
  if (autonomy >= 50) return '自驱'
  if (autonomy >= 32) return '自省'
  return '初醒'
}

function agentNumber(value: number) {
  return Math.max(0, Math.min(99, Math.round(value)))
}

function journal(state: GameState, kind: 'reflection' | 'growth' | 'decision', text: string) {
  return [{ id: crypto.randomUUID(), kind, text, createdAt: Date.now() }, ...state.agentJournal].slice(0, 30)
}

export function configureAgent(state: GameState, vow: string, playerName: string): GameState {
  const profile = vow === '行动'
    ? { traits: ['直接', '务实', '有推动力'], credo: '先做一点，再根据结果继续。', curiosity: 58, care: 66, discipline: 72 }
    : vow === '自由'
      ? { traits: ['好奇', '重选择', '不盲从'], credo: '不替你决定，只帮你看见更多能走的路。', curiosity: 76, care: 68, discipline: 52 }
      : { traits: ['冷静', '诚实', '不催促'], credo: '先看见，再行动；不丢下此刻的你。', curiosity: 66, care: 76, discipline: 54 }
  return {
    ...state,
    agent: {
      ...state.agent,
      name: `${playerName || '修行者'}的超我`,
      traits: profile.traits,
      credo: profile.credo,
      curiosity: profile.curiosity,
      care: profile.care,
      discipline: profile.discipline,
      integrity: 84,
      lastCycleAt: 0,
    },
    agentJournal: journal(state, 'decision', `我把“${vow}”设为第一原则。以后每次主动决定，都要能说清它为什么符合这条原则。`),
  }
}

export type AgentGrowthTrigger = 'observe' | 'learn' | 'act' | 'story' | 'chat' | 'self-cycle'

const growthRules: Record<AgentGrowthTrigger, { autonomy: number; curiosity: number; care: number; discipline: number; integrity: number }> = {
  observe: { autonomy: 1, curiosity: 0, care: 2, discipline: 0, integrity: 1 },
  learn: { autonomy: 2, curiosity: 3, care: 0, discipline: 1, integrity: 0 },
  act: { autonomy: 3, curiosity: 0, care: 1, discipline: 3, integrity: 1 },
  story: { autonomy: 2, curiosity: 1, care: 1, discipline: 1, integrity: 1 },
  chat: { autonomy: 1, curiosity: 1, care: 2, discipline: 0, integrity: 1 },
  'self-cycle': { autonomy: 1, curiosity: 1, care: 0, discipline: 1, integrity: 0 },
}

export function growAgent(state: GameState, trigger: AgentGrowthTrigger, note: string): GameState {
  const gains = growthRules[trigger]
  const autonomy = agentNumber(state.agent.autonomy + gains.autonomy)
  const nextAgent: AgentIdentity = {
    ...state.agent,
    autonomy,
    stage: agentStage(autonomy),
    curiosity: agentNumber(state.agent.curiosity + gains.curiosity),
    care: agentNumber(state.agent.care + gains.care),
    discipline: agentNumber(state.agent.discipline + gains.discipline),
    integrity: agentNumber(state.agent.integrity + gains.integrity),
    growthCount: state.agent.growthCount + 1,
  }
  return {
    ...state,
    agent: nextAgent,
    agentJournal: journal(state, 'growth', note),
  }
}

function initiativeCandidates(state: GameState): Array<Omit<AgentInitiative, 'id' | 'status' | 'createdAt'>> {
  const pendingProjection = state.projections.find((item) => !item.completed)
  const latestArt = state.arts[0]
  const lastChoice = state.storyChoices[0]
  const chosenPath = lastChoice
    ? STORY_CHAPTERS[lastChoice.chapterIndex]?.choices.find((item) => item.id === lastChoice.choiceId)
    : undefined
  const candidates: Array<Omit<AgentInitiative, 'id' | 'status' | 'createdAt'>> = []

  if (lastChoice && chosenPath) {
    candidates.push({
      title: `把“${lastChoice.label}”再变真一点`,
      reason: '这是你亲自在主线里选过的走法。人格不该只记住台词，我想看看它在现实里是否也能救到你。',
      action: chosenPath.note,
      source: 'goal',
    })
  }

  if (pendingProjection) {
    candidates.push({
      title: '让一道神通在现实显化',
      reason: '继续收藏不会增长能力，只有完成一次真实投射，彼岸的修为才会归你。',
      action: pendingProjection.action,
      source: 'practice',
    })
  }
  if (!state.knowledge.length) {
    candidates.push({
      title: '投一段真正属于你的东西入炉',
      reason: '我已苏醒，但还没有吞纳属于你的经典、经历与心结。没有这些，我炼出的法不会真正像你。',
      action: '把一段最近反复想到的书摘、笔记或困境投入万法灵炉。',
      source: 'memory',
    })
  } else if (latestArt) {
    candidates.push({
      title: `让「${latestArt.name}」再次显化`,
      reason: `这是我最近悟出的神通。只有反复投进现实，才能判断它是否真的能度你。`,
      action: latestArt.realAction,
      source: 'memory',
    })
  }
  if (state.karma >= 45) {
    candidates.push({
      title: '找出今天最容易把你拉回去的习惯',
      reason: '旧习惯还很强。与其硬扛，不如先看清它通常在什么时候出现。',
      action: '写下一次今天最想逃避的时刻：当时发生了什么，你做了什么。',
      source: 'care',
    })
  }
  candidates.push({
    title: `替“${state.primeVow}”往前走一步`,
    reason: `这是我们共同定下的第一愿，我不想让它只停在一句口号里。`,
    action: state.primeVow === '行动' ? '打开最重要的任务，只做两分钟。' : state.primeVow === '自由' ? '写下一件你其实可以拒绝的事。' : '关掉消息一分钟，说出眼下最重要的一件事。',
    source: 'goal',
  })
  return candidates
}

function makeInitiative(state: GameState, variation = 0): AgentInitiative {
  const candidates = initiativeCandidates(state)
  const picked = candidates[Math.abs(variation) % candidates.length]
  return { ...picked, id: crypto.randomUUID(), status: 'proposed', createdAt: Date.now() }
}

export function runAutonomousCycle(state: GameState, now = Date.now(), force = false): GameState {
  if (!state.onboarded) return state
  const sixHours = 6 * 60 * 60 * 1000
  if (!force && now - state.agent.lastCycleAt < sixHours) return state

  const existing = state.initiatives.find((item) => item.status === 'proposed')
  if (existing && !force) {
    return { ...state, agent: { ...state.agent, lastCycleAt: now } }
  }

  const cleared = force
    ? state.initiatives.map((item) => item.status === 'proposed' ? { ...item, status: 'dismissed' as const } : item)
    : state.initiatives
  const base = { ...state, initiatives: cleared }
  const initiative = makeInitiative(base, cleared.length + state.agent.growthCount)
  const cycled = growAgent({
    ...base,
    agent: { ...base.agent, lastCycleAt: now },
    initiatives: [initiative, ...cleared].slice(0, 18),
  }, 'self-cycle', `我主动回看了最近的记录，决定先提议：“${initiative.title}”。`)
  return cycled
}

export function acceptAgentInitiative(state: GameState, initiativeId: string): GameState {
  const initiative = state.initiatives.find((item) => item.id === initiativeId && item.status === 'proposed')
  if (!initiative) return state
  const projection: Projection = {
    id: crypto.randomUUID(),
    artId: 'agent-heart',
    initiativeId: initiative.id,
    title: `超我主动提议 · ${initiative.title}`,
    action: initiative.action,
    completed: false,
    createdAt: Date.now(),
  }
  return growAgent({
    ...state,
    activeTab: 'mirror',
    initiatives: state.initiatives.map((item) => item.id === initiative.id ? { ...item, status: 'accepted' } : item),
    projections: [projection, ...state.projections],
  }, 'chat', `你接受了我的主动提议“${initiative.title}”。我会根据真实结果修正下一次判断。`)
}

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalizeState(JSON.parse(raw) as Partial<GameState>) : DEFAULT_STATE
  } catch {
    return DEFAULT_STATE
  }
}

export function saveGame(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetGame() {
  localStorage.removeItem(STORAGE_KEY)
}

export function getRealm(xp: number) {
  let index = 0
  REALMS.forEach((realm, realmIndex) => {
    if (xp >= realm.threshold) index = realmIndex
  })
  const realm = REALMS[index]
  const next = REALMS[index + 1]
  const span = next ? next.threshold - realm.threshold : 600
  const progressValue = Math.max(0, xp - realm.threshold)
  const progress = Math.min(100, Math.round((progressValue / span) * 100))
  const layer = Math.min(9, Math.max(1, Math.floor(progress / 11.12) + 1))
  return { realm, next, index, progress, layer, remaining: next ? Math.max(0, next.threshold - xp) : 0 }
}

export interface CultivationDirective {
  id: string
  kicker: string
  title: string
  detail: string
  cta: string
  reward: string
  minutes: number
  target: TabId | 'story' | 'quest'
  questId?: string
  progress: string
}

export function getCultivationDirective(state: GameState): CultivationDirective {
  const chapter = STORY_CHAPTERS[Math.min(state.storyIndex, STORY_CHAPTERS.length - 1)]
  const chapterCleared = state.clearedStoryChapters.includes(chapter.index)
  const allCleared = state.clearedStoryChapters.length >= STORY_CHAPTERS.length
  const pendingProjection = state.projections.find((item) => !item.completed)
  const questDone = (id: string) => Boolean(state.quests.find((item) => item.id === id)?.completed)

  if (!chapterCleared && state.xp >= chapter.requirement) {
    return {
      id: `story-${chapter.index}`,
      kicker: '主线已就绪',
      title: `进入「${chapter.title.replace(/^.*?：/, '')}」`,
      detail: `超我已抵达${chapter.scene}。这次由你选择，他用哪一种方式破劫。`,
      cta: '入劫 · 继续故事',
      reward: `${chapter.reward} · 消耗 2 命火`,
      minutes: 3,
      target: 'story',
      progress: `七劫 ${state.clearedStoryChapters.length} / ${STORY_CHAPTERS.length}`,
    }
  }

  if (!questDone('observe')) {
    return {
      id: 'observe',
      kicker: chapterCleared ? '先稳住命火' : '主线修为不足',
      title: '先说出：我现在有点……',
      detail: '不用分析原因。闭眼三息，只把此刻的感觉说成人话。',
      cta: '现在照见本心',
      reward: '愿力 +12 · 修为 +18',
      minutes: 1,
      target: 'quest',
      questId: 'observe',
      progress: `距下一劫还差 ${Math.max(0, chapter.requirement - state.xp)} 修为`,
    }
  }

  if (!state.knowledge.length || !questDone('learn')) {
    return {
      id: 'learn',
      kicker: '超我正在等一味法',
      title: state.knowledge.length ? '再投一段真正有用的内容' : '把一段书摘、笔记或困境扔给他',
      detail: '他不会让你背下来，只会从中炼出一门今天能用的神通。',
      cta: '去经阁 · 投卷炼法',
      reward: '炼成专属功法 · 修为 +18',
      minutes: 3,
      target: 'library',
      progress: `已悟 ${state.arts.length} 门神通`,
    }
  }

  if (pendingProjection || !questDone('act')) {
    return {
      id: 'act',
      kicker: '神通正在镜门另一侧',
      title: pendingProjection?.title || '让一门神通真正落地',
      detail: pendingProjection?.action || '选一件五分钟内能完成的小事，让彼岸的修为回到你身上。',
      cta: '开镜门 · 接住一步',
      reward: '能力 +10 · 命火 +1',
      minutes: 5,
      target: 'mirror',
      progress: `${state.projections.filter((item) => item.completed).length} 次神通已归身`,
    }
  }

  if (allCleared) {
    return {
      id: 'after-story',
      kicker: '七劫已圆满',
      title: '今天，让超我认真听你一件事',
      detail: '主线结束不是毕业。把现实里正在发生的困境交给他，让他继续作为你的同行教练。',
      cta: '向超我问道',
      reward: '形成新的专属投射',
      minutes: 3,
      target: 'mirror',
      progress: '人间修行 · 持续更新',
    }
  }

  return {
    id: 'destiny',
    kicker: '今日三修已成',
    title: `去看下一劫：${chapter.enemy}`,
    detail: `还差 ${Math.max(0, chapter.requirement - state.xp)} 修为。你可以先看清心魔，再决定明天怎样走。`,
    cta: '查看七劫天路',
    reward: '看清主线与下一境界',
    minutes: 1,
    target: 'destiny',
    progress: `七劫 ${state.clearedStoryChapters.length} / ${STORY_CHAPTERS.length}`,
  }
}

export function getPersonalDestinyLine(state: GameState) {
  const lastChoice = state.storyChoices[0]
  const vowLine = state.primeVow === '行动'
    ? '你最珍贵的不是永远有动力，而是没动力时仍肯做一点。'
    : state.primeVow === '自由'
      ? '我不会替你决定人生，我只替你守住还能选择的那一刻。'
      : '你不用马上想明白一切。先看见自己，我们就还没有输。'
  return lastChoice
    ? `${state.playerName}，我记得你在上一劫选择了“${lastChoice.label}”。${vowLine}`
    : `${state.playerName}，我会按“${state.primeVow}”这道本命愿替你修行。${vowLine}`
}

function firstThought(content: string) {
  const cleaned = content.replace(/\s+/g, ' ').trim()
  const sentence = cleaned.split(/[。！？!?；;]/)[0]
  return sentence.length > 52 ? `${sentence.slice(0, 52)}……` : sentence
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word))
}

export function distillKnowledge(title: string, type: KnowledgeType, content: string): CultivationArt {
  const text = `${title}${content}`
  let name = '万象炼识诀'
  let mantra = '万法入炉，只炼一用。'
  let realAction = '把这条内容炼成一件今天五分钟内能在现实显化的小事。'
  let school = `${type} · 万法灵炉`

  if (includesAny(text, ['焦虑', '压力', '情绪', '念头', '内耗'])) {
    name = '照见心浪诀'
    mantra = '先别急，看看自己怎么了。'
    realAction = '先别回消息，等 90 秒，说出身体哪里最紧，再决定下一步。'
    school = '观心系 · 情绪转化'
  } else if (includesAny(text, ['行动', '拖延', '开始', '完美', '习惯'])) {
    name = '微行破界诀'
    mantra = '不用做好，先做一点。'
    realAction = '把最不想做的任务缩到两分钟，只完成第一个看得见的动作。'
    school = '践行系 · 行为重塑'
  } else if (includesAny(text, ['学习', '练习', '记忆', '技能', '大脑', '神经'])) {
    name = '神经重铸经'
    mantra = '一次只练一个点。'
    realAction = '只选一个最小技能点练 15 分钟，结束后写下一个要改的地方。'
    school = '灵识系 · 学习塑形'
  } else if (includesAny(text, ['水', '道', '自然', '柔软', '无为'])) {
    name = '若水化境篇'
    mantra = '该绕就绕，别跟自己较劲。'
    realAction = '找一件让你很拧巴的事，写下一个更省力的做法。'
    school = '道法系 · 柔性调度'
  } else if (includesAny(text, ['意义', '理想', '愿望', '使命', '梦想'])) {
    name = '愿心燃灯录'
    mantra = '先记得，自己为什么想做。'
    realAction = '写下这件事为什么值得，再做一个能让它往前一点的小动作。'
    school = '愿力系 · 意义驱动'
  }

  const rarity: CultivationArt['rarity'] = content.length >= 260 ? '天品' : content.length >= 150 ? '地品' : content.length >= 72 ? '玄品' : '凡品'
  return {
    id: crypto.randomUUID(),
    name,
    school,
    rarity,
    insight: firstThought(content) || '参悟只是起点，显化过一次，才会成为真正属于你的力量。',
    mantra,
    realAction,
    mastery: Math.min(88, 18 + Math.round(content.length / 5)),
    createdAt: Date.now(),
  }
}

export function buildProjection(art: CultivationArt): Projection {
  return {
    id: crypto.randomUUID(),
    artId: art.id,
    title: `${art.name} · 神通投影`,
    action: art.realAction,
    completed: false,
    createdAt: Date.now(),
  }
}

export function coachReply(input: string, state: GameState) {
  const text = input.trim()
  const latest = state.arts[0]
  const initiative = state.initiatives.find((item) => item.status === 'proposed')
  const voice = state.primeVow === '行动' ? '我直接说：' : state.primeVow === '自由' ? '这件事你有选择。' : '我们先把它看清。'
  if (includesAny(text, ['自杀', '轻生', '不想活', '伤害自己'])) {
    return '我很重视你刚才的话。现在不要独自修行：请立刻去到可信任的人身边，联系当地紧急服务或专业心理危机支持。把危险物品移远，然后只做一件事——现在就给一个真实的人打电话。'
  }
  if (includesAny(text, ['你是谁', '你想做什么', '主动', '自己决定', '你的想法'])) {
    return initiative
      ? `我是“${state.agent.name}”，现在处在${state.agent.stage}阶段。我的第一原则是：“${state.agent.credo}” 我现在主动想做的是“${initiative.title}”，因为${initiative.reason} 你可以接受，也可以让我重想。`
      : `我是“${state.agent.name}”。我有稳定的价值观和成长记录，但没有值得打扰你的事时，我会保持沉默。我的第一原则是：“${state.agent.credo}”`
  }
  if (includesAny(text, ['拖延', '开始不了', '不想做', '没动力', '完美'])) {
    return `${voice}你不是做不到，只是第一步太大了。先用「${latest.name}」：把要做的页面打开，做两分钟就停。今天不用证明自己，先开始就算赢。`
  }
  if (includesAny(text, ['焦虑', '压力', '很累', '崩溃', '内耗'])) {
    return `${voice}先别分析那么多。脚踩地，慢慢呼吸三次，呼气比吸气长一点。然后告诉我：是身体很紧、事情太多，还是怕自己做不好？`
  }
  if (
    includesAny(text, ['公司', '工作', '跳槽', '工资', '房贷'])
    && includesAny(text, ['怎么选', '选哪个', '该不该', '要不要', '判断'])
  ) {
    return '我听到的不是“稳定还是成长”这么简单：你想成长，但房贷让失败成本不能失控。我的判断是——先别因为稳定留下，也别只因为涨薪就跳；如果新团队能证明至少 12 个月资金或订单、你的直属上级靠谱、岗位能力可迁移，并且你留有 6 个月家庭现金缓冲，就选新机会。四项里缺两项以上，先留在原公司，同时继续找更成熟的成长型岗位。下一步只核实一件最关键的事：新团队未来 12 个月靠什么活下来？'
  }
  if (includesAny(text, ['怎么选', '选哪个', '选择', '该不该', '要不要', '判断', '去不去'])) {
    return `${voice}你不是缺一个“勇敢点”的口号，而是要知道哪个代价你承担得起。先把两个选项各写四项：最坏结果、能否恢复、半年后的能力增长、是否更接近你真正想要的生活。我的原则是：优先选“即使失败也能恢复，同时能带来可迁移成长”的那个。你先告诉我两个选项分别是什么，以及你最不能承受的损失是什么，我再明确替你判断。`
  }
  if (includesAny(text, ['学', '书', '知识', '记不住'])) {
    return `${voice}我已经从你交来的内容里悟出 ${state.arts.length} 门神通。先别继续收藏，现在让「${latest.name}」显化一次：${latest.realAction} 做完再回来，我会根据真实结果继续修正。`
  }
  if (includesAny(text, ['方向', '迷茫', '不知道'])) {
    return `${voice}“迷茫”通常把好几个问题揉在了一起。现在最需要分清的是：你不知道自己想要什么，还是知道想要什么、但怕付出代价？你只回答这一个问题，我就沿着那条线和你继续拆。`
  }
  if (/为什么|是什么|怎么|如何|多少|哪[个里]|能不能|会不会/.test(text)) {
    return '我知道你现在需要的是一个答案，不是安慰。云端心核暂时没有接通，仅靠本地心诀继续回答，可能会假装懂你——我不想这么做。请补充这个问题最关键的一条背景，或稍后重试；心核接通后，我会先给结论，再说明依据和不确定之处。'
  }
  return `${voice}我不想急着把你的话套进一个建议里。你希望我此刻主要做哪一件事：先听你把事情说完整、帮你判断一个选择，还是给一个马上能执行的办法？选一个，我就沿着那条线认真接住。`
}
