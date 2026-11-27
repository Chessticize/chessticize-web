"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, AreaChart, Area } from "recharts"
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TrendChartProps {
  title: string
  data: Array<{
    date: string
    value: number
    label?: string
  }>
  icon?: LucideIcon
  colorScheme?: 'green' | 'blue' | 'purple' | 'orange' | 'gray'
  chartType?: 'line' | 'area'
  isLoading?: boolean
  className?: string
  formatValue?: (value: number) => string
  showTrend?: boolean
}

const colorSchemes = {
  green: {
    icon: 'text-emerald-600',
    stroke: '#059669',
    fill: '#0596691f',
  },
  blue: {
    icon: 'text-blue-600',
    stroke: '#2563eb',
    fill: '#2563eb1f',
  },
  purple: {
    icon: 'text-slate-600',
    stroke: '#475569',
    fill: '#4755691f',
  },
  orange: {
    icon: 'text-amber-600',
    stroke: '#d97706',
    fill: '#d977061f',
  },
  gray: {
    icon: 'text-slate-500',
    stroke: '#64748b',
    fill: '#64748b1f',
  },
}

const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--chart-1))",
  },
}

export function TrendChart({
  title,
  data,
  icon: Icon = TrendingUp,
  colorScheme = 'blue',
  chartType = 'line',
  isLoading = false,
  className,
  formatValue = (value) => value.toString(),
  showTrend = true,
}: TrendChartProps) {
  const colors = colorSchemes[colorScheme]

  const trend =
    showTrend && data.length >= 2
      ? (((data[data.length - 1]?.value || 0) - (data[0]?.value || 0)) / (data[0]?.value || 1)) * 100
      : 0

  if (isLoading) {
    return (
      <Card className={cn('border-slate-200 bg-white shadow-sm', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            <Icon className={cn('h-4 w-4', colors.icon)} />
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn('border-slate-200 bg-white shadow-sm', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            <Icon className={cn('h-4 w-4', colors.icon)} />
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-slate-500">
            <div className="flex flex-col items-center text-center">
              <Icon className="h-8 w-8 mb-2 text-slate-300" />
              <p className="text-sm">No data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold tracking-tight text-slate-900">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', colors.icon)} />
            <span>{title}</span>
          </div>
          {showTrend && (
            <div
              className={cn(
                'text-sm font-medium tabular-nums flex items-center gap-1',
                trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-rose-600' : 'text-slate-500'
              )}
            >
              {trend > 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : trend < 0 ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          {chartType === 'area' ? (
            <AreaChart data={data}>
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }}
                fontSize={12}
                tickMargin={8}
              />
              <YAxis tickFormatter={formatValue} fontSize={12} tickMargin={8} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })
                    }}
                    formatter={(value) => [formatValue(Number(value)), 'Value']}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors.stroke}
                fill={colors.fill}
                strokeWidth={2}
                dot={{ fill: colors.stroke, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: colors.stroke, strokeWidth: 2 }}
              />
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }}
                fontSize={12}
                tickMargin={8}
              />
              <YAxis tickFormatter={formatValue} fontSize={12} tickMargin={8} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })
                    }}
                    formatter={(value) => [formatValue(Number(value)), 'Value']}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={colors.stroke}
                strokeWidth={2}
                dot={{ fill: colors.stroke, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: colors.stroke, strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
