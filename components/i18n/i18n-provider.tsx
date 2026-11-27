"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_LOCALE,
  LANGUAGE_NATIVE_LABELS,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  formatLocalizedDate,
  formatLocalizedNumber,
  normalizeLanguagePreference,
  resolvePreferredLocale,
  translate,
  translateTheme,
  type LanguagePreference,
  type SupportedLocale,
  type TranslationKey,
  type TranslationParams,
} from '@/lib/i18n'

import { syncUserPreferencesInBackground } from '@/lib/api/preferences'

interface I18nContextValue {
  locale: SupportedLocale
  preference: LanguagePreference
  systemLocale: SupportedLocale
  setPreference: (next: LanguagePreference) => void
  hydratePreference: (next: LanguagePreference) => void
  t: (key: TranslationKey, params?: TranslationParams) => string
  getThemeName: (theme: string) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
}

const defaultContextValue: I18nContextValue = {
  locale: DEFAULT_LOCALE,
  preference: 'system',
  systemLocale: DEFAULT_LOCALE,
  setPreference: () => {},
  hydratePreference: () => {},
  t: (key, params) => translate(DEFAULT_LOCALE, key, params),
  getThemeName: (theme) => translateTheme(theme, DEFAULT_LOCALE) ?? theme,
  formatNumber: (value, options) => formatLocalizedNumber(value, DEFAULT_LOCALE, options),
  formatDate: (date, options) => formatLocalizedDate(date, DEFAULT_LOCALE, options),
}

const I18nContext = createContext<I18nContextValue>(defaultContextValue)

function getBrowserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') {
    return []
  }
  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages
  }
  return navigator.language ? [navigator.language] : []
}

function persistLocalePreference(preference: LanguagePreference) {
  if (typeof document !== 'undefined') {
    if (preference === 'system') {
      document.cookie = `${LOCALE_COOKIE_NAME}=system; Path=/; Max-Age=31536000; SameSite=Lax`
    } else {
      document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(preference)}; Path=/; Max-Age=31536000; SameSite=Lax`
    }
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, preference)
    }
  } catch {
    // Ignore storage quota or private-mode failures.
  }
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  initialPreference = 'system',
}: {
  children: React.ReactNode
  initialLocale?: SupportedLocale
  initialPreference?: LanguagePreference
}) {
  const [preference, setPreferenceState] = useState<LanguagePreference>(initialPreference)
  const [systemLocale, setSystemLocale] = useState<SupportedLocale>(initialLocale)

  useEffect(() => {
    const detected = resolvePreferredLocale(getBrowserLanguages(), 'system')
    setSystemLocale(detected)

    // Sync from localStorage if no explicit cookie preference was supplied on initial SSR.
    if (initialPreference === 'system') {
      try {
        const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
        if (stored && stored !== 'system') {
          const normalized = normalizeLanguagePreference(stored)
          if (normalized !== 'system') {
            setPreferenceState(normalized)
            persistLocalePreference(normalized)
          }
        }
      } catch {
        // Ignore storage read failures.
      }
    }
  }, [initialPreference])

  const locale = useMemo<SupportedLocale>(
    () => (preference === 'system' ? systemLocale : preference),
    [preference, systemLocale],
  )

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const hydratePreference = useCallback((next: LanguagePreference) => {
    const normalized = normalizeLanguagePreference(next)
    setPreferenceState(normalized)
    persistLocalePreference(normalized)
  }, [])

  const setPreference = useCallback((next: LanguagePreference) => {
    const normalized = normalizeLanguagePreference(next)
    setPreferenceState(normalized)
    persistLocalePreference(normalized)
    syncUserPreferencesInBackground({
      locale: normalized === 'system' ? null : normalized,
    })
  }, [])

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(locale, key, params),
    [locale],
  )

  const getThemeName = useCallback(
    (theme: string) => translateTheme(theme, locale) ?? theme,
    [locale],
  )

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      formatLocalizedNumber(value, locale, options),
    [locale],
  )

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatLocalizedDate(date, locale, options),
    [locale],
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      preference,
      systemLocale,
      setPreference,
      hydratePreference,
      t,
      getThemeName,
      formatNumber,
      formatDate,
    }),
    [locale, preference, systemLocale, setPreference, hydratePreference, t, getThemeName, formatNumber, formatDate],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext)
}

export { LANGUAGE_NATIVE_LABELS }
