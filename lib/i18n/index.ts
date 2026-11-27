export {
  DEFAULT_LOCALE,
  LANGUAGE_NATIVE_LABELS,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  formatLocalizedDate,
  formatLocalizedNumber,
  isSupportedLocale,
  matchSupportedLocale,
  normalizeLanguagePreference,
  parseAcceptLanguageHeader,
  resolvePreferredLocale,
  selectPluralCategory,
  type LanguagePreference,
  type PluralCategory,
  type SupportedLocale,
} from './locale'

export {
  CATALOGS,
  translate,
  translateTheme,
  type TranslationParams,
} from './translate'

export type { TranslationCatalog, TranslationKey } from './locales/en'
