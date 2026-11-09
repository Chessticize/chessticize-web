"use client"


import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Footer from "@/components/footer"
import { Target, Gamepad2Icon as GameController2, TrendingUp, ChevronRight } from "lucide-react"

import { useAuthContext } from "@/components/auth/auth-provider"
import { hasValidAuth } from "@/lib/auth/tokens"
import { DevelopmentNotice } from "@/components/development-notice"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthContext()

  // Check for tokens immediately
  const hasTokens = hasValidAuth()

  // Redirect immediately if authenticated (no useEffect delay)
  if (!isLoading && isAuthenticated) {
    router.push("/puzzle-sprint")
    // Return loading state while redirect is happening
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Redirecting to Puzzle Sprint...</p>
        </div>
      </div>
    )
  }

  // Show loading state if we have tokens (likely authenticated) or if auth is still loading
  if (isLoading || (hasTokens && !isAuthenticated)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            {hasTokens ? "Signing you in..." : "Loading..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Development Notice */}
          <DevelopmentNotice className="mb-8" />
          {/* Logo and Title */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-orange-600 mb-4">
              Chessticize
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 mb-8">
              Master tactical patterns with our adaptive puzzle challenge, then train your mind to spot and avoid blunders in our unique Arrow Duel mode.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="bg-orange-100 p-3 rounded-full w-fit mx-auto mb-4">
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Puzzle Sprint</h3>
                <p className="text-gray-600 text-sm">
                  Rapid-fire tactical puzzles to sharpen your pattern recognition
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="bg-orange-100 p-3 rounded-full w-fit mx-auto mb-4">
                  <GameController2 className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Arrow Duel</h3>
                <p className="text-gray-600 text-sm">
                  Best vs blunder: pick the right move under time pressure.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3" onClick={() => { window.location.href = '/auth' }}>
              Get Started
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>

      {/* Footer - Only show on desktop */}
      <Footer hideOnMobile={false} className="hidden lg:block" />
    </div>
  )
}
