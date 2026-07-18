export type TabId = 'cave' | 'library' | 'destiny' | 'mirror'

export type KnowledgeType = '书籍' | '观点' | '笔记' | '经历'

export interface CultivationArt {
  id: string
  name: string
  school: string
  rarity: '凡品' | '玄品' | '地品' | '天品'
  insight: string
  mantra: string
  realAction: string
  mastery: number
  createdAt: number
}

export interface KnowledgeEntry {
  id: string
  title: string
  type: KnowledgeType
  content: string
  createdAt: number
  artId: string
}

export interface QuestProgress {
  id: string
  completed: boolean
}

export interface StoryChoiceRecord {
  chapterIndex: number
  choiceId: string
  label: string
  createdAt: number
}

export interface ChatMessage {
  id: string
  role: 'superego' | 'self'
  text: string
}

export interface CoachMemory {
  id: string
  text: string
  createdAt: number
}

export interface Projection {
  id: string
  artId: string
  initiativeId?: string
  title: string
  action: string
  completed: boolean
  createdAt: number
}

export type AgentStage = '初醒' | '自省' | '自驱' | '同行' | '归一'

export interface AgentIdentity {
  name: string
  stage: AgentStage
  autonomy: number
  curiosity: number
  care: number
  discipline: number
  integrity: number
  traits: string[]
  credo: string
  lastCycleAt: number
  growthCount: number
}

export interface AgentInitiative {
  id: string
  title: string
  reason: string
  action: string
  source: 'memory' | 'goal' | 'care' | 'practice'
  status: 'proposed' | 'accepted' | 'completed' | 'dismissed'
  createdAt: number
}

export interface AgentJournalEntry {
  id: string
  kind: 'reflection' | 'growth' | 'decision'
  text: string
  createdAt: number
}

export interface GameState {
  onboarded: boolean
  playerName: string
  primeVow: string
  activeTab: TabId
  xp: number
  will: number
  karma: number
  ability: number
  insight: number
  merit: number
  energy: number
  maxEnergy: number
  lastEnergyAt: number
  streak: number
  storyIndex: number
  clearedStoryChapters: number[]
  storyChoices: StoryChoiceRecord[]
  lastPracticeDate: string
  soundOn: boolean
  referralCode: string
  inviteCount: number
  claimedInviteMilestones: number[]
  shareRewardDate: string
  purchaseHistory: string[]
  quests: QuestProgress[]
  knowledge: KnowledgeEntry[]
  arts: CultivationArt[]
  messages: ChatMessage[]
  aiConsent: boolean
  aiConsentAt: number
  coachMemories: CoachMemory[]
  projections: Projection[]
  agent: AgentIdentity
  initiatives: AgentInitiative[]
  agentJournal: AgentJournalEntry[]
  canonBookmarks: string[]
  canonHistory: string[]
  canonProgress: Record<string, number>
}

export interface Realm {
  name: string
  subtitle: string
  threshold: number
  accent: string
}
