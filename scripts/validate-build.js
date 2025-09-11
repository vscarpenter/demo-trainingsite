#!/usr/bin/env node
// Build validation script
// Validates the built application for deployment readiness

import { promises as fs } from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const distDir = path.join(repoRoot, 'dist');

// Required files for a complete build
const requiredFiles = [
  'index.html',
  'assets', // directory
  'vite.svg',
  'content-manifest.json'
];

// File size limits (in bytes)
const fileSizeLimits = {
  'index.html': 50 * 1024, // 50KB
  '.js': 2 * 1024 * 1024,  // 2MB per JS file
  '.css': 500 * 1024,      // 500KB per CSS file
  '.html': 100 * 1024,     // 100KB per HTML file
};

// Check if file/directory exists
const exists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// Get file size in bytes
const getFileSize = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
};

// Format file size for display
const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Recursively find all files
const findAllFiles = async (dir, files = []) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await findAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
};

// Validate HTML files
const validateHTML = async (filePath) => {
  const issues = [];
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Basic HTML structure checks
    if (!content.includes('<!DOCTYPE html>') && !content.includes('<!doctype html>')) {
      issues.push('Missing DOCTYPE declaration');
    }
    
    if (!content.includes('<html')) {
      issues.push('Missing <html> tag');
    }
    
    if (!content.includes('<head>')) {
      issues.push('Missing <head> section');
    }
    
    if (!content.includes('<body>')) {
      issues.push('Missing <body> section');
    }
    
    // Check for essential meta tags in index.html
    if (path.basename(filePath) === 'index.html') {
      if (!content.includes('<meta charset=')) {
        issues.push('Missing charset meta tag');
      }
      
      if (!content.includes('viewport')) {
        issues.push('Missing viewport meta tag');
      }
      
      if (!content.includes('<title>')) {
        issues.push('Missing title tag');
      }
    }
    
    // Check for potential issues
    if (content.includes('localhost')) {
      issues.push('Contains localhost references');
    }
    
    if (content.includes('127.0.0.1')) {
      issues.push('Contains local IP references');
    }
    
  } catch (error) {
    issues.push(`Cannot read file: ${error.message}`);
  }
  
  return issues;
};

// Validate JavaScript files
const validateJS = async (filePath) => {
  const issues = [];
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Check for development-only code
    if (content.includes('console.log') && !content.includes('production')) {
      issues.push('Contains console.log statements');
    }
    
    if (content.includes('debugger')) {
      issues.push('Contains debugger statements');
    }
    
    if (content.includes('localhost')) {
      issues.push('Contains localhost references');
    }
    
    // Check for source map
    if (content.includes('//# sourceMappingURL=')) {
      // This is actually good for debugging, but note it
      issues.push('Contains source map (informational)');
    }
    
  } catch (error) {
    issues.push(`Cannot read file: ${error.message}`);
  }
  
  return issues;
};

