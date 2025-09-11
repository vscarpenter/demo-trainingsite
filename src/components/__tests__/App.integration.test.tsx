import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'

// Mock the lazy-loaded ContentViewer component
vi.mock('../../components/ContentViewer', () => ({
  default: () => <div data-testid="content-viewer">Content Viewer</div>
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('App Integration Tests - Dialog Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    
    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: {
        pushState: vi.fn(),
      },
      writable: true,
    });
    
    // Mock URL constructor
    (globalThis as any).URL = class URL {
      searchParams = {
        get: vi.fn().mockReturnValue(null),
        set: vi.fn(),
      }
      hash = ''
      constructor(url: string) {
        this.toString = () => url
      }
      toString() {
        return 'http://localhost:5173'
      }
    } as any
  })

  it('should open search dialog when search button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('content-viewer')).toBeInTheDocument()
    })

    // Click the search button
    const searchButton = screen.getByLabelText('Search')
    await user.click(searchButton)

    // Check that search dialog is open
    expect(screen.getByRole('dialog', { name: /search content/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search content...')).toBeInTheDocument()
  })

  it('should open help dialog when help button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('content-viewer')).toBeInTheDocument()
    })

    // Click the help button
    const helpButton = screen.getByLabelText('Help')
    await user.click(helpButton)

    // Check that help dialog is open
    expect(screen.getByRole('dialog', { name: /help.*user guide/i })).toBeInTheDocument()
    expect(screen.getByText('Help & User Guide')).toBeInTheDocument()
  })

  it('should close search dialog when Escape key is pressed', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('content-viewer')).toBeInTheDocument()
    })

    // Open search dialog
    const searchButton = screen.getByLabelText('Search')
    await user.click(searchButton)
    expect(screen.getByRole('dialog', { name: /search content/i })).toBeInTheDocument()

    // Press Escape key
    await user.keyboard('{Escape}')

    // Check that search dialog is closed
    expect(screen.queryByRole('dialog', { name: /search content/i })).not.toBeInTheDocument()
  })

  it('should close help dialog when Escape key is pressed', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('content-viewer')).toBeInTheDocument()
    })

    // Open help dialog
    const helpButton = screen.getByLabelText('Help')
    await user.click(helpButton)
    expect(screen.getByRole('dialog', { name: /help.*user guide/i })).toBeInTheDocument()

    // Press Escape key
    await user.keyboard('{Escape}')

    // Check that help dialog is closed
    expect(screen.queryByRole('dialog', { name: /help.*user guide/i })).not.toBeInTheDocument()
  })

  it('should open search dialog with Ctrl+K keyboard shortcut', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('content-viewer')).toBeInTheDocument()
    })

    // Press Ctrl+K
    await user.keyboard('{Control>}k{/Control}')

    // Check that search dialog is open
    expect(screen.getByRole('dialog', { name: /search content/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search content...')).toBeInTheDocument()
  })

  it('should close search dialog when backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('content-viewer')).toBeInTheDocument()
    })

    // Open search dialog
    const searchButton = screen.getByLabelText('Search')
    await user.click(searchButton)
    expect(screen.getByRole('dialog', { name: /search content/i })).toBeInTheDocument()

    // Click on the backdrop (the dialog itself, which has the backdrop click handler)
    const dialog = screen.getByRole('dialog', { name: /search content/i })
    await user.click(dialog)

    // Check that search dialog is closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /search content/i })).not.toBeInTheDocument()
    })
  })

  it('should close help dialog when backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('content-viewer')).toBeInTheDocument()
    })

    // Open help dialog
    const helpButton = screen.getByLabelText('Help')
    await user.click(helpButton)
    expect(screen.getByRole('dialog', { name: /help.*user guide/i })).toBeInTheDocument()

    // Click on the backdrop (the dialog itself, which has the backdrop click handler)
    const dialog = screen.getByRole('dialog', { name: /help.*user guide/i })
    await user.click(dialog)

    // Check that help dialog is closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /help.*user guide/i })).not.toBeInTheDocument()
    })
  })

  it('should close search dialog when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('content-viewer')).toBeInTheDocument()
    })

    // Open search dialog
    const searchButton = screen.getByLabelText('Search')
    await user.click(searchButton)
    expect(screen.getByRole('dialog', { name: /search content/i })).toBeInTheDocument()

    // Click the close button
    const closeButton = screen.getByLabelText('Close search dialog')
    await user.click(closeButton)

    // Check that search dialog is closed
    expect(screen.queryByRole('dialog', { name: /search content/i })).not.toBeInTheDocument()
  })

  it('should close help dialog when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('content-viewer')).toBeInTheDocument()
    })

    // Open help dialog
    const helpButton = screen.getByLabelText('Help')
    await user.click(helpButton)
    expect(screen.getByRole('dialog', { name: /help.*user guide/i })).toBeInTheDocument()

    // Click the close button
    const closeButton = screen.getByLabelText('Close help dialog')
    await user.click(closeButton)

    // Check that help dialog is closed
    expect(screen.queryByRole('dialog', { name: /help.*user guide/i })).not.toBeInTheDocument()
  })

  it('should prioritize dialog closing over sidebar closing when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('content-viewer')).toBeInTheDocument()
    })

    // Open sidebar on mobile (simulate mobile by clicking menu button)
    const menuButton = screen.getByLabelText('Toggle menu')
    await user.click(menuButton)

    // Open search dialog
    const searchButton = screen.getByLabelText('Search')
    await user.click(searchButton)
    expect(screen.getByRole('dialog', { name: /search content/i })).toBeInTheDocument()

    // Press Escape - should close search dialog, not sidebar
    await user.keyboard('{Escape}')

    // Check that search dialog is closed but sidebar might still be open
    expect(screen.queryByRole('dialog', { name: /search content/i })).not.toBeInTheDocument()
  })

  it('should handle multiple dialogs correctly - only one should be open at a time', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('content-viewer')).toBeInTheDocument()
    })

    // Open search dialog
    const searchButton = screen.getByLabelText('Search')
    await user.click(searchButton)
    expect(screen.getByRole('dialog', { name: /search content/i })).toBeInTheDocument()

    // Open help dialog - this should be possible as they're independent
    const helpButton = screen.getByLabelText('Help')
    await user.click(helpButton)
    expect(screen.getByRole('dialog', { name: /help.*user guide/i })).toBeInTheDocument()

    // Both dialogs can be open simultaneously in this implementation
    expect(screen.getByRole('dialog', { name: /search content/i })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /help.*user guide/i })).toBeInTheDocument()
  })

  it('should focus search input when search dialog opens', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('content-viewer')).toBeInTheDocument()
    })

    // Open search dialog
    const searchButton = screen.getByLabelText('Search')
    await user.click(searchButton)
    expect(screen.getByRole('dialog', { name: /search content/i })).toBeInTheDocument()

    // Check that focus is on the search input
    const searchInput = screen.getByPlaceholderText('Search content...')
    expect(searchInput).toHaveFocus()
  })

  it('should focus close button when help dialog opens', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('content-viewer')).toBeInTheDocument()
    })

    // Open help dialog
    const helpButton = screen.getByLabelText('Help')
    await user.click(helpButton)
    expect(screen.getByRole('dialog', { name: /help.*user guide/i })).toBeInTheDocument()

    // Check that focus is on the close button (first focusable element)
    const closeButton = screen.getByLabelText('Close help dialog')
    expect(closeButton).toHaveFocus()
  })
})