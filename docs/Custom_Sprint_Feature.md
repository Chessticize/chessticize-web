# Custom Sprint Feature

## Overview

The Custom Sprint feature allows users to create personalized puzzle sprints with their own configuration of theme, timing, and duration settings. This provides maximum flexibility for targeted training.

## Features

### 1. Custom Configuration Options

- **Theme Selection**: Choose from 25+ valid puzzle themes including:
  - `mixed` (all themes)
  - Tactical themes: `fork`, `pin`, `skewer`, `deflection`, etc.
  - Mate patterns: `mateIn1`, `mateIn2`, `mateIn3`, `mateIn4`
  - Endgame themes: `pawnEndgame`, `promotion`, etc.
  - Advanced tactics: `sacrifice`, `zugzwang`, `interference`, etc.

- **Per-Puzzle Time**: Select from predefined options
  - 5, 10, 15, 20, 30, or 60 seconds per puzzle

- **Sprint Duration**: Choose from specific durations: 3, 5, 10, 15, 20, 25, or 30 minutes

### 2. Previous Custom Sprints

The system automatically tracks and displays previously played custom sprint configurations:
- Shows configurations where the user has established an ELO rating
- Displays ELO rating for each previous configuration
- Allows quick loading of previous configurations
- Sorted by ELO rating (highest first)

### 3. Validation and Feedback

- Real-time validation of configuration parameters
- Automatic calculation of target puzzle count
- Prevention of invalid combinations (e.g., too many puzzles)
- Clear error messages for invalid configurations

## Technical Implementation

### Configuration Validation

```typescript
validateCustomSprintConfig(theme: string, durationMinutes: number, perPuzzleSeconds: number)
```

Validates:
- Theme is in the valid themes list
- Per-puzzle time is one of the allowed values
- Sprint duration is one of the specific allowed values (3, 5, 10, 15, 20, 25, 30 minutes)
- Resulting puzzle count is reasonable (1-100 puzzles)

### ELO Type Generation

Custom sprints generate ELO types in the format: `{theme} {duration}/{perPuzzle}`

Examples:
- `mixed 10/30` - Mixed theme, 10 minutes, 30 seconds per puzzle
- `fork 5/15` - Fork theme, 5 minutes, 15 seconds per puzzle
- `mateIn1 3/10` - Mate in 1 theme, 3 minutes, 10 seconds per puzzle

### Target Puzzle Calculation

```typescript
calculateTargetPuzzles(durationMinutes: number, perPuzzleSeconds: number): number
```

Formula: `Math.floor((durationMinutes * 60) / perPuzzleSeconds)`

## User Interface

### Configuration Panel
- Theme dropdown with display names
- Duration selector (3, 5, 10, 15, 20, 25, 30 minutes)
- Per-puzzle time selector (5, 10, 15, 20, 30, 60 seconds)
- Real-time configuration summary
- Validation feedback
- Start sprint button

### Previous Configurations Panel
- List of previously played custom configurations
- ELO rating display for each configuration
- Quick load functionality
- Empty state when no previous configurations exist

## Usage Flow

1. **Access**: Navigate to `/puzzle-sprint/custom` or click "Custom Sprint" from main sprint page
2. **Configure**: Select theme, duration, and per-puzzle time
3. **Review**: Check the configuration summary and target puzzle count
4. **Previous Configs**: Optionally load a previously played configuration
5. **Start**: Click "Start Custom Sprint" to begin
6. **Play**: Complete the sprint like any other sprint type
7. **Results**: View results and updated ELO rating for the custom configuration

## Benefits

- **Targeted Training**: Focus on specific weaknesses or themes
- **Flexible Timing**: Adapt to available time and skill level
- **Progress Tracking**: Separate ELO ratings for different configurations
- **Personalization**: Create training routines that match individual needs
- **Repeatability**: Easily replay successful configurations

## Examples

### Quick Practice Session
- Theme: Mixed
- Duration: 3 minutes
- Per-puzzle: 10 seconds
- Result: 18 puzzles in 3 minutes

### Focused Tactical Training
- Theme: Fork
- Duration: 10 minutes
- Per-puzzle: 30 seconds
- Result: 20 fork puzzles with more thinking time

### Endgame Study
- Theme: Pawn Endgame
- Duration: 15 minutes
- Per-puzzle: 60 seconds
- Result: 15 pawn endgame positions with deep analysis time

## Integration

The Custom Sprint feature integrates seamlessly with:
- Existing sprint infrastructure
- ELO rating system
- User progress tracking
- Sprint results and statistics
- Theme-based puzzle selection
