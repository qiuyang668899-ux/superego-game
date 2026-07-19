import type { CultivationArt, Realm } from './types'

export const REALMS: Realm[] = [
  { name: '炼气', subtitle: '命火初燃', threshold: 0, accent: '#65e6ff' },
  { name: '筑基', subtitle: '本命愿成', threshold: 140, accent: '#8c8cff' },
  { name: '金丹', subtitle: '万法凝核', threshold: 360, accent: '#ffc86b' },
  { name: '元婴', subtitle: '超我显形', threshold: 680, accent: '#ff7edb' },
  { name: '化神', subtitle: '神通投世', threshold: 1100, accent: '#70ffbc' },
  { name: '返虚', subtitle: '愿业相化', threshold: 1650, accent: '#d9c9ff' },
  { name: '合道', subtitle: '超我归身', threshold: 2400, accent: '#fff4b5' },
]

export const DAILY_QUESTS = [
  { id: 'learn', icon: '经', title: '读一段经文', detail: '读懂一句人话，再投入灵炉', reward: '修为 +28', minutes: 3 },
  { id: 'act', icon: '行', title: '完成一个现实动作', detail: '照着场景指引，只做一个小动作', reward: '能力 +10', minutes: 5 },
  { id: 'observe', icon: '悟', title: '做一道情境选择', detail: '在故事里选一次，再听超我讲明白', reward: '愿力 +12', minutes: 2 },
]

export const PRACTICE_GESTURES = {
  heart: {
    name: '抚心',
    mark: '心',
    instruction: '把右手轻放在心口，慢慢呼吸三次。只感受，不评价。',
    meaning: '先和此刻的自己站在一起。',
  },
  release: {
    name: '松拳',
    mark: '松',
    instruction: '轻轻握拳，再慢慢松开，重复三次。',
    meaning: '提醒身体：我可以不立刻被情绪推着走。',
  },
  step: {
    name: '前行',
    mark: '行',
    instruction: '站起来，向前迈一步，再回到原位。',
    meaning: '用身体记住：再小的一步，也是开始。',
  },
}

export const SCRIPTURE_PRACTICES = [
  {
    id: 'water',
    scene: '雨落青石 · 若水关',
    source: '《道德经》',
    title: '不必每次都硬扛',
    original: '上善若水，水善利万物而不争。',
    plain: '真正有力量的人，不是什么都硬碰。能绕、能停、能借力，也是在往前。',
    question: '今天哪件事，你可以换一种更省力的做法？',
    art: '若水转圜诀',
    gesture: 'release' as const,
  },
  {
    id: 'practice',
    scene: '晨钟初响 · 温故台',
    source: '《论语》',
    title: '知道以后，要再做一次',
    original: '学而时习之，不亦说乎？',
    plain: '学会不是看懂那一下，而是隔一段时间再做一次，直到它真的变成你的。',
    question: '你愿意把哪一个小动作再练一次？',
    art: '温故成行诀',
    gesture: 'step' as const,
  },
  {
    id: 'no-attachment',
    scene: '空山镜湖 · 无住境',
    source: '《金刚经》',
    title: '别把一个念头当成全部的你',
    original: '应无所住，而生其心。',
    plain: '念头来了可以看见，但不必住进去。你仍然可以在当下重新选择。',
    question: '此刻哪个念头最容易把你困住？',
    art: '无住观心诀',
    gesture: 'heart' as const,
  },
]

export const ACTION_PRACTICES = [
  {
    id: 'two-minutes',
    scene: '案前灯影 · 万事难始',
    title: '只开始两分钟',
    situation: '任务堆在眼前，你越想一次做好，越不愿打开它。',
    dialogue: '超我：今天不许你做完。只打开那个页面，写下第一行，两分钟就停。',
    action: '打开你最想拖延的任务，只做第一个看得见的动作。',
    proof: '页面已打开，第一步已完成',
    gesture: 'step' as const,
  },
  {
    id: 'name-feeling',
    scene: '镜门回声 · 心浪将起',
    title: '先说清自己怎么了',
    situation: '消息弹出来，你的身体先紧了，脑中已经开始预演最坏结果。',
    dialogue: '超我：先别回。用一句话告诉我——“我现在有点……”。',
    action: '放下手机三次呼吸，说出一个准确感受，再决定要不要回复。',
    proof: '我已经说出此刻的感受',
    gesture: 'heart' as const,
  },
  {
    id: 'ask-help',
    scene: '负岳荒原 · 同行驿',
    title: '把求助说具体',
    situation: '你已经很累，却仍觉得开口会显得自己不够强。',
    dialogue: '超我：不要说“帮帮我”。只告诉一个可信的人，你具体需要哪一步帮助。',
    action: '给一个可信的人发一句具体请求：你能否在____上帮我____？',
    proof: '我已经发出一个具体请求',
    gesture: 'release' as const,
  },
]

