"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
    direction: 'up' | 'down' | 'neutral'
  }
  badge?: {
    text: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
  colorScheme?: 'green' | 'blue' | 'purple' | 'orange' | 'gray'
  isLoading?: boolean
  className?: string
}

const colorSchemes = {
  green: {
    card: 'border-green-200 bg-green-50',
    title: 'text-green-800',
    value: 'text-green-900',
    badge: 'bg-green-100 text-green-800'
  },
  blue: {
    card: 'border-blue-200 bg-blue-50',
    title: 'text-blue-800',
    value: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-800'
  },
  purple: {
    card: 'border-purple-200 bg-purple-50',
    title: 'text-purple-800',
    value: 'text-purple-900',
    badge: 'bg-purple-100 text-purple-800'
  },
  orange: {
    card: 'border-orange-200 bg-orange-50',
    title: 'text-orange-800',
    value: 'text-orange-900',
    badge: 'bg-orange-100 text-orange-800'
  },
  gray: {
    card: 'border-gray-200 bg-gray-50',
    title: 'text-gray-800',
    value: 'text-gray-900',
    badge: 'bg-gray-100 text-gray-800'
  }
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  badge,
  colorScheme = 'gray',
  isLoading = false,
  className
}: StatCardProps) {
  const colors = colorSchemes[colorScheme]

  if (isLoading) {
    return (
      <Card className={cn(colors.card, 'transition-all duration-300', className)}>
        <CardHeader className="pb-3">
          <CardTitle className={cn('flex items-center space-x-2', colors.title)}>
            {Icon && <Icon className="h-5 w-5" />}
            <Skeleton className="h-5 w-24" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            {subtitle && <Skeleton className="h-4 w-20" />}
            {badge && <Skeleton className="h-6 w-16 rounded-full" />}
          </div>
        </CardContent>
      </Card>
    )
  }

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : 
                   trend?.direction === 'down' ? TrendingDown : Minus

  return (
    <Card className={cn(colors.card, 'transition-all duration-300 hover:shadow-md', className)}>
      <CardHeader className="pb-3">
        <CardTitle className={cn('flex items-center space-x-2', colors.title)}>
          {Icon && <Icon className="h-5 w-5" />}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className={cn('text-3xl font-bold', colors.value)}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
          
          <div className="flex items-center justify-between">
            {badge && (
              <Badge 
                variant={badge.variant || 'secondary'} 
                className={colors.badge}
              >
                {badge.text}
              </Badge>
            )}
            
            {trend && (
              <div className={cn(
                'flex items-center space-x-1 text-sm',
                trend.direction === 'up' ? 'text-green-600' :
                trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
              )}>
                <TrendIcon className="h-4 w-4" />
                <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
                <span className="text-gray-500">{trend.label}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
