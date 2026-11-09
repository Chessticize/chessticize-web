/**
 * Authentication context provider
 * Provides authentication state to the entire application
 */

'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { AuthState } from '@/lib/auth/types'
import { FirebaseAuthProvider } from '@/lib/firebase/types'

interface AuthContextType extends AuthState {
  // Existing methods
  logout: () => Promise<void>
  clearError: () => void
  checkAuth: () => Promise<void>

  // Firebase methods
  signInWithEmailAndPassword: (email: string, password: string) => Promise<void>
  signUpWithEmailAndPassword: (email: string, password: string) => Promise<void>
  sendMagicLinkEmail: (email: string) => Promise<void>
  signInWithEmailLink: (email: string, emailLink?: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  sendPasswordResetEmail: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  sendEmailVerification: () => Promise<void>

  // Firebase state
  firebaseUser: any
  authProvider: FirebaseAuthProvider | null
  isFirebaseAvailable: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
