# Game Review Metrics & UI Design

## Available Data Sources

### 1. Historical Data Shape (from query_response.json)
- **opponentMistakesTimeSeries**: Weekly data with theme counts (caught/missed) and average move length
- **opponentMistakesMissed3M**: 3-month aggregated data with tag counts, game phase buckets, and color analysis
- **opponentMistakesCaught3M**: 3-month aggregated data for successfully caught opportunities
- **myMistakesTimeSeries**: Weekly data for user's own mistakes
- **myMistakes3M**: 3-month aggregated data for user's mistakes

### 2. REST API
- **/api/v2/me/bootstrap**: User profile, connected profiles, ELOs, and daily puzzle stats
- **/api/v2/me/stats/sprints**: Sprint performance stats

## Recommended Metrics & Calculations

### Core Performance Metrics (Game Review Page)

#### 1. Opponent Mistake Recognition Rate
**Location**: Main dashboard card
**Calculation**:
```javascript
// From opponentMistakesTimeSeries weekly data
const totalCaught = sum(theme_counts.filter(t => t.theme.includes('caught')).map(t => t.count))
const totalMissed = sum(theme_counts.filter(t => t.theme.includes('missed')).map(t => t.count))
const recognitionRate = totalCaught / (totalCaught + totalMissed) * 100
```
**Chart Type**: Large percentage display with trend arrow
**UI Mock**:
```
┌─────────────────────────────────────────┐
│ 🎯 Opponent Mistake Recognition         │
│                                         │
│           64.2%                         │
│         ↗️ +3.1%                        │
│       This Week                         │
│                                         │
│ 🟡 Needs Improvement                    │
└─────────────────────────────────────────┘
```

#### 2. My Mistakes Per Game
**Location**: Main dashboard card
**Calculation**:
```javascript
// From myMistakesTimeSeries weekly data
const totalMistakes = sum(nodes.map(n => n.stats.total_count))
const totalGames = sum(nodes.map(n => n.stats.unique_game_count))
const mistakesPerGame = totalMistakes / totalGames
```
**Chart Type**: Number with trend comparison
**UI Mock**:
```
┌─────────────────────────────────────────┐
│ ❌ My Mistakes Per Game                 │
│                                         │
│           2.3                           │
│         ↘️ -0.4                         │
│       This Week                         │
│                                         │
│ 🟢 Improving                            │
└─────────────────────────────────────────┘
```

#### 3. Missed Opportunities by Theme (Pie Chart)
**Location**: Insights page
**Calculation**:
```javascript
// From opponentMistakesMissed3M.tag_counts
const topMissedThemes = tag_counts
  .filter(t => ['hangingPiece', 'pin', 'fork', 'discoveredAttack', 'skewer', 'backRankMate'].includes(t.tag))
  .sort((a, b) => b.count - a.count)
  .slice(0, 6)
```
**Chart Type**: Donut/pie chart
**UI Mock**:
```
┌─────────────────────────────────────────┐
│ 🎯 Missed Opportunities (3M)            │
│                                         │
│     ╭─────────╮                        │
│   ╱ Hanging   ╲   46 (32%)             │
│  │   Pieces    │                       │
│   ╲ Pin 32    ╱    32 (22%)            │
│     ╰─Fork─╯       29 (20%)            │
│                                         │
│ [Show All Themes →]                     │
└─────────────────────────────────────────┘
```

#### 4. My Mistake Themes (Pie Chart)
**Location**: Insights page
**Calculation**:
```javascript
// From myMistakes3M.tag_counts
const topMyMistakeThemes = tag_counts
  .filter(t => ['hangingPiece', 'pin', 'fork', 'mate', 'discoveredAttack'].includes(t.tag))
  .sort((a, b) => b.count - a.count)
  .slice(0, 6)
```
**Chart Type**: Donut/pie chart
**UI Mock**:
```
┌─────────────────────────────────────────┐
│ ❌ My Mistake Themes (3M)               │
│                                         │
│     ╭─────────╮                        │
│   ╱ Hanging   ╲   163 (17%)            │
│  │   Pieces    │                       │
│   ╲ Fork 47   ╱    47 (5%)             │
│     ╰─Pin─╯        44 (5%)             │
│                                         │
│ [Show All Themes →]                     │
└─────────────────────────────────────────┘
```

