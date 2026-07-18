import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname)
const OUTPUT = join(ROOT, 'public', 'canon')
const CLASSICAL_ROOT = process.env.CLASSICAL_ROOT || '/tmp/classical-modern'
const CBETA_ROOT = process.env.CBETA_ROOT || '/tmp/cbeta-normal-text'
const SHIJING_FILE = process.env.SHIJING_FILE || '/tmp/shijing.json'
const JINGMING_FILES = (process.env.JINGMING_FILES || '/tmp/KR5i0041_001.txt,/tmp/KR5i0041_002.txt').split(',')

const classicalSource = {
  label: 'NiuTrans Classical-Modern 开放语料',
  url: 'https://github.com/NiuTrans/Classical-Modern',
  license: 'MIT（各书目原始来源另见上游“数据来源”文件）',
  licenseUrl: 'https://github.com/NiuTrans/Classical-Modern/blob/main/LICENSE',
  commercialUse: 'review-required',
  notice: '原文与现代译文来自开放平行语料整理；译文仍需持续校勘，正式商业发行前逐书完成来源权利复核。',
}

const openChineseSource = {
  label: 'chinese-poetry 开放古典文库',
  url: 'https://github.com/chinese-poetry/chinese-poetry/tree/master/诗经',
  license: 'MIT；古典原文属于公共领域',
  licenseUrl: 'https://github.com/chinese-poetry/chinese-poetry/blob/master/LICENSE',
  commercialUse: 'allowed',
  notice: '本卷收入《诗经》305篇开放整理原文。现代译文由《超我》逐段生成并持续校勘。',
}

const cbetaSource = {
  label: 'CBETA 中华电子佛典协会',
  url: 'https://cbetaonline.dila.edu.tw/zh/T0945',
  code: 'T0945',
  license: 'CBETA 非商业使用条款 / CC BY-NC-SA 4.0（依具体文件标示）',
  licenseUrl: 'https://www.cbeta.org/copyright',
  commercialUse: 'restricted',
  notice: '《超我》经文阅读区永久开放，不设付费墙。原典免费提供；版本、校勘与版权说明以 CBETA 官方为准。',
}

const kanripoSource = {
  label: 'Kanripo 汉籍资料库 · 重刊道藏辑要本',
  url: 'https://www.kanripo.org/ed/KR5i0041/',
  code: 'KR5i0041',
  license: '古典原文属于公共领域；数字整理来源须保留署名，商业发行前复核数据库条款',
  licenseUrl: 'https://github.com/kanripo/KR5i0041',
  commercialUse: 'review-required',
  notice: '收入《太上灵宝净明宗教录》重刊道藏辑要本原文，保留异体字；现代译文正在生成与校勘。',
}

const gutenbergSource = (id) => ({
  label: `Project Gutenberg · eBook #${id}`,
  url: `https://www.gutenberg.org/ebooks/${id}`,
  code: `PG${id}`,
  license: 'Public domain in the USA；其他地区使用者须依所在地法律复核',
  licenseUrl: 'https://www.gutenberg.org/policy/permission.html',
  commercialUse: 'review-required',
  notice: '应用内收入该公共领域版本的完整正文；中文现代译文由《超我》分批生成并持续校勘。',
})

const bibleSource = {
  label: 'Midvash Open Bible Data · 和合本',
  url: 'https://github.com/midvash/bible-data',
  code: 'CUV 1919',
  license: 'Public domain（不同司法辖区及机构权利主张须复核）',
  licenseUrl: 'https://midvash.app/es/open-source/bible-data',
  commercialUse: 'review-required',
  notice: '收入1919年和合本繁体与简体对照，按卷、章、节完整阅读；不同教派正典范围与译名可能不同。',
}

const tanakhSource = {
  label: 'Midvash Open Bible Data · Westminster Leningrad Codex',
  url: 'https://github.com/midvash/bible-data',
  code: 'WLC',
  license: 'Hebrew WLC public domain；中文和合本对照的地区权利状态须复核',
  licenseUrl: 'https://midvash.app/es/open-source/bible-data',
  commercialUse: 'review-required',
  notice: '希伯来文原典与中文和合本旧约按卷章对照。节号在少数书卷中可能因版本传统而不同。',
}

