"use client"

import React from 'react'
import { Globe } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LANGUAGE_NATIVE_LABELS,
  SUPPORTED_LOCALES,
  type LanguagePreference,
} from '@/lib/i18n'
import { useI18n } from './i18n-provider'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  compact?: boolean
  className?: string
}

export function LanguageSwitcher({ compact = false, className }: LanguageSwitcherProps) {
  const { preference, systemLocale, setPreference, t } = useI18n()
  const resolvedSystemLabel = LANGUAGE_NATIVE_LABELS[systemLocale]

  return (
    <div className={cn('inline-flex items-center', className)}>
      <Select
        value={preference}
        onValueChange={(value) => setPreference(value as LanguagePreference)}
      >
        <SelectTrigger
          aria-label={t('language.label')}
          className={cn(
            'bg-white dark:bg-[#262628] border-slate-200 dark:border-[#38383A] text-slate-700 dark:text-[#F2F2F7] hover:bg-slate-50 dark:hover:bg-[#2C2C2E]',
            compact ? 'h-9 w-auto min-w-[120px] gap-1.5 px-2.5 text-xs' : 'w-full sm:w-[260px]',
          )}
        >
          <Globe className="h-4 w-4 shrink-0 text-slate-500 dark:text-[#AEAEB2]" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="system">
            {compact
              ? t('language.system')
              : t('language.systemDetail', { resolved: resolvedSystemLabel })}
          </SelectItem>
          {SUPPORTED_LOCALES.map((code) => (
            <SelectItem key={code} value={code}>
              {LANGUAGE_NATIVE_LABELS[code]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
