"use client"

import { useEffect, useState, type FormEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Minus,
  Plus,
  Swords,
  Zap,
} from "lucide-react"
import {
  VALID_PER_PUZZLE_TIMES,
  VALID_SPRINT_DURATIONS,
  VALID_THEMES,
  calculateTargetPuzzles,
} from "@/lib/sprint-config"
import { getThemeDisplayName } from "@/lib/theme-config"
import { useI18n } from "@/components/i18n/i18n-provider"
import type { SavedPracticeRun } from "@/lib/api/preferences"

export const MIN_TRAINING_ELO = 600
export const MAX_TRAINING_ELO = 2700
const ELO_STEP = 100

export interface BuiltinRunTarget {
  id: string
  name: string
  eloType: string
  description: string
}

export interface PracticeRunEditorSavePayload {
  customRun?: Omit<SavedPracticeRun, "id">
  eloType: string
  rating: number
  ratingChanged: boolean
}

interface PracticeRunEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialRun?: SavedPracticeRun | null
  builtinRun?: BuiltinRunTarget | null
  getEloForType: (eloType: string) => number
  isSaving?: boolean
  onSave: (payload: PracticeRunEditorSavePayload) => Promise<boolean> | boolean
}

export function PracticeRunEditorModal({
  open,
  onOpenChange,
  initialRun,
  builtinRun,
  getEloForType,
  isSaving = false,
  onSave,
}: PracticeRunEditorModalProps) {
  const { t, locale } = useI18n()
  const isBuiltin = Boolean(builtinRun)

  const [name, setName] = useState("")
  const [theme, setTheme] = useState<string>("mixed")
  const [durationMinutes, setDurationMinutes] = useState<number>(5)
  const [perPuzzleSeconds, setPerPuzzleSeconds] = useState<number>(20)
  const [eloInput, setEloInput] = useState<string>("600")
  const [initialElo, setInitialElo] = useState<number>(600)
  const [eloTouched, setEloTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (builtinRun) {
      const currentElo = Math.min(
        MAX_TRAINING_ELO,
        Math.max(MIN_TRAINING_ELO, Math.round(getEloForType(builtinRun.eloType))),
      )
      setName(builtinRun.name)
      setEloInput(String(currentElo))
      setInitialElo(currentElo)
      setEloTouched(false)
    } else if (initialRun) {
      const eloType = `${initialRun.theme} ${initialRun.duration_minutes}/${initialRun.per_puzzle_seconds}`
      const currentElo = Math.min(
        MAX_TRAINING_ELO,
        Math.max(MIN_TRAINING_ELO, Math.round(getEloForType(eloType))),
      )
      setName(initialRun.name)
      setTheme(initialRun.theme)
      setDurationMinutes(initialRun.duration_minutes)
      setPerPuzzleSeconds(initialRun.per_puzzle_seconds)
      setEloInput(String(currentElo))
      setInitialElo(currentElo)
      setEloTouched(false)
    } else {
      const defaultEloType = "mixed 5/15"
      const currentElo = Math.min(
        MAX_TRAINING_ELO,
        Math.max(MIN_TRAINING_ELO, Math.round(getEloForType(defaultEloType))),
      )
      setName("")
      setTheme("mixed")
      setDurationMinutes(5)
      setPerPuzzleSeconds(15)
      setEloInput(String(currentElo))
      setInitialElo(currentElo)
      setEloTouched(false)
    }
    setError(null)
  }, [open, initialRun, builtinRun, getEloForType])

  // When changing theme/duration/pace before manually editing ELO, preview that config's existing ELO
  useEffect(() => {
    if (!open || isBuiltin || eloTouched) return
    const eloType = `${theme} ${durationMinutes}/${perPuzzleSeconds}`
    const currentElo = Math.min(
      MAX_TRAINING_ELO,
      Math.max(MIN_TRAINING_ELO, Math.round(getEloForType(eloType))),
    )
    setEloInput(String(currentElo))
    setInitialElo(currentElo)
  }, [open, isBuiltin, eloTouched, theme, durationMinutes, perPuzzleSeconds, getEloForType])

  const targetPuzzles = calculateTargetPuzzles(durationMinutes, perPuzzleSeconds)
  const resolvedEloType = builtinRun
    ? builtinRun.eloType
    : `${theme} ${durationMinutes}/${perPuzzleSeconds}`

  const parsedElo = eloInput.trim() === "" ? NaN : Number(eloInput.trim())
  const isInvalidElo =
    !Number.isInteger(parsedElo) ||
    parsedElo < MIN_TRAINING_ELO ||
    parsedElo > MAX_TRAINING_ELO

  const stepElo = (delta: number) => {
    const base = Number.isFinite(parsedElo) ? parsedElo : initialElo
    const next = Math.min(MAX_TRAINING_ELO, Math.max(MIN_TRAINING_ELO, Math.round(base + delta)))
    setEloInput(String(next))
    setEloTouched(true)
    setError(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isInvalidElo) {
      setError(`Enter a whole-number rating from ${MIN_TRAINING_ELO} to ${MAX_TRAINING_ELO}.`)
      return
    }

    if (builtinRun) {
      const ok = await onSave({
        eloType: builtinRun.eloType,
        rating: parsedElo,
        ratingChanged: parsedElo !== initialElo,
      })
      if (ok) onOpenChange(false)
      return
    }

    const trimmed = name.trim()
    const resolvedName =
      trimmed || `${getThemeDisplayName(theme, locale)} ${durationMinutes}m/${perPuzzleSeconds}s`
    if (resolvedName.length > 40) {
      setError("Run name must be 40 characters or fewer.")
      return
    }

    const ok = await onSave({
      customRun: {
        name: resolvedName,
        theme,
        duration_minutes: durationMinutes,
        per_puzzle_seconds: perPuzzleSeconds,
      },
      eloType: resolvedEloType,
      rating: parsedElo,
      ratingChanged: parsedElo !== initialElo,
    })
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="sm:max-w-md bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A]"
      >
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-[#F2F2F7]">
            {builtinRun
              ? t("runModal.editBuiltinTitle", { name: builtinRun.name })
              : initialRun
                ? t("runModal.editTitle")
                : t("runModal.addTitle")}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-[#AEAEB2]">
            {builtinRun
              ? builtinRun.description
              : t("runModal.configDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isBuiltin && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="run-name" className="text-slate-700 dark:text-[#D1D1D6]">
                  {t("runModal.runName")}
                </Label>
                <Input
                  id="run-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Fork Drill, Blitz 3/10"
                  maxLength={40}
                  className="bg-white dark:bg-[#262628] border-slate-200 dark:border-[#38383A] text-slate-900 dark:text-[#F2F2F7]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="run-theme" className="text-slate-700 dark:text-[#D1D1D6]">
                  {t("runModal.tacticalTheme")}
                </Label>
                <select
                  id="run-theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] px-3 text-sm text-slate-900 dark:text-[#F2F2F7]"
                >
                  {VALID_THEMES.map((themeKey) => (
                    <option key={themeKey} value={themeKey}>
                      {getThemeDisplayName(themeKey, locale)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="run-duration" className="text-slate-700 dark:text-[#D1D1D6]">
                    {t("runModal.duration")}
                  </Label>
                  <select
                    id="run-duration"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="h-10 w-full rounded-md border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] px-3 text-sm text-slate-900 dark:text-[#F2F2F7]"
                  >
                    {VALID_SPRINT_DURATIONS.map((mins) => (
                      <option key={mins} value={mins}>
                        {mins} min
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="run-pace" className="text-slate-700 dark:text-[#D1D1D6]">
                    {t("runModal.pacePerPuzzle")}
                  </Label>
                  <select
                    id="run-pace"
                    value={perPuzzleSeconds}
                    onChange={(e) => setPerPuzzleSeconds(Number(e.target.value))}
                    className="h-10 w-full rounded-md border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] px-3 text-sm text-slate-900 dark:text-[#F2F2F7]"
                  >
                    {VALID_PER_PUZZLE_TIMES.map((secs) => (
                      <option key={secs} value={secs}>
                        {secs} sec
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-[#38383A] bg-slate-50 dark:bg-[#262628] px-3.5 py-2.5 text-xs text-slate-600 dark:text-[#AEAEB2] flex items-center justify-between">
                <span>{t("runModal.targetPuzzles")}</span>
                <span className="font-semibold tabular-nums text-slate-900 dark:text-[#F2F2F7]">
                  {t("runModal.puzzlesCount", { count: targetPuzzles })}
                </span>
              </div>
            </>
          )}

          {/* Training ELO Editor (inline in Edit Run, matching Mobile App) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="run-elo" className="text-slate-700 dark:text-[#D1D1D6]">
                {t("runModal.trainingElo")}
              </Label>
              <span className="text-xs text-slate-500 dark:text-[#AEAEB2] tabular-nums">
                {MIN_TRAINING_ELO}–{MAX_TRAINING_ELO}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Decrease ELO by 100"
                disabled={isSaving || (Number.isFinite(parsedElo) && parsedElo <= MIN_TRAINING_ELO)}
                onClick={() => stepElo(-ELO_STEP)}
                className="h-10 w-10 shrink-0 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="run-elo"
                type="number"
                inputMode="numeric"
                min={MIN_TRAINING_ELO}
                max={MAX_TRAINING_ELO}
                step={25}
                value={eloInput}
                onChange={(e) => {
                  setEloInput(e.target.value)
                  setEloTouched(true)
                  setError(null)
                }}
                aria-invalid={isInvalidElo}
                className="text-center font-medium tabular-nums bg-white dark:bg-[#262628] border-slate-200 dark:border-[#38383A] text-slate-900 dark:text-[#F2F2F7]"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Increase ELO by 100"
                disabled={isSaving || (Number.isFinite(parsedElo) && parsedElo >= MAX_TRAINING_ELO)}
                onClick={() => stepElo(ELO_STEP)}
                className="h-10 w-10 shrink-0 border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-[#FF6961]">{error}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
              className="border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#262628] text-slate-700 dark:text-[#F2F2F7]"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSaving || isInvalidElo}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-[#0A6FE0] dark:hover:bg-[#1980F5] text-white"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {builtinRun || initialRun ? t("settings.saveChanges") : t("sprint.addRunButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function HowSprintWorksModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const rules = [
    {
      icon: Clock,
      title: t("runModal.rule1Title"),
      body: t("runModal.rule1Body"),
    },
    {
      icon: CheckCircle2,
      title: t("runModal.rule2Title"),
      body: t("runModal.rule2Body"),
    },
    {
      icon: Swords,
      title: t("runModal.rule3Title"),
      body: t("runModal.rule3Body"),
    },
    {
      icon: Zap,
      title: t("runModal.rule4Title"),
      body: t("runModal.rule4Body"),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-[#F2F2F7]">
            <HelpCircle className="h-5 w-5 text-blue-600 dark:text-[#4DA3FF]" />
            <span>{t("sprint.howItWorks")}</span>
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-[#AEAEB2]">
            {t("runModal.howSubtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {rules.map((rule) => {
            const Icon = rule.icon
            return (
              <div
                key={rule.title}
                className="flex items-center gap-3.5 rounded-xl border border-slate-100 dark:border-[#2C2C2E] bg-slate-50/70 dark:bg-[#262628] p-3.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-[#0B2A4D] text-blue-600 dark:text-[#4DA3FF] shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-[#F2F2F7]">
                    {rule.title}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-[#AEAEB2] mt-0.5 leading-relaxed">
                    {rule.body}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {t("runModal.gotIt")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