const quranSource = {
  label: 'quran-api · Quran Simple Arabic',
  url: 'https://github.com/fawazahmed0/quran-api',
  code: 'ara-quransimple',
  license: '数据仓库 Unlicense；原始阿拉伯文古典经文属于公共领域，具体数字版来源见上游说明',
  licenseUrl: 'https://github.com/fawazahmed0/quran-api/blob/1/LICENSE',
  commercialUse: 'review-required',
  notice: '收入114章完整阿拉伯文。伊斯兰传统通常将译文视为经义解释；中文译解将独立标注并持续校勘。',
}

const gitaSource = {
  label: 'Gita Open Data',
  url: 'https://github.com/gita/gita',
  code: '700 Sanskrit verses',
  license: 'The Unlicense；古典梵文原文属于公共领域',
  licenseUrl: 'https://github.com/gita/gita/blob/main/LICENSE',
  commercialUse: 'allowed',
  notice: '收入18章约700颂完整梵文原文；中文现代译解由《超我》逐颂生成并持续校勘。',
}

const BIBLE_BOOK_NAMES = Object.fromEntries([
  ['Gen', '创世记'], ['Exod', '出埃及记'], ['Lev', '利未记'], ['Num', '民数记'], ['Deut', '申命记'],
  ['Josh', '约书亚记'], ['Judg', '士师记'], ['Ruth', '路得记'], ['1Sam', '撒母耳记上'], ['2Sam', '撒母耳记下'],
  ['1Kgs', '列王纪上'], ['2Kgs', '列王纪下'], ['1Chr', '历代志上'], ['2Chr', '历代志下'], ['Ezra', '以斯拉记'],
  ['Neh', '尼希米记'], ['Esth', '以斯帖记'], ['Job', '约伯记'], ['Ps', '诗篇'], ['Prov', '箴言'],
  ['Eccl', '传道书'], ['Song', '雅歌'], ['Isa', '以赛亚书'], ['Jer', '耶利米书'], ['Lam', '耶利米哀歌'],
  ['Ezek', '以西结书'], ['Dan', '但以理书'], ['Hos', '何西阿书'], ['Joel', '约珥书'], ['Amos', '阿摩司书'],
  ['Obad', '俄巴底亚书'], ['Jonah', '约拿书'], ['Mic', '弥迦书'], ['Nah', '那鸿书'], ['Hab', '哈巴谷书'],
  ['Zeph', '西番雅书'], ['Hag', '哈该书'], ['Zech', '撒迦利亚书'], ['Mal', '玛拉基书'], ['Matt', '马太福音'],
  ['Mark', '马可福音'], ['Luke', '路加福音'], ['John', '约翰福音'], ['Acts', '使徒行传'], ['Rom', '罗马书'],
  ['1Cor', '哥林多前书'], ['2Cor', '哥林多后书'], ['Gal', '加拉太书'], ['Eph', '以弗所书'], ['Phil', '腓立比书'],
  ['Col', '歌罗西书'], ['1Thess', '帖撒罗尼迦前书'], ['2Thess', '帖撒罗尼迦后书'], ['1Tim', '提摩太前书'], ['2Tim', '提摩太后书'],
  ['Titus', '提多书'], ['Phlm', '腓利门书'], ['Heb', '希伯来书'], ['Jas', '雅各书'], ['1Pet', '彼得前书'],
  ['2Pet', '彼得后书'], ['1John', '约翰一书'], ['2John', '约翰二书'], ['3John', '约翰三书'], ['Jude', '犹大书'], ['Rev', '启示录'],
])

