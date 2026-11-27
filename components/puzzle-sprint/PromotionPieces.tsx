"use client"

import React, { useEffect } from "react"
import { X } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import type { TranslationKey } from "@/lib/i18n"

export type PromotionPieceSymbol = "q" | "r" | "b" | "n"

const PIECE_LABEL_KEYS: Record<PromotionPieceSymbol, TranslationKey> = {
  q: "promotion.queen",
  r: "promotion.rook",
  b: "promotion.bishop",
  n: "promotion.knight",
}

export function PromotionPieceSvg({
  color,
  piece,
  className = "w-10 h-10 sm:w-12 sm:h-12",
}: {
  color: "w" | "b"
  piece: PromotionPieceSymbol
  className?: string
}) {
  const isWhite = color === "w"
  const fill = isWhite ? "#FFFFFF" : "#1E293B"
  const stroke = isWhite ? "#1E293B" : "#F8FAFC"
  const detailStroke = isWhite ? "#1E293B" : "#CBD5E1"

  if (piece === "q") {
    return (
      <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
        <g
          fill={fill}
          fillRule="evenodd"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="6" cy="12" r="2.75" />
          <circle cx="14" cy="9" r="2.75" />
          <circle cx="22.5" cy="8" r="2.75" />
          <circle cx="31" cy="9" r="2.75" />
          <circle cx="39" cy="12" r="2.75" />
          <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" />
          <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
          <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke={detailStroke} />
        </g>
      </svg>
    )
  }

  if (piece === "r") {
    return (
      <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
        <g
          fill={fill}
          fillRule="evenodd"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
          <path d="M34 14l-3 3H14l-3-3" />
          <path d="M31 17v12.5H14V17" />
          <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
          <path d="M11 14h23" fill="none" stroke={detailStroke} />
        </g>
      </svg>
    )
  }

  if (piece === "b") {
    return (
      <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
        <g
          fill="none"
          fillRule="evenodd"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g fill={fill} strokeLinecap="butt">
            <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" />
            <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
            <circle cx="22.5" cy="8" r="2.5" />
          </g>
          <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke={detailStroke} />
        </g>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
      <g
        fill="none"
        fillRule="evenodd"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
          fill={fill}
        />
        <path
          d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"
          fill={fill}
        />
        <circle cx="9.5" cy="25.5" r="0.6" fill={detailStroke} stroke={detailStroke} />
        <circle cx="15" cy="15.5" r="1" fill={detailStroke} stroke={detailStroke} />
      </g>
    </svg>
  )
}

export function PromotionPickerOverlay({
  color,
  pieces = ["q", "r", "b", "n"],
  title,
  onSelect,
  onCancel,
}: {
  color: "w" | "b"
  pieces?: PromotionPieceSymbol[]
  title?: string
  onSelect: (piece: PromotionPieceSymbol) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const resolvedTitle = title ?? t("promotion.promoteTo")
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose promotion piece"
      data-testid="promotion-picker"
      onClick={onCancel}
      className="absolute inset-0 z-30 flex items-center justify-center rounded-lg bg-slate-950/45 backdrop-blur-[1.5px] p-3"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[300px] rounded-2xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-3.5 shadow-xl"
      >
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#F2F2F7]">
            {resolvedTitle}
          </span>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t("common.cancel")}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-[#8E8E93] dark:hover:bg-[#2C2C2E] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className={`grid gap-2 ${
            pieces.length === 2 ? "grid-cols-2" : "grid-cols-4"
          }`}
        >
          {pieces.map((piece) => {
            const label = t(PIECE_LABEL_KEYS[piece])
            return (
              <button
                key={piece}
                type="button"
                data-testid={`promotion-option-${piece}`}
                aria-label={`${t("promotion.promoteTo")} ${label}`}
                onClick={() => onSelect(piece)}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-[#38383A] bg-slate-50 dark:bg-[#262628] py-2.5 px-1.5 hover:border-blue-400 dark:hover:border-[#4DA3FF] hover:bg-blue-50 dark:hover:bg-[#0B2A4D]/60 active:scale-95 transition-all touch-manipulation"
              >
                <PromotionPieceSvg color={color} piece={piece} className="w-9 h-9 sm:w-11 sm:h-11" />
                <span className="text-[11px] font-medium text-slate-700 dark:text-[#D1D1D6]">
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
