"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, Gamepad2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickStatsCardProps {
  totalGames: number
  totalOpportunities: number
  averagePuzzleLength: number
  isLoading?: boolean
  className?: string
}

export function QuickStatsCard({ 
  totalGames,
  totalOpportunities,
  averagePuzzleLength,
  isLoading = false,
  className 
}: QuickStatsCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("border-purple-200 bg-purple-50", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-purple-800">
            <BarChart3 className="h-5 w-5" />
            <span>Quick Stats</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-purple-200 bg-purple-50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-purple-800">
          <BarChart3 className="h-5 w-5" />
          <span>Quick Stats</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Games Analyzed */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-700">Games Analyzed</span>
            <span className="font-semibold text-purple-900">
              {totalGames.toLocaleString()}
            </span>
          </div>
          
          {/* Total Opportunities */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-700">Total Opportunities</span>
            <span className="font-semibold text-purple-900">
              {totalOpportunities.toLocaleString()}
            </span>
          </div>
          
          {/* Average Puzzle Length */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-700">Avg Puzzle Length</span>
            <span className="font-semibold text-purple-900">
              {averagePuzzleLength.toFixed(1)} moves
            </span>
          </div>
          
          {/* Activity indicator */}
          <div className="pt-2 border-t border-purple-200">
            <div className="flex items-center space-x-2">
              <Gamepad2 className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-purple-600">
                {totalGames > 0 ? 'Active Analysis' : 'No Data Yet'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
