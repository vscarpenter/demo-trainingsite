import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  escapeHtml, 
  highlightSearchTerms, 
  searchContent, 
  debounce, 
  getAllContentItems 
} from '../utils';
import { ContentItem, ContentSection } from '@/types/content';

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    expect(escapeHtml('Hello & World')).toBe('Hello &amp; World');
    expect(escapeHtml('"quoted text"')).toBe('"quoted text"');
  });

  it('should handle empty strings', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('highlightSearchTerms', () => {
  it('should highlight search terms with proper escaping', () => {
    const result = highlightSearchTerms('Hello World', 'World');
    expect(result).toBe('Hello <mark class="bg-yellow-200 text-yellow-900 px-1 rounded">World</mark>');
  });

  it('should be case insensitive', () => {
    const result = highlightSearchTerms('Hello World', 'world');
    expect(result).toBe('Hello <mark class="bg-yellow-200 text-yellow-900 px-1 rounded">World</mark>');
  });

  it('should handle multiple occurrences', () => {
    const result = highlightSearchTerms('Hello World World', 'World');
    expect(result).toBe('Hello <mark class="bg-yellow-200 text-yellow-900 px-1 rounded">World</mark> <mark class="bg-yellow-200 text-yellow-900 px-1 rounded">World</mark>');
  });

  it('should escape HTML in both text and query', () => {
    const result = highlightSearchTerms('<script>alert("test")</script>', 'script');
    expect(result).toBe('&lt;<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">script</mark>&gt;alert("test")&lt;/<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">script</mark>&gt;');
  });

  it('should handle empty query', () => {
    const result = highlightSearchTerms('Hello World', '');
    expect(result).toBe('Hello World');
  });

  it('should handle special regex characters in query', () => {
    const result = highlightSearchTerms('Hello (World)', '(World)');
    expect(result).toBe('Hello <mark class="bg-yellow-200 text-yellow-900 px-1 rounded">(World)</mark>');
  });
});

describe('searchContent', () => {
  const mockItems: ContentItem[] = [
    {
      id: '1',
      title: 'Word Introduction',
      type: 'introduction',
      filePath: '/word/intro.html',
      section: '2. Office Apps',
      subsection: 'Word',
      order: 1
    },
    {
      id: '2',
      title: 'Excel Formulas',
      type: 'prompt',
      filePath: '/excel/formulas.html',
      section: '2. Office Apps',
      subsection: 'Excel',
      order: 2
    },
    {
      id: '3',
      title: 'PowerPoint Slides',
      type: 'video',
      filePath: '/powerpoint/slides.html',
      section: '2. Office Apps',
      subsection: 'PowerPoint',
      order: 3
    },
    {
      id: '4',
      title: 'Outlook Email',
      type: 'prompt',
      filePath: '/outlook/email.html',
      section: '3. Outlook',
      order: 4
    }
  ];

  it('should return empty array for empty query', () => {
    const results = searchContent(mockItems, '');
    expect(results).toEqual([]);
  });

  it('should find title matches', () => {
    const results = searchContent(mockItems, 'Word');
    expect(results).toHaveLength(1);
    expect(results[0].item.id).toBe('1');
    expect(results[0].matchType).toBe('title');
    expect(results[0].highlightedTitle).toContain('<mark');
  });

  it('should find section matches', () => {
    const results = searchContent(mockItems, 'Office Apps');
    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.matchType).toBe('section');
    });
  });

  it('should find subsection matches', () => {
    const results = searchContent(mockItems, 'Excel');
    expect(results).toHaveLength(1);
    expect(results[0].item.id).toBe('2');
    expect(results[0].matchType).toBe('title'); // Title match takes precedence
  });

  it('should prioritize title matches over section matches', () => {
    const results = searchContent(mockItems, 'Excel');
    expect(results[0].matchType).toBe('title');
  });

  it('should be case insensitive', () => {
    const results = searchContent(mockItems, 'word');
    expect(results).toHaveLength(1);
    expect(results[0].item.id).toBe('1');
  });

  it('should limit results to 50', () => {
    const manyItems = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      title: `Test Item ${i}`,
      type: 'prompt' as const,
      filePath: `/test-${i}.html`,
      section: 'Test Section',
      order: i
    }));
    
    const results = searchContent(manyItems, 'Test');
    expect(results).toHaveLength(50);
  });

  it('should handle partial matches', () => {
    const results = searchContent(mockItems, 'Pow');
    expect(results).toHaveLength(1);
    expect(results[0].item.id).toBe('3');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 300);
    
    debouncedFn('test');
    expect(mockFn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(300);
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should cancel previous calls', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 300);
    
    debouncedFn('first');
    debouncedFn('second');
    
    vi.advanceTimersByTime(300);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('second');
  });
});

describe('getAllContentItems', () => {
  it('should flatten content sections into items array', () => {
    const sections: ContentSection[] = [
      {
        id: 'section1',
        title: 'Section 1',
        order: 1,
        items: [
          {
            id: '1',
            title: 'Item 1',
            type: 'introduction',
            filePath: '/item1.html',
            section: 'Section 1',
            order: 1
          },
          {
            id: '2',
            title: 'Item 2',
            type: 'prompt',
            filePath: '/item2.html',
            section: 'Section 1',
            order: 2
          }
        ]
      },
      {
        id: 'section2',
        title: 'Section 2',
        order: 2,
        items: [
          {
            id: '3',
            title: 'Item 3',
            type: 'video',
            filePath: '/item3.html',
            section: 'Section 2',
            order: 1
          }
        ]
      }
    ];

    const result = getAllContentItems(sections);
    expect(result).toHaveLength(3);
    expect(result.map(item => item.id)).toEqual(['1', '2', '3']);
  });

  it('should handle empty sections', () => {
    const result = getAllContentItems([]);
    expect(result).toEqual([]);
  });

  it('should handle sections with no items', () => {
    const sections: ContentSection[] = [
      {
        id: 'empty',
        title: 'Empty Section',
        order: 1,
        items: []
      }
    ];

    const result = getAllContentItems(sections);
    expect(result).toEqual([]);
  });
});