import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from '../Header'

describe('Header', () => {
  const mockOnToggleSidebar = vi.fn()
  const mockOnOpenSearch = vi.fn()
  const mockOnOpenHelp = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with Microsoft branding', () => {
    render(
      <Header 
        onToggleSidebar={mockOnToggleSidebar}
        isSidebarOpen={false}
        onOpenSearch={mockOnOpenSearch}
        onOpenHelp={mockOnOpenHelp}
      />
    )

    expect(screen.getByText('Microsoft')).toBeInTheDocument()
    expect(screen.getByText('The Microsoft 365 Copilot Experience')).toBeInTheDocument()
  })

  it('should call onOpenSearch when search button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <Header 
        onToggleSidebar={mockOnToggleSidebar}
        isSidebarOpen={false}
        onOpenSearch={mockOnOpenSearch}
        onOpenHelp={mockOnOpenHelp}
      />
    )

    const searchButton = screen.getByLabelText('Search')
    await user.click(searchButton)

    expect(mockOnOpenSearch).toHaveBeenCalledTimes(1)
  })

  it('should call onOpenHelp when help button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <Header 
        onToggleSidebar={mockOnToggleSidebar}
        isSidebarOpen={false}
        onOpenSearch={mockOnOpenSearch}
        onOpenHelp={mockOnOpenHelp}
      />
    )

    const helpButton = screen.getByLabelText('Help')
    await user.click(helpButton)

    expect(mockOnOpenHelp).toHaveBeenCalledTimes(1)
  })

  it('should call onToggleSidebar when menu button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <Header 
        onToggleSidebar={mockOnToggleSidebar}
        isSidebarOpen={false}
        onOpenSearch={mockOnOpenSearch}
        onOpenHelp={mockOnOpenHelp}
      />
    )

    const menuButton = screen.getByLabelText('Toggle menu')
    await user.click(menuButton)

    expect(mockOnToggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('should show correct aria-expanded state for sidebar', () => {
    const { rerender } = render(
      <Header 
        onToggleSidebar={mockOnToggleSidebar}
        isSidebarOpen={false}
        onOpenSearch={mockOnOpenSearch}
        onOpenHelp={mockOnOpenHelp}
      />
    )

    const menuButton = screen.getByLabelText('Toggle menu')
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    rerender(
      <Header 
        onToggleSidebar={mockOnToggleSidebar}
        isSidebarOpen={true}
        onOpenSearch={mockOnOpenSearch}
        onOpenHelp={mockOnOpenHelp}
      />
    )

    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
  })

  it('should render all action buttons', () => {
    render(
      <Header 
        onToggleSidebar={mockOnToggleSidebar}
        isSidebarOpen={false}
        onOpenSearch={mockOnOpenSearch}
        onOpenHelp={mockOnOpenHelp}
      />
    )

    expect(screen.getByLabelText('Search')).toBeInTheDocument()
    expect(screen.getByLabelText('Help')).toBeInTheDocument()
    expect(screen.getByLabelText('Settings')).toBeInTheDocument()
    expect(screen.getByLabelText('Account')).toBeInTheDocument()
    expect(screen.getByLabelText('Close')).toBeInTheDocument()
  })
})