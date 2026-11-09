"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart } from "recharts"
import { GameReviewData } from "@/hooks/useGameReviewData"
import { useEffect, useState } from "react"

interface MoveLengthTrendChartProps {
  data: GameReviewData
}

export function MoveLengthTrendChart({ data }: MoveLengthTrendChartProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>Loading chart...</p>
        </div>
      </div>
    )
  }

  if (!data?.opponentMistakesTimeSeries?.nodes?.length && !data?.myMistakesTimeSeries?.nodes?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>No move length trend data available</p>
        </div>
      </div>
    )
  }

  // Helper function for consistent date formatting (SSR-safe)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const day = date.getDate()
    return `${month} ${day}`
  }

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString)
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const weekday = weekdays[date.getDay()]
    const month = months[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    return `${weekday}, ${month} ${day}, ${year}`
  }

  // Process opponent mistakes time series data
  const opponentData = data.opponentMistakesTimeSeries?.nodes?.map(node => {
    const date = new Date(node.start_time)
    // Use week start for alignment (Monday of the week)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay() + 1) // Monday
    weekStart.setHours(0, 0, 0, 0)
    const weekKey = weekStart.toISOString().split('T')[0]

    return {
      weekKey,
      date: formatDate(node.start_time),
      opponentMoveLength: (node.stats.average_move_length || 0) / 2, // Divide by 2 for actual puzzle moves
      fullDate: formatFullDate(node.start_time),
      timestamp: weekStart.getTime(),
      originalTimestamp: date.getTime()
    }
  }) || []

  // Process my mistakes time series data
  const myMistakesData = data.myMistakesTimeSeries?.nodes?.map(node => {
    const date = new Date(node.start_time)
    // Use week start for alignment (Monday of the week)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay() + 1) // Monday
    weekStart.setHours(0, 0, 0, 0)
    const weekKey = weekStart.toISOString().split('T')[0]

    return {
      weekKey,
      date: formatDate(node.start_time),
      myMoveLength: (node.stats.average_move_length || 0) / 2, // Divide by 2 for actual puzzle moves
      fullDate: formatFullDate(node.start_time),
      timestamp: weekStart.getTime(),
      originalTimestamp: date.getTime()
    }
  }) || []

  // Create a combined timeline using week alignment
  const allWeekKeys = new Set<string>()

  // Collect all unique week keys
  opponentData.forEach(item => allWeekKeys.add(item.weekKey))
  myMistakesData.forEach(item => allWeekKeys.add(item.weekKey))

  // Create timeline data with week-aligned data
  const timelineData = Array.from(allWeekKeys).map(weekKey => {
    const opponentItem = opponentData.find(item => item.weekKey === weekKey)
    const myItem = myMistakesData.find(item => item.weekKey === weekKey)

    // Use the first available item for date formatting, prefer opponent data
    const referenceItem = opponentItem || myItem
    const timestamp = new Date(weekKey + 'T00:00:00Z').getTime()

    return {
      timestamp,
      weekKey,
      date: referenceItem!.date,
      fullDate: referenceItem!.fullDate,
      opponentMoveLength: opponentItem?.opponentMoveLength,
      myMoveLength: myItem?.myMoveLength
    }
  }).sort((a, b) => a.timestamp - b.timestamp)

  // For statistics, use the original data
  const validOpponentData = opponentData
  const validMyData = myMistakesData

  // Debug logging (can be removed in production)
  // console.log('MoveLengthTrendChart - opponentData sample:', opponentData.slice(0, 3))
  // console.log('MoveLengthTrendChart - myMistakesData sample:', myMistakesData.slice(0, 3))
  // console.log('MoveLengthTrendChart - timelineData sample:', timelineData.slice(0, 3))

  if (timelineData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>No move length trend data available</p>
        </div>
      </div>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">Week of {data.fullDate}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => {
              // Only show entries with valid (non-null) values
              if (entry.value !== null && entry.value !== undefined) {
                return (
                  <p key={index} className="text-sm" style={{ color: entry.color }}>
                    {entry.name}: <span className="font-semibold">{entry.value.toFixed(1)} moves</span>
                  </p>
                )
              }
              return null
            })}
          </div>
        </div>
      )
    }
    return null
  }

  // Calculate statistics using only valid data points
  const avgOpponentLength = validOpponentData.length > 0 ?
    validOpponentData.reduce((sum, d) => sum + d.opponentMoveLength, 0) / validOpponentData.length : 0
  const avgMyLength = validMyData.length > 0 ?
    validMyData.reduce((sum, d) => sum + d.myMoveLength, 0) / validMyData.length : 0

  const opponentTrend = validOpponentData.length >= 2 ?
    validOpponentData[validOpponentData.length - 1].opponentMoveLength - validOpponentData[0].opponentMoveLength : 0
  const myTrend = validMyData.length >= 2 ?
    validMyData[validMyData.length - 1].myMoveLength - validMyData[0].myMoveLength : 0

  const getComplexityLabel = (length: number) => {
    if (length <= 3) return 'Simple'
    if (length <= 5) return 'Moderate'
    return 'Complex'
  }

  const getTrendIcon = (trend: number) => {
    if (Math.abs(trend) < 0.2) return '➡️'
    return trend > 0 ? '📈' : '📉'
  }

  const getTrendLabel = (trend: number, type: 'opponent' | 'my') => {
    if (Math.abs(trend) < 0.2) return 'Stable'
    if (type === 'opponent') {
      return trend > 0 ? 'More Complex' : 'Simpler'
    } else {
      return trend > 0 ? 'More Complex' : 'Simpler'
    }
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis
              domain={[0, 'dataMax + 1']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(value) => value.toFixed(1)}
              label={{ value: 'Average Puzzle Moves', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="opponentMoveLength"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ fill: '#2563eb', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, fill: '#1d4ed8' }}
              name="Missed Opportunities"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="myMoveLength"
              stroke="#dc2626"
              strokeWidth={3}
              dot={{ fill: '#dc2626', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, fill: '#b91c1c' }}
              name="My Mistakes"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-6">
        {/* Opponent Mistakes */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-blue-700 flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span>Missed Opportunities</span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-900">{avgOpponentLength.toFixed(1)}</div>
              <div className="text-xs text-blue-700">Average Length</div>
              <div className="text-xs font-medium text-blue-600">
                {getComplexityLabel(avgOpponentLength)}
              </div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-900">{getTrendIcon(opponentTrend)}</div>
              <div className="text-xs text-blue-700">Trend</div>
              <div className="text-xs font-medium text-blue-600">
                {getTrendLabel(opponentTrend, 'opponent')}
              </div>
            </div>
          </div>
        </div>

        {/* My Mistakes */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-red-700 flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span>My Mistakes</span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-semibold text-red-900">{avgMyLength.toFixed(1)}</div>
              <div className="text-xs text-red-700">Average Length</div>
              <div className="text-xs font-medium text-red-600">
                {getComplexityLabel(avgMyLength)}
              </div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-semibold text-red-900">{getTrendIcon(myTrend)}</div>
              <div className="text-xs text-red-700">Trend</div>
              <div className="text-xs font-medium text-red-600">
                {getTrendLabel(myTrend, 'my')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="pt-4 border-t border-gray-200">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Complexity Analysis</h4>
          <div className="text-sm text-gray-700 space-y-1">
            {avgOpponentLength > avgMyLength ? (
              <p>🎯 You're missing more complex tactical opportunities than the mistakes you make. Focus on improving pattern recognition for longer sequences.</p>
            ) : avgMyLength > avgOpponentLength ? (
              <p>⚠️ Your mistakes tend to be in more complex positions than the opportunities you miss. Consider slowing down in complicated positions.</p>
            ) : (
              <p>⚖️ The complexity of missed opportunities and your mistakes is similar. Work on both pattern recognition and careful calculation.</p>
            )}
            
            {opponentTrend > 0.5 && (
              <p className="text-red-600">📈 Missed opportunities are getting more complex over time - you may be facing stronger opponents.</p>
            )}
            
            {myTrend < -0.5 && (
              <p className="text-green-600">📉 Great! Your mistakes are becoming simpler over time, showing improved tactical awareness.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
