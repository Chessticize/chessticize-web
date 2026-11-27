"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { BarChart3 } from "lucide-react"
import { GameReviewData } from "@/hooks/useGameReviewData"

interface CombinedPuzzleLengthChartProps {
  data: GameReviewData
}

export function CombinedPuzzleLengthChart({ data }: CombinedPuzzleLengthChartProps) {
  if (
    !data?.opponentMistakesMissed3M?.move_length_counts?.length &&
    !data?.opponentMistakesCaught3M?.move_length_counts?.length &&
    !data?.myMistakes3M?.move_length_counts?.length
  ) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <BarChart3 className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No puzzle length data available</p>
        </div>
      </div>
    )
  }

  const processData = () => {
    const lengthMap = new Map<number, {
      length: number
      missed: number
      caught: number
      myMistakes: number
    }>()

    data.opponentMistakesMissedAllTime?.move_length_counts?.forEach(item => {
      const puzzleLength = Math.round(item.length / 2)
      if (!lengthMap.has(puzzleLength)) {
        lengthMap.set(puzzleLength, { length: puzzleLength, missed: 0, caught: 0, myMistakes: 0 })
      }
      lengthMap.get(puzzleLength)!.missed = item.count
    })

    data.opponentMistakesCaughtAllTime?.move_length_counts?.forEach(item => {
      const puzzleLength = Math.round(item.length / 2)
      if (!lengthMap.has(puzzleLength)) {
        lengthMap.set(puzzleLength, { length: puzzleLength, missed: 0, caught: 0, myMistakes: 0 })
      }
      lengthMap.get(puzzleLength)!.caught = item.count
    })

    data.myMistakesAllTime?.move_length_counts?.forEach(item => {
      const puzzleLength = Math.round(item.length / 2)
      if (!lengthMap.has(puzzleLength)) {
        lengthMap.set(puzzleLength, { length: puzzleLength, missed: 0, caught: 0, myMistakes: 0 })
      }
      lengthMap.get(puzzleLength)!.myMistakes = item.count
    })

    return Array.from(lengthMap.values())
      .filter(item => item.missed > 0 || item.caught > 0 || item.myMistakes > 0)
      .sort((a, b) => a.length - b.length)
  }

  const chartData = processData()

  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <BarChart3 className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No puzzle length data available</p>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-medium text-slate-900 mb-1.5">{label} moves</p>
          <div className="space-y-1 text-sm tabular-nums">
            {payload.map((entry: any, index: number) => (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: <span className="font-semibold">{entry.value}</span>
              </p>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  const calculateStats = (rows: typeof chartData, key: 'missed' | 'caught' | 'myMistakes') => {
    const total = rows.reduce((sum, item) => sum + item[key], 0)
    if (total === 0) return { avg: 0, mostCommon: 0, total: 0 }

    const weightedSum = rows.reduce((sum, item) => sum + item.length * item[key], 0)
    const avg = weightedSum / total
    const mostCommon = rows.reduce((max, item) => (item[key] > max[key] ? item : max), rows[0])

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

  const getTickInterval = () => {
    if (chartData.length <= 5) return 0
    if (chartData.length <= 8) return 1
    return Math.ceil(chartData.length / 6)
  }

  return (
    <div className="space-y-6">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="length"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              interval={getTickInterval()}
              tickFormatter={(value) => value.toString()}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="missed" fill="#e11d48" name="Missed Opportunities" radius={[3, 3, 0, 0]} />
            <Bar dataKey="caught" fill="#059669" name="Successfully Caught" radius={[3, 3, 0, 0]} />
            <Bar dataKey="myMistakes" fill="#d97706" name="My Mistakes" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2.5">
          <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-rose-600 rounded-full" />
            <span>Missed Opportunities</span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-lg font-semibold tabular-nums text-slate-900">{missedStats.avg.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Average Length</div>
              <div className="text-xs font-medium text-slate-700 mt-0.5">{getComplexityLabel(missedStats.avg)}</div>
            </div>
            <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-lg font-semibold tabular-nums text-slate-900">{missedStats.mostCommon}</div>
              <div className="text-xs text-slate-500">Most Common</div>
              <div className="text-xs text-slate-500 mt-0.5">{missedStats.total} total</div>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
            <span>Successfully Caught</span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-lg font-semibold tabular-nums text-slate-900">{caughtStats.avg.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Average Length</div>
              <div className="text-xs font-medium text-slate-700 mt-0.5">{getComplexityLabel(caughtStats.avg)}</div>
            </div>
            <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-lg font-semibold tabular-nums text-slate-900">{caughtStats.mostCommon}</div>
              <div className="text-xs text-slate-500">Most Common</div>
              <div className="text-xs text-slate-500 mt-0.5">{caughtStats.total} total</div>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-amber-600 rounded-full" />
            <span>My Mistakes</span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-lg font-semibold tabular-nums text-slate-900">{myMistakesStats.avg.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Average Length</div>
              <div className="text-xs font-medium text-slate-700 mt-0.5">{getComplexityLabel(myMistakesStats.avg)}</div>
            </div>
            <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-lg font-semibold tabular-nums text-slate-900">{myMistakesStats.mostCommon}</div>
              <div className="text-xs text-slate-500">Most Common</div>
              <div className="text-xs text-slate-500 mt-0.5">{myMistakesStats.total} total</div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-slate-500">Complexity Comparison</h4>
          <div className="text-sm text-slate-700 space-y-1.5">
            {missedStats.avg > caughtStats.avg + 0.3 ? (
              <p>
                Missed opportunities average {missedStats.avg.toFixed(1)} moves vs {caughtStats.avg.toFixed(1)} moves caught. Focus on longer tactical sequences.
              </p>
            ) : caughtStats.avg > missedStats.avg + 0.3 ? (
              <p>
                You catch more complex tactics ({caughtStats.avg.toFixed(1)} moves) than you miss ({missedStats.avg.toFixed(1)} moves).
              </p>
            ) : (
              <p>Missed and caught opportunities have similar complexity levels.</p>
            )}

            {myMistakesStats.avg > Math.max(missedStats.avg, caughtStats.avg) + 0.3 ? (
              <p>
                Your mistakes occur in more complex positions ({myMistakesStats.avg.toFixed(1)} moves). Slow down during sharp tactical sequences.
              </p>
            ) : myMistakesStats.avg < Math.min(missedStats.avg, caughtStats.avg) - 0.3 ? (
              <p>
                Your mistakes tend to occur in simpler positions ({myMistakesStats.avg.toFixed(1)} moves), while complex calculation remains strong.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
