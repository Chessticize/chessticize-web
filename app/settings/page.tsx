"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { MobileLayout, MobileContainer, MobileCard } from "@/components/ui/mobile-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Settings as SettingsIcon, Info, User, Trash2, Plus, Loader2 } from "lucide-react"
import { useAuthContext } from "@/components/auth/auth-provider"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useUserContext } from "@/hooks/useUserContext"
import { apiPut } from "@/lib/auth/api-client"
import { API_CONFIG } from "@/lib/config"
import { deleteChessProfile, getChessProfiles } from "@/lib/api/auth"
import { getStandardEloType, getBlitzEloType, getArrowDuelEloType } from "@/lib/sprint-config"
import { toast } from "@/hooks/use-toast"
import { useChessProfiles } from "@/hooks/useChessProfiles"
import { useChessUsernameValidation } from "@/hooks/useChessUsernameValidation"
import { ChessUsernameInput } from "@/components/ui/chess-username-input"

export default function SettingsPage() {
  const { logout } = useAuthContext()
  const { user, isLoading: isLoadingUser, error: userError, refreshUser, updateChessProfiles } = useUserContext()
  const {
    isCreatingProfile,
    profileError,
    successMessage,
    createChessProfile,
    clearMessages
  } = useChessProfiles()
  const {
    chessComValidation,
    lichessValidation,
    validateChessComUsernameAsync,
    validateLichessUsernameAsync,
    clearValidation
  } = useChessUsernameValidation()

  const STANDARD = getStandardEloType()
  const BLITZ = getBlitzEloType()
  const ARROW = getArrowDuelEloType()

  const getCurrentRating = (eloType: string) =>
    user?.elos?.find((e) => e.elo_type === eloType)?.rating ?? 600

  const [standardElo, setStandardElo] = useState<number | "">("")
  const [blitzElo, setBlitzElo] = useState<number | "">("")
  const [arrowElo, setArrowElo] = useState<number | "">("")
  const [isSaving, setIsSaving] = useState(false)
  const [customElos, setCustomElos] = useState<Record<string, number | "">>({})
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [profileFormData, setProfileFormData] = useState({
    lichessUsername: "",
    chessComUsername: ""
  })
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false)
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null)
  const [validatingUsernames, setValidatingUsernames] = useState(false)

  // Snapshots to detect changes
  const [initialStandard, setInitialStandard] = useState<number>(600)
  const [initialBlitz, setInitialBlitz] = useState<number>(600)
  const [initialArrow, setInitialArrow] = useState<number>(600)
  const [initialCustomElos, setInitialCustomElos] = useState<Record<string, number>>({})
  const chessProfiles = user?.chess_profiles || []
  const hasLichessProfile = chessProfiles.some(profile => profile.platform === "lichess.org")
  const hasChessComProfile = chessProfiles.some(profile => profile.platform === "chess.com")

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    const loadProfiles = async () => {
      try {
        setIsLoadingProfiles(true)
        const profiles = await getChessProfiles()
        if (!cancelled) {
          updateChessProfiles(profiles)
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Failed to load chess profiles",
            description: error instanceof Error ? error.message : "Please try again",
            variant: "destructive" as any,
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfiles(false)
        }
      }
    }

    void loadProfiles()

    return () => {
      cancelled = true
    }
    // Settings deliberately refreshes profiles from v2 when the authenticated user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Initialize fields from user data
  useEffect(() => {
    const std = getCurrentRating(STANDARD)
    const blz = getCurrentRating(BLITZ)
    const arr = getCurrentRating(ARROW)

    setStandardElo(std)
    setBlitzElo(blz)
    setArrowElo(arr)

    setInitialStandard(std)
    setInitialBlitz(blz)
    setInitialArrow(arr)

    // Build initial custom elos map for any other elo types the user has
    const reserved = new Set<string>([STANDARD, BLITZ, ARROW])
    const map: Record<string, number> = {}
    user?.elos?.forEach((e) => {
      if (!reserved.has(e.elo_type)) {
        // clamp and coerce to valid range in case of stale values
        const val = Math.min(2700, Math.max(600, Math.round(e.rating)))
        map[e.elo_type] = val
      }
    })
    setCustomElos(map)
    setInitialCustomElos(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const isInvalidValue = (v: number | "") => v === "" || Number.isNaN(Number(v)) || Number(v) < 600 || Number(v) > 2700
  const invalidStandard = isInvalidValue(standardElo)
  const invalidBlitz = isInvalidValue(blitzElo)
  const invalidArrow = isInvalidValue(arrowElo)
  const hasInvalid = invalidStandard || invalidBlitz || invalidArrow || Object.values(customElos).some((v) => isInvalidValue(v))

  const changedUpdates = useMemo(() => {
    const updates: Array<{ elo_type: string; rating: number; rating_deviation?: number }> = []
    if (standardElo !== "" && Number(standardElo) !== initialStandard) updates.push({ elo_type: STANDARD, rating: Number(standardElo), rating_deviation: 50.0 })
    if (blitzElo !== "" && Number(blitzElo) !== initialBlitz) updates.push({ elo_type: BLITZ, rating: Number(blitzElo), rating_deviation: 50.0 })
    if (arrowElo !== "" && Number(arrowElo) !== initialArrow) updates.push({ elo_type: ARROW, rating: Number(arrowElo), rating_deviation: 50.0 })

    Object.entries(customElos).forEach(([elo_type, value]) => {
      const initial = initialCustomElos[elo_type]
      if (value !== "" && !Number.isNaN(Number(value)) && Number(value) !== initial) {
        updates.push({ elo_type, rating: Number(value), rating_deviation: 50.0 })
      }
    })

    return updates
  }, [standardElo, blitzElo, arrowElo, customElos, initialStandard, initialBlitz, initialArrow, initialCustomElos, STANDARD, BLITZ, ARROW])

  const onSave = async () => {
    try {
      setIsSaving(true)
      const updates = changedUpdates
      if (updates.length === 0) {
        setIsSaving(false)
        return
      }

      const res = await apiPut(`${API_CONFIG.BASE_URL}/me/elos`, { updates })
      if (!res.ok) {
        const msg = await res.text().catch(() => "Unknown error")
        throw new Error(`${res.status} ${res.statusText}. ${msg}`)
      }

      toast({ title: "ELOs updated", description: "Your training ratings were saved. RD set to 50 for stable puzzle matching." })

      // Reset snapshots to the saved values so the Save button disables
      if (standardElo !== "") setInitialStandard(Number(standardElo))
      if (blitzElo !== "") setInitialBlitz(Number(blitzElo))
      if (arrowElo !== "") setInitialArrow(Number(arrowElo))
      setInitialCustomElos(Object.fromEntries(
        Object.entries(customElos)
          .filter(([, v]) => v !== "" && !Number.isNaN(Number(v)))
          .map(([k, v]) => [k, Number(v as number)])
      ))

      await refreshUser()
    } catch (err) {
      toast({
        title: "Failed to update ELOs",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive" as any,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateProfile = async (event: FormEvent) => {
    event.preventDefault()

    if (!profileFormData.lichessUsername.trim() && !profileFormData.chessComUsername.trim()) {
      return
    }

    try {
      clearMessages()
      setValidatingUsernames(true)

      if (profileFormData.chessComUsername.trim() && !hasChessComProfile) {
        await validateChessComUsernameAsync(profileFormData.chessComUsername)
      }

      if (profileFormData.lichessUsername.trim() && !hasLichessProfile) {
        await validateLichessUsernameAsync(profileFormData.lichessUsername)
      }

      const createdProfiles = []

      if (profileFormData.lichessUsername.trim() && !hasLichessProfile) {
        const lichessProfile = await createChessProfile("lichess.org", profileFormData.lichessUsername.trim())
        createdProfiles.push(lichessProfile)
      }

      if (profileFormData.chessComUsername.trim() && !hasChessComProfile) {
        const chessComProfile = await createChessProfile("chess.com", profileFormData.chessComUsername.trim())
        createdProfiles.push(chessComProfile)
      }

      updateChessProfiles([...chessProfiles, ...createdProfiles])
      setShowCreateForm(false)
      setProfileFormData({ lichessUsername: "", chessComUsername: "" })
      clearValidation()
    } finally {
      setValidatingUsernames(false)
    }
  }

  const handleDeleteProfile = async (profileId: string) => {
    try {
      setDeletingProfileId(profileId)
      await deleteChessProfile(profileId)
      updateChessProfiles(chessProfiles.filter(profile => profile.id !== profileId))
    } catch (error) {
      toast({
        title: "Failed to delete chess profile",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive" as any,
      })
    } finally {
      setDeletingProfileId(null)
    }
  }

  return (
    <ProtectedRoute>
      <MobileLayout fullHeight>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Navigation />

          <MobileContainer padding="lg">
            <MobileCard padding="lg" className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center">
                    <SettingsIcon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 mr-2 sm:mr-3 text-blue-600" />
                    Settings
                  </h1>
                  <p className="text-base sm:text-lg lg:text-xl text-gray-600">Manage your account</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={logout}
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 text-sm sm:text-base"
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </MobileCard>

          {(successMessage || userError || profileError) && (
            <div className="mb-6 space-y-3">
              {successMessage && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <AlertTitle className="text-green-900 font-semibold">Profile added</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}
              {userError && (
                <Alert className="border-red-200 bg-red-50 text-red-800">
                  <AlertTitle className="text-red-900 font-semibold">User error</AlertTitle>
                  <AlertDescription>{userError}</AlertDescription>
                </Alert>
              )}
              {profileError && (
                <Alert className="border-red-200 bg-red-50 text-red-800">
                  <AlertTitle className="text-red-900 font-semibold">Profile error</AlertTitle>
                  <AlertDescription>{profileError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <MobileCard padding="lg" className="mb-6">
            <Card className="border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <User className="h-5 w-5 text-blue-600" />
                      <span>Chess Profiles</span>
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm sm:text-base">
                      Connect Chess.com and Lichess accounts to import games and analyze tactical patterns.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto"
                    disabled={isCreatingProfile || isLoadingUser || isLoadingProfiles || (hasLichessProfile && hasChessComProfile)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {hasLichessProfile && hasChessComProfile ? "All Platforms Connected" : "Add Profile"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingUser || isLoadingProfiles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading profiles...</span>
                  </div>
                ) : chessProfiles.length > 0 ? (
                  <div className="space-y-4">
                    {chessProfiles.map((profile) => (
                      <div key={profile.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900">{profile.platform}</div>
                            <div className="text-sm text-gray-600">@{profile.username}</div>
                            <div className="mt-1 text-xs text-gray-500">
                              {profile.games_fetched} games fetched
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Connected
                            </Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                  disabled={deletingProfileId === profile.id}
                                  aria-label={`Delete ${profile.platform} profile ${profile.username}`}
                                >
                                  {deletingProfileId === profile.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete chess profile?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This removes @{profile.username} from your connected profiles. Imported game and puzzle cleanup is handled by the server.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleDeleteProfile(profile.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                    <User className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    <h3 className="font-semibold text-gray-900">No chess profiles connected</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Add a profile to start importing games and generating personal tactical analysis.
                    </p>
                  </div>
                )}

                {showCreateForm && (
                  <form onSubmit={handleCreateProfile} className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-blue-900">Add Chess Profile</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCreateForm(false)
                          setProfileFormData({ lichessUsername: "", chessComUsername: "" })
                          clearValidation()
                          clearMessages()
                        }}
                      >
                        Cancel
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {!hasLichessProfile && (
                        <ChessUsernameInput
                          id="lichessUsername"
                          label="Lichess Username"
                          placeholder="your-lichess-username"
                          value={profileFormData.lichessUsername}
                          onChange={(value) => setProfileFormData(prev => ({ ...prev, lichessUsername: value }))}
                          onValidate={validateLichessUsernameAsync}
                          validation={lichessValidation}
                          disabled={isCreatingProfile || validatingUsernames}
                        />
                      )}

                      {!hasChessComProfile && (
                        <ChessUsernameInput
                          id="chessComUsername"
                          label="Chess.com Username"
                          placeholder="your-chesscom-username"
                          value={profileFormData.chessComUsername}
                          onChange={(value) => setProfileFormData(prev => ({ ...prev, chessComUsername: value }))}
                          onValidate={validateChessComUsernameAsync}
                          validation={chessComValidation}
                          disabled={isCreatingProfile || validatingUsernames}
                        />
                      )}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={isCreatingProfile || validatingUsernames || (!profileFormData.lichessUsername.trim() && !profileFormData.chessComUsername.trim())}
                      >
                        {(isCreatingProfile || validatingUsernames) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Connect Profiles
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </MobileCard>

          <MobileCard padding="lg" className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">ELO Settings</h2>
              <p className="text-sm text-gray-600 mt-1">Adjust your training ratings so you get puzzles at the right difficulty.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="standardElo">Standard Sprint ({STANDARD})</Label>
                <Input
                  id="standardElo"
                  type="number"
                  inputMode="numeric"
                  min={600}
                  max={2700}
                  step={25}
                  value={standardElo}
                  onChange={(e) => setStandardElo(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g., 1400"
                  className={invalidStandard ? "border-red-300 focus-visible:ring-red-500" : undefined}
                  aria-invalid={invalidStandard}
                />
                {invalidStandard && (
                  <p className="text-xs text-red-600">Enter a rating between 600 and 2700.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="blitzElo">Blitz Sprint ({BLITZ})</Label>
                <Input
                  id="blitzElo"
                  type="number"
                  inputMode="numeric"
                  min={600}
                  max={2700}
                  step={25}
                  value={blitzElo}
                  onChange={(e) => setBlitzElo(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g., 1400"
                  className={invalidBlitz ? "border-red-300 focus-visible:ring-red-500" : undefined}
                  aria-invalid={invalidBlitz}
                />
                {invalidBlitz && (
                  <p className="text-xs text-red-600">Enter a rating between 600 and 2700.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="arrowElo">Arrow Duel ({ARROW})</Label>
                <Input
                  id="arrowElo"
                  type="number"
                  inputMode="numeric"
                  min={600}
                  max={2700}
                  step={25}
                  value={arrowElo}
                  onChange={(e) => setArrowElo(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g., 1400"
                  className={invalidArrow ? "border-red-300 focus-visible:ring-red-500" : undefined}
                  aria-invalid={invalidArrow}
                />
                {invalidArrow && (
                  <p className="text-xs text-red-600">Enter a rating between 600 and 2700.</p>
                )}
              </div>
            </div>

            {/* Custom ELOs section */}
            {Object.keys(customElos).length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-2">Custom ELOs</h3>
                <p className="text-sm text-gray-600 mb-4">Modify any additional ELO types you already have.</p>
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(customElos).map(([eloType, value]) => (
                    <div className="space-y-2" key={eloType}>
                      <Label htmlFor={`custom-${eloType}`}>{eloType}</Label>
                      <Input
                        id={`custom-${eloType}`}
                        type="number"
                        inputMode="numeric"
                        min={600}
                        max={2700}
                        step={25}
                        value={value}
                        onChange={(e) => {
                          const v = e.target.value === "" ? "" : Number(e.target.value)
                          setCustomElos((prev) => ({ ...prev, [eloType]: v }))
                        }}
                        placeholder="e.g., 1400"
                        className={isInvalidValue(value as number | "") ? "border-red-300 focus-visible:ring-red-500" : undefined}
                        aria-invalid={isInvalidValue(value as number | "")}
                      />
                      {isInvalidValue(value as number | "") && (
                        <p className="text-xs text-red-600">Enter a rating between 600 and 2700.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button onClick={onSave} disabled={isSaving || hasInvalid || !user || changedUpdates.length === 0}>
                {isSaving ? "Saving..." : "Save ELOs"}
              </Button>
            </div>

            <Alert className="border-blue-200 bg-blue-50 text-blue-800 mt-4">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900 font-semibold">About ratings</AlertTitle>
              <AlertDescription className="text-blue-700">
                Chessticize uses the Lichess puzzle library; puzzle ratings follow Lichess puzzle ratings. Updating your ELO here also sets rating deviation (RD) to 50 so puzzle selection uses a stable rating estimate.
              </AlertDescription>
            </Alert>
          </MobileCard>
        </MobileContainer>

        <Footer hideOnMobile={true} />
      </div>
      </MobileLayout>
    </ProtectedRoute>
  )
}
