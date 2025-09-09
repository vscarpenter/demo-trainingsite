export type ContentType = 'introduction' | 'prompt' | 'video';

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  filePath: string;
  section: string;
  subsection?: string;
  order: number;
}

export interface ContentSection {
  id: string;
  title: string;
  order: number;
  items: ContentItem[];
}

export interface NavigationState {
  currentIndex: number;
  totalItems: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
}
