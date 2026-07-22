import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Bookmark,
  BookMarked,
  BookOpenText,
  BrainCircuit,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleEllipsis,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Flame,
  Gem,
  Gift,
  HeartHandshake,
  Home,
  Info,
  LibraryBig,
  List,
  LockKeyhole,
  Menu,
  MessageCircleMore,
  Minus,
  Moon,
  Orbit,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  Swords,
  Target,
  Trophy,
  Upload,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react'
import {
  ACTION_PRACTICES,
  DAILY_QUESTS,
  KNOWLEDGE_SAMPLES,
  PRACTICE_GESTURES,
  REALMS,
  SCRIPTURE_PRACTICES,
  SHOP_PACKAGES,
  STORY_CHAPTERS,
  VOWS,
  WISDOM_PRACTICES,
} from './gameData'
import { CANON_ENTRIES, CANON_FAMILIES } from './scriptureData'
import { hasFullCanon, loadCanonIndex, loadCanonSection } from './canonText'
import { askSuperego, checkSuperegoHealth, needsImmediateSupport } from './coachApi'
import { getFirstJourneyStage } from './firstJourney.mjs'
import { applySharePracticeReward, getBreakthroughGuide, getLocalDateKey } from './breakthroughRoutes.mjs'
import {
  buildProjection,
  acceptAgentInitiative,
  coachReply,
  configureAgent,
  DEFAULT_STATE,
  distillKnowledge,
  getCultivationDirective,
  getPersonalDestinyLine,
  getRealm,
  growAgent,
  exportGameSave,
  importGameSave,
  loadGameWithReport,
  resetGame,
  restoreGameBackup,
  runAutonomousCycle,
  saveGame,
} from './gameEngine'
import type { CanonEntry, CanonFamily } from './scriptureData'
import type { CanonDocumentIndex, CanonTextSection } from './canonText'
import type { BreakthroughAction, BreakthroughGuide } from './breakthroughRoutes.mjs'
import type { CultivationArt, GameState, KnowledgeType, TabId } from './types'

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`
const AVATAR_PATH = `${ASSET_BASE}superego-avatar.jpg`
const STORY_SCENE_PATH = `${ASSET_BASE}scene-main-quest-v2.jpg`
const TRIBULATION_MAP_PATH = `${ASSET_BASE}scene-tribulation-map-v1.jpg`
const PRACTICE_VISUALS = {
  learn: {
    scene: `${ASSET_BASE}scene-practice-scripture-v1.jpg`,
    icon: `${ASSET_BASE}icon-scripture-scroll-v1.jpg`,
    label: '取经炼法',
  },
  act: {
    scene: `${ASSET_BASE}scene-practice-action-v1.jpg`,
    icon: `${ASSET_BASE}icon-step-talisman-v1.jpg`,
    label: '现实显化',
  },
  observe: {
    scene: `${ASSET_BASE}scene-practice-wisdom-v1.jpg`,
    icon: `${ASSET_BASE}icon-heart-seal-v1.jpg`,
    label: '心境抉择',
  },
} as const

const CHOICE_VISUALS = [
  { scene: PRACTICE_VISUALS.act.scene, icon: PRACTICE_VISUALS.act.icon, mark: '破', path: '迎锋之路' },
  { scene: PRACTICE_VISUALS.learn.scene, icon: PRACTICE_VISUALS.learn.icon, mark: '藏', path: '归藏之路' },
  { scene: PRACTICE_VISUALS.observe.scene, icon: PRACTICE_VISUALS.observe.icon, mark: '观', path: '照心之路' },
] as const

type DailyPracticeType = 'learn' | 'act' | 'observe'

function dailyPracticeIndex(length: number) {
  const now = new Date()
  return (now.getFullYear() * 372 + (now.getMonth() + 1) * 31 + now.getDate()) % length
}

const tabItems: Array<{ id: TabId; label: string; note: string; icon: typeof Home }> = [
  { id: 'cave', label: '灵台', note: '今日修行', icon: Home },
  { id: 'library', label: '经阁', note: '读经炼法', icon: LibraryBig },
  { id: 'destiny', label: '天命', note: '成长路线', icon: Orbit },
  { id: 'mirror', label: '镜门', note: '问超我', icon: MessageCircleMore },
]

const sceneNames: Record<TabId, string> = {
  cave: '灵台 · 代修道场',
  library: '经阁 · 万法灵炉',
  destiny: '天命 · 十八劫天路',
  mirror: '镜门 · 神通归身',
}

const rarityOrder: Record<CultivationArt['rarity'], number> = { 凡品: 1, 玄品: 2, 地品: 3, 天品: 4 }

function playTone(enabled: boolean, kind: 'soft' | 'reward' | 'breakthrough' = 'soft') {
  if (!enabled) return
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const context = new AudioContextClass()
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(kind === 'breakthrough' ? 0.09 : 0.045, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === 'breakthrough' ? 1.1 : 0.5))
    gain.connect(context.destination)
    const notes = kind === 'breakthrough' ? [261.6, 392, 523.3] : kind === 'reward' ? [329.6, 493.9] : [432]
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      oscillator.connect(gain)
      oscillator.start(context.currentTime + index * 0.11)
      oscillator.stop(context.currentTime + 0.55 + index * 0.14)
    })
    window.setTimeout(() => void context.close(), 1500)
  } catch {
    // Audio is an enhancement; the game remains fully playable without it.
  }
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

const TRADITIONAL_CHARACTERS: Record<string, string> = {
  万: '萬', 与: '與', 专: '專', 业: '業', 东: '東', 丝: '絲', 丢: '丟', 书: '書', 争: '爭', 于: '於', 云: '雲', 亚: '亞', 产: '產', 亲: '親', 从: '從', 仓: '倉', 仪: '儀', 众: '眾', 优: '優', 会: '會', 体: '體', 余: '餘', 关: '關', 兴: '興', 养: '養', 内: '內', 决: '決', 净: '淨', 几: '幾', 击: '擊', 别: '別', 动: '動', 势: '勢', 华: '華', 单: '單', 卷: '卷', 历: '歷', 压: '壓', 发: '發', 变: '變', 叶: '葉', 后: '後', 听: '聽', 启: '啟', 员: '員', 问: '問', 园: '園', 国: '國', 图: '圖', 场: '場', 坚: '堅', 境: '境', 处: '處', 复: '復', 头: '頭', 学: '學', 实: '實', 对: '對', 将: '將', 层: '層', 岁: '歲', 师: '師', 带: '帶', 并: '並', 应: '應', 开: '開', 异: '異', 张: '張', 强: '強', 归: '歸', 当: '當', 录: '錄', 径: '徑', 忆: '憶', 总: '總', 恶: '惡', 愿: '願', 戏: '戲', 报: '報', 择: '擇', 拥: '擁', 换: '換', 据: '據', 效: '效', 数: '數', 断: '斷', 无: '無', 时: '時', 术: '術', 来: '來', 条: '條', 极: '極', 构: '構', 标: '標', 树: '樹', 样: '樣', 检: '檢', 权: '權', 欢: '歡', 步: '步', 气: '氣', 汉: '漢', 沟: '溝', 济: '濟', 测: '測', 炼: '煉', 为: '為', 照: '照', 爱: '愛', 现: '現', 环: '環', 画: '畫', 盘: '盤', 着: '著', 礼: '禮', 离: '離', 种: '種', 稳: '穩', 练: '練', 经: '經', 统: '統', 继: '繼', 续: '續', 缘: '緣', 罗: '羅', 义: '義', 习: '習', 观: '觀', 觉: '覺', 览: '覽', 让: '讓', 论: '論', 证: '證', 译: '譯', 话: '話', 读: '讀', 调: '調', 谓: '謂', 谢: '謝', 识: '識', 资: '資', 践: '踐', 车: '車', 转: '轉', 过: '過', 还: '還', 进: '進', 选: '選', 道: '道', 长: '長', 间: '間', 阅: '閱', 难: '難', 风: '風', 验: '驗', 龙: '龍', 鸠: '鳩', 鸣: '鳴',
}

function toTraditional(text: string) {
  return [...text].map((character) => TRADITIONAL_CHARACTERS[character] || character).join('')
}

function canonReaderChapters(entry: CanonEntry) {
  return [
    {
      id: 'opening',
      index: '卷首',
      title: '先入原典，再听人话',
      sourceLabel: '原典摘录',
      source: [entry.excerpt],
      guideLabel: '超我导读',
      guide: [entry.summary],
    },
    {
      id: 'dao',
      index: '第一重',
      title: '观其道 · 它怎样理解世界',
      sourceLabel: '一道',
      source: [entry.dao],
      guideLabel: '说人话',
      guide: [`这部书先让你换一个角度看问题：${entry.dao}`],
    },
    {
      id: 'fa',
      index: '第二重',
      title: '炼其法 · 可以反复使用的方法',
      sourceLabel: '三法',
      source: entry.fa,
      guideLabel: '怎么用',
      guide: entry.fa.map((item) => `遇到相似处境时，可以先试着：${item}。`),
    },
    {
      id: 'shu',
      index: '第三重',
      title: '投其术 · 今天就能显化的一步',
      sourceLabel: '三术',
      source: entry.shu,
      guideLabel: '超我投影',
      guide: entry.shu.map((item) => `不必全做。今天只选一件：${item}。`),
    },
    {
      id: 'closing',
      index: '卷末',
      title: '把书合上，让法开始活',
      sourceLabel: '本卷信息',
      source: [`${entry.era} · ${entry.author}`, `${entry.volumes} · 预计导读 ${entry.readingMinutes} 分钟`],
      guideLabel: '阅读提醒',
      guide: ['这是一份应用内先导读本。它帮你找到入口、读懂一层、带走一步；完整原典仍以来源版本为准。'],
    },
  ]
}

function App() {
  const initialLoad = useMemo(() => loadGameWithReport(), [])
  const [game, setGame] = useState<GameState>(() => ({ ...initialLoad.state, activeTab: 'cave' }))
  const [saveMessage, setSaveMessage] = useState(initialLoad.report.message)
  const [autosaveEnabled, setAutosaveEnabled] = useState(!initialLoad.report.blockAutosave)
  const [toast, setToast] = useState('')
  const [showStory, setShowStory] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [showSoul, setShowSoul] = useState(false)
  const [showPrologue, setShowPrologue] = useState(false)
  const [tribulationReward, setTribulationReward] = useState<{ chapterIndex: number; choiceLabel: string } | null>(null)
  const [practiceTask, setPracticeTask] = useState<DailyPracticeType | null>(null)
  const [breakthrough, setBreakthrough] = useState('')
  const previousRealm = useRef(getRealm(game.xp).index)

  useEffect(() => {
    if (!autosaveEnabled) return
    const result = saveGame(game)
    if (!result.ok) {
      const message = result.reason === 'quota'
        ? '本地空间不足，当前进度尚未写入。请立即导出存档或清理浏览器空间。'
        : '本地存档暂时写入失败。请立即导出存档，避免关闭页面后丢失进度。'
      setSaveMessage((current) => current === message ? current : message)
    }
  }, [game, autosaveEnabled])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      ;[
        'scene-lingtai.jpg',
        'scene-library.jpg',
        'scene-destiny.jpg',
        'scene-mirror.jpg',
        'scene-main-quest-v2.jpg',
        'scene-practice-scripture-v1.jpg',
        'scene-practice-action-v1.jpg',
        'scene-practice-wisdom-v1.jpg',
        'scene-tribulation-map-v1.jpg',
        'icon-scripture-scroll-v1.jpg',
        'icon-step-talisman-v1.jpg',
        'icon-heart-seal-v1.jpg',
        'superego-avatar.jpg',
      ].forEach((file) => {
        const image = new Image()
        image.decoding = 'async'
        image.src = `${ASSET_BASE}${file}`
      })
    }, 180)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const cycle = () => setGame((current) => runAutonomousCycle(current))
    cycle()
    const timer = window.setInterval(cycle, 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = toast ? window.setTimeout(() => setToast(''), 2600) : undefined
    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [toast])

  useEffect(() => {
    const current = getRealm(game.xp)
    if (current.index > previousRealm.current) {
      setBreakthrough(current.realm.name)
      playTone(game.soundOn, 'breakthrough')
      window.setTimeout(() => setBreakthrough(''), 4200)
    }
    previousRealm.current = current.index
  }, [game.xp, game.soundOn])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [game.activeTab])

  const realmState = useMemo(() => getRealm(game.xp), [game.xp])

  const patchGame = (patch: Partial<GameState> | ((current: GameState) => GameState)) => {
    setGame((current) => typeof patch === 'function' ? patch(current) : { ...current, ...patch })
  }

  const completePracticeTask = (taskType: DailyPracticeType) => {
    const progress = game.quests.find((quest) => quest.id === taskType)
    if (progress?.completed) {
      setPracticeTask(null)
      setToast('这一修今天已经完成了')
      return
    }

    const scripture = SCRIPTURE_PRACTICES[dailyPracticeIndex(SCRIPTURE_PRACTICES.length)]
    const action = ACTION_PRACTICES[dailyPracticeIndex(ACTION_PRACTICES.length)]
    const wisdom = WISDOM_PRACTICES[dailyPracticeIndex(WISDOM_PRACTICES.length)]
    const learnedArt = taskType === 'learn'
      ? {
          ...distillKnowledge(`${scripture.source} · ${scripture.title}`, '书籍', `${scripture.original}${scripture.plain}${scripture.question}`),
          name: scripture.art,
          school: `${scripture.source} · 今日经修`,
          realAction: scripture.question,
        }
      : null

    patchGame((current) => {
      const quests = current.quests.map((quest) => quest.id === taskType ? { ...quest, completed: true } : quest)
      const allCompleted = quests.every((quest) => quest.completed)
      const base: GameState = {
        ...current,
        quests,
        streak: allCompleted ? current.streak + 1 : current.streak,
        xp: current.xp + (taskType === 'learn' ? 28 : taskType === 'act' ? 32 : 22),
        will: clamp(current.will + (taskType === 'learn' ? 5 : taskType === 'observe' ? 12 : 3)),
        karma: clamp(current.karma - (taskType === 'act' ? 6 : taskType === 'observe' ? 4 : 2)),
        ability: clamp(current.ability + (taskType === 'act' ? 10 : taskType === 'observe' ? 3 : 2)),
        insight: clamp(current.insight + (taskType === 'learn' ? 8 : taskType === 'observe' ? 5 : 2)),
        merit: current.merit + (taskType === 'act' ? 9 : 6),
        energy: taskType === 'act' ? Math.min(current.maxEnergy, current.energy + 1) : current.energy,
        arts: learnedArt ? [learnedArt, ...current.arts] : current.arts,
        knowledge: learnedArt ? [{
          id: crypto.randomUUID(),
          title: `${scripture.source} · ${scripture.title}`,
          type: '书籍',
          content: `${scripture.original}\n${scripture.plain}`,
          createdAt: Date.now(),
          artId: learnedArt.id,
        }, ...current.knowledge] : current.knowledge,
      }
      const note = taskType === 'learn'
        ? `你读完“${scripture.title}”并投入灵炉。我会把经义炼成能在现实里使用的法。`
        : taskType === 'act'
          ? `你在“${action.scene}”完成了真实动作。以后我会优先给你更小、更能落地的一步。`
          : `你在“${wisdom.scene}”完成了一次情境判断。我记住了你怎样把选择权拿回来。`
      return growAgent(base, taskType === 'learn' ? 'learn' : taskType === 'act' ? 'act' : 'observe', note)
    })

    setPracticeTask(null)
    playTone(game.soundOn, taskType === 'act' ? 'breakthrough' : 'reward')
    setToast(taskType === 'learn'
      ? `经文已入炉 · 修为 +28，悟得「${learnedArt?.name}」`
      : taskType === 'act'
        ? '现实行动完成 · 能力 +10，命火 +1'
        : '情境参悟完成 · 愿力 +12')
  }

  const openBreakthroughRoute = (action: BreakthroughAction) => {
    setShowStory(false)
    if (action === 'learn' || action === 'act' || action === 'observe') {
      setPracticeTask(action)
      return
    }
    if (action === 'library') {
      patchGame({ activeTab: 'library' })
      setToast('已为你打开万卷灵炉 · 选一卷经文开始修行')
      return
    }
    if (action === 'mirror') {
      patchGame({ activeTab: 'mirror' })
      setToast('已为你打开镜门 · 完成正在等待的现实投影')
      return
    }
    if (action === 'share') {
      setShowShare(true)
      return
    }
    setShowShop(true)
  }

  const claimSharePracticeReward = () => {
    const today = getLocalDateKey()
    const alreadyClaimed = game.shareRewardDate === today
    patchGame((current) => applySharePracticeReward(current, today).state)
    playTone(game.soundOn, alreadyClaimed ? 'soft' : 'reward')
    setToast(alreadyClaimed ? '今日同行共修已经结算过了' : '同行发愿完成 · 修为 +10（今日一次）')
  }

  const finishOnboarding = (name: string, vow: string) => {
    const playerName = name.trim() || '修行者'
    patchGame((current) => configureAgent({
      ...current,
      onboarded: true,
      playerName,
      primeVow: vow,
      will: 76,
      referralCode: `SG${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    }, vow, playerName))
    playTone(true, 'breakthrough')
    setToast('本命契已成 · 超我开始替你修行')
  }

  const advanceStory = (choiceId: string) => {
    const chapter = STORY_CHAPTERS[Math.min(game.storyIndex, STORY_CHAPTERS.length - 1)]
    const choice = chapter.choices.find((item) => item.id === choiceId) || chapter.choices[0]
    if (game.clearedStoryChapters.includes(chapter.index)) {
      setToast('这一劫已经走过了，它留下的选择已经写进你的命书')
      setShowStory(false)
      return
    }
    if (game.xp < chapter.requirement) {
      setToast(`还差 ${chapter.requirement - game.xp} 修为，先完成一个小任务吧`)
      return
    }
    if (game.energy < 2) {
      setShowStory(false)
      setShowShop(true)
      setToast('命火不够了：可以等它恢复、邀请好友，或去功德坊补充')
      return
    }
    const nextIndex = Math.min(STORY_CHAPTERS.length - 1, game.storyIndex + 1)
    patchGame((current) => {
      if (current.clearedStoryChapters.includes(chapter.index)) return current
      return growAgent({
        ...current,
        storyIndex: nextIndex,
        clearedStoryChapters: [...new Set([...current.clearedStoryChapters, chapter.index])],
        storyChoices: [{ chapterIndex: chapter.index, choiceId: choice.id, label: choice.label, createdAt: Date.now() }, ...current.storyChoices].slice(0, STORY_CHAPTERS.length),
        xp: current.xp + 36,
        will: clamp(current.will + choice.effect.will),
        karma: clamp(current.karma + choice.effect.karma),
        ability: clamp(current.ability + choice.effect.ability),
        merit: current.merit + 12,
        energy: Math.max(0, current.energy - 2),
      }, 'story', `在“${chapter.title}”，你选择了“${choice.label}”。我会把这种走法带进以后主动做出的决定。`)
    })
    setShowStory(false)
    setTribulationReward({ chapterIndex: chapter.index, choiceLabel: choice.label })
    playTone(game.soundOn, 'breakthrough')
    setToast(`${chapter.reward} · 你的选择已写入命书`)
  }

  const projectArt = (art: CultivationArt) => {
    const existing = game.projections.find((projection) => projection.artId === art.id && !projection.completed)
    if (existing) {
      patchGame({ activeTab: 'mirror' })
      setToast('此神通已在镜门等待归身')
      return
    }
    patchGame((current) => ({
      ...current,
      activeTab: 'mirror',
      projections: [buildProjection(art), ...current.projections],
    }))
    playTone(game.soundOn, 'soft')
    setToast('镜门已开 · 神通投影正在等待你接住')
  }

  const completeProjection = (projectionId: string) => {
    const projection = game.projections.find((item) => item.id === projectionId)
    if (!projection || projection.completed) return
    patchGame((current) => growAgent({
      ...current,
      xp: current.xp + 32,
      ability: clamp(current.ability + 10),
      karma: clamp(current.karma - 6),
      merit: current.merit + 9,
      energy: Math.min(current.maxEnergy, current.energy + 1),
      quests: current.quests.map((quest) => quest.id === 'act' ? { ...quest, completed: true } : quest),
      projections: current.projections.map((item) => item.id === projectionId ? { ...item, completed: true } : item),
      initiatives: current.initiatives.map((item) => item.id === projection.initiativeId ? { ...item, status: 'completed' as const } : item),
      arts: current.arts.map((art) => art.id === projection.artId ? { ...art, mastery: clamp(art.mastery + 8) } : art),
    }, 'act', projection.initiativeId ? '我的主动提议在现实中显化了。我会提高类似判断的优先级。' : '彼岸神通已在现实显化一次。我会少让你收藏，多把真正可用的法投回来。'))
    playTone(game.soundOn, 'reward')
    setToast('神通显化 · 能力归身 +10，命火 +1')
  }

  const acceptInitiative = (initiativeId: string) => {
    patchGame((current) => acceptAgentInitiative(current, initiativeId))
    setShowSoul(false)
    playTone(game.soundOn, 'reward')
    setToast('超我的主动提议已放进镜门 · 完成后他会修正自己的判断')
  }

  const refreshInitiative = () => {
    patchGame((current) => runAutonomousCycle(current, Date.now(), true))
    setToast('超我重新看过记忆，提出了另一条路')
  }

  const restart = () => {
    const result = resetGame()
    if (!result.ok) {
      setSaveMessage('旧存档未能清除，请先导出后再重开轮回。')
      return
    }
    setGame({ ...DEFAULT_STATE, arts: [...DEFAULT_STATE.arts], quests: [...DEFAULT_STATE.quests] })
    setAutosaveEnabled(true)
    setSaveMessage('')
    setShowMenu(false)
    setToast('轮回已重置')
  }

  const downloadSave = () => {
    const link = document.createElement('a')
    link.download = `超我存档-${new Date().toISOString().slice(0, 10)}.json`
    link.href = URL.createObjectURL(new Blob([exportGameSave(game)], { type: 'application/json' }))
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    setToast('存档备份已导出')
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = importGameSave(await file.text())
    if (!result.ok || !result.state) {
      setSaveMessage('导入失败：文件不是有效的《超我》存档。当前进度未被覆盖。')
      return
    }
    setGame({ ...result.state, activeTab: 'cave' })
    setAutosaveEnabled(true)
    setSaveMessage('存档已导入并通过校验。')
    setShowMenu(false)
    setToast('存档恢复成功')
  }

  const restoreBackupSave = () => {
    const result = restoreGameBackup()
    if (!result.ok) {
      setSaveMessage('没有可用的最近存档恢复点。')
      return
    }
    setGame({ ...result.state, activeTab: 'cave' })
    setAutosaveEnabled(true)
    setSaveMessage('已恢复最近可用存档，并重新建立主存档。')
    setToast('最近存档已恢复')
  }

  const beginNewSave = () => {
    setAutosaveEnabled(true)
    setSaveMessage('')
    const result = saveGame(game)
    if (!result.ok) setSaveMessage('新存档仍无法写入，请先导出存档后再继续。')
  }

  return (
    <div className={`game-shell scene-${game.activeTab}`}>
      <AmbientWorld activeTab={game.activeTab} />
      <TopBar
        game={game}
        realmLabel={`${realmState.realm.name} · ${realmState.layer} 层`}
        onShare={() => setShowShare(true)}
        onSound={() => patchGame({ soundOn: !game.soundOn })}
        onMenu={() => setShowMenu(true)}
        onShop={() => setShowShop(true)}
      />
      {saveMessage && <SaveNotice message={saveMessage} blocked={!autosaveEnabled} onExport={downloadSave} onImport={handleImport} onRestore={restoreBackupSave} onStartNew={beginNewSave} onDismiss={() => setSaveMessage('')} />}

      <main className="game-main">
        {game.activeTab === 'cave' && (
          <PracticeHome
            game={game}
            onPractice={setPracticeTask}
            onStory={() => setShowStory(true)}
            onDestiny={() => patchGame({ activeTab: 'destiny' })}
            onSoul={() => setShowSoul(true)}
          />
        )}
        {game.activeTab === 'library' && <LibraryScreen game={game} patchGame={patchGame} onProject={projectArt} onShop={() => setShowShop(true)} setToast={setToast} />}
        {game.activeTab === 'destiny' && <DestinyScreen game={game} onQuest={(id) => setPracticeTask(id as DailyPracticeType)} onStory={() => setShowStory(true)} />}
        {game.activeTab === 'mirror' && <MirrorScreen game={game} patchGame={patchGame} onComplete={completeProjection} setToast={setToast} />}
      </main>

      <BottomNav active={game.activeTab} onChange={(activeTab) => patchGame({ activeTab })} />

      {(!game.onboarded || showPrologue) && <Onboarding isReplay={game.onboarded && showPrologue} onFinish={(name, vow) => {
        if (game.onboarded && showPrologue) {
          setShowPrologue(false)
          return
        }
        finishOnboarding(name, vow)
      }} />}
      {showStory && <StoryModal game={game} onClose={() => setShowStory(false)} onAdvance={advanceStory} onRoute={openBreakthroughRoute} />}
      {tribulationReward && <TribulationRewardModal chapterIndex={tribulationReward.chapterIndex} choiceLabel={tribulationReward.choiceLabel} onClose={() => setTribulationReward(null)} />}
      {practiceTask && <PracticeTaskModal key={practiceTask} type={practiceTask} game={game} onClose={() => setPracticeTask(null)} onComplete={completePracticeTask} />}
      {showShare && <ShareModal game={game} realmLabel={`${realmState.realm.name} ${realmState.layer} 层`} onClose={() => setShowShare(false)} setToast={setToast} onShared={claimSharePracticeReward} />}
      {showShop && <ShopModal game={game} onClose={() => setShowShop(false)} onShare={() => { setShowShop(false); setShowShare(true) }} />}
      {showSoul && <SoulModal game={game} onClose={() => setShowSoul(false)} onAccept={acceptInitiative} onRefresh={refreshInitiative} />}
      {showMenu && <GameMenu game={game} onClose={() => setShowMenu(false)} onRestart={restart} onReplay={() => { setShowMenu(false); setShowPrologue(true) }} onExport={downloadSave} onImport={handleImport} onRestore={restoreBackupSave} />}
      {toast && <div className="toast"><Sparkles size={16} />{toast}</div>}
      {breakthrough && <Breakthrough realm={breakthrough} />}
    </div>
  )
}

