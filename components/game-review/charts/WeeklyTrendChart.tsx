"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { GameReviewData } from "@/hooks/useGameReviewData"

interface WeeklyTrendChartProps {
  data: GameReviewData
}

export function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  if (!data?.opponentMistakesTimeSeries?.nodes?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>No trend data available</p>
        </div>
      </div>
    )
  }

  // Process the time series data
  const chartData = data.opponentMistakesTimeSeries.nodes.map(node => {
    let caught = 0
    let missed = 0
    
    node.stats.theme_counts.forEach(theme => {
      if (theme.theme.includes('caught')) {
        caught += theme.count
      } else if (theme.theme.includes('missed')) {
        missed += theme.count
      }
    })
    
    const total = caught + missed
    const recognitionRate = total > 0 ? (caught / total) * 100 : 0
    
    // Format date for display
    const date = new Date(node.start_time)
    const label = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    
    return {
      date: label,
      recognitionRate: recognitionRate,
      caught: caught,
      missed: missed,
      total: total,
      fullDate: date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    }
  }).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-blue-200 rounded-lg shadow-lg">
          <p className="font-medium text-blue-900 mb-2">Week of {data.fullDate}</p>
          <div className="space-y-1">
            <p className="text-sm text-blue-700">
              Recognition Rate: <span className="font-semibold">{data.recognitionRate.toFixed(1)}%</span>
            </p>
            <p className="text-sm text-green-700">
              Caught: <span className="font-semibold">{data.caught}</span>
            </p>
            <p className="text-sm text-red-700">
              Missed: <span className="font-semibold">{data.missed}</span>
            </p>
            <p className="text-sm text-gray-700">
              Total Opportunities: <span className="font-semibold">{data.total}</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // Calculate trend
  const getTrend = () => {
    if (chartData.length < 2) return { direction: 'stable', change: 0 }
    
    const recent = chartData.slice(-4) // Last 4 weeks
    if (recent.length < 2) return { direction: 'stable', change: 0 }
    
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2))
    const secondHalf = recent.slice(Math.floor(recent.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.recognitionRate, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.recognitionRate, 0) / secondHalf.length
    
    const change = secondAvg - firstAvg
    
    if (Math.abs(change) < 2) return { direction: 'stable', change }
    return { direction: change > 0 ? 'improving' : 'declining', change }
  }

  const trend = getTrend()
  const currentRate = chartData.length > 0 ? chartData[chartData.length - 1].recognitionRate : 0
  const bestRate = chartData.length > 0 ? Math.max(...chartData.map(d => d.recognitionRate)) : 0
  const avgRate = chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.recognitionRate, 0) / chartData.length : 0

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRecognition" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis 
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ value: 'Recognition Rate (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="recognitionRate"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorRecognition)"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#1d4ed8' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 text-center">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-lg font-semibold text-blue-900">{currentRate.toFixed(1)}%</div>
          <div className="text-xs text-blue-700">Current</div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-lg font-semibold text-green-900">{bestRate.toFixed(1)}%</div>
          <div className="text-xs text-green-700">Best</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{avgRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-700">Average</div>
        </div>
        <div className={`p-3 rounded-lg ${
          trend.direction === 'improving' ? 'bg-green-50' : 
          trend.direction === 'declining' ? 'bg-red-50' : 'bg-gray-50'
        }`}>
          <div className={`text-lg font-semibold ${
            trend.direction === 'improving' ? 'text-green-900' : 
            trend.direction === 'declining' ? 'text-red-900' : 'text-gray-900'
          }`}>
            {trend.direction === 'improving' ? '📈' : 
             trend.direction === 'declining' ? '📉' : '➡️'}
          </div>
          <div className={`text-xs ${
            trend.direction === 'improving' ? 'text-green-700' : 
            trend.direction === 'declining' ? 'text-red-700' : 'text-gray-700'
          }`}>
            {trend.direction === 'stable' ? 'Stable' : 
             `${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}%`}
          </div>
        </div>
      </div>
    </div>
  )
}
