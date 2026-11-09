"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Badge } from "@/components/ui/badge"
import { isThemeExcluded, getThemeDisplayName } from "@/lib/theme-config"

interface ThemeData {
  tag_counts: Array<{
    tag: string
    count: number
  }>
}

interface ThemeAnalysisChartProps {
  data?: ThemeData
  type: 'missed' | 'caught' | 'mistakes'
}

// Color schemes for different chart types
const COLOR_SCHEMES = {
  missed: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'],
  caught: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'],
  mistakes: ['#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#0891b2', '#2563eb', '#7c3aed', '#be185d']
}





export function ThemeAnalysisChart({ data, type }: ThemeAnalysisChartProps) {
  if (!data?.tag_counts?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No data available</p>
        </div>
      </div>
    )
  }

  // Process and sort data, filtering out non-meaningful tags
  const chartData = data.tag_counts
    .filter(item => !isThemeExcluded(item.tag))
    .map(item => ({
      name: getThemeDisplayName(item.tag),
      value: item.count,
      percentage: 0 // Will be calculated below
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8) // Show top 8 themes

  // Calculate percentages
  const total = chartData.reduce((sum, item) => sum + item.value, 0)
  chartData.forEach(item => {
    item.percentage = total > 0 ? (item.value / total) * 100 : 0
  })

  const colors = COLOR_SCHEMES[type]

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Count: {data.value} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  // Custom label function
  const renderLabel = (entry: any) => {
    if (entry.percentage < 5) return '' // Don't show labels for small slices
    return `${entry.percentage.toFixed(0)}%`
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend with counts */}
      <div className="grid grid-cols-2 gap-2">
        {chartData.map((entry, index) => (
          <div key={entry.name} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-sm text-gray-700 truncate flex-1">{entry.name}</span>
            <Badge variant="secondary" className="text-xs">
              {entry.value}
            </Badge>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">{total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{chartData.length}</div>
            <div className="text-xs text-gray-600">Themes</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {chartData.length > 0 ? (total / chartData.length).toFixed(1) : '0'}
            </div>
            <div className="text-xs text-gray-600">Avg/Theme</div>
          </div>
        </div>
      </div>
    </div>
  )
}