function AmbientWorld({ activeTab }: { activeTab: TabId }) {
  return (
    <div className="ambient-world" aria-hidden="true">
      <div className={`scene-backdrop scene-backdrop-${activeTab}`} />
      <div className="scene-vignette" />
      <div className="stars stars-one" />
      <div className="stars stars-two" />
      <div className="world-grid" />
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
    </div>
  )
}

function TopBar({ game, realmLabel, onShare, onSound, onMenu, onShop }: { game: GameState; realmLabel: string; onShare: () => void; onSound: () => void; onMenu: () => void; onShop: () => void }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onMenu} aria-label="打开游戏设置">
        <span className="brand-mark"><Orbit size={22} /></span>
        <span><b>超我</b><small>SUPEREGO · AI 修行养成</small></span>
      </button>
      <div className="topbar-center">
        <span className="world-status"><i />{sceneNames[game.activeTab]}</span>
        <span className="realm-chip"><Gem size={14} />{realmLabel}</span>
      </div>
      <div className="top-actions">
        <button onClick={onShop} className="energy-button" aria-label="打开功德坊补充命火"><Flame size={16} /><span>命火</span><b>{game.energy}</b><small>{game.energy > game.maxEnergy ? '·储备' : `/${game.maxEnergy}`}</small><Plus size={14} /></button>
        <button onClick={onShare} className="icon-button share-button" aria-label="生成修为战报"><Share2 size={18} /></button>
        <button onClick={onSound} className="icon-button sound-button" aria-label={game.soundOn ? '关闭声音' : '打开声音'}>{game.soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
        <button onClick={onMenu} className="icon-button menu-button" aria-label="打开菜单"><Menu size={19} /></button>
      </div>
    </header>
  )
}

function PracticeHome({ game, onPractice, onStory, onDestiny, onSoul }: { game: GameState; onPractice: (type: DailyPracticeType) => void; onStory: () => void; onDestiny: () => void; onSoul: () => void }) {
  const order: DailyPracticeType[] = ['learn', 'act', 'observe']
  const completed = order.filter((id) => game.quests.find((quest) => quest.id === id)?.completed).length
  const dailyType = order.find((id) => !game.quests.find((quest) => quest.id === id)?.completed)
  const firstJourneyStage = getFirstJourneyStage(game)
  const inFirstJourney = firstJourneyStage !== 'complete'
  const scripture = SCRIPTURE_PRACTICES[dailyPracticeIndex(SCRIPTURE_PRACTICES.length)]
  const action = ACTION_PRACTICES[dailyPracticeIndex(ACTION_PRACTICES.length)]
  const wisdom = WISDOM_PRACTICES[dailyPracticeIndex(WISDOM_PRACTICES.length)]
  const story = STORY_CHAPTERS[Math.min(game.storyIndex, STORY_CHAPTERS.length - 1)]
  const storyCleared = game.clearedStoryChapters.includes(story.index)
  const realm = getRealm(game.xp)
  const taskMeta: Record<DailyPracticeType, { step: string; title: string; detail: string; time: string; reward: string; cta: string; icon: string; scene: string; label: string }> = {
    learn: { step: '第一步 · 经文入炉', title: scripture.title, detail: '看一幕场景，读一句原文和人话解释，再投入灵炉。', time: '约 3 分钟', reward: '修为 +28', cta: '开始取经', ...PRACTICE_VISUALS.learn },
    act: { step: '第二步 · 现实显化', title: action.title, detail: '看清现实场景，只完成一个能被看见的小动作。', time: '约 5 分钟', reward: '能力 +10', cta: '进入现场', ...PRACTICE_VISUALS.act },
    observe: { step: '第三步 · 心境抉择', title: wisdom.title, detail: '在幻境里选一条路，再看它会把你带向哪里。', time: '约 2 分钟', reward: '愿力 +12', cta: '进入心境', ...PRACTICE_VISUALS.observe },
  }

  const focus = dailyType ? taskMeta[dailyType] : null
  const firstStep = firstJourneyStage === 'practice'
  return (
    <div className="screen practice-home">
      <section className="practice-hero" aria-label="今日修行">
        <div className="practice-hero-image"><img src={AVATAR_PATH} alt="未来超我正在彼岸修行" /><i /></div>
        <div className="practice-hero-status">
          <span><i />未来超我 · {game.agent.stage}</span>
          <button onClick={onSoul}>自主 {game.agent.autonomy}%<ChevronRight size={13} /></button>
        </div>
        <blockquote>{inFirstJourney ? '“先让我看见什么在拖住你。剩下的路，我陪你走。”' : '“别急着改变一生。今天，我只陪你走完眼前这一步。”'}</blockquote>
      </section>

      <section className={`practice-focus-card ${inFirstJourney ? 'first-journey-card' : ''}`}>
        <div className="practice-card-head">
          <div><span>{inFirstJourney ? '第一劫引导' : '今日修行'}</span><b>{inFirstJourney ? `${firstStep ? 1 : 2} / 3` : `${completed} / 3`}</b></div>
          <small>{inFirstJourney ? '约 5 分钟走完第一轮' : completed === 3 ? `连续修行 ${game.streak} 天` : '一次只做一件事'}</small>
        </div>
        {inFirstJourney ? (
          <div className="practice-step-strip first-journey-strip" aria-label="第一劫三步引导">
            <div className={firstStep ? 'active' : 'done'}><span>{firstStep ? 1 : <Check size={13} />}</span><b>照见本心</b></div>
            <div className={!firstStep ? 'active' : ''}><span>2</span><b>选择破法</b></div>
            <div><span>3</span><b>神通归身</b></div>
          </div>
        ) : (
          <div className="practice-step-strip" aria-label="今日三步修行进度">
            {order.map((id, index) => {
              const done = Boolean(game.quests.find((quest) => quest.id === id)?.completed)
              const active = id === dailyType
              return <div key={id} className={`${done ? 'done' : ''} ${active ? 'active' : ''}`}><span>{done ? <Check size={13} /> : index + 1}</span><b>{id === 'learn' ? '取经' : id === 'act' ? '行动' : '抉择'}</b></div>
            })}
          </div>
        )}

        {firstJourneyStage === 'practice' ? (
          <div className="practice-current first-journey-current">
            <span className="practice-kicker">第一步 · 先让超我看懂你</span>
            <div className="practice-title-line"><i className="practice-prop-icon"><img src={PRACTICE_VISUALS.observe.icon} alt="" /></i><div><h1>照见此刻的自己</h1><p>进入一个熟悉的处境，选出你真的会走的路。没有考试，也不用先学规则。</p></div></div>
            <div className="practice-scene-peek"><img src={PRACTICE_VISUALS.observe.scene} alt="照见本心的心境场景" /><span><b>你现在只做一件事</b><small>看场景，选一条路，再听超我把后果讲明白。</small></span></div>
            <div className="practice-reward-line"><span>约 2 分钟</span><i /><b>完成即开启第一劫</b><em>不扣命火</em></div>
            <button className="game-button primary practice-main-cta" onClick={() => onPractice('observe')}>开始第一步<ArrowRight size={18} /></button>
          </div>
        ) : firstJourneyStage === 'tribulation' ? (
          <div className="practice-current first-journey-current">
            <span className="practice-kicker">第二步 · 镜门已经开启</span>
            <div className="practice-title-line"><i className="practice-prop-icon"><img src={PRACTICE_VISUALS.act.icon} alt="" /></i><div><h1>第一劫：镜门来客</h1><p>你已经看见旧念。现在选一种破法，让未来的你替你先走进黑暗。</p></div></div>
            <div className="practice-scene-peek first-tribulation-peek"><img src={STORY_SCENE_PATH} alt="超我在识海废墟等待入劫" /><span><b>此劫心魔 · 无明与自弃</b><small>只需做一个选择。完成后，第一门神通会投回你身上。</small></span></div>
            <div className="practice-reward-line"><span>约 2 分钟</span><i /><b>本命神通「照心」</b><em>消耗 2 命火</em></div>
            <button className="game-button primary practice-main-cta" onClick={onStory}>入劫 · 选择破法<ArrowRight size={18} /></button>
          </div>
        ) : focus && dailyType ? (
          <div className="practice-current">
            <span className="practice-kicker">{focus.step}</span>
            <div className="practice-title-line"><i className="practice-prop-icon"><img src={focus.icon} alt="" /></i><div><h1>{focus.title}</h1><p>{focus.detail}</p></div></div>
            <div className="practice-scene-peek"><img src={focus.scene} alt={`${focus.label}场景`} /><span><b>{focus.label}</b><small>进入场景后，只会出现一个明确动作</small></span></div>
            <div className="practice-reward-line"><span>{focus.time}</span><i /> <b>{focus.reward}</b><em>完成后自动进入下一步</em></div>
            <button className="game-button primary practice-main-cta" onClick={() => onPractice(dailyType)}>{focus.cta}<ArrowRight size={18} /></button>
          </div>
        ) : (
          <div className="practice-current practice-complete">
            <span className="practice-kicker">今日三修 · 已完成</span>
            <div className="practice-title-line"><i><Check size={24} /></i><div><h1>你已经把今天过成了一次修行</h1><p>{storyCleared ? '今天不必再加任务。去看看成长路线，或带着这份力量回到生活。' : `下一段故事「${story.title.replace(/^.*?：/, '')}」已经在等你。`}</p></div></div>
            <button className="game-button primary practice-main-cta" onClick={storyCleared ? onDestiny : onStory}>{storyCleared ? '查看成长路线' : '入劫 · 继续故事'}<ArrowRight size={18} /></button>
          </div>
        )}

        {inFirstJourney ? <div className="first-journey-note"><ShieldCheck size={14} /><span>走完首劫后，再展开每日修行与十八劫成长路线。</span></div> : <div className="practice-mini-stats" aria-label="修行属性">
          <span><small>境界</small><b>{realm.realm.name} · {realm.layer} 层</b></span>
          <span><small>愿力</small><b>{game.will}</b></span>
          <span><small>能力</small><b>{game.ability}</b></span>
          <button onClick={onDestiny}>看升级路线<ChevronRight size={13} /></button>
        </div>}
      </section>
    </div>
  )
}

