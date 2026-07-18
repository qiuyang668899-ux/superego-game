import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
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
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react'
import { DAILY_QUESTS, KNOWLEDGE_SAMPLES, REALMS, SHOP_PACKAGES, STORY_CHAPTERS, VOWS } from './gameData'
import { CANON_ENTRIES, CANON_FAMILIES } from './scriptureData'
import { hasFullCanon, loadCanonIndex, loadCanonSection } from './canonText'
import { askSuperego, needsImmediateSupport } from './coachApi'
import {
  buildProjection,
  acceptAgentInitiative,
  coachReply,
  configureAgent,
  DEFAULT_STATE,
  distillKnowledge,
  getRealm,
  growAgent,
  loadGame,
  resetGame,
  runAutonomousCycle,
  saveGame,
} from './gameEngine'
import type { CanonEntry, CanonFamily } from './scriptureData'
import type { CanonDocumentIndex, CanonTextSection } from './canonText'
import type { CultivationArt, GameState, KnowledgeType, TabId } from './types'

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`
const AVATAR_PATH = `${ASSET_BASE}superego-avatar.jpg`

const tabItems: Array<{ id: TabId; label: string; note: string; icon: typeof Home }> = [
  { id: 'cave', label: '灵台', note: '超我代修', icon: Home },
  { id: 'library', label: '经阁', note: '投卷炼法', icon: LibraryBig },
  { id: 'destiny', label: '天命', note: '七劫主线', icon: Orbit },
  { id: 'mirror', label: '镜门', note: '神通归身', icon: MessageCircleMore },
]

const sceneNames: Record<TabId, string> = {
  cave: '灵台 · 代修道场',
  library: '经阁 · 万法灵炉',
  destiny: '天命 · 七劫天路',
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
  const [game, setGame] = useState<GameState>(() => ({ ...loadGame(), activeTab: 'cave' }))
  const [toast, setToast] = useState('')
  const [showStory, setShowStory] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [showSoul, setShowSoul] = useState(false)
  const [showPrologue, setShowPrologue] = useState(false)
  const [breakthrough, setBreakthrough] = useState('')
  const previousRealm = useRef(getRealm(game.xp).index)

  useEffect(() => saveGame(game), [game])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      ;['scene-lingtai.jpg', 'scene-library.jpg', 'scene-destiny.jpg', 'scene-mirror.jpg', 'superego-avatar.jpg'].forEach((file) => {
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

  const completeQuest = (questId: string) => {
    const progress = game.quests.find((quest) => quest.id === questId)
    if (progress?.completed) return
    patchGame((current) => growAgent({
      ...current,
      xp: current.xp + 18,
      will: clamp(current.will + 12),
      karma: clamp(current.karma - 3),
      ability: clamp(current.ability + (current.will > current.karma ? 4 : 2)),
      merit: current.merit + 5,
      energy: questId === 'act' ? Math.min(current.maxEnergy, current.energy + 1) : current.energy,
      quests: current.quests.map((quest) => quest.id === questId ? { ...quest, completed: true } : quest),
    }, questId === 'observe' ? 'observe' : questId === 'learn' ? 'learn' : 'act', questId === 'act' ? '你真的完成了一步。我把“少讲道理、多看结果”写进了自己的判断。' : '我从你今天的选择里又多认识了你一点。'))
    playTone(game.soundOn, 'reward')
    setToast(questId === 'act' ? '做到了 · 修为 +18，命火 +1' : '今天这件小事做到了 · 修为 +18')
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

  const advanceStory = () => {
    const chapter = STORY_CHAPTERS[Math.min(game.storyIndex, STORY_CHAPTERS.length - 1)]
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
    patchGame((current) => growAgent({
      ...current,
      storyIndex: nextIndex,
      xp: current.xp + 36,
      will: clamp(current.will + 8),
      karma: clamp(current.karma - 8),
      merit: current.merit + 12,
      energy: Math.max(0, current.energy - 2),
    }, 'story', `我们一起走过了“${chapter.title}”。我会把这一关的结果带进以后主动做出的决定。`))
    setShowStory(false)
    playTone(game.soundOn, 'breakthrough')
    setToast(`${chapter.reward} · 这一关过了`)
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
      projections: current.projections.map((item) => item.id === projectionId ? { ...item, completed: true } : item),
      initiatives: current.initiatives.map((item) => item.id === projection.initiativeId ? { ...item, status: 'completed' as const } : item),
      arts: current.arts.map((art) => art.id === projection.artId ? { ...art, mastery: clamp(art.mastery + 8) } : art),
    }, 'act', projection.initiativeId ? '我的主动提议在现实中显化了。我会提高类似判断的优先级。' : '彼岸神通已在现实显化一次。我会少让你收藏，多把真正可用的法投回来。'))
    playTone(game.soundOn, 'reward')
    setToast('神通显化 · 能力归身 +10，命火 +1')
  }

  const purchaseEnergy = (packageId: string, amount: number, name: string) => {
    patchGame((current) => ({
      ...current,
      energy: current.energy + amount,
      purchaseHistory: [`${packageId}-${Date.now()}`, ...current.purchaseHistory].slice(0, 30),
    }))
    setShowShop(false)
    playTone(game.soundOn, 'reward')
    setToast(`${name}已到账 · 命火 +${amount}（预览版未真实扣款）`)
  }

  const claimShareReward = () => {
    const today = new Date().toLocaleDateString('en-CA')
    if (game.shareRewardDate === today) {
      setToast('今天的分享命火已经领过了，明天再来')
      return
    }
    patchGame((current) => ({ ...current, energy: current.energy + 1, shareRewardDate: today }))
    setToast('邀请链接已复制 · 今日分享命火 +1')
  }

  const simulateInvite = () => {
    patchGame((current) => ({ ...current, energy: current.energy + 3, inviteCount: current.inviteCount + 1 }))
    playTone(game.soundOn, 'reward')
    setToast('好友完成序章 · 你们各得命火 +3')
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
    resetGame()
    setGame({ ...DEFAULT_STATE, arts: [...DEFAULT_STATE.arts], quests: [...DEFAULT_STATE.quests] })
    setShowMenu(false)
    setToast('轮回已重置')
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

      <main className="game-main">
        {game.activeTab === 'cave' && (
          <CaveScreen
            game={game}
            onQuest={completeQuest}
            onStory={() => setShowStory(true)}
            onLibrary={() => patchGame({ activeTab: 'library' })}
            onMirror={() => patchGame({ activeTab: 'mirror' })}
            onSoul={() => setShowSoul(true)}
            onAcceptInitiative={acceptInitiative}
            onRefreshInitiative={refreshInitiative}
          />
        )}
        {game.activeTab === 'library' && <LibraryScreen game={game} patchGame={patchGame} onProject={projectArt} onShop={() => setShowShop(true)} setToast={setToast} />}
        {game.activeTab === 'destiny' && <DestinyScreen game={game} onQuest={completeQuest} onStory={() => setShowStory(true)} />}
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
      {showStory && <StoryModal game={game} onClose={() => setShowStory(false)} onAdvance={advanceStory} />}
      {showShare && <ShareModal game={game} realmLabel={`${realmState.realm.name} ${realmState.layer} 层`} onClose={() => setShowShare(false)} setToast={setToast} onShareReward={claimShareReward} onInviteAccepted={simulateInvite} />}
      {showShop && <ShopModal game={game} onClose={() => setShowShop(false)} onPurchase={purchaseEnergy} onShare={() => { setShowShop(false); setShowShare(true) }} />}
      {showSoul && <SoulModal game={game} onClose={() => setShowSoul(false)} onAccept={acceptInitiative} onRefresh={refreshInitiative} />}
      {showMenu && <GameMenu game={game} onClose={() => setShowMenu(false)} onRestart={restart} onReplay={() => { setShowMenu(false); setShowPrologue(true) }} />}
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
        <button onClick={onShop} className="energy-button" aria-label="打开功德坊补充命火"><Flame size={16} /><span>命火</span><b>{game.energy}</b><small>/{game.maxEnergy}</small><Plus size={14} /></button>
        <button onClick={onShare} className="icon-button" aria-label="生成修为战报"><Share2 size={18} /></button>
        <button onClick={onSound} className="icon-button" aria-label={game.soundOn ? '关闭声音' : '打开声音'}>{game.soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
        <button onClick={onMenu} className="icon-button" aria-label="打开菜单"><Menu size={19} /></button>
      </div>
    </header>
  )
}

function CaveScreen({ game, onQuest, onStory, onLibrary, onMirror, onSoul, onAcceptInitiative, onRefreshInitiative }: { game: GameState; onQuest: (id: string) => void; onStory: () => void; onLibrary: () => void; onMirror: () => void; onSoul: () => void; onAcceptInitiative: (id: string) => void; onRefreshInitiative: () => void }) {
  const realm = getRealm(game.xp)
  const story = STORY_CHAPTERS[Math.min(game.storyIndex, STORY_CHAPTERS.length - 1)]
  const completed = game.quests.filter((quest) => quest.completed).length
  const latestArt = [...game.arts].sort((a, b) => b.createdAt - a.createdAt)[0]
  return (
    <div className="screen cave-screen">
      <section className="cave-grid">
        <aside className="story-panel glass-panel">
          <div className="panel-label"><ScrollText size={14} />七劫主线</div>
          <div className="story-code">{story.code}</div>
          <h2>{story.title}</h2>
          <p>{story.narrative.slice(0, 91)}……</p>
          <div className="enemy-line"><Swords size={15} /><span>此劫心魔</span><b>{story.enemy}</b></div>
          <button className="game-button primary" onClick={onStory}>
            {game.xp >= story.requirement ? <Play size={16} /> : <LockKeyhole size={16} />}
            {game.xp >= story.requirement ? '入劫 · 继续主线' : `还差 ${story.requirement - game.xp} 修为`}
          </button>
          <div className="chapter-dots">
            {STORY_CHAPTERS.map((chapter) => <i key={chapter.index} className={chapter.index < game.storyIndex ? 'passed' : chapter.index === game.storyIndex ? 'active' : ''} />)}
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

      <section className="latest-art-banner">
        <div className="art-sigil"><Sparkles size={21} /></div>
        <div><span>超我新悟神通</span><h3>{latestArt.name}</h3><p>{latestArt.insight}</p></div>
        <button onClick={onMirror}>投影归身<ArrowRight size={15} /></button>
      </section>
    </div>
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

      <div className="canon-license-note"><ShieldCheck size={14} /><p><b>原典永久免费：</b>四书五经、佛道原典、科学史名著与多宗教经典均可直接打开，不设付费墙、不消耗命火。每部书独立展示来源与授权，现代译文按完成度如实标注并持续校勘。</p><a href="https://www.cbeta.org/copyright" target="_blank" rel="noreferrer">查看 CBETA 授权<ExternalLink size={12} /></a></div>

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
        const nextSection = await loadCanonSection(entry.id, descriptor.file, controller.signal)
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
      const nextSection = cached || await loadCanonSection(entry.id, descriptor.file)
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

  const coverage = document ? Math.round(document.translationCoverage * 100) : 0
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
              ? document.sections.map((item, index) => <button className={sectionIndex === index ? 'active' : ''} key={item.id} onClick={() => void openSection(index)}><small>第 {index + 1} / {document.sections.length}</small><span>{display(item.title)}</span><em>{Math.round(item.translationCoverage * 100)}% 已译</em></button>)
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
                  <p><b>原典全文已入阁</b><span>{section.translationStatus === 'complete' ? document!.translationLabel : `本书现代译文已完成 ${coverage}%，其余段落正在生成与校勘。原典始终可以完整阅读。`}</span></p>
                </div>
                <div className={`reader-paragraphs mode-${mode}`}>
                  {section.original.map((paragraph, paragraphIndex) => {
                    const modern = section.modern[paragraphIndex]?.trim()
                    return (
                      <article className="reader-pair" data-reader-paragraph={paragraphIndex} key={`${section.id}-${paragraphIndex}`}>
                        {mode !== 'guide' && <div className="reader-source-block"><small>原典 · 第 {paragraphIndex + 1} 段</small><p lang={document!.originalLanguage} dir={document!.originalDirection || 'auto'}>{display(paragraph)}</p></div>}
                        {mode !== 'source' && (modern
                          ? <div className="reader-guide-block"><small>现代译文</small><p>{display(modern)}</p></div>
                          : <div className="reader-guide-block reader-translation-pending"><small>现代译文 · 校勘中</small><p>这段译文正在生成。你可以先读原典，完成后会自动补进同一位置。</p></div>)}
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
  return (
    <div className="screen destiny-screen">
      <header className="screen-header">
        <div><span className="eyebrow"><Orbit size={15} />七劫天路 · 超我代修主线</span><h1>他在未来渡劫，只为回来拉你一把</h1><p>愿力为他点燃命火，万法助他炼成神通；你在现实中接住投射，能力才真正归你所有。</p></div>
        <button className="game-button subtle" onClick={onStory}><ScrollText size={16} />入劫 · 继续主线</button>
      </header>

      <section className="destiny-dashboard">
        <article className="current-realm-card">
          <span>当前境界</span><div className="realm-seal"><b>{current.realm.name[0]}</b></div>
          <h2>{current.realm.name} · {current.layer} 层</h2><p>{current.realm.subtitle}</p>
          <div className="large-progress"><i style={{ width: `${current.progress}%` }} /></div><small>{current.progress}% · 累计修为 {game.xp}</small>
        </article>
        <div className="principle-card glass-panel">
          <span>核心法则</span><h2>愿力 ＞ 业力 ＞ 能力</h2>
          <div className="principle-flow"><b>愿</b><i /><b>破</b><i /><b>化</b><i /><b>能</b></div>
          <p>愿力，是你仍不肯放弃自己的誓；业力，是把你拖回原处的旧路；能力，是超我神通在现实中一次次显化后，真正归身的力量。</p>
        </div>
        <div className="merit-card glass-panel"><Trophy size={25} /><span>功德</span><b>{game.merit}</b><small>已完成的善意行动与自我照料</small></div>
      </section>

      <section className="realm-road">
        <div className="section-title"><div><span>七境代修</span><h2>超我如何从命火走到归一</h2></div><small>不是变成别人，而是让理想自我回来拥抱此刻的你</small></div>
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
          {DAILY_QUESTS.map((quest) => {
            const done = game.quests.find((item) => item.id === quest.id)?.completed
            return <button key={quest.id} className={done ? 'done' : ''} onClick={() => onQuest(quest.id)}><span>{done ? <Check /> : quest.icon}</span><b>{quest.title}</b><p>{quest.detail}</p><em>{done ? '今天做过了' : `${quest.minutes} 分钟 · ${quest.reward}`}</em></button>
          })}
        </div>
      </section>
    </div>
  )
}

function MirrorScreen({ game, patchGame, onComplete, setToast }: { game: GameState; patchGame: (value: Partial<GameState> | ((current: GameState) => GameState)) => void; onComplete: (id: string) => void; setToast: (value: string) => void }) {
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [heartStatus, setHeartStatus] = useState<'ready' | 'online' | 'local'>('ready')
  const feedRef = useRef<HTMLDivElement>(null)
  const pending = game.projections.filter((projection) => !projection.completed)

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
      messages: [...current.messages, { id: crypto.randomUUID(), role: 'self' as const, text }].slice(-28),
    }))
    setInput('')
    setThinking(true)
    playTone(game.soundOn, 'soft')

    let response = ''
    let memoryNotes: string[] = []
    try {
      if (needsImmediateSupport(text)) {
        response = coachReply(text, game)
        setHeartStatus('local')
      } else {
        const result = await askSuperego(text, game)
        response = result.reply
        memoryNotes = result.memoryNotes
        setHeartStatus('online')
      }
    } catch (error) {
      response = coachReply(text, game)
      setHeartStatus('local')
      const detail = error instanceof Error ? error.message : ''
      setToast(detail.includes('问得有些密') ? detail : '云端心核暂时未连接，已由本地心诀先接住你')
    } finally {
      patchGame((current) => {
        const known = new Set(current.coachMemories.map((item) => item.text))
        const additions = memoryNotes
          .filter((item) => !known.has(item))
          .map((item) => ({ id: crypto.randomUUID(), text: item, createdAt: Date.now() }))
        return growAgent({
          ...current,
          coachMemories: [...current.coachMemories, ...additions].slice(-16),
          messages: [...current.messages, { id: crypto.randomUUID(), role: 'superego' as const, text: response }].slice(-28),
        }, 'chat', memoryNotes.length
          ? `我记住了这次对话里可长期复用的背景：${memoryNotes.join('；')}`
          : '我从这次对话里更新了对你的理解，但不会把你一时的情绪当成永远不变的性格。')
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
            <span className={`bond heart-${heartStatus}`}>{heartStatus === 'online' ? '智能心核 · 已连接' : heartStatus === 'local' ? '本地心诀 · 代守' : `羁绊 ${Math.min(99, 22 + game.merit)}%`}</span>
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
              <summary><BrainCircuit size={13} />心识记忆 · {game.coachMemories.length} 条 <span>仅存本机</span></summary>
              <div>
                {game.coachMemories.length
                  ? game.coachMemories.slice(-6).map((memory) => <p key={memory.id}>{memory.text}</p>)
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

function StoryModal({ game, onClose, onAdvance }: { game: GameState; onClose: () => void; onAdvance: () => void }) {
  const chapter = STORY_CHAPTERS[Math.min(game.storyIndex, STORY_CHAPTERS.length - 1)]
  const unlocked = game.xp >= chapter.requirement
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label={chapter.title}>
      <div className="story-modal modal-card">
        <button className="modal-close" onClick={onClose}><X size={19} /></button>
        <div className="story-visual"><img src={AVATAR_PATH} alt="超我穿过镜门" /><div /><span>{chapter.scene}</span></div>
        <div className="story-body">
          <span className="story-code">{chapter.code}</span><h2>{chapter.title}</h2><p>{chapter.narrative}</p>
          <div className="boss-card"><span><Swords size={17} /></span><div><small>此劫心魔</small><b>{chapter.enemy}</b></div><em>业力 {Math.max(8, game.karma)}</em></div>
          <div className="story-reward"><Trophy size={16} /><span>过关奖励</span><b>{chapter.reward}</b></div>
          <button className="game-button primary" onClick={onAdvance} disabled={!unlocked}>{unlocked ? <Zap size={17} /> : <LockKeyhole size={17} />}{unlocked ? `${chapter.choice} · 消耗 2 命火` : `还需 ${chapter.requirement - game.xp} 修为`}</button>
          <blockquote>超我：“此劫我先替你破，炼成的法，终会一寸不少地还给你。”</blockquote>
        </div>
      </div>
    </div>
  )
}

function ShareModal({ game, realmLabel, onClose, setToast, onShareReward, onInviteAccepted }: { game: GameState; realmLabel: string; onClose: () => void; setToast: (value: string) => void; onShareReward: () => void; onInviteAccepted: () => void }) {
  const quote = game.ability >= 60 ? '他在彼岸渡劫，我在此刻接住一步。' : '我让未来的自己替我修仙，再回来度我。'
  const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${game.referralCode}`
  const shareText = `我在《超我》修到「${realmLabel}」了。\n我把经典、笔记和困境投进万法灵炉，让未来的自己替我渡劫、炼成神通，再回来度我。\n\n${quote}\n\n邀请码：${game.referralCode}\n${inviteUrl}\n好友完成序章后，我们各得 3 点命火。`

  const copyShare = async () => {
    await navigator.clipboard.writeText(shareText)
    onShareReward()
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
    image.src = AVATAR_PATH
    await image.decode()
    context.globalAlpha = 0.9
    context.drawImage(image, 0, 0, image.width, image.height, 190, 80, 700, 1060)
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
    context.fillText('我的超我', 74, 1002)
    context.fillStyle = '#ffe39a'
    context.font = '700 58px -apple-system, PingFang SC, sans-serif'
    context.fillText(realmLabel, 74, 1080)
    context.fillStyle = 'rgba(255,255,255,.75)'
    context.font = '34px -apple-system, PingFang SC, sans-serif'
    context.fillText(quote, 74, 1160)
    context.fillStyle = 'rgba(255,255,255,.12)'
    context.fillRect(74, 1210, 932, 1)
    context.fillStyle = '#ffffff'
    context.font = '600 31px -apple-system, PingFang SC, sans-serif'
    context.fillText(`愿力 ${game.will}   功法 ${game.arts.length}   功德 ${game.merit}`, 74, 1277)
    context.fillStyle = 'rgba(255,255,255,.5)'
    context.font = '27px -apple-system, PingFang SC, sans-serif'
    context.fillText(`邀请码 ${game.referralCode} · 好友过序章双方得命火`, 74, 1350)
    const link = document.createElement('a')
    link.download = `超我修为战报-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setToast('高清修为战报已生成')
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="生成修为战报">
      <div className="share-modal modal-card">
        <button className="modal-close" onClick={onClose}><X size={19} /></button>
        <div className="share-preview">
          <img src={AVATAR_PATH} alt="我的超我修为战报" />
          <div className="share-overlay"><span>SUPEREGO · AI 修行养成</span><div><small>我的超我</small><h2>{realmLabel}</h2><p>{quote}</p><em>愿力 {game.will} · 功法 {game.arts.length} · 功德 {game.merit}</em></div></div>
        </div>
        <div className="share-actions">
          <div><span>同行邀请</span><h2>叫一位朋友，一起把路走长</h2><p>好友完成序章后，你们各得 3 点命火。每天首次分享还可得 1 点。</p></div>
          <div className="invite-card"><span>你的邀请令</span><b>{game.referralCode}</b><small>已有 {game.inviteCount} 位朋友与你同行</small></div>
          <button onClick={copyShare}><Copy size={17} />复制邀请链接 · 今日 +1</button>
          <button onClick={downloadCard}><Download size={17} />下载战报海报</button>
          <button className="preview-invite" onClick={onInviteAccepted}><Users size={17} />模拟好友完成序章（预览）</button>
        </div>
      </div>
    </div>
  )
}

function ShopModal({ game, onClose, onPurchase, onShare }: { game: GameState; onClose: () => void; onPurchase: (id: string, amount: number, name: string) => void; onShare: () => void }) {
  const remaining = Math.max(0, 3 * 60 * 60 * 1000 - (Date.now() - game.lastEnergyAt))
  const remainingHours = Math.max(1, Math.ceil(remaining / 3600000))
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="功德坊">
      <div className="shop-modal modal-card">
        <button className="modal-close" onClick={onClose}><X size={19} /></button>
        <header className="shop-header">
          <span className="shop-flame"><Flame size={25} /></span>
          <div><span>功德坊</span><h2>命火将熄，也能以同行续燃</h2><p>命火只用于渡劫主线和开启灵炉。镜门问道、今日三修一直免费。</p></div>
          <div className="shop-balance"><small>当前命火</small><b>{game.energy}</b><span>/ {game.maxEnergy}</span></div>
        </header>

        <section className="free-energy">
          <button onClick={onShare}><Users size={20} /><span><b>邀请一位朋友</b><small>好友过序章，双方 +3</small></span><em>免费</em></button>
          <div><Gift size={20} /><span><b>完成现实行动</b><small>每完成一个投射 +1</small></span><em>去镜门</em></div>
          <div><Flame size={20} /><span><b>等命火自然恢复</b><small>每 3 小时恢复 1 点</small></span><em>约 {remainingHours} 小时</em></div>
        </section>

        <div className="shop-section-title"><span>快速补给</span><small>预览版不会真实扣款</small></div>
        <section className="shop-packages">
          {SHOP_PACKAGES.map((item) => (
            <article key={item.id} className={item.id === 'cycle' ? 'featured' : ''}>
              <span className="package-tag">{item.tag}</span>
              <div className="package-flames"><Flame size={25} /><b>+{item.energy}</b></div>
              <h3>{item.name}</h3><p>{item.note}</p>
              <button onClick={() => onPurchase(item.id, item.energy, item.name)}>¥{item.price} · 体验购买</button>
            </article>
          ))}
        </section>
        <p className="shop-note"><ShieldCheck size={13} />本地演示不会发起支付。正式上线需接入微信支付或 Apple IAP，并由服务端核验发货。</p>
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
        <p className="soul-boundary"><ShieldCheck size={13} />这是一个有记忆、目标和主动决策能力的游戏人格代理，不宣称产生了人类意义上的真实意识；你可以查看、拒绝或重置它的每一次主动决定。</p>
      </div>
    </div>
  )
}

function GameMenu({ game, onClose, onRestart, onReplay }: { game: GameState; onClose: () => void; onRestart: () => void; onReplay: () => void }) {
  return (
    <div className="modal-layer menu-layer" role="dialog" aria-modal="true" aria-label="游戏菜单">
      <div className="game-menu modal-card">
        <button className="modal-close" onClick={onClose}><X size={19} /></button>
        <span className="brand-mark large"><Orbit size={29} /></span><h2>超我</h2><p>中国古典仙侠 · AI 代修叙事游戏</p>
        <div className="profile-strip"><span>{game.playerName[0]}</span><div><b>{game.playerName}</b><small>本命愿 · {game.primeVow}</small></div><em>{getRealm(game.xp).realm.name}境</em></div>
        <div className="menu-stats"><span><b>{game.xp}</b>总修为</span><span><b>{game.agent.autonomy}</b>人格自主</span><span><b>{game.merit}</b>功德</span></div>
        <button className="menu-item" onClick={onReplay}><Play size={17} />重临序章<span>再看一次镜门立誓</span></button>
        <button className="menu-item"><CircleEllipsis size={17} />版本纪事<span>第 9 轮 · 超我代修版</span></button>
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
