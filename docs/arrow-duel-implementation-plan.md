# Arrow Duel Feature Implementation Plan (Frontend Only)

## Overview

Arrow Duel is a new puzzle mode where players choose between two candidate moves: a blunder/mistake move and the correct move. The feature uses client-side Stockfish to generate suitable puzzles on-the-fly by filtering regular puzzles based on evaluation differences.

**Note**: This document covers frontend implementation only. The Go backend has already been implemented.

## Core Concept

1. **Sprint Type**: `arrowduel 5/30` (5 minutes, 30 seconds per puzzle)
2. **Puzzle Selection**: Filter regular puzzles where the best move is significantly better (+2.5 evaluation) than the puzzle's solution move
3. **UI**: Display two arrows - one for the blunder move, one for the correct move
4. **Scoring**: Player chooses which move is correct

## Technical Architecture

### 1. Sprint Configuration Updates

#### File: `lib/sprint-config.ts`
- Add Arrow Duel timing configuration
- Add new sprint mode type
- Update ELO type generation

```typescript
// New configuration
ARROW_DUEL: {
  duration: 5,      // minutes
  perPuzzle: 30,    // seconds (longer for evaluation)
  eloType: 'arrowduel 5/30'
}
```

### 2. Puzzle Filtering System

#### New File: `lib/arrow-duel-filter.ts`
Core filtering logic using Stockfish evaluation:

```typescript
interface ArrowDuelPuzzle extends SprintPuzzle {
  bestMove: string        // Stockfish best move
  blunderMove: string     // Puzzle solution move
  evaluationDiff: number  // Difference in centipawns
  candidateMoves: [string, string] // [blunder, correct]
}

class ArrowDuelFilter {
  async filterPuzzles(puzzles: SprintPuzzle[]): Promise<ArrowDuelPuzzle[]>
  async evaluatePosition(fen: string): Promise<{ bestMove: string, evaluation: number }>
  async getFilteredPuzzles(sessionId: string, targetCount: number): Promise<ArrowDuelPuzzle[]>
}
```

**Filtering Algorithm:**
1. For each puzzle, analyze the initial FEN position with Stockfish
2. Compare Stockfish's best move evaluation vs puzzle solution move evaluation
3. Accept puzzles where `stockfish_eval - puzzle_eval >= 250` centipawns (2.5 pawns)
4. Store both moves as candidates: `[puzzle_solution_move, stockfish_best_move]`

#### Enhanced File: `hooks/useSprintApi.ts`
- Modify `getNextPuzzles()` to handle arrow-duel mode
- Add internal `getNextArrowDuelPuzzles()` function
- Handle retry logic when insufficient puzzles after filtering

### 3. UI Components

#### Reuse Existing: `components/puzzle-sprint/ChessBoard.tsx`
Enhance the existing ChessBoard component to support Arrow Duel mode:

```typescript
interface ChessBoardProps {
  // ... existing props
  mode?: 'puzzle' | 'analysis' | 'arrowduel' // Add arrow duel mode
  candidateMoves?: [string, string] // [blunder, correct] for arrow duel
  onMoveChosen?: (chosenMove: string, isCorrect: boolean) => void // Arrow duel callback
}
```

**Features:**
- Display two arrows on the board for candidate moves
- Different colors for each candidate move
- Click/tap to select a move
- Visual feedback for selection
- Disable interaction after selection

#### Updated File: `components/puzzle-sprint/SprintSession.tsx`
- Detect Arrow Duel sprint type
- Pass arrow duel props to existing ChessBoard
- Handle Arrow Duel specific result submission
- Update puzzle loading logic for filtering

### 4. Data Flow & State Management

#### Sprint State Updates
Modify the existing SprintState interface to support Arrow Duel:

```typescript
interface SprintState {
  // ... existing fields
  currentPuzzle: SprintPuzzle | ArrowDuelPuzzle | null // Union type
  mode?: 'regular' | 'arrowduel' // Add mode field
  currentCandidates?: [string, string] // [blunder, correct] for arrow duel
  chosenMove?: string // For arrow duel
}

interface PuzzleAttemptRequest {
  // ... existing fields
  attempt_type?: string // "regular" or "arrow_duel"
  candidate_moves?: string[] // [blunder, correct] for arrow duel
  chosen_move?: string // For arrow duel
}
```

