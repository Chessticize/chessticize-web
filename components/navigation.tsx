"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Target,
  Brain,
  History,
  BarChart3,
  Settings,
  ArrowLeft,
} from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import type { TranslationKey } from "@/lib/i18n"

const navigationItems: ReadonlyArray<{
  href: string
  matchPrefixes?: readonly string[]
  labelKey: TranslationKey
  icon: typeof Target
}> = [
  { href: "/puzzle-sprint", matchPrefixes: ["/puzzle-sprint", "/dashboard"], labelKey: "nav.puzzleSprint", icon: Target },
  { href: "/review-queue", labelKey: "nav.reviewQueue", icon: Brain },
  { href: "/history", labelKey: "nav.history", icon: History },
  { href: "/game-review", matchPrefixes: ["/game-review", "/games", "/puzzles"], labelKey: "nav.gameReview", icon: BarChart3 },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
]

interface NavigationProps {
  showBackButton?: boolean
  onBackClick?: () => void
  title?: string
}

export default function Navigation({ showBackButton = false, onBackClick, title }: NavigationProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const { t } = useI18n()

  // Warm all 5 primary tab routes in the client router cache for instant tab switches
  useEffect(() => {
    for (const item of navigationItems) {
      if (item.href !== pathname) {
        router.prefetch(item.href)
      }
    }
  }, [router, pathname])

  // Clear optimistic tab highlight once route settles
  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  // Safety fallback if navigation is cancelled or fails
  useEffect(() => {
    if (!pendingHref) return
    const timer = window.setTimeout(() => setPendingHref(null), 3000)
    return () => window.clearTimeout(timer)
  }, [pendingHref])

  const isRouteActive = (item: (typeof navigationItems)[number]) => {
    if (pendingHref) {
      return pendingHref === item.href
    }
    const prefixes = item.matchPrefixes ?? [item.href]
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  }

  const handleTabSelect = (href: string) => {
    if (pathname !== href) {
      setPendingHref(href)
    }
  }

  return (
    <>
      {/* Top Navigation Bar (Desktop only unless a page explicitly requests a mobile back button) */}
      <nav
        className={`${
          showBackButton ? "block" : "hidden lg:block"
        } sticky top-0 z-40 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur border-b border-slate-200 dark:border-[#38383A] px-4 py-3`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackClick}
                className="lg:hidden text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            <Link
              href="/puzzle-sprint"
              prefetch={true}
              className="text-xl lg:text-2xl font-semibold tracking-tight text-slate-900 dark:text-[#F2F2F7] hover:text-blue-600 dark:hover:text-[#4DA3FF] transition-colors truncate touch-manipulation"
            >
              {title || t("common.appName")}
            </Link>
          </div>

          {/* Desktop Navigation (5 clean pillars aligned with Mobile) */}
          <div className="hidden lg:flex items-center gap-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = isRouteActive(item)

              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={`flex items-center gap-2 font-medium touch-manipulation ${
                    isActive
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "text-slate-600 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2C2C2E]"
                  }`}
                >
                  <Link
                    href={item.href}
                    prefetch={true}
                    onClick={() => handleTabSelect(item.href)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                </Button>
              )
            })}
            <div className="ml-2 pl-2 border-l border-slate-200 dark:border-[#38383A]">
              <LanguageSwitcher compact />
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Navigation for Mobile — primary navigation bar (no redundant top bar/hamburger) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur border-t border-slate-200 dark:border-[#38383A] lg:hidden z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-center py-1 px-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = isRouteActive(item)

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => handleTabSelect(item.href)}
                aria-current={isActive ? "page" : undefined}
                className="flex-1 min-w-0 touch-manipulation select-none [-webkit-tap-highlight-color:transparent] active:scale-95 active:opacity-75 transition-transform duration-75"
              >
                <div
                  className={`flex flex-col items-center py-1.5 px-1 rounded-lg transition-colors duration-100 ${
                    isActive
                      ? "text-blue-600 dark:text-[#4DA3FF]"
                      : "text-slate-500 dark:text-[#AEAEB2]"
                  }`}
                >
                  <Icon className="h-5 w-5 mb-0.5 shrink-0" />
                  <span className="text-[11px] font-medium truncate max-w-full">
                    {t(item.labelKey)}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
