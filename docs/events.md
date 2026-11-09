# Event System

The event system provides a flexible way to track user activities and statistics. Events are stored with client-generated UUID IDs that act as idempotency keys, ensuring that duplicate events are not created.

## Architecture

### Components

1. **Event Model** (`internal/models/event.go`): Defines the event structure with flexible JSON data storage
2. **Event Repository** (`internal/repository/event_repository.go`): Handles database operations with built-in idempotency
3. **Event Service** (`internal/service/event_service.go`): Provides business logic and convenience methods for creating events
4. **Event API** (`internal/api/event_handlers.go`): User-facing endpoints for viewing events (read-only)

### Event Types

The system supports the following event types:

- **Sign-in**: User authentication events
- **Game Review**: Start/end events for game analysis sessions
- **Puzzle Sprint**: Start/end events for puzzle solving sessions
- **Puzzle**: Individual puzzle completion events

## Usage

### For Internal APIs (Recommended)

Other APIs should use the EventService to post events directly to the repository:

```go
// Initialize the event service
eventService := service.NewEventService(eventRepo)

// Create a sign-in event
err := eventService.CreateSignInEvent(ctx, userID, models.SignInEventData{
    UserAgent: "Mozilla/5.0...",
})

// Create a game review start event
err := eventService.CreateGameReviewStartEvent(ctx, userID, gameID)

// Create a game review end event (with duration)
err := eventService.CreateGameReviewEndEvent(ctx, userID, gameID, 300) // 5 minutes

// Create a puzzle event
err := eventService.CreatePuzzleEvent(ctx, userID, models.PuzzleEventData{
    PuzzleID:     "puzzle-123",
    Theme:        models.OpponentMistakeCaught,
    Solved:       true,
    TimeSpent:    45,
    MovesPlayed:  3,
    Difficulty:   stringPtr("1200"),
})

// Create an event with custom ID for idempotency
customID := uuid.New().String()
err := eventService.CreateEventWithCustomID(ctx, customID, userID, 
    models.EventTypeSignIn, nil, json.RawMessage(`{"custom":"data"}`))
```

### Event Data Structures

Each event type has its own data structure:

```go
// Sign-in events
type SignInEventData struct {
    Succeeded  bool   `json:"succeeded"`            // Whether the sign-in attempt succeeded
    SignInType string `json:"sign_in_type"`         // "password" or "session_token"
    UserAgent  string `json:"user_agent,omitempty"` // User agent string
}

// Game review events
type GameReviewEventData struct {
    GameID   string `json:"game_id"`
    Duration *int   `json:"duration,omitempty"` // Duration in seconds (for end events)
}

// Puzzle sprint events
type PuzzleSprintEventData struct {
    SprintID         string       `json:"sprint_id"`
    Status           SprintStatus `json:"status,omitempty"`            // Final status of the sprint (for end events)
    Duration         *int         `json:"duration,omitempty"`          // Duration in seconds (for end events)
    SucceededPuzzles *int         `json:"succeeded_puzzles,omitempty"` // Number of puzzles solved successfully (for end events)
    FailedPuzzles    *int         `json:"failed_puzzles,omitempty"`    // Number of puzzles failed (for end events)
    EloType          string       `json:"elo_type,omitempty"`          // Type of ELO rating affected (for end events)
    EloChange        *int         `json:"elo_change,omitempty"`        // ELO rating change, e.g., +8 or -8 (for end events)
}

// Individual puzzle events
type PuzzleEventData struct {
    PuzzleID    string     `json:"puzzle_id"`
    PuzzleType  PuzzleType `json:"puzzle_type"`           // Type/source of the puzzle ("user" or "lichess")
    Solved      bool       `json:"solved"`
    TimeSpent   int        `json:"time_spent"`            // Time spent in seconds
    MovesPlayed []string   `json:"moves_played"`          // Actual moves made
    IsDisliked  *bool      `json:"is_disliked,omitempty"` // Optional: whether user dislikes this puzzle
}
```

### User-Facing API

Users can view their events through the API:

```bash
# Get user's own events (paginated)
GET /api/v1/users/me/events?offset=0&limit=50&event_types=sign_in&start_time=2023-01-01T00:00:00Z
```

**Note**: Individual event lookup by ID is currently not implemented in the API.

## Idempotency

The event system uses client-generated UUIDs as primary keys to ensure idempotency:

- Each event must have a unique ID provided by the client
- If an event with the same ID already exists, the creation will fail with `ErrEventAlreadyExists`
- This prevents duplicate events from being created due to retries or network issues

## Database Schema

```sql
CREATE TABLE events (
    id VARCHAR(36) PRIMARY KEY,           -- UUID acting as idempotency key
    user_id VARCHAR(36) NOT NULL,        -- Foreign key to users table
    event_type VARCHAR(50) NOT NULL,     -- Type of event (enum)
    event_sub_type VARCHAR(50),          -- Optional sub-type (start/end)
    event_data JSONB,                    -- Flexible JSON data
    event_time TIMESTAMP NOT NULL,       -- When the event occurred
    created_at TIMESTAMP NOT NULL,       -- When the record was created
    updated_at TIMESTAMP NOT NULL,       -- When the record was last updated
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_time ON events(event_time);
CREATE INDEX idx_events_created_at ON events(created_at);
```

## Testing

The event system includes comprehensive tests:

- Repository tests with both SQLite (fake) and PostgreSQL (real) implementations
- Service tests covering all event creation methods
- Idempotency testing to ensure duplicate prevention works correctly

Run tests with:

```bash
# Run all event-related tests
go test ./internal/repository/testing -run TestEventRepository
go test ./internal/service -run TestEventService

# Run comprehensive verification
make verify
```

## Future Extensions

The flexible JSON data storage allows for easy extension of event types and data structures without database schema changes. New event types can be added by:

1. Adding new constants to the `EventType` enum
2. Creating corresponding data structures
3. Adding convenience methods to the EventService
4. Updating API documentation

## Security Considerations

- Events contain user activity data and should be treated as sensitive information
- Access to events is restricted to the user who created them (or admins)
- Event IDs are UUIDs which are not easily guessable
- All event API endpoints require authentication
