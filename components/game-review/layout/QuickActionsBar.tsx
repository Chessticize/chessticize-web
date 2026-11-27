"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BarChart3, Calendar, ArrowRight, AlertTriangle, Brain, Gamepad2, Puzzle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { GameReviewData, type GameReviewTimeClass } from "@/hooks/useGameReviewData"
import { useI18n } from "@/components/i18n/i18n-provider"

interface QuickActionsBarProps {
  hasData: boolean
  data?: GameReviewData | null
  timeClass?: GameReviewTimeClass
  className?: string
}

export function QuickActionsBar({ hasData, data, timeClass, className }: QuickActionsBarProps) {
  const { t } = useI18n()
  const activeTimeClass = timeClass ?? data?.timeClass ?? ""
  const timeClassSuffix = activeTimeClass ? `&time_class=${encodeURIComponent(activeTimeClass)}` : ""
  const timeClassQuery = activeTimeClass ? `?time_class=${encodeURIComponent(activeTimeClass)}` : ""

  if (!hasData) {
    return (
      <Card className={cn("bg-white border-slate-200 shadow-sm", className)}>
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">
                {t("gameReview.readyToDiveDeeper")}
              </h3>
              <p className="text-sm text-slate-600">
                {t("gameReview.diveDeeperNoProfile")}
              </p>
            </div>

            <Link href="/settings">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Calendar className="h-4 w-4 mr-2" />
                {t("settings.addChessProfile")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("bg-white border-slate-200 shadow-sm", className)}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">
              {t("gameReview.readyToDiveDeeper")}
            </h3>
            <p className="text-sm text-slate-600">
              {t("gameReview.diveDeeperDesc")}
            </p>
          </div>

          {/* View Actions Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* View Detailed Insights */}
            <Link href={`/game-review/insights${timeClassQuery}`}>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                {t("gameReview.viewDetailedInsights")}
              </Button>
            </Link>

            {/* View My Puzzles */}
            <Link href={`/puzzles${timeClassQuery}`}>
              <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50">
                <Puzzle className="h-4 w-4 mr-2" />
                {t("gameReview.viewMyPuzzles")}
              </Button>
            </Link>

            {/* View My Games */}
            <Link href="/games">
              <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50">
                <Gamepad2 className="h-4 w-4 mr-2" />
                {t("gameReview.viewMyGames")}
              </Button>
            </Link>
          </div>

          {/* Practice Buttons Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Practice Missed Opportunities */}
            <Link href={`/review-queue?puzzle_source=user_game&theme_groups=missed_opportunity,missed_attack${timeClassSuffix}`}>
              <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50">
                <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" />
                {t("gameReview.practiceMissedOpportunities")}
              </Button>
            </Link>

            {/* Practice My Mistakes */}
            <Link href={`/review-queue?mode=arrow_duel&puzzle_source=user_game&theme_groups=own_mistake_punished,own_mistake_escaped${timeClassSuffix}`}>
              <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50">
                <Brain className="h-4 w-4 mr-2 text-blue-600" />
                {t("gameReview.practiceMyMistakes")}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
