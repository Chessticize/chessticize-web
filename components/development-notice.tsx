"use client"

import { useEffect, useState } from "react"
import { Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n/i18n-provider"

const BANNER_DISMISSED_KEY = "chessticize_banner_web_redesign_2026_dismissed"
const FEEDBACK_ISSUES_URL = "https://github.com/Chessticize/chessticize-web/issues/new"
const SUPPORT_EMAIL = "support@chessticize.com"

interface DevelopmentNoticeProps {
  className?: string
}

export function DevelopmentNotice({ className }: DevelopmentNoticeProps) {
  const { t } = useI18n()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(BANNER_DISMISSED_KEY) === "1") {
        setDismissed(true)
      }
    } catch {
      // Ignore storage read errors
    }
  }, [])

  if (dismissed) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(BANNER_DISMISSED_KEY, "1")
    } catch {
      // Ignore storage write errors
    }
  }

  return (
    <div
      role="status"
      className={cn(
        "relative rounded-xl border border-blue-200 dark:border-[#16467A] bg-blue-50/75 dark:bg-[#0B2A4D]/65 px-4 py-3.5 pr-10 text-slate-800 dark:text-[#F2F2F7] shadow-2xs",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-blue-100/80 hover:text-slate-900 dark:text-[#AEAEB2] dark:hover:bg-[#16467A]/60 dark:hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-[#4DA3FF]" />
        <div className="space-y-1 text-xs sm:text-sm leading-relaxed">
          <div className="font-semibold text-slate-900 dark:text-[#F2F2F7]">
            {t("notice.welcomeTitle")}
          </div>
          <p className="text-slate-700 dark:text-[#D1D1D6]">
            {t("notice.welcomeBody")}{" "}
            <a
              href={FEEDBACK_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 dark:text-[#4DA3FF] underline underline-offset-2 hover:text-blue-800 dark:hover:text-[#7CC0FF]"
            >
              GitHub
            </a>{" "}
            {t("notice.orEmail")}{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-blue-700 dark:text-[#4DA3FF] underline underline-offset-2 hover:text-blue-800 dark:hover:text-[#7CC0FF]"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
