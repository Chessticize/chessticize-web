"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, ExternalLink, Gamepad2, Loader2 } from "lucide-react"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { MobileContainer, MobileLayout } from "@/components/ui/mobile-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getGame, type V2GameListItem } from "@/lib/api/library"
import { useUserContext } from "@/hooks/useUserContext"

export default function GameDetailPage() {
  const params = useParams<{ gameID: string }>()
  const gameID = Array.isArray(params.gameID) ? params.gameID[0] : params.gameID
  const { user, isLoading: isLoadingUser, error: userError } = useUserContext()
  const [game, setGame] = useState<V2GameListItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id || !gameID) {
      setGame(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    const loadGame = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setGame(null)
        const response = await getGame(gameID)
        if (!cancelled) {
          setGame(response.game)
        }
      } catch (loadError) {
        if (!cancelled) {
          setGame(null)
          setError(loadError instanceof Error ? loadError.message : "Failed to load game")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadGame()

    return () => {
      cancelled = true
    }
  }, [user?.id, gameID])

  return (
    <MobileLayout fullHeight>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <MobileContainer padding="lg">
          <div className="mb-6">
            <Link href="/games">
              <Button variant="outline" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Games
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-3 rounded-lg">
                <Gamepad2 className="h-7 w-7 text-emerald-700" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Game Detail</h1>
                <p className="text-gray-600 mt-1">Imported game metadata from the v2 API.</p>
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
            <EmptyState title="Sign in to view this game" message="Imported game details appear here after sign-in." />
          ) : isLoading ? (
            <LoadingState label="Loading game..." />
          ) : error ? (
            <EmptyState title="Could not load game" message={error} />
          ) : game ? (
            <GameDetail game={game} />
          ) : (
            <EmptyState title="Game not found" message="This game is unavailable or no longer belongs to your account." />
          )}
        </MobileContainer>
        <Footer />
      </div>
    </MobileLayout>
  )
}

function GameDetail({ game }: { game: V2GameListItem }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{game.platform} / {game.username}</CardTitle>
              <p className="mt-1 text-sm text-gray-600">{formatDateTime(game.game_time)}</p>
            </div>
            <Badge variant={game.result === "draw" ? "outline" : "secondary"}>{formatLabel(game.result)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Time Control" value={game.time_control} />
            <DetailItem label="Time Class" value={formatLabel(game.time_class || "unknown")} />
            <DetailItem label="Color" value={formatLabel(game.user_color)} />
            <DetailItem label="Winner" value={formatLabel(game.winner)} />
            <DetailItem label="Rated" value={game.rated ? "Rated" : "Casual"} />
            <DetailItem label="Imported" value={formatDateTime(game.created_at)} />
            <DetailItem label="Updated" value={formatDateTime(game.updated_at)} />
          </dl>
          {game.url && (
            <Link href={game.url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center text-sm text-blue-700 hover:underline">
              Open original game
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Link>
          )}
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
