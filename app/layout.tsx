import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth/auth-provider"
import { UserProvider } from "@/contexts/UserContext"
import { I18nProvider } from "@/components/i18n/i18n-provider"
import { resolveServerI18n } from "@/lib/i18n/server"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
}

export const metadata: Metadata = {
  title: "Chessticize - Chess Training Platform",
  description: "Improve your chess skills with tactical training and game analysis",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chessticize",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { locale, preference } = await resolveServerI18n()

  return (
    <html lang={locale} className="scroll-smooth" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          storageKey="chessticize_theme_mode"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider initialLocale={locale} initialPreference={preference}>
            <AuthProvider>
              <UserProvider>
                {children}
              </UserProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
