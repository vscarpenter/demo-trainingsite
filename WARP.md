# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Essential Development Commands

### Development Server
```bash
# Start development server with hot reload
npm run dev

# Alternative using shell script
./start.sh
```

### Build Commands
```bash
# Full production build with content validation
npm run build:full

# Standard build (TypeScript check + Vite build + optimization)
npm run build

# Preview production build locally
npm run preview
```

### Testing
```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run
```

### Content Management
```bash
# Generate content structure from public/ directory
npm run generate:content

# Update content with validation and versioning
npm run content:update

# Validate content files
npm run content:validate

# List content versions
npm run content:list
```

### Code Quality
```bash
# Lint TypeScript/TSX files
npm run lint

# Optimize build artifacts
npm run optimize

# Validate build quality
npm run validate:build
```

### Deployment
```bash
# Enhanced production deployment to S3
./deploySunit.sh

# Deploy with existing build (skip build process)
SKIP_BUILD=true ./deploySunit.sh

# Validate deployment environment
npm run deploy:validate production
```

## Architecture Overview

### Application Structure
This is a React 18 + TypeScript single-page application that recreates the Microsoft Sunit Carpenter Learning interface. The app uses a content-driven architecture where training materials are dynamically loaded from a structured content system.

### Key Architectural Patterns

**Content-First Design**: The application is built around a content management system that scans HTML files in the `public/` directory and generates a TypeScript structure (`src/data/contentStructure.ts`) with metadata about sections, subsections, and individual content items.

**Component-Based Layout**: The UI follows Microsoft's design patterns with a header, collapsible sidebar, and main content area. Components are built using shadcn/ui primitives with Radix UI for accessibility.

**State Management**: Uses React hooks for local state, with URL-based routing for content navigation and localStorage for persistence. Content navigation state is managed through helper functions in `contentStructure.ts`.

**Lazy Loading**: Non-critical components (SearchDialog, HelpDialog, ContentViewer) are lazy-loaded to improve initial page load performance.

### Content System Architecture

**Content Generation**: The `scripts/generate-content.js` script automatically scans the `public/` directory structure and generates TypeScript interfaces. Content is organized hierarchically:
- **Sections**: Major course divisions (e.g., "1. Introduction", "2. Office Apps")  
- **Subsections**: Application-specific groupings (e.g., "Word", "Excel")
- **Items**: Individual content pieces (introduction, prompt, video)

**Content Validation**: The system validates file existence, HTML structure, file sizes, and metadata consistency. Content versioning tracks changes with SHA-256 hashes and timestamps.

**Content Types**: Three main content types are supported:
- `introduction`: Section overview pages
- `prompt`: Interactive learning prompts
- `video`: Video demonstration content

### Build System Architecture

**Multi-Stage Build Process**:
1. **Content Generation** (`prebuild`): Updates content structure from files
2. **TypeScript Compilation**: Type checking and compilation  
3. **Vite Bundling**: Module bundling with React plugin
4. **Build Optimization** (`postbuild`): HTML minification and gzip compression

**Bundle Splitting**: Vite configuration splits code into logical chunks:
- `vendor`: React and React DOM
- `ui`: Radix UI components  
- `icons`: Icon libraries
- `main`: Application code

**Asset Optimization**: Build process includes HTML minification, gzip compression, and generates optimization reports in `dist/build-report.json`.

### Component Architecture

**Header**: Contains Microsoft branding, navigation controls, and action buttons (search, help, settings). Handles mobile sidebar toggle.

**Sidebar**: Tabbed interface (Menu/Transcript/Resources) with expandable content outline, progress tracking, and Microsoft logo branding.

**Content System**: ContentViewer component dynamically loads HTML content from the public directory based on the current content ID, with navigation helpers for next/previous content.

**Dialog System**: Search and Help dialogs are implemented as separate lazy-loaded components with keyboard shortcuts (Ctrl+K for search, Escape to close).

### Navigation System

**URL-based Routing**: Content navigation uses URL search parameters (`?id=content-id`) with browser history support for back/forward navigation.

**Keyboard Shortcuts**:
- Arrow keys / Space: Navigate between content items
- Home/End: Jump to first/last content item
- Ctrl+K: Open search dialog
- Escape: Close dialogs or sidebar

**Progress Tracking**: Visual progress indicator showing completion percentage and current position in the content sequence.

## Development Guidelines

### Code Style
- TypeScript + React 18 with functional components and hooks
- 2 spaces indentation, semicolons, single quotes for strings
- PascalCase for components (`ContentViewer.tsx`)
- camelCase for variables/functions, PascalCase for types/interfaces
- Tailwind CSS for styling with utility-first approach

### File Organization
- UI components in `src/components/` with shadcn/ui primitives in `src/components/ui/`
- Types and utilities in `src/types/` and `src/lib/`
- Content data structures in `src/data/`
- Global styles in `src/styles/globals.css`
- Static content and course materials in `public/`

### Testing Strategy
- Vitest + React Testing Library for component testing
- Tests colocated with components (`*.test.tsx`)
- Integration tests in `src/components/__tests__/`
- Content validation tests in `src/data/__tests__/`

### Content Development
- Place HTML content files in `public/` following the section/subsection structure
- Run `npm run content:update` after adding new content files
- Use `npm run content:validate` to check content integrity
- Content structure is auto-generated - do not manually edit `src/data/contentStructure.ts`

### Deployment Process
- Production builds are deployed to S3 with static website hosting
- CloudFront distribution provides CDN and caching
- Gzip compression enabled for all text assets
- Build validation ensures content integrity before deployment
- Cache headers: HTML files use no-cache, assets use immutable caching

### Environment Configuration
Copy `.env.example` to `.env.local` for local development. Key variables:
- `VITE_APP_TITLE`: Application title
- `VITE_ENABLE_SEARCH`: Enable search functionality
- `VITE_ENABLE_PROGRESS_TRACKING`: Enable progress tracking
- `AWS_PROFILE`: AWS profile for deployment
- `S3_BUCKET_NAME`: Target S3 bucket

### Performance Considerations
- Lazy loading for non-critical components
- Content-based code splitting with Vite
- Gzip compression reduces bundle sizes by ~70%
- Long-term caching for hashed assets
- Content validation prevents broken references

This application demonstrates a sophisticated content management approach combined with modern React patterns and Microsoft design language, optimized for educational content delivery.
