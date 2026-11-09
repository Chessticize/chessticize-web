"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts"
import { Badge } from "@/components/ui/badge"
import { GameReviewData } from "@/hooks/useGameReviewData"

interface ColorPerformanceChartProps {
  data: GameReviewData
}

const COLORS = {
  white: '#f8fafc',
  black: '#1e293b'
}

const BORDER_COLORS = {
  white: '#64748b',
  black: '#475569'
}

export function ColorPerformanceChart({ data }: ColorPerformanceChartProps) {
  if (!data?.opponentMistakesMissed3M?.user_color_counts?.length && 
      !data?.opponentMistakesCaught3M?.user_color_counts?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">⚫⚪</div>
          <p>No color performance data available</p>
        </div>
      </div>
    )
  }

  // Process color performance data
  const processColorData = () => {
    const colors: Record<string, { caught: number; missed: number; total: number; rate: number }> = {}

    // Process caught opportunities
    if (data.opponentMistakesCaught3M?.user_color_counts) {
      data.opponentMistakesCaught3M.user_color_counts.forEach(colorCount => {
        if (!colors[colorCount.color]) {
          colors[colorCount.color] = { caught: 0, missed: 0, total: 0, rate: 0 }
        }
        colors[colorCount.color].caught = colorCount.count
      })
    }

    // Process missed opportunities
    if (data.opponentMistakesMissed3M?.user_color_counts) {
      data.opponentMistakesMissed3M.user_color_counts.forEach(colorCount => {
        if (!colors[colorCount.color]) {
          colors[colorCount.color] = { caught: 0, missed: 0, total: 0, rate: 0 }
        }
        colors[colorCount.color].missed = colorCount.count
      })
    }

    // Calculate totals and rates
    Object.keys(colors).forEach(color => {
      colors[color].total = colors[color].caught + colors[color].missed
      colors[color].rate = colors[color].total > 0 
        ? (colors[color].caught / colors[color].total) * 100 
        : 0
    })

    // Convert to chart data
    return Object.entries(colors)
      .filter(([_, data]) => data.total > 0)
      .map(([color, data]) => ({
        color: color.charAt(0).toUpperCase() + color.slice(1),
        rate: data.rate,
        caught: data.caught,
        missed: data.missed,
        total: data.total,
        originalColor: color.toLowerCase()
      }))
      .sort((a, b) => b.total - a.total)
  }

  const chartData = processColorData()

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">⚫⚪</div>
          <p>No color performance data available</p>
        </div>
      </div>
    )
  }

  // Custom tooltip with Y-axis label information
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-indigo-200 rounded-lg shadow-lg">
          <p className="font-medium text-indigo-900 mb-2">Playing as {data.color}</p>
          <div className="space-y-1">
            <p className="text-sm text-indigo-700">
              Recognition Rate: <span className="font-semibold">{data.rate.toFixed(1)}%</span>
            </p>
            <p className="text-sm text-green-700">
              Caught: <span className="font-semibold">{data.caught}</span>
            </p>
            <p className="text-sm text-red-700">
              Missed: <span className="font-semibold">{data.missed}</span>
            </p>
            <p className="text-sm text-gray-700">
              Total: <span className="font-semibold">{data.total}</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // Get color based on chess piece color - white and black theme
  const getBarColor = (originalColor: string) => {
    // Use chess-appropriate colors: light gray for white pieces, dark gray/black for black pieces
    return originalColor === 'white' ? '#f8f9fa' : '#1f2937' // Light gray for white, dark gray for black
  }

  // Get stroke color to ensure white bars are visible
  const getStrokeColor = (originalColor: string) => {
    return originalColor === 'white' ? '#6b7280' : '#374151' // Gray border for white, darker for black
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 text-center">Recognition Rate (%)</div>
        <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="color"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="rate"
              radius={[4, 4, 0, 0]}
              strokeWidth={2}
            >
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

      {/* Color breakdown */}
      <div className="space-y-3">
        {chartData.map((entry, index) => (
          <div key={entry.color} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full border-2"
                  style={{ 
                    backgroundColor: entry.originalColor === 'white' ? COLORS.white : COLORS.black,
                    borderColor: entry.originalColor === 'white' ? BORDER_COLORS.white : BORDER_COLORS.black
                  }}
                />
                <span className="font-medium text-gray-900">{entry.color}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {entry.total} total opportunities
                </div>
                <div className="text-xs text-gray-600">
                  {entry.caught} caught, {entry.missed} missed
                </div>
              </div>
              <Badge variant="secondary">
                {entry.rate.toFixed(1)}% rate
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Performance comparison */}
      {chartData.length === 2 && (
        <div className="pt-4 border-t border-gray-200">
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Color Comparison</h4>
            {(() => {
              const white = chartData.find(d => d.originalColor === 'white')
              const black = chartData.find(d => d.originalColor === 'black')
              
              if (!white || !black) return null
              
              const difference = white.rate - black.rate
              const betterColor = difference > 0 ? 'White' : 'Black'
              const worseColor = difference > 0 ? 'Black' : 'White'
              
              return (
                <div className="text-sm text-gray-700">
                  {Math.abs(difference) < 2 ? (
                    <span>Performance is similar with both colors</span>
                  ) : (
                    <span>
                      You perform <span className="font-semibold">{Math.abs(difference).toFixed(1)}%</span> better 
                      as <span className="font-semibold">{betterColor}</span> than as {worseColor}
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Overall stats */}
      <div className="pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {chartData.reduce((sum, color) => sum + color.total, 0)}
            </div>
            <div className="text-xs text-gray-600">Total Games</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {chartData.reduce((sum, color) => sum + color.caught, 0)}
            </div>
            <div className="text-xs text-gray-600">Total Caught</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {chartData.length > 0 
                ? (chartData.reduce((sum, color) => sum + (color.rate * color.total), 0) / 
                   chartData.reduce((sum, color) => sum + color.total, 0)).toFixed(1)
                : '0'
              }%
            </div>
            <div className="text-xs text-gray-600">Overall Rate</div>
          </div>
        </div>
      </div>
    </div>
  )
}
