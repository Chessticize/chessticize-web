"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { MobileLayout, MobileContainer } from "@/components/ui/mobile-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  User,
  Trash2,
  Plus,
  Loader2,
  Globe,
  Info,
  ExternalLink,
  Mail,
  MessageSquare,
  Scale,
  Code2,
  Coffee,
} from "lucide-react"
import { useAuthContext } from "@/components/auth/auth-provider"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useUserContext } from "@/hooks/useUserContext"
import { useI18n } from "@/components/i18n/i18n-provider"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { BoardThemeSelector } from "@/components/settings/board-theme-selector"
import { deleteChessProfile, getChessProfiles } from "@/lib/api/auth"
import { toast } from "@/hooks/use-toast"
import { useChessProfiles } from "@/hooks/useChessProfiles"
import { useChessUsernameValidation } from "@/hooks/useChessUsernameValidation"
import { ChessUsernameInput } from "@/components/ui/chess-username-input"

const SOURCE_REPO_URL = "https://github.com/Chessticize/chessticize-web"
const SOURCE_LICENSE_URL = `${SOURCE_REPO_URL}/blob/main/LICENSE`
const FEEDBACK_ISSUES_URL = `${SOURCE_REPO_URL}/issues/new`
const SUPPORT_EMAIL = "support@chessticize.com"
const COPYRIGHT_YEAR = new Date().getFullYear()

