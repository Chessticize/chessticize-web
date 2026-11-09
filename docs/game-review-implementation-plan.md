# Game Review Implementation Plan

## Overview
This document outlines the implementation plan for the Game Review feature based on the metrics and UI design specified in `game-review-ui-mockups.md`.

## Technology Stack

### Frontend Framework
- **React** with TypeScript
- **Next.js** for routing and SSR
- **Tailwind CSS** for styling
- **Framer Motion** for animations

### Chart Libraries
- **Recharts** - Primary choice for React-native charts
  - Excellent React integration
  - Responsive design
  - TypeScript support
  - Good performance with moderate data sets
- **Chart.js with react-chartjs-2** - Alternative for complex visualizations
  - More chart types available
  - Better performance with large datasets
  - More customization options

### State Management
- **React Query (TanStack Query)** for server state
- **Zustand** for client state (if needed)
- **React Context** for theme/user preferences

## Page Structure & Layout

### 1. Game Review Main Page (`/game-review`)

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────────┐
│ Header Navigation                                                │
├─────────────────────────────────────────────────────────────────┤
│ Performance Overview Cards (Grid: 2x2 on desktop, 1x4 mobile)  │
├─────────────────────────────────────────────────────────────────┤
│ Quick Actions Bar                                               │
├─────────────────────────────────────────────────────────────────┤
│ Recent Activity Summary                                         │
├─────────────────────────────────────────────────────────────────┤
│ Footer                                                          │
└─────────────────────────────────────────────────────────────────┘
```

#### Components Breakdown
1. **PerformanceOverviewGrid**
   - `RecognitionRateCard` - Large percentage with trend
   - `MistakesPerGameCard` - Number with trend comparison
   - `WeeklyTrendCard` - Mini line chart
   - `QuickStatsCard` - Activity summary

2. **QuickActionsBar**
   - "View Detailed Insights" button
   - "Practice Weak Areas" button
   - Date range selector

### 2. Detailed Insights Page (`/game-review/insights`)

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────────┐
│ Header with Back Navigation                                     │
├─────────────────────────────────────────────────────────────────┤
│ Time Range Selector                                             │
├─────────────────────────────────────────────────────────────────┤
│ Weekly Trend Chart (Full Width)                                │
├─────────────────────────────────────────────────────────────────┤
│ Two-Column Layout:                                              │
│ ├─ Left: Missed Opportunities Pie Chart                        │
│ └─ Right: My Mistakes Pie Chart                                │
├─────────────────────────────────────────────────────────────────┤
│ Game Phase Analysis (Horizontal Bar Chart)                     │
├─────────────────────────────────────────────────────────────────┤
│ Color Performance Comparison (Side-by-side Cards)              │
├─────────────────────────────────────────────────────────────────┤
│ Tactical Theme Success Rates (Horizontal Bar Chart)            │
└─────────────────────────────────────────────────────────────────┘
```

## UI Components & Chart Types

### 1. Recognition Rate Card
**Component**: `RecognitionRateCard`
**Chart Type**: Large number display with progress ring
```typescript
interface RecognitionRateCardProps {
  currentRate: number;
  previousRate: number;
  trend: 'up' | 'down' | 'stable';
  status: 'strong' | 'needs-work' | 'focus-area';
}
```
**Implementation**: Custom component with CSS animations

### 2. Weekly Trend Chart
**Component**: `WeeklyTrendChart`
**Chart Library**: Recharts LineChart
```typescript
interface WeeklyTrendData {
  week: string;
  recognitionRate: number;
  mistakesCaught: number;
  mistakesMissed: number;
}
```
**Features**:
- Responsive design
- Hover tooltips
- Smooth animations
- Data point highlighting

### 3. Pie Charts (Missed Opportunities & My Mistakes)
**Component**: `ThemePieChart`
**Chart Library**: Recharts PieChart with custom legend
```typescript
interface ThemeData {
  theme: string;
  count: number;
  percentage: number;
  color: string;
}
```
**Features**:
- Donut style (better readability)
- Custom legend with counts
- Hover effects
- "Show All" expansion

### 4. Game Phase Analysis
**Component**: `GamePhaseChart`
**Chart Library**: Recharts BarChart (horizontal)
```typescript
interface GamePhaseData {
  phase: string;
  caught: number;
  missed: number;
  rate: number;
  status: 'strong' | 'needs-work' | 'focus-area';
}
```
**Features**:
- Horizontal bars for better label readability
- Color coding by performance
- Percentage labels on bars