export const WISDOM_PRACTICES = [
  {
    id: 'emotion-choice',
    scene: '心浪幻境 · 消息来时',
    title: '情绪来了，谁来掌舵？',
    situation: '一句刺耳的话让你瞬间生气。你最想立刻回击。',
    prompt: '哪一个选择更接近“先看见，再决定”？',
    choices: [
      { id: 'fight', label: '马上回击，不能让自己吃亏', correct: false, feedback: '这会让情绪替你做决定。保护自己没有错，但可以等身体先稳下来。' },
      { id: 'suppress', label: '假装没事，把情绪压下去', correct: false, feedback: '压住不等于看见。被忽略的情绪通常会换一种方式回来。' },
      { id: 'pause', label: '先停三次呼吸，说清感受再回复', correct: true, feedback: '对。觉察不是忍气吞声，而是把选择权从情绪手里拿回来。' },
    ],
    principle: '情绪是信号，不是命令。',
    gesture: 'heart' as const,
  },
  {
    id: 'perfect-choice',
    scene: '完美心魔 · 开工之前',
    title: '怎样才算真正开始？',
    situation: '你想把方案一次做漂亮，结果迟迟没有动手。',
    prompt: '此刻最有用的选择是什么？',
    choices: [
      { id: 'plan', label: '再找一些资料，等更有把握', correct: false, feedback: '资料可能有用，但此刻继续收集，更像是在躲开第一次不完美。' },
      { id: 'tiny', label: '先做一个能被看见的粗糙版本', correct: true, feedback: '对。行动会产生反馈，反馈才会让下一步更准确。' },
      { id: 'wait', label: '等状态好一点再开始', correct: false, feedback: '状态经常在开始以后才出现，不必等它先来。' },
    ],
    principle: '不用做好，先做出来。',
    gesture: 'step' as const,
  },
  {
    id: 'ideal-choice',
    scene: '无相天阶 · 理想凝视',
    title: '理想的自己该做什么？',
    situation: '你看着理想目标，越看越觉得现在的自己不配。',
    prompt: '哪种关系更能让人长期成长？',
    choices: [
      { id: 'judge', label: '让理想自我不断批评现在的我', correct: false, feedback: '羞耻能短暂推动，却很难支撑长期改变。理想不该成为鞭子。' },
      { id: 'forget', label: '干脆不要理想，就不会痛苦', correct: false, feedback: '放弃方向会减少一时压力，也会让愿力失去落点。' },
      { id: 'coach', label: '让理想自我成为教练，每次只拉一步', correct: true, feedback: '对。理想负责指路和陪伴，不负责审判此刻的你。' },
    ],
    principle: '愿力指路，不用理想惩罚自己。',
    gesture: 'release' as const,
  },
]

