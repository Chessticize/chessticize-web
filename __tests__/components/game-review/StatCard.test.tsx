import { render, screen } from '@testing-library/react'
import { StatCard } from '@/components/game-review/StatCard'
import { Target } from 'lucide-react'

describe('StatCard', () => {
  it('renders basic stat card correctly', () => {
    render(
      <StatCard
        title="Test Stat"
        value={42}
        subtitle="test subtitle"
        icon={Target}
        colorScheme="green"
        badge={{ text: "Test Badge" }}
      />
    )

    expect(screen.getByText('Test Stat')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('test subtitle')).toBeInTheDocument()
    expect(screen.getByText('Test Badge')).toBeInTheDocument()
  })

  it('shows loading state correctly', () => {
    render(
      <StatCard
        title="Test Stat"
        value={42}
        isLoading={true}
      />
    )

    // Should show skeleton loaders instead of content
    expect(screen.queryByText('42')).not.toBeInTheDocument()
  })

  it('displays trend information when provided', () => {
    render(
      <StatCard
        title="Test Stat"
        value={42}
        trend={{
          value: 15,
          label: "vs last week",
          direction: 'up'
        }}
      />
    )

    expect(screen.getByText('+15%')).toBeInTheDocument()
    expect(screen.getByText('vs last week')).toBeInTheDocument()
  })

  it('handles string values correctly', () => {
    render(
      <StatCard
        title="Test Stat"
        value="Improving"
      />
    )

    expect(screen.getByText('Improving')).toBeInTheDocument()
  })
})
