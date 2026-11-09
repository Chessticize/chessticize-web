"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuthContext } from "@/components/auth/auth-provider"
import { APP_CONFIG } from "@/lib/config"
import { hasValidAuth } from "@/lib/auth/tokens"
import { DevelopmentNotice } from "@/components/development-notice"

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(true)
  const {
    isLoading,
    error,
    clearError,
    isAuthenticated,
    // Firebase methods
    sendMagicLinkEmail,
    signInWithGoogle,
    isFirebaseAvailable
  } = useAuthContext()
  const router = useRouter()

  // Check for tokens immediately
  const hasTokens = hasValidAuth()

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push(APP_CONFIG.DEFAULT_LOGIN_REDIRECT)
    return null
  }

  // Show loading state if we have tokens (likely authenticated) or if auth is still loading
  if (isLoading || (hasTokens && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Checking authentication...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!email) {
      return
    }

    if (!agreedToTerms) {
      // You could set a local error state here if needed
      return
    }

    try {
      await sendMagicLinkEmail(email)
      setMagicLinkSent(true)
    } catch (error) {
      // Error is handled by the auth context
      console.error('Authentication failed:', error)
    }
  }

  const handleGoogleSignIn = async () => {
    clearError()

    if (!isFirebaseAvailable) {
      console.error('[Auth Page] Firebase not available for Google sign-in')
      console.error('[Auth Page] Make sure Firebase environment variables are set')
      return
    }

    if (!agreedToTerms) {
      // You could set a local error state here if needed
      return
    }

    try {
      console.log('[Auth Page] Proceeding with Google sign-in via popup only')
      await signInWithGoogle()
    } catch (error) {
      console.error('[Auth Page] Google sign-in failed:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <DevelopmentNotice />

        <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-orange-600">Chessticize</CardTitle>
          <CardDescription>Welcome! Sign in or create your account</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
              {error.includes('popup') && (
                <div className="mt-2 text-xs text-red-500">
                  <p className="font-medium">Quick fixes:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Allow popups for this site in your browser settings</li>
                    <li>Disable ad blockers temporarily</li>
                    <li>Try using a different browser</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {magicLinkSent && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">
                Magic link sent to {email}! Check your email and click the link to continue.
              </p>
            </div>
          )}

          {/* Google Sign-in First */}
          {isFirebaseAvailable && (
            <div className="mb-6 space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading || !agreedToTerms}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>
              {error && /(popup|cancel)/i.test(error) && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || !agreedToTerms}
                >
                  Having trouble? Try again
                </Button>
              )}
            </div>
          )}

          {/* Divider before email sign-in */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or sign in with email</span>
            </div>
          </div>


          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            {/* Terms and Privacy Policy Checkbox */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                required
              />
              <div className="text-sm text-gray-600 leading-5">
                <label htmlFor="terms" className="cursor-pointer">
                  I agree to the{" "}
                  <Link href="/terms" className="text-orange-600 hover:text-orange-700 underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-orange-600 hover:text-orange-700 underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={isLoading || !agreedToTerms}
            >
              {isLoading ? "Processing..." : "Send Magic Link"}
            </Button>
          </form>


        </CardContent>
      </Card>
      </div>
    </div>
  )
}
