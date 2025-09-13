#!/usr/bin/env node
// Generate search index at build time for optimal search performance
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { JSDOM } from 'jsdom';

const repoRoot = process.cwd();
const publicDir = path.join(repoRoot, 'public');
const outDir = path.join(repoRoot, 'src', 'data');
const indexFile = path.join(outDir, 'searchIndex.ts');

// Text processing utilities
function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .trim();
}

function tokenize(text) {
  const normalized = normalize(text);
  const tokens = normalized.match(/[a-z0-9]+/g) || [];
  return [...new Set(tokens)]; // Remove duplicates
}

function extractTextFromHtml(html) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Remove script, style, and other non-content elements
    const elementsToRemove = document.querySelectorAll('script, style, noscript, nav, footer, header');
    elementsToRemove.forEach(el => el.remove());
    
    // Get text content
    const textContent = document.body?.textContent || '';
    
    // Clean up whitespace
    return textContent.replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.warn(`Error parsing HTML: ${error.message}`);
    // Fallback: strip tags with regex
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

function createSnippets(text, maxLength = 200) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const snippets = [];
  
  for (let i = 0; i < Math.min(sentences.length, 3); i++) {
    const sentence = sentences[i].trim();
    if (sentence.length > 20 && sentence.length <= maxLength) {
      snippets.push(sentence);
    } else if (sentence.length > maxLength) {
      // Truncate long sentences
      const truncated = sentence.substring(0, maxLength).trim();
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > maxLength * 0.7) {
        snippets.push(truncated.substring(0, lastSpace) + '...');
      }
    }
  }
  
  return snippets;
}

// Read content structure file
async function readContentStructure() {
  try {
    const structurePath = path.join(outDir, 'contentStructure.ts');
    const content = await fs.readFile(structurePath, 'utf8');
    
    // Extract sections array (this is a simplified parser)
    const sectionsMatch = content.match(/export const contentSections: ContentSection\[\] = (\[[\s\S]*?\]);/);
    if (!sectionsMatch) {
      throw new Error('Could not parse contentSections from contentStructure.ts');
    }
    
    // Use eval to parse the structure (in build context this is acceptable)
    const sectionsCode = sectionsMatch[1];
    const contentSections = eval(sectionsCode);
    
    return contentSections;
  } catch (error) {
    console.error('Error reading content structure:', error);
    return [];
  }
}

