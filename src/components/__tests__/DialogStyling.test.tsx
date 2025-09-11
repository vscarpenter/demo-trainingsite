import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SearchDialog from '../SearchDialog';
import HelpDialog from '../HelpDialog';
import { ContentItem } from '@/types/content';

// Mock content items for testing
const mockContentItems: ContentItem[] = [
  {
    id: 'intro-1',
    title: 'Introduction to Microsoft Copilot',
    type: 'introduction',
    filePath: '/1. Introduction/introduction.html',
    section: '1. Introduction',
    order: 1
  },
  {
    id: 'word-1',
    title: 'Word Prompting Basics',
    type: 'prompt',
    filePath: '/2. Office Apps/Word/slide_4_Word.html',
    section: '2. Office Apps',
    subsection: 'Word',
    order: 2
  }
];

describe('Dialog Styling and Responsive Design', () => {
  beforeEach(() => {
    // Mock window.matchMedia for responsive testing
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    // Restore body overflow
    document.body.style.overflow = 'unset';
  });

  describe('SearchDialog Styling', () => {
    it('should render with proper dialog structure', () => {
      render(
        <SearchDialog
          isOpen={true}
          onClose={vi.fn()}
          contentItems={mockContentItems}
          onSelectContent={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      
      // Check dialog is rendered with proper attributes
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'search-dialog-title');
      
      // Check search input is present
      const searchInput = screen.getByPlaceholderText('Search content...');
      expect(searchInput).toBeInTheDocument();
      
      // Check close button is present
      const closeButton = screen.getByLabelText('Close search dialog');
      expect(closeButton).toBeInTheDocument();
    });

    it('should have Microsoft blue accent in search icon', () => {
      render(
        <SearchDialog
          isOpen={true}
          onClose={vi.fn()}
          contentItems={mockContentItems}
          onSelectContent={vi.fn()}
        />
      );

      // Check for Microsoft blue accent color class
      const searchIcon = document.querySelector('.text-ms-blue\\/70');
      expect(searchIcon).toBeInTheDocument();
    });

    it('should apply hover and focus states to interactive elements', () => {
      render(
        <SearchDialog
          isOpen={true}
          onClose={vi.fn()}
          contentItems={mockContentItems}
          onSelectContent={vi.fn()}
        />
      );

      const closeButton = screen.getByLabelText('Close search dialog');
      
      // Check hover and focus classes
      expect(closeButton).toHaveClass('hover:bg-gray-100', 'hover:text-gray-700');
      expect(closeButton).toHaveClass('focus:bg-ms-blue/10', 'focus:text-ms-blue');
      expect(closeButton).toHaveClass('transition-all', 'duration-200', 'ease-out');
    });

    it('should have Microsoft blue accent colors', () => {
      render(
        <SearchDialog
          isOpen={true}
          onClose={vi.fn()}
          contentItems={mockContentItems}
          onSelectContent={vi.fn()}
        />
      );

      const searchIcon = screen.getByRole('dialog').querySelector('.text-ms-blue\\/70');
      expect(searchIcon).toBeInTheDocument();
    });

    it('should prevent body scroll when open', () => {
      render(
        <SearchDialog
          isOpen={true}
          onClose={vi.fn()}
          contentItems={mockContentItems}
          onSelectContent={vi.fn()}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      const { rerender } = render(
        <SearchDialog
          isOpen={true}
          onClose={vi.fn()}
          contentItems={mockContentItems}
          onSelectContent={vi.fn()}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <SearchDialog
          isOpen={false}
          onClose={vi.fn()}
          contentItems={mockContentItems}
          onSelectContent={vi.fn()}
        />
      );

      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('HelpDialog Styling', () => {
    it('should render with proper dialog structure', () => {
      render(<HelpDialog isOpen={true} onClose={vi.fn()} />);

      const dialog = screen.getByRole('dialog');
      
      // Check dialog is rendered with proper attributes
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'help-dialog-title');
      
      // Check title is present
      const title = screen.getByText('Help & User Guide');
      expect(title).toBeInTheDocument();
      
      // Check close button is present
      const closeButton = screen.getByLabelText('Close help dialog');
      expect(closeButton).toBeInTheDocument();
    });

    it('should have proper content sections', () => {
      render(<HelpDialog isOpen={true} onClose={vi.fn()} />);

      // Check for main sections
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Content Types')).toBeInTheDocument();
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      expect(screen.getByText('Troubleshooting')).toBeInTheDocument();
    });

    it('should apply Microsoft color scheme to section headers', () => {
      render(<HelpDialog isOpen={true} onClose={vi.fn()} />);

      // Check for Microsoft color classes in the document
      const msBlueElements = document.querySelectorAll('.text-ms-blue');
      const msGreenElements = document.querySelectorAll('.text-ms-green');
      const msRedElements = document.querySelectorAll('.text-ms-red');
      const msYellowElements = document.querySelectorAll('.text-ms-yellow');

      expect(msBlueElements.length).toBeGreaterThan(0);
      expect(msGreenElements.length).toBeGreaterThan(0);
      expect(msRedElements.length).toBeGreaterThan(0);
      expect(msYellowElements.length).toBeGreaterThan(0);
    });

    it('should have enhanced keyboard shortcut table', () => {
      render(<HelpDialog isOpen={true} onClose={vi.fn()} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // Check for keyboard shortcut entries
      expect(screen.getByText('Next Content')).toBeInTheDocument();
      expect(screen.getByText('Previous Content')).toBeInTheDocument();
      expect(screen.getByText('Open Search')).toBeInTheDocument();
      expect(screen.getByText('Close Dialog')).toBeInTheDocument();
    });

    it('should have content type cards with proper styling', () => {
      render(<HelpDialog isOpen={true} onClose={vi.fn()} />);

      // Check for content type cards
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Prompt')).toBeInTheDocument();
      expect(screen.getByText('Video')).toBeInTheDocument();
      
      // Check for gradient background classes in the document
      const gradientElements = document.querySelectorAll('.bg-gradient-to-br');
      expect(gradientElements.length).toBeGreaterThanOrEqual(3);
    });

    it('should prevent body scroll when open', () => {
      render(<HelpDialog isOpen={true} onClose={vi.fn()} />);

      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('Dialog Animations', () => {
    it('should have animation classes in SearchDialog', () => {
      render(
        <SearchDialog
          isOpen={true}
          onClose={vi.fn()}
          contentItems={mockContentItems}
          onSelectContent={vi.fn()}
        />
      );

      // Check for animation classes in the document
      const animatedElements = document.querySelectorAll('.animate-in');
      const slideElements = document.querySelectorAll('.slide-in-from-top-4');
      const fadeElements = document.querySelectorAll('.fade-in-0');
      
      expect(animatedElements.length).toBeGreaterThan(0);
      expect(slideElements.length).toBeGreaterThan(0);
      expect(fadeElements.length).toBeGreaterThan(0);
    });

    it('should have animation classes in HelpDialog', () => {
      render(<HelpDialog isOpen={true} onClose={vi.fn()} />);

      // Check for animation classes in the document
      const animatedElements = document.querySelectorAll('.animate-in');
      const slideElements = document.querySelectorAll('.slide-in-from-bottom-4');
      const fadeElements = document.querySelectorAll('.fade-in-0');
      
      expect(animatedElements.length).toBeGreaterThan(0);
      expect(slideElements.length).toBeGreaterThan(0);
      expect(fadeElements.length).toBeGreaterThan(0);
    });

    it('should have transition classes for smooth interactions', () => {
      render(
        <SearchDialog
          isOpen={true}
          onClose={vi.fn()}
          contentItems={mockContentItems}
          onSelectContent={vi.fn()}
        />
      );

      // Check for transition classes in the document
      const transitionElements = document.querySelectorAll('.transition-all');
      const durationElements = document.querySelectorAll('.duration-300');
      const easeElements = document.querySelectorAll('.ease-out');
      
      expect(transitionElements.length).toBeGreaterThan(0);
      expect(durationElements.length).toBeGreaterThan(0);
      expect(easeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Z-index Management', () => {
    it('should have proper z-index classes in SearchDialog', () => {
      render(
        <SearchDialog
          isOpen={true}
          onClose={vi.fn()}
          contentItems={mockContentItems}
          onSelectContent={vi.fn()}
        />
      );

      // Check for z-index classes in the document
      const zIndexElements = document.querySelectorAll('.z-\\[60\\]');
      expect(zIndexElements.length).toBeGreaterThan(0);
    });

    it('should have proper z-index classes in HelpDialog', () => {
      render(<HelpDialog isOpen={true} onClose={vi.fn()} />);

      // Check for z-index classes in the document
      const zIndexElements = document.querySelectorAll('.z-\\[60\\]');
      expect(zIndexElements.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Behavior', () => {
    it('should have responsive classes for SearchDialog', () => {
      render(
        <SearchDialog
          isOpen={true}
          onClose={vi.fn()}
          contentItems={mockContentItems}
          onSelectContent={vi.fn()}
        />
      );

      // Check for responsive classes in the document
      const responsiveElements = document.querySelectorAll('.max-h-\\[85vh\\]');
      const smResponsiveElements = document.querySelectorAll('.sm\\:max-h-\\[80vh\\]');
      
      expect(responsiveElements.length).toBeGreaterThan(0);
      expect(smResponsiveElements.length).toBeGreaterThan(0);
    });

    it('should handle search input correctly', () => {
      render(
        <SearchDialog
          isOpen={true}
          onClose={vi.fn()}
          contentItems={mockContentItems}
          onSelectContent={vi.fn()}
        />
      );

      // Type in search input
      const searchInput = screen.getByPlaceholderText('Search content...');
      fireEvent.change(searchInput, { target: { value: 'Introduction' } });

      // Verify input value is updated
      expect(searchInput).toHaveValue('Introduction');
      
      // Verify search functionality is present
      expect(searchInput).toHaveAttribute('aria-label', 'Search content');
    });
  });

  describe('Accessibility Enhancements', () => {
    it('should maintain focus trapping in dialogs', async () => {
      render(<HelpDialog isOpen={true} onClose={vi.fn()} />);

      const dialog = screen.getByRole('dialog');
      const closeButton = screen.getByLabelText('Close help dialog');

      // Focus should be on the close button initially
      expect(closeButton).toHaveFocus();

      // Tab navigation should stay within dialog
      fireEvent.keyDown(dialog, { key: 'Tab' });
      
      // Focus should still be within the dialog
      expect(document.activeElement).not.toBe(document.body);
    });

    it('should have proper ARIA labels and roles', () => {
      render(
        <SearchDialog
          isOpen={true}
          onClose={vi.fn()}
          contentItems={mockContentItems}
          onSelectContent={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'search-dialog-title');
    });
  });
});