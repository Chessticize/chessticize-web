"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Badge } from "@/components/ui/badge"
import { GameReviewData } from "@/hooks/useGameReviewData"

interface CombinedPuzzleLengthChartProps {
  data: GameReviewData
}

export function CombinedPuzzleLengthChart({ data }: CombinedPuzzleLengthChartProps) {
  if (!data?.opponentMistakesMissed3M?.move_length_counts?.length && 
      !data?.opponentMistakesCaught3M?.move_length_counts?.length &&
      !data?.myMistakes3M?.move_length_counts?.length) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📏</div>
          <p>No puzzle length data available</p>
        </div>
      </div>
    )
  }

  // Process and combine all three data sources
  const processData = () => {
    const lengthMap = new Map<number, {
      length: number
      missed: number
      caught: number
      myMistakes: number
    }>()

    // Process missed opportunities (all-time data)
    data.opponentMistakesMissedAllTime?.move_length_counts?.forEach(item => {
      const puzzleLength = Math.round(item.length / 2) // Divide by 2 as requested
      if (!lengthMap.has(puzzleLength)) {
        lengthMap.set(puzzleLength, { length: puzzleLength, missed: 0, caught: 0, myMistakes: 0 })
      }
      lengthMap.get(puzzleLength)!.missed = item.count
    })

    // Process caught opportunities (all-time data)
    data.opponentMistakesCaughtAllTime?.move_length_counts?.forEach(item => {
      const puzzleLength = Math.round(item.length / 2) // Divide by 2 as requested
      if (!lengthMap.has(puzzleLength)) {
        lengthMap.set(puzzleLength, { length: puzzleLength, missed: 0, caught: 0, myMistakes: 0 })
      }
      lengthMap.get(puzzleLength)!.caught = item.count
    })

    // Process my mistakes (all-time data)
    data.myMistakesAllTime?.move_length_counts?.forEach(item => {
      const puzzleLength = Math.round(item.length / 2) // Divide by 2 as requested
      if (!lengthMap.has(puzzleLength)) {
        lengthMap.set(puzzleLength, { length: puzzleLength, missed: 0, caught: 0, myMistakes: 0 })
      }
      lengthMap.get(puzzleLength)!.myMistakes = item.count
    })

    // Convert to array and sort by length
    return Array.from(lengthMap.values())
      .filter(item => item.missed > 0 || item.caught > 0 || item.myMistakes > 0)
      .sort((a, b) => a.length - b.length)
  }

  const chartData = processData()

  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📏</div>
          <p>No puzzle length data available</p>
        </div>
      </div>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label} moves</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: <span className="font-semibold">{entry.value}</span>
              </p>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  // Calculate statistics for each category
  const calculateStats = (data: typeof chartData, key: 'missed' | 'caught' | 'myMistakes') => {
    const total = data.reduce((sum, item) => sum + item[key], 0)
    if (total === 0) return { avg: 0, mostCommon: 0, total: 0 }

    const weightedSum = data.reduce((sum, item) => sum + (item.length * item[key]), 0)
    const avg = weightedSum / total
    const mostCommon = data.reduce((max, item) => item[key] > max[key] ? item : max, data[0])

    return { avg, mostCommon: mostCommon.length, total }
  }

  const missedStats = calculateStats(chartData, 'missed')
  const caughtStats = calculateStats(chartData, 'caught')
  const myMistakesStats = calculateStats(chartData, 'myMistakes')

  const getComplexityLabel = (length: number) => {
    if (length <= 1.5) return 'Simple'
    if (length <= 2.5) return 'Moderate'
    return 'Complex'
  }

  // Calculate appropriate interval based on data length to prevent crowding
  const getTickInterval = () => {
    if (chartData.length <= 5) return 0 // Show all ticks
    if (chartData.length <= 8) return 1 // Show every other tick
    return Math.ceil(chartData.length / 6) // Show ~6 ticks max
  }

  return (
    <div className="space-y-8">
      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="length"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              interval={getTickInterval()}
              tickFormatter={(value) => value.toString()}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="missed" 
              fill="#ef4444"
              name="Missed Opportunities"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="caught" 
              fill="#22c55e"
              name="Successfully Caught"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="myMistakes" 
              fill="#f97316"
              name="My Mistakes"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Missed Opportunities Stats */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-red-700 flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Missed Opportunities</span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-semibold text-red-900">{missedStats.avg.toFixed(1)}</div>
              <div className="text-xs text-red-700">Average Length</div>
              <div className="text-xs font-medium text-red-600">
                {getComplexityLabel(missedStats.avg)}
              </div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-semibold text-red-900">{missedStats.mostCommon}</div>
              <div className="text-xs text-red-700">Most Common</div>
              <div className="text-xs text-red-600">
                {missedStats.total} total
              </div>
            </div>
          </div>
        </div>

        {/* Successfully Caught Stats */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-green-700 flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Successfully Caught</span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-900">{caughtStats.avg.toFixed(1)}</div>
              <div className="text-xs text-green-700">Average Length</div>
              <div className="text-xs font-medium text-green-600">
                {getComplexityLabel(caughtStats.avg)}
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-900">{caughtStats.mostCommon}</div>
              <div className="text-xs text-green-700">Most Common</div>
              <div className="text-xs text-green-600">
                {caughtStats.total} total
              </div>
            </div>
          </div>
        </div>

        {/* My Mistakes Stats */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-orange-700 flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>My Mistakes</span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-lg font-semibold text-orange-900">{myMistakesStats.avg.toFixed(1)}</div>
              <div className="text-xs text-orange-700">Average Length</div>
              <div className="text-xs font-medium text-orange-600">
                {getComplexityLabel(myMistakesStats.avg)}
              </div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-lg font-semibold text-orange-900">{myMistakesStats.mostCommon}</div>
              <div className="text-xs text-orange-700">Most Common</div>
              <div className="text-xs text-orange-600">
                {myMistakesStats.total} total
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparative Insights */}
      <div className="pt-4 border-t border-gray-200">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Complexity Comparison</h4>
          <div className="text-sm text-gray-700 space-y-2">
            {/* Compare missed vs caught */}
            {missedStats.avg > caughtStats.avg + 0.3 ? (
              <p className="flex items-start space-x-2">
                <span className="text-red-600">🔍</span>
                <span>You're missing more complex tactical opportunities ({missedStats.avg.toFixed(1)} moves) than you're catching ({caughtStats.avg.toFixed(1)} moves). Focus on pattern recognition for longer sequences.</span>
              </p>
            ) : caughtStats.avg > missedStats.avg + 0.3 ? (
              <p className="flex items-start space-x-2">
                <span className="text-green-600">🎯</span>
                <span>Great! You're successfully catching more complex tactics ({caughtStats.avg.toFixed(1)} moves) than you're missing ({missedStats.avg.toFixed(1)} moves).</span>
              </p>
            ) : (
              <p className="flex items-start space-x-2">
                <span className="text-blue-600">⚖️</span>
                <span>Your missed and caught opportunities have similar complexity levels. Focus on consistency in pattern recognition.</span>
              </p>
            )}

            {/* Compare mistakes vs opportunities */}
            {myMistakesStats.avg > Math.max(missedStats.avg, caughtStats.avg) + 0.3 ? (
              <p className="flex items-start space-x-2">
                <span className="text-orange-600">⚠️</span>
                <span>Your mistakes tend to occur in more complex positions ({myMistakesStats.avg.toFixed(1)} moves). Consider slowing down in complicated tactical situations.</span>
              </p>
            ) : myMistakesStats.avg < Math.min(missedStats.avg, caughtStats.avg) - 0.3 ? (
              <p className="flex items-start space-x-2">
                <span className="text-green-600">✅</span>
                <span>Good news! Your mistakes are in simpler positions ({myMistakesStats.avg.toFixed(1)} moves), showing strong tactical awareness in complex situations.</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
