# Build and Deployment Guide

This document describes the enhanced build and deployment process for the Microsoft 365 Copilot Learning Platform.

## Overview

The build system includes:
- **Content Generation**: Automated content structure generation with validation
- **Build Optimization**: HTML minification, compression, and asset optimization
- **Content Versioning**: Version tracking and change detection
- **Deployment Automation**: Environment-specific deployment scripts
- **Build Validation**: Comprehensive build quality checks

## Quick Start

```bash
# Full build with validation
npm run build:full

# Development server
npm run dev

# Preview production build
npm run preview
```

## Content Management

### Content Generation

The content generation script scans the `public/` directory and creates a TypeScript structure file:

```bash
# Generate content structure
npm run generate:content

# Update content with validation and versioning
npm run content:update

# Validate existing content files
npm run content:validate

# List content versions
npm run content:list
```

### Content Structure

Content is organized hierarchically:
- **Sections**: Major course divisions (e.g., "1. Introduction", "2. Office Apps")
- **Subsections**: Application-specific groupings (e.g., "Word", "Excel")
- **Items**: Individual content pieces (introduction, prompt, video)

### Content Validation

The system validates:
- ✅ File existence and accessibility
- ✅ Basic HTML structure
- ✅ File size warnings (>5MB)
- ✅ Content metadata consistency

## Build Process

### Standard Build

```bash
npm run build
```

This runs:
1. **Content Generation** (`prebuild`): Updates content structure
2. **TypeScript Compilation**: Type checking and compilation
3. **Vite Build**: Bundling and optimization
4. **Build Optimization** (`postbuild`): Minification and compression

### Build Optimization

The optimization process includes:

```bash
npm run optimize
```

- **HTML Minification**: Removes comments, extra whitespace
- **Gzip Compression**: Creates `.gz` files for all compressible assets
- **Build Reports**: Generates optimization statistics

### Build Validation

```bash
npm run validate:build
```

Validates:
- ✅ Required files present
- ✅ File size limits
- ✅ HTML structure and meta tags
- ✅ JavaScript code quality
- ✅ Content manifest integrity

## Environment Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Build Configuration
NODE_ENV=development
VITE_APP_TITLE=Microsoft 365 Copilot Learning Platform
VITE_APP_VERSION=1.0.0

# Content Configuration
VITE_CONTENT_BASE_URL=/
VITE_ENABLE_CONTENT_VALIDATION=true

# Feature Flags
VITE_ENABLE_SEARCH=true
VITE_ENABLE_HELP=true
VITE_ENABLE_PROGRESS_TRACKING=true

# Deployment Settings
AWS_PROFILE=default
S3_BUCKET_NAME=your-bucket-name
CLOUDFRONT_DISTRIBUTION_ID=your-distribution-id
```

### Deployment Environments

Initialize deployment configurations:

```bash
npm run deploy:init
```

This creates environment-specific deployment scripts:
- `deploy-development.sh`: Local development builds
- `deploy-staging.sh`: Staging environment deployment
- `deploy-production.sh`: Production deployment

## Deployment

### Local Development

```bash
npm run dev
```

Starts development server with:
- Hot module replacement
- Content auto-generation
- Source maps
- CORS enabled

### Production Deployment

```bash
# Enhanced production deployment (recommended)
./deploySunit.sh

# Deploy with existing build (skip build process)
SKIP_BUILD=true ./deploySunit.sh

# Deploy without build validation (faster, less safe)
BUILD_VALIDATION=false ./deploySunit.sh

# Validate environment first
npm run deploy:validate production
```

The enhanced production deployment:
1. **Enhanced Build Process**: Uses `npm run build:full` with content validation and optimization
2. **Build Validation**: Comprehensive quality checks before deployment
3. **Gzip Compression**: Properly handles gzipped files with content-encoding headers
4. **Asset Optimization**: Uploads assets with immutable cache headers
5. **HTML Optimization**: No-cache headers for HTML with gzip compression support
6. **Metadata Upload**: Includes build reports and content manifests
7. **CloudFront Integration**: Cache invalidation with detailed reporting
8. **Deployment Summary**: Comprehensive deployment statistics and URLs

#### Enhanced Features

- **Gzip Support**: Automatically detects and uploads `.gz` files with proper `content-encoding: gzip` headers
- **Build Reports**: Uploads `build-report.json` and `content-manifest.json` for monitoring
- **Flexible Configuration**: Environment variables for customizing deployment behavior
- **Better Error Handling**: Validates build before deployment and provides clear error messages
- **Performance Metrics**: Displays compression ratios and optimization statistics

### Staging Deployment

```bash
./deploy-staging.sh
```

Similar to production but with different cache settings and bucket.

## Content Versioning

### Version Management

```bash
# Initialize versioning
npm run content:init

