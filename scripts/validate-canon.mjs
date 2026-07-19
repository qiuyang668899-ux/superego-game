import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname)
const CANON_ROOT = join(ROOT, 'public', 'canon')
const repair = process.argv.includes('--repair-metadata')
const manifestPath = join(CANON_ROOT, 'manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const failures = []
let books = 0
let paragraphs = 0
let originalCharacters = 0
let translationCharacters = 0

for (const entry of manifest.entries) {
  const indexPath = join(CANON_ROOT, entry.id, 'index.json')
  const document = JSON.parse(await readFile(indexPath, 'utf8'))
  let bookOriginalCharacters = 0
  let bookTranslationCharacters = 0
  let bookTranslatedOriginalCharacters = 0

  for (const descriptor of document.sections) {
    const sectionPath = join(CANON_ROOT, entry.id, descriptor.file)
    const section = JSON.parse(await readFile(sectionPath, 'utf8'))
    if (!Array.isArray(section.original) || !Array.isArray(section.modern)) {
      failures.push(`${entry.id}/${descriptor.file}: original/modern 不是数组`)
      continue
    }
    if (section.modern.length !== section.original.length) {
      failures.push(`${entry.id}/${descriptor.file}: 原文 ${section.original.length} 段，译文 ${section.modern.length} 段`)
    }

    let sectionOriginalCharacters = 0
    let sectionTranslationCharacters = 0
    let sectionTranslatedOriginalCharacters = 0
    for (let index = 0; index < section.original.length; index += 1) {
      const original = String(section.original[index] || '').trim()
      const modern = String(section.modern[index] || '').trim()
      paragraphs += 1
      sectionOriginalCharacters += original.length
      sectionTranslationCharacters += modern.length
      if (original && modern) sectionTranslatedOriginalCharacters += original.length
      if (!original) failures.push(`${entry.id}/${descriptor.file}#${index + 1}: 原文为空`)
      if (!modern) failures.push(`${entry.id}/${descriptor.file}#${index + 1}: 现代译文为空`)
      if (/正在生成|生成中|校勘中|稍后补|暂未提供/.test(modern)) failures.push(`${entry.id}/${descriptor.file}#${index + 1}: 仍含占位译文`)
    }

    const complete = section.original.length === section.modern.length
      && section.original.every((text, index) => String(text || '').trim() && String(section.modern[index] || '').trim())
    if (repair) {
      descriptor.originalCharacters = sectionOriginalCharacters
      descriptor.translationCharacters = sectionTranslationCharacters
      descriptor.translationCoverage = complete ? 1 : sectionOriginalCharacters ? Number((sectionTranslatedOriginalCharacters / sectionOriginalCharacters).toFixed(4)) : 0
      section.translationStatus = complete ? 'complete' : sectionTranslatedOriginalCharacters ? 'in-progress' : 'unavailable'
      await writeFile(sectionPath, `${JSON.stringify(section)}\n`)
    }
    bookOriginalCharacters += sectionOriginalCharacters
    bookTranslationCharacters += sectionTranslationCharacters
    bookTranslatedOriginalCharacters += sectionTranslatedOriginalCharacters
  }

  const bookComplete = bookOriginalCharacters === bookTranslatedOriginalCharacters
  if (repair) {
    document.originalCharacters = bookOriginalCharacters
    document.translationCharacters = bookTranslationCharacters
    document.translationCoverage = bookComplete ? 1 : bookOriginalCharacters ? Number((bookTranslatedOriginalCharacters / bookOriginalCharacters).toFixed(4)) : 0
    document.translationStatus = bookComplete ? 'complete' : bookTranslatedOriginalCharacters ? 'in-progress' : 'unavailable'
    document.translationLabel = '《超我》现代译文 · DeepSeek V4 辅助初译，请与原典和权威译本互证'
    entry.translationCoverage = document.translationCoverage
    entry.translationStatus = document.translationStatus
    await writeFile(indexPath, `${JSON.stringify(document)}\n`)
  }
  if (!bookComplete) failures.push(`${entry.id}: 全书译文覆盖未达 100%`)
  books += 1
  originalCharacters += bookOriginalCharacters
  translationCharacters += bookTranslationCharacters
}

if (repair) {
  manifest.generatedAt = new Date().toISOString()
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

if (failures.length) {
  console.error(`Canon validation failed: ${failures.length} problems in ${books} books.`)
  console.error(failures.slice(0, 80).join('\n'))
  if (failures.length > 80) console.error(`...and ${failures.length - 80} more`)
  process.exit(1)
}

console.log(`Canon validation passed: ${books} books, ${paragraphs} aligned original/modern pairs, ${originalCharacters.toLocaleString()} original chars, ${translationCharacters.toLocaleString()} translated chars.`)
