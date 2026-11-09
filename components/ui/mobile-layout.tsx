"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface MobileLayoutProps {
  children: React.ReactNode
  className?: string
  hasBottomNav?: boolean
  fullHeight?: boolean
}

/**
 * Mobile-optimized layout wrapper that handles:
 * - Proper spacing for bottom navigation
 * - Safe area handling for mobile devices
 * - Responsive padding and margins
 */
export function MobileLayout({ 
  children, 
  className, 
  hasBottomNav = true, 
  fullHeight = false 
}: MobileLayoutProps) {
  return (
    <div 
      className={cn(
        "w-full flex flex-col",
        fullHeight ? "min-h-screen" : "min-h-0",
        hasBottomNav ? "pb-16 lg:pb-0" : "", // Add bottom padding for mobile nav
        className
      )}
    >
      {children}
    </div>
  )
}

interface MobileContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

/**
 * Mobile-optimized container with responsive padding
 */
export function MobileContainer({ 
  children, 
  className, 
  maxWidth = '6xl',
  padding = 'md'
}: MobileContainerProps) {
  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md', 
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl'
  }

  const paddingClasses = {
    'none': '',
    'sm': 'px-4 py-4',
    'md': 'px-4 py-6 sm:px-6 lg:px-8',
    'lg': 'px-4 py-8 sm:px-6 lg:px-8 lg:py-12'
  }

  return (
    <div className={cn(
      "mx-auto w-full",
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  )
}

interface MobileCardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  hover?: boolean
}

/**
 * Mobile-optimized card component with proper touch targets
 */
export function MobileCard({ 
  children, 
  className, 
  padding = 'md',
  hover = false 
}: MobileCardProps) {
  const paddingClasses = {
    'sm': 'p-4',
    'md': 'p-4 sm:p-6 lg:p-8',
    'lg': 'p-6 sm:p-8 lg:p-10'
  }

  return (
    <div className={cn(
      "bg-white rounded-xl shadow-sm border border-gray-200",
      paddingClasses[padding],
      hover && "hover:shadow-md transition-shadow duration-200",
      className
    )}>
      {children}
    </div>
  )
}

interface MobileButtonProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  fullWidth?: boolean
  onClick?: () => void
  disabled?: boolean
}

/**
 * Mobile-optimized button with proper touch targets (minimum 44px)
 */
export function MobileButton({ 
  children, 
  className, 
  size = 'md',
  variant = 'primary',
  fullWidth = false,
  onClick,
  disabled = false
}: MobileButtonProps) {
  const sizeClasses = {
    'sm': 'h-10 px-3 text-sm', // 40px height - slightly smaller but still accessible
    'md': 'h-11 px-4 text-sm', // 44px height - optimal touch target
    'lg': 'h-12 px-6 text-base' // 48px height - larger touch target
  }

  const variantClasses = {
    'primary': 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
    'secondary': 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    'outline': 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    'ghost': 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        "touch-manipulation", // Improves touch responsiveness
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