const classicalBooks = [
  { id: 'book-of-documents', title: '尚书', dir: '尚书', edition: '《尚书》古今汉语平行语料整理本', order: ['虞书', '夏书', '商书', '周书'] },
  { id: 'book-of-rites', title: '礼记', dir: '礼记', edition: '《礼记》古今汉语平行语料整理本', order: ['曲礼上', '曲礼下', '檀弓上', '檀弓下', '王制', '月令', '曾子问', '文王世子', '礼运', '礼器', '郊特牲', '内则', '玉藻', '明堂位', '丧服小记', '大传', '少仪', '学记', '乐记', '杂记上', '杂记下', '丧大记', '祭法', '祭义', '祭统', '经解', '哀公问', '仲尼燕居', '孔子闲居', '坊记', '中庸', '表记', '缁衣', '奔丧', '问丧', '服问', '间传', '三年问', '深衣', '投壶', '儒行', '大学', '冠义', '昏义', '乡饮酒义', '射义', '燕义', '聘义', '丧服四制'] },
  { id: 'spring-autumn', title: '春秋左传', dir: '左传', edition: '《春秋左氏传》古今汉语平行语料整理本', order: ['隐公', '桓公', '庄公', '闵公', '僖公', '文公', '宣公', '成公', '襄公', '昭公', '定公', '哀公'] },
]

const scienceBooks = [
  { id: 'elements', title: '几何原本', edition: 'The First Six Books of the Elements of Euclid', ids: [21076] },
  { id: 'principia', title: '自然哲学的数学原理', edition: 'Philosophiae Naturalis Principia Mathematica · Latin edition', ids: [28233], originalLanguage: 'la' },
  { id: 'origin-species', title: '物种起源', edition: 'On the Origin of Species · First edition', ids: [1228] },
  { id: 'principles-psychology', title: '心理学原理', edition: 'The Principles of Psychology · Volumes I–II', ids: [57628, 57634] },
  { id: 'wealth-nations', title: '国富论', edition: 'An Inquiry into the Nature and Causes of the Wealth of Nations', ids: [3300] },
  { id: 'critique-reason', title: '纯粹理性批判', edition: 'The Critique of Pure Reason · Meiklejohn translation', ids: [4280] },
]

function translationStatus(coverage) {
  if (coverage >= 0.995) return 'complete'
  if (coverage > 0) return 'in-progress'
  return 'unavailable'
}

