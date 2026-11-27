"use client"

import type React from "react"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthContext } from "@/components/auth/auth-provider"
import {
  getStoredEmailForSignIn,
  isCurrentUrlSignInLink,
} from "@/lib/firebase/auth"
import {
  getCurrentUrl,
  isBrowser
} from "@/lib/firebase/client-only"

function MagicLinkContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)
  const [emailInput, setEmailInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const attemptedRef = useRef(false)
  const router = useRouter()
  const { signInWithEmailLink, isFirebaseAvailable, isAuthenticated } = useAuthContext()

  useEffect(() => {
    if (!isBrowser()) {
      return
    }

    if (isAuthenticated) {
      router.push("/dashboard")
      return
    }

    if (attemptedRef.current) {
      return
    }
    attemptedRef.current = true

    const handleMagicLink = async () => {
      if (!isFirebaseAvailable) {
        setError("Magic link authentication is not available")
        setIsLoading(false)
        return
      }

      if (!isCurrentUrlSignInLink()) {
        setError("Invalid or expired sign-in link")
        setIsLoading(false)
        return
      }

      const storedEmail = getStoredEmailForSignIn()
      if (!storedEmail) {
        // Common on mobile when requesting the link in one browser (e.g. iOS Chrome)
        // and tapping the email link into another browser/webview (e.g. Safari / Mail).
        setNeedsEmailConfirmation(true)
        setIsLoading(false)
        return
      }

      try {
        const currentUrl = getCurrentUrl()
        await signInWithEmailLink(storedEmail, currentUrl)
        setSuccess(true)
        setIsLoading(false)
      } catch (err) {
        console.error("Magic link sign-in failed:", err)
        setError(err instanceof Error ? err.message : "Failed to sign in with magic link")
        setIsLoading(false)
      }
    }

    handleMagicLink()
  }, [signInWithEmailLink, isFirebaseAvailable, isAuthenticated, router])

  const handleConfirmEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = emailInput.trim()
    if (!trimmedEmail) {
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const currentUrl = getCurrentUrl()
      await signInWithEmailLink(trimmedEmail, currentUrl)
      setNeedsEmailConfirmation(false)
      setSuccess(true)
    } catch (err) {
      console.error("Magic link email confirmation sign-in failed:", err)
      setError(err instanceof Error ? err.message : "Failed to sign in with magic link")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <Card className="w-full border-slate-200">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600 mx-auto" />
                <p className="mt-3 text-sm text-slate-600">Signing you in...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (needsEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <Card className="w-full border-slate-200 bg-white shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-semibold text-slate-900">Confirm your email</CardTitle>
              <CardDescription className="text-slate-600">
                Enter the email address you used to request this sign-in link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleConfirmEmailSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="confirm-email" className="text-slate-700">Email address</Label>
                  <Input
                    id="confirm-email"
                    type="email"
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    autoComplete="email"
                    className="mt-1 border-slate-200"
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isSubmitting || !emailInput.trim()}
                >
                  {isSubmitting ? "Signing in..." : "Complete Sign-In"}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link href="/auth" className="text-sm text-blue-600 hover:text-blue-700 underline">
                  Back to Sign In
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <Card className="w-full border-slate-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-semibold text-emerald-700">Welcome!</CardTitle>
              <CardDescription>You&apos;ve been successfully signed in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                  <p className="text-sm text-emerald-700">
                    Magic link authentication successful
                  </p>
                </div>

                <p className="text-sm text-slate-600">
                  Redirecting you to the dashboard...
                </p>

                <Link href="/dashboard">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Continue to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <Card className="w-full border-slate-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold text-red-600">Sign-in Failed</CardTitle>
            <CardDescription>There was a problem with your magic link</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="text-center space-y-4">
              <p className="text-sm text-slate-600">
                The magic link may have expired or been used already.
                Please try signing in again.
              </p>

              <div className="space-y-2">
                <Link href="/auth">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Try Again
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-slate-200">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600 mx-auto" />
              <p className="mt-3 text-sm text-slate-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <MagicLinkContent />
    </Suspense>
  )
}
