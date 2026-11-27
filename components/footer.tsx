"use client"

import Link from "next/link"
import { Coffee } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/i18n/i18n-provider"

interface FooterProps {
  hideOnMobile?: boolean
  className?: string
}

const COPYRIGHT_YEAR = new Date().getFullYear()

export default function Footer({ hideOnMobile = true, className }: FooterProps = {}) {
  const { t } = useI18n()

  return (
    <footer
      className={cn(
        "bg-white dark:bg-[#1C1C1E] border-t border-slate-200 dark:border-[#38383A] text-slate-500 dark:text-[#AEAEB2] py-5 mt-auto",
        hideOnMobile && "hidden lg:block",
        className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-slate-500 dark:text-[#AEAEB2]">
            © {COPYRIGHT_YEAR} {t("common.appName")}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link
              href="/settings#about"
              className="text-slate-500 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {t("settings.about")}
            </Link>
            <Link
              href="https://github.com/Chessticize/chessticize-web"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="/privacy"
              className="text-slate-500 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {t("common.privacyPolicy")}
            </Link>
            <Link
              href="/terms"
              className="text-slate-500 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {t("common.termsOfService")}
            </Link>
            <Link
              href="https://coff.ee/tj9bwrx0r6"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-500 dark:text-[#AEAEB2] hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Coffee className="h-4 w-4" />
              <span>{t("common.buyMeACoffee")}</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
