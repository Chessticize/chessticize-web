"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Eye, Gamepad2, Loader2, Search } from "lucide-react"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { MobileContainer, MobileLayout } from "@/components/ui/mobile-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getGames, type V2GameListItem, type V2GameListResponse } from "@/lib/api/library"
import { useUserContext } from "@/hooks/useUserContext"

const PAGE_SIZE = 20
const EMPTY_GAME_FILTERS = {
  platform: "",
  username: "",
  timeClass: "",
  result: "",
}

export default function GamesPage() {
  const { user, isLoading: isLoadingUser, error: userError } = useUserContext()
  const [platform, setPlatform] = useState("")
  const [username, setUsername] = useState("")
  const [timeClass, setTimeClass] = useState("")
  const [result, setResult] = useState("")
  const [filters, setFilters] = useState(EMPTY_GAME_FILTERS)
  const [offset, setOffset] = useState(0)
  const [data, setData] = useState<V2GameListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    const loadGames = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const games = await getGames({
          platform: filters.platform,
          username: filters.username,
          time_class: filters.timeClass,
          result: filters.result,
          offset,
          limit: PAGE_SIZE,
        })
        if (!cancelled) {
          setData(games)
        }
      } catch (loadError) {
        if (!cancelled) {
          setData(null)
          setError(loadError instanceof Error ? loadError.message : "Failed to load games")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadGames()

    return () => {
      cancelled = true
    }
  }, [user?.id, filters, offset])

  const totalCount = data?.total_count ?? 0
  const games = data?.games ?? []
  const hasNextPage = offset + PAGE_SIZE < totalCount
  const pageStart = totalCount === 0 ? 0 : offset + 1
  const pageEnd = Math.min(offset + PAGE_SIZE, totalCount)
  const importedProfiles = user?.chess_profiles?.filter(profile => (profile.games_fetched || 0) > 0) ?? []
  const activeFilterCount = useMemo(() => {
    return [filters.platform, filters.username, filters.timeClass, filters.result].filter(Boolean).length
  }, [filters])

  const applyFilters = (event: FormEvent) => {
    event.preventDefault()
    setFilters({
      platform,
      username: username.trim(),
      timeClass,
      result,
    })
    setOffset(0)
  }

  const clearFilters = () => {
    setPlatform("")
    setUsername("")
    setTimeClass("")
    setResult("")
    setFilters(EMPTY_GAME_FILTERS)
    setOffset(0)
  }

  return (
    <MobileLayout fullHeight>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <MobileContainer padding="lg">
          <div className="mb-6">
            <Link href="/game-review">
              <Button variant="outline" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Game Review
              </Button>
            </Link>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-3 rounded-lg">
                  <Gamepad2 className="h-7 w-7 text-emerald-700" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">My Games</h1>
                  <p className="text-gray-600 mt-1">Browse imported games across connected profiles.</p>
                </div>
              </div>
              <Badge variant="outline" className="self-start sm:self-auto">
                {totalCount.toLocaleString()} games
              </Badge>
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
            <EmptyState title="Sign in to view games" message="Your imported games appear here after sign-in." />
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Search className="h-5 w-5" />
                    Filters
                    {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={applyFilters} className="grid gap-4 md:grid-cols-5">
                    <div className="space-y-2">
                      <Label htmlFor="platform">Platform</Label>
                      <select id="platform" value={platform} onChange={(event) => setPlatform(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">All</option>
                        <option value="lichess.org">Lichess</option>
                        <option value="chess.com">Chess.com</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="zsmickycat" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time-class">Time Class</Label>
                      <select id="time-class" value={timeClass} onChange={(event) => setTimeClass(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">All</option>
                        <option value="bullet">Bullet</option>
                        <option value="blitz">Blitz</option>
                        <option value="rapid">Rapid</option>
                        <option value="classical">Classical</option>
                        <option value="daily">Daily</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="result">Result</Label>
                      <select id="result" value={result} onChange={(event) => setResult(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">All</option>
                        <option value="mate">Mate</option>
                        <option value="resign">Resign</option>
                        <option value="outoftime">Timeout</option>
                        <option value="abandoned">Abandoned</option>
                        <option value="draw">Draw</option>
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <Button type="submit" className="flex-1">
                        <Search className="h-4 w-4 mr-2" />
                        Apply
                      </Button>
                      <Button type="button" variant="outline" onClick={clearFilters}>Clear</Button>
                    </div>
                  </form>
                  {importedProfiles.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {importedProfiles.map(profile => (
                        <button
                          key={`${profile.platform}-${profile.username}`}
                          type="button"
                          onClick={() => {
                            setPlatform(profile.platform)
                            setUsername(profile.username)
                            setFilters({
                              platform: profile.platform,
                              username: profile.username,
                              timeClass: "",
                              result: "",
                            })
                            setOffset(0)
                          }}
                          className="rounded-md border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {profile.platform} / {profile.username}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <LoadingState label="Loading games..." />
                  ) : error ? (
                    <EmptyState title="Could not load games" message={error} />
                  ) : games.length === 0 ? (
                    <EmptyState title="No games found" message="Try a different profile, result, or time class." />
                  ) : (
                    <GameList games={games} />
                  )}
                </CardContent>
              </Card>

              {!error && totalCount > 0 && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {pageStart.toLocaleString()}-{pageEnd.toLocaleString()} of {totalCount.toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={offset === 0 || isLoading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <Button variant="outline" disabled={!hasNextPage || isLoading} onClick={() => setOffset(offset + PAGE_SIZE)}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </MobileContainer>
        <Footer />
      </div>
    </MobileLayout>
  )
}

function GameList({ games }: { games: V2GameListItem[] }) {
  return (
    <>
      <div className="divide-y md:hidden">
        {games.map(game => (
          <div key={game.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-gray-900">{game.platform} / {game.username}</div>
                <div className="text-sm text-gray-500">{formatDate(game.game_time)}</div>
              </div>
              <Badge variant={game.result === "draw" ? "outline" : "secondary"}>{formatLabel(game.result)}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase text-gray-500">Time</div>
                <div>{game.time_control} · {formatLabel(game.time_class || "unknown")}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">Color</div>
                <div>{formatLabel(game.user_color)}</div>
              </div>
            </div>
            {game.url && (
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href={`/games/${encodeURIComponent(game.id)}`} className="inline-flex items-center text-sm text-emerald-700 hover:underline">
                  Details
                  <Eye className="h-3.5 w-3.5 ml-1" />
                </Link>
                <Link href={game.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-blue-700 hover:underline">
                  Open game
                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </Link>
              </div>
            )}
            {!game.url && (
              <Link href={`/games/${encodeURIComponent(game.id)}`} className="mt-3 inline-flex items-center text-sm text-emerald-700 hover:underline">
                Details
                <Eye className="h-3.5 w-3.5 ml-1" />
              </Link>
            )}
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <GameTable games={games} />
      </div>
    </>
  )
}

function GameTable({ games }: { games: V2GameListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Game</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Result</TableHead>
          <TableHead>Color</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {games.map(game => (
          <TableRow key={game.id}>
            <TableCell>
              <div className="font-medium text-gray-900">{game.platform} / {game.username}</div>
              <div className="text-xs text-gray-500">{formatDate(game.game_time)}</div>
            </TableCell>
            <TableCell>
              <div>{game.time_control}</div>
              <div className="text-xs text-gray-500">{formatLabel(game.time_class || "unknown")}</div>
            </TableCell>
            <TableCell>
              <Badge variant={game.result === "draw" ? "outline" : "secondary"}>{formatLabel(game.result)}</Badge>
            </TableCell>
            <TableCell>{formatLabel(game.user_color)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-3">
                <Link href={`/games/${encodeURIComponent(game.id)}`} className="inline-flex items-center text-sm text-emerald-700 hover:underline">
                  Details
                  <Eye className="h-3.5 w-3.5 ml-1" />
                </Link>
                {game.url && (
                  <Link href={game.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-blue-700 hover:underline">
                    Open
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Link>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
    <div className="py-12 px-6 text-center">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}
