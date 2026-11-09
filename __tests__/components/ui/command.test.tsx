import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CommandDialog } from '@/components/ui/command'

// Mock ResizeObserver which is not available in test environment
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('CommandDialog', () => {
  it('should include DialogTitle for accessibility', () => {
    render(
      <CommandDialog open={true}>
        <div>Test content</div>
      </CommandDialog>
    )

    // Check that the dialog title exists and is accessible to screen readers
    const title = screen.getByText('Command Menu')
    expect(title).toBeInTheDocument()

    // Check that the title has the sr-only class for screen reader accessibility
    expect(title).toHaveClass('sr-only')
  })

  it('should render children content', () => {
    render(
      <CommandDialog open={true}>
        <div>Test content</div>
      </CommandDialog>
    )

    // Check that the children content is rendered
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })
})