async function writeDocument(book, source, rawSections, translationLabel, extra = {}) {
  const bookDir = join(OUTPUT, book.id)
  await rm(bookDir, { recursive: true, force: true })
  await mkdir(bookDir, { recursive: true })
  const sections = []

  for (let index = 0; index < rawSections.length; index += 1) {
    const current = rawSections[index]
    const id = String(index + 1).padStart(3, '0')
    const file = `${id}.json`
    const original = current.original.map((value) => String(value).trim()).filter(Boolean)
    const modern = original.map((_, paragraphIndex) => String(current.modern?.[paragraphIndex] || '').trim())
    const originalCharacters = original.join('').length
    const translationCharacters = modern.join('').length
    const translatedOriginalCharacters = original.reduce((sum, text, paragraphIndex) => sum + (modern[paragraphIndex] ? text.length : 0), 0)
    const coverage = originalCharacters ? translatedOriginalCharacters / originalCharacters : 0
    await writeFile(join(bookDir, file), `${JSON.stringify({ id, title: current.title, original, modern, translationStatus: translationStatus(coverage) })}\n`)
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
    ...extra,
    sections,
  }
  await writeFile(join(bookDir, 'index.json'), `${JSON.stringify(document)}\n`)
  return document
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
  const digits = { 元: 1, 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
  const value = text.match(/[元零一二两三四五六七八九十百]+/)?.[0]
  if (!value) return Number.POSITIVE_INFINITY
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

function chapterRank(book, root, path) {
  const segments = relative(root, path).split('/').slice(0, -1)
  const first = book.order.indexOf(segments[0])
  const last = book.order.indexOf(segments.at(-1))
  const base = (first >= 0 ? first : last >= 0 ? last : book.order.length) * 10_000
  const numeric = chineseNumeralValue(segments.at(-1) || '')
  return base + (Number.isFinite(numeric) ? numeric : 0)
}

async function importClassical(book) {
  const originalDir = join(CLASSICAL_ROOT, '古文原文', book.dir)
  const pairedDir = join(CLASSICAL_ROOT, '双语数据', book.dir)
  const files = (await findFiles(originalDir, 'text.txt')).sort((left, right) => chapterRank(book, originalDir, left) - chapterRank(book, originalDir, right) || left.localeCompare(right, 'zh-CN', { numeric: true }))
  const sections = []
  for (const originalFile of files) {
    const segments = relative(originalDir, originalFile).split('/').slice(0, -1)
    let original
    let modern
    try {
      const [sourceRaw, targetRaw] = await Promise.all([
        readFile(join(pairedDir, ...segments, 'source.txt'), 'utf8'),
        readFile(join(pairedDir, ...segments, 'target.txt'), 'utf8'),
      ])
      original = sourceRaw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      modern = targetRaw.split(/\r?\n/).map((line) => line.trim())
    } catch {
      original = (await readFile(originalFile, 'utf8')).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      modern = []
    }
    sections.push({ title: segments.join(' · ') || basename(book.dir), original, modern })
  }
  return writeDocument(book, classicalSource, sections, '开放语料现代译文 · 待逐书复核', { originalLanguage: 'zh-Hans', originalDirection: 'ltr' })
}

async function importBookOfChanges() {
  let raw
  try { raw = await readFile('/tmp/pg25501.txt', 'utf8') } catch { raw = await fetchGutenberg(25501) }
  const body = stripGutenberg(raw)
  const blocks = body.split(/\r?\n(?=第\s*[元一二三四五六七八九十百]+\s*卦\s*\r?\n)/).filter(Boolean)
  const sections = blocks.map((block, index) => {
    const lines = block.split(/\r?\n/)
    const number = lines.shift()?.replace(/\s+/g, '') || `第${index + 1}卦`
    const name = lines.shift()?.trim() || ''
    const original = lines.join('\n')
      .split(/\r?\n\s*\r?\n/)
      .map((text) => text.replace(/\s*\r?\n\s*/g, '').trim())
      .filter(Boolean)
    return { title: `${number} · ${name}`, original, modern: [] }
  })
  const source = gutenbergSource(25501)
  source.notice = '收入六十四卦、三百八十四爻及经传合编的完整开放原文。中文现代译解由《超我》分批生成并持续校勘。'
  return writeDocument(
    { id: 'book-of-changes', title: '周易', edition: 'Project Gutenberg eBook #25501 · 六十四卦经传合编' },
    source,
    sections,
    '《超我》现代译解 · 生成与校勘中',
    { originalLanguage: 'zh-Hant', originalDirection: 'ltr' },
  )
}

async function importShijing() {
  const poems = JSON.parse(await readFile(SHIJING_FILE, 'utf8'))
  return writeDocument(
    { id: 'book-of-poetry', title: '诗经', edition: 'chinese-poetry《诗经》305篇开放整理本' },
    openChineseSource,
    poems.map((poem) => ({ title: `${poem.chapter} · ${poem.section} · ${poem.title}`, original: poem.content, modern: [] })),
    '《超我》现代译解 · 生成与校勘中',
    { originalLanguage: 'zh-Hans', originalDirection: 'ltr' },
  )
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
    const text = (divider >= 0 ? row.slice(divider + 1) : row).trim()
    if (!text || /^No\.\s*\d+/.test(text)) { flush(); continue }
    const heading = text.length <= 34 && /(經|经|品|序|譯|译|撰|卷|疏|讚|赞|咒曰|偈曰)$/.test(text)
    if (heading) { flush(); paragraphs.push(text); continue }
    buffer += text
    if (/[。！？；：」』]$/.test(text)) flush()
  }
  flush()
  return paragraphs
}

async function importSurangama() {
  const dir = join(CBETA_ROOT, 'T/T19/T19n0945')
  const files = (await readdir(dir)).filter((file) => file.endsWith('.txt')).sort()
  const sections = []
  for (const file of files) sections.push({ title: `第${Number.parseInt(file, 10)}卷`, original: cleanCbetaLines(await readFile(join(dir, file), 'utf8')), modern: [] })
  return writeDocument(
    { id: 'surangama-sutra', title: '大佛顶首楞严经', edition: 'CBETA 大正新修大藏经 T0945' },
    cbetaSource,
    sections,
    '《超我》现代译解 · 生成与校勘中',
    { originalLanguage: 'zh-Hant', originalDirection: 'ltr' },
  )
}

async function importJingming() {
  const sections = []
  for (let index = 0; index < JINGMING_FILES.length; index += 1) {
    const raw = await readFile(JINGMING_FILES[index], 'utf8')
    const paragraphs = raw
      .replace(/^#.*$/gm, '')
      .replace(/<pb:[^>]+>/g, '\n')
      .split(/¶|\r?\n\s*\r?\n/)
      .map((text) => text.replace(/\s+/g, '').trim())
      .filter(Boolean)
    const chunks = chunkParagraphs(paragraphs, 14_000)
    chunks.forEach((original, chunkIndex) => sections.push({ title: `第${index + 1}册 · 第${chunkIndex + 1}节`, original, modern: [] }))
  }
  return writeDocument(
    { id: 'jingming-record', title: '太上灵宝净明宗教录', edition: '重刊道藏辑要 CK-KZ 本' },
    kanripoSource,
    sections,
    '《超我》现代译解 · 生成与校勘中',
    { originalLanguage: 'zh-Hant', originalDirection: 'ltr' },
  )
}

function chunkParagraphs(paragraphs, maxCharacters = 18_000) {
  const chunks = []
  let current = []
  let size = 0
  for (const paragraph of paragraphs) {
    if (current.length && size + paragraph.length > maxCharacters) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(paragraph)
    size += paragraph.length
  }
  if (current.length) chunks.push(current)
  return chunks
}

async function fetchText(url) {
  let lastError
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'SuperegoCanon/1.0 (+https://github.com/qiuyang668899-ux/superego-game)' } })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      return await response.text()
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, attempt * 800))
    }
  }
  throw lastError
}

