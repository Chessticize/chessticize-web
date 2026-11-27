"use client"

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { TrendingDown, TrendingUp, Minus } from "lucide-react"
import { GameReviewData } from "@/hooks/useGameReviewData"
import { cn } from "@/lib/utils"

interface MyMistakesTrendChartProps {
  data: GameReviewData
}

export function MyMistakesTrendChart({ data }: MyMistakesTrendChartProps) {
  if (!data?.myMistakesTimeSeries?.nodes?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <TrendingDown className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No mistakes trend data available</p>
        </div>
      </div>
    )
  }

  const chartData = data.myMistakesTimeSeries.nodes
    .map(node => {
      const totalMistakes = node.stats.total_count || 0
      const totalGames = node.stats.total_games ?? node.stats.unique_game_count ?? 0
      if (totalGames <= 0) return null
      const mistakesPerGame = totalMistakes / totalGames

      const date = new Date(node.start_time)
      const label = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })

      return {
        date: label,
        mistakesPerGame,
        totalMistakes,
        totalGames,
        averageMoveLength: (node.stats.average_move_length || 0) / 2,
        timestamp: date.getTime(),
        fullDate: date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.timestamp - b.timestamp)

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <TrendingDown className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No mistakes trend data available</p>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-medium text-slate-900 mb-1.5">Week of {entry.fullDate}</p>
          <div className="space-y-1 text-sm tabular-nums">
            <p className="text-rose-700">
              Mistakes Per Game: <span className="font-semibold">{entry.mistakesPerGame.toFixed(2)}</span>
            </p>
            <p className="text-slate-600">
              Total Mistakes: <span className="font-semibold text-slate-900">{entry.totalMistakes}</span>
            </p>
            <p className="text-slate-600">
              Games Played: <span className="font-semibold text-slate-900">{entry.totalGames}</span>
            </p>
            <p className="text-slate-600">
              Avg Puzzle Length: <span className="font-semibold text-slate-900">{entry.averageMoveLength.toFixed(1)} moves</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const getTrend = () => {
    if (chartData.length < 2) return { direction: 'stable', change: 0 }

    const recent = chartData.slice(-4)
    if (recent.length < 2) return { direction: 'stable', change: 0 }

    const firstHalf = recent.slice(0, Math.floor(recent.length / 2))
    const secondHalf = recent.slice(Math.floor(recent.length / 2))

    const firstGames = firstHalf.reduce((sum, d) => sum + d.totalGames, 0)
    const secondGames = secondHalf.reduce((sum, d) => sum + d.totalGames, 0)
    if (firstGames <= 0 || secondGames <= 0) return { direction: 'stable', change: 0 }

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.totalMistakes, 0) / firstGames
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.totalMistakes, 0) / secondGames

    const change = secondAvg - firstAvg

    if (Math.abs(change) < 0.1) return { direction: 'stable', change }
    return { direction: change < 0 ? 'improving' : 'declining', change }
  }

  const trend = getTrend()
  const currentRate = chartData.length > 0 ? chartData[chartData.length - 1].mistakesPerGame : 0
  const bestRate = chartData.length > 0 ? Math.min(...chartData.map(d => d.mistakesPerGame)) : 0
  const sumMistakes = chartData.reduce((sum, d) => sum + d.totalMistakes, 0)
  const sumGames = chartData.reduce((sum, d) => sum + d.totalGames, 0)
  const avgRate = sumGames > 0 ? sumMistakes / sumGames : 0

  const getPerformanceColor = (rate: number) => {
    if (rate <= 1.5) return 'text-emerald-700'
    if (rate <= 2.5) return 'text-amber-700'
    return 'text-rose-700'
  }

  const getPerformanceLabel = (rate: number) => {
    if (rate <= 1.5) return 'Excellent'
    if (rate <= 2.5) return 'Good'
    return 'Needs Work'
  }

  return (
    <div className="space-y-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorMistakes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e11d48" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#e11d48" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
            />
            <YAxis
              domain={[0, 'dataMax + 0.5']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              label={{ value: 'Mistakes Per Game', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="mistakesPerGame"
              stroke="#e11d48"
              strokeWidth={2}
              fill="url(#colorMistakes)"
              dot={{ fill: '#e11d48', strokeWidth: 2, r: 3.5 }}
              activeDot={{ r: 5.5, fill: '#be123c' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-lg font-semibold tabular-nums text-slate-900">
            {currentRate.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500">Current</div>
          <div className={cn("text-xs font-medium mt-0.5", getPerformanceColor(currentRate))}>
            {getPerformanceLabel(currentRate)}
          </div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-lg font-semibold tabular-nums text-slate-900">{bestRate.toFixed(2)}</div>
          <div className="text-xs text-slate-500">Best Week</div>
          <div className="text-xs font-medium text-emerald-700 mt-0.5">
            {getPerformanceLabel(bestRate)}
          </div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-lg font-semibold tabular-nums text-slate-900">{avgRate.toFixed(2)}</div>
          <div className="text-xs text-slate-500">Average</div>
          <div className={cn("text-xs font-medium mt-0.5", getPerformanceColor(avgRate))}>
            {getPerformanceLabel(avgRate)}
          </div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div
            className={cn(
              "text-lg font-semibold tabular-nums flex items-center justify-center gap-1",
              trend.direction === 'improving'
                ? 'text-emerald-600'
                : trend.direction === 'declining'
                  ? 'text-rose-600'
                  : 'text-slate-700'
            )}
          >
            {trend.direction === 'improving' ? (
              <TrendingDown className="h-4 w-4" />
            ) : trend.direction === 'declining' ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
            <span>
              {Math.abs(trend.change) < 0.1
                ? '0.0'
                : `${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}`}
            </span>
          </div>
          <div className="text-xs text-slate-500 capitalize">{trend.direction}</div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-slate-500">Performance Goal</h4>
            <p className="text-sm text-slate-700">
              {currentRate <= 1.5
                ? 'Strong accuracy — maintaining under 1.5 mistakes per game.'
                : currentRate <= 2.5
                  ? 'Good progress — aim for under 1.5 mistakes per game.'
                  : 'Focus on reducing mistakes — target under 2.5 per game.'}
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-medium text-slate-500">Recent Trend</h4>
            <p className="text-sm text-slate-700">
              {trend.direction === 'improving'
                ? 'Mistake frequency is trending down.'
                : trend.direction === 'declining'
                  ? 'Mistake frequency increased in recent weeks.'
                  : 'Consistent mistake rate over recent weeks.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