// Validate content manifest
const validateContentManifest = async () => {
  const manifestPath = path.join(distDir, 'content-manifest.json');
  const issues = [];
  
  try {
    const content = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(content);
    
    // Check required fields
    const requiredFields = ['generatedAt', 'contentHash', 'sections', 'items', 'files'];
    for (const field of requiredFields) {
      if (!(field in manifest)) {
        issues.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate file references
    if (manifest.files && Array.isArray(manifest.files)) {
      for (const filePath of manifest.files) {
        const fullPath = path.join(repoRoot, 'public', filePath.replace(/^\//, ''));
        if (!(await exists(fullPath))) {
          issues.push(`Referenced file not found: ${filePath}`);
        }
      }
    }
    
    // Check if manifest is recent (within last hour)
    if (manifest.generatedAt) {
      const generatedTime = new Date(manifest.generatedAt);
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      if (generatedTime < hourAgo) {
        issues.push('Content manifest is older than 1 hour - may be stale');
      }
    }
    
  } catch (error) {
    issues.push(`Cannot validate manifest: ${error.message}`);
  }
  
  return issues;
};

// Main validation function
const validateBuild = async () => {
  console.log('🔍 Validating build...');
  
  // Check if dist directory exists
  if (!(await exists(distDir))) {
    console.error('❌ Build directory not found. Run build first.');
    process.exit(1);
  }
  
  const errors = [];
  const warnings = [];
  const info = [];
  
  // Check required files
  console.log('📁 Checking required files...');
  for (const file of requiredFiles) {
    const filePath = path.join(distDir, file);
    if (!(await exists(filePath))) {
      errors.push(`Required file missing: ${file}`);
    } else {
      info.push(`✓ Found: ${file}`);
    }
  }
  
  // Get all files in build
  const allFiles = await findAllFiles(distDir);
  const totalSize = (await Promise.all(allFiles.map(getFileSize))).reduce((sum, size) => sum + size, 0);
  
  console.log(`📊 Build contains ${allFiles.length} files (${formatSize(totalSize)} total)`);
  
  // Check file sizes
  console.log('📏 Checking file sizes...');
  for (const filePath of allFiles) {
    const size = await getFileSize(filePath);
    const ext = path.extname(filePath);
    const basename = path.basename(filePath);
    
    // Check against limits
    if (fileSizeLimits[basename] && size > fileSizeLimits[basename]) {
      warnings.push(`Large file: ${path.relative(distDir, filePath)} (${formatSize(size)})`);
    } else if (fileSizeLimits[ext] && size > fileSizeLimits[ext]) {
      warnings.push(`Large ${ext} file: ${path.relative(distDir, filePath)} (${formatSize(size)})`);
    }
    
    // Check for empty files
    if (size === 0) {
      warnings.push(`Empty file: ${path.relative(distDir, filePath)}`);
    }
  }
  
  // Validate HTML files
  console.log('🌐 Validating HTML files...');
  const htmlFiles = allFiles.filter(f => f.endsWith('.html'));
  for (const htmlFile of htmlFiles) {
    const issues = await validateHTML(htmlFile);
    issues.forEach(issue => {
      const severity = issue.includes('Missing') ? 'error' : 'warning';
      const message = `${path.relative(distDir, htmlFile)}: ${issue}`;
      
      if (severity === 'error') {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    });
  }
  
  // Validate JavaScript files
  console.log('⚡ Validating JavaScript files...');
  const jsFiles = allFiles.filter(f => f.endsWith('.js'));
  for (const jsFile of jsFiles) {
    const issues = await validateJS(jsFile);
    issues.forEach(issue => {
      const message = `${path.relative(distDir, jsFile)}: ${issue}`;
      if (issue.includes('informational')) {
        info.push(message);
      } else {
        warnings.push(message);
      }
    });
  }
  
  // Validate content manifest
  console.log('📋 Validating content manifest...');
  const manifestIssues = await validateContentManifest();
  manifestIssues.forEach(issue => {
    if (issue.includes('not found') || issue.includes('Missing required')) {
      errors.push(`Content manifest: ${issue}`);
    } else {
      warnings.push(`Content manifest: ${issue}`);
    }
  });
  
  // Check for gzipped files (if optimization was run)
  const gzipFiles = allFiles.filter(f => f.endsWith('.gz'));
  if (gzipFiles.length > 0) {
    info.push(`Found ${gzipFiles.length} gzipped files for compression`);
  }
  
  // Report results
  console.log('\n📊 Build Validation Results:');
  
  if (info.length > 0) {
    console.log('\nℹ️  Information:');
    info.forEach(msg => console.log(`   ${msg}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(msg => console.warn(`   ${msg}`));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(msg => console.error(`   ${msg}`));
    console.log('\n❌ Build validation failed!');
    process.exit(1);
  }
  
  console.log('\n✅ Build validation passed!');
  console.log(`📦 Ready for deployment: ${allFiles.length} files, ${formatSize(totalSize)}`);
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateBuild().catch(error => {
    console.error('❌ Validation error:', error.message);
    process.exit(1);
  });
}

export { validateBuild };