"use client"

import React, { useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ValidationState } from '@/lib/utils/chess-validation'
import { useDebounce } from '@/hooks/useChessUsernameValidation'

interface ChessUsernameInputProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onValidate: (username: string) => Promise<void>
  validation: ValidationState
  disabled?: boolean
  className?: string
}

export function ChessUsernameInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  onValidate,
  validation,
  disabled = false,
  className
}: ChessUsernameInputProps) {
  // Track the last validated value to prevent duplicate validations
  const lastValidatedValue = useRef<string>('')

  // Debounce the username value to avoid excessive API calls
  const debouncedUsername = useDebounce(value, 1000) // 1 second delay

  // Validate when debounced value changes
  useEffect(() => {
    if (debouncedUsername !== value) return // Only validate when debounce is complete
    if (debouncedUsername === lastValidatedValue.current) return // Skip if already validated

    lastValidatedValue.current = debouncedUsername
    onValidate(debouncedUsername)
  }, [debouncedUsername, onValidate, value])

  // Also validate on blur for immediate feedback, but only if value changed
  const handleBlur = () => {
    if (value.trim() && value !== lastValidatedValue.current) {
      lastValidatedValue.current = value
      onValidate(value)
    }
  }

  const getValidationIcon = () => {
    if (validation.isValidating) {
      return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    }
    
    if (validation.isValid === true) {
      return <Check className="h-4 w-4 text-green-600" />
    }
    
    if (validation.isValid === false) {
      return <X className="h-4 w-4 text-red-600" />
    }
    
    return null
  }

  const getInputBorderClass = () => {
    if (validation.isValid === true) {
      return 'border-green-500 focus:border-green-500 focus:ring-green-500'
    }
    
    if (validation.isValid === false) {
      return 'border-red-500 focus:border-red-500 focus:ring-red-500'
    }
    
    return ''
  }

  return (
    <div className={className}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative mt-1">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pr-10",
            getInputBorderClass()
          )}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {getValidationIcon()}
        </div>
      </div>
      {validation.isValid === false && validation.error && (
        <p className="mt-1 text-sm text-red-600">
          {validation.error}
        </p>
      )}
      {validation.isValid === true && value.trim() && (
        <p className="mt-1 text-sm text-green-600">
          Username verified successfully
        </p>
      )}
    </div>
  )
}
