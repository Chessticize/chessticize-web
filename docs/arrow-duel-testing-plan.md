# Arrow Duel Testing Plan

## Overview
This document outlines the comprehensive testing strategy for the Arrow Duel system, focusing on the puzzle preparation pipeline and Stockfish-based filtering.

## Testing Architecture

### 1. Puzzle Preparation Pipeline
The `getNextArrowDuelPuzzles()` function should perform three key steps:

#### Step 1: Download Puzzles
- **Function**: Regular puzzle download (existing functionality)
- **Test Focus**: Ensure puzzle data integrity and format consistency

#### Step 2: Stockfish Filtering & Candidate Generation
- **Function**: `ArrowDuelFilter.filterPuzzles()`
- **Key Logic**: 
  - Analyze initial position with Stockfish
  - Identify best move vs puzzle's first move (blunder)
  - Generate candidate pair: [bestMove, blunderMove]
  - **Acceptance Criteria**: Only accept if making the correct move results in equal or better position (≤1.0 eval point advantage for opponent)

#### Step 3: Puzzle Validation
- **Function**: Validate legal moves and proper arrow-duel format
- **Output**: Array of `ArrowDuelPuzzle` objects ready for gameplay

## Critical Testing Areas

### A. Stockfish Filter Unit Tests

#### Test 1: Evaluation Threshold Logic
```typescript
// Test Case: Position where blunder loses significant material
const testPosition = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
const blunderMove = 'Qh5' // Hangs queen
const expectedBestMove = 'Nf3' // Develops normally

// Expected: Evaluation difference > 1.0 points, should be accepted
```

#### Test 2: Close Evaluation Rejection
```typescript
// Test Case: Position where both moves are roughly equal
const testPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const move1 = 'e2e4'
const move2 = 'e2e3'

// Expected: Evaluation difference < 1.0 points, should be rejected
```

#### Test 3: Engine Timeout Handling
```typescript
// Test Case: Verify timeout mechanisms work
const complexPosition = '8/8/8/8/8/8/8/8 w - - 0 1' // Invalid position
// Expected: Should timeout gracefully and return null
```

### B. Integration Tests

#### Test 4: End-to-End Pipeline
```typescript
// Test the complete getNextArrowDuelPuzzles() flow:
// 1. Mock API response with regular puzzles
// 2. Run through Stockfish filter
// 3. Verify output format and candidate moves
// 4. Ensure evaluation differences meet threshold
```

#### Test 5: Performance Under Load
```typescript
// Test filtering 50+ puzzles simultaneously
// Verify timeout protection works
// Check memory usage and cleanup
```

### C. Edge Case Testing

#### Test 6: Illegal Move Handling
- Positions where Stockfish suggests illegal moves
- Malformed puzzle data
- Empty or null puzzle arrays

#### Test 7: Engine State Management
- Multiple concurrent filtering operations
- Engine restart scenarios
- Memory leak prevention

## Test Data Requirements

### Sample Positions for Testing

1. **Clear Blunder Position**
   ```
   FEN: r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3
   Blunder: Bxf7+ (wins material)
   Best: Nf3 (normal development)
   Expected: Accept (large eval difference)
   ```

2. **Marginal Difference Position**
   ```
   FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
   Move1: e2e4 (0.3 advantage)
   Move2: d2d4 (0.2 advantage)
   Expected: Reject (small eval difference)
   ```

3. **Tactical Position**
   ```
   FEN: r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4
   Blunder: Nd5 (hangs knight)
   Best: O-O (castles safely)
   Expected: Accept (material difference)
   ```

## Validation Criteria

### Evaluation Threshold
- **Current Setting**: 250 centipawns (2.5 pawns)
- **User Requirement**: 100 centipawns (1.0 pawn)
- **Action Required**: Update `EVALUATION_THRESHOLD` constant

### Performance Requirements
- Maximum 5 seconds per puzzle analysis
- Handle 20+ puzzles in parallel
- Memory usage under 100MB during filtering
- 95% success rate for valid positions

## Test Implementation Structure

```
__tests__/
├── arrow-duel/
│   ├── stockfish-filter.test.ts     # Core filtering logic
│   ├── evaluation-threshold.test.ts  # Threshold validation
│   ├── puzzle-pipeline.test.ts      # End-to-end pipeline
│   ├── performance.test.ts          # Load and timeout tests
│   └── edge-cases.test.ts           # Error handling tests
└── fixtures/
    ├── test-positions.ts            # Sample chess positions
    ├── mock-puzzles.ts              # Mock puzzle data
    └── stockfish-responses.ts       # Expected engine outputs
```

## Success Metrics

1. **Unit Tests**: 100% pass rate for individual filter functions
2. **Integration Tests**: Pipeline produces valid arrow-duel puzzles
3. **Performance Tests**: Meets timeout and memory requirements
4. **User Acceptance**: Generated puzzles provide meaningful choices

## Next Steps

1. ✅ Create this testing plan
2. 🔄 Analyze current `getNextArrowDuelPuzzles()` implementation
3. 🔄 Implement Stockfish filter unit tests
4. 🔄 Verify and update evaluation threshold (2.5 → 1.0 pawns)
5. 🔄 Create comprehensive test suite
6. 🔄 Performance testing and optimization

## Notes

- Tests should use deterministic positions to ensure consistent results
- Mock Stockfish responses for faster unit testing
- Include both positive and negative test cases
- Verify thread safety for concurrent operations
- Test memory cleanup after filtering operations