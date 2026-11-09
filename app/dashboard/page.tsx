"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Navigation from "@/components/navigation"
import { MobileLayout, MobileContainer, MobileCard } from "@/components/ui/mobile-layout"
import { Brain, Target, Gamepad2Icon as GameController2, Flame } from "lucide-react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useDailyPuzzleStreak } from "@/hooks/useDailyPuzzleStreak"
import Footer from "@/components/footer"
import { DevelopmentNotice } from "@/components/development-notice"

export default function DashboardPage() {
  const { streak: currentStreak } = useDailyPuzzleStreak()

  return (
    <ProtectedRoute>
      <MobileLayout fullHeight>
        <div className="min-h-screen bg-gray-50">
          <Navigation />

          <MobileContainer padding="lg">
            {/* Development Notice */}
            <DevelopmentNotice className="mb-6" />

            <MobileCard padding="lg" className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-orange-600 mb-2">Welcome back!</h1>
                  <p className="text-base sm:text-lg lg:text-xl text-gray-600">What would you like to do today?</p>
                </div>
                <div className="flex items-center space-x-2 bg-orange-100 px-3 py-2 rounded-full self-start sm:self-auto">
                  <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  <span className="text-sm sm:text-base lg:text-lg font-semibold text-orange-800">Daily Streak: {currentStreak}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                <Link href="/puzzle-sprint" className="block">
                  <Card className="hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 min-h-[80px] sm:min-h-[100px]">
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="bg-orange-600 p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl flex-shrink-0">
                          <Target className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-800 mb-1 sm:mb-2">Puzzle Sprint</h3>
                          <p className="text-sm sm:text-base text-orange-700 line-clamp-2">Rapid-fire puzzles and thematic training to sharpen your tactical instincts.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/game-review" className="block">
                  <Card className="hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 min-h-[80px] sm:min-h-[100px]">
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="bg-orange-600 p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl flex-shrink-0">
                          <GameController2 className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-800 mb-1 sm:mb-2">Game Review</h3>
                          <p className="text-sm sm:text-base text-orange-700 line-clamp-2">Analyze your games and find recurring tactical patterns.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/review-queue" className="block">
                  <Card className="hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 min-h-[80px] sm:min-h-[100px]">
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="bg-orange-600 p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl flex-shrink-0">
                          <Brain className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-800 mb-1 sm:mb-2">Review Queue</h3>
                          <p className="text-sm sm:text-base text-orange-700 line-clamp-2">Practice due positions from Game Review and failed sprints.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </MobileCard>
          </MobileContainer>
        </div>

        <Footer hideOnMobile={true} className="hidden lg:block" />
      </MobileLayout>
    </ProtectedRoute>
  )
}
