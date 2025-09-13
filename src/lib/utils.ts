import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ContentItem, SearchResult, ContentSection } from '@/types/content';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Escape HTML special characters to prevent XSS
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Highlight search terms in text with proper escaping
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .trim();
}

function tokenize(text: string): string[] {
  const norm = normalize(text);
  const tokens = norm.match(/[a-z0-9]+/g) || [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

function parseQuery(searchQuery: string): { phrase: string | null; tokens: string[] } {
  const q = searchQuery.trim();
  if (!q) return { phrase: null, tokens: [] };
  const phraseMatch = q.match(/\"([^\"]+)\"/);
  const phrase = phraseMatch ? normalize(phraseMatch[1]) : null;
  const remainder = phraseMatch ? q.replace(phraseMatch[0], ' ') : q;
  const tokens = tokenize(remainder);
  return { phrase, tokens };
}

export function highlightSearchTerms(text: string, searchQuery: string): string {
  if (!searchQuery.trim()) return escapeHtml(text);

  const escapedText = escapeHtml(text);
  const { phrase, tokens } = parseQuery(searchQuery);
  const parts: string[] = [];
  if (phrase) parts.push(phrase);
  for (const t of tokens) parts.push(t);
  if (parts.length === 0) return escapedText;

  const escapedParts = parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedParts.join('|')})`, 'gi');
  return escapedText.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">$1</mark>');
}

// Fuzzy search function that searches across content titles, sections, and subsections
type IndexedItem = {
  item: ContentItem;
  normTitle: string;
  normSection: string;
  normSubsection: string;
  titleTokens: string[];
  sectionTokens: string[];
  subsectionTokens: string[];
};

const indexCache = new WeakMap<ContentItem[], IndexedItem[]>();

function buildIndex(items: ContentItem[]): IndexedItem[] {
  return items.map((item) => {
    const normTitle = normalize(item.title);
    const normSection = normalize(item.section);
    const normSubsection = normalize(item.subsection || '');
    return {
      item,
      normTitle,
      normSection,
      normSubsection,
      titleTokens: tokenize(item.title),
      sectionTokens: tokenize(item.section),
      subsectionTokens: tokenize(item.subsection || ''),
    };
  });
}

// Weighted, multi-term search across title/section/subsection with basic ranking
export function searchContent(items: ContentItem[], query: string): SearchResult[] {
  if (!query.trim()) return [];

  let idx = indexCache.get(items);
  if (!idx) {
    idx = buildIndex(items);
    indexCache.set(items, idx);
  }

  const { phrase, tokens } = parseQuery(query);
  const hasTokens = tokens.length > 0;

  const resultsWithScore: Array<{ score: number; matchType: 'title' | 'section' | 'subsection'; item: ContentItem }> = [];

  for (const rec of idx) {
    let score = 0;
    let matchedField: 'title' | 'section' | 'subsection' | null = null;

    // Phrase match boosts
    if (phrase) {
      if (rec.normTitle.includes(phrase)) { score += 120; matchedField = matchedField || 'title'; }
      if (rec.normSubsection && rec.normSubsection.includes(phrase)) { score += 40; matchedField = matchedField || 'subsection'; }
      if (rec.normSection.includes(phrase)) { score += 30; matchedField = matchedField || 'section'; }
    }

    // Token scoring (require AND across tokens)
    if (hasTokens) {
      let allPresent = true;
      for (const t of tokens) {
        const inTitle = rec.titleTokens.some(rt => rt.includes(t));
        const inSub = rec.subsectionTokens.some(rt => rt.includes(t));
        const inSec = rec.sectionTokens.some(rt => rt.includes(t));
        if (!inTitle && !inSub && !inSec) { allPresent = false; break; }
        if (inTitle) {
          const starts = rec.titleTokens.some(rt => rt.startsWith(t));
          score += starts ? 30 : 18;
          matchedField = matchedField || 'title';
        }
        if (inSub) {
          const starts = rec.subsectionTokens.some(rt => rt.startsWith(t));
          score += starts ? 14 : 8;
          matchedField = matchedField || 'subsection';
        }
        if (inSec) {
          const starts = rec.sectionTokens.some(rt => rt.startsWith(t));
          score += starts ? 12 : 6;
          matchedField = matchedField || 'section';
        }
      }
      if (!allPresent) {
        // If not all tokens present, only keep if phrase matched strongly
        if (!phrase || score < 100) {
          continue;
        }
      }
    }

    if (score > 0) {
      resultsWithScore.push({ score, matchType: matchedField || 'title', item: rec.item });
    }
  }

  // Sort by score desc, then by field priority, then by item order
  resultsWithScore.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const order = { title: 0, section: 1, subsection: 2 } as const;
    if (order[a.matchType] !== order[b.matchType]) return order[a.matchType] - order[b.matchType];
    return (a.item.order || 0) - (b.item.order || 0);
  });

  const results: SearchResult[] = resultsWithScore.slice(0, 50).map(({ item, matchType }) => ({
    item,
    matchType,
    highlightedTitle: highlightSearchTerms(item.title, query)
  }));

  return results;
}

// --- Body-text indexing and snippet support ---

type BodyIndexRecord = {
  text: string;        // plain text extracted from HTML
  normText: string;    // normalized for matching
};

const bodyIndex = new Map<string, BodyIndexRecord>();
const bodyIndexingPromises = new Map<string, Promise<void>>();

function extractTextFromHtml(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Remove scripts/styles to avoid noise
    doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
    const text = doc.body?.textContent || '';
    // Collapse whitespace
    return text.replace(/\s+/g, ' ').trim();
  } catch {
    // Fallback: strip tags
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

async function ensureBodyIndexed(item: ContentItem): Promise<void> {
  if (bodyIndex.has(item.id)) return;
  const existing = bodyIndexingPromises.get(item.id);
  if (existing) { await existing; return; }
  const p = (async () => {
    try {
      const res = await fetch(item.filePath, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`Failed to fetch ${item.filePath}`);
      const html = await res.text();
      const text = extractTextFromHtml(html);
      bodyIndex.set(item.id, { text, normText: normalize(text) });
    } catch {
      bodyIndex.set(item.id, { text: '', normText: '' });
    } finally {
      bodyIndexingPromises.delete(item.id);
    }
  })();
  bodyIndexingPromises.set(item.id, p);
  await p;
}

function needlesForSnippet(query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  const m = q.match(/\"([^\"]+)\"/);
  const phrase = m ? m[1].toLowerCase() : null;
  const rest = (m ? q.replace(m[0], ' ') : q).toLowerCase();
  const toks = (rest.match(/[a-z0-9]+/g) || []).slice(0, 5); // cap
  return phrase ? [phrase, ...toks] : toks;
}

function makeSnippet(text: string, query: string): string | null {
  if (!text) return null;
  const needles = needlesForSnippet(query);
  if (needles.length === 0) return null;
  const lower = text.toLowerCase();
  let bestIdx = -1;
  let bestNeedle = '';
  // Prefer phrase if provided (needles[0] may be phrase)
  for (const n of needles) {
    const i = lower.indexOf(n);
    if (i !== -1 && (bestIdx === -1 || n.includes(' ') || i < bestIdx)) {
      bestIdx = i;
      bestNeedle = n;
      if (n.includes(' ')) break; // phrase wins
    }
  }
  if (bestIdx === -1) return null;
  const radius = 120;
  const start = Math.max(0, bestIdx - radius);
  const end = Math.min(text.length, bestIdx + bestNeedle.length + radius);
  const slice = text.slice(start, end).trim();
  const withEllipses = `${start > 0 ? '… ' : ''}${slice}${end < text.length ? ' …' : ''}`;
  return highlightSearchTerms(withEllipses, query);
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, iter: (t: T) => Promise<R>): Promise<R[]> {
  const ret: R[] = [];
  let idx = 0;
  const workers: Promise<void>[] = [];
  const run = async () => {
    while (idx < items.length) {
      const i = idx++;
      const r = await iter(items[i]);
      ret[i] = r;
    }
  };
  const n = Math.max(1, Math.min(limit, items.length));
  for (let i = 0; i < n; i++) workers.push(run());
  await Promise.all(workers);
  return ret;
}

export async function searchContentWithBody(items: ContentItem[], query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  // Build/ensure header index
  let idx = indexCache.get(items);
  if (!idx) {
    idx = buildIndex(items);
    indexCache.set(items, idx);
  }

  const { phrase, tokens } = parseQuery(query);
  const hasTokens = tokens.length > 0;

  // First pass: header-only scores
  const prelim: Array<{ item: ContentItem; score: number; matchType: 'title' | 'section' | 'subsection' }>
    = [];
  for (const rec of idx) {
    let score = 0;
    let matchedField: 'title' | 'section' | 'subsection' | null = null;
    if (phrase) {
      if (rec.normTitle.includes(phrase)) { score += 120; matchedField = matchedField || 'title'; }
      if (rec.normSubsection && rec.normSubsection.includes(phrase)) { score += 40; matchedField = matchedField || 'subsection'; }
      if (rec.normSection.includes(phrase)) { score += 30; matchedField = matchedField || 'section'; }
    }
    if (hasTokens) {
      let allPresent = true;
      for (const t of tokens) {
        const inTitle = rec.titleTokens.some(rt => rt.includes(t));
        const inSub = rec.subsectionTokens.some(rt => rt.includes(t));
        const inSec = rec.sectionTokens.some(rt => rt.includes(t));
        if (!inTitle && !inSub && !inSec) { allPresent = false; break; }
        if (inTitle) { score += rec.titleTokens.some(rt => rt.startsWith(t)) ? 30 : 18; matchedField = matchedField || 'title'; }
        if (inSub) { score += rec.subsectionTokens.some(rt => rt.startsWith(t)) ? 14 : 8; matchedField = matchedField || 'subsection'; }
        if (inSec) { score += rec.sectionTokens.some(rt => rt.startsWith(t)) ? 12 : 6; matchedField = matchedField || 'section'; }
      }
      if (!allPresent && (!phrase || score < 100)) {
        // no header signal; leave score as-is (may be 0)
      }
    }
    if (score > 0) prelim.push({ item: rec.item, score, matchType: matchedField || 'title' });
  }

  // If not many header matches, index all bodies; otherwise, index bodies for all items anyway but concurrency-limited.
  await mapWithConcurrency(items, 6, async (it) => ensureBodyIndexed(it));

  // Second pass: incorporate body matches and build snippets
  const byId = new Map<string, { score: number; matchType: 'title' | 'section' | 'subsection' | 'subsection' | 'section' }>();
  for (const r of prelim) byId.set(r.item.id, { score: r.score, matchType: r.matchType });

  const resultsWithExtras: Array<{ item: ContentItem; score: number; matchType: 'title' | 'section' | 'subsection'; highlightedSnippet?: string }>
    = [];

  for (const item of items) {
    const body = bodyIndex.get(item.id);
    const base = byId.get(item.id);
    let score = base?.score ?? 0;
    let matchType = base?.matchType ?? 'title';
    let snippet: string | undefined = undefined;

    if (body && (phrase || hasTokens)) {
      let bodyMatchedAll = true;
      if (phrase && body.normText.includes(phrase)) {
        score += 50; // phrase in body
      }
      if (hasTokens) {
        for (const t of tokens) {
          if (body.normText.includes(t)) {
            score += 8; // per token in body
          } else {
            bodyMatchedAll = false;
          }
        }
      }
      if ((phrase && body.normText.includes(phrase)) || (hasTokens && bodyMatchedAll)) {
        snippet = makeSnippet(body.text, query) || undefined;
        if (!base) matchType = 'subsection'; // treat body-only as lower priority than title
      }
    }

    if (score > 0) {
      resultsWithExtras.push({ item, score, matchType: matchType as 'title' | 'section' | 'subsection', highlightedSnippet: snippet });
    }
  }

  resultsWithExtras.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const order = { title: 0, section: 1, subsection: 2 } as const;
    if (order[a.matchType] !== order[b.matchType]) return order[a.matchType] - order[b.matchType];
    return (a.item.order || 0) - (b.item.order || 0);
  });

  return resultsWithExtras.slice(0, 50).map(({ item, matchType, highlightedSnippet }) => ({
    item,
    matchType,
    highlightedTitle: highlightSearchTerms(item.title, query),
    highlightedSnippet,
  }));
}

// Debounce function for search input
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Get all content items from content sections
export function getAllContentItems(contentSections: ContentSection[]): ContentItem[] {
  return contentSections.flatMap(section => section.items);
}
