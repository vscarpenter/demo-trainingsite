import { ContentItem, ContentSection } from '../types/content';

export const contentSections: ContentSection[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    order: 1,
    items: [
      {
        id: 'intro-1',
        title: 'The Microsoft 365 Copilot Experience',
        type: 'introduction',
        filePath: '/1. Introduction/introduction.html',
        section: '1. Introduction',
        order: 1
      }
    ]
  },
  {
    id: 'office-apps',
    title: '2. Office Apps',
    order: 2,
    items: [
      // Introduction to Office Apps
      {
        id: 'office-intro',
        title: 'Office Apps Introduction',
        type: 'introduction',
        filePath: '/2. Office Apps/Introduction.html',
        section: '2. Office Apps',
        order: 1
      },
      // Word slides (4-13)
      ...Array.from({ length: 10 }, (_, i) => {
        const slideNum = i + 4;
        return [
          {
            id: `word-${slideNum}`,
            title: `Word Slide ${slideNum}`,
            type: 'prompt' as const,
            filePath: `/2. Office Apps/Word/slide_${slideNum}_Word.html`,
            section: '2. Office Apps',
            subsection: 'Word',
            order: i * 2 + 2
          },
          {
            id: `word-${slideNum}-video`,
            title: `Word Slide ${slideNum} Video`,
            type: 'video' as const,
            filePath: `/2. Office Apps/Word/slide_${slideNum}_Word_Video.html`,
            section: '2. Office Apps',
            subsection: 'Word',
            order: i * 2 + 3
          }
        ];
      }).flat(),
      // Excel slides (14-25)
      ...Array.from({ length: 12 }, (_, i) => {
        const slideNum = i + 14;
        return [
          {
            id: `excel-${slideNum}`,
            title: `Excel Slide ${slideNum}`,
            type: 'prompt' as const,
            filePath: `/2. Office Apps/Excel/slide_${slideNum}_Excel.html`,
            section: '2. Office Apps',
            subsection: 'Excel',
            order: 22 + i * 2
          },
          {
            id: `excel-${slideNum}-video`,
            title: `Excel Slide ${slideNum} Video`,
            type: 'video' as const,
            filePath: `/2. Office Apps/Excel/slide_${slideNum}_Excel_Video.html`,
            section: '2. Office Apps',
            subsection: 'Excel',
            order: 22 + i * 2 + 1
          }
        ];
      }).flat(),
      // PowerPoint slides (26-35)
      ...Array.from({ length: 10 }, (_, i) => {
        const slideNum = i + 26;
        return [
          {
            id: `powerpoint-${slideNum}`,
            title: `PowerPoint Slide ${slideNum}`,
            type: 'prompt' as const,
            filePath: `/2. Office Apps/PowerPoint/slide_${slideNum}_PowerPoint.html`,
            section: '2. Office Apps',
            subsection: 'PowerPoint',
            order: 46 + i * 2
          },
          {
            id: `powerpoint-${slideNum}-video`,
            title: `PowerPoint Slide ${slideNum} Video`,
            type: 'video' as const,
            filePath: `/2. Office Apps/PowerPoint/slide_${slideNum}_PowerPoint_Video.html`,
            section: '2. Office Apps',
            subsection: 'PowerPoint',
            order: 46 + i * 2 + 1
          }
        ];
      }).flat()
    ]
  },
  {
    id: 'outlook',
    title: '3. Outlook',
    order: 3,
    items: [
      {
        id: 'outlook-intro',
        title: 'Outlook Introduction',
        type: 'introduction',
        filePath: '/3. Outlook/introduction.html',
        section: '3. Outlook',
        order: 1
      }
    ]
  },
  {
    id: 'teams',
    title: '4. Teams',
    order: 4,
    items: [
      {
        id: 'teams-intro',
        title: 'Teams Introduction',
        type: 'introduction',
        filePath: '/4. Teams/introduction.html',
        section: '4. Teams',
        order: 1
      }
    ]
  },
  {
    id: 'onenote',
    title: '5. OneNote',
    order: 5,
    items: [
      {
        id: 'onenote-intro',
        title: 'OneNote Introduction',
        type: 'introduction',
        filePath: '/5. OneNote/introduction.html',
        section: '5. OneNote',
        order: 1
      }
    ]
  },
  {
    id: 'sharepoint',
    title: '6. SharePoint',
    order: 6,
    items: [
      {
        id: 'sharepoint-intro',
        title: 'SharePoint Introduction',
        type: 'introduction',
        filePath: '/6. SharePoint/introduction.html',
        section: '6. SharePoint',
        order: 1
      }
    ]
  },
  {
    id: 'prompting-tips',
    title: '7. Prompting Tips',
    order: 7,
    items: [
      {
        id: 'prompting-tips-intro',
        title: 'Prompting Tips Introduction',
        type: 'introduction',
        filePath: '/7. Prompting Tips/introduction.html',
        section: '7. Prompting Tips',
        order: 1
      }
    ]
  }
];

// Flatten all content items into a single array for navigation
export const allContentItems: ContentItem[] = contentSections
  .flatMap(section => section.items)
  .sort((a, b) => {
    // First sort by section order, then by item order
    const sectionA = contentSections.find(s => s.title === a.section);
    const sectionB = contentSections.find(s => s.title === b.section);
    
    if (sectionA && sectionB) {
      if (sectionA.order !== sectionB.order) {
        return sectionA.order - sectionB.order;
      }
    }
    
    return a.order - b.order;
  });

export const getNavigationState = (currentId: string) => {
  const currentIndex = allContentItems.findIndex(item => item.id === currentId);
  
  return {
    currentIndex,
    totalItems: allContentItems.length,
    canGoNext: currentIndex < allContentItems.length - 1,
    canGoPrevious: currentIndex > 0
  };
};

export const getNextItem = (currentId: string): ContentItem | null => {
  const currentIndex = allContentItems.findIndex(item => item.id === currentId);
  if (currentIndex < allContentItems.length - 1) {
    return allContentItems[currentIndex + 1];
  }
  return null;
};

export const getPreviousItem = (currentId: string): ContentItem | null => {
  const currentIndex = allContentItems.findIndex(item => item.id === currentId);
  if (currentIndex > 0) {
    return allContentItems[currentIndex - 1];
  }
  return null;
};