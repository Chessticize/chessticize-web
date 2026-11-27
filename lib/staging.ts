"use client"

import { useEffect, useState } from "react"

/**
 * Returns true only for local development, staging, or Vercel preview hosts.
 * Explicitly returns false on production hosts (chessticize.com / www.chessticize.com).
 */
export function isStagingHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase()
  if (!normalized) return false
  if (
    normalized === "chessticize.com" ||
    normalized === "www.chessticize.com" ||
    normalized === "app.chessticize.com"
  ) {
    return false
  }
  if (normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1") {
    return true
  }
  if (normalized === "staging.chessticize.com" || normalized.startsWith("staging.")) {
    return true
  }
  if (normalized.endsWith(".vercel.app")) {
    return true
  }
  return false
}

export function useIsStagingEnvironment(): boolean {
  const [isStaging, setIsStaging] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    setIsStaging(isStagingHostname(window.location.hostname))
  }, [])

  return isStaging
}
