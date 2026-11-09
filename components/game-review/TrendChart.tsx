"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area } from "recharts"
import { LucideIcon, TrendingUp } from "lucide-react"
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
    card: 'border-green-200 bg-green-50',
    title: 'text-green-800',
    stroke: '#16a34a',
    fill: '#16a34a20'
  },
  blue: {
    card: 'border-blue-200 bg-blue-50',
    title: 'text-blue-800',
    stroke: '#2563eb',
    fill: '#2563eb20'
  },
  purple: {
    card: 'border-purple-200 bg-purple-50',
    title: 'text-purple-800',
    stroke: '#9333ea',
    fill: '#9333ea20'
  },
  orange: {
    card: 'border-orange-200 bg-orange-50',
    title: 'text-orange-800',
    stroke: '#ea580c',
    fill: '#ea580c20'
  },
  gray: {
    card: 'border-gray-200 bg-gray-50',
    title: 'text-gray-800',
    stroke: '#6b7280',
    fill: '#6b728020'
  }
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
  showTrend = true
}: TrendChartProps) {
  const colors = colorSchemes[colorScheme]

  // Calculate trend
  const trend = showTrend && data.length >= 2 ? 
    ((data[data.length - 1]?.value || 0) - (data[0]?.value || 0)) / (data[0]?.value || 1) * 100 : 0

  if (isLoading) {
    return (
      <Card className={cn(colors.card, 'transition-all duration-300', className)}>
        <CardHeader className="pb-3">
          <CardTitle className={cn('flex items-center space-x-2', colors.title)}>
            <Icon className="h-5 w-5" />
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
      <Card className={cn(colors.card, 'transition-all duration-300', className)}>
        <CardHeader className="pb-3">
          <CardTitle className={cn('flex items-center space-x-2', colors.title)}>
            <Icon className="h-5 w-5" />
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-gray-500">
            <div className="text-center">
              <Icon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(colors.card, 'transition-all duration-300 hover:shadow-md', className)}>
      <CardHeader className="pb-3">
        <CardTitle className={cn('flex items-center justify-between', colors.title)}>
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5" />
            <span>{title}</span>
          </div>
          {showTrend && (
            <div className={cn(
              'text-sm flex items-center space-x-1',
              trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
            )}>
              <span>{trend > 0 ? '↗' : trend < 0 ? '↘' : '→'}</span>
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
              <YAxis 
                tickFormatter={formatValue}
                fontSize={12}
                tickMargin={8}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric' 
                    })
                  }}
                  formatter={(value) => [formatValue(Number(value)), 'Value']}
                />} 
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
              <YAxis 
                tickFormatter={formatValue}
                fontSize={12}
                tickMargin={8}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric' 
                    })
                  }}
                  formatter={(value) => [formatValue(Number(value)), 'Value']}
                />} 
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
