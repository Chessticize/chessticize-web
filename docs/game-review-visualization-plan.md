# Game Review Data Visualization Implementation Plan

## Overview

This document outlines the implementation plan for visualizing chess performance statistics from the v2 Game Review data. The goal is to create an intuitive, actionable dashboard that helps users understand their chess improvement journey.

## Data Analysis

### Available Data Structures

From the v2 Game Review stats payload, we have:

1. **Time Series Data (Weekly)**:
   - `opponentMistakesTimeSeries`: Weekly opponent mistake patterns
   - `myMistakesTimeSeries`: Weekly user mistake patterns

2. **3-Month Aggregated Data**:
   - `opponentMistakesMissed3M`: Detailed breakdown of missed opportunities
   - `opponentMistakesCaught3M`: Analysis of successfully caught mistakes
   - `myMistakes3M`: Comprehensive user mistake analysis

### Key Metrics to Calculate

1. **Opportunity Recognition Rate**: `(caught_mistakes + caught_blunders) / (total_opponent_mistakes)`
2. **Trend Analysis**: Week-over-week performance changes
3. **Tactical Pattern Proficiency**: Success rates by tactical theme
4. **Game Phase Performance**: Mistake patterns by game stage
5. **Complexity Handling**: Performance vs. puzzle complexity (move length)

## Design Philosophy

### Main Game Review Page (`/game-review`)
- **Purpose**: High-level performance overview with motivation and quick insights
- **Approach**: Dashboard-style with key metrics, trends, and actionable highlights
- **User Experience**: Scannable, encouraging, with clear next steps

### Insights Page (`/game-review/insights`)
- **Purpose**: Deep analytical view for serious improvement work
- **Approach**: Comprehensive charts, detailed breakdowns, specific recommendations
- **User Experience**: Analytical, detailed, with drilling-down capabilities

## Implementation Plan

### Phase 1: Data Processing Foundation

#### 1.1 Create Data Processing Utilities
**File**: `lib/insights/game-review-analysis.ts`

```typescript
// Core calculation functions
export function calculateOpportunityRecognitionRate(data: GameReviewData): number
export function analyzeWeeklyTrends(timeSeries: TimeSeriesNode[]): TrendAnalysis
export function extractTacticalPatterns(aggregatedData: AggregatedData): PatternAnalysis
export function analyzeGamePhasePerformance(data: GameMoveData): PhaseAnalysis
export function calculatePerformanceMetrics(data: GameReviewData): PerformanceMetrics

// Data transformation utilities
export function transformTimeSeriesData(raw: TimeSeriesData): ChartData[]
export function aggregateThemeCounts(data: ThemeCountData): ThemeStats[]
export function calculateMovingAverages(data: number[], window: number): number[]
```

#### 1.2 Create TypeScript Interfaces
**File**: `types/game-review-stats.ts`

```typescript
interface GameReviewStats {
  opportunityRecognition: OpportunityRecognitionStats
  weeklyTrends: WeeklyTrendStats
  tacticalPatterns: TacticalPatternStats
  gamePhaseAnalysis: GamePhaseStats
  colorPerformance: ColorStats
  recommendations: RecommendationSet
}

interface OpportunityRecognitionStats {
  overallRate: number
  recentTrend: TrendDirection
  weeklyRates: WeeklyRate[]
  mistakeVsBlunderPerformance: {
    mistakes: RecognitionRate
    blunders: RecognitionRate
  }
}
```

### Phase 2: Main Page Enhancements

#### 2.1 Update High-Level Statistics Cards
**Location**: `/game-review` page

**New/Updated Cards**:
1. **Opportunity Recognition** (replaces or enhances existing "Catch Rate")
   - Current rate with trend arrow
   - Week-over-week change percentage
   - Color: Green (good), Orange (needs work), Red (declining)

2. **Improvement Velocity**
   - Weekly improvement rate
   - "Learning momentum" indicator
   - Recent achievements/milestones

3. **Focus Area Spotlight**
   - Most problematic tactical pattern
   - Recommended practice area
   - Progress in current focus area

4. **Activity Summary** (enhanced)
   - Total patterns analyzed
   - Time period covered
   - Most active improvement area

#### 2.2 Quick Insights Section
**Component**: `QuickInsightsPreview`

- Top strength: "You excel at catching hanging pieces"
- Key weakness: "Practice recognizing pins in the middlegame"
- Recent improvement: "Blunder recognition up 15% this week"
- Next milestone: "Reach 75% opportunity recognition rate"

### Phase 3: Detailed Insights Page

#### 3.1 Performance Timeline Section
**Component**: `PerformanceTimelineChart`

