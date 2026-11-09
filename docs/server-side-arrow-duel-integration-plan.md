# Server-Side Arrow Duel Integration Plan

## Overview

This document outlines the plan to integrate with the new server-side Arrow Duel API, replacing the current client-side Stockfish filtering approach. The new API automatically filters puzzles and provides the `best_move` field, eliminating the need for client-side Stockfish analysis.

## Key Changes from Current Implementation

### Current Implementation (Client-Side)
- Uses client-side Stockfish engine for puzzle filtering
- Analyzes each puzzle position to find suitable Arrow Duel candidates
- Calculates evaluation differences on the frontend
- Requires `ArrowDuelFilter` class and complex filtering logic

### New Implementation (Server-Side)
- Server automatically filters puzzles for Arrow Duel suitability
- Server provides `best_move` field in puzzle response
- No client-side Stockfish analysis required
- Simplified frontend logic

## API Changes

### New Puzzle Response Format

The `/api/v1/users/me/sprint/{sessionId}/next-puzzles` endpoint now returns:

```json
{
  "puzzles": [
    {
      "puzzle_id": "puzzle123",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "solution_moves": ["e2e4", "e7e5"],
      "rating": 1500,
      "themes": ["opening", "tactics"],
      "sequence_in_sprint": 1,
      "attempt_type": "arrow_duel",
      "best_move_eval": 45.5,
      "best_move": "e2e4",
      "position_eval_after_first_move": -280.0
    }
  ]
}
```

### New Fields for Arrow Duel
- `attempt_type`: "arrow_duel" for Arrow Duel puzzles
- `best_move_eval`: Stockfish evaluation of the best move (centipawns)
- `best_move`: Best move in UCI notation (e.g., "e2e4")
- `position_eval_after_first_move`: Evaluation after the puzzle's first move

## Implementation Plan

### Phase 1: Update Data Structures

#### 1.1 Update SprintPuzzle Interface
**File**: `hooks/useSprintApi.ts`

```typescript
export interface SprintPuzzle {
  puzzle_id: string
  fen: string
  solution_moves: string[]
  rating: number
  themes: string[]
  sequence_in_sprint: number
  // New Arrow Duel fields from server
  attempt_type?: 'regular' | 'arrow_duel'
  best_move_eval?: number
  best_move?: string
  position_eval_after_first_move?: number
}
```

### Phase 2: Replace Client-Side Filtering with Server Processing

#### 2.1 Update getNextArrowDuelPuzzles Function
**File**: `hooks/useSprintApi.ts`

Replace the current client-side filtering logic with server-side processing:

```typescript
// Internal function for Arrow Duel puzzles (server-side filtering)
const getNextArrowDuelPuzzles = useCallback(async (
  sessionId: string,
  targetCount: number,
  abortSignal?: AbortSignal
): Promise<NextPuzzlesResponse | null> => {
  console.log(`🎯 Arrow Duel: Requesting ${targetCount} puzzles from server`)
  
  // Request puzzles from server - server handles Arrow Duel filtering
  const response = await getNextLichessPuzzles(sessionId, targetCount, abortSignal)
  if (!response || abortSignal?.aborted) return null

  // Process server response to convert to ArrowDuelPuzzle format
  const arrowDuelPuzzles = response.puzzles
    .filter(puzzle => puzzle.attempt_type === 'arrow_duel')
    .map(puzzle => ({
      ...puzzle,
      // Add computed fields for UI compatibility
      bestMove: puzzle.best_move!,
      blunderMove: puzzle.solution_moves[0],
      evaluationDiff: (puzzle.best_move_eval || 0) - (puzzle.position_eval_after_first_move || 0),
      candidateMoves: [puzzle.solution_moves[0], puzzle.best_move!] as [string, string],
      // Debugging info (optional)
      bestMoveEval: puzzle.best_move_eval || 0,
      blunderMoveEval: puzzle.position_eval_after_first_move || 0,
      initialEval: puzzle.best_move_eval || 0,
      analysisDepth: 12 // Server-side analysis depth
    }))

  console.log(`✅ Arrow Duel: Received ${arrowDuelPuzzles.length} puzzles from server`)
  
  return {
    puzzles: arrowDuelPuzzles
  }
}, [getNextLichessPuzzles])
```

#### 2.2 Remove ArrowDuelFilter Class
**Files to Delete**:
- `lib/arrow-duel-filter.ts` - Remove entire file (no longer needed)