// Build comprehensive search index
async function buildSearchIndex() {
  console.log('🔍 Building search index...');
  
  const contentSections = await readContentStructure();
  const allItems = contentSections.flatMap(section => section.items);
  
  console.log(`Found ${allItems.length} content items to index`);
  
  const searchIndex = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalItems: allItems.length,
      version: '1.0.0'
    },
    items: [],
    termIndex: new Map(), // term -> item IDs that contain it
    phrases: new Map()    // common phrases -> item IDs
  };
  
  let processed = 0;
  const errors = [];
  
  for (const item of allItems) {
    try {
      console.log(`Processing ${processed + 1}/${allItems.length}: ${item.id}`);
      
      // Read HTML content
      const filePath = path.join(publicDir, item.filePath.replace(/^\//, ''));
      let htmlContent = '';
      let textContent = '';
      let snippets = [];
      
      try {
        htmlContent = await fs.readFile(filePath, 'utf8');
        textContent = extractTextFromHtml(htmlContent);
        snippets = createSnippets(textContent);
      } catch (fileError) {
        console.warn(`Could not read file ${filePath}: ${fileError.message}`);
        errors.push(`${item.id}: ${fileError.message}`);
      }
      
      // Create searchable fields
      const searchableText = [
        item.title,
        item.section,
        item.subsection || '',
        textContent
      ].join(' ');
      
      // Generate tokens for full-text search
      const titleTokens = tokenize(item.title);
      const sectionTokens = tokenize(item.section);
      const subsectionTokens = tokenize(item.subsection || '');
      const bodyTokens = tokenize(textContent);
      const allTokens = [...new Set([...titleTokens, ...sectionTokens, ...subsectionTokens, ...bodyTokens])];
      
      // Create index entry
      const indexEntry = {
        id: item.id,
        title: item.title,
        section: item.section,
        subsection: item.subsection,
        type: item.type,
        order: item.order,
        filePath: item.filePath,
        
        // Search data
        titleTokens,
        sectionTokens,
        subsectionTokens,
        bodyTokens: bodyTokens.slice(0, 100), // Limit to prevent huge indexes
        allTokens: allTokens.slice(0, 150),
        
        // Pre-computed normalized fields for faster search
        normalizedTitle: normalize(item.title),
        normalizedSection: normalize(item.section),
        normalizedSubsection: normalize(item.subsection || ''),
        normalizedText: normalize(textContent).substring(0, 1000), // Truncate for performance
        
        // Content snippets for search results
        snippets: snippets.slice(0, 3),
        textLength: textContent.length,
        
        // Content hash for change detection
        contentHash: createHash('md5').update(htmlContent).digest('hex').substring(0, 8)
      };
      
      searchIndex.items.push(indexEntry);
      
      // Build term index (inverted index)
      allTokens.forEach(token => {
        if (!searchIndex.termIndex.has(token)) {
          searchIndex.termIndex.set(token, []);
        }
        searchIndex.termIndex.get(token).push(item.id);
      });
      
      processed++;
      
      // Progress indicator
      if (processed % 10 === 0) {
        console.log(`Processed ${processed}/${allItems.length} items`);
      }
      
    } catch (error) {
      console.error(`Error processing ${item.id}:`, error);
      errors.push(`${item.id}: ${error.message}`);
    }
  }
  
  // Convert Maps to Objects for serialization
  const serializedIndex = {
    ...searchIndex,
    termIndex: Object.fromEntries(searchIndex.termIndex),
    phrases: Object.fromEntries(searchIndex.phrases)
  };
  
  // Generate TypeScript file
  const tsContent = `// Auto-generated search index - DO NOT EDIT MANUALLY
// Generated on ${new Date().toISOString()}
// Total items indexed: ${processed}

export interface SearchIndexItem {
  id: string;
  title: string;
  section: string;
  subsection?: string;
  type: 'introduction' | 'prompt' | 'video';
  order: number;
  filePath: string;
  titleTokens: string[];
  sectionTokens: string[];
  subsectionTokens: string[];
  bodyTokens: string[];
  allTokens: string[];
  normalizedTitle: string;
  normalizedSection: string;
  normalizedSubsection: string;
  normalizedText: string;
  snippets: string[];
  textLength: number;
  contentHash: string;
}

export interface SearchIndex {
  metadata: {
    generatedAt: string;
    totalItems: number;
    version: string;
  };
  items: SearchIndexItem[];
  termIndex: Record<string, string[]>; // token -> item IDs
  phrases: Record<string, string[]>;   // phrase -> item IDs
}

export const searchIndex: SearchIndex = ${JSON.stringify(serializedIndex, null, 2)};

// Fast search utilities using pre-built index
export function searchIndexByTerm(term: string): string[] {
  const normalizedTerm = term.toLowerCase().trim();
  return searchIndex.termIndex[normalizedTerm] || [];
}

export function getItemById(id: string): SearchIndexItem | undefined {
  return searchIndex.items.find(item => item.id === id);
}

export function searchMultipleTerms(terms: string[]): string[] {
  if (terms.length === 0) return [];
  
  const normalizedTerms = terms.map(t => t.toLowerCase().trim());
  let resultIds = new Set(searchIndexByTerm(normalizedTerms[0]));
  
  // Intersection of all terms (AND search)
  for (let i = 1; i < normalizedTerms.length; i++) {
    const termResults = new Set(searchIndexByTerm(normalizedTerms[i]));
    resultIds = new Set([...resultIds].filter(id => termResults.has(id)));
  }
  
  return Array.from(resultIds);
}

export function fuzzySearchIndex(query: string, limit = 50): SearchIndexItem[] {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (terms.length === 0) return [];
  
  const candidateIds = searchMultipleTerms(terms);
  const candidates = candidateIds
    .map(id => getItemById(id))
    .filter(Boolean) as SearchIndexItem[];
  
  // Simple relevance scoring
  const scored = candidates.map(item => {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Title matches (highest weight)
    if (item.normalizedTitle.includes(queryLower)) score += 100;
    
    // Section matches
    if (item.normalizedSection.includes(queryLower)) score += 50;
    
    // Token matches
    terms.forEach(term => {
      if (item.titleTokens.some(t => t.includes(term))) score += 20;
      if (item.sectionTokens.some(t => t.includes(term))) score += 10;
      if (item.bodyTokens.some(t => t.includes(term))) score += 5;
    });
    
    return { item, score };
  });
  
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.item);
}
`;
  
  // Write the index file
  await fs.writeFile(indexFile, tsContent, 'utf8');
  
  console.log(`\n✅ Search index generated successfully!`);
  console.log(`📊 Statistics:`);
  console.log(`   - Items indexed: ${processed}`);
  console.log(`   - Unique terms: ${Object.keys(serializedIndex.termIndex).length}`);
  console.log(`   - Index file: ${indexFile}`);
  console.log(`   - File size: ${(Buffer.byteLength(tsContent, 'utf8') / 1024).toFixed(1)} KB`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`);
    errors.forEach(error => console.log(`   - ${error}`));
  }
  
  return {
    itemsProcessed: processed,
    termsIndexed: Object.keys(serializedIndex.termIndex).length,
    errors
  };
}

// Run the indexer
if (import.meta.url === `file://${process.argv[1]}`) {
  buildSearchIndex()
    .then((result) => {
      console.log('\n🎉 Search index generation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Search index generation failed:', error);
      process.exit(1);
    });
}

export { buildSearchIndex };
