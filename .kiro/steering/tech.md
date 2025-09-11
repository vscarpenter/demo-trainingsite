# Technology Stack

## Core Technologies

- **React 18** with TypeScript for type-safe component development
- **Vite** for fast development server and optimized builds
- **Tailwind CSS** for utility-first styling with custom Microsoft color palette
- **shadcn/ui** component library built on Radix UI primitives
- **Lucide React** for consistent iconography

## Key Dependencies

- **Radix UI** components for accessibility-compliant primitives (accordion, progress, dropdown, etc.)
- **class-variance-authority** and **clsx** for conditional styling
- **tailwind-merge** for merging Tailwind classes safely

## Development Tools

- **TypeScript** with strict configuration
- **ESLint** with React-specific rules and TypeScript support
- **PostCSS** with Autoprefixer for CSS processing

## Build System

### Common Commands

```bash
# Development
npm run dev                    # Start development server on localhost:5173
npm run generate:content       # Generate content structure from HTML files

# Production
npm run build                  # TypeScript compilation + Vite build
npm run preview               # Preview production build locally

# Code Quality
npm run lint                  # Run ESLint with TypeScript rules
```

### Build Process

1. Content generation runs automatically before build (`prebuild` script)
2. TypeScript compilation validates all types
3. Vite bundles and optimizes for production
4. Output goes to `dist/` directory

## Configuration Notes

- Path aliases configured with `@/` pointing to `src/`
- Custom Microsoft color palette defined in Tailwind config
- Font family uses Geist with system fallbacks
- Custom animations for floating elements and accordion transitions