async function readCachedJson(path, url) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch {}
  return JSON.parse(await fetchText(url))
}

async function fetchGutenberg(id) {
  const cachePath = `/tmp/pg${id}.txt`
  try {
    const cached = await readFile(cachePath, 'utf8')
    if (/\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i.test(cached)) return cached
  } catch {}
  const candidates = [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/files/${id}/${id}-8.txt`,
    `https://www.gutenberg.org/files/${id}/${id}.txt`,
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}-images.html`,
  ]
  let lastError
  for (const url of candidates) {
    try {
      const text = await fetchText(url)
      const normalized = /<html[\s>]/i.test(text) ? htmlToPlainText(text) : text
      if (!/\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i.test(normalized)) throw new Error(`Project Gutenberg eBook #${id} download was incomplete`)
      await writeFile(cachePath, normalized)
      return normalized
    } catch (error) { lastError = error }
  }
  throw lastError
}

function htmlToPlainText(html) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(?:br|\/p|\/div|\/h[1-6]|\/li|\/tr|\/section|\/article)>/gi, '\n\n')
    .replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/gi, ' $1 ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
      if (entity[0] === '#') {
        const hex = entity[1]?.toLowerCase() === 'x'
        return String.fromCodePoint(Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10))
      }
      return entities[entity.toLowerCase()] ?? `&${entity};`
    })
    .replace(/\r/g, '')
}

function stripGutenberg(raw) {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/[\s\S]*?\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i, '')
    .replace(/\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*/i, '')
    .trim()
}

