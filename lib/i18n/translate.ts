import { en, type TranslationCatalog, type TranslationKey } from './locales/en'
import { zhHans } from './locales/zh-Hans'
import { zhHant } from './locales/zh-Hant'
import { ja } from './locales/ja'
import { ko } from './locales/ko'
import { es } from './locales/es'
import { de } from './locales/de'
import { fr } from './locales/fr'
import { ptBR } from './locales/pt-BR'
import type { SupportedLocale } from './locale'

export type TranslationParams = Record<string, string | number>

export const CATALOGS: Readonly<Record<SupportedLocale, TranslationCatalog>> = {
  en,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  ja,
  ko,
  es,
  de,
  fr,
  'pt-BR': ptBR,
}

const THEME_ID_TO_KEY: Readonly<Record<string, TranslationKey>> = {
  all: 'themes.all',
  mixed: 'themes.mixed',
  matein1: 'themes.mateIn1',
  mate_in_1: 'themes.mateIn1',
  matein2: 'themes.mateIn2',
  mate_in_2: 'themes.mateIn2',
  matein3: 'themes.mateIn3',
  mate_in_3: 'themes.mateIn3',
  matein4: 'themes.mateIn4',
  mate_in_4: 'themes.mateIn4',
  backrankmate: 'themes.backRankMate',
  back_rank_mate: 'themes.backRankMate',
  smotheredmate: 'themes.smotheredMate',
  smothered_mate: 'themes.smotheredMate',
  fork: 'themes.fork',
  pin: 'themes.pin',
  skewer: 'themes.skewer',
  discoveredattack: 'themes.discoveredAttack',
  discovered_attack: 'themes.discoveredAttack',
  doublecheck: 'themes.doubleCheck',
  double_check: 'themes.doubleCheck',
  xrayattack: 'themes.xRayAttack',
  x_ray_attack: 'themes.xRayAttack',
  hangingpiece: 'themes.hangingPiece',
  hanging_piece: 'themes.hangingPiece',
  trappedpiece: 'themes.trappedPiece',
  trapped_piece: 'themes.trappedPiece',
  capturingdefender: 'themes.capturingDefender',
  capturing_defender: 'themes.capturingDefender',
  sacrifice: 'themes.sacrifice',
  deflection: 'themes.deflection',
  attraction: 'themes.attraction',
  intermezzo: 'themes.intermezzo',
  interference: 'themes.interference',
  advancedpawn: 'themes.advancedPawn',
  advanced_pawn: 'themes.advancedPawn',
  pawnendgame: 'themes.pawnEndgame',
  pawn_endgame: 'themes.pawnEndgame',
  promotion: 'themes.promotion',
  zugzwang: 'themes.zugzwang',
}

export function translate(
  locale: SupportedLocale,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const template = CATALOGS[locale]?.[key] ?? en[key]
  if (!params) {
    return template
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => {
    const value = params[token]
    return value === undefined ? `{{${token}}}` : String(value)
  })
}

export function translateTheme(theme: string, locale: SupportedLocale): string | undefined {
  const normalized = theme.trim().toLowerCase()
  const key = THEME_ID_TO_KEY[normalized]
  if (!key) {
    return undefined
  }
  return translate(locale, key)
}
