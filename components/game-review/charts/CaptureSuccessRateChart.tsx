"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts"
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

interface CaptureSuccessRateChartProps {
  caughtData?: ThemeData
  missedData?: ThemeData
}

export function CaptureSuccessRateChart({ caughtData, missedData }: CaptureSuccessRateChartProps) {
  const { locale } = useI18n()

  if (!caughtData?.tag_counts?.length && !missedData?.tag_counts?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <BarChart3 className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No data available</p>
        </div>
      </div>
    )
  }

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

  const chartData = Array.from(allTags)
    .map(tag => {
      const caught = caughtMap.get(tag) || 0
      const missed = missedMap.get(tag) || 0
      const total = caught + missed
      const successRate = total > 0 ? (caught / total) * 100 : 0

      return {
        theme: getThemeDisplayName(tag, locale),
        originalTag: tag,
        caught,
        missed,
        total,
        successRate: Math.round(successRate * 10) / 10,
      }
    })
    .filter(item => item.total >= 3)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  const getBarColor = (rate: number) => {
    if (rate >= 80) return '#059669'
    if (rate >= 60) return '#2563eb'
    if (rate >= 40) return '#d97706'
    return '#e11d48'
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-medium text-slate-900">{entry.theme}</p>
          <p className="text-sm text-slate-600 tabular-nums">Success Rate: {entry.successRate}%</p>
          <p className="text-sm text-slate-600 tabular-nums">
            Caught: {entry.caught} | Missed: {entry.missed}
          </p>
          <p className="text-sm text-slate-600 tabular-nums">
            Total Opportunities: {entry.total}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-xs text-slate-500 text-center">Success Rate (%)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="theme"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="successRate" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.successRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {chartData.map((entry) => (
          <div key={entry.theme} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: getBarColor(entry.successRate) }}
            />
            <span className="text-sm text-slate-700 truncate flex-1">{entry.theme}</span>
            <Badge variant="secondary" className="text-xs tabular-nums bg-slate-100 text-slate-700 shadow-none">
              {entry.successRate}%
            </Badge>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="text-slate-600">80%+ Excellent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="text-slate-600">60-79% Good</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />
            <span className="text-slate-600">40-59% Needs Work</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span className="text-slate-600">&lt;40% Focus Area</span>
          </div>
        </div>
      </div>
    </div>
  )
}