export default function SettingsPage() {
  const { logout } = useAuthContext()
  const { t } = useI18n()
  const { user, isLoading: isLoadingUser, error: userError, updateChessProfiles } = useUserContext()
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

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [profileFormData, setProfileFormData] = useState({
    lichessUsername: "",
    chessComUsername: ""
  })
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false)
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null)
  const [validatingUsernames, setValidatingUsernames] = useState(false)

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
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0D12]">
          <Navigation />

          <MobileContainer padding="lg" className="flex-1 pb-24 sm:pb-8">
            <div className="flex items-start justify-between mb-6 sm:mb-8 gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#F2F2F7]">
                  {t("settings.title")}
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-[#AEAEB2] mt-1">
                  {t("settings.subtitle")}
                </p>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="shrink-0 bg-white dark:bg-[#1C1C1E] text-red-600 dark:text-[#FF6961] border-slate-200 dark:border-[#38383A] hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-200 text-sm"
              >
                {t("common.signOut")}
              </Button>
            </div>

            <Card className="mb-6 bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] shadow-sm">
              <CardHeader className="py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-[#F2F2F7]">
                      <Globe className="h-4 w-4 text-blue-600 dark:text-[#4DA3FF]" />
                      <span>{t("language.sectionTitle")}</span>
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm text-slate-500 dark:text-[#AEAEB2]">
                      {t("language.sectionDescription")}
                    </CardDescription>
                  </div>
                  <LanguageSwitcher />
                </div>
              </CardHeader>
            </Card>

            <BoardThemeSelector />

            {(successMessage || userError || profileError) && (
              <div className="mb-6 space-y-3">
                {successMessage && (
                  <Alert className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-[#4CD964]">
                    <AlertTitle className="text-emerald-900 dark:text-[#4CD964] font-semibold">Profile added</AlertTitle>
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                )}
                {userError && (
                  <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-[#FF6961]">
                    <AlertTitle className="text-red-900 dark:text-[#FF6961] font-semibold">User error</AlertTitle>
                    <AlertDescription>{userError}</AlertDescription>
                  </Alert>
                )}
                {profileError && (
                  <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-[#FF6961]">
                    <AlertTitle className="text-red-900 dark:text-[#FF6961] font-semibold">Profile error</AlertTitle>
                    <AlertDescription>{profileError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <Card className="mb-6 bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-[#F2F2F7]">
                      <User className="h-4 w-4 text-blue-600 dark:text-[#4DA3FF]" />
                      <span>{t("settings.chessProfiles")}</span>
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm text-slate-500 dark:text-[#AEAEB2]">
                      {t("settings.chessProfilesDesc")}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-[#0A6FE0] dark:hover:bg-[#1980F5] text-white sm:w-auto"
                    disabled={isCreatingProfile || isLoadingUser || isLoadingProfiles || (hasLichessProfile && hasChessComProfile)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {hasLichessProfile && hasChessComProfile ? t("settings.allConnected") : t("settings.addProfile")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingUser || isLoadingProfiles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-[#4DA3FF]" />
                    <span className="ml-2 text-slate-600 dark:text-[#AEAEB2]">{t("settings.loadingProfiles")}</span>
                  </div>
                ) : chessProfiles.length > 0 ? (
                  <div className="space-y-3">
                    {chessProfiles.map((profile) => (
                      <div key={profile.id} className="rounded-lg border border-slate-200 dark:border-[#38383A] bg-slate-50 dark:bg-[#262628] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 dark:text-[#F2F2F7]">{profile.platform}</div>
                            <div className="text-sm text-slate-600 dark:text-[#D1D1D6]">@{profile.username}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-[#AEAEB2] tabular-nums">
                              {t("settings.gamesFetched", { count: profile.games_fetched })}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#4CD964] border border-emerald-200 dark:border-emerald-800 shadow-none font-medium">
                              {t("settings.connected")}
                            </Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 dark:text-[#FF6961] hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700"
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
                                  <AlertDialogTitle>{t("settings.deleteProfileTitle")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This removes @{profile.username} from your connected profiles. Imported game and puzzle cleanup is handled by the server.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleDeleteProfile(profile.id)}
                                  >
                                    {t("settings.delete")}
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
                  <div className="rounded-lg border border-dashed border-slate-300 dark:border-[#38383A] p-6 text-center">
                    <User className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-[#636366]" />
                    <h3 className="font-semibold text-slate-900 dark:text-[#F2F2F7]">{t("settings.noProfilesTitle")}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-[#AEAEB2]">
                      {t("settings.noProfilesDesc")}
                    </p>
                  </div>
                )}

                {showCreateForm && (
                  <form onSubmit={handleCreateProfile} className="mt-6 rounded-lg border border-slate-200 dark:border-[#38383A] bg-slate-50 dark:bg-[#262628] p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 dark:text-[#F2F2F7]">{t("settings.addChessProfile")}</h3>
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
                        {t("common.cancel")}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {!hasLichessProfile && (
                        <ChessUsernameInput
                          id="lichessUsername"
                          label={t("settings.lichessUsername")}
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
                          label={t("settings.chessComUsername")}
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
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={isCreatingProfile || validatingUsernames || (!profileFormData.lichessUsername.trim() && !profileFormData.chessComUsername.trim())}
                      >
                        {(isCreatingProfile || validatingUsernames) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("settings.connectProfilesBtn")}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* About, Open-Source Licenses & Feedback (aligned with Mobile App) */}
            <Card id="about" className="bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-[#F2F2F7]">
                  <Info className="h-4 w-4 text-blue-600 dark:text-[#4DA3FF]" />
                  <span>{t("settings.about")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href={SOURCE_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#38383A] bg-slate-50/70 dark:bg-[#262628] px-3.5 py-3 text-sm text-slate-800 dark:text-[#F2F2F7] hover:border-blue-300 dark:hover:border-[#2463A8] transition-colors"
                  >
                    <span className="flex items-center gap-2.5 font-medium">
                      <Code2 className="h-4 w-4 text-blue-600 dark:text-[#4DA3FF] shrink-0" />
                      <span>{t("settings.sourceCode")}</span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-[#8E8E93] shrink-0" />
                  </a>

                  <a
                    href={SOURCE_LICENSE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#38383A] bg-slate-50/70 dark:bg-[#262628] px-3.5 py-3 text-sm text-slate-800 dark:text-[#F2F2F7] hover:border-blue-300 dark:hover:border-[#2463A8] transition-colors"
                  >
                    <span className="flex items-center gap-2.5 font-medium">
                      <Scale className="h-4 w-4 text-blue-600 dark:text-[#4DA3FF] shrink-0" />
                      <span>{t("settings.license")}</span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-[#8E8E93] shrink-0" />
                  </a>

                  <a
                    href={FEEDBACK_ISSUES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#38383A] bg-slate-50/70 dark:bg-[#262628] px-3.5 py-3 text-sm text-slate-800 dark:text-[#F2F2F7] hover:border-blue-300 dark:hover:border-[#2463A8] transition-colors"
                  >
                    <span className="flex items-center gap-2.5 font-medium">
                      <MessageSquare className="h-4 w-4 text-blue-600 dark:text-[#4DA3FF] shrink-0" />
                      <span>{t("settings.sendFeedback")}</span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-[#8E8E93] shrink-0" />
                  </a>

                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#38383A] bg-slate-50/70 dark:bg-[#262628] px-3.5 py-3 text-sm text-slate-800 dark:text-[#F2F2F7] hover:border-blue-300 dark:hover:border-[#2463A8] transition-colors"
                  >
                    <span className="flex items-center gap-2.5 font-medium min-w-0">
                      <Mail className="h-4 w-4 text-blue-600 dark:text-[#4DA3FF] shrink-0" />
                      <span className="truncate">{SUPPORT_EMAIL}</span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-[#8E8E93] shrink-0" />
                  </a>
                </div>

                {/* Open-Source Notices */}
                <div className="rounded-xl border border-slate-200 dark:border-[#38383A] bg-slate-50/50 dark:bg-[#262628]/70 p-3.5 space-y-1.5 text-xs text-slate-600 dark:text-[#AEAEB2]">
                  <div className="font-semibold text-slate-800 dark:text-[#F2F2F7] mb-1">
                    {t("settings.openSourceTitle")}
                  </div>
                  <p>
                    <a
                      href="https://github.com/official-stockfish/Stockfish"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 dark:text-[#4DA3FF] hover:underline"
                    >
                      Stockfish
                    </a>{" "}
                    (GPL-3.0) powers browser position analysis.
                  </p>
                  <p>
                    <a
                      href="https://database.lichess.org/#puzzles"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 dark:text-[#4DA3FF] hover:underline"
                    >
                      Lichess Puzzle Database
                    </a>{" "}
                    (CC0) provides tactical sprint puzzles.
                  </p>
                  <p>
                    <a
                      href="https://github.com/jhlywa/chess.js"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 dark:text-[#4DA3FF] hover:underline"
                    >
                      chess.js
                    </a>{" "}
                    (BSD-2-Clause) handles board move validation.
                  </p>
                </div>

                {/* Legal + Support Links (shown on mobile/tablet where desktop Footer is hidden) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500 dark:text-[#AEAEB2] lg:hidden">
                  <span>© {COPYRIGHT_YEAR} {t("common.appName")}</span>
                  <div className="flex flex-wrap items-center gap-4">
                    <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                      {t("common.privacyPolicy")}
                    </Link>
                    <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                      {t("common.termsOfService")}
                    </Link>
                    <a
                      href="https://coff.ee/tj9bwrx0r6"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <Coffee className="h-3.5 w-3.5" />
                      <span>{t("common.buyMeACoffee")}</span>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </MobileContainer>

          <Footer hideOnMobile={true} />
        </div>
      </MobileLayout>
    </ProtectedRoute>
  )
}
