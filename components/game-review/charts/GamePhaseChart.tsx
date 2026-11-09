"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { GameReviewData } from "@/hooks/useGameReviewData"

interface GamePhaseChartProps {
  data: GameReviewData
}

export function GamePhaseChart({ data }: GamePhaseChartProps) {
  // Check if we have any game move buckets data
  const missedBuckets = data?.opponentMistakesMissed3M?.game_move_buckets || []
  const caughtBuckets = data?.opponentMistakesCaught3M?.game_move_buckets || []

  if (missedBuckets.length === 0 && caughtBuckets.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No game phase data available</p>
          <p className="text-sm mt-2">Play more games to see phase analysis</p>
        </div>
      </div>
    )
  }

  // Process game phase data
  const processGamePhaseData = () => {
    // Create a map to track phase order from API and store phase data
    const phaseOrderMap = new Map<string, number>()
    const phases: Record<string, { caught: number; missed: number; total: number; rate: number; order: number }> = {}

    // Process caught opportunities first to establish order
    caughtBuckets.forEach((bucket, index) => {
      if (bucket.name && bucket.count > 0) {
        if (!phaseOrderMap.has(bucket.name)) {
          phaseOrderMap.set(bucket.name, index)
        }
        if (!phases[bucket.name]) {
          phases[bucket.name] = { caught: 0, missed: 0, total: 0, rate: 0, order: phaseOrderMap.get(bucket.name)! }
        }
        phases[bucket.name].caught = bucket.count
      }
    })

    // Process missed opportunities, maintaining order
    missedBuckets.forEach((bucket, index) => {
      if (bucket.name && bucket.count > 0) {
        if (!phaseOrderMap.has(bucket.name)) {
          phaseOrderMap.set(bucket.name, caughtBuckets.length + index)
        }
        if (!phases[bucket.name]) {
          phases[bucket.name] = { caught: 0, missed: 0, total: 0, rate: 0, order: phaseOrderMap.get(bucket.name)! }
        }
        phases[bucket.name].missed = bucket.count
      }
    })

    // Calculate totals and rates
    Object.keys(phases).forEach(phase => {
      phases[phase].total = phases[phase].caught + phases[phase].missed
      phases[phase].rate = phases[phase].total > 0
        ? (phases[phase].caught / phases[phase].total) * 100
        : 0
    })

    // Convert to chart data and sort by API order (logical game phase progression)
    const chartData = Object.keys(phases)
      .filter(phase => phases[phase].total > 0) // Only include phases with data
      .map(phase => ({
        phase,
        rate: phases[phase].rate,
        caught: phases[phase].caught,
        missed: phases[phase].missed,
        total: phases[phase].total,
        order: phases[phase].order
      }))
      .sort((a, b) => a.order - b.order) // Sort by the order from API

    return chartData
  }

  const chartData = processGamePhaseData()

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No game phase data to display</p>
          <p className="text-sm mt-2">
            {missedBuckets.length > 0 || caughtBuckets.length > 0
              ? 'Data available but no phases with opportunities found'
              : 'Play more games to see phase-based analysis'
            }
          </p>
        </div>
      </div>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-purple-200 rounded-lg shadow-lg">
          <p className="font-medium text-purple-900 mb-2">{data.phase}</p>
          <div className="space-y-1">
            <p className="text-sm text-purple-700">
              Recognition Rate: <span className="font-semibold">{data.rate.toFixed(1)}%</span>
            </p>
            <p className="text-sm text-green-700">
              Caught: <span className="font-semibold">{data.caught}</span>
            </p>
            <p className="text-sm text-red-700">
              Missed: <span className="font-semibold">{data.missed}</span>
            </p>
            <p className="text-sm text-gray-700">
              Total: <span className="font-semibold">{data.total}</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // Get color based on game phase
  const getBarColor = (phase: string) => {
    const phaseLower = phase.toLowerCase()
    if (phaseLower.includes('opening') && !phaseLower.includes('middle')) {
      return '#22c55e' // Green for openings only
    }
    if (phaseLower.includes('middle') || phaseLower.includes('mid') ||
        (phaseLower.includes('early') && phaseLower.includes('middle'))) {
      return '#eab308' // Yellow for middlegames (including early middlegame)
    }
    if (phaseLower.includes('end') || phaseLower.includes('late')) {
      return '#ef4444' // Red for endgames
    }
    // Default fallback based on position in sequence
    return '#6b7280' // Gray for unknown phases
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 text-center">Recognition Rate (%)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="phase"
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
                dataKey="rate"
                radius={[4, 4, 0, 0]}
                stroke="#374151"
                strokeWidth={1}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.phase)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Best Phase</h4>
          {chartData.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">
                {chartData.reduce((best, current) => 
                  current.rate > best.rate ? current : best
                ).phase}
              </span>
              <span className="text-sm font-semibold text-green-700">
                {chartData.reduce((best, current) => 
                  current.rate > best.rate ? current : best
                ).rate.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Focus Area</h4>
          {chartData.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-700">
                {chartData.reduce((worst, current) => 
                  current.rate < worst.rate ? current : worst
                ).phase}
              </span>
              <span className="text-sm font-semibold text-red-700">
                {chartData.reduce((worst, current) => 
                  current.rate < worst.rate ? current : worst
                ).rate.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Overall stats */}
      <div className="pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {chartData.reduce((sum, phase) => sum + phase.total, 0)}
            </div>
            <div className="text-xs text-gray-600">Total Opportunities</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {chartData.reduce((sum, phase) => sum + phase.caught, 0)}
            </div>
            <div className="text-xs text-gray-600">Successfully Caught</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {chartData.length > 0 
                ? (chartData.reduce((sum, phase) => sum + phase.rate, 0) / chartData.length).toFixed(1)
                : '0'
              }%
            </div>
            <div className="text-xs text-gray-600">Average Rate</div>
          </div>
        </div>
      </div>
    </div>
  )
}
