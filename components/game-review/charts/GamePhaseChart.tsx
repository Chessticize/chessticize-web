"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { BarChart3 } from "lucide-react"
import { GameReviewData } from "@/hooks/useGameReviewData"

interface GamePhaseChartProps {
  data: GameReviewData
}

export function GamePhaseChart({ data }: GamePhaseChartProps) {
  const missedBuckets = data?.opponentMistakesMissed3M?.game_move_buckets || []
  const caughtBuckets = data?.opponentMistakesCaught3M?.game_move_buckets || []

  if (missedBuckets.length === 0 && caughtBuckets.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <BarChart3 className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No game phase data available</p>
          <p className="text-xs text-slate-400 mt-1">Play more games to see phase analysis</p>
        </div>
      </div>
    )
  }

  const processGamePhaseData = () => {
    const phaseOrderMap = new Map<string, number>()
    const phases: Record<string, { caught: number; missed: number; total: number; rate: number; order: number }> = {}

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

    Object.keys(phases).forEach(phase => {
      phases[phase].total = phases[phase].caught + phases[phase].missed
      phases[phase].rate = phases[phase].total > 0
        ? (phases[phase].caught / phases[phase].total) * 100
        : 0
    })

    return Object.keys(phases)
      .filter(phase => phases[phase].total > 0)
      .map(phase => ({
        phase,
        rate: phases[phase].rate,
        caught: phases[phase].caught,
        missed: phases[phase].missed,
        total: phases[phase].total,
        order: phases[phase].order,
      }))
      .sort((a, b) => a.order - b.order)
  }

  const chartData = processGamePhaseData()

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center text-center">
          <BarChart3 className="h-6 w-6 text-slate-300 mb-2" />
          <p className="text-sm">No game phase data to display</p>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-medium text-slate-900 mb-1.5">{entry.phase}</p>
          <div className="space-y-1 text-sm tabular-nums">
            <p className="text-slate-600">
              Recognition Rate: <span className="font-semibold text-slate-900">{entry.rate.toFixed(1)}%</span>
            </p>
            <p className="text-emerald-700">
              Caught: <span className="font-semibold">{entry.caught}</span>
            </p>
            <p className="text-rose-700">
              Missed: <span className="font-semibold">{entry.missed}</span>
            </p>
            <p className="text-slate-600">
              Total: <span className="font-semibold text-slate-900">{entry.total}</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const getBarColor = (phase: string) => {
    const phaseLower = phase.toLowerCase()
    if (phaseLower.includes('opening') && !phaseLower.includes('middle')) return '#2563eb'
    if (phaseLower.includes('middle') || phaseLower.includes('mid')) return '#475569'
    if (phaseLower.includes('end') || phaseLower.includes('late')) return '#0284c7'
    return '#64748b'
  }

  const bestPhase = chartData.reduce((best, current) => (current.rate > best.rate ? current : best))
  const worstPhase = chartData.reduce((worst, current) => (current.rate < worst.rate ? current : worst))

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-xs text-slate-500 text-center">Recognition Rate (%)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="phase"
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
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.phase)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-slate-500">Best Phase</h4>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
            <span className="text-sm text-slate-700 truncate">{bestPhase.phase}</span>
            <span className="text-sm font-semibold tabular-nums text-emerald-700">
              {bestPhase.rate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-slate-500">Focus Area</h4>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
            <span className="text-sm text-slate-700 truncate">{worstPhase.phase}</span>
            <span className="text-sm font-semibold tabular-nums text-rose-700">
              {worstPhase.rate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold tabular-nums text-slate-900">
              {chartData.reduce((sum, phase) => sum + phase.total, 0)}
            </div>
            <div className="text-xs text-slate-500">Total Opportunities</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums text-slate-900">
              {chartData.reduce((sum, phase) => sum + phase.caught, 0)}
            </div>
            <div className="text-xs text-slate-500">Successfully Caught</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums text-slate-900">
              {(chartData.reduce((sum, phase) => sum + phase.rate, 0) / chartData.length).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500">Average Rate</div>
          </div>
        </div>
      </div>
    </div>
  )
}