function sectionsFromPlainText(raw, prefix = '正文') {
  const paragraphs = stripGutenberg(raw)
    .split(/\r?\n\s*\r?\n/)
    .map((text) => text.replace(/\s*\r?\n\s*/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((text) => text.length > 1)
  return chunkParagraphs(paragraphs).map((original, index) => {
    const heading = original.find((text) => text.length < 100 && /^(BOOK|CHAPTER|PART|VOLUME|INTRODUCTION|PREFACE|TRANSCENDENTAL|APPENDIX|[IVXLC]+\.)\b/i.test(text))
    return { title: heading || `${prefix} · 第${index + 1}节`, original, modern: [] }
  })
}

async function importScience(book) {
  const sections = []
  for (let index = 0; index < book.ids.length; index += 1) {
    const id = book.ids[index]
    const raw = await fetchGutenberg(id)
    sections.push(...sectionsFromPlainText(raw, book.ids.length > 1 ? `第${index + 1}卷` : '正文'))
  }
  const source = gutenbergSource(book.ids[0])
  if (book.ids.length > 1) {
    source.label = `Project Gutenberg · eBooks #${book.ids.join(' / #')}`
    source.code = book.ids.map((id) => `PG${id}`).join(' + ')
    source.notice = `应用内收入这些公共领域版本的完整正文：${book.ids.map((id) => `#${id}`).join('、')}。中文现代译文由《超我》分批生成并持续校勘。`
  }
  return writeDocument(book, source, sections, '《超我》中文现代译解 · 生成与校勘中', {
    originalLanguage: book.originalLanguage || 'en',
    originalDirection: 'ltr',
  })
}

async function importBible() {
  const [traditional, simplified] = await Promise.all([
    readCachedJson('/tmp/cuv.json', 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/zh/cuv/cuv.json'),
    readCachedJson('/tmp/cuvs.json', 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/zh/cuvs/cuvs.json'),
  ])
  const simplifiedBooks = new Map(simplified.books.map((book) => [book.book, book]))
  const sections = []
  for (const book of traditional.books) {
    const modernBook = simplifiedBooks.get(book.book)
    for (const chapter of book.chapters) {
      const modernChapter = modernBook?.chapters.find((item) => item.chapter === chapter.chapter)
      sections.push({
        title: `${BIBLE_BOOK_NAMES[book.book] || book.englishName} · 第${chapter.chapter}章`,
        original: chapter.verses.map((verse) => `${verse.number}　${verse.text}`),
        modern: chapter.verses.map((verse) => {
          const matched = modernChapter?.verses.find((item) => item.number === verse.number)
          return matched ? `${matched.number}　${matched.text}` : ''
        }),
      })
    }
  }
  return writeDocument(
    { id: 'bible', title: '圣经', edition: '1919 和合本繁简对照 · 66卷' },
    bibleSource,
    sections,
    '和合本简体对照',
    { originalLanguage: 'zh-Hant', originalDirection: 'ltr' },
  )
}

async function importTanakh() {
  const [hebrew, chinese] = await Promise.all([
    readCachedJson('/tmp/wlc.json', 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/he/wlc/wlc.json'),
    readCachedJson('/tmp/cuvs.json', 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/zh/cuvs/cuvs.json'),
  ])
  const chineseBooks = new Map(chinese.books.filter((book) => book.testament === 'OT').map((book) => [book.book, book]))
  const sections = []
  for (const book of hebrew.books) {
    const modernBook = chineseBooks.get(book.book)
    for (const chapter of book.chapters) {
      const modernChapter = modernBook?.chapters.find((item) => item.chapter === chapter.chapter)
      sections.push({
        title: `${BIBLE_BOOK_NAMES[book.book] || book.englishName} · ${book.englishName} · 第${chapter.chapter}章`,
        original: chapter.verses.map((verse) => `${verse.number}　${verse.text}`),
        modern: chapter.verses.map((verse) => {
          const matched = modernChapter?.verses.find((item) => item.number === verse.number)
          return matched ? `${matched.number}　${matched.text}` : ''
        }),
      })
    }
  }
  return writeDocument(
    { id: 'tanakh', title: '塔纳赫', edition: 'Westminster Leningrad Codex · 希伯来文与中文对照' },
    tanakhSource,
    sections,
    '和合本简体旧约对照',
    { originalLanguage: 'he', originalDirection: 'rtl' },
  )
}

async function importQuran() {
  const data = await readCachedJson('/tmp/quran-ar.json', 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quransimple.min.json')
  const grouped = new Map()
  for (const verse of data.quran) {
    if (!grouped.has(verse.chapter)) grouped.set(verse.chapter, [])
    grouped.get(verse.chapter).push(`${verse.verse}　${verse.text}`)
  }
  return writeDocument(
    { id: 'quran', title: '古兰经', edition: 'Quran Simple · 完整阿拉伯文114章' },
    quranSource,
    [...grouped.entries()].map(([chapter, original]) => ({ title: `第 ${chapter} 章`, original, modern: [] })),
    '《超我》中文经义译解 · 生成与校勘中',
    { originalLanguage: 'ar', originalDirection: 'rtl' },
  )
}

async function importGita() {
  const verses = await readCachedJson('/tmp/gita-verses.json', 'https://raw.githubusercontent.com/gita/gita/main/data/verse.json')
  const grouped = new Map()
  for (const verse of verses) {
    const chapter = verse.chapter_number || verse.chapter_id
    if (!grouped.has(chapter)) grouped.set(chapter, [])
    grouped.get(chapter).push(String(verse.text || '').replace(/\s+/g, ' ').trim())
  }
  return writeDocument(
    { id: 'bhagavad-gita', title: '薄伽梵歌', edition: 'Gita Open Data · 18章完整梵文' },
    gitaSource,
    [...grouped.entries()].map(([chapter, original]) => ({ title: `第 ${chapter} 章`, original, modern: [] })),
    '《超我》中文现代译解 · 生成与校勘中',
    { originalLanguage: 'sa', originalDirection: 'ltr' },
  )
}

async function importPublicDomainReligion(id, title, edition, gutenbergId) {
  const raw = await fetchGutenberg(gutenbergId)
  return writeDocument(
    { id, title, edition },
    gutenbergSource(gutenbergId),
    sectionsFromPlainText(raw),
    '《超我》中文现代译解 · 生成与校勘中',
    { originalLanguage: 'en', originalDirection: 'ltr' },
  )
}

const documents = []
for (const book of classicalBooks) documents.push(await importClassical(book))
documents.push(await importShijing())
documents.push(await importBookOfChanges())
documents.push(await importSurangama())
documents.push(await importJingming())
for (const book of scienceBooks) documents.push(await importScience(book))
documents.push(await importBible())
documents.push(await importTanakh())
documents.push(await importQuran())
documents.push(await importGita())
documents.push(await importPublicDomainReligion('upanishads', '奥义书选', 'The Upanishads · Swami Paramananda public-domain translation', 3283))
documents.push(await importPublicDomainReligion('yoga-sutra', '瑜伽经', 'The Yoga Sutras of Patanjali · Charles Johnston public-domain edition', 2526))

const manifestPath = join(OUTPUT, 'manifest.json')
let manifest = { schemaVersion: 1, generatedAt: new Date().toISOString(), entries: [] }
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')) } catch {}
const merged = new Map(manifest.entries.map((entry) => [entry.id, entry]))
for (const document of documents) {
  merged.set(document.id, {
    id: document.id,
    title: document.title,
    indexFile: `canon/${document.id}/index.json`,
    completeness: document.completeness,
    originalCharacters: document.originalCharacters,
    translationCoverage: document.translationCoverage,
    translationStatus: document.translationStatus,
  })
}
manifest = { schemaVersion: 1, generatedAt: new Date().toISOString(), entries: [...merged.values()].sort((left, right) => left.id.localeCompare(right.id)) }
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`Expanded canon with ${documents.length} complete works.`)
for (const document of documents) console.log(`${document.id.padEnd(24)} ${String(document.sections.length).padStart(4)} sections ${String(document.originalCharacters).padStart(9)} original chars ${Math.round(document.translationCoverage * 100)}% translated`)
