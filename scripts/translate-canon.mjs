import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname)
const CANON_ROOT = join(ROOT, 'public', 'canon')
const DEEPSEEK_TOKEN = process.env.DEEPSEEK_API_KEY
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
const TOKEN = DEEPSEEK_TOKEN || GITHUB_TOKEN
const PROVIDER = DEEPSEEK_TOKEN ? 'DeepSeek' : 'GitHub Models'
const MODEL = DEEPSEEK_TOKEN ? process.env.DEEPSEEK_TRANSLATION_MODEL || 'deepseek-v4-flash' : process.env.CANON_TRANSLATION_MODEL || 'openai/gpt-4.1-mini'
const ENDPOINT = DEEPSEEK_TOKEN ? 'https://api.deepseek.com/chat/completions' : 'https://models.github.ai/inference/chat/completions'

function argument(name, fallback) {
  const flag = `--${name}`
  const index = process.argv.indexOf(flag)
  if (index >= 0) return process.argv[index + 1] ?? fallback
  const inline = process.argv.find((value) => value.startsWith(`${flag}=`))
  return inline ? inline.slice(flag.length + 1) : fallback
}

const requestedBook = argument('book', 'auto')
const maxBatches = Number(argument('max-batches', '2000'))
const batchCharacters = Number(argument('batch-characters', '18000'))
const maxItems = Number(argument('max-items', '72'))
const priority = [
  'book-of-poetry', 'book-of-changes', 'surangama-sutra', 'jingming-record',
  'xunzi', 'diamond-sutra', 'platform-sutra', 'vimalakirti', 'dhammapada', 'lotus-sutra', 'huayan',
  'bhagavad-gita', 'upanishads', 'yoga-sutra', 'quran', 'tanakh',
  'elements', 'principia', 'origin-species', 'principles-psychology', 'wealth-nations', 'critique-reason',
]

if (!TOKEN) throw new Error('Missing DEEPSEEK_API_KEY, GITHUB_TOKEN, or GH_TOKEN for canon translation')

function parseJsonPayload(content) {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const json = cleaned.startsWith('{') && cleaned.endsWith('}')
    ? cleaned
    : cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1)
  const direct = JSON.parse(json)
  if (direct.translations && typeof direct.translations === 'object') return direct.translations
  throw new Error('The model response did not contain a translations object')
}

