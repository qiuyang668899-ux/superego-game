import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname)
const OUTPUT = join(ROOT, 'public', 'canon')
const CBETA_ROOT = process.env.CBETA_ROOT || '/tmp/cbeta-normal-text'
const CLASSICAL_ROOT = process.env.CLASSICAL_ROOT || '/tmp/classical-modern'

const cbetaBooks = [
  { id: 'heart-sutra', title: '般若波罗蜜多心经', code: 'T0251', dir: 'T/T08/T08n0251', edition: 'CBETA 大正新修大藏经 T0251' },
  { id: 'diamond-sutra', title: '金刚般若波罗蜜经', code: 'T0235', dir: 'T/T08/T08n0235', edition: 'CBETA 大正新修大藏经 T0235' },
  { id: 'lotus-sutra', title: '妙法莲华经', code: 'T0262', dir: 'T/T09/T09n0262', edition: 'CBETA 大正新修大藏经 T0262' },
  { id: 'vimalakirti', title: '维摩诘所说经', code: 'T0475', dir: 'T/T14/T14n0475', edition: 'CBETA 大正新修大藏经 T0475' },
  { id: 'platform-sutra', title: '六祖大师法宝坛经', code: 'T2008', dir: 'T/T48/T48n2008', edition: 'CBETA 大正新修大藏经 T2008' },
  { id: 'dhammapada', title: '法句经', code: 'T0210', dir: 'T/T04/T04n0210', edition: 'CBETA 大正新修大藏经 T0210' },
  { id: 'huayan', title: '大方广佛华严经', code: 'T0279', dir: 'T/T10/T10n0279', edition: 'CBETA 大正新修大藏经 T0279' },
]

const classicalBooks = [
  { id: 'analects', title: '论语', dir: '论语', edition: 'NiuTrans 古今汉语平行语料整理本' },
  { id: 'mencius', title: '孟子', dir: '孟子', edition: 'NiuTrans 古今汉语平行语料整理本' },
  { id: 'great-learning', title: '大学', dir: '大学章句集注', edition: '《大学章句集注》古今对照整理本' },
  { id: 'doctrine-mean', title: '中庸', dir: '中庸', edition: 'NiuTrans 古今汉语平行语料整理本' },
  { id: 'xunzi', title: '荀子', dir: '荀子', edition: 'NiuTrans 古今汉语平行语料整理本' },
  { id: 'dao-de-jing', title: '道德经', dir: '老子', edition: '《老子》古今对照整理本' },
  { id: 'zhuangzi', title: '庄子', dir: '庄子', edition: 'NiuTrans 古今汉语平行语料整理本' },
]

const canonicalChapterOrder = {
  analects: ['学而篇', '为政篇', '八佾篇', '里仁篇', '公冶长篇', '雍也篇', '述而篇', '泰伯篇', '子罕篇', '乡党篇', '先进篇', '颜渊篇', '子路篇', '宪问篇', '卫灵公篇', '季氏篇', '阳货篇', '微子篇', '子张篇', '尧曰篇'],
  mencius: ['梁惠王章句上', '梁惠王章句下', '公孙丑章句上', '公孙丑章句下', '滕文公章句上', '滕文公章句下', '离娄章句上', '离娄章句下', '万章章句上', '万章章句下', '告子章句上', '告子章句下', '尽心章句上', '尽心章句下'],
  xunzi: ['劝学', '修身', '不苟', '荣辱', '非相', '非十二子', '仲尼', '儒效', '王制', '富国', '王霸', '君道', '臣道', '致士', '议兵', '强国', '天论', '正论', '礼论', '乐论', '解蔽', '正名', '性恶', '君子', '成相', '赋', '大略', '宥坐', '子道', '法行', '哀公', '尧问'],
  'dao-de-jing': ['道经', '德经'],
  zhuangzi: ['逍遥游', '齐物论', '养生主', '人间世', '德充符', '大宗师', '应帝王', '骈拇', '马蹄', '胠箧', '在宥', '天地', '天道', '天运', '刻意', '缮性', '秋水', '至乐', '达生', '山木', '田子方', '知北游', '庚桑楚', '徐无鬼', '则阳', '外物', '寓言', '让王', '盗跖', '说剑', '渔父', '列御寇', '天下'],
}

