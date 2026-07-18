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
  { id: 'observe', icon: '照', title: '照见本心', detail: '闭眼三息，说出此刻真正的感受', reward: '愿力 +12', minutes: 1 },
  { id: 'learn', icon: '炼', title: '投一卷入灵炉', detail: '把一段经典、笔记或困境交给超我参悟', reward: '修为 +18', minutes: 3 },
  { id: 'act', icon: '显', title: '接住一次投射', detail: '让超我的神通在现实中显化一步', reward: '能力 +10', minutes: 5 },
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
