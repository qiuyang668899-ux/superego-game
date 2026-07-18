import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname)
const CANON_ROOT = join(ROOT, 'public', 'canon')
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
const MODEL = process.env.CANON_TRANSLATION_MODEL || 'openai/gpt-4.1-mini'
const ENDPOINT = 'https://models.github.ai/inference/chat/completions'

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const requestedBook = argument('book', 'auto')
const maxBatches = Number(argument('max-batches', '12'))
const batchCharacters = Number(argument('batch-characters', '1400'))
const priority = ['heart-sutra', 'xunzi', 'diamond-sutra', 'platform-sutra', 'vimalakirti', 'dhammapada', 'lotus-sutra', 'huayan']

if (!TOKEN) throw new Error('Missing GITHUB_TOKEN or GH_TOKEN for GitHub Models')

function parseJsonArray(content) {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const json = cleaned.startsWith('{') && cleaned.endsWith('}')
    ? cleaned
    : cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1)
  try {
    const direct = JSON.parse(json)
    if (Array.isArray(direct)) return direct
    if (Array.isArray(direct.translations)) return direct.translations
  } catch {
    const arrayStart = cleaned.indexOf('[', cleaned.indexOf('"translations"'))
    const recoverable = arrayStart >= 0 ? cleaned.slice(arrayStart + 1) : ''
    const recovered = [...recoverable.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((match) => JSON.parse(`"${match[1]}"`))
    if (recovered.length) return recovered
  }
  throw new Error('The model response did not contain a translations array')
}

async function translateBatch(paragraphs) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2026-03-10',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      max_tokens: 6000,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'canon_translations',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              translations: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['translations'],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: 'system',
          content: '你是《超我》藏经阁的严谨古籍译者。把文言与汉文典籍逐段译成今天普通读者一遍就能懂的现代汉语，不要只做繁简转换，也不要照抄文言句式；长句可以拆成短句。忠实保留原意、人名、概念与宗教专名，不添加原文没有的因果、神迹、评价或劝诫；咒语只说明“音译咒语，保留原音”，不要编造字面意义。输入有几段，输出必须正好有几段。',
        },
        {
          role: 'user',
          content: JSON.stringify({ task: '将以下原典翻译为现代汉语，保持顺序与段数', paragraphs }),
        },
      ],
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`GitHub Models ${response.status}: ${detail.slice(0, 500)}`)
  }
  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error('GitHub Models returned an empty translation')
  const translations = parseJsonArray(content).map((value) => String(value).trim())
  if (translations.length !== paragraphs.length) throw new Error(`Expected ${paragraphs.length} translations, received ${translations.length}`)
  return translations
}

function isHeading(text) {
  return text.length <= 34 && /(經|经|品|序|譯|译|撰|卷|疏|讚|赞|咒曰|偈曰)$/.test(text)
}

async function updateIndex(bookId) {
  const indexPath = join(CANON_ROOT, bookId, 'index.json')
  const document = JSON.parse(await readFile(indexPath, 'utf8'))
  let translatedOriginalCharacters = 0
  let translationCharacters = 0

  for (const descriptor of document.sections) {
    const section = JSON.parse(await readFile(join(CANON_ROOT, bookId, descriptor.file), 'utf8'))
    const translated = section.original.reduce((sum, text, index) => sum + (section.modern[index]?.trim() ? text.length : 0), 0)
    const modernCharacters = section.modern.join('').length
    descriptor.translationCharacters = modernCharacters
    descriptor.translationCoverage = descriptor.originalCharacters ? Number((translated / descriptor.originalCharacters).toFixed(4)) : 0
    section.translationStatus = descriptor.translationCoverage >= 0.995 ? 'complete' : descriptor.translationCoverage > 0 ? 'in-progress' : 'unavailable'
    await writeFile(join(CANON_ROOT, bookId, descriptor.file), `${JSON.stringify(section)}\n`)
    translatedOriginalCharacters += translated
    translationCharacters += modernCharacters
  }

  document.translationCharacters = translationCharacters
  document.translationCoverage = document.originalCharacters ? Number((translatedOriginalCharacters / document.originalCharacters).toFixed(4)) : 0
  document.translationStatus = document.translationCoverage >= 0.995 ? 'complete' : document.translationCoverage > 0 ? 'in-progress' : 'unavailable'
  document.translationLabel = '《超我》AI 辅助现代译解 · 持续人工与社区校勘'
  await writeFile(indexPath, `${JSON.stringify(document)}\n`)
  return document
}

async function selectBook() {
  if (requestedBook !== 'auto') return requestedBook
  for (const bookId of priority) {
    const document = JSON.parse(await readFile(join(CANON_ROOT, bookId, 'index.json'), 'utf8'))
    if (document.translationCoverage < 0.995) return bookId
  }
  return null
}

const bookId = await selectBook()
if (!bookId) {
  console.log('All priority canon translations are complete.')
  process.exit(0)
}

const document = JSON.parse(await readFile(join(CANON_ROOT, bookId, 'index.json'), 'utf8'))
let batches = 0
let translatedParagraphs = 0

outer: for (const descriptor of document.sections) {
  const path = join(CANON_ROOT, bookId, descriptor.file)
  const section = JSON.parse(await readFile(path, 'utf8'))

  for (let index = 0; index < section.original.length; index += 1) {
    if (section.modern[index]?.trim()) continue
    if (isHeading(section.original[index])) section.modern[index] = section.original[index]
  }

  let cursor = 0
  while (cursor < section.original.length) {
    while (cursor < section.original.length && section.modern[cursor]?.trim()) cursor += 1
    if (cursor >= section.original.length) break
    if (batches >= maxBatches) {
      await writeFile(path, `${JSON.stringify(section)}\n`)
      break outer
    }

    const indexes = []
    const paragraphs = []
    let characters = 0
    for (let index = cursor; index < section.original.length && indexes.length < 10; index += 1) {
      if (section.modern[index]?.trim()) continue
      const paragraph = section.original[index]
      if (indexes.length && characters + paragraph.length > batchCharacters) break
      indexes.push(index)
      paragraphs.push(paragraph)
      characters += paragraph.length
    }

    const translations = await translateBatch(paragraphs)
    indexes.forEach((paragraphIndex, resultIndex) => {
      section.modern[paragraphIndex] = translations[resultIndex]
    })
    batches += 1
    translatedParagraphs += indexes.length
    await writeFile(path, `${JSON.stringify(section)}\n`)
    console.log(`${bookId} ${descriptor.id}: batch ${batches}/${maxBatches}, ${indexes.length} paragraphs, ${characters} original chars`)
  }
}

const updated = await updateIndex(bookId)
const manifestPath = join(CANON_ROOT, 'manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const manifestEntry = manifest.entries.find((entry) => entry.id === bookId)
if (manifestEntry) {
  manifestEntry.translationCoverage = updated.translationCoverage
  manifestEntry.translationStatus = updated.translationStatus
}
manifest.generatedAt = new Date().toISOString()
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`Finished ${batches} batches / ${translatedParagraphs} paragraphs for ${bookId}. Coverage: ${Math.round(updated.translationCoverage * 100)}%`)
