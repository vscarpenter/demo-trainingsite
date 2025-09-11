#!/usr/bin/env node
// Content update workflow and versioning system
// Manages content updates, validation, and version tracking

import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const repoRoot = process.cwd();
const publicDir = path.join(repoRoot, 'public');
const versionsDir = path.join(repoRoot, '.content-versions');

// Content version metadata
const createVersionMetadata = (sections, changes = []) => {
  const contentString = JSON.stringify(sections, null, 2);
  const hash = createHash('sha256').update(contentString).digest('hex');
  
  return {
    version: generateVersionNumber(),
    timestamp: new Date().toISOString(),
    hash: hash.substring(0, 16),
    shortHash: hash.substring(0, 8),
    sections: sections.length,
    totalItems: sections.reduce((sum, s) => sum + s.items.length, 0),
    changes,
    files: sections.flatMap(s => s.items.map(i => i.filePath))
  };
};

// Generate semantic version number
const generateVersionNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}.${month}.${day}-${hour}${minute}`;
};

// Load existing version history
const loadVersionHistory = async () => {
  const historyPath = path.join(versionsDir, 'history.json');
  try {
    const content = await fs.readFile(historyPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return { versions: [], latest: null };
  }
};

// Save version history
const saveVersionHistory = async (history) => {
  await fs.mkdir(versionsDir, { recursive: true });
  const historyPath = path.join(versionsDir, 'history.json');
  await fs.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf8');
};

// Compare two content structures to detect changes
const detectChanges = (oldSections, newSections) => {
  const changes = [];
  
  // Create maps for easier comparison
  const oldItemsMap = new Map();
  const newItemsMap = new Map();
  
  oldSections?.forEach(section => {
    section.items.forEach(item => {
      oldItemsMap.set(item.id, item);
    });
  });
  
  newSections.forEach(section => {
    section.items.forEach(item => {
      newItemsMap.set(item.id, item);
    });
  });
  
  // Detect new items
  for (const [id, item] of newItemsMap) {
    if (!oldItemsMap.has(id)) {
      changes.push({
        type: 'added',
        itemId: id,
        title: item.title,
        section: item.section,
        filePath: item.filePath
      });
    }
  }
  
  // Detect removed items
  for (const [id, item] of oldItemsMap) {
    if (!newItemsMap.has(id)) {
      changes.push({
        type: 'removed',
        itemId: id,
        title: item.title,
        section: item.section,
        filePath: item.filePath
      });
    }
  }
  
  // Detect modified items
  for (const [id, newItem] of newItemsMap) {
    const oldItem = oldItemsMap.get(id);
    if (oldItem) {
      const modifications = [];
      
      if (oldItem.title !== newItem.title) {
        modifications.push(`title: "${oldItem.title}" → "${newItem.title}"`);
      }
      if (oldItem.filePath !== newItem.filePath) {
        modifications.push(`filePath: "${oldItem.filePath}" → "${newItem.filePath}"`);
      }
      if (oldItem.section !== newItem.section) {
        modifications.push(`section: "${oldItem.section}" → "${newItem.section}"`);
      }
      if (oldItem.subsection !== newItem.subsection) {
        modifications.push(`subsection: "${oldItem.subsection}" → "${newItem.subsection}"`);
      }
      
      if (modifications.length > 0) {
        changes.push({
          type: 'modified',
          itemId: id,
          title: newItem.title,
          section: newItem.section,
          modifications
        });
      }
    }
  }
  
  return changes;
};

// Validate content files exist
const validateContentFiles = async (sections) => {
  const errors = [];
  const warnings = [];
  
  for (const section of sections) {
    for (const item of section.items) {
      const filePath = path.join(publicDir, item.filePath.replace(/^\//, ''));
      
      try {
        const stats = await fs.stat(filePath);
        
        if (!stats.isFile()) {
          errors.push(`Not a file: ${item.filePath} (${item.title})`);
          continue;
        }
        
        // Check file size
        if (stats.size === 0) {
          warnings.push(`Empty file: ${item.filePath} (${item.title})`);
        } else if (stats.size > 10 * 1024 * 1024) {
          warnings.push(`Large file (${Math.round(stats.size / 1024 / 1024)}MB): ${item.filePath}`);
        }
        
        // Basic HTML validation
        if (item.filePath.endsWith('.html')) {
          const content = await fs.readFile(filePath, 'utf8');
          if (!content.includes('<html') && !content.includes('<HTML')) {
            warnings.push(`Possibly malformed HTML: ${item.filePath}`);
          }
        }
        
      } catch (error) {
        errors.push(`File not accessible: ${item.filePath} (${error.message})`);
      }
    }
  }
  
  return { errors, warnings };
};

// Create content snapshot
const createSnapshot = async (version, sections) => {
  const snapshotDir = path.join(versionsDir, 'snapshots', version.version);
  await fs.mkdir(snapshotDir, { recursive: true });
  
  // Save content structure
  const structurePath = path.join(snapshotDir, 'content-structure.json');
  await fs.writeFile(structurePath, JSON.stringify(sections, null, 2), 'utf8');
  
  // Save version metadata
  const metadataPath = path.join(snapshotDir, 'metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(version, null, 2), 'utf8');
  
  console.log(`📸 Created snapshot: ${version.version}`);
};

// Update content workflow
const updateContent = async (options = {}) => {
  console.log('🔄 Starting content update workflow...');
  
  // Generate new content structure
  const { generate } = await import('./generate-content.js');
  
  // Temporarily capture console output to get sections
  const originalLog = console.log;
  let generatedSections = null;
  
  try {
    // Load current content structure for comparison
    let currentSections = null;
    try {
      const manifestPath = path.join(repoRoot, 'src', 'data', 'content-manifest.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);
      // Create a simplified structure for comparison
      currentSections = [{ items: manifest.files.map(filePath => ({ filePath, id: filePath })) }];
    } catch (error) {
      console.log('ℹ️  No existing content structure found');
    }
    
    // Generate new content
    const { execSync } = await import('child_process');
    execSync('node scripts/generate-content.js', { stdio: 'inherit' });
    
    // Load the newly generated content from manifest
    const newManifestPath = path.join(repoRoot, 'src', 'data', 'content-manifest.json');
    const newManifestContent = await fs.readFile(newManifestPath, 'utf8');
    const newManifest = JSON.parse(newManifestContent);
    const newSections = [{ items: newManifest.files.map(filePath => ({ filePath, id: filePath })) }];
    
    // Detect changes
    const changes = detectChanges(currentSections, newSections);
    
    // Validate content files
    const validation = await validateContentFiles(newSections);
    
    if (validation.errors.length > 0) {
      console.error('\n❌ Content validation failed:');
      validation.errors.forEach(error => console.error(`  • ${error}`));
      
      if (!options.force) {
        console.error('\nUse --force to proceed despite errors');
        process.exit(1);
      }
    }
    
    if (validation.warnings.length > 0) {
      console.warn('\n⚠️  Content validation warnings:');
      validation.warnings.forEach(warning => console.warn(`  • ${warning}`));
    }
    
    // Create version metadata
    const version = createVersionMetadata(newSections, changes);
    
    // Load version history
    const history = await loadVersionHistory();
    
    // Add new version to history
    history.versions.push(version);
    history.latest = version;
    
    // Keep only last 50 versions
    if (history.versions.length > 50) {
      history.versions = history.versions.slice(-50);
    }
    
    // Save version history
    await saveVersionHistory(history);
    
    // Create snapshot if significant changes
    if (changes.length > 0 || options.snapshot) {
      await createSnapshot(version, newSections);
    }
    
    // Report results
    console.log('\n📊 Content Update Summary:');
    console.log(`   Version: ${version.version}`);
    console.log(`   Hash: ${version.shortHash}`);
    console.log(`   Sections: ${version.sections}`);
    console.log(`   Items: ${version.totalItems}`);
    console.log(`   Changes: ${changes.length}`);
    
    if (changes.length > 0) {
      console.log('\n📝 Changes detected:');
      changes.forEach(change => {
        const icon = change.type === 'added' ? '➕' : change.type === 'removed' ? '➖' : '📝';
        console.log(`   ${icon} ${change.type}: ${change.title} (${change.itemId})`);
        if (change.modifications) {
          change.modifications.forEach(mod => console.log(`      ${mod}`));
        }
      });
    }
    
    console.log('\n✅ Content update complete!');
    
  } catch (error) {
    console.error('❌ Content update failed:', error.message);
    process.exit(1);
  }
};

// List content versions
const listVersions = async (limit = 10) => {
  const history = await loadVersionHistory();
  
  if (history.versions.length === 0) {
    console.log('📋 No content versions found');
    return;
  }
  
  console.log(`📋 Content Version History (showing last ${Math.min(limit, history.versions.length)}):`);
  
  const versions = history.versions.slice(-limit).reverse();
  
  versions.forEach((version, index) => {
    const isLatest = index === 0 ? ' (latest)' : '';
    const changesText = version.changes.length > 0 ? ` • ${version.changes.length} changes` : '';
    
    console.log(`   ${version.version}${isLatest}`);
    console.log(`     ${version.timestamp} • ${version.shortHash}${changesText}`);
    console.log(`     ${version.sections} sections, ${version.totalItems} items`);
    
    if (version.changes.length > 0 && index < 3) {
      version.changes.slice(0, 3).forEach(change => {
        const icon = change.type === 'added' ? '➕' : change.type === 'removed' ? '➖' : '📝';
        console.log(`       ${icon} ${change.type}: ${change.title}`);
      });
      if (version.changes.length > 3) {
        console.log(`       ... and ${version.changes.length - 3} more`);
      }
    }
    console.log('');
  });
};

// Main CLI interface
const main = async () => {
  const command = process.argv[2];
  const options = {
    force: process.argv.includes('--force'),
    snapshot: process.argv.includes('--snapshot')
  };
  
  switch (command) {
    case 'update':
      await updateContent(options);
      break;
      
    case 'list':
      const limit = parseInt(process.argv[3]) || 10;
      await listVersions(limit);
      break;
      
    case 'validate':
      console.log('🔍 Validating content files...');
      try {
        // Generate fresh content first
        const generateModule = await import('./generate-content.js');
        // The generate function is the default export, call it directly
        const { execSync } = await import('child_process');
        execSync('node scripts/generate-content.js', { stdio: 'inherit' });
        
        // Read the generated manifest
        const manifestPath = path.join(repoRoot, 'src', 'data', 'content-manifest.json');
        const manifestContent = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);
        
        // Create sections structure from manifest for validation
        const sections = [{ items: manifest.files.map(filePath => ({ filePath })) }];
        const validation = await validateContentFiles(sections);
        
        if (validation.errors.length > 0) {
          console.error('\n❌ Validation errors:');
          validation.errors.forEach(error => console.error(`  • ${error}`));
          process.exit(1);
        }
        
        if (validation.warnings.length > 0) {
          console.warn('\n⚠️  Validation warnings:');
          validation.warnings.forEach(warning => console.warn(`  • ${warning}`));
        }
        
        console.log('✅ Content validation passed');
        console.log(`📊 Validated ${manifest.files.length} content files`);
      } catch (error) {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
      }
      break;
      
    case 'init':
      await fs.mkdir(versionsDir, { recursive: true });
      await fs.mkdir(path.join(versionsDir, 'snapshots'), { recursive: true });
      console.log('✅ Content versioning initialized');
      break;
      
    default:
      console.log('Usage: node scripts/content-workflow.js <command> [options]');
      console.log('Commands:');
      console.log('  update    - Update content and create new version');
      console.log('  list [n]  - List last n versions (default: 10)');
      console.log('  validate  - Validate current content files');
      console.log('  init      - Initialize content versioning');
      console.log('Options:');
      console.log('  --force     - Proceed despite validation errors');
      console.log('  --snapshot  - Force create snapshot even without changes');
      process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { updateContent, listVersions, validateContentFiles, createVersionMetadata };