- **Weekly Opportunity Recognition Chart**: Line chart showing recognition rate over time
- **Mistake Volume Trends**: Dual-axis chart (user mistakes vs opportunities)
- **Pattern-Specific Trends**: Multi-line chart for different tactical themes
- **Complexity Trends**: Average move length and performance correlation

#### 3.2 Tactical Pattern Analysis
**Component**: `TacticalPatternAnalysis`

- **Pattern Proficiency Matrix**: Heatmap showing success rate by pattern type
- **Most Missed Opportunities**: Bar chart of frequently missed patterns
- **Improvement Opportunities**: Ranked list with practice recommendations
- **Pattern Complexity Analysis**: Success rate vs. average move length by pattern

#### 3.3 Game Phase Breakdown
**Component**: `GamePhaseAnalysis`

- **Phase Performance Chart**: Bar chart showing mistake/catch rates by game phase
- **Opening Repertoire Analysis**: Performance in opening vs. late opening
- **Endgame Proficiency**: Specific endgame pattern recognition
- **Transition Zones**: Performance in phase transitions

#### 3.4 Color & Context Analysis
**Component**: `ColorContextAnalysis`

- **White vs. Black Performance**: Side-by-side comparison
- **Time Control Impact**: Performance by game time control
- **Rating Impact**: Performance vs. opponent strength
- **Game Length Correlation**: Performance in short vs. long games

#### 3.5 Performance Summary
**Component**: `PerformanceSummary`

- **Key Insights**: Top strengths and focus areas identified from data
- **Progress Highlights**: Notable improvements and trends
- **Simple Next Steps**: High-level guidance based on analysis
- **Pattern Analysis**: Summary of tactical pattern performance

### Phase 4: Advanced Features & Polish

#### 4.1 Interactive Features
- **Drill-down capabilities**: Click on chart elements for detailed views
- **Date range selectors**: Analyze different time periods
- **Pattern filters**: Focus on specific tactical themes
- **Comparison modes**: Before/after specific time periods

#### 4.2 Enhanced Analytics
- **Trend Analysis**: More sophisticated trend calculations
- **Pattern Correlation**: Relationships between different tactical themes
- **Performance Prediction**: Basic forecasting of improvement trajectories
- **Comparative Analysis**: Performance vs. historical averages

#### 4.3 Integration Enhancements
- **Export Features**: PDF reports and data downloads
- **Performance Alerts**: Notifications for significant changes
- **Historical Comparisons**: Compare different time periods
- **Data Export**: Raw data download capabilities

## Technical Implementation Details

### Data Flow Architecture

```
v2 Stats Payload -> Data Processing Layer -> Calculated Metrics -> UI Components
                                        -> Trend Analysis -----> Charts
                                        -> Recommendations ----> Action Cards
```

### Component Hierarchy

```
GameReviewPage
├── PerformanceOverviewSection
│   ├── StatCard (Opportunity Recognition)
│   ├── StatCard (Improvement Velocity)
│   ├── StatCard (Focus Area)
│   └── StatCard (Activity Summary)
├── QuickInsightsPreview
└── ExistingGameAnalysisSection

InsightsPage
├── PerformanceTimelineSection
├── TacticalPatternAnalysis
├── GamePhaseBreakdown
├── ColorContextAnalysis
└── PerformanceSummary
```

### Hook Structure

```typescript
// Main hook for processed data
export function useGameReviewAnalytics() {
  const { data, isLoading, error } = useGameReviewData()
  
  return {
    metrics: processedMetrics,
    trends: trendAnalysis,
    recommendations: recommendations,
    chartData: chartDataSets,
    loading: isLoading,
    error
  }
}

// Specialized hooks for specific features
export function useOpportunityRecognition()
export function useTacticalPatterns()
export function useGamePhaseAnalysis()
```

## Success Metrics

### User Engagement
- Time spent on insights page
- Return visits to game review section
- Action taken on recommendations

### Data Quality
- Accuracy of trend calculations
- Relevance of recommendations
- Performance of chart rendering

### User Feedback
- Ease of understanding insights
- Actionability of recommendations
- Motivation impact

## Timeline

- **Phase 1** (Data Processing): 3-4 days
- **Phase 2** (Main Page): 2-3 days  
- **Phase 3** (Insights Page): 5-6 days
- **Phase 4** (Polish): 2-3 days

**Total Estimated Timeline**: 12-16 days

## Next Steps

1. **Review and approve this plan**
2. **Start with Phase 1: Data processing utilities**
3. **Create mock data for development if needed**
4. **Begin iterative implementation with regular feedback**

This plan prioritizes delivering immediate value through high-level insights while building toward comprehensive analytical capabilities. Each phase delivers working functionality that improves the user experience.
