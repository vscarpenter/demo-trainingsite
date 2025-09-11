#!/usr/bin/env node
// Auto-generate src/data/contentStructure.ts from files under public/
// Scans sections, introductions, and slide pairs (prompt + video)
// Enhanced with validation, error checking, and content optimization

import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const repoRoot = process.cwd();
const publicDir = path.join(repoRoot, 'public');
const outFile = path.join(repoRoot, 'src', 'data', 'contentStructure.ts');

const numberPrefixRe = /^(\d+)\.\s*/;

const toSectionOrder = (name) => {
  const m = name.match(numberPrefixRe);
  return m ? parseInt(m[1], 10) : 9999;
};

const stripNumberPrefix = (name) => name.replace(numberPrefixRe, '').trim();

const toIdSlug = (name) =>
  stripNumberPrefix(name)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const isDir = async (p) => {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
};

const listDir = async (p) => {
  try {
    return await fs.readdir(p, { withFileTypes: true });
  } catch {
    return [];
  }
};

const readSectionDirs = async () => {
  const entries = await listDir(publicDir);
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => /^\d+\./.test(name))
    .sort((a, b) => toSectionOrder(a) - toSectionOrder(b));
};

const exists = async (p) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

const buildItemsForSection = async (sectionFolder) => {
  const sectionAbs = path.join(publicDir, sectionFolder);
  const sectionTitle = sectionFolder; // Keep as-is for display (includes numbering)
  const sectionName = stripNumberPrefix(sectionFolder); // Plain name without numbering
  const sectionId = toIdSlug(sectionFolder);

  const items = [];

  // Introduction (preserve exact filename case to work on case-sensitive hosts)
  const rootFiles = (await listDir(sectionAbs)).filter((e) => e.isFile()).map((e) => e.name);
  const introActual = rootFiles.find((f) => f.toLowerCase() === 'introduction.html');
  if (introActual) {
    items.push({
      id: `${sectionId}-intro`,
      title: `${sectionName} Introduction`,
      type: 'introduction',
      filePath: `/${sectionFolder}/${introActual}`,
      section: sectionTitle,
      order: 1,
    });
  }

  // Discover subsections (subfolders) if any
  const subEntries = await listDir(sectionAbs);
  const subDirs = subEntries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

  const slideFileRe = /^slide_(\d+)_([A-Za-z]+)(?:_Video)?\.html$/;

  const addSlidePair = (basePath, subsection, file) => {
    const m = file.match(slideFileRe);
    if (!m) return null;
    const slideNum = parseInt(m[1], 10);
    const app = m[2];
    return { slideNum, subsection: subsection || app };
  };

  const slideMap = new Map(); // key: `${subsection}:${slideNum}` -> { promptPath, videoPath }

  const processFolderForSlides = async (folderAbs, folderRel, subsectionName) => {
    const files = (await listDir(folderAbs)).filter((e) => e.isFile()).map((e) => e.name);
    for (const f of files) {
      const info = addSlidePair(folderRel, subsectionName, f);
      if (!info) continue;
      const key = `${info.subsection}:${info.slideNum}`;
      const entry = slideMap.get(key) || { slideNum: info.slideNum, subsection: info.subsection, promptPath: null, videoPath: null };
      if (/Video\.html$/.test(f)) entry.videoPath = `/${folderRel}/${f}`;
      else entry.promptPath = `/${folderRel}/${f}`;
      slideMap.set(key, entry);
    }
  };

  if (subDirs.length > 0) {
    // Has subsections (e.g., Office Apps)
    for (const sd of subDirs) {
      await processFolderForSlides(path.join(sectionAbs, sd), path.posix.join(sectionFolder, sd), sd);
    }
  } else {
    // Flat slides within the section folder (e.g., Outlook, Teams, SharePoint)
    await processFolderForSlides(sectionAbs, sectionFolder, stripNumberPrefix(sectionFolder));
  }

  // Convert slideMap to items, ordered by slide number and interleave prompt/video
  const slideEntries = Array.from(slideMap.values()).sort((a, b) => a.slideNum - b.slideNum);

  let orderCounter = items.length > 0 ? 2 : 1; // If intro present, continue from 2
  for (const s of slideEntries) {
    if (s.promptPath) {
      items.push({
        id: `${toIdSlug(sectionFolder)}-${s.slideNum}`,
        title: `${stripNumberPrefix(sectionFolder)} Slide ${s.slideNum}`,
        type: 'prompt',
        filePath: s.promptPath,
        section: sectionTitle,
        subsection: s.subsection,
        order: orderCounter++,
      });
    }
    if (s.videoPath) {
      items.push({
        id: `${toIdSlug(sectionFolder)}-${s.slideNum}-video`,
        title: `${stripNumberPrefix(sectionFolder)} Slide ${s.slideNum} Video`,
        type: 'video',
        filePath: s.videoPath,
        section: sectionTitle,
        subsection: s.subsection,
        order: orderCounter++,
      });
    }
  }

  return {
    id: sectionId,
    title: sectionTitle,
    order: toSectionOrder(sectionFolder),
    items,
  };
};

// Validation and error tracking
const validationErrors = [];
const validationWarnings = [];

