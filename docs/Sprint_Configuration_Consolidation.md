# Sprint Configuration Consolidation

## Overview

This document describes the consolidation of sprint timing configurations that were previously scattered throughout the codebase. All sprint timing parameters are now centralized in a single configuration file for easy tuning.

## Problem

Sprint timing configurations like "5/20", "5/10", "mixed 5/20", etc. were hardcoded in multiple places:

- Frontend React components
- Backend Go services  
- Test files
- Display strings

This made it difficult to tune sprint parameters and keep configurations consistent.

## Solution

### 1. Centralized Configuration File

Created `lib/sprint-config.ts` with all sprint timing configurations:

```typescript
export const SPRINT_TIMINGS = {
  // Standard sprint: 5 minutes total, 20 seconds per puzzle
  STANDARD: {
    duration: 5,      // minutes
    perPuzzle: 20,    // seconds
    eloType: 'mixed 5/20'
  },
  
  // Blitz sprint: 5 minutes total, 10 seconds per puzzle  
  BLITZ: {
    duration: 5,      // minutes
    perPuzzle: 10,    // seconds
    eloType: 'mixed 5/10'
  },
  
  // Theme-specific sprints: 5 minutes total, 20 seconds per puzzle
  THEME: {
    duration: 5,      // minutes
    perPuzzle: 20,    // seconds
    getEloType: (theme: string) => `${theme} 5/20`
  }
}
```

### 2. Helper Functions

```typescript
export const getStandardEloType = () => SPRINT_TIMINGS.STANDARD.eloType
export const getBlitzEloType = () => SPRINT_TIMINGS.BLITZ.eloType
export const getThemeEloType = (theme: string) => SPRINT_TIMINGS.THEME.getEloType(theme)
```

### 3. Display Strings

Centralized all UI display strings with dynamic generation based on timing configurations.

## Changes Made

### Frontend Files Updated

1. **`app/puzzle-sprint/page.tsx`**
   - Replaced hardcoded "mixed 5/20" and "mixed 5/10" with helper functions
   - Updated display strings to use centralized configuration

2. **`app/puzzle-sprint/sprint/page.tsx`**
   - Replaced hardcoded "mixed 5/20" with `getStandardEloType()`

3. **`app/puzzle-sprint/blitz/page.tsx`**
   - Replaced hardcoded "mixed 5/10" with `getBlitzEloType()`

4. **`app/puzzle-sprint/theme/[theme]/page.tsx`**
   - Replaced hardcoded `${theme} 5/20` with `getThemeEloType(theme)`
   - Updated display strings to use centralized configuration

5. **`components/puzzle-sprint/SprintSession.tsx`**
   - Updated default values to match new standard timing (5 min, 15 puzzles)

### Backend Files Updated

1. **`internal/service/elo_type_service.go`**
   - Updated `DefaultEloType` from "mixed 10/30" to "mixed 5/20"

2. **Test Files**
   - Updated all test expectations to match new default timing
   - `internal/service/elo_type_service_test.go`
   - `internal/service/sprint_service_test.go`
   - `e2e/sprint_test.go`
   - `__tests__/components/puzzle-sprint/SprintSession.test.tsx`

## New Standard Configuration

| Sprint Type | Duration | Per Puzzle | ELO Type | Target Puzzles |
|-------------|----------|------------|----------|----------------|
| **Standard** | 5 min | 20 sec | mixed 5/20 | 15 |
| **Blitz** | 5 min | 10 sec | mixed 5/10 | 30 |
| **Theme** | 5 min | 20 sec | {theme} 5/20 | 15 |

## Benefits

1. **Single Source of Truth**: All timing configurations in one place
2. **Easy Tuning**: Change timing parameters in one file
3. **Consistency**: No more mismatched configurations across files
4. **Type Safety**: TypeScript ensures correct usage
5. **Maintainability**: Clear separation of configuration from logic

## Usage

To change sprint timings in the future:

1. Update values in `lib/sprint-config.ts`
2. All components and services will automatically use the new values
3. Update tests if default calculations change

## Testing

All existing tests have been updated and are passing:
- Frontend component tests
- Backend service tests  
- End-to-end tests

The consolidation maintains backward compatibility while providing a cleaner architecture for future changes.
