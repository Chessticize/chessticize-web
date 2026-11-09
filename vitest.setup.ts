import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock environment variables
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  configurable: true,
  enumerable: true,
  writable: true
})
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:8080'
