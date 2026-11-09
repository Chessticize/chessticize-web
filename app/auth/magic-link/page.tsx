"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthContext } from "@/components/auth/auth-provider"
import { DevelopmentNotice } from "@/components/development-notice"
import {
  getCurrentUrl,
  isBrowser
} from "@/lib/firebase/client-only"

function MagicLinkContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signInWithEmailLink, isFirebaseAvailable, isAuthenticated } = useAuthContext()

  useEffect(() => {
    const handleMagicLink = async () => {
      // Skip if not in browser
      if (!isBrowser()) {
        return
      }

      if (!isFirebaseAvailable) {
        setError("Magic link authentication is not available")
        setIsLoading(false)
        return
      }

      // If already authenticated, redirect to dashboard
      if (isAuthenticated) {
        router.push("/dashboard")
        return
      }

      try {
        // Get the current URL which should contain the magic link
        const currentUrl = getCurrentUrl()

        // Complete sign-in using stored email from localStorage (handled inside auth lib)
        await signInWithEmailLink('', currentUrl)

        setSuccess(true)
        setIsLoading(false)

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)

      } catch (error) {
        console.error("Magic link sign-in failed:", error)
        setError(error instanceof Error ? error.message : "Failed to sign in with magic link")
        setIsLoading(false)
      }
    }

    handleMagicLink()
  }, [signInWithEmailLink, isFirebaseAvailable, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <DevelopmentNotice />
          
          <Card className="w-full">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Signing you in...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <DevelopmentNotice />
          
          <Card className="w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-green-600">Welcome!</CardTitle>
              <CardDescription>You've been successfully signed in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-600">
                    ✓ Magic link authentication successful
                  </p>
                </div>
                
                <p className="text-sm text-gray-600">
                  Redirecting you to the dashboard...
                </p>
                
                <Link href="/dashboard">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <DevelopmentNotice />
        
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-red-600">Sign-in Failed</CardTitle>
            <CardDescription>There was a problem with your magic link</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                The magic link may have expired or been used already. 
                Please try signing in again.
              </p>
              
              <div className="space-y-2">
                <Link href="/auth">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">
                    Try Again
                  </Button>
                </Link>

                <Link href="/auth">
                  <Button variant="outline" className="w-full">
                    Create Account
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <MagicLinkContent />
    </Suspense>
  )
}