#### 5. Average Puzzle Length for My Mistakes
**Location**: Insights page
**Calculation**:
```javascript
// From myMistakesTimeSeries weekly data
const recentWeeks = nodes.slice(-4) // Last 4 weeks
const avgMoveLength = recentWeeks
  .filter(n => n.stats.total_count > 0)
  .reduce((sum, n) => sum + n.stats.average_move_length, 0) / recentWeeks.length
```
**Chart Type**: Number display with context
**UI Mock**:
```
┌─────────────────────────────────────────┐
│ 📏 My Mistake Complexity               │
│                                         │
│        2.6 moves                        │
│      average length                     │
│                                         │
│ 🟡 Focus on 2-3 move tactics           │
└─────────────────────────────────────────┘
```

## Detailed Insights Page (`/game-review/insights`)

### Weekly Recognition Trend
**Chart Type**: Line chart
**Calculation**:
```javascript
// From opponentMistakesTimeSeries
const weeklyRates = nodes.map(week => {
  const caught = week.stats.theme_counts
    .filter(t => t.theme.includes('caught'))
    .reduce((sum, t) => sum + t.count, 0)
  const missed = week.stats.theme_counts
    .filter(t => t.theme.includes('missed'))
    .reduce((sum, t) => sum + t.count, 0)
  return {
    week: week.start_time,
    rate: caught / (caught + missed) * 100
  }
})
```
**UI Mock**:
```
┌─────────────────────────────────────────────────────────────────┐
│                 Weekly Recognition Trend                         │
├─────────────────────────────────────────────────────────────────┤
│ 80%┌─────────────────────────────────────────────────────────  │
│    │                                    ●─●─●                   │
│ 60%│                              ●─●─●                         │
│    │                        ●─●─●                               │
│ 40%│                  ●─●─●                                     │
│    │            ●─●─●                                           │
│ 20%└─────────────────────────────────────────────────────────  │
│     4W ago    3W ago    2W ago    1W ago    This Week           │
│                                                                 │
│ Current: 64.2% | Best: 72.1% | Trend: ↗️ Improving            │
└─────────────────────────────────────────────────────────────────┘
```

### Game Phase Performance Analysis
**Chart Type**: Horizontal bar chart
**Calculation**:
```javascript
// From opponentMistakesMissed3M and opponentMistakesCaught3M game_move_buckets
const phaseAnalysis = opponentMistakesMissed3M.game_move_buckets.map(phase => {
  const caught = opponentMistakesCaught3M.game_move_buckets
    .find(p => p.name === phase.name)?.count || 0
  const missed = phase.count
  return {
    phase: phase.name,
    caught,
    missed,
    rate: caught / (caught + missed) * 100
  }
})
```
**UI Mock**:
```
┌─────────────────────────────────────────────────────────────────┐
│                    Game Phase Analysis                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Recognition Rate by Game Phase                                  │
│                                                                 │
│ Early Opening    ████████████████████ 69% (11 caught, 5 missed)│
│ Late Opening     ████████████████ 65% (97 caught, 52 missed)   │
│ Early Mid        ███████████████ 63% (152 caught, 89 missed)   │
│ Late Mid         ███████████████ 63% (135 caught, 78 missed)   │
│ Endgame          ████████████████████ 68% (94 caught, 45 missed)│
│                                                                 │
│ 🟡 Focus Area: Middlegame patterns need work                   │
└─────────────────────────────────────────────────────────────────┘
```