#### Puzzle Loading Flow
1. **Regular Mode**: `getNextPuzzles(sessionId, count, 'regular')` → display puzzles
2. **Arrow Duel Mode**: `getNextPuzzles(sessionId, count, 'arrowduel')` → internal filtering → display filtered puzzles

### 5. Result Submission

#### Updated API Calls
Following the existing API documentation, Arrow Duel results include:

```typescript
interface PuzzleAttemptRequest {
  // ... existing fields
  attempt_type?: 'regular' | 'arrow_duel'
  candidate_moves?: string[] // [blunder, correct] for arrow duel
  chosen_move?: string // For arrow duel
  was_correct: boolean // true if chosen_move === correct_move (for arrow duel)
}
```

#### File: `hooks/useSprintApi.ts`
- Update `submitResults()` to handle Arrow Duel format
- Include candidate moves and chosen move in submission
- Maintain backward compatibility with regular puzzles

### 6. Performance Considerations

#### Stockfish Integration
- Use existing `useStockfish` hook for evaluations
- Implement evaluation caching to avoid re-analyzing same positions
- Set reasonable depth limit (depth 15) for faster analysis
- Batch process multiple puzzles for efficiency

#### Puzzle Pre-filtering
- Filter puzzles in batches of 20-30
- Request more puzzles from server if filtering yields insufficient results
- Implement retry logic with exponential backoff
- Cache filtered results for session duration

### 7. Implementation Phases

#### Phase 1: Core Infrastructure
1. Update sprint configuration for Arrow Duel mode
2. Implement basic puzzle filtering with Stockfish
3. Enhance existing ChessBoard component for Arrow Duel mode
4. Update SprintSession to detect and handle Arrow Duel mode

#### Phase 2: Puzzle Pipeline
1. Modify `getNextPuzzles()` to handle mode parameter
2. Implement internal `getNextArrowDuelPuzzles()` with filtering
3. Add retry logic for insufficient filtered puzzles
4. Implement evaluation caching
5. Add debugging console logs for filter results

#### Phase 3: UI/UX Polish
1. Design arrow visualization on chess board
2. Add move selection interactions
3. Implement visual feedback for correct/incorrect choices
4. Add loading states during filtering

#### Phase 4: Result Submission
1. Update result submission format for Arrow Duel
2. Implement client-side final count reporting
3. Add proper error handling and retry logic
4. Test end-to-end flow

### 8. Configuration & Tuning

#### Evaluation Threshold
- Start with +2.5 pawns (250 centipawns) difference
- Add console logging to monitor filter success rates
- Make threshold configurable for easy tuning

#### Timing Adjustments
- 30 seconds per puzzle (vs 20 for regular)
- Monitor completion rates and adjust if needed
- Consider different timing for different rating ranges

### 9. Testing Strategy

#### Unit Tests
- Test puzzle filtering logic with known positions
- Test evaluation difference calculations
- Test candidate move selection

#### Integration Tests
- Test full Arrow Duel sprint flow
- Test result submission with proper format
- Test retry logic when filtering fails

#### Manual Testing
- Test with various puzzle types and difficulties
- Verify arrow visualization and interaction
- Test on different devices and screen sizes

### 10. Monitoring & Analytics

#### Debug Logging
```typescript
console.log('Arrow Duel Filter Results:', {
  totalPuzzles: puzzles.length,
  filteredPuzzles: filtered.length,
  filterRate: (filtered.length / puzzles.length * 100).toFixed(1) + '%',
  averageEvalDiff: averageEvalDiff.toFixed(1) + ' centipawns'
})
```

#### Success Metrics
- Filter success rate (target: >50% of puzzles pass filter)
- Average evaluation difference of accepted puzzles
- User completion rates compared to regular sprints
- Time spent per puzzle in Arrow Duel mode

## File Structure

