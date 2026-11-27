"use client"

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { GameReviewData } from "@/hooks/useGameReviewData"
import { cn } from "@/lib/utils"

interface WeeklyTrendChartProps {
  data: GameReviewData
}

export function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  if (!data?.opponentMistakesTimeSeries?.nodes?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <TrendingUp className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No trend data available</p>
        </div>
      </div>
    )
  }

  const chartData = data.opponentMistakesTimeSeries.nodes
    .map(node => {
      let caught = 0
      let missed = 0

      node.stats.theme_counts.forEach(theme => {
        if (theme.theme.includes('caught')) {
          caught += theme.count
        } else if (theme.theme.includes('missed')) {
          missed += theme.count
        }
      })

      const total = caught + missed
      if (total <= 0) return null
      const recognitionRate = (caught / total) * 100

      const date = new Date(node.start_time)
      const label = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })

      return {
        date: label,
        recognitionRate,
        caught,
        missed,
        total,
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
          <TrendingUp className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No trend data available</p>
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
            <p className="text-slate-600">
              Recognition Rate: <span className="font-semibold text-slate-900">{entry.recognitionRate.toFixed(1)}%</span>
            </p>
            <p className="text-emerald-700">
              Caught: <span className="font-semibold">{entry.caught}</span>
            </p>
            <p className="text-rose-700">
              Missed: <span className="font-semibold">{entry.missed}</span>
            </p>
            <p className="text-slate-600">
              Total Opportunities: <span className="font-semibold text-slate-900">{entry.total}</span>
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

    const firstTotal = firstHalf.reduce((sum, d) => sum + d.total, 0)
    const secondTotal = secondHalf.reduce((sum, d) => sum + d.total, 0)
    if (firstTotal <= 0 || secondTotal <= 0) return { direction: 'stable', change: 0 }

    const firstAvg = (firstHalf.reduce((sum, d) => sum + d.caught, 0) / firstTotal) * 100
    const secondAvg = (secondHalf.reduce((sum, d) => sum + d.caught, 0) / secondTotal) * 100

    const change = secondAvg - firstAvg

    if (Math.abs(change) < 2) return { direction: 'stable', change }
    return { direction: change > 0 ? 'improving' : 'declining', change }
  }

  const trend = getTrend()
  const currentRate = chartData.length > 0 ? chartData[chartData.length - 1].recognitionRate : 0
  const bestRate = chartData.length > 0 ? Math.max(...chartData.map(d => d.recognitionRate)) : 0
  const totalCaught = chartData.reduce((sum, d) => sum + d.caught, 0)
  const totalOpportunities = chartData.reduce((sum, d) => sum + d.total, 0)
  const avgRate = totalOpportunities > 0 ? (totalCaught / totalOpportunities) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRecognition" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
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
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              label={{ value: 'Recognition Rate (%)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="recognitionRate"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#colorRecognition)"
              dot={{ fill: '#2563eb', strokeWidth: 2, r: 3.5 }}
              activeDot={{ r: 5.5, fill: '#1d4ed8' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-lg font-semibold tabular-nums text-slate-900">{currentRate.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">Current</div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-lg font-semibold tabular-nums text-emerald-700">{bestRate.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">Best</div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-lg font-semibold tabular-nums text-slate-900">{avgRate.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">Average</div>
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
              <TrendingUp className="h-4 w-4" />
            ) : trend.direction === 'declining' ? (
              <TrendingDown className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
            <span>
              {trend.direction === 'stable' ? '0.0%' : `${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}%`}
            </span>
          </div>
          <div className="text-xs text-slate-500 capitalize">{trend.direction}</div>
        </div>
      </div>
    </div>
  )
}
