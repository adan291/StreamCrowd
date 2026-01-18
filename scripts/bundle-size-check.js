#!/usr/bin/env node

/**
 * Bundle Size Check Script for CI/CD
 * Implements Task 1.1.4: Set up bundle size monitoring in CI/CD
 */

const fs = require('fs').promises;
const path = require('path');

// Import our bundle size monitor (we'll need to build it first)
async function runBundleSizeCheck() {
  try {
    console.log('🔍 Starting bundle size analysis...');
    
    // Check if dist directory exists
    const distPath = path.join(process.cwd(), 'dist');
    try {
      await fs.access(distPath);
    } catch (error) {
      console.error('❌ Build directory not found. Please run "npm run build" first.');
      process.exit(1);
    }

    // Analyze bundle sizes
    const bundleStats = await analyzeBundleDirectory(distPath);
    
    // Generate report
    const report = generateReport(bundleStats);
    
    // Save report
    const reportPath = path.join(process.cwd(), 'bundle-size-report.md');
    await fs.writeFile(reportPath, report, 'utf8');
    console.log(`📊 Bundle size report saved to: ${reportPath}`);
    
    // Check thresholds
    const passed = checkThresholds(bundleStats);
    
    if (passed) {
      console.log('✅ Bundle size check passed!');
      process.exit(0);
    } else {
      console.log('❌ Bundle size check failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Bundle size check failed:', error.message);
    process.exit(1);
  }
}

async function analyzeBundleDirectory(distPath) {
  const stats = {
    totalSize: 0,
    chunks: [],
    assets: [],
    violations: []
  };

  // Read all files in dist directory
  const files = await readDirectoryRecursive(distPath);
  
  for (const file of files) {
    const filePath = path.join(distPath, file);
    const fileStats = await fs.stat(filePath);
    const size = fileStats.size;
    const ext = path.extname(file).toLowerCase();
    
    stats.totalSize += size;
    
    if (ext === '.js') {
      // JavaScript chunks
      const chunkName = path.basename(file, '.js');
      stats.chunks.push({
        name: chunkName,
        size: size,
        path: file
      });
    } else if (['.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.mp3', '.wav'].includes(ext)) {
      // Assets
      stats.assets.push({
        name: path.basename(file),
        size: size,
        type: getAssetType(ext),
        path: file
      });
    }
  }
  
  return stats;
}

async function readDirectoryRecursive(dir, basePath = '') {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      const subFiles = await readDirectoryRecursive(fullPath, relativePath);
      files.push(...subFiles);
    } else {
      files.push(relativePath);
    }
  }
  
  return files;
}

function getAssetType(ext) {
  const typeMap = {
    '.css': 'stylesheet',
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.svg': 'image',
    '.woff': 'font',
    '.woff2': 'font',
    '.mp3': 'audio',
    '.wav': 'audio'
  };
  return typeMap[ext] || 'other';
}

function checkThresholds(stats) {
  const thresholds = {
    totalSize: 2 * 1024 * 1024, // 2MB
    chunkSize: 500 * 1024, // 500KB
    vendorSize: 1 * 1024 * 1024, // 1MB
    assetSize: 100 * 1024 // 100KB
  };
  
  let passed = true;
  
  // Check total size
  if (stats.totalSize > thresholds.totalSize) {
    console.log(`⚠️  Total bundle size (${formatBytes(stats.totalSize)}) exceeds threshold (${formatBytes(thresholds.totalSize)})`);
    stats.violations.push({
      type: 'total',
      name: 'Total Bundle',
      actualSize: stats.totalSize,
      threshold: thresholds.totalSize
    });
    passed = false;
  }
  
  // Check chunk sizes
  for (const chunk of stats.chunks) {
    if (chunk.size > thresholds.chunkSize) {
      console.log(`⚠️  Chunk "${chunk.name}" (${formatBytes(chunk.size)}) exceeds threshold (${formatBytes(thresholds.chunkSize)})`);
      stats.violations.push({
        type: 'chunk',
        name: chunk.name,
        actualSize: chunk.size,
        threshold: thresholds.chunkSize
      });
      
      if (chunk.size > thresholds.chunkSize * 1.5) {
        passed = false;
      }
    }
    
    // Special check for vendor chunks
    if (chunk.name.includes('vendor') && chunk.size > thresholds.vendorSize) {
      console.log(`⚠️  Vendor chunk "${chunk.name}" (${formatBytes(chunk.size)}) is large`);
    }
  }
  
  // Check asset sizes
  for (const asset of stats.assets) {
    if (asset.size > thresholds.assetSize) {
      console.log(`⚠️  Asset "${asset.name}" (${formatBytes(asset.size)}) exceeds threshold (${formatBytes(thresholds.assetSize)})`);
      stats.violations.push({
        type: 'asset',
        name: asset.name,
        actualSize: asset.size,
        threshold: thresholds.assetSize
      });
    }
  }
  
  return passed;
}