async function translateBatch(paragraphs, splitDepth = 0, isolatedAttempts = 0, selectedModel = MODEL) {
  const keys = paragraphs.map((_, index) => `p${index + 1}`)
  const properties = Object.fromEntries(keys.map((key) => [key, { type: 'string' }]))
  const responseFormat = DEEPSEEK_TOKEN
    ? { type: 'json_object' }
    : {
        type: 'json_schema',
        json_schema: {
          name: 'canon_translations',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              translations: {
                type: 'object',
                properties,
                required: keys,
                additionalProperties: false,
              },
            },
            required: ['translations'],
            additionalProperties: false,
          },
        },
      }
  const requestBody = JSON.stringify({
      model: selectedModel,
      temperature: 0.1,
      max_tokens: 24000,
      ...(DEEPSEEK_TOKEN ? { thinking: { type: 'disabled' } } : {}),
      response_format: responseFormat,
      messages: [
        {
          role: 'system',
          content: '你是《超我》藏经阁的严谨经典译者。把文言文、繁体汉文、英语、拉丁语、希伯来语、阿拉伯语、梵语等原典逐段译成今天普通中文读者一遍就能懂的现代汉语。不要只做繁简转换，也不要照抄原文句式；长句可以在同一个译文字符串内拆成短句。忠实保留原意、人名、术语、编号和宗教专名；不添加原文没有的因果、神迹、科学结论、评价或劝诫。无法可靠直译的音译、咒语或专名要明确标注保留原音，绝不编造字面意义。每个输入键只对应自己的完整译文，绝不能把上一段的后半部分放进下一个键。只输出合法 JSON。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: '逐键翻译以下原典；输出 translations 对象并原样保留每个键',
            paragraphs: Object.fromEntries(keys.map((key, index) => [key, paragraphs[index]])),
          }),
        },
      ],
    })

  let response
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 150000)
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2026-03-10',
        },
        body: requestBody,
        signal: controller.signal,
      })
      if (response.ok || ![429, 500, 502, 503, 504].includes(response.status) || attempt === 6) break
      const delay = Math.min(30000, 1200 * (2 ** (attempt - 1)))
      console.warn(`${PROVIDER} ${response.status}; retrying batch in ${Math.round(delay / 1000)}s (${attempt}/6).`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    } catch (error) {
      if (attempt === 6) throw error
      const delay = Math.min(30000, 1200 * (2 ** (attempt - 1)))
      console.warn(`${PROVIDER} request ${error?.name === 'AbortError' ? 'timed out' : 'failed'}; retrying in ${Math.round(delay / 1000)}s (${attempt}/6).`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    } finally {
      clearTimeout(timeout)
    }
  }

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`${PROVIDER} ${response.status}: ${detail.slice(0, 500)}`)
  }
  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content
  if (!content) {
    if (paragraphs.length > 1) {
      const middle = Math.ceil(paragraphs.length / 2)
      console.warn(`The model returned an empty translation; retrying ${paragraphs.length} paragraphs as ${middle} + ${paragraphs.length - middle}.`)
      const first = await translateBatch(paragraphs.slice(0, middle), splitDepth + 1, 0, selectedModel)
      const second = await translateBatch(paragraphs.slice(middle), splitDepth + 1, 0, selectedModel)
      return [...first, ...second]
    }
    if (isolatedAttempts >= 2 && DEEPSEEK_TOKEN && selectedModel !== 'deepseek-v4-pro') return translateBatch(paragraphs, splitDepth, 0, 'deepseek-v4-pro')
    if (isolatedAttempts >= 3) throw new Error(`${PROVIDER} returned an empty translation repeatedly`)
    console.warn('The model returned an empty translation for one paragraph; retrying it in isolation.')
    return translateBatch(paragraphs, splitDepth, isolatedAttempts + 1, selectedModel)
  }
  let translated
  try {
    translated = parseJsonPayload(content)
  } catch (error) {
    if (paragraphs.length === 1) {
      if (isolatedAttempts >= 2 && DEEPSEEK_TOKEN && selectedModel !== 'deepseek-v4-pro') {
        console.warn('Flash repeatedly returned invalid JSON for one paragraph; retrying it with DeepSeek V4 Pro.')
        return translateBatch(paragraphs, splitDepth, 0, 'deepseek-v4-pro')
      }
      if (isolatedAttempts >= 3) throw error
      console.warn('The model returned invalid JSON for one paragraph; retrying it in isolation.')
      return translateBatch(paragraphs, splitDepth, isolatedAttempts + 1, selectedModel)
    }
    const middle = Math.ceil(paragraphs.length / 2)
    console.warn(`The model returned invalid JSON; retrying ${paragraphs.length} paragraphs as ${middle} + ${paragraphs.length - middle}.`)
    const first = await translateBatch(paragraphs.slice(0, middle), splitDepth + 1, 0, selectedModel)
    const second = await translateBatch(paragraphs.slice(middle), splitDepth + 1, 0, selectedModel)
    return [...first, ...second]
  }
  const translations = keys.map((key) => String(translated[key] || '').trim())
  const suspicious = translations.some((value, index) => {
    const source = paragraphs[index]
    if (!value) return true
    if (/正在生成|生成中|校勘中|稍后补|暂未提供/.test(value)) return true
    if (/揭帝|羯諦|羯帝/.test(source) && !/音译咒语|音譯咒語|保留原音/.test(value)) return true
    return source.length >= 160 && value.length < Math.max(30, source.length * 0.15)
  })

  if (suspicious) {
    if (paragraphs.length === 1) {
      if (isolatedAttempts >= 2 && DEEPSEEK_TOKEN && selectedModel !== 'deepseek-v4-pro') {
        console.warn('Flash repeatedly returned a suspicious isolated translation; retrying this paragraph with DeepSeek V4 Pro.')
        return translateBatch(paragraphs, splitDepth, 0, 'deepseek-v4-pro')
      }
      if (isolatedAttempts >= 3) {
        console.error(`Repeated suspicious translation. Source ${paragraphs[0].length} chars: ${paragraphs[0].slice(0, 180)}`)
        console.error(`Translation ${translations[0].length} chars: ${translations[0].slice(0, 180)}`)
        throw new Error('The model repeatedly returned an incomplete or misaligned translation')
      }
      console.warn('The model returned a suspicious single-paragraph translation; retrying it in isolation.')
      return translateBatch(paragraphs, splitDepth, isolatedAttempts + 1, selectedModel)
    }
    const middle = Math.ceil(paragraphs.length / 2)
    console.warn(`The model returned an incomplete or misaligned batch; retrying ${paragraphs.length} paragraphs as ${middle} + ${paragraphs.length - middle}.`)
    const first = await translateBatch(paragraphs.slice(0, middle), splitDepth + 1, 0, selectedModel)
    const second = await translateBatch(paragraphs.slice(middle), splitDepth + 1, 0, selectedModel)
    return [...first, ...second]
  }
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
  document.translationLabel = '《超我》现代译文 · DeepSeek V4 辅助初译，请与原典和权威译本互证'
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
const pending = []
const sectionStates = []

for (const descriptor of document.sections) {
  const path = join(CANON_ROOT, bookId, descriptor.file)
  const section = JSON.parse(await readFile(path, 'utf8'))
  sectionStates.push({ path, section })

  for (let index = 0; index < section.original.length; index += 1) {
    if (section.modern[index]?.trim()) continue
    if (isHeading(section.original[index])) section.modern[index] = section.original[index]
    else pending.push({ descriptor, path, section, index, paragraph: section.original[index] })
  }
}

let cursor = 0
while (cursor < pending.length && batches < maxBatches) {
  const items = []
  let characters = 0
  while (cursor < pending.length && items.length < maxItems) {
    const item = pending[cursor]
    if (items.length && characters + item.paragraph.length > batchCharacters) break
    items.push(item)
    characters += item.paragraph.length
    cursor += 1
  }

  let translations
  try {
    translations = await translateBatch(items.map((item) => item.paragraph))
  } catch (error) {
    if (String(error).includes('429')) {
      console.warn(`${PROVIDER} is rate-limited; saving ${batches} completed batches and continuing next run.`)
      break
    }
    throw error
  }
  const touched = new Map()
  items.forEach((item, resultIndex) => {
    item.section.modern[item.index] = translations[resultIndex]
    touched.set(item.path, item.section)
  })
  for (const [path, section] of touched) await writeFile(path, `${JSON.stringify(section)}\n`)
  batches += 1
  translatedParagraphs += items.length
  const from = items[0].descriptor.id
  const to = items.at(-1).descriptor.id
  console.log(`${bookId} ${from}${from === to ? '' : `–${to}`}: batch ${batches}/${maxBatches}, ${items.length} paragraphs, ${characters} original chars`)
}

for (const { path, section } of sectionStates) await writeFile(path, `${JSON.stringify(section)}\n`)

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
