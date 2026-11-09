"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Loader2, Puzzle, Search } from "lucide-react"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { MobileContainer, MobileLayout } from "@/components/ui/mobile-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getPuzzles, type V2PuzzleListItem, type V2PuzzleListResponse } from "@/lib/api/library"
import { useUserContext } from "@/hooks/useUserContext"

const PAGE_SIZE = 20
const EMPTY_PUZZLE_FILTERS = {
  platform: "",
  username: "",
  themeGroup: "",
  gamePhase: "",
  tag: "",
}

export default function PuzzlesPage() {
  const { user, isLoading: isLoadingUser, error: userError } = useUserContext()
  const [platform, setPlatform] = useState("")
  const [username, setUsername] = useState("")
  const [themeGroup, setThemeGroup] = useState("")
  const [gamePhase, setGamePhase] = useState("")
  const [tag, setTag] = useState("")
  const [filters, setFilters] = useState(EMPTY_PUZZLE_FILTERS)
  const [offset, setOffset] = useState(0)
  const [data, setData] = useState<V2PuzzleListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    const loadPuzzles = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const puzzles = await getPuzzles({
          platform: filters.platform,
          username: filters.username,
          theme_groups: filters.themeGroup,
          game_phase: filters.gamePhase,
          tags: filters.tag,
          offset,
          limit: PAGE_SIZE,
        })
        if (!cancelled) {
          setData(puzzles)
        }
      } catch (loadError) {
        if (!cancelled) {
          setData(null)
          setError(loadError instanceof Error ? loadError.message : "Failed to load puzzles")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPuzzles()

    return () => {
      cancelled = true
    }
  }, [user?.id, filters, offset])

  const totalCount = data?.total_count ?? 0
  const puzzles = data?.puzzles ?? []
  const hasNextPage = offset + PAGE_SIZE < totalCount
  const pageStart = totalCount === 0 ? 0 : offset + 1
  const pageEnd = Math.min(offset + PAGE_SIZE, totalCount)
  const importedProfiles = user?.chess_profiles?.filter(profile => (profile.games_fetched || 0) > 0) ?? []
  const activeFilterCount = useMemo(() => {
    return [filters.platform, filters.username, filters.themeGroup, filters.gamePhase, filters.tag].filter(Boolean).length
  }, [filters])

  const applyFilters = (event: FormEvent) => {
    event.preventDefault()
    setFilters({
      platform,
      username: username.trim(),
      themeGroup,
      gamePhase,
      tag: tag.trim(),
    })
    setOffset(0)
  }

  const clearFilters = () => {
    setPlatform("")
    setUsername("")
    setThemeGroup("")
    setGamePhase("")
    setTag("")
    setFilters(EMPTY_PUZZLE_FILTERS)
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
                <div className="bg-violet-100 p-3 rounded-lg">
                  <Puzzle className="h-7 w-7 text-violet-700" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">My Puzzles</h1>
                  <p className="text-gray-600 mt-1">Browse tactical positions generated from your games.</p>
                </div>
              </div>
              <Badge variant="outline" className="self-start sm:self-auto">
                {totalCount.toLocaleString()} puzzles
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
            <EmptyState title="Sign in to view puzzles" message="Your generated tactical positions appear here after sign-in." />
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
                  <form onSubmit={applyFilters} className="grid gap-4 lg:grid-cols-6">
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
                      <Label htmlFor="theme-group">Theme Group</Label>
                      <select id="theme-group" value={themeGroup} onChange={(event) => setThemeGroup(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">All</option>
                        <option value="missed_opportunity">Missed Opportunity</option>
                        <option value="caught_opportunity">Caught Opportunity</option>
                        <option value="own_mistake_punished">Own Mistake Punished</option>
                        <option value="own_mistake_escaped">Own Mistake Escaped</option>
                        <option value="missed_attack">Missed Attack</option>
                        <option value="caught_attack">Caught Attack</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="game-phase">Game Phase</Label>
                      <select id="game-phase" value={gamePhase} onChange={(event) => setGamePhase(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">All</option>
                        <option value="opening">Opening</option>
                        <option value="middlegame">Middlegame</option>
                        <option value="endgame">Endgame</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tag">Tag</Label>
                      <Input id="tag" value={tag} onChange={(event) => setTag(event.target.value)} placeholder="fork" />
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
                              themeGroup: "",
                              gamePhase: "",
                              tag: "",
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
                    <LoadingState label="Loading puzzles..." />
                  ) : error ? (
                    <EmptyState title="Could not load puzzles" message={error} />
                  ) : puzzles.length === 0 ? (
                    <EmptyState title="No puzzles found" message="Try another profile, theme group, phase, or tag." />
                  ) : (
                    <PuzzleList puzzles={puzzles} />
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

function PuzzleList({ puzzles }: { puzzles: V2PuzzleListItem[] }) {
  return (
    <>
      <div className="divide-y md:hidden">
        {puzzles.map(puzzle => (
          <div key={puzzle.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-gray-900">{formatLabel(puzzle.theme)}</div>
                <div className="text-sm text-gray-500">{formatLabel(puzzle.theme_group || "unclassified")}</div>
              </div>
              <Badge variant="outline">{formatLabel(puzzle.puzzle_color)}</Badge>
            </div>
            <div className="mt-3 font-mono text-xs text-gray-700 break-all">{puzzle.fen}</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase text-gray-500">Game</div>
                <div>{puzzle.game.platform} / {puzzle.game.username}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500">Move</div>
                <div>{puzzle.game_move} · {formatLabel(puzzle.game_phase || "unknown")}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {puzzle.tags.slice(0, 4).map(tag => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
            <Link href={`/puzzles/${encodeURIComponent(puzzle.id)}`} className="mt-3 inline-flex items-center text-sm text-violet-700 hover:underline">
              Details
              <Eye className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <PuzzleTable puzzles={puzzles} />
      </div>
    </>
  )
}

function PuzzleTable({ puzzles }: { puzzles: V2PuzzleListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Puzzle</TableHead>
          <TableHead>Game</TableHead>
          <TableHead>Theme</TableHead>
          <TableHead>Move</TableHead>
          <TableHead>Color</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {puzzles.map(puzzle => (
          <TableRow key={puzzle.id}>
            <TableCell>
              <div className="font-mono text-xs text-gray-700 max-w-[260px] truncate">{puzzle.fen}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {puzzle.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <div className="font-medium text-gray-900">{puzzle.game.platform} / {puzzle.game.username}</div>
              <div className="text-xs text-gray-500">{formatDate(puzzle.game.game_time)} · {puzzle.game.time_control}</div>
            </TableCell>
            <TableCell>
              <div>{formatLabel(puzzle.theme)}</div>
              <div className="text-xs text-gray-500">{formatLabel(puzzle.theme_group || "unclassified")}</div>
            </TableCell>
            <TableCell>
              <div>{puzzle.game_move}</div>
              <div className="text-xs text-gray-500">{formatLabel(puzzle.game_phase || "unknown")}</div>
            </TableCell>
            <TableCell>{formatLabel(puzzle.puzzle_color)}</TableCell>
            <TableCell className="text-right">
              <Link href={`/puzzles/${encodeURIComponent(puzzle.id)}`} className="inline-flex items-center text-sm text-violet-700 hover:underline">
                Details
                <Eye className="h-3.5 w-3.5 ml-1" />
              </Link>
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
