export const SUPPORTED_LOCALES = [
  'en',
  'zh-Hans',
  'zh-Hant',
  'ja',
  'ko',
  'es',
  'de',
  'fr',
  'pt-BR',
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export type LanguagePreference = 'system' | SupportedLocale

export const DEFAULT_LOCALE: SupportedLocale = 'en'
export const LOCALE_COOKIE_NAME = 'chessticize_locale'
export const LOCALE_STORAGE_KEY = 'chessticize_locale_preference'

export const LANGUAGE_NATIVE_LABELS: Readonly<Record<SupportedLocale, string>> = {
  en: 'English',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  'pt-BR': 'Português (Brasil)',
}

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES)

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && SUPPORTED_LOCALE_SET.has(value)
}

export function normalizeLanguagePreference(value: unknown): LanguagePreference {
  if (value === 'system') {
    return 'system'
  }
  if (isSupportedLocale(value)) {
    return value
  }
  if (typeof value === 'string') {
    return matchSupportedLocale(value) ?? 'system'
  }
  return 'system'
}

export function matchSupportedLocale(tag: string | null | undefined): SupportedLocale | undefined {
  if (typeof tag !== 'string') {
    return undefined
  }
  const trimmed = tag.trim()
  if (trimmed.length === 0) {
    return undefined
  }

  const normalized = trimmed.replace(/_/g, '-')
  const subtags = normalized.split('-').filter((part) => part.length > 0)
  const language = subtags[0]?.toLowerCase()
  if (!language) {
    return undefined
  }

  if (language === 'en') return 'en'
  if (language === 'es') return 'es'
  if (language === 'de') return 'de'
  if (language === 'fr') return 'fr'
  if (language === 'pt') return 'pt-BR'
  if (language === 'ja') return 'ja'
  if (language === 'ko') return 'ko'

  if (language === 'zh') {
    const restLower = subtags.slice(1).map((part) => part.toLowerCase())
    if (restLower.includes('hant')) return 'zh-Hant'
    if (restLower.includes('hans')) return 'zh-Hans'
    if (restLower.includes('tw') || restLower.includes('hk') || restLower.includes('mo')) {
      return 'zh-Hant'
    }
    return 'zh-Hans'
  }

  return undefined
}

export function parseAcceptLanguageHeader(headerValue: string | null | undefined): string[] {
  if (!headerValue) {
    return []
  }

  return headerValue
    .split(',')
    .map((entry, index) => {
      const [rawTag, ...params] = entry.trim().split(';')
      let q = 1
      for (const param of params) {
        const [key, val] = param.trim().split('=')
        if (key === 'q' && val) {
          const parsed = Number.parseFloat(val)
          if (!Number.isNaN(parsed)) {
            q = parsed
          }
        }
      }
      return { tag: rawTag.trim(), q, index }
    })
    .filter((item) => item.tag.length > 0 && item.tag !== '*' && item.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((item) => item.tag)
}

export function resolvePreferredLocale(
  preferredLanguages: readonly string[] | undefined,
  preference: LanguagePreference = 'system',
): SupportedLocale {
  if (preference !== 'system') {
    return preference
  }
  if (preferredLanguages) {
    for (const tag of preferredLanguages) {
      const matched = matchSupportedLocale(tag)
      if (matched) {
        return matched
      }
    }
  }
  return DEFAULT_LOCALE
}

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'

export function selectPluralCategory(count: number, locale: SupportedLocale): PluralCategory {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.PluralRules === 'function') {
      return new Intl.PluralRules(locale).select(count) as PluralCategory
    }
  } catch {
    // Fall back to deterministic rules below.
  }
  if (locale === 'zh-Hans' || locale === 'zh-Hant' || locale === 'ja' || locale === 'ko') {
    return 'other'
  }
  if (locale === 'fr') {
    return count === 0 || count === 1 ? 'one' : 'other'
  }
  return count === 1 ? 'one' : 'other'
}

export function formatLocalizedNumber(
  value: number,
  locale: SupportedLocale,
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale, options).format(value)
  } catch {
    return String(value)
  }
}

export function formatLocalizedDate(
  date: Date | string | number,
  locale: SupportedLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }
  try {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : locale, options).format(parsed)
  } catch {
    return parsed.toISOString()
  }
}
