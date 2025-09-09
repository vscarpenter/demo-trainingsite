#!/usr/bin/env node
// Auto-generate src/data/contentStructure.ts from files under public/
// Scans sections, introductions, and slide pairs (prompt + video)

import { promises as fs } from 'fs';
import path from 'path';

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

const generate = async () => {
  if (!(await isDir(publicDir))) {
    console.error('Public directory not found:', publicDir);
    process.exit(1);
  }

  const sectionDirs = await readSectionDirs();
  const sections = [];
  for (const sd of sectionDirs) {
    sections.push(await buildItemsForSection(sd));
  }

  // Assemble TypeScript output
  const header = `import { ContentItem, ContentSection } from '../types/content';\n\n`;
  const sectionsJson = JSON.stringify(sections, null, 2)
    .replace(/"type":\s*"(introduction|prompt|video)"/g, (m) => m) // keep as strings
    .replace(/"([a-zA-Z_]+)":/g, '$1:') // unquote keys for TS aesthetics
    .replace(/"/g, '\''); // use single quotes

  const body = `export const contentSections: ContentSection[] = ${sectionsJson};\n\n`;

  const helpers = `// Flatten all content items into a single array for navigation\n` +
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

  const fileContent = header + body + helpers;

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, fileContent, 'utf8');
  console.log(`Generated ${path.relative(repoRoot, outFile)} with ${sections.length} sections.`);
};

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
