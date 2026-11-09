"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { GameReviewData } from "@/hooks/useGameReviewData"

interface MyMistakesTrendChartProps {
  data: GameReviewData
}

export function MyMistakesTrendChart({ data }: MyMistakesTrendChartProps) {
  if (!data?.myMistakesTimeSeries?.nodes?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📉</div>
          <p>No mistakes trend data available</p>
        </div>
      </div>
    )
  }

  // Process the time series data for mistakes per game
  const chartData = data.myMistakesTimeSeries.nodes.map(node => {
    const totalMistakes = node.stats.total_count || 0
    const totalGames = node.stats.unique_game_count || 0
    const mistakesPerGame = totalGames > 0 ? totalMistakes / totalGames : 0
    
    // Format date for display
    const date = new Date(node.start_time)
    const label = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    
    return {
      date: label,
      mistakesPerGame: mistakesPerGame,
      totalMistakes: totalMistakes,
      totalGames: totalGames,
      averageMoveLength: (node.stats.average_move_length || 0) / 2, // Divide by 2 for actual puzzle moves
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
        <div className="bg-white p-4 border border-red-200 rounded-lg shadow-lg">
          <p className="font-medium text-red-900 mb-2">Week of {data.fullDate}</p>
          <div className="space-y-1">
            <p className="text-sm text-red-700">
              Mistakes Per Game: <span className="font-semibold">{data.mistakesPerGame.toFixed(2)}</span>
            </p>
            <p className="text-sm text-gray-700">
              Total Mistakes: <span className="font-semibold">{data.totalMistakes}</span>
            </p>
            <p className="text-sm text-gray-700">
              Games Played: <span className="font-semibold">{data.totalGames}</span>
            </p>
            <p className="text-sm text-blue-700">
              Avg Puzzle Length: <span className="font-semibold">{data.averageMoveLength.toFixed(1)} puzzle moves</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // Calculate trend and statistics
  const getTrend = () => {
    if (chartData.length < 2) return { direction: 'stable', change: 0 }
    
    const recent = chartData.slice(-4) // Last 4 weeks
    if (recent.length < 2) return { direction: 'stable', change: 0 }
    
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2))
    const secondHalf = recent.slice(Math.floor(recent.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.mistakesPerGame, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.mistakesPerGame, 0) / secondHalf.length
    
    const change = secondAvg - firstAvg
    
    if (Math.abs(change) < 0.1) return { direction: 'stable', change }
    return { direction: change < 0 ? 'improving' : 'declining', change } // Lower is better for mistakes
  }

  const trend = getTrend()
  const currentRate = chartData.length > 0 ? chartData[chartData.length - 1].mistakesPerGame : 0
  const bestRate = chartData.length > 0 ? Math.min(...chartData.map(d => d.mistakesPerGame)) : 0 // Min is best for mistakes
  const avgRate = chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.mistakesPerGame, 0) / chartData.length : 0

  // Get performance level color
  const getPerformanceColor = (rate: number) => {
    if (rate <= 1.5) return 'text-green-700'
    if (rate <= 2.5) return 'text-yellow-700'
    return 'text-red-700'
  }

  const getPerformanceLabel = (rate: number) => {
    if (rate <= 1.5) return 'Excellent'
    if (rate <= 2.5) return 'Good'
    return 'Needs Work'
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorMistakes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
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
              domain={[0, 'dataMax + 0.5']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ value: 'Mistakes Per Game', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="mistakesPerGame"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#colorMistakes)"
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#dc2626' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 text-center">
        <div className="p-3 bg-red-50 rounded-lg">
          <div className={`text-lg font-semibold ${getPerformanceColor(currentRate)}`}>
            {currentRate.toFixed(2)}
          </div>
          <div className="text-xs text-red-700">Current</div>
          <div className={`text-xs font-medium ${getPerformanceColor(currentRate)}`}>
            {getPerformanceLabel(currentRate)}
          </div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-lg font-semibold text-green-900">{bestRate.toFixed(2)}</div>
          <div className="text-xs text-green-700">Best Week</div>
          <div className="text-xs font-medium text-green-700">
            {getPerformanceLabel(bestRate)}
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{avgRate.toFixed(2)}</div>
          <div className="text-xs text-gray-700">Average</div>
          <div className={`text-xs font-medium ${getPerformanceColor(avgRate)}`}>
            {getPerformanceLabel(avgRate)}
          </div>
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
             trend.direction === 'improving' ? 'Improving' : 'Declining'}
          </div>
          <div className="text-xs text-gray-600">
            {Math.abs(trend.change) < 0.1 ? '±0.0' : 
             `${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}`}
          </div>
        </div>
      </div>

      {/* Performance insights */}
      <div className="pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Performance Goal</h4>
            <div className="text-sm text-gray-700">
              {currentRate <= 1.5 ? (
                <span className="text-green-700">🎯 Excellent! Keep maintaining this low mistake rate.</span>
              ) : currentRate <= 2.5 ? (
                <span className="text-yellow-700">📈 Good progress! Aim for under 1.5 mistakes per game.</span>
              ) : (
                <span className="text-red-700">🎯 Focus on reducing mistakes. Target: under 2.5 per game.</span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Recent Trend</h4>
            <div className="text-sm text-gray-700">
              {trend.direction === 'improving' ? (
                <span className="text-green-700">📉 Great! You're making fewer mistakes over time.</span>
              ) : trend.direction === 'declining' ? (
                <span className="text-red-700">📈 Focus needed - mistakes are increasing recently.</span>
              ) : (
                <span className="text-gray-700">➡️ Consistent performance - room for improvement.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