const validateContentFile = async (filePath) => {
  const fullPath = path.join(publicDir, filePath.replace(/^\//, ''));
  try {
    const stats = await fs.stat(fullPath);
    if (!stats.isFile()) {
      validationErrors.push(`Referenced path is not a file: ${filePath}`);
      return false;
    }
    
    // Check file size (warn if > 5MB)
    if (stats.size > 5 * 1024 * 1024) {
      validationWarnings.push(`Large file detected (${Math.round(stats.size / 1024 / 1024)}MB): ${filePath}`);
    }
    
    // Validate HTML files have basic structure
    if (filePath.endsWith('.html')) {
      const content = await fs.readFile(fullPath, 'utf8');
      if (!content.includes('<html') && !content.includes('<HTML')) {
        validationWarnings.push(`HTML file may be malformed (no <html> tag): ${filePath}`);
      }
    }
    
    return true;
  } catch (error) {
    validationErrors.push(`File not found or inaccessible: ${filePath} (${error.message})`);
    return false;
  }
};

const generateContentHash = (sections) => {
  const contentString = JSON.stringify(sections, null, 2);
  return createHash('sha256').update(contentString).digest('hex').substring(0, 8);
};

const optimizeContent = (content) => {
  // Remove excessive whitespace and normalize line endings
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const generate = async () => {
  console.log('🚀 Starting content generation with validation...');
  
  if (!(await isDir(publicDir))) {
    console.error('❌ Public directory not found:', publicDir);
    process.exit(1);
  }

  const sectionDirs = await readSectionDirs();
  console.log(`📁 Found ${sectionDirs.length} sections: ${sectionDirs.join(', ')}`);
  
  const sections = [];
  let totalItems = 0;
  
  for (const sd of sectionDirs) {
    console.log(`📝 Processing section: ${sd}`);
    const section = await buildItemsForSection(sd);
    sections.push(section);
    totalItems += section.items.length;
    
    // Validate all file paths in this section
    for (const item of section.items) {
      await validateContentFile(item.filePath);
    }
  }

  // Report validation results
  if (validationErrors.length > 0) {
    console.error('\n❌ Validation Errors:');
    validationErrors.forEach(error => console.error(`  • ${error}`));
    process.exit(1);
  }
  
  if (validationWarnings.length > 0) {
    console.warn('\n⚠️  Validation Warnings:');
    validationWarnings.forEach(warning => console.warn(`  • ${warning}`));
  }

  // Generate content hash for versioning
  const contentHash = generateContentHash(sections);
  console.log(`🔍 Content hash: ${contentHash}`);

  // Assemble TypeScript output with metadata
  const header = `import { ContentItem, ContentSection } from '../types/content';\n\n` +
    `// Generated on ${new Date().toISOString()}\n` +
    `// Content hash: ${contentHash}\n` +
    `// Total sections: ${sections.length}, Total items: ${totalItems}\n\n`;
    
  const sectionsJson = JSON.stringify(sections, null, 2)
    .replace(/"type":\s*"(introduction|prompt|video)"/g, (m) => m) // keep as strings
    .replace(/"([a-zA-Z_]+)":/g, '$1:') // unquote keys for TS aesthetics
    .replace(/"/g, '\''); // use single quotes

  const body = `export const contentSections: ContentSection[] = ${sectionsJson};\n\n`;

  const helpers = `// Content metadata\n` +
    `export const contentMetadata = {\n` +
    `  generatedAt: '${new Date().toISOString()}',\n` +
    `  contentHash: '${contentHash}',\n` +
    `  totalSections: ${sections.length},\n` +
    `  totalItems: ${totalItems},\n` +
    `  version: '1.0.0'\n` +
    `};\n\n` +
    `// Flatten all content items into a single array for navigation\n` +
    `export const allContentItems: ContentItem[] = contentSections\n` +
    `  .flatMap(section => section.items)\n` +
    `  .sort((a, b) => {\n` +
    `    const sectionA = contentSections.find(s => s.title === a.section);\n` +
    `    const sectionB = contentSections.find(s => s.title === b.section);\n` +
    `    if (sectionA && sectionB && sectionA.order !== sectionB.order) {\n` +
    `      return sectionA.order - sectionB.order;\n` +
    `    }\n` +
    `    return a.order - b.order;\n` +
    `  });\n\n` +
    `export const getNavigationState = (currentId: string) => {\n` +
    `  const currentIndex = allContentItems.findIndex(item => item.id === currentId);\n` +
    `  return {\n` +
    `    currentIndex,\n` +
    `    totalItems: allContentItems.length,\n` +
    `    canGoNext: currentIndex < allContentItems.length - 1,\n` +
    `    canGoPrevious: currentIndex > 0\n` +
    `  };\n` +
    `};\n\n` +
    `export const getNextItem = (currentId: string): ContentItem | null => {\n` +
    `  const currentIndex = allContentItems.findIndex(item => item.id === currentId);\n` +
    `  return currentIndex < allContentItems.length - 1 ? allContentItems[currentIndex + 1] : null;\n` +
    `};\n\n` +
    `export const getPreviousItem = (currentId: string): ContentItem | null => {\n` +
    `  const currentIndex = allContentItems.findIndex(item => item.id === currentId);\n` +
    `  return currentIndex > 0 ? allContentItems[currentIndex - 1] : null;\n` +
    `};\n`;

  const fileContent = optimizeContent(header + body + helpers);

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, fileContent, 'utf8');
  
  console.log(`✅ Generated ${path.relative(repoRoot, outFile)}`);
  console.log(`📊 Summary: ${sections.length} sections, ${totalItems} items`);
  
  // Generate content manifest for build optimization
  const manifest = {
    generatedAt: new Date().toISOString(),
    contentHash,
    sections: sections.length,
    items: totalItems,
    files: sections.flatMap(s => s.items.map(i => i.filePath))
  };
  
  // Save manifest to src for inclusion in build
  const manifestPath = path.join(repoRoot, 'src', 'data', 'content-manifest.json');
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`📋 Generated content manifest: ${path.relative(repoRoot, manifestPath)}`);
};

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
