"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import PuzzleSprintPage from "@/app/puzzle-sprint/page"

/**
 * Home is now unified directly with Practice Home (Puzzle Sprint), matching Chessticize Mobile.
 * Keeping `/dashboard` rendering the same Practice Home preserves existing bookmarks and deep links.
 */
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <PuzzleSprintPage />
    </ProtectedRoute>
  )
}