const cbetaSource = (code) => ({
  label: 'CBETA 中华电子佛典协会',
  url: `https://cbetaonline.dila.edu.tw/zh/${code}`,
  code,
  license: 'CBETA 非商业使用条款 / CC BY-NC-SA 4.0（依具体文件标示）',
  licenseUrl: 'https://www.cbeta.org/copyright',
  commercialUse: 'restricted',
  notice: '《超我》经文阅读区永久开放，不设付费墙。原典免费提供；版本、校勘与版权说明以 CBETA 官方为准。',
})

const classicalSource = {
  label: 'NiuTrans Classical-Modern 开放语料',
  url: 'https://github.com/NiuTrans/Classical-Modern',
  license: 'MIT（各书目原始来源另见上游“数据来源”文件）',
  licenseUrl: 'https://github.com/NiuTrans/Classical-Modern/blob/main/LICENSE',
  commercialUse: 'review-required',
  notice: '原文与现代译文来自开放平行语料整理；译文仍需持续校勘，正式商业发行前逐书完成来源权利复核。',
}

function cleanCbetaLines(raw) {
  const paragraphs = []
  let buffer = ''
  const flush = () => {
    const text = buffer.replace(/\s+/g, '').trim()
    if (text && !/^No\.\s*\d+/.test(text)) paragraphs.push(text)
    buffer = ''
  }

  for (const row of raw.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const divider = row.indexOf('║')
    let text = (divider >= 0 ? row.slice(divider + 1) : row).trim()
    if (!text) {
      flush()
      continue
    }
    if (/^No\.\s*\d+/.test(text)) {
      flush()
      continue
    }
    const heading = text.length <= 32 && /(經|经|品|序|譯|译|撰|卷|疏|讚|赞|咒曰|偈曰)$/.test(text)
    if (heading) {
      flush()
      paragraphs.push(text)
      continue
    }
    buffer += text
    if (/[。！？；：」』]$/.test(text)) flush()
  }
  flush()
  return paragraphs
}

function chineseNumber(value) {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  if (value < 10) return digits[value]
  if (value < 20) return `十${value % 10 ? digits[value % 10] : ''}`
  const tens = Math.floor(value / 10)
  const ones = value % 10
  return `${digits[tens]}十${ones ? digits[ones] : ''}`
}

function translationStatus(coverage) {
  if (coverage >= 0.995) return 'complete'
  if (coverage > 0) return 'in-progress'
  return 'unavailable'
}

async function writeDocument(book, source, rawSections, translationLabel) {
  const bookDir = join(OUTPUT, book.id)
  await mkdir(bookDir, { recursive: true })
  const sections = []

  for (let index = 0; index < rawSections.length; index += 1) {
    const current = rawSections[index]
    const id = String(index + 1).padStart(3, '0')
    const file = `${id}.json`
    const originalCharacters = current.original.join('').length
    const translationCharacters = current.modern.join('').length
    const translatedOriginalCharacters = current.original.reduce((sum, text, paragraphIndex) => sum + (current.modern[paragraphIndex]?.trim() ? text.length : 0), 0)
    const coverage = originalCharacters ? translatedOriginalCharacters / originalCharacters : 0
    const section = {
      id,
      title: current.title,
      original: current.original,
      modern: current.original.map((_, paragraphIndex) => current.modern[paragraphIndex] || ''),
      translationStatus: translationStatus(coverage),
    }
    await writeFile(join(bookDir, file), `${JSON.stringify(section)}\n`)
    sections.push({ id, title: current.title, file, originalCharacters, translationCharacters, translationCoverage: Number(coverage.toFixed(4)) })
  }

  const originalCharacters = sections.reduce((sum, section) => sum + section.originalCharacters, 0)
  const translationCharacters = sections.reduce((sum, section) => sum + section.translationCharacters, 0)
  const translatedOriginalCharacters = sections.reduce((sum, section) => sum + section.originalCharacters * section.translationCoverage, 0)
  const coverage = originalCharacters ? translatedOriginalCharacters / originalCharacters : 0
  const document = {
    schemaVersion: 1,
    id: book.id,
    title: book.title,
    edition: book.edition,
    source,
    completeness: 'full',
    originalCharacters,
    translationCharacters,
    translationCoverage: Number(coverage.toFixed(4)),
    translationStatus: translationStatus(coverage),
    translationLabel,
    sections,
  }
  await writeFile(join(bookDir, 'index.json'), `${JSON.stringify(document)}\n`)
  return document
}