function generateReport(stats) {
  let report = '# Bundle Size Report\n\n';
  
  // Summary
  report += `**Total Size:** ${formatBytes(stats.totalSize)}\n`;
  report += `**Chunks:** ${stats.chunks.length}\n`;
  report += `**Assets:** ${stats.assets.length}\n`;
  report += `**Violations:** ${stats.violations.length}\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  // Violations
  if (stats.violations.length > 0) {
    report += '## ⚠️ Size Violations\n\n';
    for (const violation of stats.violations) {
      report += `- **${violation.type.toUpperCase()}**: ${violation.name}\n`;
      report += `  - Actual: ${formatBytes(violation.actualSize)}\n`;
      report += `  - Threshold: ${formatBytes(violation.threshold)}\n\n`;
    }
  }
  
  // Chunk breakdown
  report += '## 📦 JavaScript Chunks\n\n';
  report += '| Chunk | Size | Status |\n';
  report += '|-------|------|--------|\n';
  
  // Sort chunks by size (largest first)
  const sortedChunks = [...stats.chunks].sort((a, b) => b.size - a.size);
  
  for (const chunk of sortedChunks) {
    const status = chunk.size > 500 * 1024 ? '⚠️ Large' : '✅ OK';
    report += `| ${chunk.name} | ${formatBytes(chunk.size)} | ${status} |\n`;
  }
  
  // Asset breakdown
  if (stats.assets.length > 0) {
    report += '\n## 🎨 Assets\n\n';
    report += '| Asset | Type | Size | Status |\n';
    report += '|-------|------|------|--------|\n';
    
    // Sort assets by size (largest first)
    const sortedAssets = [...stats.assets].sort((a, b) => b.size - a.size);
    
    for (const asset of sortedAssets) {
      const status = asset.size > 100 * 1024 ? '⚠️ Large' : '✅ OK';
      report += `| ${asset.name} | ${asset.type} | ${formatBytes(asset.size)} | ${status} |\n`;
    }
  }
  
  // Recommendations
  report += '\n## 💡 Optimization Recommendations\n\n';
  
  const largeChunks = stats.chunks.filter(c => c.size > 500 * 1024);
  if (largeChunks.length > 0) {
    report += `- **Code Splitting**: ${largeChunks.length} chunks are larger than 500KB. Consider further splitting.\n`;
  }
  
  const largeAssets = stats.assets.filter(a => a.size > 100 * 1024);
  if (largeAssets.length > 0) {
    report += `- **Asset Optimization**: ${largeAssets.length} assets are larger than 100KB. Consider compression or format optimization.\n`;
  }
  
  const vendorChunks = stats.chunks.filter(c => c.name.includes('vendor'));
  if (vendorChunks.length > 0) {
    const totalVendorSize = vendorChunks.reduce((sum, c) => sum + c.size, 0);
    report += `- **Vendor Optimization**: Total vendor size is ${formatBytes(totalVendorSize)}. Consider splitting vendor libraries.\n`;
  }
  
  return report;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Run the check
if (require.main === module) {
  runBundleSizeCheck();
}

module.exports = {
  runBundleSizeCheck,
  analyzeBundleDirectory,
  checkThresholds,
  generateReport
};