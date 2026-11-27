"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts"
import { Badge } from "@/components/ui/badge"
import { PieChart } from "lucide-react"
import { GameReviewData } from "@/hooks/useGameReviewData"

interface ColorPerformanceChartProps {
  data: GameReviewData
}

const COLORS = {
  white: '#f8fafc',
  black: '#1e293b',
}

const BORDER_COLORS = {
  white: '#94a3b8',
  black: '#334155',
}

export function ColorPerformanceChart({ data }: ColorPerformanceChartProps) {
  if (
    !data?.opponentMistakesMissed3M?.user_color_counts?.length &&
    !data?.opponentMistakesCaught3M?.user_color_counts?.length
  ) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <PieChart className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No color performance data available</p>
        </div>
      </div>
    )
  }

  const processColorData = () => {
    const colors: Record<string, { caught: number; missed: number; total: number; rate: number }> = {}

    data.opponentMistakesCaught3M?.user_color_counts?.forEach(colorCount => {
      if (!colors[colorCount.color]) {
        colors[colorCount.color] = { caught: 0, missed: 0, total: 0, rate: 0 }
      }
      colors[colorCount.color].caught = colorCount.count
    })

    data.opponentMistakesMissed3M?.user_color_counts?.forEach(colorCount => {
      if (!colors[colorCount.color]) {
        colors[colorCount.color] = { caught: 0, missed: 0, total: 0, rate: 0 }
      }
      colors[colorCount.color].missed = colorCount.count
    })

    Object.keys(colors).forEach(color => {
      colors[color].total = colors[color].caught + colors[color].missed
      colors[color].rate = colors[color].total > 0
        ? (colors[color].caught / colors[color].total) * 100
        : 0
    })

    return Object.entries(colors)
      .filter(([, entry]) => entry.total > 0)
      .map(([color, entry]) => ({
        color: color.charAt(0).toUpperCase() + color.slice(1),
        rate: entry.rate,
        caught: entry.caught,
        missed: entry.missed,
        total: entry.total,
        originalColor: color.toLowerCase(),
      }))
      .sort((a, b) => b.total - a.total)
  }

  const chartData = processColorData()

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <PieChart className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No color performance data available</p>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-medium text-slate-900 mb-1.5">Playing as {entry.color}</p>
          <div className="space-y-1 text-sm tabular-nums">
            <p className="text-slate-600">
              Recognition Rate: <span className="font-semibold text-slate-900">{entry.rate.toFixed(1)}%</span>
            </p>
            <p className="text-emerald-700">
              Caught: <span className="font-semibold">{entry.caught}</span>
            </p>
            <p className="text-rose-700">
              Missed: <span className="font-semibold">{entry.missed}</span>
            </p>
            <p className="text-slate-600">
              Total: <span className="font-semibold text-slate-900">{entry.total}</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const getBarColor = (originalColor: string) =>
    originalColor === 'white' ? '#e2e8f0' : '#1e293b'

  const getStrokeColor = (originalColor: string) =>
    originalColor === 'white' ? '#94a3b8' : '#0f172a'

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-xs text-slate-500 text-center">Recognition Rate (%)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="color"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]} strokeWidth={1.5}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.originalColor)}
                    stroke={getStrokeColor(entry.originalColor)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-2.5">
        {chartData.map((entry) => (
          <div key={entry.color} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2.5">
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{
                  backgroundColor: entry.originalColor === 'white' ? COLORS.white : COLORS.black,
                  borderColor: entry.originalColor === 'white' ? BORDER_COLORS.white : BORDER_COLORS.black,
                }}
              />
              <span className="font-medium text-sm text-slate-900">{entry.color}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right tabular-nums">
                <div className="text-sm font-semibold text-slate-900">
                  {entry.total} total opportunities
                </div>
                <div className="text-xs text-slate-500">
                  {entry.caught} caught, {entry.missed} missed
                </div>
              </div>
              <Badge variant="secondary" className="tabular-nums bg-white border border-slate-200 text-slate-700 shadow-none">
                {entry.rate.toFixed(1)}%
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {chartData.length === 2 && (
        <div className="pt-4 border-t border-slate-100">
          <div className="text-center">
            <h4 className="text-xs font-medium text-slate-500 mb-1.5">Color Comparison</h4>
            {(() => {
              const white = chartData.find(d => d.originalColor === 'white')
              const black = chartData.find(d => d.originalColor === 'black')
              if (!white || !black) return null
              const difference = white.rate - black.rate
              const betterColor = difference > 0 ? 'White' : 'Black'
              const worseColor = difference > 0 ? 'Black' : 'White'

              return (
                <div className="text-sm text-slate-600">
                  {Math.abs(difference) < 2 ? (
                    <span>Performance is similar with both colors</span>
                  ) : (
                    <span>
                      You perform <span className="font-semibold text-slate-900">{Math.abs(difference).toFixed(1)}%</span> better
                      as <span className="font-semibold text-slate-900">{betterColor}</span> than as {worseColor}
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-slate-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold tabular-nums text-slate-900">
              {chartData.reduce((sum, color) => sum + color.total, 0)}
            </div>
            <div className="text-xs text-slate-500">Total Opportunities</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums text-slate-900">
              {chartData.reduce((sum, color) => sum + color.caught, 0)}
            </div>
            <div className="text-xs text-slate-500">Total Caught</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums text-slate-900">
              {(
                chartData.reduce((sum, color) => sum + color.rate * color.total, 0) /
                Math.max(1, chartData.reduce((sum, color) => sum + color.total, 0))
              ).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500">Overall Rate</div>
          </div>
        </div>
      </div>
    </div>
  )
}