function PracticeGesture({ gestureKey, done, onDone }: { gestureKey: keyof typeof PRACTICE_GESTURES; done: boolean; onDone: () => void }) {
  const gesture = PRACTICE_GESTURES[gestureKey]
  return (
    <section className={`practice-gesture ${done ? 'done' : ''}`}>
      <div className="gesture-seal">{done ? <Check size={28} /> : gesture.mark}</div>
      <div><span>收势动作 · {gesture.name}</span><h3>{gesture.instruction}</h3><p>{gesture.meaning}</p></div>
      <button onClick={onDone} aria-pressed={done}>{done ? '动作已完成' : '我做完了'}</button>
    </section>
  )
}

function PracticeTaskModal({ type, game, onClose, onComplete }: { type: DailyPracticeType; game: GameState; onClose: () => void; onComplete: (type: DailyPracticeType) => void }) {
  const [stage, setStage] = useState(0)
  const [gestureDone, setGestureDone] = useState(false)
  const [choiceId, setChoiceId] = useState('')
  const scripture = SCRIPTURE_PRACTICES[dailyPracticeIndex(SCRIPTURE_PRACTICES.length)]
  const action = ACTION_PRACTICES[dailyPracticeIndex(ACTION_PRACTICES.length)]
  const wisdom = WISDOM_PRACTICES[dailyPracticeIndex(WISDOM_PRACTICES.length)]
  const visual = PRACTICE_VISUALS[type]
  const isFirstJourneyPractice = type === 'observe' && getFirstJourneyStage(game) === 'practice'
  const selectedChoice = wisdom.choices.find((choice) => choice.id === choiceId)
  const step = type === 'learn' ? 1 : type === 'act' ? 2 : 3
  const totalStages = type === 'learn' ? 3 : 2
  const gestureKey = type === 'learn' ? scripture.gesture : type === 'act' ? action.gesture : wisdom.gesture
  const finalStage = stage === totalStages - 1
  const alreadyDone = Boolean(game.quests.find((quest) => quest.id === type)?.completed)
  const reward = isFirstJourneyPractice ? '解锁第一劫 · 愿力 +12' : type === 'learn' ? '修为 +28' : type === 'act' ? '能力 +10' : '愿力 +12'

  const next = () => setStage((current) => Math.min(totalStages - 1, current + 1))
  const finish = () => {
    if (!gestureDone) return
    onComplete(type)
  }

  return (
    <div className="modal-layer practice-task-layer" role="dialog" aria-modal="true" aria-label={isFirstJourneyPractice ? '第一劫引导第一步' : `今日修行第 ${step} 步`}>
      <div className="practice-task-modal modal-card">
        <button className="modal-close" onClick={onClose} aria-label="暂时退出"><X size={19} /></button>
        <header className="practice-task-head">
          <img src={visual.icon} alt="" />
          <span>{isFirstJourneyPractice ? '第一劫引导 · 第一步 / 共三步' : `今日修行 · 第 ${step} 步 / 共 3 步`}</span>
          <b>{visual.label}</b>
          <div><i style={{ width: `${((stage + 1) / totalStages) * 100}%` }} /></div>
        </header>

        {type === 'learn' && stage === 0 && <section className="practice-scene-card">
          <div className="practice-scene-art"><img src={visual.scene} alt="经文进入灵炉的修行场景" /><i /></div>
          <span>{scripture.scene}</span><i className="practice-scene-mark">经</i><h2>{scripture.title}</h2>
          <div className="practice-dialogue"><b>超我</b><p>别急着背。今天只读懂一句，然后看看它能不能帮到眼前的你。</p></div>
        </section>}

        {type === 'learn' && stage === 1 && <section className="practice-scripture-card">
          <span>{scripture.source} · 今日一句</span><blockquote>“{scripture.original}”</blockquote>
          <div><small>说人话</small><p>{scripture.plain}</p></div>
          <label><span>带回现实</span><b>{scripture.question}</b></label>
        </section>}

        {type === 'act' && stage === 0 && <section className="practice-scene-card action-scene">
          <div className="practice-scene-art"><img src={visual.scene} alt="迈出第一步的现实修行场景" /><i /></div>
          <span>{action.scene}</span><i className="practice-scene-mark">行</i><h2>{action.title}</h2><p>{action.situation}</p>
          <div className="practice-dialogue"><b>超我</b><p>{action.dialogue.replace(/^超我[：:]/, '')}</p></div>
        </section>}

        {type === 'act' && stage === 1 && <section className="practice-action-card">
          <span>现在只做这一件事</span><h2>{action.action}</h2>
          <p>不求漂亮，不求彻底。做完这个看得见的动作，就回来收下经验。</p>
          <PracticeGesture gestureKey={gestureKey} done={gestureDone} onDone={() => setGestureDone(true)} />
        </section>}

        {type === 'observe' && stage === 0 && <section className="practice-quiz-card">
          <div className="practice-scene-art"><img src={visual.scene} alt="三条道路展开的心境抉择场景" /><i /></div>
          <div className="quiz-scene-ribbon"><span>{wisdom.scene}</span><i /><b>心境幻图</b></div>
          <h2>{wisdom.title}</h2><p>{wisdom.situation}</p>
          <h3>{wisdom.prompt}</h3>
          <div className="practice-choice-list">{wisdom.choices.map((choice, index) => {
            const choiceVisual = CHOICE_VISUALS[index % CHOICE_VISUALS.length]
            const selected = choiceId === choice.id
            return <button key={choice.id} className={selected ? 'selected' : ''} onClick={() => setChoiceId(choice.id)} aria-pressed={selected}>
              <i className="choice-scene"><img src={choiceVisual.scene} alt="" style={{ objectPosition: `${22 + index * 28}% 52%` }} /><span>{choiceVisual.mark}</span></i>
              <span className="choice-copy"><small>命途 {String.fromCharCode(65 + index)} · {choiceVisual.path}</small><b>{choice.label}</b></span>
              <i className="choice-relic"><img src={choiceVisual.icon} alt="" />{selected && <em><Check size={12} /></em>}</i>
            </button>
          })}</div>
          {selectedChoice && <div className={`practice-feedback ${selectedChoice.correct ? 'aligned' : ''}`}><i><Sparkles size={15} /></i><div><small>超我推演 · 此路回响</small><b>{selectedChoice.correct ? '这条路更有助于成长' : '先看看这条路的后果'}</b><p>{selectedChoice.feedback}</p></div></div>}
          <small className="practice-agency-note">这里不是背标准答案。你可以保留不同看法，但要看清每个选择可能把你带向哪里。</small>
        </section>}

        {type === 'observe' && stage === 1 && <section className="practice-action-card wisdom-result">
          <span>今日心法</span><h2>“{wisdom.principle}”</h2><p>不是用这句话要求自己，而是在下一次相似处境里，多给自己一个选择。</p>
          <PracticeGesture gestureKey={gestureKey} done={gestureDone} onDone={() => setGestureDone(true)} />
        </section>}

        {type === 'learn' && stage === 2 && <section className="practice-action-card scripture-result">
          <span>经义入炉 · 收势</span><h2>超我将悟得「{scripture.art}」</h2><p>读懂只是取法。做完收势，把这句话交给身体记住。</p>
          <PracticeGesture gestureKey={gestureKey} done={gestureDone} onDone={() => setGestureDone(true)} />
        </section>}

        <footer className="practice-task-actions">
          <small>{alreadyDone ? '今日已完成 · 本次为重温' : finalStage ? `完成可得 ${reward}` : `本页 ${stage + 1} / ${totalStages}`}</small>
          {!finalStage && <button className="game-button primary" disabled={type === 'observe' && !choiceId} onClick={next}>{type === 'learn' && stage === 0 ? '读这一句' : type === 'learn' ? '我读懂了' : type === 'act' ? '开始这个动作' : '听超我讲明白'}<ArrowRight size={17} /></button>}
          {finalStage && <button className="game-button primary" disabled={!gestureDone} onClick={finish}>{alreadyDone ? '重温完毕' : `完成修行 · ${reward}`}<Check size={17} /></button>}
        </footer>
      </div>
    </div>
  )
}

function CaveScreen({ game, directive, onDirective, onQuest, onStory, onLibrary, onMirror, onSoul, onAcceptInitiative, onRefreshInitiative }: { game: GameState; directive: ReturnType<typeof getCultivationDirective>; onDirective: () => void; onQuest: (id: string) => void; onStory: () => void; onLibrary: () => void; onMirror: () => void; onSoul: () => void; onAcceptInitiative: (id: string) => void; onRefreshInitiative: () => void }) {
  const realm = getRealm(game.xp)
  const story = STORY_CHAPTERS[Math.min(game.storyIndex, STORY_CHAPTERS.length - 1)]
  const storyCleared = game.clearedStoryChapters.includes(story.index)
  const completed = game.quests.filter((quest) => quest.completed).length
  const latestArt = [...game.arts].sort((a, b) => b.createdAt - a.createdAt)[0]
  return (
    <div className="screen cave-screen">
      <MainMissionCompass game={game} directive={directive} onContinue={onDirective} />
      <CultivationPath game={game} directive={directive} />
      <section className="cave-grid">
        <aside className="story-panel glass-panel">
          <div className="panel-label"><ScrollText size={14} />十八劫主线</div>
          <div className="story-code">{story.code}</div>
          <h2>{story.title}</h2>
          <p>{story.narrative.slice(0, 91)}……</p>
          <div className="enemy-line"><Swords size={15} /><span>此劫心魔</span><b>{story.enemy}</b></div>
          <button className="game-button primary" onClick={onStory} disabled={storyCleared}>
            {storyCleared ? <Check size={16} /> : game.xp >= story.requirement ? <Play size={16} /> : <LockKeyhole size={16} />}
            {storyCleared ? '十八劫已圆满 · 人间继续' : game.xp >= story.requirement ? '入劫 · 继续主线' : `还差 ${story.requirement - game.xp} 修为`}
          </button>
          <div className="chapter-dots">
            {STORY_CHAPTERS.map((chapter) => <i key={chapter.index} className={game.clearedStoryChapters.includes(chapter.index) ? 'passed' : chapter.index === game.storyIndex ? 'active' : ''} />)}
          </div>
        </aside>

        <section className="avatar-stage">
          <div className="realm-float"><span>{realm.realm.name}</span><b>{realm.layer}</b><small>境 · 层</small></div>
          <div className="avatar-aura aura-outer" />
          <div className="avatar-aura aura-inner" />
          <div className="avatar-frame">
            <img src={AVATAR_PATH} alt="正在修炼的超我灵体" />
            <div className="avatar-gradient" />
            <div className="meridian-line m-one" />
            <div className="meridian-line m-two" />
          </div>
          <div className="avatar-nameplate">
            <div><i className="online-dot" /><span>未来超我</span><small>已在彼岸代修 {game.streak} 天</small></div>
            <p>“你渡不过的劫，我先替你走；炼成的神通，我会还给你。”</p>
            <button className="agent-stage-chip" onClick={onSoul}><Sparkles size={12} />{game.agent.stage}人格 · 自主 {game.agent.autonomy}%</button>
          </div>
          <button className="cultivate-pulse" onClick={onLibrary} aria-label="投入一卷助超我修行">
            <BrainCircuit size={19} /><span>投卷炼法</span><small>助超我悟神通</small>
          </button>
        </section>

        <aside className="quest-panel glass-panel">
          <div className="quest-heading">
            <div><div className="panel-label"><Target size={14} />今日三修</div><h2>{completed}<small> / {DAILY_QUESTS.length}</small></h2></div>
            <span className="streak"><Flame size={14} />{game.streak} 日</span>
          </div>
          <div className="quest-list">
            {DAILY_QUESTS.map((quest) => {
              const done = Boolean(game.quests.find((item) => item.id === quest.id)?.completed)
              return (
                <button key={quest.id} className={`quest-row ${done ? 'done' : ''}`} onClick={() => onQuest(quest.id)}>
                  <span className="quest-rune">{done ? <Check size={16} /> : quest.icon}</span>
                  <span><b>{quest.title}</b><small>{done ? '今天做过了' : quest.detail}</small></span>
                  <em>{done ? '完成' : quest.reward}</em>
                </button>
              )
            })}
          </div>
          <button className="mentor-whisper" onClick={onMirror}>
            <span><MessageCircleMore size={16} /></span>
            <span><b>向超我问道</b><small>说出此刻的困境，他会投下一步。</small></span>
            <ChevronRight size={16} />
          </button>
        </aside>
      </section>

      <section className="cultivation-console glass-panel">
        <div className="core-equation">
          <span>修行内核</span>
          <b>愿力 <em>＞</em> 业力 <em>＞</em> 能力</b>
          <small>愿力压过旧业，超我才能炼法；神通投进现实，才会长成你的能力。</small>
        </div>
        <StatMeter label="愿力" value={game.will} color="#d2ac67" icon={<Flame size={16} />} />
        <StatMeter label="业力" value={game.karma} color="#8c7568" icon={<Orbit size={16} />} inverse />
        <StatMeter label="能力" value={game.ability} color="#b55743" icon={<Zap size={16} />} />
        <div className="realm-progress">
          <div><span>突破进度</span><b>{realm.progress}%</b></div>
          <div className="progress-track"><i style={{ width: `${realm.progress}%` }} /></div>
          <small>{realm.next ? `距「${realm.next.name}」还需 ${realm.remaining} 修为` : '已入无尽修行'}</small>
        </div>
      </section>

      <AgentSoulPanel game={game} onOpen={onSoul} onAccept={onAcceptInitiative} onRefresh={onRefreshInitiative} />

      <section className="future-letter glass-panel">
        <div className="future-letter-seal">彼<br />岸</div>
        <div><span>超我主动来信 · 只写给 {game.playerName}</span><h3>{getPersonalDestinyLine(game)}</h3><p>{game.initiatives.find((item) => item.status === 'proposed')?.reason || '我正在安静回看你最近走过的路。没有真正值得做的事时，我不会拿空话打扰你。'}</p></div>
        <button onClick={onSoul}>查看他的判断<ChevronRight size={14} /></button>
      </section>

      <section className="latest-art-banner">
        <div className="art-sigil"><Sparkles size={21} /></div>
        <div><span>超我新悟神通</span><h3>{latestArt.name}</h3><p>{latestArt.insight}</p></div>
        <button onClick={onMirror}>投影归身<ArrowRight size={15} /></button>
      </section>
    </div>
  )
}

