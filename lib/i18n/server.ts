import { cookies, headers } from 'next/headers'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  normalizeLanguagePreference,
  parseAcceptLanguageHeader,
  resolvePreferredLocale,
  type LanguagePreference,
  type SupportedLocale,
} from './locale'

export async function resolveServerI18n(): Promise<{
  locale: SupportedLocale
  preference: LanguagePreference
}> {
  try {
    const cookieStore = await cookies()
    const headerStore = await headers()
    const rawCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value
    const preference = normalizeLanguagePreference(rawCookie)
    const acceptLanguage = parseAcceptLanguageHeader(headerStore.get('accept-language'))
    const locale = resolvePreferredLocale(acceptLanguage, preference)
    return { locale, preference }
  } catch {
    return { locale: DEFAULT_LOCALE, preference: 'system' }
  }
}
