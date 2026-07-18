export type CanonFamily = '儒' | '释' | '道' | '科' | '宗'

export interface CanonEntry {
  id: string
  family: CanonFamily
  tradition: string
  title: string
  subtitle: string
  era: string
  author: string
  sourceLabel: string
  sourceUrl?: string
  sourceCode?: string
  tags: string[]
  summary: string
  dao: string
  fa: string[]
  shu: string[]
  excerpt: string
  readingMinutes: number
  volumes: string
  featured?: boolean
}

const CBETA_URL = 'https://cbetaonline.dila.edu.tw/'
const CTEXT_URL = 'https://ctext.org/zh'
const GUTENBERG_URL = 'https://www.gutenberg.org/'

export const CANON_FAMILIES: Array<{ id: '全部' | CanonFamily; name: string; note: string }> = [
  { id: '全部', name: '万卷', note: '跨传统检索' },
  { id: '儒', name: '儒', note: '修身与人伦' },
  { id: '释', name: '释', note: '觉察与解脱' },
  { id: '道', name: '道', note: '自然与转化' },
  { id: '科', name: '科', note: '证据与模型' },
  { id: '宗', name: '宗', note: '信仰与终极关怀' },
]

export const CANON_ENTRIES: CanonEntry[] = [
  {
    id: 'analects', family: '儒', tradition: '先秦儒家', title: '论语', subtitle: '在关系与行动中成为君子', era: '春秋战国', author: '孔子弟子及再传弟子', sourceLabel: '中国哲学书电子化计划', sourceUrl: CTEXT_URL,
    sourceCode: '儒家经典', tags: ['修身', '仁', '学习', '关系'], summary: '以对话和短章讨论学习、仁爱、礼、政治与自我修养，核心不是背诵结论，而是在日常关系中反复校正自己。',
    dao: '人成为怎样的人，取决于他每天如何对待自己与别人。', fa: ['学而时习：知识必须反复练习', '克己复礼：欲望与边界要能被看见', '忠恕：既尽己，也能推己及人'], shu: ['今天选一句能执行的话', '做完一件事后用三句话复盘', '遇到冲突时先换位描述对方处境'], excerpt: '学而时习之，不亦说乎。', readingMinutes: 35, volumes: '20 篇', featured: true,
  },
  {
    id: 'mencius', family: '儒', tradition: '先秦儒家', title: '孟子', subtitle: '把心里微弱的善意养大', era: '战国', author: '孟子及其弟子', sourceLabel: '中国哲学书电子化计划', sourceUrl: CTEXT_URL,
    sourceCode: '儒家经典', tags: ['心性', '勇气', '选择', '仁政'], summary: '从恻隐、羞恶、辞让、是非四端出发，讨论人怎样在现实压力中保住内在方向，并把善的开端扩充成稳定人格。',
    dao: '人心有可以生长的方向，但需要环境、选择与练习共同保护。', fa: ['先辨义利，再做选择', '从四端看见价值感受', '以养气形成稳定行动'], shu: ['为一个选择写下“值得”和“代价”', '记录一次本可以冷漠但仍愿关心的时刻', '在压力下先守住一条不越过的底线'], excerpt: '虽千万人，吾往矣。', readingMinutes: 50, volumes: '7 篇', featured: true,
  },
  {
    id: 'great-learning', family: '儒', tradition: '四书', title: '大学', subtitle: '从格物到修身的成长路线', era: '先秦至宋代', author: '传统归于曾子学派', sourceLabel: '中国哲学书电子化计划', sourceUrl: CTEXT_URL,
    sourceCode: '四书', tags: ['系统', '修身', '目标', '秩序'], summary: '提出明明德、亲民、止于至善的总目标，并用格物、致知、诚意、正心、修身等步骤描述由内而外的成长路径。',
    dao: '外部秩序要长久，必须从内在认知、诚意和行为一致开始。', fa: ['先定最终方向', '再沿格物—致知—诚意—正心推进', '用修身连接个人与公共世界'], shu: ['给当前目标写一条“止于何处”', '检查一件事是否言行一致', '先整理一个最影响状态的环境角落'], excerpt: '知止而后有定。', readingMinutes: 18, volumes: '1 篇',
  },
  {
    id: 'doctrine-mean', family: '儒', tradition: '四书', title: '中庸', subtitle: '在变化中守住恰当', era: '先秦至宋代', author: '传统归于子思', sourceLabel: '中国哲学书电子化计划', sourceUrl: CTEXT_URL,
    sourceCode: '四书', tags: ['平衡', '诚', '情绪', '尺度'], summary: '中庸不是折中，而是在具体情境中找到不过与不及的恰当尺度；“诚”让内在价值与外在行动逐渐一致。',
    dao: '真正的稳定不是不变化，而是在变化里持续找到恰当。', fa: ['察两端而用其中', '情绪未发时先觉察', '以诚减少内外分裂'], shu: ['给一个冲突写出过度与不足两端', '情绪出现时延迟九十秒再回应', '选择一件可以更诚实表达的小事'], excerpt: '致中和，天地位焉，万物育焉。', readingMinutes: 25, volumes: '1 篇',
  },
  {
    id: 'xunzi', family: '儒', tradition: '先秦儒家', title: '荀子', subtitle: '用学习、礼法与环境塑造自己', era: '战国', author: '荀况', sourceLabel: '中国哲学书电子化计划', sourceUrl: CTEXT_URL,
    sourceCode: '诸子', tags: ['学习', '环境', '习惯', '制度'], summary: '强调人的欲望需要教育、礼法和长期积累来塑形，并系统讨论学习、劝学、天人关系与群体秩序。',
    dao: '不要等待天性自动变好，要用环境和制度帮助自己。', fa: ['积跬步形成长期变化', '借工具与老师提高学习效率', '用礼与边界协调群体欲望'], shu: ['把目标拆成今天的一跬步', '给坏习惯增加一个环境阻力', '给好习惯准备一个触发物'], excerpt: '不积跬步，无以至千里。', readingMinutes: 48, volumes: '32 篇',
  },

  {
    id: 'heart-sutra', family: '释', tradition: '般若部', title: '般若波罗蜜多心经', subtitle: '在执着中看见流动与空性', era: '唐', author: '玄奘译', sourceLabel: 'CBETA Online', sourceUrl: CBETA_URL,
    sourceCode: 'T0251', tags: ['空性', '般若', '焦虑', '觉察'], summary: '以高度凝练的语言说明五蕴与空性的关系，重点不是否定现实，而是减少把暂时状态当成固定自我的执着。',
    dao: '你正在经历的感受和身份都在变化，不必把一时困境判成永远。', fa: ['照见五蕴的构成', '不把经验抓成固定实体', '以般若穿过恐惧'], shu: ['把“我就是”改写成“我现在正在经历”', '观察一个感受如何出现、变化、消退', '为最担心的事写出三种可能结果'], excerpt: '色即是空，空即是色。', readingMinutes: 8, volumes: '1 卷', featured: true,
  },
  {
    id: 'diamond-sutra', family: '释', tradition: '般若部', title: '金刚般若波罗蜜经', subtitle: '行动，但不被结果和身份绑住', era: '后秦', author: '鸠摩罗什译', sourceLabel: 'CBETA Online', sourceUrl: CBETA_URL,
    sourceCode: 'T0235', tags: ['无住', '行动', '执着', '慈悲'], summary: '通过佛陀与须菩提的问答，讨论如何发心、行动与帮助众生，同时不执着于自我形象、功德和固定概念。',
    dao: '认真行动，同时不把结果占为自我价值的证明。', fa: ['发心而不住相', '用筏喻理解方法不是目的', '以无我松开身份执着'], shu: ['做一件好事但不等待回报', '完成任务后不立刻评价自己', '把一个绝对判断改成可检验假设'], excerpt: '应无所住而生其心。', readingMinutes: 22, volumes: '1 卷', featured: true,
  },
  {
    id: 'lotus-sutra', family: '释', tradition: '法华部', title: '妙法莲华经', subtitle: '每个人都有可以抵达的道路', era: '姚秦', author: '鸠摩罗什译', sourceLabel: 'CBETA Online', sourceUrl: CBETA_URL,
    sourceCode: 'T0262', tags: ['一乘', '方便', '潜能', '叙事'], summary: '以大量譬喻说明教法会因人而异，但最终指向觉悟；它强调方便善巧和对每个生命潜能的信任。',
    dao: '路径可以不同，重要的是它是否真的帮助生命醒来。', fa: ['以方便适应不同根器', '用譬喻跨越抽象概念', '以一乘统合多种路径'], shu: ['为同一目标设计难、中、易三种做法', '用一个生活比喻解释难懂概念', '不要用同一标准要求所有人'], excerpt: '唯以一大事因缘故，出现于世。', readingMinutes: 80, volumes: '7 卷',
  },
  {
    id: 'vimalakirti', family: '释', tradition: '经集部', title: '维摩诘所说经', subtitle: '把修行带回城市和日常关系', era: '姚秦', author: '鸠摩罗什译', sourceLabel: 'CBETA Online', sourceUrl: CBETA_URL,
    sourceCode: 'T0475', tags: ['入世', '不二', '关系', '日常'], summary: '以居士维摩诘为中心，讨论不二、空性、慈悲与在家生活中的修行，提醒人不必逃离现实才可能成长。',
    dao: '真正的修行能进入工作、家庭、疾病与冲突，而不是只在理想环境里成立。', fa: ['从对立走向不二观察', '在烦恼处练习智慧', '以沉默保留不可说的复杂性'], shu: ['在一个冲突里同时写下两边的合理处', '把今天最烦的事当成一次观察练习', '少说一句结论，多问一个问题'], excerpt: '随其心净，则佛土净。', readingMinutes: 45, volumes: '3 卷',
  },
  {
    id: 'platform-sutra', family: '释', tradition: '禅宗', title: '六祖大师法宝坛经', subtitle: '在当下心念中看见与行动', era: '唐至元', author: '惠能说、宗宝编', sourceLabel: 'CBETA Online', sourceUrl: CBETA_URL,
    sourceCode: 'T2008', tags: ['禅宗', '顿悟', '自性', '行动'], summary: '记录惠能的生平与说法，强调觉悟不只依赖身份和文字积累，而在当下能否看见自己的心并落实于行。',
    dao: '知识地位不能替你觉察，真正的变化发生在此刻看见并转身。', fa: ['定慧不二', '于念而不住念', '从自性出发而不自我神化'], shu: ['念头出现时先说“我看见这个念头”', '把一句道理改成今天的一个动作', '不以懂得多少评价一个人'], excerpt: '何期自性，本自清净。', readingMinutes: 38, volumes: '1 卷',
  },
  {
    id: 'dhammapada', family: '释', tradition: '本缘部', title: '法句经', subtitle: '用短句训练每天的心与行', era: '吴', author: '维祇难等译', sourceLabel: 'CBETA Online', sourceUrl: CBETA_URL,
    sourceCode: 'T0210', tags: ['短句', '行为', '心念', '日课'], summary: '以短偈汇集修行要点，涉及心念、言语、行为、精进、安忍与智慧，适合作为每日一小段的行动提醒。',
    dao: '生活方向由反复出现的心念和行为塑造。', fa: ['先治心，再看外境', '以不放逸维持方向', '用善行替代伤害循环'], shu: ['每天只选一偈练习', '说话前问它会减少还是增加伤害', '睡前记录一次没有被旧习惯带走的时刻'], excerpt: '心为法本，心尊心使。', readingMinutes: 30, volumes: '2 卷',
  },
  {
    id: 'huayan', family: '释', tradition: '华严部', title: '大方广佛华严经', subtitle: '在互相依存的世界里发愿行动', era: '唐', author: '实叉难陀译', sourceLabel: 'CBETA Online', sourceUrl: CBETA_URL,
    sourceCode: 'T0279', tags: ['缘起', '系统', '愿行', '菩萨道'], summary: '以宏大的世界观描述万事万物彼此关联，并通过菩萨行与普贤行愿，把觉悟落实为长期、广大的行动方向。',
    dao: '任何改变都不是孤立发生的；个人成长会进入关系和世界的网络。', fa: ['以法界缘起理解互相依存', '用愿统合长期行动', '在一行中看见整体'], shu: ['画出一个问题的关系网络', '为长期愿望写一个今天的最小行动', '做决定时多看一个受影响的人'], excerpt: '一即一切，一切即一。', readingMinutes: 120, volumes: '80 卷',
  },

  {
    id: 'dao-de-jing', family: '道', tradition: '先秦道家', title: '道德经', subtitle: '减少强求，让行动顺着事物本身', era: '先秦', author: '传统归于老子', sourceLabel: '中国哲学书电子化计划', sourceUrl: CTEXT_URL,
    sourceCode: '道家经典', tags: ['无为', '柔弱', '领导', '自然'], summary: '以道、德、无为、柔弱与反转讨论个人和治理，核心不是消极不做，而是减少违背规律的强行控制。',
    dao: '世界不断变化，强行占有和控制往往把事情推向反面。', fa: ['无为而无不为', '守柔处下', '知足知止'], shu: ['删掉一个不必要步骤', '在冲突里先降低力度', '给目标设一个够用的停止线'], excerpt: '上善若水，水善利万物而不争。', readingMinutes: 42, volumes: '81 章', featured: true,
  },
  {
    id: 'zhuangzi', family: '道', tradition: '先秦道家', title: '庄子', subtitle: '松开唯一视角，恢复生命的游动', era: '战国', author: '庄周及后学', sourceLabel: '中国哲学书电子化计划', sourceUrl: CTEXT_URL,
    sourceCode: '道家经典', tags: ['逍遥', '视角', '生死', '自由'], summary: '通过寓言和辩论松动固定标准，讨论视角差异、技艺、生命有限与精神自由，训练人不被单一身份和评价困死。',
    dao: '你看到的只是一个视角；生命可以在更大的尺度里重新获得空间。', fa: ['齐物：比较不同立场的边界', '心斋：减少预设再观察', '庖丁解牛：让技艺顺着结构生长'], shu: ['把问题从另一个人的视角重写', '先观察结构再用力', '给自己半小时不被绩效定义的时间'], excerpt: '且夫水之积也不厚，则其负大舟也无力。', readingMinutes: 95, volumes: '33 篇', featured: true,
  },
  {
    id: 'liezi', family: '道', tradition: '道家', title: '列子', subtitle: '用故事看见判断与命运的限度', era: '先秦至魏晋', author: '传统归于列御寇', sourceLabel: '中国哲学书电子化计划', sourceUrl: CTEXT_URL,
    sourceCode: '道家典籍', tags: ['寓言', '认知', '命运', '行动'], summary: '以寓言讨论知识边界、人生变化、技艺与命运，让读者在故事的反转中检查自己的确定感。',
    dao: '很多确定判断只是信息不足时的临时解释。', fa: ['以寓言制造认知距离', '区分可控与不可控', '让技艺经过长期熟化'], shu: ['给一个确定结论补上“也可能”', '列出今天可控的三件事', '对熟悉动作做一次慢速观察'], excerpt: '天地无全功，圣人无全能，万物无全用。', readingMinutes: 48, volumes: '8 篇',
  },
  {
    id: 'yinfu', family: '道', tradition: '道教经典', title: '黄帝阴符经', subtitle: '观察变化中的时机与反作用', era: '成书年代有争议', author: '传统托名黄帝', sourceLabel: '公共领域古籍索引', sourceUrl: CTEXT_URL,
    sourceCode: '道教经典', tags: ['时机', '变化', '系统', '反作用'], summary: '篇幅短而解释传统众多，围绕天人变化、机与制讨论行动如何嵌入更大的规律。',
    dao: '行动不是孤立的，它会触发系统的回响与反作用。', fa: ['观察变化的机', '行动前判断系统反馈', '避免只看眼前收益'], shu: ['为一个决策写下二阶后果', '等一个情绪峰值过去再行动', '寻找系统中最小但关键的杠杆'], excerpt: '观天之道，执天之行。', readingMinutes: 12, volumes: '1 卷',
  },
  {
    id: 'baopuzi', family: '道', tradition: '魏晋道教', title: '抱朴子内篇', subtitle: '古代修炼、伦理与知识系统的样本', era: '东晋', author: '葛洪', sourceLabel: '公共领域古籍索引', sourceUrl: CTEXT_URL,
    sourceCode: '道教典籍', tags: ['修炼史', '知识史', '伦理', '方法'], summary: '保存魏晋时期关于神仙信仰、养生、炼丹、伦理与知识分类的大量材料，适合以思想史和方法史视角研读，不应视作现代医学建议。',
    dao: '古人试图把精神追求、身体实践与道德生活放进同一套成长系统。', fa: ['区分历史语境与现代证据', '比较修炼目标和伦理条件', '从古代分类法理解知识史'], shu: ['把一条古代主张标成信仰、经验或可检验假设', '不把炼丹内容用于现实医疗', '比较古今对“长生”的不同理解'], excerpt: '欲求仙者，要当以忠孝和顺仁信为本。', readingMinutes: 70, volumes: '20 卷',
  },
  {
    id: 'taishang-response', family: '道', tradition: '劝善传统', title: '太上感应篇', subtitle: '用每日行为账本理解因果伦理', era: '宋代', author: '作者不详', sourceLabel: '公共领域古籍索引', sourceUrl: CTEXT_URL,
    sourceCode: '道教劝善书', tags: ['伦理', '因果', '行为', '日课'], summary: '以善恶感应组织日常伦理，在传统社会形成广泛影响；可作为行为自省文本阅读，不把其中超自然因果当作科学结论。',
    dao: '人的长期处境会被每天反复做的选择塑造。', fa: ['以行为清单帮助自省', '把善恶落到具体关系', '重视小行为的累积'], shu: ['睡前记一件减少伤害的行为', '修复一个今天造成的小麻烦', '把超自然陈述与行为伦理分开阅读'], excerpt: '祸福无门，惟人自召。', readingMinutes: 20, volumes: '1 卷',
  },

  {
    id: 'elements', family: '科', tradition: '数学', title: '几何原本', subtitle: '从定义、公设到证明的思考机器', era: '古希腊', author: '欧几里得', sourceLabel: 'Project Gutenberg', sourceUrl: GUTENBERG_URL,
    sourceCode: '数学史', tags: ['数学', '公理', '证明', '逻辑'], summary: '用定义、公设和逐步证明组织几何知识，奠定演绎体系范式；重要的不只是结论，而是怎样从共同前提出发建立可靠推理。',
    dao: '复杂结论可以从少量清楚前提一步步推出。', fa: ['先定义对象', '公开基本假设', '每一步都能回到前提'], shu: ['为争论先定义关键词', '把一个结论拆成三步推理', '找出自己默认但没说出的假设'], excerpt: '从共同前提开始，证明才有可检查的道路。', readingMinutes: 90, volumes: '13 卷', featured: true,
  },
  {
    id: 'principia', family: '科', tradition: '物理学', title: '自然哲学的数学原理', subtitle: '用数学模型连接天上与地上的运动', era: '1687', author: '艾萨克·牛顿', sourceLabel: 'Project Gutenberg', sourceUrl: GUTENBERG_URL,
    sourceCode: '物理学史', tags: ['物理', '模型', '运动', '预测'], summary: '以运动定律和万有引力统一解释多种运动现象，展示科学模型如何用少量规律产生广泛预测。',
    dao: '好的模型能用共同规律解释看似不同的现象，并接受预测检验。', fa: ['把现象转成可测变量', '建立关系模型', '用新情境检验预测'], shu: ['给问题找一个可测指标', '区分观察事实与解释模型', '写下什么证据会推翻你的判断'], excerpt: '模型的价值，在于解释与预测都能被检验。', readingMinutes: 120, volumes: '3 卷',
  },
  {
    id: 'origin-species', family: '科', tradition: '生物学', title: '物种起源', subtitle: '从变异、选择与时间理解演化', era: '1859', author: '查尔斯·达尔文', sourceLabel: 'Project Gutenberg', sourceUrl: GUTENBERG_URL,
    sourceCode: '生物学史', tags: ['演化', '选择', '适应', '时间'], summary: '用大量观察论证共同祖先与自然选择，改变了人类理解生命多样性的方式，也展示长期累积如何产生巨大变化。',
    dao: '复杂适应不一定来自预先设计，也可能由微小差异在长期选择中累积。', fa: ['观察变异', '识别选择压力', '把时间尺度纳入解释'], shu: ['记录同一习惯的三种微小变体', '保留更容易重复的版本', '用一周而不是一天评价改变'], excerpt: '微小差异经过足够时间，也能形成巨大分化。', readingMinutes: 95, volumes: '1 部', featured: true,
  },
  {
    id: 'principles-psychology', family: '科', tradition: '心理学', title: '心理学原理', subtitle: '从注意、习惯与意识流理解心智', era: '1890', author: '威廉·詹姆斯', sourceLabel: 'Project Gutenberg', sourceUrl: GUTENBERG_URL,
    sourceCode: '心理学史', tags: ['心理', '注意', '习惯', '意识'], summary: '系统讨论意识流、注意、习惯、情绪和意志，是现代心理学早期重要著作；部分结论属于历史阶段，需要结合当代研究阅读。',
    dao: '注意把经验中的某部分变成你的现实，习惯则让重复行动越来越省力。', fa: ['观察意识流而不等同于它', '用注意选择当前任务', '用重复与环境塑造习惯'], shu: ['设置十五分钟单任务时间', '给新习惯一个固定触发点', '记录分心出现前发生了什么'], excerpt: '注意与习惯，是心智训练的两个入口。', readingMinutes: 110, volumes: '2 卷',
  },
  {
    id: 'wealth-nations', family: '科', tradition: '经济学', title: '国富论', subtitle: '分工、交换与制度如何塑造繁荣', era: '1776', author: '亚当·斯密', sourceLabel: 'Project Gutenberg', sourceUrl: GUTENBERG_URL,
    sourceCode: '经济学史', tags: ['经济', '分工', '市场', '制度'], summary: '讨论劳动分工、交换、价格、资本与公共制度，是经济学史的重要起点；阅读时应结合其时代背景和后续理论修正。',
    dao: '个体选择会通过交换和制度形成超出个人意图的整体结果。', fa: ['看见分工提高效率的条件', '区分价格信号与真实价值', '分析制度怎样改变激励'], shu: ['把复杂任务按专长重新分工', '检查一个指标是否替代了真实目标', '为规则列出它会鼓励的行为'], excerpt: '制度与激励，会悄悄改变每个人的选择。', readingMinutes: 120, volumes: '5 卷',
  },
  {
    id: 'critique-reason', family: '科', tradition: '哲学', title: '纯粹理性批判', subtitle: '检查人类认识能够走到哪里', era: '1781', author: '伊曼努尔·康德', sourceLabel: 'Project Gutenberg', sourceUrl: GUTENBERG_URL,
    sourceCode: '认识论', tags: ['哲学', '认识', '边界', '理性'], summary: '追问经验知识如何可能，并区分现象、范畴与理性的边界；它提醒我们，思考能力强不等于可以越过经验随意断言。',
    dao: '认识世界时，心智结构也参与塑造经验；理性需要知道自己的边界。', fa: ['区分经验材料与理解框架', '检查概念的适用边界', '不把不可验证问题伪装成知识'], shu: ['给一个观点标注事实、解释或信念', '写下现有证据能支持到哪一步', '对超出证据的部分保留“不知道”'], excerpt: '理性成熟的一部分，是知道自己不能证明什么。', readingMinutes: 140, volumes: '1 部',
  },

  {
    id: 'bible', family: '宗', tradition: '基督教', title: '圣经', subtitle: '创造、盟约、爱与救赎的经典群', era: '多时期汇编', author: '多位作者', sourceLabel: '经典目录索引',
    sourceCode: '旧约与新约', tags: ['基督教', '爱', '救赎', '盟约'], summary: '由不同历史时期的多种文类组成，涵盖创造、历史、诗歌、先知、福音与早期教会书信；不同教派的正典范围和解释传统有所差异。',
    dao: '人在与上帝、他人和共同体的关系中理解责任、爱、罪与更新。', fa: ['以盟约理解关系责任', '以悔改完成方向转变', '以爱邻舍连接信仰与行动'], shu: ['修复一个被忽略的关系', '承认一件需要改正的事', '做一件不求回报的照顾行动'], excerpt: '爱不是抽象情绪，也会成为对邻人的具体责任。', readingMinutes: 180, volumes: '多卷经典', featured: true,
  },
  {
    id: 'quran', family: '宗', tradition: '伊斯兰教', title: '古兰经', subtitle: '独一、慈悯、责任与正道', era: '7 世纪', author: '伊斯兰传统视为启示', sourceLabel: '经典目录索引',
    sourceCode: '114 章', tags: ['伊斯兰教', '慈悯', '正义', '敬畏'], summary: '伊斯兰教核心经典，以阿拉伯语诵读传统为中心，讨论真主独一、慈悯、审判、伦理与共同体责任；译文通常被视为意义解释。',
    dao: '生命处在更大的秩序与责任之中，敬畏应当落实为正义和慈悯。', fa: ['以记念保持方向', '用斋戒训练欲望与同理', '以施舍连接信仰和社会责任'], shu: ['今天克制一次冲动消费', '给有需要的人一次实际帮助', '做决定前检查是否公正'], excerpt: '真正的敬畏，应在诚实、节制与慈悯中被看见。', readingMinutes: 160, volumes: '114 章', featured: true,
  },
  {
    id: 'tanakh', family: '宗', tradition: '犹太教', title: '塔纳赫', subtitle: '律法、先知与著作中的共同体记忆', era: '多时期汇编', author: '多位作者', sourceLabel: '经典目录索引',
    sourceCode: 'Torah · Nevi’im · Ketuvim', tags: ['犹太教', '律法', '记忆', '盟约'], summary: '由妥拉、先知书和圣录构成，保存创造、出埃及、律法、历史、诗歌与智慧传统，是犹太共同体记忆和解释生活的核心文本。',
    dao: '共同体通过记忆、律法和不断解释，把价值带过历史断裂。', fa: ['以盟约连接自由与责任', '用纪念抵抗遗忘', '通过解释传统回应新问题'], shu: ['记录一段塑造家庭价值的故事', '为自由选择写下对应责任', '邀请不同解释进入同一问题'], excerpt: '记住从哪里来，才能知道自由要承担什么。', readingMinutes: 180, volumes: '24 卷',
  },
  {
    id: 'pirkei-avot', family: '宗', tradition: '犹太教', title: '先贤篇', subtitle: '把伦理教导变成每日学习', era: '约 2—3 世纪', author: '拉比传统汇编', sourceLabel: '经典目录索引',
    sourceCode: '密西拿伦理篇', tags: ['犹太教', '伦理', '学习', '共同体'], summary: '汇集拉比先贤关于学习、工作、判断、责任与人际伦理的短句，适合与注释和讨论共同研读。',
    dao: '伦理智慧不只来自个人顿悟，也在代际讨论和共同体实践中形成。', fa: ['固定学习时间', '谨慎判断别人', '让学习带来行动'], shu: ['每天留十分钟学习', '评价他人前补充一个未知条件', '把今天学到的一句变成行动'], excerpt: '你不必完成全部工作，但也不能因此放弃开始。', readingMinutes: 25, volumes: '6 章',
  },
  {
    id: 'bhagavad-gita', family: '宗', tradition: '印度教', title: '薄伽梵歌', subtitle: '在责任、行动与超越之间作选择', era: '约公元前后', author: '《摩诃婆罗多》组成部分', sourceLabel: '公共领域经典索引',
    sourceCode: '18 章', tags: ['印度教', '行动', '责任', '瑜伽'], summary: '以战场上的对话讨论责任、行动、知识、奉爱与解脱，形成业瑜伽、智瑜伽和奉爱瑜伽等多条实践路径。',
    dao: '无法逃离所有行动，但可以改变行动的动机、专注和对结果的执着。', fa: ['以业瑜伽承担责任', '以智瑜伽辨别自我', '以奉爱瑜伽稳定方向'], shu: ['把注意力放在可完成的责任上', '行动前写下动机', '完成后放下对赞许的控制'], excerpt: '专注于行动本身，不把结果当作唯一的自我证明。', readingMinutes: 65, volumes: '18 章', featured: true,
  },
  {
    id: 'upanishads', family: '宗', tradition: '印度教', title: '奥义书选', subtitle: '从自我、实在与意识追问终极问题', era: '约公元前 8 世纪起', author: '多部文本、多位传承者', sourceLabel: '公共领域经典索引',
    sourceCode: '主要奥义书', tags: ['印度教', '自我', '意识', '终极实在'], summary: '以师徒对话、寓言和沉思探索梵、我、意识、死亡与解脱，对印度哲学和多种瑜伽传统影响深远。',
    dao: '表层身份不断变化，对“我是谁”的追问可以进入更深的意识与存在层面。', fa: ['以否定法松开概念执着', '用师徒问答推进理解', '通过沉思观察自我经验'], shu: ['列出三个会变化的自我标签', '安静观察五分钟“谁在觉察”', '把终极问题和现实责任同时保留'], excerpt: '追问“我是谁”，不是逃离生活，而是检查身份的边界。', readingMinutes: 80, volumes: '选集',
  },
  {
    id: 'yoga-sutra', family: '宗', tradition: '印度教·瑜伽', title: '瑜伽经', subtitle: '训练心念、专注与自由的实践地图', era: '约公元前后', author: '传统归于帕坦伽利', sourceLabel: '公共领域经典索引',
    sourceCode: '4 篇', tags: ['印度教', '瑜伽', '专注', '心念'], summary: '用简短经句系统说明心念活动、练习、离欲、八支瑜伽与解脱；身体姿势只是更大修习体系的一部分。',
    dao: '自由来自能看见心念活动，而不是被每个心念自动带走。', fa: ['练习与离欲并行', '以八支瑜伽组织生活', '通过专注走向观照'], shu: ['坐直并观察呼吸五分钟', '念头出现时只标记“想法”', '今天减少一个让心更散乱的输入'], excerpt: '瑜伽，是让心念的波动逐渐安定。', readingMinutes: 35, volumes: '4 篇',
  },
  {
    id: 'guru-granth', family: '宗', tradition: '锡克教', title: '古鲁·格兰特·萨希卜', subtitle: '在记念、平等与服务中生活', era: '15—17 世纪', author: '多位古鲁与圣贤诗人', sourceLabel: '经典目录索引',
    sourceCode: '锡克教核心经典', tags: ['锡克教', '平等', '服务', '记念'], summary: '以诗歌和圣歌表达独一神、记念、诚实劳动、分享与人类平等，是锡克教持续在场的古鲁。',
    dao: '灵性生活应在诚实劳动、平等关系和无私服务中被验证。', fa: ['以记念稳定心念', '以诚实劳动承担生活', '以服务打破自我中心'], shu: ['认真完成一件普通工作', '分享一部分时间或资源', '在称呼和行动中平等对待一个人'], excerpt: '信仰若不能进入劳动、分享与平等，就仍停在口头。', readingMinutes: 120, volumes: '诗歌经典',
  },
]
