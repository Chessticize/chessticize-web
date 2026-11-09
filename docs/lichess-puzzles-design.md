# Lichess Puzzles Design

## Overview

This document describes the implementation of Lichess puzzles support and the improved puzzle statistics system.

## Database Schema

### New Tables

#### `lichess_puzzles`
Global table containing Lichess puzzle database puzzles (shared among all users).

```sql
CREATE TABLE lichess_puzzles (
    id VARCHAR(10) PRIMARY KEY,           -- Lichess puzzle ID (e.g., "00008")
    fen VARCHAR(100) NOT NULL,            -- FEN notation of the position
    moves TEXT[] NOT NULL,                -- Solution moves
    rating INTEGER NOT NULL,              -- Puzzle rating/difficulty
    rating_deviation INTEGER NOT NULL,    -- Rating deviation
    popularity INTEGER NOT NULL,          -- Popularity score
    nb_plays INTEGER NOT NULL,            -- Number of times played
    themes TEXT[] NOT NULL,               -- Puzzle themes (e.g., "mate", "fork")
    game_url VARCHAR(255),                -- URL to the original game
    opening_tags TEXT[],                  -- Opening tags if available
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### `user_lichess_puzzle_stats`
Per-user statistics for Lichess puzzles, including dislike functionality.

```sql
CREATE TABLE user_lichess_puzzle_stats (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    lichess_puzzle_id VARCHAR(10) NOT NULL,
    attempts INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    total_time INTEGER DEFAULT 0,         -- Total time spent in seconds
    average_time FLOAT DEFAULT 0,         -- Average time per attempt
    last_attempt_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_attempt_success BOOLEAN DEFAULT FALSE,
    is_disliked BOOLEAN DEFAULT FALSE,    -- User marked this puzzle as disliked
    disliked_at TIMESTAMP,                -- When the puzzle was disliked
    themes TEXT[],                        -- Cached themes from the puzzle
    rating INTEGER,                       -- Cached rating from the puzzle
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, lichess_puzzle_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lichess_puzzle_id) REFERENCES lichess_puzzles(id) ON DELETE CASCADE
);
```

### Updated Tables

#### `user_puzzle_stats`
Reverted to original design with FK to user-generated puzzles (no puzzle_type field).

```sql
-- Added FK relationship
ALTER TABLE user_puzzle_stats 
ADD CONSTRAINT fk_user_puzzle_stats_puzzle 
FOREIGN KEY (puzzle_id) REFERENCES puzzles(id) ON DELETE CASCADE;
```

## Design Principles

### Separation of Concerns
- **`user_puzzle_stats`**: For user-generated puzzles from their own games
- **`user_lichess_puzzle_stats`**: For Lichess database puzzles (global/shared)

### Benefits of This Approach
1. **Clean separation**: Different puzzle types have different characteristics
2. **Proper foreign keys**: Each stats table references the correct puzzle table
3. **Optimized queries**: No need for puzzle_type filtering
4. **Extensible**: Easy to add more puzzle sources in the future

## Event Processing

The trigger system handles both puzzle types:

```sql
-- In trigger_update_daily_stats()
IF puzzle_type_val = 'lichess' THEN
    -- Update lichess puzzle stats
    PERFORM update_user_lichess_puzzle_stats(...);
ELSE
    -- Update user puzzle stats  
    PERFORM update_user_puzzle_stats(...);
END IF;
```

## Dislike Functionality

### Purpose
Allow users to mark Lichess puzzles as disliked so they won't appear again in puzzle sprints or recommendations.

### Implementation
- `is_disliked` boolean field in `user_lichess_puzzle_stats`
- `disliked_at` timestamp for when the dislike was set
- Index on `is_disliked` for efficient filtering

### Usage in Puzzle Selection
When selecting puzzles for sprints, exclude disliked ones:

```sql
SELECT lp.* FROM lichess_puzzles lp
LEFT JOIN user_lichess_puzzle_stats ulps 
    ON lp.id = ulps.lichess_puzzle_id AND ulps.user_id = ?
WHERE (ulps.is_disliked IS NULL OR ulps.is_disliked = FALSE)
ORDER BY lp.rating;
```

## API Design (Future Implementation)

### Dislike Endpoint
```
POST /api/v1/users/me/lichess-puzzles/{puzzleID}/dislike
Content-Type: application/json

{
  "disliked": true  // or false to remove dislike
}
```

### Repository Pattern
- `ILichessPuzzleRepository`: CRUD operations for Lichess puzzles
- `IUserLichessPuzzleStatsRepository`: Stats and dislike management

## Data Import

Use the provided import tool to populate Lichess puzzles:

```bash
go run cmd/chessticize/populate-lichess-puzzles/main.go testdata/lichess_db_puzzle_samples.csv
```

### Test Data

Sample lichess puzzle data is located in `testdata/lichess_db_puzzle_samples.csv` and includes 9 puzzles with various ratings and themes for testing purposes.

## Migration

The combined migration file `001-user-stats-and-lichess-puzzles.sql` includes:
- All user stats functions and triggers
- Support for both puzzle types in event processing
- Proper handling of Lichess puzzle stats with caching

## Testing

### Unit Tests
All models include comprehensive tests:
- `TestLichessPuzzle`: Basic model functionality
- `TestUserLichessPuzzleStats`: Stats with dislike functionality
- `TestUserPuzzleStats`: Updated user puzzle stats

### End-to-End Tests
The populate script is tested end-to-end:
- `TestLichessPuzzlePopulate`: Tests the complete import process
- `TestLichessPuzzleCSVFormat`: Validates CSV file format

Run e2e tests with:
```bash
RUN_E2E=true go test ./e2e -run TestLichessPuzzle -v
```

## Future Enhancements

1. **Complete Dislike API**: Add the dislike endpoint to the router
2. **Puzzle Recommendations**: Use stats and preferences for better puzzle selection
3. **Difficulty Adaptation**: Adjust puzzle difficulty based on user performance
4. **Theme Filtering**: Allow users to prefer/avoid certain puzzle themes
5. **Bulk Import**: Tools for importing large Lichess puzzle datasets
