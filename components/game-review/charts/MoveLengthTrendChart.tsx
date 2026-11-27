"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
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
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <TrendingUp className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">Loading chart...</p>
        </div>
      </div>
    )
  }

  if (!data?.opponentMistakesTimeSeries?.nodes?.length && !data?.myMistakesTimeSeries?.nodes?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <TrendingUp className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No move length trend data available</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}`
  }

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString)
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }

  const opponentData = data.opponentMistakesTimeSeries?.nodes?.map(node => {
    const date = new Date(node.start_time)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)
    const weekKey = weekStart.toISOString().split('T')[0]

    return {
      weekKey,
      date: formatDate(node.start_time),
      opponentMoveLength: (node.stats.average_move_length || 0) / 2,
      fullDate: formatFullDate(node.start_time),
      timestamp: weekStart.getTime(),
      originalTimestamp: date.getTime(),
    }
  }) || []

  const myMistakesData = data.myMistakesTimeSeries?.nodes?.map(node => {
    const date = new Date(node.start_time)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)
    const weekKey = weekStart.toISOString().split('T')[0]

    return {
      weekKey,
      date: formatDate(node.start_time),
      myMoveLength: (node.stats.average_move_length || 0) / 2,
      fullDate: formatFullDate(node.start_time),
      timestamp: weekStart.getTime(),
      originalTimestamp: date.getTime(),
    }
  }) || []

  const allWeekKeys = new Set<string>()
  opponentData.forEach(item => allWeekKeys.add(item.weekKey))
  myMistakesData.forEach(item => allWeekKeys.add(item.weekKey))

  const timelineData = Array.from(allWeekKeys)
    .map(weekKey => {
      const opponentItem = opponentData.find(item => item.weekKey === weekKey)
      const myItem = myMistakesData.find(item => item.weekKey === weekKey)
      const referenceItem = opponentItem || myItem
      const timestamp = new Date(weekKey + 'T00:00:00Z').getTime()

      return {
        timestamp,
        weekKey,
        date: referenceItem!.date,
        fullDate: referenceItem!.fullDate,
        opponentMoveLength: opponentItem?.opponentMoveLength,
        myMoveLength: myItem?.myMoveLength,
      }
    })
    .sort((a, b) => a.timestamp - b.timestamp)

  if (timelineData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <TrendingUp className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No move length trend data available</p>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-medium text-slate-900 mb-1.5">Week of {entry.fullDate}</p>
          <div className="space-y-1 text-sm tabular-nums">
            {payload.map((item: any, index: number) => {
              if (item.value !== null && item.value !== undefined) {
                return (
                  <p key={index} style={{ color: item.color }}>
                    {item.name}: <span className="font-semibold">{item.value.toFixed(1)} moves</span>
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

  const avgOpponentLength =
    opponentData.length > 0
      ? opponentData.reduce((sum, d) => sum + d.opponentMoveLength, 0) / opponentData.length
      : 0
  const avgMyLength =
    myMistakesData.length > 0
      ? myMistakesData.reduce((sum, d) => sum + d.myMoveLength, 0) / myMistakesData.length
      : 0

  const opponentTrend =
    opponentData.length >= 2
      ? opponentData[opponentData.length - 1].opponentMoveLength - opponentData[0].opponentMoveLength
      : 0
  const myTrend =
    myMistakesData.length >= 2
      ? myMistakesData[myMistakesData.length - 1].myMoveLength - myMistakesData[0].myMoveLength
      : 0

  const getComplexityLabel = (length: number) => {
    if (length <= 3) return 'Simple'
    if (length <= 5) return 'Moderate'
    return 'Complex'
  }

  const renderTrendIcon = (trend: number) => {
    if (Math.abs(trend) < 0.2) return <Minus className="h-4 w-4 text-slate-500 mx-auto" />
    return trend > 0 ? (
      <TrendingUp className="h-4 w-4 text-slate-700 mx-auto" />
    ) : (
      <TrendingDown className="h-4 w-4 text-slate-700 mx-auto" />
    )
  }

  const getTrendLabel = (trend: number) => {
    if (Math.abs(trend) < 0.2) return 'Stable'
    return trend > 0 ? 'More Complex' : 'Simpler'
  }

  return (
    <div className="space-y-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
            />
            <YAxis
              domain={[0, 'dataMax + 1']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(value) => value.toFixed(1)}
              label={{ value: 'Average Puzzle Moves', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="opponentMoveLength"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#1d4ed8' }}
              name="Missed Opportunities"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="myMoveLength"
              stroke="#e11d48"
              strokeWidth={2.5}
              dot={{ fill: '#e11d48', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#be123c' }}
              name="My Mistakes"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
            <span>Missed Opportunities</span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-lg font-semibold tabular-nums text-slate-900">{avgOpponentLength.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Average Length</div>
              <div className="text-xs font-medium text-slate-700 mt-0.5">
                {getComplexityLabel(avgOpponentLength)}
              </div>
            </div>
            <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="py-1">{renderTrendIcon(opponentTrend)}</div>
              <div className="text-xs text-slate-500">Trend</div>
              <div className="text-xs font-medium text-slate-700 mt-0.5">
                {getTrendLabel(opponentTrend)}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-rose-600 rounded-full" />
            <span>My Mistakes</span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-lg font-semibold tabular-nums text-slate-900">{avgMyLength.toFixed(1)}</div>
              <div className="text-xs text-slate-500">Average Length</div>
              <div className="text-xs font-medium text-slate-700 mt-0.5">
                {getComplexityLabel(avgMyLength)}
              </div>
            </div>
            <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="py-1">{renderTrendIcon(myTrend)}</div>
              <div className="text-xs text-slate-500">Trend</div>
              <div className="text-xs font-medium text-slate-700 mt-0.5">
                {getTrendLabel(myTrend)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-slate-500">Complexity Analysis</h4>
          <div className="text-sm text-slate-700 space-y-1">
            {avgOpponentLength > avgMyLength ? (
              <p>You miss more complex tactical opportunities than the mistakes you make. Focus on pattern recognition for longer sequences.</p>
            ) : avgMyLength > avgOpponentLength ? (
              <p>Your mistakes tend to occur in more complex positions than the opportunities you miss. Consider slowing down in complicated positions.</p>
            ) : (
              <p>The complexity of missed opportunities and your mistakes is similar.</p>
            )}

            {opponentTrend > 0.5 && (
              <p className="text-rose-700">Missed opportunities are getting more complex over time.</p>
            )}

            {myTrend < -0.5 && (
              <p className="text-emerald-700">Your mistakes are becoming simpler over time, showing improved tactical awareness.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
