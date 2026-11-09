# Sprint Session Logic Review

## Issue Summary

The user experienced a sprint ending prematurely with incorrect success count:
- **Expected**: Sprint should continue until 10 successful puzzle solves, then show success
- **Actual**: Sprint ended after 1 mistake + 9 successes, showing "Sprint Failed" with 1 mistake + 8 successes

## Root Cause Analysis

### 1. Client-Side Logic Issue

**Problem**: The client-side sprint ending logic had a critical flaw in the mistake counting and sprint termination logic.

**Location**: `components/puzzle-sprint/SprintSession.tsx`, lines 296-318

```typescript
if (!success && newMistakeCount >= 3) {
  // Handle sprint failure due to too many mistakes
  console.log('💀 Too many mistakes! Sprint failed.')

  // Add the attempt result before failing
  if (attempt) {
    updateSprintState(draft => {
      draft.pendingResults.push(attempt!)
      draft.mistakeCount = newMistakeCount
    })

    // Schedule result submission
    if (resultSubmissionRef.current) {
      clearTimeout(resultSubmissionRef.current)
    }
    resultSubmissionRef.current = setTimeout(() => {
      submitPendingResults()
    }, 1000)
  }

  handleSprintFailed('mistakes')
  return
}
```

**Issue**: The condition `newMistakeCount >= 3` should be `newMistakeCount > 3` or the max mistakes should be 3, not 2.

### 2. Server-Side Configuration Mismatch

**Location**: `internal/models/sprint.go`, line 15
```go
MaxMistakes      int          `gorm:"not null;default:2" json:"max_mistakes"`
```

**Location**: `internal/service/sprint_service.go`, lines 217-218
```go
if sprint.MistakesMade > sprint.MaxMistakes {
    finalStatus = models.SprintStatusCompletedFailMistakes
```

The server correctly uses `>` (greater than), meaning 3 mistakes would fail a sprint with `MaxMistakes = 2`.

### 3. Client-Server Logic Inconsistency

- **Server Logic**: `MistakesMade > MaxMistakes` (correct - allows 0, 1, 2 mistakes before failing on the 3rd)
- **Client Logic**: `newMistakeCount >= 3` (incorrect - should be `>= MaxMistakes + 1` or `> MaxMistakes`)

### 4. Success Count Discrepancy

**Location**: `components/puzzle-sprint/SprintSession.tsx`, lines 324-330

The client logs show:
```typescript
console.log('📋 Sprint progress:', {
  puzzlesSolved: nextIndex,  // This is puzzleIndex + 1
  targetPuzzles: sprintState.targetPuzzles,
  mistakeCount: newMistakeCount,
  timeRemaining: timeRemaining,
  nextPuzzle: nextPuzzle ? { id: nextPuzzle.puzzle_id, fen: nextPuzzle.fen } : null
})
```

**Issue**: The `puzzlesSolved` calculation (`nextIndex = puzzleIndex + 1`) represents the number of puzzles **attempted**, not necessarily **solved successfully**. This creates confusion in the logging and potentially in the UI display.

### 5. Race Condition Between Result Submission and Sprint Ending

**Additional Issue Found**: After implementing the initial fixes, a **race condition** was discovered:

- Client correctly detects completion (10 successful solves)
- Client calls `submitPendingResults()` and `endSprint()` concurrently
- Server processes `endSprint()` before final puzzle results are committed
- Result: Server shows 9 puzzles solved instead of 10, causing "Sprint Failed - Time Up"

---

## Implemented Fixes

### 1. ✅ Fixed Client-Side Mistake Threshold

**File**: `components/puzzle-sprint/SprintSession.tsx`
**Lines**: 300-301

**Change**:
```typescript
// Before
if (!success && newMistakeCount >= 3) {

// After
if (!success && newMistakeCount > sprintState.maxMistakes) {
```

**Result**: Now correctly uses server-provided `maxMistakes` value and proper comparison logic.

### 2. ✅ Fixed Success Count Display Logic

**Problem**: The current logic conflated "puzzles attempted" with "puzzles solved successfully".

**Solution**: Added separate `successCount` tracking in sprint state:
- Added `successCount: number` to `SprintState` interface
- Updated all state transitions to track successful solves separately
- Changed sprint completion condition from `nextIndex >= targetPuzzles` to `newSuccessCount >= targetPuzzles`

### 3. ✅ Added MaxMistakes to Client State

**Files**:
- `components/puzzle-sprint/SprintSession.tsx` (lines 20-34)
- `internal/api/sprint_handler.go` (lines 47-53)
- `hooks/useSprintApi.ts` (lines 14-24)

**Changes**:
- Added `maxMistakes` to `SprintState` interface
- Updated server `StartSprintResponse` to include `max_mistakes`
- Updated client TypeScript interface to match
- Initialize `maxMistakes` from server response during sprint setup

### 4. ✅ Improved Logging and UI Display

**Changes**:
- Updated progress logging to clearly show success count vs puzzle index
- Changed UI display from "Puzzle X/Y" to "Success X/Y" for clarity
- Enhanced logging to include both success count and mistake thresholds

### 5. ✅ Fixed Race Condition

**File**: `components/puzzle-sprint/SprintSession.tsx` (lines 342-382)

**Problem**: Final puzzle results and sprint ending happened concurrently, causing server to see incomplete data.

**Solution**: Serialize the final result submission and sprint ending:
```typescript
// Before: Concurrent submission and ending
setTimeout(() => {
  handleSprintCompleted()
}, 0)

// After: Sequential submission then ending
setTimeout(async () => {
  try {
    await submitPendingResults()
    console.log('✅ Final result submitted, now ending sprint...')
    await handleSprintCompleted()
  } catch (err) {
    console.error('❌ Failed to submit final result:', err)
    await handleSprintCompleted() // Still end sprint if submission fails
  }
}, 0)
```

### 6. ✅ Added Server-Side Logging

**Files**:
- `internal/service/puzzle_service.go` (lines 99-151)
- `internal/service/sprint_service.go` (lines 212-222)

**Added comprehensive logging to track**:
- `SubmitPuzzleResults`: Initial/final puzzle counts and processing details
- `EndSprint`: Sprint state when determining final status

## Impact Assessment

**Severity**: High - Causes premature sprint termination and incorrect result display
**User Experience**: Poor - Users lose progress and see confusing failure messages
**Data Integrity**: Medium - Server-side validation prevents data corruption, but client experience is broken

## Testing Recommendations

1. ✅ Test sprint with exactly 3 mistakes to verify fix
2. ✅ Test sprint completion with 10 successful solves
3. ✅ Test mixed scenarios (successes + mistakes under threshold)
4. ✅ Verify server-client result consistency

## Summary

The issue was caused by multiple problems in the sprint session logic:

1. **Mistake Threshold**: Client used hardcoded `>= 3` instead of server's dynamic `> maxMistakes`
2. **Success Counting**: Client conflated puzzle attempts with successful solves
3. **Missing Configuration**: Client didn't receive `maxMistakes` from server
4. **Race Condition**: Final puzzle results and sprint ending happened concurrently

All issues have been resolved with the implemented fixes. The sprint should now:
- Continue until exactly `targetPuzzles` successful solves are achieved
- Only fail when mistakes exceed the server-configured `maxMistakes` threshold
- Display accurate success counts in the UI ("Success X/Y" instead of "Puzzle X/Y")
- Maintain consistency between client and server state
- Properly serialize final result submission before ending the sprint

The race condition fix ensures that the server receives all puzzle results before determining the final sprint status, preventing the "Sprint Failed - Time Up" issue when the user has actually completed the target number of successful solves.