async function importCbeta(book) {
  const sourceDir = join(CBETA_ROOT, book.dir)
  const files = (await readdir(sourceDir)).filter((file) => file.endsWith('.txt')).sort()
  const sections = []
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const raw = await readFile(join(sourceDir, file), 'utf8')
    const original = cleanCbetaLines(raw)
    const detectedTitle = original.find((paragraph) => paragraph.length < 36 && /(卷第|品第)/.test(paragraph))
    sections.push({
      title: detectedTitle || (files.length === 1 ? '全卷' : `第${chineseNumber(index + 1)}卷`),
      original,
      modern: [],
    })
  }
  return writeDocument(book, cbetaSource(book.code), sections, '《超我》现代译解 · 生成与校勘中')
}

async function findFiles(directory, name, output = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await findFiles(path, name, output)
    else if (entry.name === name) output.push(path)
  }
  return output
}

function chineseNumeralValue(text) {
  const digits = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
  const matched = text.match(/第([零一二两三四五六七八九十百]+)[章节篇]/)
  if (!matched) return Number.POSITIVE_INFINITY
  const value = matched[1]
  if (!value.includes('十') && !value.includes('百')) return digits[value] ?? Number.POSITIVE_INFINITY
  let total = 0
  let current = 0
  for (const character of value) {
    if (character === '百') { total += (current || 1) * 100; current = 0 }
    else if (character === '十') { total += (current || 1) * 10; current = 0 }
    else current = digits[character] ?? current
  }
  return total + current
}

function chapterRank(bookId, segments) {
  const order = canonicalChapterOrder[bookId] || []
  const direct = order.indexOf(segments[0])
  if (direct >= 0) {
    const nestedNumber = chineseNumeralValue(segments[1] || '')
    return direct * 1000 + (Number.isFinite(nestedNumber) ? nestedNumber : 0)
  }
  const nested = order.indexOf(segments.at(-1))
  if (nested >= 0) return nested * 1000
  const numeric = chineseNumeralValue(segments.join(''))
  return Number.isFinite(numeric) ? numeric : 1_000_000
}

function sortChapterFiles(book, root, files) {
  return files.sort((left, right) => {
    const leftSegments = relative(root, left).split('/').slice(0, -1)
    const rightSegments = relative(root, right).split('/').slice(0, -1)
    const rankDifference = chapterRank(book.id, leftSegments) - chapterRank(book.id, rightSegments)
    return rankDifference || left.localeCompare(right, 'zh-CN', { numeric: true })
  })
}

async function importClassical(book) {
  const originalDir = join(CLASSICAL_ROOT, '古文原文', book.dir)
  const pairedDir = join(CLASSICAL_ROOT, '双语数据', book.dir)
  const originalFiles = sortChapterFiles(book, originalDir, await findFiles(originalDir, 'text.txt'))
  const sections = []
  for (const originalFile of originalFiles) {
    const sectionPath = relative(originalDir, originalFile).split('/').slice(0, -1)
    const pairedSectionDir = join(pairedDir, ...sectionPath)
    let original
    let modern
    try {
      const [sourceRaw, targetRaw] = await Promise.all([
        readFile(join(pairedSectionDir, 'source.txt'), 'utf8'),
        readFile(join(pairedSectionDir, 'target.txt'), 'utf8'),
      ])
      original = sourceRaw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      modern = targetRaw.split(/\r?\n/).map((line) => line.trim())
    } catch {
      const originalRaw = await readFile(originalFile, 'utf8')
      original = originalRaw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      modern = []
    }
    sections.push({ title: sectionPath.join(' · ') || basename(book.dir), original, modern })
  }
  return writeDocument(book, classicalSource, sections, '开放语料现代译文 · 待逐书复核')
}

await rm(OUTPUT, { recursive: true, force: true })
await mkdir(OUTPUT, { recursive: true })

const documents = []
for (const book of classicalBooks) documents.push(await importClassical(book))
for (const book of cbetaBooks) documents.push(await importCbeta(book))

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  entries: documents.map((document) => ({
    id: document.id,
    title: document.title,
    indexFile: `canon/${document.id}/index.json`,
    completeness: document.completeness,
    originalCharacters: document.originalCharacters,
    translationCoverage: document.translationCoverage,
    translationStatus: document.translationStatus,
  })),
}

await writeFile(join(OUTPUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Imported ${documents.length} complete works into ${OUTPUT}`)
for (const document of documents) {
  console.log(`${document.id.padEnd(18)} ${String(document.sections.length).padStart(3)} sections  ${String(document.originalCharacters).padStart(8)} original chars  ${Math.round(document.translationCoverage * 100)}% translated`)
}
