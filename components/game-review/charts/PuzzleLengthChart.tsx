"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Badge } from "@/components/ui/badge"

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

// Color schemes for different chart types
const COLOR_SCHEMES = {
  opponent_missed: '#ef4444', // Red for missed opportunities
  opponent_caught: '#22c55e', // Green for caught opportunities
  my_mistakes: '#f97316'      // Orange for my mistakes
}

const TYPE_LABELS = {
  opponent_missed: 'Missed Opportunities',
  opponent_caught: 'Successfully Caught',
  my_mistakes: 'My Mistakes'
}

export function PuzzleLengthChart({ data, type, title }: PuzzleLengthChartProps) {
  if (!data?.move_length_counts?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📏</div>
          <p>No puzzle length data available</p>
        </div>
      </div>
    )
  }

  // Process and sort data
  const chartData = data.move_length_counts
    .map(item => ({
      length: item.length,
      count: item.count,
      percentage: 0 // Will be calculated below
    }))
    .sort((a, b) => a.length - b.length) // Sort by length ascending

  // Calculate percentages
  const total = chartData.reduce((sum, item) => sum + item.count, 0)
  chartData.forEach(item => {
    item.percentage = total > 0 ? (item.count / total) * 100 : 0
  })

  const color = COLOR_SCHEMES[type]

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label} moves</p>
          <p className="text-sm text-gray-600">
            Count: {data.count} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  // Calculate statistics
  const avgLength = total > 0 ? chartData.reduce((sum, item) => sum + (item.length * item.count), 0) / total : 0
  const mostCommonLength = chartData.reduce((max, item) => item.count > max.count ? item : max, chartData[0])
  const complexityLevel = avgLength <= 3 ? 'Simple' : avgLength <= 5 ? 'Moderate' : 'Complex'

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="length"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              interval={chartData.length <= 5 ? 0 : Math.ceil(chartData.length / 6)}
              tickFormatter={(value) => value.toString()}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="count" 
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{avgLength.toFixed(1)}</div>
          <div className="text-xs text-gray-600">Average Length</div>
          <div className="text-xs font-medium" style={{ color }}>
            {complexityLevel}
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{mostCommonLength?.length || 0}</div>
          <div className="text-xs text-gray-600">Most Common</div>
          <div className="text-xs text-gray-500">
            {mostCommonLength?.count || 0} puzzles
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{total}</div>
          <div className="text-xs text-gray-600">Total Puzzles</div>
          <div className="text-xs text-gray-500">
            {TYPE_LABELS[type]}
          </div>
        </div>
      </div>

      {/* Length distribution breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-900">Length Distribution</h4>
        <div className="grid grid-cols-2 gap-2">
          {chartData.slice(0, 8).map((item) => (
            <div key={item.length} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-700">{item.length} moves</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{item.count}</span>
                <Badge variant="secondary" className="text-xs">
                  {item.percentage.toFixed(0)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-700">
          {type === 'opponent_missed' && (
            <div className="space-y-1">
              <p className="font-medium text-red-700">💡 Missed Opportunity Insights:</p>
              <p>
                {avgLength <= 3 
                  ? "You're missing mostly simple tactical shots. Focus on basic pattern recognition."
                  : avgLength <= 5
                  ? "Moderate complexity patterns are being missed. Practice intermediate tactics."
                  : "Complex tactical sequences are challenging. Work on calculation depth."
                }
              </p>
            </div>
          )}
          {type === 'opponent_caught' && (
            <div className="space-y-1">
              <p className="font-medium text-green-700">🎯 Success Pattern:</p>
              <p>
                {avgLength <= 3 
                  ? "Great at spotting simple tactics! Try challenging yourself with longer sequences."
                  : avgLength <= 5
                  ? "Strong tactical vision for moderate complexity. Keep it up!"
                  : "Excellent at complex tactical calculations. You have strong pattern recognition."
                }
              </p>
            </div>
          )}
          {type === 'my_mistakes' && (
            <div className="space-y-1">
              <p className="font-medium text-orange-700">⚠️ Mistake Pattern:</p>
              <p>
                {avgLength <= 3 
                  ? "Most mistakes are in simple positions. Focus on careful move checking."
                  : avgLength <= 5
                  ? "Mistakes in moderate complexity. Slow down and calculate more carefully."
                  : "Complex position mistakes. Consider time management and calculation training."
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