### Phase 3: No Changes Required

**Analysis**: The downstream components (SprintSession, ChessBoard) already work with the `ArrowDuelPuzzle` interface and don't need any changes because:

1. **SprintSession** receives `ArrowDuelPuzzle[]` from `getNextArrowDuelPuzzles` and uses them directly
2. **ChessBoard** receives `candidateMoves` prop which is already provided by `ArrowDuelPuzzle`
3. **Result submission** already handles Arrow Duel format correctly

The existing `ArrowDuelPuzzle` interface already has all required fields:
- `candidateMoves: [string, string]` - [blunder, correct]
- `bestMove: string` - Stockfish best move  
- `blunderMove: string` - Puzzle solution move
- `evaluationDiff: number` - Difference in centipawns

## File Changes Summary

### Files to Delete
1. `lib/arrow-duel-filter.ts` - Entire file (client-side filtering no longer needed)

### Files to Modify

#### 1. `hooks/useSprintApi.ts`
- Update `SprintPuzzle` interface with new Arrow Duel fields from server
- Replace `getNextArrowDuelPuzzles` implementation to use server-side filtering
- Keep existing function signature for backward compatibility
- No changes needed to `getNextPuzzles` function

#### 2. No Changes Required
- `components/puzzle-sprint/SprintSession.tsx` - Already works with `ArrowDuelPuzzle` interface
- `components/puzzle-sprint/ChessBoard.tsx` - Already receives `candidateMoves` prop
- `lib/sprint-config.ts` - Keep existing Arrow Duel configuration
- All other components - No changes needed

### Key Insight
The existing `ArrowDuelPuzzle` interface already provides all the fields needed by the UI components:
- `candidateMoves: [string, string]` - Used by ChessBoard for arrow display
- `bestMove: string` - Used for move validation
- `blunderMove: string` - Used for move validation  
- `evaluationDiff: number` - Used for debugging/logging

## Migration Strategy

### Step 1: Backward Compatibility
1. Keep existing interfaces but mark deprecated fields
2. Add new fields alongside old ones
3. Update components to handle both formats

### Step 2: Gradual Migration
1. Update data structures
2. Remove client-side filtering
3. Update UI components
4. Test thoroughly

### Step 3: Cleanup
1. Remove deprecated code
2. Remove unused dependencies (Stockfish)
3. Update documentation

## Testing Strategy

### Unit Tests
1. Test new data structures
2. Test puzzle processing logic
3. Test result submission format

### Integration Tests
1. Test Arrow Duel sprint flow
2. Test server response parsing
3. Test UI interactions

### Manual Testing
1. Test Arrow Duel puzzle display
2. Test move selection and feedback
3. Test result submission
4. Test error handling

## Benefits of Server-Side Implementation

### Performance
- No client-side Stockfish analysis
- Faster puzzle loading
- Reduced client-side computation

### Reliability
- Server-side filtering ensures consistency
- No client-side engine initialization issues
- Better error handling

### Maintainability
- Simpler frontend code
- Centralized filtering logic
- Easier to update filtering criteria

### User Experience
- Faster puzzle loading
- No client-side processing delays
- Consistent puzzle quality

## Risk Mitigation

### Backward Compatibility
- Keep existing interfaces during transition
- Gradual migration approach
- Fallback to old implementation if needed

### Error Handling
- Handle missing Arrow Duel fields gracefully
- Provide fallback for server errors
- Clear error messages for users

### Testing
- Comprehensive testing of new API integration
- Test both regular and Arrow Duel modes
- Verify result submission format

## Timeline

### Week 1: Core Implementation
- Update `SprintPuzzle` interface with new server fields
- Replace `getNextArrowDuelPuzzles` implementation to use server-side filtering
- Remove `ArrowDuelFilter` class
- Test server integration

### Week 2: Testing and Validation
- Comprehensive testing of Arrow Duel flow
- Verify server response parsing
- Test UI interactions
- Performance validation

### Week 3: Cleanup and Documentation
- Remove unused dependencies (Stockfish)
- Update documentation
- Final testing and bug fixes

## Conclusion

This plan provides a clear path to integrate with the new server-side Arrow Duel API while maintaining backward compatibility and ensuring a smooth user experience. The server-side approach will provide better performance, reliability, and maintainability compared to the current client-side implementation. 