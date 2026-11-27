"use client"

import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n/i18n-provider"
import type { GameReviewTimeClass } from "@/hooks/useGameReviewData"

const TIME_CLASS_OPTIONS: ReadonlyArray<{
  value: GameReviewTimeClass
  labelKey:
    | "common.all"
    | "timeClass.rapid"
    | "timeClass.blitz"
    | "timeClass.bullet"
    | "timeClass.classical"
}> = [
  { value: "", labelKey: "common.all" },
  { value: "rapid", labelKey: "timeClass.rapid" },
  { value: "blitz", labelKey: "timeClass.blitz" },
  { value: "bullet", labelKey: "timeClass.bullet" },
  { value: "classical", labelKey: "timeClass.classical" },
]

interface TimeClassFilterBarProps {
  value: GameReviewTimeClass
  onChange: (next: GameReviewTimeClass) => void
  className?: string
  includeClassical?: boolean
  size?: "sm" | "md"
}

export function TimeClassFilterBar({
  value,
  onChange,
  className,
  includeClassical = true,
  size = "md",
}: TimeClassFilterBarProps) {
  const { t } = useI18n()
  const options = includeClassical
    ? TIME_CLASS_OPTIONS
    : TIME_CLASS_OPTIONS.filter((opt) => opt.value !== "classical")

  return (
    <div
      role="tablist"
      aria-label={t("timeClass.label")}
      className={cn(
        "inline-flex flex-wrap items-center rounded-xl bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#38383A] p-1 shadow-2xs",
        className,
      )}
    >
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value || "all"}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg font-medium transition-colors whitespace-nowrap",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm",
              active
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white",
            )}
          >
            {t(option.labelKey)}
          </button>
        )
      })}
    </div>
  )
}