### 5. Color Performance Cards
**Component**: `ColorPerformanceComparison`
**Chart Type**: Custom cards with statistics
```typescript
interface ColorPerformance {
  color: 'white' | 'black';
  recognitionRate: number;
  totalCaught: number;
  totalMissed: number;
  status: 'strong' | 'needs-work' | 'focus-area';
}
```

### 6. Tactical Theme Success Rates
**Component**: `TacticalThemeChart`
**Chart Library**: Recharts BarChart (horizontal)
```typescript
interface TacticalThemeData {
  theme: string;
  caught: number;
  missed: number;
  successRate: number;
  priority: 'high' | 'medium' | 'low';
}
```

## Data Flow & State Management

### 1. Data Fetching Strategy
```typescript
// Custom hooks for data fetching
const useGameReviewData = (timeRange: TimeRange) => {
  const opponentMistakes = useQuery(['opponentMistakes', timeRange], fetchOpponentMistakes);
  const myMistakes = useQuery(['myMistakes', timeRange], fetchMyMistakes);
  const userStats = useQuery(['userStats'], fetchUserStats);
  
  return {
    data: combineGameReviewData(opponentMistakes.data, myMistakes.data, userStats.data),
    isLoading: opponentMistakes.isLoading || myMistakes.isLoading || userStats.isLoading,
    error: opponentMistakes.error || myMistakes.error || userStats.error
  };
};
```

### 2. v2 REST Reads

Active Game Review data comes from v2 REST endpoints:

```text
GET /api/v2/me/insights/game-review?include_stats_bundle=true
GET /api/v2/me/stats/puzzles
```

### 3. Data Processing Functions
```typescript
// Calculate recognition rate from time series data
export const calculateRecognitionRate = (timeSeriesData: TimeSeriesNode[]): number => {
  const totalCaught = timeSeriesData.reduce((sum, node) => 
    sum + node.stats.theme_counts
      .filter(t => t.theme.includes('caught'))
      .reduce((s, t) => s + t.count, 0), 0
  );
  
  const totalMissed = timeSeriesData.reduce((sum, node) => 
    sum + node.stats.theme_counts
      .filter(t => t.theme.includes('missed'))
      .reduce((s, t) => s + t.count, 0), 0
  );
  
  return totalCaught / (totalCaught + totalMissed) * 100;
};

// Process theme data for pie charts
export const processThemeData = (tagCounts: TagCount[]): ThemeData[] => {
  const supportedThemes = [
    'fork', 'pin', 'skewer', 'discoveredAttack', 'deflection',
    'hangingPiece', 'trappedPiece', 'backRankMate', 'mateIn1', 'mateIn2'
  ];
  
  const total = tagCounts.reduce((sum, t) => sum + t.count, 0);
  
  return tagCounts
    .filter(t => supportedThemes.includes(t.tag))
    .map(t => ({
      theme: t.tag,
      count: t.count,
      percentage: (t.count / total) * 100,
      color: getThemeColor(t.tag)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6); // Top 6 themes
};
```

## Responsive Design Strategy

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Adaptations
1. **Performance Cards**: Stack vertically (1 column)
2. **Pie Charts**: Stack vertically, reduce size
3. **Bar Charts**: Maintain horizontal orientation, adjust font sizes
4. **Navigation**: Hamburger menu for insights page

### Chart Responsiveness
```typescript
// Responsive chart configuration
const getChartConfig = (screenSize: 'mobile' | 'tablet' | 'desktop') => ({
  mobile: {
    width: '100%',
    height: 200,
    fontSize: 12,
    margin: { top: 10, right: 10, bottom: 10, left: 10 }
  },
  tablet: {
    width: '100%',
    height: 300,
    fontSize: 14,
    margin: { top: 20, right: 20, bottom: 20, left: 20 }
  },
  desktop: {
    width: '100%',
    height: 400,
    fontSize: 16,
    margin: { top: 30, right: 30, bottom: 30, left: 30 }
  }
}[screenSize]);
```

## Performance Optimizations

### 1. Data Caching
- Cache 3-month aggregated data for 1 hour
- Cache weekly time series for 15 minutes
- Use React Query's background refetch

### 2. Chart Optimizations
- Lazy load chart components
- Use React.memo for expensive calculations
- Debounce time range changes

### 3. Loading States
```typescript
// Loading skeleton components
const ChartSkeleton = ({ height = 300 }) => (
  <div className="animate-pulse">
    <div className={`bg-gray-200 rounded h-${height}`} />
  </div>
);

const CardSkeleton = () => (
  <div className="animate-pulse p-6 bg-white rounded-lg shadow">
    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-1/3" />
  </div>
);
```

