"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { isThemeExcluded, getThemeDisplayName } from "@/lib/theme-config"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"

interface ThemeData {
  tag_counts: Array<{
    tag: string
    count: number
  }>
}

interface ThemeSuccessRateTrendChartProps {
  caughtData3M?: ThemeData
  missedData3M?: ThemeData
  caughtData3To6M?: ThemeData
  missedData3To6M?: ThemeData
}

export function ThemeSuccessRateTrendChart({
  caughtData3M,
  missedData3M,
  caughtData3To6M,
  missedData3To6M,
}: ThemeSuccessRateTrendChartProps) {
  const { locale } = useI18n()

  const processData = (caughtData?: ThemeData, missedData?: ThemeData) => {
    const caughtMap = new Map<string, number>()
    const missedMap = new Map<string, number>()

    caughtData?.tag_counts?.forEach(item => {
      if (!isThemeExcluded(item.tag)) {
        caughtMap.set(item.tag, item.count)
      }
    })

    missedData?.tag_counts?.forEach(item => {
      if (!isThemeExcluded(item.tag)) {
        missedMap.set(item.tag, item.count)
      }
    })

    const allTags = new Set([...caughtMap.keys(), ...missedMap.keys()])

    return Array.from(allTags)
      .map(tag => {
        const caught = caughtMap.get(tag) || 0
        const missed = missedMap.get(tag) || 0
        const total = caught + missed
        const successRate = total > 0 ? (caught / total) * 100 : 0

        return {
          tag,
          displayName: getThemeDisplayName(tag, locale),
          caught,
          missed,
          total,
          successRate: Math.round(successRate * 10) / 10,
        }
      })
      .filter(item => item.total >= 3)
  }

  const current3MData = processData(caughtData3M, missedData3M)
  const previous3MData = processData(caughtData3To6M, missedData3To6M)

  const topThemes = current3MData
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(theme => theme.tag)

  const chartData = topThemes.map(tag => {
    const currentTheme = current3MData.find(t => t.tag === tag)
    const previousTheme = previous3MData.find(t => t.tag === tag)

    const currentRate = currentTheme?.successRate || 0
    const previousRate = previousTheme?.successRate || 0
    const trend = currentRate - previousRate

    return {
      theme: currentTheme?.displayName || getThemeDisplayName(tag, locale),
      current: currentRate,
      previous: previousRate,
      trend,
      currentTotal: currentTheme?.total || 0,
      previousTotal: previousTheme?.total || 0,
    }
  })

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <TrendingUp className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No theme trend data available</p>
          <p className="text-xs text-slate-400 mt-1">Need at least 3 opportunities per theme</p>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-medium text-slate-900 mb-2">{label}</p>
          <div className="space-y-1 text-sm tabular-nums">
            <div className="flex items-center justify-between gap-4">
              <span className="text-blue-600">Recent 3M:</span>
              <span className="font-medium text-slate-900">{entry.current.toFixed(1)}% ({entry.currentTotal} total)</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Previous 3M:</span>
              <span className="font-medium text-slate-900">{entry.previous.toFixed(1)}% ({entry.previousTotal} total)</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
              <span className="text-slate-600">Trend:</span>
              <div className="flex items-center gap-1">
                {entry.trend > 2 && <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
                {entry.trend < -2 && <TrendingDown className="h-3.5 w-3.5 text-rose-600" />}
                {Math.abs(entry.trend) <= 2 && <Minus className="h-3.5 w-3.5 text-slate-500" />}
                <span
                  className={`font-medium ${
                    entry.trend > 2
                      ? 'text-emerald-600'
                      : entry.trend < -2
                        ? 'text-rose-600'
                        : 'text-slate-600'
                  }`}
                >
                  {entry.trend > 0 ? '+' : ''}
                  {entry.trend.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="theme"
              angle={-45}
              textAnchor="end"
              height={80}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="previous" fill="#cbd5e1" name="Previous 3M" radius={[3, 3, 0, 0]} />
            <Bar dataKey="current" fill="#2563eb" name="Recent 3M" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-slate-300 rounded-sm" />
            <span>Previous 3 Months</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-sm" />
            <span>Recent 3 Months</span>
          </div>
        </div>
        <div className="text-slate-500">Top 10 themes by opportunity count</div>
      </div>
    </div>
  )
}
