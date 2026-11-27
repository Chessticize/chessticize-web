import { describe, expect, it } from 'vitest'
import {
  CATALOGS,
  DEFAULT_LOCALE,
  LANGUAGE_NATIVE_LABELS,
  SUPPORTED_LOCALES,
  matchSupportedLocale,
  normalizeLanguagePreference,
  parseAcceptLanguageHeader,
  resolvePreferredLocale,
  selectPluralCategory,
  translate,
  translateTheme,
  type TranslationKey,
} from '@/lib/i18n'
import { en } from '@/lib/i18n/locales/en'
import { VALID_THEMES } from '@/lib/sprint-config'

function extractPlaceholders(template: string): string[] {
  return Array.from(template.matchAll(/\{\{(\w+)\}\}/g), (match) => match[1]).sort()
}

describe('i18n locale resolution (aligned with Chessticize Mobile v1.7.0)', () => {
  it('supports the exact 9 locales from mobile v1.7.0', () => {
    expect(SUPPORTED_LOCALES).toEqual([
      'en',
      'zh-Hans',
      'zh-Hant',
      'ja',
      'ko',
      'es',
      'de',
      'fr',
      'pt-BR',
    ])
    for (const locale of SUPPORTED_LOCALES) {
      expect(LANGUAGE_NATIVE_LABELS[locale].length).toBeGreaterThan(0)
    }
  })

  it('normalizes BCP 47 variants including Chinese scripts and Portuguese', () => {
    expect(matchSupportedLocale('en-US')).toBe('en')
    expect(matchSupportedLocale('zh-CN')).toBe('zh-Hans')
    expect(matchSupportedLocale('zh-SG')).toBe('zh-Hans')
    expect(matchSupportedLocale('zh-Hans-CN')).toBe('zh-Hans')
    expect(matchSupportedLocale('zh-TW')).toBe('zh-Hant')
    expect(matchSupportedLocale('zh-HK')).toBe('zh-Hant')
    expect(matchSupportedLocale('zh-Hant')).toBe('zh-Hant')
    expect(matchSupportedLocale('pt')).toBe('pt-BR')
    expect(matchSupportedLocale('pt_PT')).toBe('pt-BR')
    expect(matchSupportedLocale('ja-JP')).toBe('ja')
    expect(matchSupportedLocale('ko-KR')).toBe('ko')
    expect(matchSupportedLocale('es-MX')).toBe('es')
    expect(matchSupportedLocale('de-AT')).toBe('de')
    expect(matchSupportedLocale('fr-CA')).toBe('fr')
    expect(matchSupportedLocale('it-IT')).toBeUndefined()
  })

  it('parses Accept-Language headers by quality factor and resolves fallback cleanly', () => {
    expect(parseAcceptLanguageHeader('it-IT,zh-TW;q=0.8,en-US;q=0.9')).toEqual([
      'it-IT',
      'en-US',
      'zh-TW',
    ])
    expect(resolvePreferredLocale(['it-IT', 'zh-TW', 'en-US'], 'system')).toBe('zh-Hant')
    expect(resolvePreferredLocale(['it-IT'], 'system')).toBe(DEFAULT_LOCALE)
    expect(resolvePreferredLocale(['zh-CN'], 'de')).toBe('de')
    expect(normalizeLanguagePreference('invalid-tag')).toBe('system')
    expect(normalizeLanguagePreference('zh-TW')).toBe('zh-Hant')
  })

  it('selects plural categories deterministically', () => {
    expect(selectPluralCategory(1, 'en')).toBe('one')
    expect(selectPluralCategory(2, 'en')).toBe('other')
    expect(selectPluralCategory(1, 'zh-Hans')).toBe('other')
    expect(selectPluralCategory(0, 'fr')).toBe('one')
  })
})

describe('i18n catalog completeness and chess terminology parity', () => {
  const referenceKeys = Object.keys(en) as TranslationKey[]

  it('has 100% key and interpolation placeholder parity across all 9 locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const catalog = CATALOGS[locale]
      const keys = Object.keys(catalog) as TranslationKey[]
      expect(keys.sort()).toEqual([...referenceKeys].sort())

      for (const key of referenceKeys) {
        const value = catalog[key]
        expect(value.trim().length, `${locale}.${key} must be non-empty`).toBeGreaterThan(0)
        expect(
          extractPlaceholders(value),
          `${locale}.${key} placeholder mismatch`,
        ).toEqual(extractPlaceholders(en[key]))
      }
    }
  })

  it('interpolates parameters cleanly', () => {
    expect(translate('zh-Hans', 'language.statusChanged', { language: '简体中文' })).toBe(
      '语言已切换为 简体中文',
    )
    expect(translate('en', 'dashboard.dailyStreak', { count: 7 })).toBe('Daily Streak: 7')
  })

  it('translates every VALID_THEMES chess motif across all 9 locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const theme of VALID_THEMES) {
        const translated = translateTheme(theme, locale)
        expect(translated, `Missing translation for ${theme} in ${locale}`).toBeDefined()
        expect(translated!.length).toBeGreaterThan(0)
      }
    }
    expect(translateTheme('fork', 'zh-Hans')).toBe('捉双')
    expect(translateTheme('skewer', 'zh-Hans')).toBe('串击')
    expect(translateTheme('zugzwang', 'zh-Hans')).toBe('逼着')
    expect(translateTheme('discovered_attack', 'de')).toBe('Abzugsangriff')
    expect(translateTheme('mate_in_2', 'ja')).toBe('2手メイト')
  })
})
