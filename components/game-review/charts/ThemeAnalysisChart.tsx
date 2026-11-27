"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Badge } from "@/components/ui/badge"
import { BarChart3 } from "lucide-react"
import { isThemeExcluded, getThemeDisplayName } from "@/lib/theme-config"
import { useI18n } from "@/components/i18n/i18n-provider"

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

// Restrained editorial data palettes (no violet/lavender)
const COLOR_SCHEMES = {
  missed: ['#2563eb', '#0284c7', '#0d9488', '#475569', '#d97706', '#e11d48', '#64748b', '#94a3b8'],
  caught: ['#059669', '#0d9488', '#2563eb', '#0284c7', '#475569', '#64748b', '#94a3b8', '#cbd5e1'],
  mistakes: ['#e11d48', '#d97706', '#475569', '#2563eb', '#0284c7', '#0d9488', '#64748b', '#94a3b8'],
}

export function ThemeAnalysisChart({ data, type }: ThemeAnalysisChartProps) {
  const { locale } = useI18n()

  if (!data?.tag_counts?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <BarChart3 className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No data available</p>
        </div>
      </div>
    )
  }

  const chartData = data.tag_counts
    .filter(item => !isThemeExcluded(item.tag))
    .map(item => ({
      name: getThemeDisplayName(item.tag, locale),
      value: item.count,
      percentage: 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const total = chartData.reduce((sum, item) => sum + item.value, 0)
  chartData.forEach(item => {
    item.percentage = total > 0 ? (item.value / total) * 100 : 0
  })

  const colors = COLOR_SCHEMES[type]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-medium text-slate-900">{entry.name}</p>
          <p className="text-sm text-slate-600 tabular-nums">
            Count: {entry.value} ({entry.percentage.toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  const renderLabel = (entry: any) => {
    if (entry.percentage < 5) return ''
    return `${entry.percentage.toFixed(0)}%`
  }

  return (
    <div className="space-y-4">
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
              fill="#2563eb"
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {chartData.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-sm text-slate-700 truncate flex-1">{entry.name}</span>
            <Badge variant="secondary" className="text-xs tabular-nums bg-slate-100 text-slate-700 shadow-none">
              {entry.value}
            </Badge>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold tabular-nums text-slate-900">{total}</div>
            <div className="text-xs text-slate-500">Total</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums text-slate-900">{chartData.length}</div>
            <div className="text-xs text-slate-500">Themes</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums text-slate-900">
              {chartData.length > 0 ? (total / chartData.length).toFixed(1) : '0'}
            </div>
            <div className="text-xs text-slate-500">Avg/Theme</div>
          </div>
        </div>
      </div>
    </div>
  )
}
