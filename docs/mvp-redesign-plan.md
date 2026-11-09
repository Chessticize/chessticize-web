## MVP Redesign Plan: Focus on Puzzle Sprint and Arrow Duel

### Goals
- Deliver a streamlined first version focused on puzzle-based chess training
- Emphasize Lichess-powered, time-limited puzzles and Arrow Duel
- Remove the Dashboard (route authed users directly to Puzzle Sprint); surface simple daily stats on the Puzzle Sprint hub
- Remove chess profile features and code entirely for MVP
- Soft-remove Game Review
- Keep a minimal Settings surface (sign-out only) for future expansion
- Ensure mobile UX stays clean (no desktop footer on mobile)

---

## 1) Information Architecture and Navigation

### Proposed Top-level Routes
- Home (marketing landing) — app/page.tsx (unauth); redirects to /puzzle-sprint when authed
- Puzzle Sprint hub — app/puzzle-sprint/page.tsx
  - Standard Sprint — app/puzzle-sprint/sprint/page.tsx
  - Blitz — app/puzzle-sprint/blitz/page.tsx
  - Custom — app/puzzle-sprint/custom/page.tsx
  - Arrow Duel — app/puzzle-sprint/arrow-duel/page.tsx
- Settings (minimal) — app/settings/page.tsx (sign-out only)
- [Removed] Dashboard — app/dashboard/page.tsx; keep a redirect to /puzzle-sprint for any legacy links