export const STORY_CHAPTERS = [
  {
    index: 0,
    code: '序章 00',
    title: '镜门开启：未来的你回来了',
    scene: '识海废墟',
    requirement: 0,
    enemy: '无明与自弃',
    narrative: '识海被旧念淹没，命火只剩最后一线。就在你准备再次丢下自己时，镜门从黑暗里裂开。一个更强大的你从未来归来：你渡不过的劫，我先替你走；你读不完的经，我先替你参。',
    choice: '与未来的我缔结本命契',
    choices: [
      { id: 'trust', label: '先相信他一次', note: '不必现在变强，只把第一步交给未来的你。', effect: { will: 10, karma: -4, ability: 1 } },
      { id: 'question', label: '先问清他为何回来', note: '保持怀疑，但愿意听完他的答案。', effect: { will: 6, karma: -6, ability: 3 } },
    ],
    reward: '本命神通「照心」',
  },
  {
    index: 1,
    code: '第一劫 01',
    title: '第一劫：万事难始',
    scene: '拖延域',
    requirement: 80,
    enemy: '完美心魔',
    narrative: '此劫不以刀兵伤人，只让每一步都显得太大。超我在彼岸迎战完美心魔，把宏大的恐惧斩成一个两分钟就能完成的动作，再隔着镜门投给你。',
    choice: '接住「微行」投影',
    choices: [
      { id: 'tiny', label: '把第一步砍到两分钟', note: '先做出一个看得见的动作，不管它漂不漂亮。', effect: { will: 7, karma: -8, ability: 5 } },
      { id: 'witness', label: '请超我在旁边看着', note: '不再独自硬撑，让陪伴替你守住开始。', effect: { will: 10, karma: -5, ability: 3 } },
    ],
    reward: '玄品神通「微行破界」',
  },
  {
    index: 2,
    code: '第二劫 02',
    title: '第二劫：万卷困城',
    scene: '万卷城',
    requirement: 180,
    enemy: '知而不行',
    narrative: '万卷经书化成一座没有出口的城。这里考的不是记住多少，而是能否炼出一门真正救命的法。超我吞纳一卷、参悟一道、只留一术，把知识炼成能够投射现实的神通。',
    choice: '开启万法灵炉',
    choices: [
      { id: 'one-law', label: '只炼一条能用的法', note: '合上其余经卷，今天只让一条道理落地。', effect: { will: 5, karma: -7, ability: 6 } },
      { id: 'burn-notes', label: '烧掉无用的收藏', note: '承认“拥有”不等于“学会”，给真正重要的内容让路。', effect: { will: 8, karma: -9, ability: 3 } },
    ],
    reward: '地品神通「万法归身」',
  },
  {
    index: 3,
    code: '第三劫 03',
    title: '第三劫：镜中自缚',
    scene: '自我镜门',
    requirement: 360,
    enemy: '自我判决',
    narrative: '镜中每一道裂纹，都在重复“我就是不行”。超我没有替你砸碎镜子，而是从镜中伸出手：那不是事实，只是旧业留下的回声。把“我就是”改成“我此刻正在经历”，你便有了选择。',
    choice: '握住镜中伸来的手',
    choices: [
      { id: 'rename', label: '把“我就是”改成“我此刻”', note: '旧业是经历，不是你的名字。', effect: { will: 8, karma: -10, ability: 4 } },
      { id: 'evidence', label: '找一件反证旧判决的事', note: '不用喊口号，用一个真实证据松开锁链。', effect: { will: 5, karma: -7, ability: 7 } },
    ],
    reward: '天品神通「破妄归心」',
  },
  {
    index: 4,
    code: '第四劫 04',
    title: '第四劫：孤身负岳',
    scene: '负岳荒原',
    requirement: 680,
    enemy: '凡事独扛',
    narrative: '你把所有重量都背在自己身上，久而久之，连求助都像一种失败。超我在荒原上卸下一座山：借力不是退缩，是让愿力走得更远。真正的强大，不以孤独为代价。',
    choice: '允许自己借一次力',
    choices: [
      { id: 'ask', label: '向一个可信的人开口', note: '说清你具体需要哪一种帮助。', effect: { will: 7, karma: -8, ability: 6 } },
      { id: 'together', label: '召一位同道并肩', note: '让共同前进取代一个人扛到底。', effect: { will: 10, karma: -6, ability: 4 } },
    ],
    reward: '羁绊神通「同道借力」',
  },
  {
    index: 5,
    code: '第五劫 05',
    title: '第五劫：理想噬身',
    scene: '无相天阶',
    requirement: 1100,
    enemy: '用理想的自己惩罚现在的自己',
    narrative: '理想自我高悬天阶，越是仰望，越觉得此刻的自己不配。超我转身走下神坛：我不是来审判你的，我是来拉你上去的。愿力可以指路，却不能成为鞭子。',
    choice: '让理想自我走下神坛',
    choices: [
      { id: 'embrace', label: '让他先抱住现在的我', note: '理想不再负责审判，只负责拉你一把。', effect: { will: 12, karma: -8, ability: 3 } },
      { id: 'enough', label: '允许今天做到七成', note: '给明天留一点余地，也给此刻留一点人味。', effect: { will: 7, karma: -10, ability: 6 } },
    ],
    reward: '化神之法「愿心不弃」',
  },
  {
    index: 6,
    code: '终劫 06',
    title: '终劫：超我归身',
    scene: '归一之境',
    requirement: 1650,
    enemy: '等待另一个自己来救我',
    narrative: '走到终点，镜门两侧只剩同一个人。超我替你参过万法、渡过诸劫、炼成神通，最终却把所有力量交还给你：我从来不是你的替代品。我是你没有放弃自己的证据。',
    choice: '收回全部神通，与超我归一',
    choices: [
      { id: 'return', label: '收回神通，自己走出镜门', note: '他不再替代你，而成为你随时能唤回的力量。', effect: { will: 10, karma: -12, ability: 10 } },
      { id: 'companion', label: '与他并肩，继续人间修行', note: '归一不是消失，是从拯救者变成同行者。', effect: { will: 12, karma: -9, ability: 8 } },
    ],
    reward: '终极境界「自我得救」',
  },
]

