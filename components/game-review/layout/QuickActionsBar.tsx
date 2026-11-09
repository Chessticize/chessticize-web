"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BarChart3, Calendar, ArrowRight, AlertTriangle, Brain, Gamepad2, Puzzle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { GameReviewData } from "@/hooks/useGameReviewData"

interface QuickActionsBarProps {
  hasData: boolean
  data?: GameReviewData | null
  className?: string
}

export function QuickActionsBar({ hasData, data, className }: QuickActionsBarProps) {
  if (!hasData) {
    return (
      <Card className={cn("bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200", className)}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Ready to dive deeper?
              </h3>
              <p className="text-sm text-gray-600">
                Add chess profiles in Settings to start analyzing your games
              </p>
            </div>

            <Link href="/settings">
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                <Calendar className="h-4 w-4 mr-2" />
                Add Chess Profile
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200", className)}>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Ready to dive deeper?
            </h3>
            <p className="text-sm text-gray-600">
              Practice puzzles from your games and explore detailed analysis
            </p>
          </div>

          {/* View Actions Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* View Detailed Insights */}
            <Link href="/game-review/insights">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Detailed Insights
              </Button>
            </Link>

            {/* View My Puzzles */}
            <Link href="/puzzles">
              <Button variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-50">
                <Puzzle className="h-4 w-4 mr-2" />
                View My Puzzles
              </Button>
            </Link>

            {/* View My Games */}
            <Link href="/games">
              <Button variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50">
                <Gamepad2 className="h-4 w-4 mr-2" />
                View My Games
              </Button>
            </Link>
          </div>

          {/* Practice Buttons Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Practice Missed Opportunities */}
            <Link href="/review-queue?mode=regular&puzzle_source=user_game&theme_groups=missed_opportunity">
              <Button variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-50">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Practice Missed Opportunities
              </Button>
            </Link>

            {/* Practice My Mistakes */}
            <Link href="/review-queue?mode=arrow_duel&puzzle_source=user_game&theme_groups=missed_attack,own_mistake_punished">
              <Button variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-50">
                <Brain className="h-4 w-4 mr-2" />
                Practice My Mistakes
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
