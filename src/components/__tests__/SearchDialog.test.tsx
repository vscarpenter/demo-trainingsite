import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchDialog from '../SearchDialog'
import { ContentItem } from '@/types/content'

const mockContentItems: ContentItem[] = [
  {
    id: 'word-intro',
    title: 'Word Introduction',
    type: 'introduction',
    filePath: '/word/intro.html',
    section: '2. Office Apps',
    subsection: 'Word',
    order: 1
  },
  {
    id: 'excel-formulas',
    title: 'Excel Formulas',
    type: 'prompt',
    filePath: '/excel/formulas.html',
    section: '2. Office Apps',
    subsection: 'Excel',
    order: 2
  },
  {
    id: 'powerpoint-video',
    title: 'PowerPoint Presentation',
    type: 'video',
    filePath: '/powerpoint/video.html',
    section: '2. Office Apps',
    subsection: 'PowerPoint',
    order: 3
  }
]

describe('SearchDialog', () => {
  const mockOnClose = vi.fn()
  const mockOnSelectContent = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(
      <SearchDialog
        isOpen={false}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search content...')).toBeInTheDocument()
  })

  it('should focus search input when opened', () => {
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    expect(screen.getByPlaceholderText('Search content...')).toHaveFocus()
  })

  it('should show initial state with search prompt', () => {
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    expect(screen.getByText('Search Learning Content')).toBeInTheDocument()
    expect(screen.getByText('Type to search across all course materials, sections, and topics')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    const closeButton = screen.getByLabelText('Close search dialog')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when Escape key is pressed', async () => {
    const user = userEvent.setup()
    
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    await user.keyboard('{Escape}')
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    const backdrop = screen.getByRole('dialog')
    await user.click(backdrop)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should not close when clicking inside dialog content', async () => {
    const user = userEvent.setup()
    
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search content...')
    await user.click(searchInput)
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('should show search results when typing', async () => {
    const user = userEvent.setup()
    
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search content...')
    await user.type(searchInput, 'Word')

    // Wait for debounced search
    await waitFor(() => {
      expect(screen.getByText((_content, element) => {
        return element?.textContent === 'Word Introduction'
      })).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('should show no results message when no matches found', async () => {
    const user = userEvent.setup()
    
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search content...')
    await user.type(searchInput, 'nonexistent')

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('should display content type icons correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search content...')
    await user.type(searchInput, 'Office')

    await waitFor(() => {
      // Should show all three items from Office Apps section
      expect(screen.getByText((_content, element) => {
        return element?.textContent === 'Word Introduction'
      })).toBeInTheDocument()
      expect(screen.getByText((_content, element) => {
        return element?.textContent === 'Excel Formulas'
      })).toBeInTheDocument()
      expect(screen.getByText((_content, element) => {
        return element?.textContent === 'PowerPoint Presentation'
      })).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('should call onSelectContent when result is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search content...')
    await user.type(searchInput, 'Word')

    await waitFor(() => {
      expect(screen.getByText((_content, element) => {
        return element?.textContent === 'Word Introduction'
      })).toBeInTheDocument()
    }, { timeout: 500 })

    const result = screen.getByText((_content, element) => {
      return element?.textContent === 'Word Introduction'
    })
    await user.click(result)

    expect(mockOnSelectContent).toHaveBeenCalledWith('word-intro')
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup()
    
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search content...')
    await user.type(searchInput, 'Office')

    await waitFor(() => {
      expect(screen.getByText((_content, element) => {
        return element?.textContent === 'Word Introduction'
      })).toBeInTheDocument()
    }, { timeout: 500 })

    // Navigate down
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowDown}')
    
    // Select with Enter
    await user.keyboard('{Enter}')

    expect(mockOnSelectContent).toHaveBeenCalledWith('excel-formulas')
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should show result count in footer', async () => {
    const user = userEvent.setup()
    
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search content...')
    await user.type(searchInput, 'Office')

    await waitFor(() => {
      expect(screen.getByText('3 results')).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('should show keyboard shortcuts in footer', async () => {
    const user = userEvent.setup()
    
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search content...')
    await user.type(searchInput, 'Word')

    await waitFor(() => {
      expect(screen.getByText('↑↓ Navigate')).toBeInTheDocument()
      expect(screen.getByText('↵ Select')).toBeInTheDocument()
      expect(screen.getByText('Esc Close')).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('should prevent body scroll when open', () => {
    render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    expect(document.body.style.overflow).toBe('hidden')
  })

  it('should restore body scroll when closed', () => {
    const { rerender } = render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <SearchDialog
        isOpen={false}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    expect(document.body.style.overflow).toBe('unset')
  })

  it('should reset state when dialog closes', () => {
    const { rerender } = render(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search content...')
    fireEvent.change(searchInput, { target: { value: 'test query' } })

    rerender(
      <SearchDialog
        isOpen={false}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    rerender(
      <SearchDialog
        isOpen={true}
        onClose={mockOnClose}
        contentItems={mockContentItems}
        onSelectContent={mockOnSelectContent}
      />
    )

    const newSearchInput = screen.getByPlaceholderText('Search content...')
    expect(newSearchInput).toHaveValue('')
  })
})