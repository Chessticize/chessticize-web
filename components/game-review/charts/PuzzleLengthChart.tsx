"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Badge } from "@/components/ui/badge"
import { BarChart3 } from "lucide-react"

interface PuzzleLengthData {
  move_length_counts: Array<{
    length: number
    count: number
  }>
}

interface PuzzleLengthChartProps {
  data?: PuzzleLengthData
  type: 'opponent_missed' | 'opponent_caught' | 'my_mistakes'
  title: string
}

const COLOR_SCHEMES = {
  opponent_missed: '#e11d48',
  opponent_caught: '#059669',
  my_mistakes: '#d97706',
}

const TYPE_LABELS = {
  opponent_missed: 'Missed Opportunities',
  opponent_caught: 'Successfully Caught',
  my_mistakes: 'My Mistakes',
}

export function PuzzleLengthChart({ data, type }: PuzzleLengthChartProps) {
  if (!data?.move_length_counts?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <BarChart3 className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No puzzle length data available</p>
        </div>
      </div>
    )
  }

  const chartData = data.move_length_counts
    .map(item => ({
      length: item.length,
      count: item.count,
      percentage: 0,
    }))
    .sort((a, b) => a.length - b.length)

  const total = chartData.reduce((sum, item) => sum + item.count, 0)
  chartData.forEach(item => {
    item.percentage = total > 0 ? (item.count / total) * 100 : 0
  })

  const color = COLOR_SCHEMES[type]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-medium text-slate-900">{label} moves</p>
          <p className="text-sm text-slate-600 tabular-nums">
            Count: {entry.count} ({entry.percentage.toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  const avgLength = total > 0 ? chartData.reduce((sum, item) => sum + item.length * item.count, 0) / total : 0
  const mostCommonLength = chartData.reduce((max, item) => (item.count > max.count ? item : max), chartData[0])
  const complexityLevel = avgLength <= 3 ? 'Simple' : avgLength <= 5 ? 'Moderate' : 'Complex'

  return (
    <div className="space-y-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="length"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              interval={chartData.length <= 5 ? 0 : Math.ceil(chartData.length / 6)}
              tickFormatter={(value) => value.toString()}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-lg font-semibold tabular-nums text-slate-900">{avgLength.toFixed(1)}</div>
          <div className="text-xs text-slate-500">Average Length</div>
          <div className="text-xs font-medium mt-0.5" style={{ color }}>
            {complexityLevel}
          </div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-lg font-semibold tabular-nums text-slate-900">{mostCommonLength?.length || 0}</div>
          <div className="text-xs text-slate-500">Most Common</div>
          <div className="text-xs text-slate-500 mt-0.5">{mostCommonLength?.count || 0} puzzles</div>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-lg font-semibold tabular-nums text-slate-900">{total}</div>
          <div className="text-xs text-slate-500">Total Puzzles</div>
          <div className="text-xs text-slate-500 mt-0.5">{TYPE_LABELS[type]}</div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-slate-500">Length Distribution</h4>
        <div className="grid grid-cols-2 gap-2">
          {chartData.slice(0, 8).map((item) => (
            <div key={item.length} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-sm text-slate-700">{item.length} moves</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium tabular-nums text-slate-900">{item.count}</span>
                <Badge variant="secondary" className="text-xs tabular-nums bg-white border border-slate-200 text-slate-700 shadow-none">
                  {item.percentage.toFixed(0)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="text-sm text-slate-700">
          {type === 'opponent_missed' && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-rose-700">Missed Opportunity Insights</p>
              <p>
                {avgLength <= 3
                  ? "Most missed tactics are short sequences. Focus on quick pattern recognition."
                  : avgLength <= 5
                    ? "Moderate-length patterns are being missed. Practice intermediate calculation."
                    : "Longer tactical sequences are challenging. Work on calculation depth."}
              </p>
            </div>
          )}
          {type === 'opponent_caught' && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-emerald-700">Success Pattern</p>
              <p>
                {avgLength <= 3
                  ? "Reliable at spotting short tactics. Push into longer multi-move lines."
                  : avgLength <= 5
                    ? "Strong tactical vision across moderate-length sequences."
                    : "Strong calculation depth on complex multi-move tactics."}
              </p>
            </div>
          )}
          {type === 'my_mistakes' && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-amber-700">Mistake Pattern</p>
              <p>
                {avgLength <= 3
                  ? "Most mistakes happen in simple positions. Focus on blunder checks."
                  : avgLength <= 5
                    ? "Mistakes happen in moderate complexity. Slow down and verify candidate moves."
                    : "Mistakes cluster in complex positions. Focus on time management and calculation."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
