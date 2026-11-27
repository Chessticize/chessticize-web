"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Palette, Check, Monitor, Sun, Moon } from "lucide-react"
import {
  BOARD_THEMES,
  type BoardAppearanceMode,
  type BoardThemeId,
} from "@/lib/chess/board-themes"
import { useBoardTheme } from "@/hooks/useBoardTheme"
import { useI18n } from "@/components/i18n/i18n-provider"
import { syncUserPreferencesInBackground, type ThemeMode } from "@/lib/api/preferences"
import { cn } from "@/lib/utils"

const THEME_MODES: ReadonlyArray<{
  id: ThemeMode
  labelKey: "appearance.themeMode.system" | "appearance.themeMode.light" | "appearance.themeMode.dark"
  icon: typeof Monitor
}> = [
  { id: "system", labelKey: "appearance.themeMode.system", icon: Monitor },
  { id: "light", labelKey: "appearance.themeMode.light", icon: Sun },
  { id: "dark", labelKey: "appearance.themeMode.dark", icon: Moon },
]

export function BoardThemeSelector() {
  const { theme, setTheme } = useTheme()
  const {
    lightBoardThemeId,
    darkBoardThemeId,
    resolvedAppearance,
    setBoardThemeForMode,
  } = useBoardTheme()
  const { t } = useI18n()

  const [mounted, setMounted] = useState(false)
  const [editingBoardMode, setEditingBoardMode] = useState<BoardAppearanceMode>("light")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      setEditingBoardMode(resolvedAppearance)
    }
  }, [mounted, resolvedAppearance])

  const activeThemeMode: ThemeMode =
    mounted && (theme === "light" || theme === "dark" || theme === "system")
      ? theme
      : "system"

  const selectedBoardThemeId =
    editingBoardMode === "dark" ? darkBoardThemeId : lightBoardThemeId

  const handleThemeModeChange = (nextMode: ThemeMode) => {
    setTheme(nextMode)
    if (nextMode === "light" || nextMode === "dark") {
      setEditingBoardMode(nextMode)
    }
    syncUserPreferencesInBackground({ theme_mode: nextMode })
  }

  return (
    <Card className="mb-6 bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-[#F2F2F7]">
          <Palette className="h-4 w-4 text-blue-600 dark:text-[#4DA3FF]" />
          <span>{t("appearance.sectionTitle")}</span>
        </CardTitle>
        <CardDescription className="text-sm text-slate-500 dark:text-[#AEAEB2]">
          {t("appearance.boardDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Mode (System / Light / Dark) */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-[#AEAEB2]">
            {t("appearance.themeModeHeading")}
          </div>
          <div
            role="radiogroup"
            aria-label={t("appearance.themeModeHeading")}
            className="inline-grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-[#262628] p-1 border border-slate-200/80 dark:border-[#38383A] w-full sm:w-auto"
          >
            {THEME_MODES.map((option) => {
              const Icon = option.icon
              const isSelected = activeThemeMode === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-theme-mode={option.id}
                  onClick={() => handleThemeModeChange(option.id)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    isSelected
                      ? "bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{t(option.labelKey)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Independent Light & Dark Board Theme Pickers */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#2C2C2E]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-[#AEAEB2]">
              {t("appearance.boardHeading")}
            </div>
            <div
              role="tablist"
              aria-label={t("appearance.boardHeading")}
              className="inline-flex rounded-lg bg-slate-100 dark:bg-[#262628] p-0.5 border border-slate-200/80 dark:border-[#38383A] self-start sm:self-auto"
            >
              <button
                type="button"
                role="tab"
                aria-selected={editingBoardMode === "light"}
                data-board-mode-tab="light"
                onClick={() => setEditingBoardMode("light")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  editingBoardMode === "light"
                    ? "bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white",
                )}
              >
                <Sun className="h-3.5 w-3.5" />
                <span>{t("appearance.lightBoard")}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={editingBoardMode === "dark"}
                data-board-mode-tab="dark"
                onClick={() => setEditingBoardMode("dark")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  editingBoardMode === "dark"
                    ? "bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white",
                )}
              >
                <Moon className="h-3.5 w-3.5" />
                <span>{t("appearance.darkBoard")}</span>
              </button>
            </div>
          </div>

          <div
            role="radiogroup"
            aria-label={
              editingBoardMode === "dark"
                ? t("appearance.darkBoard")
                : t("appearance.lightBoard")
            }
            className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5"
          >
            {BOARD_THEMES.map((boardOption) => {
              const isSelected = boardOption.id === selectedBoardThemeId
              const label = t(boardOption.labelKey)

              return (
                <button
                  key={boardOption.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={label}
                  data-board-theme={boardOption.id}
                  onClick={() =>
                    setBoardThemeForMode(editingBoardMode, boardOption.id as BoardThemeId)
                  }
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-xl border p-2.5 transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    isSelected
                      ? "border-blue-500 bg-blue-50/70 dark:bg-[#0B2A4D]/70 dark:border-[#4DA3FF] shadow-xs"
                      : "border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] hover:border-slate-300 dark:hover:border-[#48484A] hover:bg-slate-50 dark:hover:bg-[#2C2C2E]",
                  )}
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-md border border-slate-300/80 dark:border-[#48484A] shadow-2xs grid grid-cols-2 grid-rows-2">
                    <span style={{ backgroundColor: boardOption.lightSquare }} />
                    <span style={{ backgroundColor: boardOption.darkSquare }} />
                    <span style={{ backgroundColor: boardOption.darkSquare }} />
                    <span style={{ backgroundColor: boardOption.lightSquare }} />
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium leading-tight truncate max-w-full",
                      isSelected
                        ? "text-blue-700 dark:text-[#4DA3FF]"
                        : "text-slate-700 dark:text-[#D1D1D6]",
                    )}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