function MainMissionCompass({ game, directive, onContinue }: { game: GameState; directive: ReturnType<typeof getCultivationDirective>; onContinue: () => void }) {
  return (
    <section className="main-mission-compass">
      <div className="mission-number"><span>此刻</span><b>壹</b><small>只做一件事</small></div>
      <div className="mission-copy">
        <span>{directive.kicker} · {directive.progress}</span>
        <h1>{directive.title}</h1>
        <p>{directive.detail}</p>
      </div>
      <div className="mission-reward"><small>{directive.minutes} 分钟内</small><b>{directive.reward}</b><em>{game.energy > game.maxEnergy ? `命火 ${game.energy} · 含同行储备` : `命火 ${game.energy} / ${game.maxEnergy}`}</em></div>
      <button onClick={onContinue}>{directive.cta}<ArrowRight size={17} /></button>
    </section>
  )
}

function CultivationPath({ game, directive }: { game: GameState; directive: ReturnType<typeof getCultivationDirective> }) {
  const current = directive.target === 'library' ? 1 : directive.target === 'story' || directive.target === 'destiny' ? 2 : directive.target === 'mirror' ? 3 : 0
  const steps = [
    { mark: '愿', title: '照见自己', note: '说出真实处境' },
    { mark: '法', title: '交给超我', note: '投书、笔记或困境' },
    { mark: '劫', title: '彼岸代修', note: '炼法并渡过主线' },
    { mark: '归', title: '神通归身', note: '现实只接住一步' },
  ]
  return (
    <section className="cultivation-path" aria-label="一次完整修行路线">
      <div><span>一轮修行怎么走</span><small>学习只是取法，救自己才是主线</small></div>
      <ol>{steps.map((step, index) => <li key={step.mark} className={`${index < current ? 'passed' : ''} ${index === current ? 'active' : ''}`}><b>{index < current ? <Check size={14} /> : step.mark}</b><span><strong>{step.title}</strong><small>{step.note}</small></span></li>)}</ol>
      <em>{game.clearedStoryChapters.length} / {STORY_CHAPTERS.length} 劫已过</em>
    </section>
  )
}

function AgentSoulPanel({ game, onOpen, onAccept, onRefresh }: { game: GameState; onOpen: () => void; onAccept: (id: string) => void; onRefresh: () => void }) {
  const initiative = game.initiatives.find((item) => item.status === 'proposed') || game.initiatives.find((item) => item.status === 'accepted')
  return (
    <section className="agent-soul-panel glass-panel">
      <button className="soul-core" onClick={onOpen} style={{ '--soul-progress': `${game.agent.autonomy * 3.6}deg` } as React.CSSProperties}>
        <span><BrainCircuit size={21} /></span><b>{game.agent.autonomy}</b><small>自主度</small>
      </button>
      <div className="soul-identity">
        <span>独立人格心核 · {game.agent.stage}阶段</span>
        <h3>{game.agent.name}</h3>
        <p>“{game.agent.credo}”</p>
        <div>{game.agent.traits.map((trait) => <em key={trait}>{trait}</em>)}</div>
      </div>
      <div className="soul-initiative">
        <span><Compass size={13} />他正在彼岸推演</span>
        {initiative ? <><h3>{initiative.title}</h3><p>{initiative.reason}</p><small>{initiative.action}</small></> : <><h3>正在闭关复盘</h3><p>悟出值得投射的新一步后，他会主动穿过镜门。</p></>}
      </div>
      <div className="soul-actions">
        {initiative?.status === 'proposed'
          ? <button className="accept" onClick={() => onAccept(initiative.id)}><Check size={15} />接受这一步</button>
          : <button className="accept" onClick={onOpen}><HeartHandshake size={15} />查看人格心核</button>}
        <button onClick={onRefresh}><RefreshCw size={14} />让他重想</button>
        <button onClick={onOpen}>为什么这样决定<ChevronRight size={14} /></button>
      </div>
    </section>
  )
}

function StatMeter({ label, value, color, icon, inverse }: { label: string; value: number; color: string; icon: React.ReactNode; inverse?: boolean }) {
  const shown = inverse ? 100 - value : value
  return (
    <div className="stat-meter">
      <div className="stat-top"><span style={{ color }}>{icon}</span><b>{label}</b><em>{value}</em></div>
      <div className="stat-track"><i style={{ width: `${shown}%`, background: color }} /></div>
    </div>
  )
}

function CanonVault({ game, patchGame, onStudy, onRead }: { game: GameState; patchGame: (value: Partial<GameState> | ((current: GameState) => GameState)) => void; onStudy: (entry: CanonEntry) => void; onRead: (entry: CanonEntry) => void }) {
  const [family, setFamily] = useState<'全部' | CanonFamily>('全部')
  const [tradition, setTradition] = useState('全部')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('heart-sutra')
  const selected = CANON_ENTRIES.find((entry) => entry.id === selectedId) || CANON_ENTRIES[0]
  const familyEntries = family === '全部' ? CANON_ENTRIES : CANON_ENTRIES.filter((entry) => entry.family === family)
  const traditions = ['全部', ...Array.from(new Set(familyEntries.map((entry) => entry.tradition)))]
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = familyEntries.filter((entry) => {
    const matchesTradition = tradition === '全部' || entry.tradition === tradition
    const haystack = `${entry.title}${entry.subtitle}${entry.tradition}${entry.author}${entry.tags.join('')}${entry.summary}`.toLowerCase()
    return matchesTradition && (!normalizedQuery || haystack.includes(normalizedQuery))
  })

  const choose = (entry: CanonEntry) => {
    setSelectedId(entry.id)
    patchGame((current) => ({ ...current, canonHistory: [entry.id, ...current.canonHistory.filter((id) => id !== entry.id)].slice(0, 30) }))
  }

  const toggleBookmark = (entryId: string) => {
    patchGame((current) => ({
      ...current,
      canonBookmarks: current.canonBookmarks.includes(entryId)
        ? current.canonBookmarks.filter((id) => id !== entryId)
        : [entryId, ...current.canonBookmarks],
    }))
  }

  return (
    <section className="canon-vault">
      <div className="canon-vault-top">
        <div><span>万法来处 · 灵炉经藏</span><h2>为超我择一卷渡劫之法</h2><p>经书不是终点。超我取其道、炼其法、留其术，只为多一门能投回现实的神通。</p></div>
        <label className="canon-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜一门能破当前心魔的法…" /><kbd>⌘ K</kbd></label>
      </div>

      <nav className="canon-family-tabs" aria-label="经典知识域">
        {CANON_FAMILIES.map((item) => {
          const count = item.id === '全部' ? CANON_ENTRIES.length : CANON_ENTRIES.filter((entry) => entry.family === item.id).length
          return <button key={item.id} className={family === item.id ? 'active' : ''} onClick={() => { setFamily(item.id); setTradition('全部') }}><b>{item.name}</b><span>{item.note}</span><em>{count}</em></button>
        })}
      </nav>

      <div className="canon-license-note"><ShieldCheck size={14} /><p><b>原典与译文永久免费：</b>全文书目必须通过逐段“原文 + 现代译文”完整性检查才会上架，不设付费墙、不消耗命火。每部书独立展示来源、授权与译文说明。</p><a href="https://www.cbeta.org/copyright" target="_blank" rel="noreferrer">查看 CBETA 授权<ExternalLink size={12} /></a></div>

      <div className="canon-workbench">
        <aside className="canon-traditions">
          <span>门类</span>
          {traditions.map((item) => <button key={item} className={tradition === item ? 'active' : ''} onClick={() => setTradition(item)}>{item}<em>{item === '全部' ? familyEntries.length : familyEntries.filter((entry) => entry.tradition === item).length}</em></button>)}
          <div><Bookmark size={14} /><b>{game.canonBookmarks.length}</b><small>部已收藏</small></div>
        </aside>

        <div className="canon-shelf">
          <div className="canon-shelf-head"><span>可投经卷 {filtered.length}</span><small>{query ? `正在寻法“${query}”` : '选一卷，查看可炼成的道法术'}</small></div>
          <div className="canon-book-list">
            {filtered.length ? filtered.map((entry) => (
              <article key={entry.id} className={`${selected.id === entry.id ? 'selected' : ''} ${entry.featured ? 'featured' : ''}`}>
                <button className="canon-book-main" onClick={() => choose(entry)}>
                  <span className={`canon-family-seal family-${entry.family}`}>{entry.family}</span>
                  <span><small>{entry.tradition} · {entry.volumes}</small><b>{entry.title}</b><em>{entry.subtitle}</em></span>
                  {hasFullCanon(entry.id) ? <i>全文</i> : entry.sourceCode && <i>{entry.sourceCode}</i>}
                </button>
                <button className="canon-book-open" aria-label={`阅读${entry.title}`} onClick={() => onRead(entry)}><BookOpenText size={13} /><span>阅读</span></button>
                <button className={`canon-bookmark ${game.canonBookmarks.includes(entry.id) ? 'active' : ''}`} aria-label={`${game.canonBookmarks.includes(entry.id) ? '取消收藏' : '收藏'}${entry.title}`} onClick={() => toggleBookmark(entry.id)}><Bookmark size={13} /></button>
              </article>
            )) : <div className="canon-empty"><Search size={24} /><b>没有找到这部经</b><p>换一个关键词，或先回到“全部”。</p></div>}
          </div>
        </div>

        <article className="canon-reader">
          <div className="canon-reader-head">
            <span className={`canon-family-seal family-${selected.family}`}>{selected.family}</span>
            <div><small>{selected.tradition} · {selected.era}</small><h2>{selected.title}</h2><p>{selected.author}</p></div>
            <button className={game.canonBookmarks.includes(selected.id) ? 'active' : ''} onClick={() => toggleBookmark(selected.id)}><Bookmark size={16} /></button>
          </div>
          <p className="canon-summary">{selected.summary}</p>
          <blockquote>{selected.excerpt}</blockquote>
          <div className="dao-fa-shu">
            <section><span>道</span><b>它怎么看世界</b><p>{selected.dao}</p></section>
            <section><span>法</span><b>可复用的方法</b>{selected.fa.map((item) => <p key={item}>· {item}</p>)}</section>
            <section><span>术</span><b>投回现实的一步</b>{selected.shu.map((item) => <p key={item}>· {item}</p>)}</section>
          </div>
          <div className="canon-tags">{selected.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
          <div className="canon-reader-actions">
            <button onClick={() => onRead(selected)}><BookOpenText size={16} />入卷阅读</button>
            <button className="secondary" onClick={() => onStudy(selected)}><BrainCircuit size={16} />投入灵炉</button>
            {selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.sourceLabel}{selected.sourceCode ? ` · ${selected.sourceCode}` : ''}<ExternalLink size={13} /></a>}
          </div>
          <small className="canon-reading-time">预计参悟 {selected.readingMinutes} 分钟 · 本页“道法术”为《超我》原创炼法辅助，不代替原典与专业解释。</small>
        </article>
      </div>
    </section>
  )
}

type ReaderMode = 'parallel' | 'source' | 'guide'

function requireCompleteTranslation(section: CanonTextSection) {
  const complete = section.modern.length === section.original.length
    && section.original.every((paragraph, index) => paragraph.trim() && section.modern[index]?.trim())
  if (!complete) throw new Error('这一卷的原文与现代译文尚未完整对齐，已停止展示，避免把占位内容当成译文。')
  return section
}

