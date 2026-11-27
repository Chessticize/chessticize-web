"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Settings, Play, Clock, Target, Zap } from "lucide-react"
import {
  VALID_THEMES,
  VALID_PER_PUZZLE_TIMES,
  VALID_SPRINT_DURATIONS,
  validateCustomSprintConfig,
  calculateTargetPuzzles,
  getCustomEloType,
  getArrowDuelEloType
} from "@/lib/sprint-config"
import { getThemeDisplayName } from "@/lib/theme-config"
import { useUserContext } from "@/hooks/useUserContext"

interface CustomSprintConfig {
  mode: 'regular' | 'arrowduel'
  theme: string
  durationMinutes: number
  perPuzzleSeconds: number
}

interface CustomSprintSelectionProps {
  onStartSprint: (eloType: string, mode?: 'regular' | 'arrowduel') => void
  onCancel: () => void
  initialConfig?: {
    mode?: 'regular' | 'arrowduel'
    theme?: string
    durationMinutes?: number
    perPuzzleSeconds?: number
  }
}

export function CustomSprintSelection({ onStartSprint, onCancel, initialConfig }: CustomSprintSelectionProps) {
  const { user } = useUserContext()

  // Get the most recent custom sprint configuration
  const getMostRecentConfig = (): CustomSprintConfig => {
    if (!user?.elos) return { mode: 'regular', theme: 'mixed', durationMinutes: 5, perPuzzleSeconds: 20 }

    const customSprints = user.elos
      .filter(elo => {
        const eloType = elo.elo_type
        // Skip standard predefined types
        if (eloType === 'mixed 5/20' || eloType === 'mixed 5/10') return false

        // Check if it matches custom ELO pattern
        const match = eloType.match(/^(.+)\s+(\d+)\/(\d+)$/)
        if (!match) return false

        const [, theme, duration, perPuzzle] = match
        const durationNum = parseInt(duration, 10)
        const perPuzzleNum = parseInt(perPuzzle, 10)

        // Validate it's a valid custom configuration
        return VALID_THEMES.includes(theme as any) &&
               VALID_SPRINT_DURATIONS.includes(durationNum as any) &&
               VALID_PER_PUZZLE_TIMES.includes(perPuzzleNum as any)
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    if (customSprints.length === 0) {
      return { mode: 'regular', theme: 'mixed', durationMinutes: 5, perPuzzleSeconds: 20 }
    }

    const mostRecent = customSprints[0]
    const match = mostRecent.elo_type.match(/^(.+)\s+(\d+)\/(\d+)$/)!
    const [, theme, duration, perPuzzle] = match

    return {
      mode: 'regular', // Default to regular for existing configs
      theme,
      durationMinutes: parseInt(duration, 10),
      perPuzzleSeconds: parseInt(perPuzzle, 10)
    }
  }

  const [config, setConfig] = useState<CustomSprintConfig>(() => {
    // Priority: initialConfig from URL > most recent sprint > hardcoded defaults
    if (initialConfig?.mode || initialConfig?.theme || initialConfig?.durationMinutes || initialConfig?.perPuzzleSeconds) {
      const mostRecent = getMostRecentConfig()
      return {
        mode: initialConfig.mode || mostRecent.mode,
        theme: initialConfig.theme || mostRecent.theme,
        durationMinutes: initialConfig.durationMinutes || mostRecent.durationMinutes,
        perPuzzleSeconds: initialConfig.perPuzzleSeconds || mostRecent.perPuzzleSeconds
      }
    }
    return getMostRecentConfig()
  })
  
  const [previousConfigs, setPreviousConfigs] = useState<Array<{
    eloType: string
    config: CustomSprintConfig
    elo: number
    updatedAt: string
  }>>([])

  // Extract previous custom sprint configurations from user's ELO data
  useEffect(() => {
    if (!user?.elos) return

    const customConfigs: Array<{
      eloType: string
      config: CustomSprintConfig
      elo: number
      updatedAt: string
    }> = []

    user.elos.forEach((eloRecord) => {
      const eloType = eloRecord.elo_type

      // Skip standard predefined types and default Arrow Duel
      if (eloType === 'mixed 5/20' || eloType === 'mixed 5/10' || eloType === getArrowDuelEloType()) return

      // Parse custom ELO types
      const match = eloType.match(/^(.+)\s+(\d+)\/(\d+)$/)
      if (match) {
        const [, theme, duration, perPuzzle] = match
        const durationNum = parseInt(duration, 10)
        const perPuzzleNum = parseInt(perPuzzle, 10)

        // Determine mode
        const isArrowDuel = theme === 'arrowduel'
        
        // For arrow duel, we don't validate theme since it's not used
        // For regular mode, validate theme
        const isValidConfig = isArrowDuel 
          ? (VALID_SPRINT_DURATIONS.includes(durationNum as any) &&
             VALID_PER_PUZZLE_TIMES.includes(perPuzzleNum as any))
          : (VALID_THEMES.includes(theme as any) &&
             VALID_SPRINT_DURATIONS.includes(durationNum as any) &&
             VALID_PER_PUZZLE_TIMES.includes(perPuzzleNum as any))
        
        if (isValidConfig) {
          customConfigs.push({
            eloType,
            config: {
              mode: isArrowDuel ? 'arrowduel' : 'regular',
              theme: isArrowDuel ? 'mixed' : theme, // Default to mixed for arrow duel
              durationMinutes: durationNum,
              perPuzzleSeconds: perPuzzleNum
            },
            elo: eloRecord.rating,
            updatedAt: eloRecord.updated_at
          })
        }
      }
    })

    // Sort by last activity (most recent first)
    customConfigs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    setPreviousConfigs(customConfigs)
  }, [user])

  const validation = validateCustomSprintConfig(
    config.theme, 
    config.durationMinutes, 
    config.perPuzzleSeconds
  )
  
  const targetPuzzles = calculateTargetPuzzles(config.durationMinutes, config.perPuzzleSeconds)
  const eloType = config.mode === 'arrowduel' 
    ? `arrowduel ${config.durationMinutes}/${config.perPuzzleSeconds}`
    : getCustomEloType(config.theme, config.durationMinutes, config.perPuzzleSeconds)

  const handleStartSprint = () => {
    if (validation.isValid) {
      onStartSprint(eloType, config.mode)
    }
  }

  const handleLoadPreviousConfig = (previousConfig: CustomSprintConfig) => {
    setConfig(previousConfig)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">Custom Sprint</h1>
            <p className="text-sm sm:text-base text-slate-500 mt-1">Create your personalized puzzle sprint</p>
          </div>
          <Button variant="outline" className="self-start sm:self-auto bg-white border-slate-200 text-slate-700 hover:bg-slate-50" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                <Settings className="h-4 w-4 text-blue-600" />
                <span>Sprint Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Selection */}
              <div className="space-y-2">
                <Label htmlFor="mode">Puzzle Mode</Label>
                <Select
                  value={config.mode}
                  onValueChange={(value: 'regular' | 'arrowduel') => setConfig(prev => ({ 
                    ...prev, 
                    mode: value,
                    // Set theme to 'mixed' when switching to arrow duel mode (theme won't be used)
                    theme: value === 'arrowduel' ? 'mixed' : prev.theme
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular Puzzles</SelectItem>
                    <SelectItem value="arrowduel">Arrow Duel</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600">
                  {config.mode === 'arrowduel' 
                    ? 'Choose the best move between two candidates' 
                    : 'Solve tactical puzzles by finding the best moves'}
                </p>
              </div>

              {/* Theme Selection - Only show for regular mode */}
              {config.mode === 'regular' && (
                <div className="space-y-2">
                  <Label htmlFor="theme">Puzzle Theme</Label>
                  <Select
                    value={config.theme}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, theme: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_THEMES.map(theme => (
                        <SelectItem key={theme} value={theme}>
                          {getThemeDisplayName(theme)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Arrow Duel Info - Show when arrow duel is selected */}
              {config.mode === 'arrowduel' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Arrow Duel Mode</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    Arrow Duel uses mixed tactical puzzles and automatically selects the best positions for choice-based training.
                  </p>
                </div>
              )}

              {/* Sprint Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Sprint Duration (minutes)</Label>
                <Select
                  value={config.durationMinutes.toString()}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, durationMinutes: parseInt(value, 10) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_SPRINT_DURATIONS.map(duration => (
                      <SelectItem key={duration} value={duration.toString()}>
                        {duration} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Per-Puzzle Time */}
              <div className="space-y-2">
                <Label htmlFor="perPuzzle">Time per Puzzle (seconds)</Label>
                <Select
                  value={config.perPuzzleSeconds.toString()}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, perPuzzleSeconds: parseInt(value, 10) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time per puzzle" />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_PER_PUZZLE_TIMES.map(time => (
                      <SelectItem key={time} value={time.toString()}>
                        {time} seconds
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Configuration Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-gray-900">Sprint Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-gray-500" />
                    <span>{targetPuzzles} puzzles</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>{config.durationMinutes}m / {config.perPuzzleSeconds}s</span>
                  </div>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Mode: {config.mode === 'arrowduel' ? 'Arrow Duel' : 'Regular Puzzles'}</div>
                  {config.mode === 'regular' && (
                    <div>Theme: {getThemeDisplayName(config.theme)}</div>
                  )}
                  <div>ELO Type: {eloType}</div>
                </div>
              </div>

              {/* Validation Error */}
              {!validation.isValid && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{validation.error}</p>
                </div>
              )}

              {/* Start Button */}
              <Button 
                onClick={handleStartSprint}
                disabled={!validation.isValid}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Custom Sprint
              </Button>
            </CardContent>
          </Card>

          {/* Previous Configurations */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
                <Zap className="h-4 w-4 text-blue-600" />
                <span>Previous Custom Sprints</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previousConfigs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Target className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">No previous custom sprints found</p>
                  <p className="text-xs text-slate-500 mt-1">Create your first custom sprint on the left.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {previousConfigs.map(({ eloType, config: prevConfig, elo, updatedAt }) => (
                    <div
                      key={eloType}
                      className="py-3.5 first:pt-0 last:pb-0 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 shadow-none">
                            {prevConfig.mode === 'arrowduel' ? 'Arrow Duel' : 'Regular'}
                          </Badge>
                          {prevConfig.mode === 'regular' && (
                            <span className="text-sm font-medium text-slate-900">
                              {getThemeDisplayName(prevConfig.theme)}
                            </span>
                          )}
                          <span className="text-sm text-slate-500 tabular-nums">
                            {prevConfig.durationMinutes}m / {prevConfig.perPuzzleSeconds}s
                          </span>
                        </div>
                        <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700 font-medium tabular-nums shrink-0">
                          Elo: {elo}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                          <span>{calculateTargetPuzzles(prevConfig.durationMinutes, prevConfig.perPuzzleSeconds)} puzzles</span>
                          <span className="text-slate-300">·</span>
                          <span>Last played: {new Date(updatedAt).toLocaleDateString()}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-200 text-slate-700 hover:bg-slate-50"
                          onClick={() => handleLoadPreviousConfig(prevConfig)}
                        >
                          Load Config
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
