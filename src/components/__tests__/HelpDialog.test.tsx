
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HelpDialog from '../HelpDialog';

// Mock the lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon">X</div>,
  Book: () => <div data-testid="book-icon">Book</div>,
  Navigation: () => <div data-testid="navigation-icon">Navigation</div>,
  Play: () => <div data-testid="play-icon">Play</div>,
  Keyboard: () => <div data-testid="keyboard-icon">Keyboard</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircle</div>,
}));

describe('HelpDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    // Reset body overflow style
    document.body.style.overflow = 'unset';
  });

  afterEach(() => {
    // Clean up body overflow style
    document.body.style.overflow = 'unset';
  });

  describe('Dialog Visibility', () => {
    it('should not render when isOpen is false', () => {
      render(<HelpDialog isOpen={false} onClose={mockOnClose} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Help & User Guide')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'help-dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'help-dialog-description');
    });
  });

  describe('Dialog Closing', () => {
    it('should call onClose when close button is clicked', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText('Close help dialog');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when dialog content is clicked', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      const dialogContent = screen.getByText('Help & User Guide').closest('div');
      fireEvent.click(dialogContent!);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Body Scroll Management', () => {
    it('should prevent body scroll when dialog is open', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when dialog is closed', () => {
      const { rerender } = render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      expect(document.body.style.overflow).toBe('hidden');
      
      rerender(<HelpDialog isOpen={false} onClose={mockOnClose} />);
      
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Focus Management', () => {
    it('should focus the close button when dialog opens', async () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close help dialog');
        expect(closeButton).toHaveFocus();
      });
    });

    it('should trap focus within the dialog', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText('Close help dialog');
      
      // Simulate Tab key press on the last focusable element
      fireEvent.keyDown(closeButton, { key: 'Tab' });
      
      // Focus should cycle back to the first element
      expect(closeButton).toHaveFocus();
    });

    it('should handle Shift+Tab for reverse focus trapping', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText('Close help dialog');
      
      // Simulate Shift+Tab key press on the first focusable element
      fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
      
      // Focus should cycle to the last element (which is the same in this case)
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Content Sections', () => {
    beforeEach(() => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
    });

    it('should display Getting Started section', () => {
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText(/Welcome to the Microsoft 365 Copilot Learning Platform/)).toBeInTheDocument();
      expect(screen.getByText('Quick Start Tips:')).toBeInTheDocument();
    });

    it('should display Navigation section', () => {
      expect(screen.getByRole('heading', { level: 3, name: 'Navigation' })).toBeInTheDocument();
      expect(screen.getByText('Sequential Navigation')).toBeInTheDocument();
      expect(screen.getByText('Sidebar Menu')).toBeInTheDocument();
      expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
      expect(screen.getByText('Search Functionality')).toBeInTheDocument();
    });

    it('should display Content Types section', () => {
      expect(screen.getByText('Content Types')).toBeInTheDocument();
      expect(screen.getByText('📖 Introduction')).toBeInTheDocument();
      expect(screen.getByText('💡 Prompt')).toBeInTheDocument();
      expect(screen.getByText('🎥 Video')).toBeInTheDocument();
    });

    it('should display Keyboard Shortcuts section with table', () => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      
      // Check for table headers
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Keyboard Shortcut')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      
      // Check for some keyboard shortcuts
      expect(screen.getByText('Next Content')).toBeInTheDocument();
      expect(screen.getByText('Previous Content')).toBeInTheDocument();
      expect(screen.getByText('Open Search')).toBeInTheDocument();
      expect(screen.getByText('Close Dialog')).toBeInTheDocument();
    });

    it('should display Troubleshooting section', () => {
      expect(screen.getByText('Troubleshooting')).toBeInTheDocument();
      expect(screen.getByText('Content Not Loading')).toBeInTheDocument();
      expect(screen.getByText('Progress Not Saving')).toBeInTheDocument();
      expect(screen.getByText('Video Playback Issues')).toBeInTheDocument();
      expect(screen.getByText('Mobile Experience Issues')).toBeInTheDocument();
      expect(screen.getByText('Still Having Issues?')).toBeInTheDocument();
    });
  });

  describe('Section Icons', () => {
    beforeEach(() => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
    });

    it('should display appropriate icons for each section', () => {
      expect(screen.getByTestId('book-icon')).toBeInTheDocument();
      expect(screen.getByTestId('navigation-icon')).toBeInTheDocument();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      expect(screen.getByTestId('keyboard-icon')).toBeInTheDocument();
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts Table', () => {
    beforeEach(() => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
    });

    it('should display keyboard shortcuts with proper formatting', () => {
      // Check for kbd elements by looking for specific keyboard shortcuts
      expect(screen.getAllByText('→').length).toBeGreaterThan(0);
      expect(screen.getAllByText('←').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Escape').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Tab').length).toBeGreaterThan(0);
    });

    it('should include all essential keyboard shortcuts', () => {
      const shortcuts = [
        'Next Content',
        'Previous Content', 
        'Open Search',
        'Close Dialog',
        'Tab Navigation',
        'Sidebar Tabs',
        'Toggle Sidebar'
      ];

      shortcuts.forEach(shortcut => {
        expect(screen.getByText(shortcut)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper heading hierarchy', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      // Main title should be h2
      expect(screen.getByRole('heading', { level: 2, name: 'Help & User Guide' })).toBeInTheDocument();
      
      // Section titles should be h3
      expect(screen.getByRole('heading', { level: 3, name: 'Getting Started' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Navigation' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Content Types' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Keyboard Shortcuts' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Troubleshooting' })).toBeInTheDocument();
    });

    it('should have proper table structure for keyboard shortcuts', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // Check for table headers
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(3);
      expect(columnHeaders[0]).toHaveTextContent('Action');
      expect(columnHeaders[1]).toHaveTextContent('Keyboard Shortcut');
      expect(columnHeaders[2]).toHaveTextContent('Description');
    });

    it('should have proper button labeling', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText('Close help dialog');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Content Quality', () => {
    beforeEach(() => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
    });

    it('should provide comprehensive getting started information', () => {
      expect(screen.getByText(/Welcome to the Microsoft 365 Copilot Learning Platform/)).toBeInTheDocument();
      expect(screen.getByText(/interactive training application/)).toBeInTheDocument();
      expect(screen.getByText(/Use the sidebar menu to navigate/)).toBeInTheDocument();
    });

    it('should explain all navigation methods', () => {
      expect(screen.getByText(/Next and Previous buttons/)).toBeInTheDocument();
      expect(screen.getByText('MENU:')).toBeInTheDocument();
      expect(screen.getByText('TRANSCRIPT:')).toBeInTheDocument();
      expect(screen.getByText('RESOURCES:')).toBeInTheDocument();
      expect(screen.getByText(/progress is displayed in the sidebar/)).toBeInTheDocument();
    });

    it('should describe all content types clearly', () => {
      expect(screen.getByText(/Overview and explanatory content/)).toBeInTheDocument();
      expect(screen.getByText(/Interactive examples and hands-on exercises/)).toBeInTheDocument();
      expect(screen.getByText(/Demonstration videos and tutorials/)).toBeInTheDocument();
    });

    it('should provide practical troubleshooting steps', () => {
      expect(screen.getByText(/Refresh the page to reload/)).toBeInTheDocument();
      expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
      expect(screen.getByText(/Clear your browser cache/)).toBeInTheDocument();
    });
  });

  describe('Responsive Design Elements', () => {
    it('should have responsive classes for mobile adaptation', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      const dialog = screen.getByRole('dialog').firstChild as HTMLElement;
      expect(dialog).toHaveClass('max-w-4xl', 'w-full', 'mx-4', 'max-h-[90vh]');
    });

    it('should have scrollable content area', () => {
      render(<HelpDialog isOpen={true} onClose={mockOnClose} />);
      
      const contentArea = screen.getByText('Getting Started').closest('.overflow-y-auto');
      expect(contentArea).toBeInTheDocument();
      expect(contentArea).toHaveClass('overflow-y-auto');
    });
  });
});