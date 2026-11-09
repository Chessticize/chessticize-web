"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts"
import { Badge } from "@/components/ui/badge"
import { isThemeExcluded, getThemeDisplayName } from "@/lib/theme-config"

interface ThemeData {
  tag_counts: Array<{
    tag: string
    count: number
  }>
}

interface CaptureSuccessRateChartProps {
  caughtData?: ThemeData
  missedData?: ThemeData
}





export function CaptureSuccessRateChart({ caughtData, missedData }: CaptureSuccessRateChartProps) {

  if (!caughtData?.tag_counts?.length && !missedData?.tag_counts?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No data available</p>
        </div>
      </div>
    )
  }

  // Create maps for easier lookup
  const caughtMap = new Map<string, number>()
  const missedMap = new Map<string, number>()

  // Process caught data
  caughtData?.tag_counts?.forEach(item => {
    if (!isThemeExcluded(item.tag)) {
      caughtMap.set(item.tag, item.count)
    }
  })

  // Process missed data
  missedData?.tag_counts?.forEach(item => {
    if (!isThemeExcluded(item.tag)) {
      missedMap.set(item.tag, item.count)
    }
  })

  // Combine data and calculate success rates
  const allTags = new Set([...caughtMap.keys(), ...missedMap.keys()])
  
  const chartData = Array.from(allTags)
    .map(tag => {
      const caught = caughtMap.get(tag) || 0
      const missed = missedMap.get(tag) || 0
      const total = caught + missed
      const successRate = total > 0 ? (caught / total) * 100 : 0
      
      return {
        theme: getThemeDisplayName(tag),
        originalTag: tag,
        caught,
        missed,
        total,
        successRate: Math.round(successRate * 10) / 10 // Round to 1 decimal
      }
    })
    .filter(item => item.total >= 3) // Only show themes with at least 3 opportunities
    .sort((a, b) => b.total - a.total) // Sort by total opportunities
    .slice(0, 10) // Show top 10 themes

  // Get color based on success rate
  const getBarColor = (rate: number) => {
    if (rate >= 80) return '#22c55e' // Green - Excellent
    if (rate >= 60) return '#eab308' // Yellow - Good
    if (rate >= 40) return '#f97316' // Orange - Needs work
    return '#ef4444' // Red - Needs significant improvement
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.theme}</p>
          <p className="text-sm text-gray-600">
            Success Rate: {data.successRate}%
          </p>
          <p className="text-sm text-gray-600">
            Caught: {data.caught} | Missed: {data.missed}
          </p>
          <p className="text-sm text-gray-600">
            Total Opportunities: {data.total}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 text-center">Success Rate (%)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="theme" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="successRate"
                radius={[4, 4, 0, 0]}
                stroke="#374151"
                strokeWidth={1}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.successRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {chartData.map((entry, index) => (
          <div key={entry.theme} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: getBarColor(entry.successRate) }}
            />
            <span className="text-sm text-gray-700 truncate flex-1">{entry.theme}</span>
            <Badge variant="secondary" className="text-xs">
              {entry.successRate}%
            </Badge>
          </div>
        ))}
      </div>

      {/* Performance Guide */}
      <div className="pt-4 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600">80%+ Excellent</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600">60-79% Good</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-600">40-59% Needs Work</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">&lt;40% Focus Area</span>
          </div>
        </div>
      </div>
    </div>
  )
}
