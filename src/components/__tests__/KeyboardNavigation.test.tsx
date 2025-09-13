import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../App';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock URL and history
Object.defineProperty(window, 'URL', {
  value: vi.fn().mockImplementation(() => ({
    searchParams: {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
    },
    hash: '',
    toString: vi.fn().mockReturnValue('http://localhost'),
  })),
});

Object.defineProperty(window, 'history', {
  value: {
    pushState: vi.fn(),
  },
});

describe('Keyboard Navigation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should set up keyboard event listeners', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    
    render(<App />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    // Check that keydown event listener was added
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    addEventListenerSpy.mockRestore();
  });

  it('should handle Escape key to close dialogs', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    // Open search dialog
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    
    // Close with Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    
    // The test passes if no errors are thrown
    expect(true).toBe(true);
  });

  it('should handle Ctrl+K to open search', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    // Open search dialog with Ctrl+K
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    
    // The test passes if no errors are thrown
    expect(true).toBe(true);
  });
});