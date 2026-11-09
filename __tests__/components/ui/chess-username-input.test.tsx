import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChessUsernameInput } from '@/components/ui/chess-username-input'
import { ValidationState } from '@/lib/utils/chess-validation'

describe('ChessUsernameInput', () => {
  const mockOnChange = vi.fn()
  const mockOnValidate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render input with label and placeholder', () => {
    const validation: ValidationState = { isValidating: false, isValid: null }
    
    render(
      <ChessUsernameInput
        id="test-input"
        label="Test Username"
        placeholder="Enter username"
        value=""
        onChange={mockOnChange}
        onValidate={mockOnValidate}
        validation={validation}
      />
    )

    expect(screen.getByLabelText('Test Username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument()
  })

  it('should show loading state during validation', () => {
    const validation: ValidationState = { isValidating: true, isValid: null }
    
    render(
      <ChessUsernameInput
        id="test-input"
        label="Test Username"
        placeholder="Enter username"
        value="testuser"
        onChange={mockOnChange}
        onValidate={mockOnValidate}
        validation={validation}
      />
    )

    // Should show loading spinner (SVG element)
    const loadingIcon = document.querySelector('.lucide-loader-circle')
    expect(loadingIcon).toBeInTheDocument()
  })

  it('should show success state for valid username', () => {
    const validation: ValidationState = { isValidating: false, isValid: true }
    
    render(
      <ChessUsernameInput
        id="test-input"
        label="Test Username"
        placeholder="Enter username"
        value="validuser"
        onChange={mockOnChange}
        onValidate={mockOnValidate}
        validation={validation}
      />
    )

    expect(screen.getByText('Username verified successfully')).toBeInTheDocument()
  })

  it('should show error state for invalid username', () => {
    const validation: ValidationState = { 
      isValidating: false, 
      isValid: false, 
      error: 'Username not found' 
    }
    
    render(
      <ChessUsernameInput
        id="test-input"
        label="Test Username"
        placeholder="Enter username"
        value="invaliduser"
        onChange={mockOnChange}
        onValidate={mockOnValidate}
        validation={validation}
      />
    )

    expect(screen.getByText('Username not found')).toBeInTheDocument()
  })

  it('should call onChange when input value changes', () => {
    const validation: ValidationState = { isValidating: false, isValid: null }
    
    render(
      <ChessUsernameInput
        id="test-input"
        label="Test Username"
        placeholder="Enter username"
        value=""
        onChange={mockOnChange}
        onValidate={mockOnValidate}
        validation={validation}
      />
    )

    const input = screen.getByPlaceholderText('Enter username')
    fireEvent.change(input, { target: { value: 'newuser' } })

    expect(mockOnChange).toHaveBeenCalledWith('newuser')
  })

  it('should call onValidate when input loses focus', () => {
    const validation: ValidationState = { isValidating: false, isValid: null }
    
    render(
      <ChessUsernameInput
        id="test-input"
        label="Test Username"
        placeholder="Enter username"
        value="testuser"
        onChange={mockOnChange}
        onValidate={mockOnValidate}
        validation={validation}
      />
    )

    const input = screen.getByPlaceholderText('Enter username')
    fireEvent.blur(input)

    expect(mockOnValidate).toHaveBeenCalledWith('testuser')
  })
})
