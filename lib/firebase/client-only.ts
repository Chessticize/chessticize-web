/**
 * Client-only Firebase utilities
 * Ensures Firebase code only runs in the browser
 */

/**
 * Check if code is running in browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Get value from localStorage safely
 */
export function getFromLocalStorage(key: string): string | null {
  if (!isBrowser()) return null
  
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.error('Error accessing localStorage:', error)
    return null
  }
}

/**
 * Set value in localStorage safely
 */
export function setInLocalStorage(key: string, value: string): void {
  if (!isBrowser()) return
  
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.error('Error setting localStorage:', error)
  }
}

/**
 * Remove value from localStorage safely
 */
export function removeFromLocalStorage(key: string): void {
  if (!isBrowser()) return
  
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Error removing from localStorage:', error)
  }
}

/**
 * Get current URL safely
 */
export function getCurrentUrl(): string {
  if (!isBrowser()) return ''
  return window.location.href
}

/**
 * Safe prompt for user input
 */
export function promptUser(message: string): string | null {
  if (!isBrowser()) return null
  return window.prompt(message)
}