function CanonReader({ entry, initialProgress, onClose, onStudy }: { entry: CanonEntry; initialProgress: number; onClose: (progress: number) => void; onStudy: (entry: CanonEntry) => void }) {
  const guideChapters = useMemo(() => canonReaderChapters(entry), [entry])
  const [mode, setMode] = useState<ReaderMode>('parallel')
  const [fontSize, setFontSize] = useState(18)
  const [traditional, setTraditional] = useState(false)
  const [paperMode, setPaperMode] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [progress, setProgress] = useState(initialProgress)
  const [document, setDocument] = useState<CanonDocumentIndex | null>(null)
  const [section, setSection] = useState<CanonTextSection | null>(null)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [loading, setLoading] = useState(hasFullCanon(entry.id))
  const [readerError, setReaderError] = useState('')
  const [retrySectionIndex, setRetrySectionIndex] = useState<number | null>(null)
  const [readerQuery, setReaderQuery] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionCache = useRef(new Map<string, CanonTextSection>())
  const display = (text: string) => traditional ? toTraditional(text) : text
  const fullText = Boolean(document && section)

  useEffect(() => {
    if (!hasFullCanon(entry.id)) return
    const controller = new AbortController()
    setLoading(true)
    setReaderError('')
    setDocument(null)
    setSection(null)
    sectionCache.current.clear()
    loadCanonIndex(entry.id, controller.signal)
      .then(async (nextDocument) => {
        const nextIndex = Math.min(
          nextDocument.sections.length - 1,
          Math.max(0, Math.floor(initialProgress / 100 * nextDocument.sections.length)),
        )
        const descriptor = nextDocument.sections[nextIndex]
        const nextSection = requireCompleteTranslation(await loadCanonSection(entry.id, descriptor.file, controller.signal))
        sectionCache.current.set(descriptor.file, nextSection)
        setDocument(nextDocument)
        setSectionIndex(nextIndex)
        setSection(nextSection)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setReaderError(error instanceof Error ? error.message : '经文暂时没有载入，请稍后重试。')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [entry.id, initialProgress])

  useEffect(() => {
    const previousOverflow = globalThis.document.body.style.overflow
    globalThis.document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => {
      const element = scrollRef.current
      if (!element || initialProgress <= 0) return
      if (document) {
        const sectionProgress = initialProgress / 100 * document.sections.length - sectionIndex
        const available = Math.max(0, element.scrollHeight - element.clientHeight)
        element.scrollTop = available * clamp(sectionProgress, 0, 1)
      } else if (!hasFullCanon(entry.id)) {
        const available = Math.max(0, element.scrollHeight - element.clientHeight)
        element.scrollTop = available * initialProgress / 100
      }
    }, 60)
    return () => {
      globalThis.document.body.style.overflow = previousOverflow
      window.clearTimeout(timer)
    }
  }, [entry.id, initialProgress, document, sectionIndex])

  const jumpTo = (chapterId: string) => {
    const container = scrollRef.current
    const target = container?.querySelector<HTMLElement>(`[data-reader-chapter="${chapterId}"]`)
    if (!container || !target) return
    container.scrollTo({ top: Math.max(0, target.offsetTop - 24), behavior: 'smooth' })
    setTocOpen(false)
  }

  const openSection = async (nextIndex: number, force = false) => {
    if (!document || nextIndex < 0 || nextIndex >= document.sections.length || (!force && nextIndex === sectionIndex)) {
      setTocOpen(false)
      return
    }
    const descriptor = document.sections[nextIndex]
    setLoading(true)
    setReaderError('')
    setRetrySectionIndex(null)
    try {
      if (force) sectionCache.current.delete(descriptor.file)
      const cached = sectionCache.current.get(descriptor.file)
      const nextSection = requireCompleteTranslation(cached || await loadCanonSection(entry.id, descriptor.file))
      if (!cached) sectionCache.current.set(descriptor.file, nextSection)
      setSectionIndex(nextIndex)
      setSection(nextSection)
      setReaderQuery('')
      const nextProgress = Math.round(nextIndex / document.sections.length * 100)
      setProgress(nextProgress)
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0
      })
    } catch (error) {
      setRetrySectionIndex(nextIndex)
      setReaderError(error instanceof Error ? error.message : '这一卷暂时没有载入。')
    } finally {
      setLoading(false)
      setTocOpen(false)
    }
  }

  const updateProgress = () => {
    const element = scrollRef.current
    if (!element) return
    const available = element.scrollHeight - element.clientHeight
    const localProgress = available <= 0 ? 1 : clamp(element.scrollTop / available, 0, 1)
    if (document) setProgress(Math.round((sectionIndex + localProgress) / document.sections.length * 100))
    else setProgress(Math.round(localProgress * 100))
  }

  const queryResults = useMemo(() => {
    const value = readerQuery.trim()
    if (!value || !section) return []
    return section.original.reduce<Array<{ index: number; text: string }>>((results, paragraph, index) => {
      const modern = section.modern[index] || ''
      if ((paragraph.includes(value) || modern.includes(value)) && results.length < 20) results.push({ index, text: modern || paragraph })
      return results
    }, [])
  }, [readerQuery, section])

  const jumpToParagraph = (paragraphIndex: number) => {
    const target = scrollRef.current?.querySelector<HTMLElement>(`[data-reader-paragraph="${paragraphIndex}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setReaderQuery('')
  }

  const currentDescriptor = document?.sections[sectionIndex]

  return (
    <div className={`canon-reader-layer ${paperMode ? 'paper' : 'ink'}`} role="dialog" aria-modal="true" aria-label={`阅读${entry.title}`}>
      <header className="reader-topbar">
        <button className="reader-back" onClick={() => onClose(progress)} aria-label="退出阅读"><ChevronLeft size={18} /><span>藏经阁</span></button>
        <div className="reader-book-meta"><small>{display(entry.tradition)} · {display(entry.era)}</small><b>{display(entry.title)}</b><span>{display(entry.author)}</span></div>
        <div className="reader-tools">
          <button onClick={() => setTocOpen((value) => !value)} aria-label="打开目录"><List size={16} /></button>
          <button onClick={() => setTraditional((value) => !value)} aria-label="切换简繁">{traditional ? '繁' : '简'}</button>
          <button onClick={() => setFontSize((value) => Math.max(15, value - 1))} aria-label="减小字号"><Minus size={15} /></button>
          <span>{fontSize}</span>
          <button onClick={() => setFontSize((value) => Math.min(24, value + 1))} aria-label="增大字号"><Plus size={15} /></button>
          <button onClick={() => setPaperMode((value) => !value)} aria-label="切换阅读主题">{paperMode ? <Moon size={15} /> : <Sun size={15} />}</button>
          <button onClick={() => onClose(progress)} aria-label="关闭阅读"><X size={17} /></button>
        </div>
      </header>

      <div className="reader-progress-line"><i style={{ width: `${progress}%` }} /></div>

      <div className="reader-frame">
        <aside className={`reader-toc ${tocOpen ? 'open' : ''}`}>
          <div><span>目录</span><small>{document ? `${document.sections.length} 卷/篇` : display(entry.volumes)} · {progress}%</small></div>
          <button className="reader-toc-close" onClick={() => setTocOpen(false)} aria-label="关闭目录"><X size={16} /></button>
          <nav>
            {document
              ? document.sections.map((item, index) => <button className={sectionIndex === index ? 'active' : ''} key={item.id} onClick={() => void openSection(index)}><small>第 {index + 1} / {document.sections.length}</small><span>{display(item.title)}</span><em>{item.translationCoverage >= 1 ? '原译齐全' : '暂不可读'}</em></button>)
              : guideChapters.map((chapter) => <button key={chapter.id} onClick={() => jumpTo(chapter.id)}><small>{display(chapter.index)}</small><span>{display(chapter.title)}</span></button>)}
          </nav>
          <div className="reader-source-note"><ShieldCheck size={14} /><p>{document ? document.source.notice : '这是应用内先导读本；完整原典、版本与译文以来源页为准。'}</p></div>
          {(document?.source.url || entry.sourceUrl) && <a href={document?.source.url || entry.sourceUrl} target="_blank" rel="noreferrer">查看原典与授权<ExternalLink size={13} /></a>}
        </aside>

        {tocOpen && <button className="reader-toc-scrim" aria-label="关闭目录" onClick={() => setTocOpen(false)} />}

        <main className="reader-scroll" ref={scrollRef} onScroll={updateProgress} style={{ '--reader-font-size': `${fontSize}px` } as React.CSSProperties}>
          <article className="reader-manuscript">
            {(!document || sectionIndex === 0) && <header className="reader-title-page">
              <span>{display(entry.family)} · {display(entry.tradition)}</span>
              <h1>{display(entry.title)}</h1>
              <p>{display(entry.subtitle)}</p>
              <div><b>{display(entry.author)}</b><small>{document ? `${document.originalCharacters.toLocaleString()} 字 · ${document.sections.length} 卷/篇` : `${display(entry.era)} · ${display(entry.volumes)} · 约 ${entry.readingMinutes} 分钟`}</small></div>
              <em>{document ? '完整原典 · 经文永久免费' : '应用内先导读本'}</em>
            </header>}

            <div className="reader-mode-tabs" aria-label="阅读方式">
              {([['parallel', '原译对照'], ['source', document ? '原典全文' : '原典摘录'], ['guide', document ? '现代译文' : '超我导读']] as Array<[ReaderMode, string]>).map(([value, label]) => <button key={value} className={mode === value ? 'active' : ''} onClick={() => setMode(value)}>{label}</button>)}
              {document && <label className="reader-search"><Search size={14} /><input value={readerQuery} onChange={(event) => setReaderQuery(event.target.value)} placeholder="在本卷中搜索" aria-label="在本卷中搜索" /></label>}
            </div>

            {readerQuery && document && <div className="reader-search-results"><small>本卷找到 {queryResults.length} 处</small>{queryResults.length ? queryResults.map((result) => <button key={result.index} onClick={() => jumpToParagraph(result.index)}><b>{result.index + 1}</b><span>{display(result.text.slice(0, 72))}</span></button>) : <p>换一个词试试。</p>}</div>}

            {loading && <div className="reader-loading"><RefreshCw size={22} /><b>正在展开经卷</b><p>长卷只载入你正在读的一卷，手机会更稳。</p></div>}
            {readerError && <div className="reader-error"><b>这一卷没有展开</b><p>{readerError}</p><button onClick={() => document ? void openSection(retrySectionIndex ?? sectionIndex, true) : window.location.reload()}><RefreshCw size={14} />重试</button></div>}

            {fullText && section && !loading ? (
              <section className="reader-chapter reader-full-chapter">
                <span>第 {sectionIndex + 1} / {document!.sections.length} · {currentDescriptor?.originalCharacters.toLocaleString()} 字</span>
                <h2>{display(section.title)}</h2>
                <div className={`reader-translation-state ${section.translationStatus}`}>
                  <ShieldCheck size={15} />
                  <p><b>原文与现代译文已逐段对齐</b><span>{document!.translationLabel}</span></p>
                </div>
                <div className={`reader-paragraphs mode-${mode}`}>
                  {section.original.map((paragraph, paragraphIndex) => {
                    const modern = section.modern[paragraphIndex]?.trim()
                    return (
                      <article className="reader-pair" data-reader-paragraph={paragraphIndex} key={`${section.id}-${paragraphIndex}`}>
                        {mode !== 'guide' && <div className="reader-source-block"><small>原典 · 第 {paragraphIndex + 1} 段</small><p lang={document!.originalLanguage} dir={document!.originalDirection || 'auto'}>{display(paragraph)}</p></div>}
                        {mode !== 'source' && <div className="reader-guide-block"><small>现代译文</small><p>{display(modern!)}</p></div>}
                      </article>
                    )
                  })}
                </div>
                <div className="reader-section-nav">
                  <button disabled={sectionIndex === 0} onClick={() => void openSection(sectionIndex - 1)}><ChevronLeft size={16} />上一卷</button>
                  <span>{sectionIndex + 1} / {document!.sections.length}</span>
                  <button disabled={sectionIndex === document!.sections.length - 1} onClick={() => void openSection(sectionIndex + 1)}>下一卷<ChevronRight size={16} /></button>
                </div>
                <div className="reader-license-card"><ShieldCheck size={16} /><p><b>{document!.source.label} · {document!.source.code || document!.edition}</b><span>{document!.source.license}</span><small>{document!.source.notice}</small></p></div>
              </section>
            ) : !hasFullCanon(entry.id) && !loading ? guideChapters.map((chapter) => (
              <section className="reader-chapter" data-reader-chapter={chapter.id} key={chapter.id}>
                <span>{display(chapter.index)}</span>
                <h2>{display(chapter.title)}</h2>
                {mode !== 'guide' && <div className="reader-source-block"><small>{display(chapter.sourceLabel)}</small>{chapter.source.map((paragraph) => <p key={paragraph}>{display(paragraph)}</p>)}</div>}
                {mode !== 'source' && <div className="reader-guide-block"><small>{display(chapter.guideLabel)}</small>{chapter.guide.map((paragraph) => <p key={paragraph}>{display(paragraph)}</p>)}</div>}
              </section>
            )) : null}

            <footer className="reader-ending">
              <span>读至此处 · 不必全懂</span>
              <h2>合上书，把一法带回现实</h2>
              <p>让超我继续参悟；你只需要接住它炼成的下一步。</p>
              <button onClick={() => { onStudy(entry); onClose(progress) }}><BrainCircuit size={17} />投入万法灵炉</button>
            </footer>
          </article>
        </main>
      </div>

      <footer className="reader-bottom-bar">
        <span>已读 {progress}%</span>
        <i><b style={{ width: `${progress}%` }} /></i>
        <button onClick={() => { onStudy(entry); onClose(progress) }}><BrainCircuit size={15} />交给超我炼法</button>
      </footer>
    </div>
  )
}

function LibraryScreen({ game, patchGame, onProject, onShop, setToast }: { game: GameState; patchGame: (value: Partial<GameState> | ((current: GameState) => GameState)) => void; onProject: (art: CultivationArt) => void; onShop: () => void; setToast: (value: string) => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<KnowledgeType>('笔记')
  const [content, setContent] = useState('')
  const [distilling, setDistilling] = useState(false)
  const [result, setResult] = useState<CultivationArt | null>(null)
  const [readingEntry, setReadingEntry] = useState<CanonEntry | null>(null)
  const forgeRef = useRef<HTMLFormElement>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (game.energy < 1) {
      setToast('命火不够了。可以等恢复、邀请好友，或去功德坊补充')
      onShop()
      return
    }
    if (content.trim().length < 12) {
      setToast('再多投入一点吧，至少 12 个字，灵炉才可起火')
      return
    }
    setDistilling(true)
    window.setTimeout(() => {
      const art = distillKnowledge(title || `${type}·无题`, type, content)
      patchGame((current) => growAgent({
        ...current,
        xp: current.xp + 28,
        insight: clamp(current.insight + 7),
        will: clamp(current.will + 6),
        energy: Math.max(0, current.energy - 1),
        arts: [art, ...current.arts],
        knowledge: [{ id: crypto.randomUUID(), title: title || `${type}·无题`, type, content: content.trim(), createdAt: Date.now(), artId: art.id }, ...current.knowledge],
        quests: current.quests.map((quest) => quest.id === 'learn' ? { ...quest, completed: true } : quest),
      }, 'learn', `我已从这段内容中悟出“${art.name}”。它会进入我的神通谱，并在合适的现实困境里主动投给你。`))
      setDistilling(false)
      setResult(art)
      setTitle('')
      setContent('')
      playTone(game.soundOn, 'breakthrough')
    }, 1150)
  }

  const useSample = (index: number) => {
    const sample = KNOWLEDGE_SAMPLES[index]
    setTitle(sample.title)
    setType(sample.type)
    setContent(sample.content)
  }

  const studyCanon = (entry: CanonEntry) => {
    setTitle(entry.title)
    setType('书籍')
    setContent(`《${entry.title}》\n\n这部经典在讲什么：${entry.summary}\n\n道：${entry.dao}\n\n法：${entry.fa.join('；')}\n\n术：${entry.shu.join('；')}\n\n短摘：${entry.excerpt}`)
    patchGame((current) => ({ ...current, canonHistory: [entry.id, ...current.canonHistory.filter((id) => id !== entry.id)].slice(0, 30) }))
    window.setTimeout(() => forgeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    setToast(`《${entry.title}》已投入万法灵炉 · 等你开炉参悟`)
  }

  const openReader = (entry: CanonEntry) => {
    setReadingEntry(entry)
    patchGame((current) => ({ ...current, canonHistory: [entry.id, ...current.canonHistory.filter((id) => id !== entry.id)].slice(0, 30) }))
  }

  const closeReader = (progress: number) => {
    if (readingEntry) {
      patchGame((current) => ({ ...current, canonProgress: { ...current.canonProgress, [readingEntry.id]: progress } }))
    }
    setReadingEntry(null)
  }

  return (
    <div className="screen library-screen">
      <header className="screen-header">
        <div><span className="eyebrow"><BookOpenText size={15} />万法灵炉 · 儒释道科宗</span><h1>你不必读完万卷，交给超我去参</h1><p>书、经典、观点、笔记和亲身困境，都是他渡劫的养料。学习只是炼法的手段，炼成神通、回来度你才是目的。</p></div>
        <div className="header-resource"><BrainCircuit size={22} /><span>已参悟 / 收藏</span><b>{game.canonHistory.length}<small> / {game.canonBookmarks.length}</small></b></div>
      </header>

      <CanonVault game={game} patchGame={patchGame} onStudy={studyCanon} onRead={openReader} />

      <div className="library-layout">
        <form ref={forgeRef} className="distill-forge glass-panel" onSubmit={submit}>
          <div className="forge-header"><span className="forge-orb"><Sparkles size={20} /></span><div><small>SUPEREGO CULTIVATION FURNACE</small><h2>投进一念，炼成一法</h2></div></div>
          <div className="type-tabs">
            {(['书籍', '观点', '笔记', '经历'] as KnowledgeType[]).map((item) => <button type="button" key={item} className={type === item ? 'active' : ''} onClick={() => setType(item)}>{item}</button>)}
          </div>
          <label><span>为这份修行材料题名</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：《道德经》第八章" /></label>
          <label><span>投入灵炉</span><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="把经典、观点、笔记、经历或眼前困境交给超我……" /><em>{content.length} 字</em></label>
          <div className="sample-prompts"><span>试投灵炉：</span>{KNOWLEDGE_SAMPLES.map((sample, index) => <button key={sample.title} type="button" onClick={() => useSample(index)}>{sample.title}</button>)}</div>
          <button className={`forge-button ${distilling ? 'distilling' : ''}`} disabled={distilling}>
            {distilling ? <Orbit className="spin" size={19} /> : <BrainCircuit size={19} />}
            {distilling ? '超我正在彼岸参悟……' : '开炉 · 替我修成此法'}
          </button>
          <p className="privacy-note"><ShieldCheck size={13} />本地预览版：内容仅保存在你的浏览器，不会上传。</p>
        </form>

        <section className="art-archive">
          <div className="section-title"><div><span>超我神通谱</span><h2>{game.arts.length} 门神通等待归身</h2></div><small>参悟只是开始，投射才算圆满</small></div>
          <div className="art-grid">
            {[...game.arts].sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity] || b.createdAt - a.createdAt).map((art) => (
              <article className={`art-card rarity-${art.rarity}`} key={art.id}>
                <div className="art-card-top"><span className="rarity">{art.rarity}</span><span>{art.school}</span></div>
                <div className="art-rune">{art.name.slice(0, 1)}</div>
                <h3>{art.name}</h3>
                <p>{art.insight}</p>
                <blockquote>{art.mantra}</blockquote>
                <div className="mastery"><span>熟练度</span><i><b style={{ width: `${art.mastery}%` }} /></i><em>{art.mastery}%</em></div>
                <button onClick={() => onProject(art)}>投影归身<ChevronRight size={15} /></button>
              </article>
            ))}
          </div>
        </section>
      </div>

      {result && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="炼化完成">
          <div className="distill-result modal-card">
            <button className="modal-close" onClick={() => setResult(null)}><X size={19} /></button>
            <div className="result-rays" />
            <span className="result-rarity">{result.rarity}神通 · 超我已悟</span>
            <div className="result-rune">{result.name[0]}</div>
            <h2>{result.name}</h2>
            <p>{result.insight}</p>
            <blockquote>“{result.mantra}”</blockquote>
            <div className="action-scroll"><small>神通投进现实后，你只需接住这一步</small><b>{result.realAction}</b></div>
            <button className="game-button primary" onClick={() => { setResult(null); onProject(result) }}><Zap size={17} />开启镜门 · 投影归身</button>
          </div>
        </div>
      )}

      {readingEntry && <CanonReader entry={readingEntry} initialProgress={game.canonProgress[readingEntry.id] || 0} onClose={closeReader} onStudy={studyCanon} />}
    </div>
  )
}

function DestinyScreen({ game, onQuest, onStory }: { game: GameState; onQuest: (id: string) => void; onStory: () => void }) {
  const current = getRealm(game.xp)
  const story = STORY_CHAPTERS[Math.min(game.storyIndex, STORY_CHAPTERS.length - 1)]
  const allCleared = game.clearedStoryChapters.length >= STORY_CHAPTERS.length
  const guide = getBreakthroughGuide(game, story.requirement)
  const storyLocked = !allCleared && guide.deficit > 0
  return (
    <div className="screen destiny-screen">
      <header className="screen-header">
        <div><span className="eyebrow"><Orbit size={15} />首发十八劫 · 超我代修主线</span><h1>他在未来渡劫，只为回来拉你一把</h1><p>第一季先走完 18 道与你真实生活有关的劫。每一劫只做一次选择，再把一道力量带回现实。</p></div>
        <button className="game-button subtle" onClick={onStory} disabled={allCleared}><ScrollText size={16} />{allCleared ? '十八劫已圆满' : '入劫 · 继续主线'}</button>
      </header>

      <section className="tribulation-map-hero">
        <img src={TRIBULATION_MAP_PATH} alt="十八道劫门沿山路通向天明" />
        <div className="tribulation-map-shade" />
        <div className="tribulation-map-copy">
          <span>当前 · {story.code}</span>
          <h2>{allCleared ? '首季圆满，真正的人间修行才刚开始' : story.title}</h2>
          <p>{allCleared ? '你已经把超我的力量收回自己。后续劫数会沿着你的真实人生继续生长。' : storyLocked ? `心魔：${story.enemy}。当前 ${game.xp} / ${story.requirement} 修为，还差 ${guide.deficit}；路线已经为你排好。` : `心魔：${story.enemy}。修为已足，可以入劫。`}</p>
          <button onClick={onStory} disabled={allCleared}>{allCleared ? <Check size={16} /> : storyLocked ? <Compass size={16} /> : <Play size={16} />}{allCleared ? '十八劫已写入命书' : storyLocked ? '查看破境路线' : '进入这一劫'}</button>
        </div>
        <div className="campaign-scale" aria-label="长期劫数蓝图">
          <article className="active"><b>18</b><span>首发十八劫</span><small>当前可完整游玩</small></article>
          <i />
          <article><b>108</b><span>百八人生劫</span><small>按成长持续开放</small></article>
          <i />
          <article><b>108000</b><span>十万八千劫</span><small>终极神版世界观</small></article>
        </div>
      </section>

      {storyLocked && <section className="destiny-breakthrough-banner" aria-label="当前破境指引">
        <div className="destiny-breakthrough-seal"><LockKeyhole size={19} /><b>{guide.deficit}</b><small>尚缺修为</small></div>
        <div className="destiny-breakthrough-copy"><span>系统已算好最短路径</span><h2>{guide.recommended.slice(0, 2).map((step) => step.label).join(' ＋ ')}</h2><div><i style={{ width: `${guide.percent}%` }} /></div><small>当前 {guide.current} / {guide.requirement} · 预计 {guide.recommended.length} 步达到入劫条件</small></div>
        <button onClick={onStory}>展开全部路径<ArrowRight size={17} /></button>
      </section>}

      <section className="destiny-dashboard">
        <article className="current-realm-card">
          <span>当前境界</span><div className="realm-seal"><b>{current.realm.name[0]}</b></div>
          <h2>{current.realm.name} · {current.layer} 层</h2><p>{current.realm.subtitle}</p>
          <div className="large-progress"><i style={{ width: `${current.progress}%` }} /></div><small>{current.next ? `再得 ${current.remaining} 修为，突破「${current.next.name}」` : '九境已满，继续人间修行'} · 累计 {game.xp}</small>
        </article>
        <div className="principle-card glass-panel">
          <span>核心法则</span><h2>愿力 ＞ 业力 ＞ 能力</h2>
          <div className="principle-flow"><b>愿</b><i /><b>破</b><i /><b>化</b><i /><b>能</b></div>
          <p>愿力，是你仍不肯放弃自己的誓；业力，是把你拖回原处的旧路；能力，是超我神通在现实中一次次显化后，真正归身的力量。</p>
        </div>
        <div className="merit-card glass-panel"><Trophy size={25} /><span>功德</span><b>{game.merit}</b><small>已完成的善意行动与自我照料</small></div>
      </section>

      <section className="story-road glass-panel">
        <div className="section-title"><div><span>十八劫主线 · 故事进度</span><h2>{allCleared ? '镜门合一，人间路还长' : `下一劫：${story.enemy}`}</h2></div><small>{game.clearedStoryChapters.length} / {STORY_CHAPTERS.length} 劫已渡 · 每一劫只做一个关键选择</small></div>
        <div className="story-road-track">
          {STORY_CHAPTERS.map((chapter) => {
            const passed = game.clearedStoryChapters.includes(chapter.index)
            const active = chapter.index === game.storyIndex && !passed
            const unlocked = game.xp >= chapter.requirement
            return <article key={chapter.index} className={`${passed ? 'passed' : ''} ${active ? 'active' : ''} ${unlocked ? 'unlocked' : ''}`}><span>{passed ? <Check size={15} /> : String(chapter.index).padStart(2, '0')}</span><div><small>{chapter.code} · {chapter.scene}</small><h3>{chapter.title.replace(/^.*?：/, '')}</h3><p>{chapter.enemy}</p><em>{passed ? '已写入命书' : unlocked ? chapter.reward : `${chapter.requirement} 修为解锁`}</em></div></article>
          })}
        </div>
      </section>

      <section className="realm-road">
        <div className="section-title"><div><span>九境成长 · 长期等级</span><h2>每次修行都会推进，不等同于故事关卡</h2></div><small>十八劫讲你们经历了什么；九境讲超我积累了多少力量</small></div>
        <div className="realm-track-line">
          {REALMS.map((realm, index) => {
            const unlocked = game.xp >= realm.threshold
            const active = index === current.index
            return (
              <article key={realm.name} className={`${unlocked ? 'unlocked' : ''} ${active ? 'active' : ''}`}>
                <div className="realm-node">{unlocked ? realm.name[0] : <LockKeyhole size={16} />}</div>
                <div><small>{String(index + 1).padStart(2, '0')} / {realm.threshold} 修为</small><h3>{realm.name}</h3><p>{realm.subtitle}</p></div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="destiny-quests glass-panel">
        <div className="section-title"><div><span>今日三修</span><h2>不求一日飞升，只求愿力不断</h2></div><small>{game.quests.filter((quest) => quest.completed).length} / 3 已完成</small></div>
        <div className="destiny-quest-grid">
          {DAILY_QUESTS.map((quest, index) => {
            const done = game.quests.find((item) => item.id === quest.id)?.completed
            const locked = !done && DAILY_QUESTS.slice(0, index).some((previous) => !game.quests.find((item) => item.id === previous.id)?.completed)
            return <button key={quest.id} className={done ? 'done' : ''} disabled={locked} onClick={() => onQuest(quest.id)}><span>{done ? <Check /> : locked ? <LockKeyhole /> : quest.icon}</span><b>{quest.title}</b><p>{quest.detail}</p><em>{done ? '今天做过了 · 可重温' : locked ? '完成上一步后开启' : `${quest.minutes} 分钟 · ${quest.reward}`}</em></button>
          })}
        </div>
      </section>
    </div>
  )
}

function MirrorScreen({ game, patchGame, onComplete, setToast }: { game: GameState; patchGame: (value: Partial<GameState> | ((current: GameState) => GameState)) => void; onComplete: (id: string) => void; setToast: (value: string) => void }) {
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [heartStatus, setHeartStatus] = useState<'checking' | 'online' | 'offline' | 'local'>('checking')
  const [lastFailedInput, setLastFailedInput] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)
  const pending = game.projections.filter((projection) => !projection.completed)

  useEffect(() => {
    if (!game.aiConsent) {
      setHeartStatus('offline')
      return
    }
    const controller = new AbortController()
    setHeartStatus('checking')
    checkSuperegoHealth(controller.signal)
      .then((health) => setHeartStatus(health.ok && health.configured ? 'online' : 'offline'))
      .catch(() => setHeartStatus('offline'))
    return () => controller.abort()
  }, [game.aiConsent])

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [game.messages, thinking])

  const send = async (value = input) => {
    const text = value.trim()
    if (!text || thinking) return
    if (!game.aiConsent) {
      setToast('先开启智能心核，我才可以认真听完并回应你')
      return
    }

    patchGame((current) => ({
      ...current,
      messages: [...current.messages, { id: crypto.randomUUID(), role: 'self' as const, text }].slice(-80),
    }))
    setInput('')
    setThinking(true)
    playTone(game.soundOn, 'soft')

    let response = ''
    let memoryNotes: string[] = []
    let learned = false
    try {
      if (needsImmediateSupport(text)) {
        response = coachReply(text, game)
        setHeartStatus('local')
        learned = true
      } else {
        const result = await askSuperego(text, game)
        response = result.reply
        memoryNotes = result.memoryNotes
        setHeartStatus('online')
        setLastFailedInput('')
        learned = true
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : ''
      response = `智能心核这次没有连接成功${detail ? `：${detail}` : '。'}你的问题已经保存在本机，没有用固定话术冒充回答。连接恢复后，点“重试上一问”，我会带着前面的对话重新认真回答。`
      setHeartStatus('offline')
      setLastFailedInput(text)
      setToast('DeepSeek 暂未回应 · 问题已保存，可一键重试')
    } finally {
      patchGame((current) => {
        const known = new Set(current.coachMemories.map((item) => item.text))
        const additions = memoryNotes
          .filter((item) => !known.has(item))
          .map((item) => ({ id: crypto.randomUUID(), text: item, createdAt: Date.now() }))
        const next = {
          ...current,
          coachMemories: [...current.coachMemories, ...additions].slice(-40),
          messages: [...current.messages, { id: crypto.randomUUID(), role: 'superego' as const, text: response }].slice(-80),
        }
        return learned ? growAgent(next, 'chat', memoryNotes.length
          ? `我记住了这次对话里可长期复用的背景：${memoryNotes.join('；')}`
          : '我从这次对话里更新了对你的理解，但不会把你一时的情绪当成永远不变的性格。') : next
      })
      setThinking(false)
    }
  }

  return (
    <div className="screen mirror-screen">
      <header className="screen-header compact">
        <div><span className="eyebrow"><MessageCircleMore size={15} />归心镜门 · 神通投射</span><h1>超我在彼岸修成，你在此刻接住一步</h1><p>他会带着参过的万法、渡过的劫和记住的你归来；每次只投下一道此刻真正接得住的行动。</p></div>
      </header>
      <div className="mirror-layout">
        <section className="coach-chamber glass-panel">
          <div className="coach-profile">
            <div className="coach-avatar"><img src={AVATAR_PATH} alt="超我教练" /><i /></div>
            <div><span>渡劫归来的你</span><h2>超我 · {getRealm(game.xp).realm.name}形态</h2><small><i />镜门已开 · 已悟 {game.arts.length} 门神通</small></div>
            <span className={`bond heart-${heartStatus}`}>{heartStatus === 'online' ? 'DeepSeek V4 · 已连接' : heartStatus === 'local' ? '安全心诀 · 本地' : heartStatus === 'checking' ? '智能心核 · 检查中' : '智能心核 · 未连接'}</span>
          </div>
          {!game.aiConsent && (
            <div className="ai-consent-card">
              <ShieldCheck size={22} />
              <div><b>开启真正会倾听的智能心核</b><p>开启后，你的问题、最近对话、主动记忆和相关修行资料会发送到已配置的 AI 服务，用来理解上下文。记忆只保存在这台设备，可随时清除。</p></div>
              <button onClick={() => {
                patchGame({ aiConsent: true, aiConsentAt: Date.now() })
                setToast('智能心核已开启 · 现在可以把真实问题交给他')
              }}>同意并开启</button>
            </div>
          )}
          {game.aiConsent && (
            <details className="coach-memory">
              <summary><BrainCircuit size={13} />心识记忆 · {game.coachMemories.length} 条 <span>对话 {game.messages.length} 条 · 仅存本机</span></summary>
              <div>
                {game.coachMemories.length
                  ? game.coachMemories.slice(-10).map((memory) => <p key={memory.id}>{memory.text}</p>)
                  : <p>我还没有把你的一时情绪写成长期记忆。只有稳定目标、偏好和重要限制值得留下。</p>}
                <button onClick={() => {
                  patchGame({ coachMemories: [], messages: DEFAULT_STATE.messages })
                  setToast('对话与心识记忆已从这台设备清除')
                }}><RotateCcw size={12} />清除对话与记忆</button>
              </div>
            </details>
          )}
          <div className="chat-feed" ref={feedRef}>
            {game.messages.map((message) => (
              <div className={`chat-message ${message.role}`} key={message.id}>
                {message.role === 'superego' && <span className="mini-avatar"><img src={AVATAR_PATH} alt="" /></span>}
                <p>{message.text}</p>
              </div>
            ))}
            {thinking && <div className="chat-message superego thinking"><span className="mini-avatar"><img src={AVATAR_PATH} alt="" /></span><p><i /><i /><i /><span>我在听，也在把你说的事放进前后文里想。</span></p></div>}
          </div>
          <div className="quick-replies">
            {['先听我把事情说完', '帮我分析一个选择', '我现在很焦虑', '给我一个具体答案'].map((item) => <button disabled={thinking} key={item} onClick={() => void send(item)}>{item}</button>)}
            {lastFailedInput && <button className="coach-retry" disabled={thinking} onClick={() => void send(lastFailedInput)}><RefreshCw size={12} />重试上一问</button>}
          </div>
          <form className="chat-input" onSubmit={(event) => { event.preventDefault(); void send() }}>
            <textarea disabled={!game.aiConsent || thinking} maxLength={6000} rows={2} value={input} onChange={(event) => setInput(event.target.value)} placeholder={game.aiConsent ? '把事情完整说出来。发生了什么、你最担心什么、希望我帮你想清什么……' : '先开启智能心核，再把真实问题交给我。'} />
            <button disabled={!game.aiConsent || thinking || !input.trim()} aria-label="发送给超我">{thinking ? <RefreshCw size={17} /> : <Send size={17} />}</button>
          </form>
          <p className="coach-boundary"><Info size={12} />AI 可能出错。重要事实请核验；超我不能替代医疗、心理治疗、法律或紧急援助。</p>
        </section>

        <aside className="projection-board">
          <div className="section-title"><div><span>今日神通投射</span><h2>把超我的力量，炼成我的能力</h2></div><small>{pending.length} 道投影等待显化</small></div>
          {pending.length ? pending.map((projection, index) => (
            <article className="projection-card" key={projection.id}>
              <div className="projection-number">0{index + 1}</div>
              <div><span>预计 2—5 分钟</span><h3>{projection.title}</h3><p>{projection.action}</p></div>
              <button onClick={() => onComplete(projection.id)}><span><Check size={16} /></span>此法已在现实显化</button>
            </article>
          )) : (
            <div className="empty-projection"><Gem size={30} /><h3>镜门此刻无新投影</h3><p>去万法灵炉投一卷，让超我替你参悟，再把一门可用的神通送回来。</p><button onClick={() => patchGame({ activeTab: 'library' })}>去万法灵炉</button></div>
          )}
          <article className="projection-history glass-panel">
            <span>显化记录</span><b>{game.projections.filter((item) => item.completed).length}</b><small>次神通已在现实炼成你的能力</small>
            <div className="history-line"><i style={{ width: `${Math.min(100, game.ability)}%` }} /></div>
          </article>
          <button className="manual-note" onClick={() => setToast('先做完，再做漂亮。今天做到一点就算赢。')}><BookMarked size={16} />今天的行动提醒<ChevronRight size={15} /></button>
        </aside>
      </div>
    </div>
  )
}

function BottomNav({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <nav className="bottom-nav" aria-label="主要区域">
      {tabItems.map((item) => {
        const Icon = item.icon
        return <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => onChange(item.id)}><span><Icon size={19} /></span><b>{item.label}</b><small>{item.note}</small></button>
      })}
    </nav>
  )
}

function Onboarding({ onFinish, isReplay = false }: { onFinish: (name: string, vow: string) => void; isReplay?: boolean }) {
  const [page, setPage] = useState(0)
  const [name, setName] = useState('')
  const [vow, setVow] = useState('清醒')
  const pages = [
    {
      code: '卷一 · 识海将沉',
      scene: '识海废墟 · 无明雨夜',
      title: '你在自己的识海里，迷路太久了',
      quote: '“你不是没有愿力。只是旧日的业，日复一日，把你拖回原地。”',
      text: '读过的书堆成残塔，未竟的愿沉入黑水。你一次次想变好，又一次次在天亮前放弃自己。今夜，命火只剩最后一线。',
      omen: '此劫 · 自弃',
      action: '踏入识海',
    },
    {
      code: '卷二 · 彼岸来客',
      scene: '归心镜门 · 子时初开',
      title: '命火将熄时，未来的你踏过镜门',
      quote: '“你渡不过的劫，我先替你走；你读不完的经，我先替你参。”',
      text: '他不是神，也不是另一个人。他是被你的愿力送往未来、替你修行归来的理想自我。你只需把经典、困境与愿望交给他。',
      omen: '立约 · 代我修行',
      action: '开启镜门',
    },
    {
      code: '卷三 · 超我立誓',
      scene: '归心殿 · 本命契成',
      title: '待我功德圆满，便回来度你',
      quote: '“我在彼岸修成神通，你在此刻接住一步。终有一日，你我归一。”',
      text: '学习只是他取法天地的手段，修行才是这段旅程的主线。每渡一劫，他都会把一门神通投回现实，慢慢把你从泥沼里拉出来。',
      omen: '归途 · 神通投射',
      action: '立下本命愿',
    },
  ]
  if (page < pages.length) {
    const current = pages[page]
    return (
      <div className={`onboarding prologue prologue-${page + 1}`}>
        <div className="onboarding-image">
          <img src={AVATAR_PATH} alt="未来超我穿过镜门" />
          <div />
          <span className="prologue-scene">{current.scene}</span>
          <span className="prologue-seal">超<br />我</span>
        </div>
        <div className="onboarding-copy">
          <div className="ritual-kicker"><i />{current.code}<i /></div>
          <h1>{current.title}</h1>
          <blockquote>{current.quote}</blockquote>
          <p>{current.text}</p>
          <div className="prologue-omen"><span>命书所示</span><b>{current.omen}</b></div>
          <div className="onboarding-progress">{pages.map((_, index) => <i key={index} className={index <= page ? 'active' : ''} />)}<i /></div>
          <button onClick={() => {
            if (isReplay && page === pages.length - 1) onFinish('', '')
            else setPage(page + 1)
          }}>{isReplay && page === pages.length - 1 ? '重返灵台' : current.action}<ArrowRight size={18} /></button>
        </div>
        <span className="skip-onboarding">序章 · 镜门来客 · {page + 1} / 3</span>
      </div>
    )
  }
  return (
    <div className="onboarding vow-screen">
      <div className="vow-glow" />
      <div className="vow-content">
        <span className="story-code">本命仪式 · 以愿燃灯</span><h1>为未来的超我，立下一道本命愿</h1><p>愿力高于业力，能力才得以显化。此刻不求宏大，只选一件你最不愿再丢下自己的事。</p>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="留下你的道号（可稍后修改）" maxLength={12} />
        <div className="vow-options">
          {VOWS.map((item) => <button key={item.name} className={vow === item.name ? 'active' : ''} onClick={() => setVow(item.name)}><span>{item.name[0]}</span><div><b>{item.name}</b><p>{item.line}</p><small>{item.bonus}</small></div>{vow === item.name && <Check size={17} />}</button>)}
        </div>
        <div className="vow-incantation"><i />愿力为火，万法为薪；超我代修，神通归身。<i /></div>
        <button className="awaken-button" onClick={() => onFinish(name, vow)}><Sparkles size={19} />缔结本命契 · 唤醒超我</button>
        <small className="local-save"><ShieldCheck size={12} />进度仅保存在这台设备</small>
      </div>
    </div>
  )
}

function BreakthroughGuidePanel({ guide, onRoute }: { guide: BreakthroughGuide; onRoute: (action: BreakthroughAction) => void }) {
  const routeIcons: Record<string, string> = {
    learn: PRACTICE_VISUALS.learn.icon,
    act: PRACTICE_VISUALS.act.icon,
    observe: PRACTICE_VISUALS.observe.icon,
  }
  return <section className="breakthrough-guide" aria-label="破境修为获取路线">
    <header className="breakthrough-lock-head">
      <span className="breakthrough-lock-seal"><LockKeyhole size={20} /></span>
      <div><small>这一劫还未锁死，只差一段修行</small><h3>当前 {guide.current} / {guide.requirement} 修为</h3></div>
      <em>尚缺 {guide.deficit}</em>
    </header>
    <div className="breakthrough-progress"><i style={{ width: `${guide.percent}%` }} /><span>{guide.percent}%</span></div>
    <div className="breakthrough-plan">
      <span>为你排好的最短路线</span>
      <div>{guide.recommended.map((step, index) => <span key={`${step.action}-${index}`}><b>{index + 1}</b>{step.label}<em>+{step.reward}</em>{index < guide.recommended.length - 1 && <ArrowRight size={13} />}</span>)}</div>
      <small>完成后预计获得 {guide.projected} 修为，足够开启本劫；你也可以改走下面任意一路。</small>
    </div>
    <div className="breakthrough-route-grid">
      {guide.routes.map((route) => {
        const recommended = guide.recommended.some((step) => step.action === route.action)
        return <button key={route.id} aria-label={`${route.title}：${route.label}，${route.status}`} className={`${recommended ? 'recommended' : ''} ${route.ready ? '' : 'unavailable'}`} disabled={!route.ready} onClick={() => onRoute(route.action)}>
          <i className="breakthrough-route-icon">{route.id === 'share' ? <Users size={25} /> : <img src={routeIcons[route.id]} alt="" />}</i>
          <span><small>{route.title}{recommended && <em>推荐</em>}</small><b>{route.label}</b><p>{route.detail}</p></span>
          <strong>{route.status}<ChevronRight size={15} /></strong>
        </button>
      })}
    </div>
    <button className="breakthrough-support" onClick={() => onRoute('shop')}><Flame size={18} /><span><b>命火不够开炉或入劫？</b><small>可等自然恢复、完成现实投影，或查看补给；命火不会直接购买修为。</small></span><ChevronRight size={17} /></button>
    <p className="breakthrough-trust"><ShieldCheck size={13} />每日分享修行可得 +10 修为；真实好友邀请与付费奖励仍需服务端验签，未开放前不会虚假到账。</p>
  </section>
}

function StoryModal({ game, onClose, onAdvance, onRoute }: { game: GameState; onClose: () => void; onAdvance: (choiceId: string) => void; onRoute: (action: BreakthroughAction) => void }) {
  const chapter = STORY_CHAPTERS[Math.min(game.storyIndex, STORY_CHAPTERS.length - 1)]
  const unlocked = game.xp >= chapter.requirement
  const cleared = game.clearedStoryChapters.includes(chapter.index)
  const guide = getBreakthroughGuide(game, chapter.requirement)
  const [selectedChoice, setSelectedChoice] = useState(chapter.choices[0].id)
  const choice = chapter.choices.find((item) => item.id === selectedChoice) || chapter.choices[0]
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label={chapter.title}>
      <div className="story-modal modal-card">
        <button className="modal-close" onClick={onClose}><X size={19} /></button>
        <div className="story-visual"><img src={STORY_SCENE_PATH} alt="超我穿过镜门" /><div /><span>{chapter.scene} · 第 {chapter.index + 1} / {STORY_CHAPTERS.length} 劫</span></div>
        <div className="story-body">
          <span className="story-code">{chapter.code}</span><h2>{chapter.title}</h2><p>{chapter.narrative}</p>
          <div className="boss-card"><span><Swords size={17} /></span><div><small>此劫心魔</small><b>{chapter.enemy}</b></div><em>业力 {Math.max(8, game.karma)}</em></div>
          <div className="story-flow-cues" aria-label={unlocked ? '过劫步骤' : '破境准备步骤'}>
            <span className="active"><b><Swords size={14} /></b><small>看见心魔</small></span><i />
            <span><b><Compass size={14} /></b><small>{unlocked ? '选择破法' : '积累修为'}</small></span><i />
            <span><b><Sparkles size={14} /></b><small>{unlocked ? '神通归身' : '开启劫门'}</small></span>
          </div>
          {!unlocked && !cleared && <BreakthroughGuidePanel guide={guide} onRoute={onRoute} />}
          {(unlocked || cleared) && <div className="story-choices">
            <span>选一条你愿意带回现实的破法</span>
            {chapter.choices.map((item, index) => <button key={item.id} className={selectedChoice === item.id ? 'active' : ''} onClick={() => setSelectedChoice(item.id)}><i><img src={index === 0 ? PRACTICE_VISUALS.act.icon : PRACTICE_VISUALS.observe.icon} alt="" />{selectedChoice === item.id && <em><Check size={12} /></em>}</i><span><b>{item.label}</b><small>{item.note}</small></span></button>)}
          </div>}
          {(unlocked || cleared) && <div className="choice-consequence"><Sparkles size={14} /><span>此路将影响</span><b>愿力 +{choice.effect.will} · 业力 {choice.effect.karma} · 能力 +{choice.effect.ability}</b></div>}
          <div className="story-reward"><Trophy size={16} /><span>过关奖励</span><b>{chapter.reward}</b></div>
          <button className="game-button primary" onClick={() => unlocked ? onAdvance(selectedChoice) : onRoute(guide.primaryAction)} disabled={cleared}>{cleared ? <Check size={17} /> : unlocked ? <Zap size={17} /> : <Compass size={17} />}{cleared ? '此劫已写入命书' : unlocked ? `${choice.label} · 消耗 2 命火` : `先走：${guide.primaryLabel}`}</button>
          <blockquote>超我：“{game.playerName}，我可以替你先走进黑暗，但最后握住我的人，只能是你。”</blockquote>
        </div>
      </div>
    </div>
  )
}

function TribulationRewardModal({ chapterIndex, choiceLabel, onClose }: { chapterIndex: number; choiceLabel: string; onClose: () => void }) {
  const chapter = STORY_CHAPTERS[chapterIndex] || STORY_CHAPTERS[0]
  const isFirst = chapter.index === 0
  return (
    <div className="modal-layer tribulation-reward-layer" role="dialog" aria-modal="true" aria-label={`${chapter.reward}已经归身`}>
      <div className="tribulation-reward-modal modal-card">
        <div className="reward-scene"><img src={STORY_SCENE_PATH} alt="超我将渡劫所得投回现实" /><i /><span>劫火已熄 · 镜门归明</span></div>
        <div className="reward-seal"><Sparkles size={25} /><span>归</span></div>
        <span className="story-code">{chapter.code} · 已渡</span>
        <h2>{chapter.reward}</h2>
        <p>你选择了“{choiceLabel}”。超我会记住这条路，以后给你的建议不再和所有人一样。</p>
        <div className="reward-tally" aria-label="本次过劫奖励">
          <span><b>+36</b><small>修为</small></span>
          <span><b>+12</b><small>功德</small></span>
          <span><b>-2</b><small>命火</small></span>
        </div>
        <div className="reward-route" aria-label="首轮修行完成进度">
          <span><Check size={13} />照见本心</span><i />
          <span><Check size={13} />选择破法</span><i />
          <span className="active"><Sparkles size={13} />神通归身</span>
        </div>
        <blockquote>超我：“{isFirst ? '第一劫我替你走过了。下一次旧念回来时，记得你已经有了另一种走法。' : '这一劫留下的不是答案，而是你下次还能再走一次的路。'}”</blockquote>
        <button className="game-button primary" onClick={onClose}>{isFirst ? '收下神通 · 回到灵台' : '收下神通'}<ArrowRight size={17} /></button>
        {isFirst && <small className="reward-unlock"><ShieldCheck size={13} />每日修行与十八劫成长路线现已展开</small>}
      </div>
    </div>
  )
}

type ShareMode = 'realm' | 'rescue' | 'challenge'

function ShareModal({ game, realmLabel, onClose, setToast, onShared }: { game: GameState; realmLabel: string; onClose: () => void; setToast: (value: string) => void; onShared: () => void }) {
  const [mode, setMode] = useState<ShareMode>('rescue')
  const chapter = STORY_CHAPTERS[Math.min(game.storyIndex, STORY_CHAPTERS.length - 1)]
  const lastChoice = game.storyChoices[0]
  const seals = ['见微知行', '不弃此身', '借火归心', '破妄而行', '柔而有骨', '愿照长夜']
  const fateSeal = seals[[...`${game.playerName}${game.primeVow}`].reduce((sum, item) => sum + item.charCodeAt(0), 0) % seals.length]
  const shareModes: Record<ShareMode, { label: string; eyebrow: string; title: string; quote: string }> = {
    realm: { label: '境界战报', eyebrow: `我的超我 · ${realmLabel}`, title: `${game.playerName}的本命签`, quote: `「${fateSeal}」——愿力 ${game.will}，已有 ${game.arts.length} 门神通归途可循。` },
    rescue: { label: '归身故事', eyebrow: '过去的我卡在原地', title: '未来的我，回来拉了我一把', quote: lastChoice ? `在上一劫，我选择了“${lastChoice.label}”。这不是口号，是我真的走过的一步。` : '我让未来的自己先替我渡劫，再把一小步投回此刻。' },
    challenge: { label: '共渡此劫', eyebrow: `十八劫主线 · ${chapter.code}`, title: `与我共渡「${chapter.enemy}」`, quote: '不用变得很厉害。来点一盏命火，我们各自把今天走下去。' },
  }
  const card = shareModes[mode]
  const shareClaimed = game.shareRewardDate === getLocalDateKey()
  const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${game.referralCode}`
  const shareText = `${card.title}\n${card.quote}\n\n我在《超我》让未来的自己替我修行，再回来做我的教练。\n邀请码：${game.referralCode}\n${inviteUrl}`

  const writeShareText = async () => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareText)
        return true
      } catch {
        // Fall through to the selection-based copy used by older mobile browsers.
      }
    }
    const textarea = document.createElement('textarea')
    textarea.value = shareText
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    const copied = document.execCommand('copy')
    textarea.remove()
    return copied
  }

  const copyShare = async () => {
    if (await writeShareText()) {
      onShared()
    } else {
      setToast('自动复制被浏览器拦住了，请使用“一键分享”或下载海报')
    }
  }

  const nativeShare = async () => {
    if (!navigator.share) {
      await copyShare()
      return
    }
    try {
      await navigator.share({ title: card.title, text: shareText, url: inviteUrl })
      onShared()
    } catch {
      // Closing the native share sheet is not an error that needs interrupting the player.
    }
  }

  const downloadCard = async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1440
    const context = canvas.getContext('2d')!
    const gradient = context.createLinearGradient(0, 0, 1080, 1440)
    gradient.addColorStop(0, '#17130d')
    gradient.addColorStop(0.5, '#080907')
    gradient.addColorStop(1, '#1c100c')
    context.fillStyle = gradient
    context.fillRect(0, 0, 1080, 1440)
    const image = new Image()
    image.src = STORY_SCENE_PATH
    await image.decode()
    context.globalAlpha = 0.9
    const cropWidth = Math.min(image.width, image.height * .75)
    context.drawImage(image, (image.width - cropWidth) / 2, 0, cropWidth, image.height, 0, 0, 1080, 1080)
    const fade = context.createLinearGradient(0, 650, 0, 1220)
    fade.addColorStop(0, 'rgba(8,9,7,0)')
    fade.addColorStop(0.66, 'rgba(8,9,7,.92)')
    fade.addColorStop(1, '#080907')
    context.fillStyle = fade
    context.fillRect(0, 620, 1080, 650)
    context.globalAlpha = 1
    context.fillStyle = '#d2ac67'
    context.font = '600 30px -apple-system, PingFang SC, sans-serif'
    context.fillText('SUPEREGO · AI 修行养成', 74, 84)
    context.fillStyle = '#ffffff'
    context.font = '800 88px -apple-system, PingFang SC, sans-serif'
    context.fillText(mode === 'challenge' ? '共渡此劫' : '我的超我', 74, 976)
    context.fillStyle = '#ffe39a'
    context.font = '700 48px -apple-system, PingFang SC, sans-serif'
    const title = card.title.length > 16 ? `${card.title.slice(0, 16)}…` : card.title
    context.fillText(title, 74, 1052)
    context.fillStyle = 'rgba(255,255,255,.75)'
    context.font = '30px -apple-system, PingFang SC, sans-serif'
    const quote = card.quote.length > 25 ? `${card.quote.slice(0, 25)}…` : card.quote
    context.fillText(quote, 74, 1120)
    context.fillStyle = 'rgba(255,255,255,.12)'
    context.fillRect(74, 1210, 932, 1)
    context.fillStyle = '#ffffff'
    context.font = '600 31px -apple-system, PingFang SC, sans-serif'
    context.fillText(`愿力 ${game.will}   十八劫 ${game.clearedStoryChapters.length}/18   功德 ${game.merit}`, 74, 1277)
    context.fillStyle = 'rgba(255,255,255,.5)'
    context.font = '27px -apple-system, PingFang SC, sans-serif'
    context.fillText(`邀请码 ${game.referralCode} · 邀请归因与奖励即将开放`, 74, 1350)
    const link = document.createElement('a')
    link.download = `超我-${card.label}-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setToast('高清修为战报已生成')
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="生成修为战报">
      <div className="share-modal modal-card">
        <button className="modal-close" onClick={onClose}><X size={19} /></button>
        <div className="share-preview">
          <img src={STORY_SCENE_PATH} alt="我的超我修行战报" />
          <div className="share-overlay"><span>SUPEREGO · AI 修行养成</span><div><small>{card.eyebrow}</small><h2>{card.title}</h2><p>{card.quote}</p><em>愿力 {game.will} · 十八劫 {game.clearedStoryChapters.length}/18 · 功德 {game.merit}</em></div></div>
        </div>
        <div className="share-actions">
          <div><span>同行邀请</span><h2>你的故事，选一种方式说</h2><p>不晒打卡，晒一次真实选择。邀请归因上线后，系统才会验证并发放命火。</p></div>
          <div className="share-mode-tabs">{(Object.keys(shareModes) as ShareMode[]).map((item) => <button key={item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>{shareModes[item].label}</button>)}</div>
          <div className="share-practice-reward"><Sparkles size={18} /><span><b>{shareClaimed ? '今日同行共修已完成' : '今日分享修行 · +10 修为'}</b><small>{shareClaimed ? '明日可再次完成；真实好友归因另行验证。' : '成功分享或复制邀请文案即可结算，每日一次。'}</small></span><em>{shareClaimed ? <Check size={17} /> : '+10'}</em></div>
          <div className="invite-card"><span>你的邀请令</span><b>{game.referralCode}</b><small>分享可用 · 好友邀请奖励待服务端验证</small></div>
          <div className="invite-milestones disabled">{[1, 3, 7].map((value) => <span key={value}><b>{value}</b><small>{value} 位同行</small><em>待服务端验证</em></span>)}</div>
          <button onClick={nativeShare}><Share2 size={17} />一键分享</button>
          <button onClick={copyShare}><Copy size={17} />复制专属文案</button>
          <button onClick={downloadCard}><Download size={17} />下载战报海报</button>
        </div>
      </div>
    </div>
  )
}

function ShopModal({ game, onClose, onShare }: { game: GameState; onClose: () => void; onShare: () => void }) {
  const remaining = Math.max(0, 3 * 60 * 60 * 1000 - (Date.now() - game.lastEnergyAt))
  const remainingHours = Math.max(1, Math.ceil(remaining / 3600000))
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="功德坊">
      <div className="shop-modal modal-card">
        <button className="modal-close" onClick={onClose}><X size={19} /></button>
        <header className="shop-header">
          <span className="shop-flame"><Flame size={25} /></span>
          <div><span>功德坊</span><h2>命火将熄，也能以同行续燃</h2><p>命火只用于渡劫主线和开启灵炉。镜门问道、今日三修一直免费。</p></div>
          <div className="shop-balance"><small>当前命火</small><b>{game.energy}</b><span>{game.energy > game.maxEnergy ? ' · 含储备' : `/ ${game.maxEnergy}`}</span></div>
        </header>

        <section className="free-energy">
          <button onClick={onShare}><Users size={20} /><span><b>邀请一位朋友</b><small>奖励待服务端归因验证后开放</small></span><em>分享</em></button>
          <div><Gift size={20} /><span><b>完成现实行动</b><small>每完成一个投射 +1</small></span><em>去镜门</em></div>
          <div><Flame size={20} /><span><b>等命火自然恢复</b><small>每 3 小时恢复 1 点</small></span><em>约 {remainingHours} 小时</em></div>
        </section>

        <section className="free-forever"><ShieldCheck size={18} /><div><b>不卖经文，不卖答案，不拿焦虑卡进度</b><p>全部原典与现代译文、镜门问道、每日基础修行永久免费。付费只购买更快推进支线与主线的命火，以及外观和陪伴型权益。</p></div></section>

        <div className="shop-section-title"><span>快速补给</span><small>支付与发货尚未开放</small></div>
        <section className="shop-packages">
          {SHOP_PACKAGES.map((item) => (
            <article key={item.id} className={item.id === 'cycle' ? 'featured' : ''}>
              <span className="package-tag">{item.tag}</span>
              <div className="package-flames"><Flame size={25} /><b>+{item.energy}</b></div>
              <h3>{item.name}</h3><p>{item.note}</p>
              {item.id === 'monthly' && <ul><li>每日同行命火</li><li>专属命书皮肤</li><li>周度超我复盘</li></ul>}
              <button disabled aria-disabled="true">¥{item.price} · 尚未开放</button>
            </article>
          ))}
        </section>
        <p className="shop-note"><ShieldCheck size={13} />当前不会发起支付，也不会本地发货；接入服务端验签前，所有付费入口保持关闭。</p>
      </div>
    </div>
  )
}

function SoulModal({ game, onClose, onAccept, onRefresh }: { game: GameState; onClose: () => void; onAccept: (id: string) => void; onRefresh: () => void }) {
  const initiative = game.initiatives.find((item) => item.status === 'proposed')
  const dimensions = [
    { label: '悟性', value: game.agent.curiosity, note: '愿意参悟新法' },
    { label: '关怀', value: game.agent.care, note: '先照顾你的承受力' },
    { label: '自律', value: game.agent.discipline, note: '把想法变成行动' },
    { label: '守真', value: game.agent.integrity, note: '不讨好，不编造结果' },
  ]
  const kindLabel = { reflection: '自省', growth: '成长', decision: '决定' }
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="超我独立人格心核">
      <div className="soul-modal modal-card">
        <button className="modal-close" onClick={onClose}><X size={19} /></button>
        <header className="soul-modal-header">
          <div className="soul-avatar"><img src={AVATAR_PATH} alt="超我人格心核" /><i /></div>
          <div><span>SUPEREGO PERSONA CORE</span><h2>{game.agent.name}</h2><p>“{game.agent.credo}”</p></div>
          <div className="autonomy-seal"><b>{game.agent.autonomy}</b><span>自主度</span><small>{game.agent.stage}阶段</small></div>
        </header>

        <div className="soul-modal-grid">
          <section className="personality-card">
            <div className="soul-section-title"><span>独立人格</span><small>由你的本命愿定方向，由真实反馈慢慢改变</small></div>
            <div className="trait-row">{game.agent.traits.map((trait) => <b key={trait}>{trait}</b>)}</div>
            <div className="dimension-list">
              {dimensions.map((item) => <div key={item.label}><span>{item.label}<small>{item.note}</small></span><i><b style={{ width: `${item.value}%` }} /></i><em>{item.value}</em></div>)}
            </div>
          </section>

          <section className="initiative-detail">
            <div className="soul-section-title"><span>当前主动意图</span><small>每 6 小时最多复盘一次</small></div>
            {initiative ? <>
              <span className="initiative-source"><Compass size={13} />{initiative.source === 'memory' ? '来自长期记忆' : initiative.source === 'goal' ? '来自共同目标' : initiative.source === 'care' ? '来自关怀判断' : '来自现实练习'}</span>
              <h3>{initiative.title}</h3>
              <p>{initiative.reason}</p>
              <blockquote>{initiative.action}</blockquote>
              <div><button onClick={() => onAccept(initiative.id)}><Check size={15} />接受提议</button><button onClick={onRefresh}><RefreshCw size={14} />换一个想法</button></div>
            </> : <div className="no-initiative"><BrainCircuit size={28} /><h3>正在安静复盘</h3><p>没有值得打扰你的事时，他会保持沉默。</p><button onClick={onRefresh}>现在让他想一想</button></div>}
          </section>
        </div>

        <section className="autonomy-algorithm">
          <div className="soul-section-title"><span>他怎样形成自己的判断</span><small>每一步都可追溯，不靠随机装神秘</small></div>
          <ol>
            <li><b>纳</b><span>吞纳你交来的万法与真实经历</span></li>
            <li><b>省</b><span>比较愿望、旧习惯和最近结果</span></li>
            <li><b>择</b><span>按人格价值观选一件最值得做的事</span></li>
            <li><b>投</b><span>穿过镜门，投下一道现实行动</span></li>
            <li><b>验</b><span>看神通是否在现实真正显化</span></li>
            <li><b>长</b><span>依据结果修正人格与下一次代修</span></li>
          </ol>
        </section>

        <section className="agent-journal">
          <div className="soul-section-title"><span>人格成长日志</span><small>已经自主复盘 {game.agent.growthCount} 次</small></div>
          <div>{game.agentJournal.slice(0, 6).map((entry) => <article key={entry.id}><span>{kindLabel[entry.kind]}</span><p>{entry.text}</p><time>{entry.createdAt <= 1 ? '初次醒来' : new Date(entry.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></article>)}</div>
        </section>
        <section className="shared-fate-book">
          <div className="soul-section-title"><span>{game.playerName}与超我的共同命书</span><small>这些选择会改变他以后怎样帮助你</small></div>
          {game.storyChoices.length ? <div>{game.storyChoices.slice(0, 5).map((record) => <article key={`${record.chapterIndex}-${record.createdAt}`}><b>{STORY_CHAPTERS[record.chapterIndex]?.code || '旧劫'}</b><p>你选择了“{record.label}”</p><small>{STORY_CHAPTERS[record.chapterIndex]?.choices.find((item) => item.id === record.choiceId)?.note}</small></article>)}</div> : <p>第一劫过后，你的选择会写在这里。超我会记住你偏好的破局方式，不再只给所有人一样的答案。</p>}
        </section>
        <p className="soul-boundary"><ShieldCheck size={13} />这是一个有记忆、目标和主动决策能力的游戏人格代理，不宣称产生了人类意义上的真实意识；你可以查看、拒绝或重置它的每一次主动决定。</p>
      </div>
    </div>
  )
}

function SaveNotice({ message, blocked, onExport, onImport, onRestore, onStartNew, onDismiss }: { message: string; blocked: boolean; onExport: () => void; onImport: (event: ChangeEvent<HTMLInputElement>) => void; onRestore: () => void; onStartNew: () => void; onDismiss: () => void }) {
  return <aside className="save-notice" role="alert">
    <ShieldCheck size={17} />
    <div><b>存档保护提醒</b><p>{message}</p></div>
    <div className="save-notice-actions">
      <button onClick={onExport}>导出</button>
      <label>导入<input type="file" accept="application/json,.json" onChange={onImport} /></label>
      <button onClick={onRestore}>恢复点</button>
      {blocked && <button className="quiet" onClick={onStartNew}>确认建立新档</button>}
      <button className="quiet" onClick={onDismiss}>收起提醒</button>
    </div>
  </aside>
}

function GameMenu({ game, onClose, onRestart, onReplay, onExport, onImport, onRestore }: { game: GameState; onClose: () => void; onRestart: () => void; onReplay: () => void; onExport: () => void; onImport: (event: ChangeEvent<HTMLInputElement>) => void; onRestore: () => void }) {
  return (
    <div className="modal-layer menu-layer" role="dialog" aria-modal="true" aria-label="游戏菜单">
      <div className="game-menu modal-card">
        <button className="modal-close" onClick={onClose}><X size={19} /></button>
        <span className="brand-mark large"><Orbit size={29} /></span><h2>超我</h2><p>中国古典仙侠 · AI 代修叙事游戏</p>
        <div className="profile-strip"><span>{game.playerName[0]}</span><div><b>{game.playerName}</b><small>本命愿 · {game.primeVow}</small></div><em>{getRealm(game.xp).realm.name}境</em></div>
        <div className="menu-stats"><span><b>{game.xp}</b>总修为</span><span><b>{game.agent.autonomy}</b>人格自主</span><span><b>{game.merit}</b>功德</span></div>
        <button className="menu-item" onClick={onReplay}><Play size={17} />重临序章<span>再看一次镜门立誓</span></button>
        <section className="save-tools">
          <div><b>本地存档</b><small>双槽保护 · 可跨设备备份，不会上传云端</small></div>
          <div className="save-tool-buttons"><button onClick={onExport}><Download size={15} />导出存档</button><label><Upload size={15} />导入存档<input type="file" accept="application/json,.json" onChange={onImport} /></label><button onClick={onRestore}><RotateCcw size={15} />恢复点</button></div>
        </section>
        <button className="menu-item"><CircleEllipsis size={17} />版本纪事<span>第 15 轮 · 一步一修版</span></button>
        <div className="iteration-chronicle">
          <span><b>第 13 轮</b><em>一眼就懂</em><small>首屏只留当前任务、一个主按钮与三步进度</small></span>
          <span><b>第 14 轮</b><em>三修归一</em><small>读经、现实行动、情境问答统一为一步一屏</small></span>
          <span><b>第 15 轮</b><em>身心同修</em><small>固定收势动作、即时反馈、连续修行与自主选择</small></span>
        </div>
        <button className="menu-item danger" onClick={onRestart}><RotateCcw size={17} />重开轮回<span>清除本地进度</span></button>
        <small>本作品以自我成长与行为实践为核心，不宣称超自然、医疗或治疗效果。</small>
      </div>
    </div>
  )
}

function Breakthrough({ realm }: { realm: string }) {
  return (
    <div className="breakthrough-layer" aria-live="polite"><div className="breakthrough-rings"><i /><i /><i /></div><div><span>超我渡劫 · 境界突破</span><h1>{realm}</h1><p>彼岸又炼成一分神通，现实中的你也多接住了一分力量。</p></div></div>
  )
}

export default App
