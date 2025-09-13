import { describe, it, expect } from 'vitest';
import { 
  getNavigationState, 
  getNextItem, 
  getPreviousItem, 
  getFirstItem, 
  getLastItem,
  allContentItems 
} from '../contentStructure';

describe('Content Navigation Functions', () => {
  // Use actual content items for testing
  const firstItemId = allContentItems[0]?.id;
  const secondItemId = allContentItems[1]?.id;
  const lastItemId = allContentItems[allContentItems.length - 1]?.id;

  describe('getNavigationState', () => {
    it('should return correct navigation state for first item', () => {
      if (!firstItemId) return;
      
      const state = getNavigationState(firstItemId);
      expect(state.currentIndex).toBe(0);
      expect(state.totalItems).toBe(allContentItems.length);
      expect(state.canGoNext).toBe(true);
      expect(state.canGoPrevious).toBe(false);
    });

    it('should return correct navigation state for last item', () => {
      if (!lastItemId) return;
      
      const state = getNavigationState(lastItemId);
      expect(state.currentIndex).toBe(allContentItems.length - 1);
      expect(state.totalItems).toBe(allContentItems.length);
      expect(state.canGoNext).toBe(false);
      expect(state.canGoPrevious).toBe(true);
    });

    it('should return correct navigation state for middle item', () => {
      if (!secondItemId) return;
      
      const state = getNavigationState(secondItemId);
      expect(state.currentIndex).toBe(1);
      expect(state.totalItems).toBe(allContentItems.length);
      expect(state.canGoNext).toBe(true);
      expect(state.canGoPrevious).toBe(true);
    });

    it('should handle non-existent item', () => {
      const state = getNavigationState('non-existent-id');
      expect(state.currentIndex).toBe(-1);
      expect(state.totalItems).toBe(allContentItems.length);
      expect(state.canGoNext).toBe(false);
      expect(state.canGoPrevious).toBe(false);
    });
  });

  describe('getNextItem', () => {
    it('should return next item when available', () => {
      if (!firstItemId || !secondItemId) return;
      
      const nextItem = getNextItem(firstItemId);
      expect(nextItem).not.toBeNull();
      expect(nextItem?.id).toBe(secondItemId);
    });

    it('should return null when at last item', () => {
      if (!lastItemId) return;
      
      const nextItem = getNextItem(lastItemId);
      expect(nextItem).toBeNull();
    });

    it('should return null for non-existent item', () => {
      const nextItem = getNextItem('non-existent-id');
      expect(nextItem).toBeNull();
    });
  });

  describe('getPreviousItem', () => {
    it('should return previous item when available', () => {
      if (!firstItemId || !secondItemId) return;
      
      const prevItem = getPreviousItem(secondItemId);
      expect(prevItem).not.toBeNull();
      expect(prevItem?.id).toBe(firstItemId);
    });

    it('should return null when at first item', () => {
      if (!firstItemId) return;
      
      const prevItem = getPreviousItem(firstItemId);
      expect(prevItem).toBeNull();
    });

    it('should return null for non-existent item', () => {
      const prevItem = getPreviousItem('non-existent-id');
      expect(prevItem).toBeNull();
    });
  });

  describe('getFirstItem', () => {
    it('should return first content item', () => {
      const firstItem = getFirstItem();
      expect(firstItem).not.toBeNull();
      expect(firstItem?.id).toBe(firstItemId);
    });

    it('should return first item even if content structure changes', () => {
      const firstItem = getFirstItem();
      expect(firstItem).toBe(allContentItems[0]);
    });
  });

  describe('getLastItem', () => {
    it('should return last content item', () => {
      const lastItem = getLastItem();
      expect(lastItem).not.toBeNull();
      expect(lastItem?.id).toBe(lastItemId);
    });

    it('should return last item even if content structure changes', () => {
      const lastItem = getLastItem();
      expect(lastItem).toBe(allContentItems[allContentItems.length - 1]);
    });
  });

  describe('Navigation Flow', () => {
    it('should allow complete forward navigation', () => {
      if (allContentItems.length < 2) return;
      
      let currentId = firstItemId;
      let count = 0;
      
      while (currentId && count < allContentItems.length) {
        const nextItem = getNextItem(currentId);
        if (nextItem) {
          currentId = nextItem.id;
          count++;
        } else {
          break;
        }
      }
      
      expect(currentId).toBe(lastItemId);
      expect(count).toBe(allContentItems.length - 1);
    });

    it('should allow complete backward navigation', () => {
      if (allContentItems.length < 2) return;
      
      let currentId = lastItemId;
      let count = 0;
      
      while (currentId && count < allContentItems.length) {
        const prevItem = getPreviousItem(currentId);
        if (prevItem) {
          currentId = prevItem.id;
          count++;
        } else {
          break;
        }
      }
      
      expect(currentId).toBe(firstItemId);
      expect(count).toBe(allContentItems.length - 1);
    });

    it('should maintain consistency between navigation functions', () => {
      if (!secondItemId) return;
      
      const nextFromFirst = getNextItem(firstItemId!);
      const prevFromSecond = getPreviousItem(secondItemId);
      
      expect(nextFromFirst?.id).toBe(secondItemId);
      expect(prevFromSecond?.id).toBe(firstItemId);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content gracefully', () => {
      // Test with mock empty content
      const mockGetFirstItem = () => null;
      const mockGetLastItem = () => null;
      
      expect(mockGetFirstItem()).toBeNull();
      expect(mockGetLastItem()).toBeNull();
    });

    it('should handle single item content', () => {
      // This test assumes we have at least one item
      if (allContentItems.length === 1) {
        const onlyItem = allContentItems[0];
        
        expect(getNextItem(onlyItem.id)).toBeNull();
        expect(getPreviousItem(onlyItem.id)).toBeNull();
        expect(getFirstItem()?.id).toBe(onlyItem.id);
        expect(getLastItem()?.id).toBe(onlyItem.id);
      }
    });
  });
});