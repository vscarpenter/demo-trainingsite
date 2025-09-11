#!/usr/bin/env node
// Build optimization script for content minification and compression
// Optimizes HTML files, generates gzip versions, and creates build reports

import { promises as fs } from 'fs';
import path from 'path';
import { createGzip } from 'zlib';
import { promisify } from 'util';

const gzip = promisify(createGzip);
const repoRoot = process.cwd();
const distDir = path.join(repoRoot, 'dist');
const publicDir = path.join(repoRoot, 'public');

// HTML minification (basic)
const minifyHTML = (html) => {
  return html
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove extra whitespace between tags
    .replace(/>\s+</g, '><')
    // Remove leading/trailing whitespace
    .replace(/^\s+|\s+$/gm, '')
    // Normalize line breaks
    .replace(/\n{2,}/g, '\n')
    .trim();
};

// Compress file with gzip
const compressFile = async (filePath) => {
  try {
    const content = await fs.readFile(filePath);
    const compressed = await new Promise((resolve, reject) => {
      const gzipStream = createGzip({ level: 9 });
      const chunks = [];
      
      gzipStream.on('data', chunk => chunks.push(chunk));
      gzipStream.on('end', () => resolve(Buffer.concat(chunks)));
      gzipStream.on('error', reject);
      
      gzipStream.write(content);
      gzipStream.end();
    });
    
    await fs.writeFile(`${filePath}.gz`, compressed);
    
    const originalSize = content.length;
    const compressedSize = compressed.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    return {
      originalSize,
      compressedSize,
      ratio: parseFloat(ratio)
    };
  } catch (error) {
    console.warn(`Failed to compress ${filePath}: ${error.message}`);
    return null;
  }
};

// Get file size in human readable format
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Recursively find files with specific extensions
const findFiles = async (dir, extensions) => {
  const files = [];
  
  const scan = async (currentDir) => {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Cannot scan directory ${currentDir}: ${error.message}`);
    }
  };
  
  await scan(dir);
  return files;
};

// Optimize HTML files
const optimizeHTMLFiles = async () => {
  console.log('🔧 Optimizing HTML files...');
  
  const htmlFiles = await findFiles(distDir, ['.html']);
  const results = [];
  
  for (const filePath of htmlFiles) {
    try {
      const originalContent = await fs.readFile(filePath, 'utf8');
      const minifiedContent = minifyHTML(originalContent);
      
      if (minifiedContent.length < originalContent.length) {
        await fs.writeFile(filePath, minifiedContent, 'utf8');
        
        const savings = originalContent.length - minifiedContent.length;
        const ratio = ((savings / originalContent.length) * 100).toFixed(1);
        
        results.push({
          file: path.relative(distDir, filePath),
          originalSize: originalContent.length,
          minifiedSize: minifiedContent.length,
          savings,
          ratio: parseFloat(ratio)
        });
      }
    } catch (error) {
      console.warn(`Failed to optimize ${filePath}: ${error.message}`);
    }
  }
  
  if (results.length > 0) {
    const totalSavings = results.reduce((sum, r) => sum + r.savings, 0);
    console.log(`✅ Minified ${results.length} HTML files, saved ${formatFileSize(totalSavings)}`);
  } else {
    console.log('ℹ️  No HTML files needed optimization');
  }
  
  return results;
};

// Compress static assets
const compressAssets = async () => {
  console.log('📦 Compressing static assets...');
  
  const compressibleFiles = await findFiles(distDir, ['.html', '.css', '.js', '.json', '.svg', '.txt']);
  const results = [];
  
  for (const filePath of compressibleFiles) {
    const compressionResult = await compressFile(filePath);
    if (compressionResult) {
      results.push({
        file: path.relative(distDir, filePath),
        ...compressionResult
      });
    }
  }
  
  if (results.length > 0) {
    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressed = results.reduce((sum, r) => sum + r.compressedSize, 0);
    const overallRatio = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);
    
    console.log(`✅ Compressed ${results.length} files`);
    console.log(`📊 Overall compression: ${formatFileSize(totalOriginal)} → ${formatFileSize(totalCompressed)} (${overallRatio}% reduction)`);
  }
  
  return results;
};

// Generate build report
const generateBuildReport = async (htmlOptimization, compression) => {
  console.log('📋 Generating build report...');
  
  const buildStats = await fs.stat(distDir);
  const allFiles = await findFiles(distDir, ['.html', '.css', '.js', '.json', '.svg', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.mp4', '.webm']);
  
  const report = {
    buildDate: new Date().toISOString(),
    buildDirectory: distDir,
    totalFiles: allFiles.length,
    optimization: {
      htmlMinification: {
        filesProcessed: htmlOptimization.length,
        totalSavings: htmlOptimization.reduce((sum, r) => sum + r.savings, 0),
        averageReduction: htmlOptimization.length > 0 
          ? (htmlOptimization.reduce((sum, r) => sum + r.ratio, 0) / htmlOptimization.length).toFixed(1) + '%'
          : '0%'
      },
      compression: {
        filesCompressed: compression.length,
        totalOriginalSize: compression.reduce((sum, r) => sum + r.originalSize, 0),
        totalCompressedSize: compression.reduce((sum, r) => sum + r.compressedSize, 0),
        averageReduction: compression.length > 0
          ? (compression.reduce((sum, r) => sum + r.ratio, 0) / compression.length).toFixed(1) + '%'
          : '0%'
      }
    },
    files: await Promise.all(allFiles.map(async f => ({
      path: path.relative(distDir, f),
      size: formatFileSize((await fs.stat(f)).size)
    })))
  };
  
  const reportPath = path.join(distDir, 'build-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  // Copy content manifest to dist if it exists
  const srcManifestPath = path.join(repoRoot, 'src', 'data', 'content-manifest.json');
  const distManifestPath = path.join(distDir, 'content-manifest.json');
  
  try {
    const manifestContent = await fs.readFile(srcManifestPath, 'utf8');
    await fs.writeFile(distManifestPath, manifestContent, 'utf8');
    console.log(`📋 Copied content manifest to dist`);
  } catch (error) {
    console.warn(`⚠️  Could not copy content manifest: ${error.message}`);
  }
  
  console.log(`✅ Build report saved: ${path.relative(repoRoot, reportPath)}`);
  return report;
};

// Main optimization function
const optimize = async () => {
  console.log('🚀 Starting build optimization...');
  
  if (!(await fs.stat(distDir).catch(() => null))) {
    console.error('❌ Dist directory not found. Run build first.');
    process.exit(1);
  }
  
  try {
    const htmlOptimization = await optimizeHTMLFiles();
    const compression = await compressAssets();
    const report = await generateBuildReport(htmlOptimization, compression);
    
    console.log('\n📊 Build Optimization Summary:');
    console.log(`   Total files: ${report.totalFiles}`);
    console.log(`   HTML files minified: ${report.optimization.htmlMinification.filesProcessed}`);
    console.log(`   Files compressed: ${report.optimization.compression.filesCompressed}`);
    console.log(`   Average compression: ${report.optimization.compression.averageReduction}`);
    console.log('\n✅ Build optimization complete!');
    
  } catch (error) {
    console.error('❌ Build optimization failed:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  optimize().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export { optimize };