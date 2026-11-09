"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts"
import { Badge } from "@/components/ui/badge"
import { isThemeExcluded, getThemeDisplayName } from "@/lib/theme-config"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

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
  missedData3To6M
}: ThemeSuccessRateTrendChartProps) {

  // Process data for both periods
  const processData = (caughtData?: ThemeData, missedData?: ThemeData) => {
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
    
    return Array.from(allTags)
      .map(tag => {
        const caught = caughtMap.get(tag) || 0
        const missed = missedMap.get(tag) || 0
        const total = caught + missed
        const successRate = total > 0 ? (caught / total) * 100 : 0
        
        return {
          tag,
          displayName: getThemeDisplayName(tag),
          caught,
          missed,
          total,
          successRate: Math.round(successRate * 10) / 10
        }
      })
      .filter(item => item.total >= 3) // Only themes with at least 3 opportunities
  }

  const current3MData = processData(caughtData3M, missedData3M)
  const previous3MData = processData(caughtData3To6M, missedData3To6M)

  // Get top 10 themes by total opportunities in current period
  const topThemes = current3MData
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(theme => theme.tag)

  // Create chart data combining both periods
  const chartData = topThemes.map(tag => {
    const currentTheme = current3MData.find(t => t.tag === tag)
    const previousTheme = previous3MData.find(t => t.tag === tag)
    
    const currentRate = currentTheme?.successRate || 0
    const previousRate = previousTheme?.successRate || 0
    const trend = currentRate - previousRate
    
    return {
      theme: currentTheme?.displayName || getThemeDisplayName(tag),
      current: currentRate,
      previous: previousRate,
      trend,
      currentTotal: currentTheme?.total || 0,
      previousTotal: previousTheme?.total || 0
    }
  })

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>No theme trend data available</p>
          <p className="text-sm mt-1">Need at least 3 opportunities per theme</p>
        </div>
      </div>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-blue-600">Recent 3M:</span>
              <span className="font-medium">{data.current.toFixed(1)}% ({data.currentTotal} total)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Previous 3M:</span>
              <span className="font-medium">{data.previous.toFixed(1)}% ({data.previousTotal} total)</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t">
              <span className="text-gray-700">Trend:</span>
              <div className="flex items-center space-x-1">
                {data.trend > 2 && <TrendingUp className="h-3 w-3 text-green-600" />}
                {data.trend < -2 && <TrendingDown className="h-3 w-3 text-red-600" />}
                {Math.abs(data.trend) <= 2 && <Minus className="h-3 w-3 text-gray-600" />}
                <span className={`font-medium ${
                  data.trend > 2 ? 'text-green-600' : 
                  data.trend < -2 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {data.trend > 0 ? '+' : ''}{data.trend.toFixed(1)}%
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
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="theme" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 11, fill: '#666' }}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#666' }}
              label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="previous" 
              fill="#cbd5e1" 
              name="Previous 3M"
              radius={[0, 0, 2, 2]}
            />
            <Bar 
              dataKey="current" 
              fill="#3b82f6" 
              name="Recent 3M"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend and summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span>Previous 3 Months</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Recent 3 Months</span>
          </div>
        </div>
        <div className="text-gray-600">
          Top 10 themes by opportunity count
        </div>
      </div>
    </div>
  )
}
