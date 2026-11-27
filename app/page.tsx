"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Footer from "@/components/footer"
import { Target, Swords, ChevronRight } from "lucide-react"
import { useAuthContext } from "@/components/auth/auth-provider"
import { hasValidAuth } from "@/lib/auth/tokens"
import { navigateToAuth } from "@/lib/auth/navigation"
import { useI18n } from "@/components/i18n/i18n-provider"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthContext()
  const { t } = useI18n()

  const hasTokens = hasValidAuth()

  if (!isLoading && isAuthenticated) {
    router.push("/puzzle-sprint")
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-slate-600">{t("landing.redirecting")}</p>
        </div>
      </div>
    )
  }

  if (isLoading || (hasTokens && !isAuthenticated)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-slate-600">
            {hasTokens ? t("landing.signingIn") : t("common.loading")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0D12] flex flex-col">
      <header className="w-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 flex items-center justify-end">
          <LanguageSwitcher compact />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-[#F2F2F7] mb-4">
              {t("common.appName")}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-[#AEAEB2] max-w-2xl mx-auto leading-relaxed">
              {t("landing.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-10 text-left">
            <Card className="bg-blue-50/60 dark:bg-[#0B2A4D]/70 border-blue-200 dark:border-[#16467A] shadow-sm">
              <CardContent className="p-6">
                <div className="bg-blue-600 dark:bg-[#0A6FE0] text-white p-2.5 rounded-lg w-fit mb-4 shadow-xs">
                  <Target className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-[#F2F2F7] mb-1.5">
                  {t("nav.puzzleSprint")}
                </h3>
                <p className="text-slate-600 dark:text-[#D1D1D6] text-sm leading-relaxed">
                  {t("landing.puzzleSprintDesc")}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-[#38383A] shadow-sm">
              <CardContent className="p-6">
                <div className="bg-blue-50 dark:bg-[#0B2A4D] border border-blue-100 dark:border-[#16467A] text-blue-600 dark:text-[#4DA3FF] p-2.5 rounded-lg w-fit mb-4">
                  <Swords className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-[#F2F2F7] mb-1.5">
                  {t("common.arrowDuel")}
                </h3>
                <p className="text-slate-600 dark:text-[#AEAEB2] text-sm leading-relaxed">
                  {t("landing.arrowDuelDesc")}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              onClick={() => navigateToAuth(router)}
            >
              {t("landing.getStarted")}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>

      <Footer hideOnMobile={false} />
    </div>
  )
}