### Color Performance Comparison
**Chart Type**: Side-by-side cards
**Calculation**:
```javascript
// From opponentMistakesMissed3M.user_color_counts
const whitePerformance = {
  missed: opponentMistakesMissed3M.user_color_counts.find(c => c.color === 'white').count,
  caught: opponentMistakesCaught3M.user_color_counts.find(c => c.color === 'white').count
}
const blackPerformance = {
  missed: opponentMistakesMissed3M.user_color_counts.find(c => c.color === 'black').count,
  caught: opponentMistakesCaught3M.user_color_counts.find(c => c.color === 'black').count
}
```
**UI Mock**:
```
┌─────────────────────────────────────────────────────────────────┐
│                  Performance by Color                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────┐         ┌─────────────────┐                │
│ │ ♔ Playing White │         │ ♚ Playing Black │                │
│ │                 │         │                 │                │
│ │      72.1%      │         │      57.0%      │                │
│ │   Recognition   │         │   Recognition   │                │
│ │                 │         │                 │                │
│ │ 🟢 Strong       │         │ 🟡 Needs Work   │                │
│ └─────────────────┘         └─────────────────┘                │
│                                                                 │
│ 💡 15% better as White - focus on Black defensive patterns     │
└─────────────────────────────────────────────────────────────────┘
```

### Tactical Theme Success Rates
**Chart Type**: Horizontal bar chart with success rates
**Calculation**:
```javascript
// Combine caught and missed data for each theme
const themeAnalysis = ['hangingPiece', 'pin', 'fork', 'discoveredAttack', 'skewer', 'backRankMate'].map(theme => {
  const caught = opponentMistakesCaught3M.tag_counts.find(t => t.tag === theme)?.count || 0
  const missed = opponentMistakesMissed3M.tag_counts.find(t => t.tag === theme)?.count || 0
  return {
    theme,
    caught,
    missed,
    rate: caught / (caught + missed) * 100
  }
}).sort((a, b) => b.rate - a.rate)
```
**UI Mock**:
```
┌─────────────────────────────────────────────────────────────────┐
│                 Tactical Theme Success Rates                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Hanging Pieces   ████████████████████████ 67.1% (94/46)       │
│ Fork             ████████████████████ 42.0% (21/29)            │
│ Pin              ████████████████ 33.3% (16/32)  ⚠️ Focus      │
│ Discovered Attack ███████████ 15.4% (2/11)                     │
│ Skewer           ████████████████████████ 100% (6/0)           │
│ Back Rank Mate   ████████████████████████ 100% (1/4)           │
│                                                                 │
│ 🎯 Priority: Practice Pin and Discovered Attack recognition    │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Notes

### Data Fetching Strategy
1. **Game Review Page**: Load recent 4 weeks of time series data + 3-month aggregated data
2. **Insights Page**: Load full time series data (6+ months) for trend analysis
3. **Cache Strategy**: Cache 3-month aggregated data, refresh weekly time series data

### Chart Libraries
- **Recommended**: Chart.js or Recharts for React
- **Pie Charts**: Use donut charts for better readability
- **Line Charts**: Include data points and smooth curves
- **Bar Charts**: Horizontal bars for better label readability

### Performance Considerations
- **Lazy Loading**: Load insights page data only when accessed
- **Skeleton Loading**: Show chart placeholders while data loads
- **Error Handling**: Graceful fallbacks when data is missing
- **Mobile Optimization**: Responsive chart sizing and touch interactions

### Status Indicators Logic
```javascript
// Recognition rate status
const getRecognitionStatus = (rate) => {
  if (rate >= 70) return { color: '🟢', label: 'Strong' }
  if (rate >= 50) return { color: '🟡', label: 'Needs Work' }
  return { color: '🔴', label: 'Focus Area' }
}

// Trend calculation
const getTrend = (current, previous) => {
  const change = current - previous
  if (Math.abs(change) < 1) return { arrow: '→', label: 'Stable' }
  return change > 0
    ? { arrow: '↗️', label: 'Improving' }
    : { arrow: '↘️', label: 'Declining' }
}
```

### Key Design Principles
1. **Objective Focus**: Show numbers and trends without subjective commentary
2. **Simple Status**: Use "Improving/Needs Work/Strong" based on thresholds
3. **Actionable Insights**: Focus on specific themes/phases that need attention
4. **Consistent Metrics**: Use same calculation methods across all views
5. **Mobile-First**: Ensure all charts work well on small screens
