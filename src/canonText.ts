export type CanonTranslationStatus = 'complete' | 'ai-draft' | 'in-progress' | 'unavailable'

export interface CanonSourceInfo {
  label: string
  url: string
  code?: string
  license: string
  licenseUrl: string
  commercialUse: 'restricted' | 'allowed' | 'review-required'
  notice: string
}

export interface CanonSectionIndex {
  id: string
  title: string
  file: string
  originalCharacters: number
  translationCharacters: number
  translationCoverage: number
}

export interface CanonDocumentIndex {
  schemaVersion: 1
  id: string
  title: string
  edition: string
  source: CanonSourceInfo
  completeness: 'full' | 'partial'
  originalCharacters: number
  translationCharacters: number
  translationCoverage: number
  translationStatus: CanonTranslationStatus
  translationLabel: string
  originalLanguage?: string
  originalDirection?: 'ltr' | 'rtl'
  sections: CanonSectionIndex[]
}

export interface CanonTextSection {
  id: string
  title: string
  original: string[]
  modern: string[]
  translationStatus: CanonTranslationStatus
}

export interface CanonManifestEntry {
  id: string
  title: string
  indexFile: string
  completeness: 'full' | 'partial'
  originalCharacters: number
  translationCoverage: number
  translationStatus: CanonTranslationStatus
}

export const FULL_CANON_IDS = new Set([
  'analects',
  'mencius',
  'great-learning',
  'doctrine-mean',
  'xunzi',
  'book-of-poetry',
  'book-of-documents',
  'book-of-rites',
  'book-of-changes',
  'spring-autumn',
  'dao-de-jing',
  'zhuangzi',
  'jingming-record',
  'heart-sutra',
  'diamond-sutra',
  'lotus-sutra',
  'vimalakirti',
  'platform-sutra',
  'dhammapada',
  'huayan',
  'surangama-sutra',
  'elements',
  'principia',
  'origin-species',
  'principles-psychology',
  'wealth-nations',
  'critique-reason',
  'bible',
  'tanakh',
  'quran',
  'bhagavad-gita',
  'upanishads',
  'yoga-sutra',
])

export function hasFullCanon(id: string) {
  return FULL_CANON_IDS.has(id)
}

async function loadJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const canonicalPath = `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
  const separator = canonicalPath.includes('?') ? '&' : '?'
  const response = await fetch(`${canonicalPath}${separator}fresh=${Date.now()}`, {
    signal,
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`经文载入失败（${response.status}）`)
  return response.json() as Promise<T>
}

export function loadCanonIndex(id: string, signal?: AbortSignal) {
  return loadJson<CanonDocumentIndex>(`canon/${id}/index.json`, signal)
}

export function loadCanonSection(id: string, file: string, signal?: AbortSignal) {
  return loadJson<CanonTextSection>(`canon/${id}/${file}`, signal)
}
