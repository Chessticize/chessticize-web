"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { LucideIcon, ChevronRight, Lightbulb, TrendingUp, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface InsightCardProps {
  title: string
  type: 'strength' | 'weakness' | 'trend' | 'recommendation'
  description: string
  metrics?: Array<{
    label: string
    value: string | number
    trend?: 'up' | 'down' | 'neutral'
  }>
  recommendations?: string[]
  actionButton?: {
    text: string
    onClick: () => void
  }
  isLoading?: boolean
  className?: string
}

const typeConfig = {
  strength: {
    icon: TrendingUp,
    colors: {
      card: 'border-green-200 bg-green-50',
      header: 'text-green-800',
      badge: 'bg-green-100 text-green-800'
    },
    badgeText: 'Strength'
  },
  weakness: {
    icon: AlertTriangle,
    colors: {
      card: 'border-red-200 bg-red-50',
      header: 'text-red-800',
      badge: 'bg-red-100 text-red-800'
    },
    badgeText: 'Area for Improvement'
  },
  trend: {
    icon: TrendingUp,
    colors: {
      card: 'border-blue-200 bg-blue-50',
      header: 'text-blue-800',
      badge: 'bg-blue-100 text-blue-800'
    },
    badgeText: 'Trend'
  },
  recommendation: {
    icon: Lightbulb,
    colors: {
      card: 'border-orange-200 bg-orange-50',
      header: 'text-orange-800',
      badge: 'bg-orange-100 text-orange-800'
    },
    badgeText: 'Recommendation'
  }
}

export function InsightCard({
  title,
  type,
  description,
  metrics,
  recommendations,
  actionButton,
  isLoading = false,
  className
}: InsightCardProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  if (isLoading) {
    return (
      <Card className={cn(config.colors.card, 'transition-all duration-300', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      config.colors.card, 
      'transition-all duration-300 hover:shadow-md',
      className
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('flex items-center space-x-2', config.colors.header)}>
            <Icon className="h-5 w-5" />
            <span>{title}</span>
          </CardTitle>
          <Badge className={config.colors.badge}>
            {config.badgeText}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-gray-700 leading-relaxed">{description}</p>
        
        {metrics && metrics.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metrics.map((metric, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="text-sm font-medium text-gray-600">{metric.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900">
                    {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                  </span>
                  {metric.trend && (
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      metric.trend === 'up' ? 'bg-green-500' :
                      metric.trend === 'down' ? 'bg-red-500' : 'bg-gray-400'
                    )} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {recommendations && recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Recommendations:</h4>
            <ul className="space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {actionButton && (
          <Button 
            onClick={actionButton.onClick}
            className="w-full mt-4"
            variant="outline"
          >
            {actionButton.text}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
