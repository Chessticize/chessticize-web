"use client"

import React from 'react'
import { Crown } from 'lucide-react'
import { getArrowDuelActiveColor, getPuzzlePlayerColor } from '@/lib/chess/board-helpers'
import { useI18n } from '@/components/i18n/i18n-provider'
import { cn } from '@/lib/utils'

export function TurnIndicator({ fen, className }: { fen: string; className?: string }) {
  const { t } = useI18n()
  const puzzleColor = getPuzzlePlayerColor(fen)
  const isWhitePuzzle = puzzleColor === 'white'
  const turnLabel = t(isWhitePuzzle ? 'sprint.whiteTurn' : 'sprint.blackTurn')

  return (
    <div
      className={cn(
        'flex items-center justify-center lg:justify-start py-2 px-3 bg-white dark:bg-[#1C1C1E] rounded-xl border border-slate-200 dark:border-[#38383A] shadow-2xs',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            'p-1.5 rounded-full shrink-0',
            isWhitePuzzle
              ? 'bg-slate-100 dark:bg-[#F2F2F7] border border-slate-300 dark:border-[#48484A]'
              : 'bg-slate-900 dark:bg-[#2C2C2E] border border-slate-900 dark:border-[#48484A]',
          )}
        >
          <Crown
            className={cn(
              'h-4 w-4',
              isWhitePuzzle ? 'text-slate-800 dark:text-[#111318]' : 'text-white',
            )}
          />
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
          <span className="font-semibold text-slate-900 dark:text-[#F2F2F7] text-sm">
            {turnLabel}
          </span>
          <span className="text-xs text-slate-500 dark:text-[#AEAEB2]">
            {t('sprint.findBestMoveShort')}
          </span>
        </div>
      </div>
    </div>
  )
}

export function ArrowDuelIndicator({ fen, className }: { fen: string; className?: string }) {
  const { t } = useI18n()
  const activeColor = getArrowDuelActiveColor(fen)
  const isWhiteToMove = activeColor === 'white'
  const turnLabel = t(isWhiteToMove ? 'sprint.whiteTurn' : 'sprint.blackTurn')

  return (
    <div
      className={cn(
        'flex items-center justify-center lg:justify-start py-2 px-3 bg-white dark:bg-[#1C1C1E] rounded-xl border border-slate-200 dark:border-[#38383A] shadow-2xs',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            'p-1.5 rounded-full shrink-0',
            isWhiteToMove
              ? 'bg-slate-100 dark:bg-[#F2F2F7] border border-slate-300 dark:border-[#48484A]'
              : 'bg-slate-900 dark:bg-[#2C2C2E] border border-slate-900 dark:border-[#48484A]',
          )}
        >
          <Crown
            className={cn(
              'h-4 w-4',
              isWhiteToMove ? 'text-slate-800 dark:text-[#111318]' : 'text-white',
            )}
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-slate-900 dark:text-[#F2F2F7] text-sm">
              {turnLabel}
            </span>
            <span className="text-[11px] font-medium text-blue-600 dark:text-[#4DA3FF]">
              {t('common.arrowDuel')}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-[#AEAEB2]">
            {t('sprint.arrowDuelShortPrompt')}
          </div>
        </div>
      </div>
    </div>
  )
}
