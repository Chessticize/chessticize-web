"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Gamepad2, Loader2, Puzzle } from "lucide-react"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { MobileContainer, MobileLayout } from "@/components/ui/mobile-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getPuzzle, type V2PuzzleListItem } from "@/lib/api/library"
import { useUserContext } from "@/hooks/useUserContext"

export default function PuzzleDetailPage() {
  const params = useParams<{ puzzleID: string }>()
  const puzzleID = Array.isArray(params.puzzleID) ? params.puzzleID[0] : params.puzzleID
  const { user, isLoading: isLoadingUser, error: userError } = useUserContext()
  const [puzzle, setPuzzle] = useState<V2PuzzleListItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id || !puzzleID) {
      setPuzzle(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    const loadPuzzle = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setPuzzle(null)
        const response = await getPuzzle(puzzleID)
        if (!cancelled) {
          setPuzzle(response.puzzle)
        }
      } catch (loadError) {
        if (!cancelled) {
          setPuzzle(null)
          setError(loadError instanceof Error ? loadError.message : "Failed to load puzzle")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPuzzle()

    return () => {
      cancelled = true
    }
  }, [user?.id, puzzleID])

  return (
    <MobileLayout fullHeight>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <MobileContainer padding="lg">
          <div className="mb-6">
            <Link href="/puzzles">
              <Button variant="outline" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Puzzles
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-violet-100 p-3 rounded-lg">
                <Puzzle className="h-7 w-7 text-violet-700" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Puzzle Detail</h1>
                <p className="text-gray-600 mt-1">Generated tactical position from the v2 API.</p>
              </div>
            </div>
          </div>

          {userError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {userError}
            </div>
          )}

          {isLoadingUser ? (
            <LoadingState label="Loading user data..." />
          ) : !user?.id ? (
            <EmptyState title="Sign in to view this puzzle" message="Generated puzzle details appear here after sign-in." />
          ) : isLoading ? (
            <LoadingState label="Loading puzzle..." />
          ) : error ? (
            <EmptyState title="Could not load puzzle" message={error} />
          ) : puzzle ? (
            <PuzzleDetail puzzle={puzzle} />
          ) : (
            <EmptyState title="Puzzle not found" message="This puzzle is unavailable or no longer belongs to your account." />
          )}
        </MobileContainer>
        <Footer />
      </div>
    </MobileLayout>
  )
}

function PuzzleDetail({ puzzle }: { puzzle: V2PuzzleListItem }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{formatLabel(puzzle.theme)}</CardTitle>
              <p className="mt-1 text-sm text-gray-600">{formatLabel(puzzle.theme_group || "unclassified")}</p>
            </div>
            <Badge variant="outline">{formatLabel(puzzle.puzzle_color)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-gray-50 p-3 font-mono text-xs text-gray-800 break-all">
            {puzzle.fen}
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Move" value={`${puzzle.game_move}`} />
            <DetailItem label="Phase" value={formatLabel(puzzle.game_phase || "unknown")} />
            <DetailItem label="User Color" value={formatLabel(puzzle.user_color)} />
            <DetailItem label="Zugzwang" value={puzzle.zugzwang ? "Yes" : "No"} />
            <DetailItem label="Imported" value={formatDateTime(puzzle.created_at)} />
            <DetailItem label="Updated" value={formatDateTime(puzzle.updated_at)} />
          </dl>
          {puzzle.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {puzzle.tags.map(tag => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gamepad2 className="h-5 w-5" />
            Source Game
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Profile" value={`${puzzle.game.platform} / ${puzzle.game.username}`} />
            <DetailItem label="Played" value={formatDateTime(puzzle.game.game_time)} />
            <DetailItem label="Time Control" value={puzzle.game.time_control} />
            <DetailItem label="Time Class" value={formatLabel(puzzle.game.time_class || "unknown")} />
            <DetailItem label="Result" value={formatLabel(puzzle.game.result)} />
            <DetailItem label="Rated" value={puzzle.game.rated ? "Rated" : "Casual"} />
          </dl>
          <Link href={`/games/${encodeURIComponent(puzzle.game.id)}`} className="mt-6 inline-flex items-center text-sm text-emerald-700 hover:underline">
            View game details
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-gray-600">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      {label}
    </div>
  )
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border bg-white py-12 px-6 text-center">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
    </div>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}