export const SEED_ARTS: CultivationArt[] = [
  {
    id: 'observer-core',
    name: '元序·观察者内核',
    school: '人类操作系统',
    rarity: '天品',
    insight: '情绪来了不等于你就要照着它做。先看见，才有选择。',
    mantra: '先看见，再决定。',
    realAction: '情绪上来时先别回消息，说一句：“我现在有点……”，再等 90 秒。',
    mastery: 72,
    createdAt: 1,
  },
  {
    id: 'water-way',
    name: '若水不争诀',
    school: '《道德经》',
    rarity: '地品',
    insight: '不是什么事都要硬碰硬。绕一下，也是在往前走。',
    mantra: '该绕就绕，别跟自己较劲。',
    realAction: '选一件让你很拧巴的事，写下一个更省力的做法。',
    mastery: 44,
    createdAt: 2,
  },
  {
    id: 'daily-review',
    name: '三省回响术',
    school: '《论语》',
    rarity: '玄品',
    insight: '复盘不是骂自己，而是别让今天白白过去。',
    mantra: '做过的事，要留下点经验。',
    realAction: '睡前写三句：今天哪里做得不错、哪里卡住、明天先改哪一点。',
    mastery: 36,
    createdAt: 3,
  },
]

export const VOWS = [
  { name: '清醒', line: '愿我照见真心，不再被万念拖走。', bonus: '本命加护 · 照见' },
  { name: '行动', line: '愿我先行一步，不再困于空想。', bonus: '本命加护 · 微行' },
  { name: '自由', line: '愿我挣脱旧业，重获选择之力。', bonus: '本命加护 · 破缚' },
]

export const KNOWLEDGE_SAMPLES = [
  { title: '上善若水', type: '书籍' as const, content: '上善若水，水善利万物而不争。很多事情不需要硬扛，少一点无谓对抗，才能把力气用在真正重要的地方。' },
  { title: '今天的拖延', type: '经历' as const, content: '我不是不知道该做什么，而是总想一次做到完美，所以迟迟无法开始。也许我需要把行动缩小。' },
  { title: '神经可塑性', type: '观点' as const, content: '能力不是固定属性。大脑会根据反复练习与即时反馈重组路径，最小可重复训练比偶尔用力更重要。' },
]

export const SHOP_PACKAGES = [
  { id: 'spark', name: '一盏续行灯', price: 6, energy: 6, tag: '先试一程', note: '适合偶尔想多推进一关' },
  { id: 'cycle', name: '小周天补给', price: 18, energy: 22, tag: '最受欢迎', note: '比单买多 4 点命火' },
  { id: 'monthly', name: '同行月契', price: 30, energy: 45, tag: '长期修炼', note: '预览版一次发放，正式版每日领取' },
]