## File Structure

```
app/game-review/
├── page.tsx                          # Main game review page
├── insights/
│   └── page.tsx                      # Detailed insights page
├── components/
│   ├── cards/
│   │   ├── RecognitionRateCard.tsx
│   │   ├── MistakesPerGameCard.tsx
│   │   ├── WeeklyTrendCard.tsx
│   │   └── QuickStatsCard.tsx
│   ├── charts/
│   │   ├── WeeklyTrendChart.tsx
│   │   ├── ThemePieChart.tsx
│   │   ├── GamePhaseChart.tsx
│   │   ├── ColorPerformanceComparison.tsx
│   │   └── TacticalThemeChart.tsx
│   ├── layout/
│   │   ├── PerformanceOverviewGrid.tsx
│   │   ├── QuickActionsBar.tsx
│   │   └── TimeRangeSelector.tsx
│   └── common/
│       ├── LoadingSkeletons.tsx
│       ├── ErrorBoundary.tsx
│       └── StatusIndicator.tsx
├── hooks/
│   ├── useGameReviewData.ts
│   ├── useOpponentMistakes.ts
│   ├── useMyMistakes.ts
│   └── useUserStats.ts
├── utils/
│   ├── dataProcessing.ts
│   ├── chartHelpers.ts
│   ├── themeColors.ts
│   └── calculations.ts
└── types/
    ├── gameReview.ts
    ├── charts.ts
    └── api.ts
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Set up page routing and basic layout
- [ ] Implement data fetching hooks
- [ ] Create basic card components
- [ ] Set up v2 REST reads

### Phase 2: Main Dashboard (Week 2)
- [ ] Implement performance overview cards
- [ ] Add recognition rate calculation
- [ ] Create mistakes per game metric
- [ ] Add loading states and error handling

### Phase 3: Charts & Visualizations (Week 3)
- [ ] Implement weekly trend chart
- [ ] Create pie charts for theme analysis
- [ ] Add game phase bar chart
- [ ] Implement color performance comparison

### Phase 4: Insights Page (Week 4)
- [ ] Create detailed insights layout
- [ ] Add tactical theme success rates
- [ ] Implement time range selector
- [ ] Add responsive design optimizations

### Phase 5: Polish & Testing (Week 5)
- [ ] Add animations and micro-interactions
- [ ] Implement comprehensive error handling
- [ ] Add unit tests for calculations
- [ ] Performance optimization and caching
- [ ] Mobile responsiveness testing

## Testing Strategy

### Unit Tests
- Data processing functions
- Chart calculation utilities
- Component rendering with mock data

### Integration Tests
- v2 REST query integration
- Data flow from API to components
- User interactions and state changes

### E2E Tests
- Full page load and data display
- Navigation between main and insights pages
- Responsive behavior across devices

## Accessibility Considerations

### Chart Accessibility
- Alt text for all charts
- Keyboard navigation support
- Screen reader compatible data tables as fallbacks
- High contrast color schemes
- Focus indicators for interactive elements

### Color Coding
- Use patterns/textures in addition to colors
- Ensure sufficient color contrast ratios
- Support for color-blind users

## Quick Start Implementation Order

1. **Setup**: Create page structure and basic layout components
2. **Data Layer**: Implement v2 REST reads and data processing utilities
3. **Main Cards**: Build the 4 core metric cards for main page
4. **Charts**: Add Recharts components for insights page
5. **Polish**: Add loading states, error handling, and responsive design

## Missing Implementation Details

### v2 REST Integration
```typescript
// Add to hooks/useGameReviewData.ts
async function fetchGameReviewStatsBundle(profile: ChessProfile) {
  return fetchV2GameReviewStats(profile)
}
```

### Theme Color Mapping
```typescript
// Add to utils/themeColors.ts
export const THEME_COLORS = {
  hangingPiece: '#ef4444',
  pin: '#f97316',
  fork: '#eab308',
  discoveredAttack: '#22c55e',
  skewer: '#3b82f6',
  backRankMate: '#8b5cf6',
  // ... rest of 24 themes
};
```

### Status Calculation Logic
```typescript
// Add to utils/calculations.ts
export const getPerformanceStatus = (rate: number) => {
  if (rate >= 70) return { color: 'green', label: 'Strong', icon: '🟢' };
  if (rate >= 50) return { color: 'yellow', label: 'Needs Work', icon: '🟡' };
  return { color: 'red', label: 'Focus Area', icon: '🔴' };
};
```

This implementation plan provides a comprehensive roadmap for building the Game Review feature with modern React practices, responsive design, and excellent user experience.