# Create new version with change detection
npm run content:update

# List recent versions
npm run content:list 5

# Force snapshot creation
npm run content:update --snapshot
```

### Version Information

Each version includes:
- **Version Number**: Timestamp-based (YYYY.MM.DD-HHMM)
- **Content Hash**: SHA-256 hash for integrity
- **Change Detection**: Added, removed, and modified items
- **File Validation**: Ensures all referenced files exist

### Version History

Versions are stored in `.content-versions/`:
```
.content-versions/
├── history.json          # Version metadata
└── snapshots/            # Content snapshots
    ├── 2024.01.15-1430/
    │   ├── content-structure.json
    │   └── metadata.json
    └── ...
```

## Build Artifacts

### Generated Files

After a successful build:

```
dist/
├── index.html                 # Main application
├── assets/                    # Bundled JS/CSS with hashes
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
├── content-manifest.json      # Content metadata
├── build-report.json         # Optimization report
└── [content files]           # Static HTML content
```

### Compression

Optimized builds include gzipped versions:
```
dist/
├── index.html
├── index.html.gz             # Gzipped version
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].js.gz    # Gzipped version
│   └── ...
```

## Performance Optimization

### Bundle Splitting

The build automatically splits code into chunks:
- **vendor**: React and React DOM
- **ui**: Radix UI components
- **icons**: Icon libraries
- **main**: Application code

### Caching Strategy

- **HTML files**: `no-cache, no-store, must-revalidate`
- **Hashed assets**: `public, max-age=31536000, immutable`
- **Static content**: `public, max-age=86400`

### Content Optimization

- HTML minification removes unnecessary whitespace
- Gzip compression reduces file sizes by ~70%
- Asset fingerprinting enables long-term caching

## Troubleshooting

### Common Issues

**Build fails with content validation errors:**
```bash
# Force build despite validation errors
npm run content:update --force
```

**Large bundle sizes:**
- Check build report: `dist/build-report.json`
- Analyze bundle with: `npm run build -- --analyze`

**Deployment failures:**
- Validate AWS credentials: `aws sts get-caller-identity`
- Check bucket permissions
- Verify CloudFront distribution ID

### Debug Information

Enable debug logging:
```bash
VITE_DEV_ENABLE_DEBUG_LOGS=true npm run dev
```

Show content hash in development:
```bash
VITE_DEV_SHOW_CONTENT_HASH=true npm run dev
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run build:full` | Full build with validation |
| `npm run preview` | Preview production build |
| `npm run generate:content` | Generate content structure |
| `npm run content:update` | Update content with versioning |
| `npm run content:validate` | Validate content files |
| `npm run content:list` | List content versions |
| `npm run optimize` | Optimize build artifacts |
| `npm run validate:build` | Validate build quality |
| `npm run deploy:init` | Initialize deployment configs |
| `npm run deploy:validate` | Validate deployment environment |

## Deployment Scripts

| Script | Description | Environment Variables |
|--------|-------------|----------------------|
| `./deploySunit.sh` | Enhanced production deployment | `SKIP_BUILD`, `BUILD_VALIDATION`, `AWS_PROFILE` |
| `./deploy.sh` | Generic S3 deployment | `DIST_DIR`, `AWS_REGION` |
| `./deploy-development.sh` | Local development deployment | Auto-generated |
| `./deploy-staging.sh` | Staging environment deployment | Auto-generated |
| `./deploy-production.sh` | Production environment deployment | Auto-generated |

### Deployment Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_PROFILE` | `sunit` | AWS profile for authentication |
| `DIST_DIR` | `dist` | Build output directory |
| `CF_DISTRIBUTION_ID` | `E35I15ZTNNKA52` | CloudFront distribution ID |
| `BUILD_VALIDATION` | `true` | Run build validation before deploy |
| `SKIP_BUILD` | `false` | Skip build process (use existing build) |
| `AWS_REGION` | `us-east-1` | AWS region for S3 bucket |

## Monitoring

### Build Reports

Each build generates reports in `dist/`:
- `build-report.json`: Optimization statistics
- `content-manifest.json`: Content metadata and file list

### Version Tracking

Content versions are tracked with:
- Change detection (added/removed/modified items)
- File validation results
- Build timestamps and hashes
- Performance metrics

This comprehensive build system ensures reliable, optimized deployments while maintaining content integrity and providing detailed feedback on the build process.