### Remove/Hide
- Game Review (all UI) — app/game-review/**
- All chess profile inputs/features (UI, hooks, types, API calls). Fully delete these modules for MVP rather than feature-flagging.
- Any deep stats sections not required for MVP

### Navigation updates
- File: components/navigation.tsx
  - navigationItems = [Puzzle Sprint (/puzzle-sprint), Settings (/settings)]
  - Remove: Dashboard and Game Review
  - Keep mobile bottom menu; no footer on mobile
- Routing:
  - /dashboard should redirect to /puzzle-sprint

---

## 2) Landing Page (app/page.tsx) — New Messaging

Replace current hero copy to clearly position the product:
- Headline: “Puzzle-based chess training”
- Subtext: “Solve time-limited puzzles sourced from the Lichess puzzle library. Start with positions around your current level; advance to harder ones as you improve. Train intuition on real positions.”
- Secondary: “Arrow Duel trains your decision-making by pitting the best move against the blunder — pick the right one under time pressure.”
- CTA: “Get Started” → /auth
- Keep footer hidden on mobile (desktop-only as today)

Implementation notes:
- Edit copy in app/page.tsx; remove mentions of game analysis

---

## 3) Dashboard removal (/dashboard)

- Remove the dashboard page from the IA
- Implement redirect from /dashboard to /puzzle-sprint (server component redirect)
- Move simple top-level stats to the Puzzle Sprint hub:
  - Chips: Streak today, Correct today, Time trained today
- Primary CTAs now live on the hub cards (Standard, Blitz, Custom, Arrow Duel)

---

## 4) Puzzle Sprint Hub (app/puzzle-sprint/page.tsx)

### Scope for MVP
- Keep:
  - Standard Sprint card ("Standard")
  - Blitz card
  - Custom card (as its own prominent card)
  - Arrow Duel card
- Remove/Hide:
  - Game-based Thematic Training section (components/puzzle-sprint/GameBasedThematicTraining)
  - Deep “Your Progress” stats grid (can return later)

### Top-of-page stats
- Show simple chips: Streak today, Correct today, Time trained today

### Previous Custom Modes
- Surface quick-start chips/cards for the user's recently used custom modes based on available ELOs and previous custom sprints
- Data source: user's ELO types and recent sprint results (see app/puzzle-sprint/custom/page.tsx for eloType usage); persist/derive from user context or sprint history

### Copy
- Add a short intro paragraph under the h1 explaining time-limited puzzles and level progression

### Componentization recommendations
- New small components to simplify and reuse:
  1) SprintModeCard: renders an icon, title, description (reuse for Standard, Blitz, Custom, Arrow Duel)
  2) StatChip: tiny component for Streak/Correct/Time chips used across pages
  3) SectionHeader: title + chip/badge (for consistency across sections)
- Avoid ELO UI in MVP; keep page-level logic minimal

---

## 5) Arrow Duel (app/puzzle-sprint/arrow-duel/page.tsx)

- Keep as-is functionally
- Optionally add a 1–2 line explainer at top (best vs. blunder move; pick under time pressure) for discoverability
- Ensure consistent back navigation to Puzzle Sprint hub

---

## 6) Settings (app/settings/page.tsx)

- MVP: Remove chess profile creation/validation UIs and references entirely from the codebase
- Delete modules: useChessProfiles, useChessUsernameValidation, ChessUsernameInput, any chess-profile types/schemas, and related routes if any
- Keep only:
  - Header “Settings” (or “Account”)
  - Sign Out button (use existing logout from useAuthContext)
- Future: Reintroduce profiles under a feature flag when Game Review returns

---

## 7) Game Review removal strategy

- Immediate (soft removal):
  - Remove all links to /game-review (navigation, dashboard, any other pages — e.g., app/puzzles/page.tsx back link)
  - Replace app/game-review/page.tsx with a redirect to /puzzle-sprint to avoid dead bookmarks
- Optional (hard removal in a follow-up PR):
  - Delete app/game-review/** and components/game-review/** once we’re confident no code depends on them

---

## 8) Other pages that reference Game Review

- app/puzzles/page.tsx currently links back to /game-review — either:
  - Hide/remove this page; or
  - Update its CTA to “Practice Puzzles Now” → /puzzle-sprint and remove the back link

Recommendation: Hide this page for MVP unless it carries unique value

---

## 9) Copy edits (exact files)

- app/page.tsx — marketing/hero copy (remove analysis phrasing); update authed redirect target to /puzzle-sprint
- components/navigation.tsx — trim to Puzzle Sprint and Settings
- app/puzzle-sprint/page.tsx — show Standard/Blitz/Custom/Arrow Duel; add intro paragraph; add simple chips; add “Recent Custom Modes” section
- app/puzzle-sprint/custom/page.tsx — ensure eloType surfacing supports “Recent Custom Modes” derivation
- app/settings/page.tsx — remove chess profile UI and related imports; keep only Sign Out
- app/game-review/page.tsx — redirect to /puzzle-sprint (soft removal)
- app/dashboard/page.tsx — replace with redirect to /puzzle-sprint (or delete with route-level redirect)
- app/puzzles/page.tsx — hide or remove Game Review link; preferably hide entire page for MVP

---

## 10) Suggested sequence of changes (safe, minimal-diff)

1) Navigation + routing cleanup
   - components/navigation.tsx: remove Dashboard and Game Review; keep Settings
   - app/dashboard/page.tsx: redirect to /puzzle-sprint
   - app/page.tsx: auth redirect goes to /puzzle-sprint
2) Settings trim (code deletion)
   - Remove chess profile code modules and UI
3) Puzzle Sprint hub focus
   - app/puzzle-sprint/page.tsx: show Standard/Blitz/Custom/Arrow Duel; add short intro; add simple chips; add “Recent Custom Modes”
4) Landing copy
   - app/page.tsx: update hero/subtext for puzzle-based training + Arrow Duel
5) Game Review soft removal
   - app/game-review/page.tsx: redirect to /puzzle-sprint; remove links across the app
6) Optional cleanup
   - app/puzzles/page.tsx: hide page or update links

Each step is independently shippable and reversible.

---

## 11) Open questions for confirmation
- Confirm full removal of Dashboard vs keeping a basic summary page? (Proposal here: remove and move stats to the hub)
- Placement/design for “Recent Custom Modes” (chips vs small cards) on the hub?
- Any other minimal stats desired on the hub beyond Streak/Correct/Time?

---

## 12) Acceptance Criteria
- No navigation or links to Game Review or Dashboard
- Visiting /game-review redirects to /puzzle-sprint
- Visiting /dashboard redirects to /puzzle-sprint
- Landing page (authed) redirects to /puzzle-sprint and clearly explains: Lichess-sourced time-limited puzzles; progression; Arrow Duel (best vs blunder)
- Puzzle Sprint hub shows Standard, Blitz, Custom, and Arrow Duel entries with a short intro
- Puzzle Sprint hub shows simple chips for today (streak, correct, time)
- “Recent Custom Modes” are visible and populated based on the user’s prior custom sprints/ELOs
- Settings shows only Sign Out; chess profile code removed from the codebase
- Footer remains hidden on mobile

## Conclusion
Keep the interface action-oriented and simple. Highlight what the user did today and what to do next, and defer advanced metrics (like ELO internals) until after MVP, or behind an explicit “Details” view.