```
lib/
├── arrow-duel-filter.ts          # Core filtering logic
└── sprint-config.ts              # Updated with Arrow Duel config

components/puzzle-sprint/
├── ChessBoard.tsx                # Enhanced for Arrow Duel support
├── SprintSession.tsx             # Updated for Arrow Duel support
└── SprintModeSelector.tsx        # Updated with Arrow Duel option

hooks/
├── useStockfish.ts               # Existing (no changes needed)
├── useSprintApi.ts               # Updated with Arrow Duel support
└── useArrowDuelFilter.ts         # New hook for filtering logic

docs/
└── arrow-duel-implementation-plan.md  # This document
```

## Detailed Implementation Specifications

### Puzzle Filtering Algorithm

```typescript
async function filterPuzzleForArrowDuel(puzzle: SprintPuzzle): Promise<ArrowDuelPuzzle | null> {
  // 1. Analyze initial position
  const stockfishResult = await analyzePosition(puzzle.fen, 15) // depth 15

  // 2. Analyze position after puzzle's first move
  const gameAfterPuzzleMove = new Chess(puzzle.fen)
  gameAfterPuzzleMove.move(puzzle.solution_moves[0])
  const puzzleMoveResult = await analyzePosition(gameAfterPuzzleMove.fen(), 15)

  // 3. Calculate evaluation difference
  const evalDiff = stockfishResult.evaluation - puzzleMoveResult.evaluation

  // 4. Check if difference meets threshold
  if (Math.abs(evalDiff) >= 250) { // 2.5 pawns
    return {
      ...puzzle, // Extend SprintPuzzle
      bestMove: stockfishResult.bestMove,
      blunderMove: puzzle.solution_moves[0],
      evaluationDiff: evalDiff,
      candidateMoves: [puzzle.solution_moves[0], stockfishResult.bestMove] as [string, string]
    }
  }

  return null
}
```

### Enhanced getNextPuzzles Implementation

```typescript
// Modified getNextPuzzles function in useSprintApi.ts
const getNextPuzzles = useCallback(async (
  sessionId: string,
  count: number = 10,
  mode: 'regular' | 'arrowduel' = 'regular',
  abortSignal?: AbortSignal,
): Promise<NextPuzzlesResponse | null> => {
  if (mode === 'arrowduel') {
    return await getNextArrowDuelPuzzles(sessionId, count, abortSignal)
  } else {
    return await getNextLichessPuzzles(sessionId, count, abortSignal)
  }
}, [])

// Internal function for arrow duel puzzles
async function getNextArrowDuelPuzzles(
  sessionId: string,
  targetCount: number,
  abortSignal?: AbortSignal
): Promise<NextPuzzlesResponse | null> {
  const filtered: ArrowDuelPuzzle[] = []
  let attempts = 0
  const maxAttempts = 5

  while (filtered.length < targetCount && attempts < maxAttempts) {
    // Request more puzzles than needed to account for filtering
    const requestCount = Math.max(targetCount * 3, 30)
    const response = await getNextLichessPuzzles(sessionId, requestCount, abortSignal)

    if (!response) return null

    // Filter puzzles in parallel for better performance
    const filterPromises = response.puzzles.map(puzzle => filterPuzzleForArrowDuel(puzzle))
    const results = await Promise.all(filterPromises)

    // Add successful filters
    results.forEach(result => {
      if (result && filtered.length < targetCount) {
        filtered.push(result)
      }
    })

    attempts++

    console.log(`Arrow Duel Filter Attempt ${attempts}:`, {
      requested: requestCount,
      received: response.puzzles.length,
      filtered: results.filter(r => r !== null).length,
      totalFiltered: filtered.length,
      target: targetCount,
      filterRate: ((results.filter(r => r !== null).length / response.puzzles.length) * 100).toFixed(1) + '%'
    })
  }

  return { puzzles: filtered.slice(0, targetCount) }
}
```

### API Integration Details

#### Result Submission Format
Based on the API documentation, Arrow Duel results follow this exact format:

```typescript
// Example successful Arrow Duel submission
{
  "puzzle_id": "abc123",
  "sequence_in_sprint": 1,
  "user_moves": ["Nxe5"], // The chosen move
  "was_correct": true,
  "time_taken_ms": 25000,
  "attempted_at": "2024-01-01T12:00:00Z",
  "attempt_type": "arrow_duel",
  "candidate_moves": ["Nxd4", "Nxe5"], // [blunder, correct]
  "chosen_move": "Nxe5"
}

// Example failed Arrow Duel submission
{
  "puzzle_id": "def456",
  "sequence_in_sprint": 2,
  "user_moves": ["Qh4"], // The chosen move
  "was_correct": false,
  "time_taken_ms": 20000,
  "attempted_at": "2024-01-01T12:00:30Z",
  "attempt_type": "arrow_duel",
  "candidate_moves": ["Qh4", "Qh5"], // [blunder, correct]
  "chosen_move": "Qh4" // Chose the blunder
}
```

#### Final Count Reporting
Utilize the existing final count reporting feature:

```typescript
// When ending Arrow Duel sprint
await endSprint(sessionId, {
  puzzles_solved: clientSolvedCount,
  mistakes_made: clientMistakeCount
})
```

### Sprint Configuration Integration

#### Update sprint-config.ts
```typescript
// Add to SPRINT_TIMINGS
ARROW_DUEL: {
  duration: 5,      // minutes
  perPuzzle: 30,    // seconds (longer for evaluation)
  eloType: 'arrowduel 5/30'
}

// Add to SPRINT_DISPLAY
ARROW_DUEL: {
  name: 'Arrow Duel',
  description: '5 min / 30 sec • Choose the best move between two candidates.',
  shortDescription: '5 min / 30 sec'
}

// Update getEloTypeForMode
export function getEloTypeForMode(mode: 'standard' | 'blitz' | 'theme' | 'arrowduel'): string {
  switch (mode) {
    case 'arrowduel':
      return getArrowDuelEloType()
    // ... existing cases
  }
}

export function getArrowDuelEloType(): string {
  return SPRINT_TIMINGS.ARROW_DUEL.eloType
}
```

### Error Handling & Fallbacks

```typescript
class ArrowDuelFilter {
  private evaluationCache = new Map<string, number>()

  async getFilteredPuzzles(sessionId: string, targetCount: number): Promise<ArrowDuelCandidate[]> {
    try {
      const filtered = await getNextArrowDuelPuzzles(sessionId, targetCount)

      if (filtered.length === 0) {
        console.warn('Arrow Duel: No puzzles passed filter, falling back to regular mode')
        // Could fallback to regular puzzles or show error
        throw new Error('No suitable puzzles found for Arrow Duel mode')
      }

      return filtered
    } catch (error) {
      console.error('Arrow Duel filtering failed:', error)
      throw error
    }
  }

  private async analyzeWithCache(fen: string): Promise<{ evaluation: number, bestMove: string }> {
    if (this.evaluationCache.has(fen)) {
      return this.evaluationCache.get(fen)!
    }

    const result = await analyzePosition(fen, 15)
    this.evaluationCache.set(fen, result)
    return result
  }
}
```

## Risk Mitigation

1. **Stockfish Performance**:
   - Implement depth limits (15) and timeouts (10 seconds)
   - Use evaluation caching to avoid duplicate analysis
   - Process puzzles in parallel with Promise.all

2. **Filter Success Rate**:
   - Monitor filter rates with console logging
   - Request 3x more puzzles than needed
   - Implement retry logic with exponential backoff
   - Have fallback to regular puzzles if filtering completely fails

3. **UI Complexity**:
   - Start with simple arrow visualization using react-chessboard arrows
   - Enhance iteratively based on user feedback
   - Ensure mobile responsiveness

4. **Server Load**:
   - All filtering happens client-side using local Stockfish
   - No additional server API calls needed
   - Leverage existing puzzle fetching infrastructure

5. **Evaluation Accuracy**:
   - Use consistent depth (15) for all evaluations
   - Account for position complexity in threshold
   - Log evaluation differences for tuning

This implementation plan provides a comprehensive roadmap for adding Arrow Duel functionality while maintaining compatibility with existing sprint infrastructure and leveraging the robust API already in place.
