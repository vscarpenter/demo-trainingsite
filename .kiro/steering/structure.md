# Project Structure

## Source Code Organization

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui base components (button, accordion, etc.)
│   ├── Header.tsx       # Top navigation with Microsoft branding
│   ├── Sidebar.tsx      # Left navigation panel with course outline
│   ├── CourseOutline.tsx # Expandable course menu with progress
│   ├── ContentViewer.tsx # Main content display area
│   ├── HeroSection.tsx  # Landing/intro content area
│   └── ControlsBar.tsx  # Bottom media controls
├── data/                # Static data and content structure
│   └── contentStructure.ts # Course content definitions
├── lib/                 # Utilities and constants
│   ├── utils.ts         # Helper functions (cn, etc.)
│   └── constants.ts     # App-wide constants
├── styles/              # Global styles
│   └── globals.css      # Tailwind imports + custom animations
├── types/               # TypeScript type definitions
│   └── content.ts       # Content-related interfaces
├── App.tsx              # Main application component
└── main.tsx             # Application entry point
```

## Content Organization

```
public/                  # Static HTML content files
├── 1. Introduction/     # Course introduction content
├── 2. Office Apps/      # Word, Excel, PowerPoint modules
│   ├── Word/           # Word-specific slides and videos
│   ├── Excel/          # Excel-specific content
│   └── PowerPoint/     # PowerPoint tutorials
├── 3. Outlook/         # Outlook learning modules
├── 4. Teams/           # Teams collaboration content
├── 5. OneNote/         # OneNote organization content
├── 6. SharePoint/      # SharePoint collaboration modules
└── 7. Prompting Tips/  # General AI prompting guidance
```

## Architecture Patterns

### Component Structure
- **Functional components** with TypeScript interfaces for props
- **Custom hooks** for state management (useState, useEffect)
- **Lazy loading** for ContentViewer to improve initial load time
- **Compound components** pattern for UI elements (accordion, etc.)

### State Management
- Local component state with useState
- URL-based routing with query parameters and hash navigation
- localStorage for persistence of current content position
- Props drilling for shared state between components

### Styling Conventions
- **Tailwind utility classes** for all styling
- **Microsoft color palette** (ms-blue, ms-red, ms-green, ms-yellow)
- **Responsive design** with mobile-first approach
- **Custom animations** defined in globals.css (float, pulse-dot)

### File Naming
- **PascalCase** for React components (.tsx files)
- **camelCase** for utilities and data files (.ts files)
- **kebab-case** for HTML content files
- **Descriptive names** that indicate component purpose

### Import Organization
- React imports first
- Third-party library imports
- Local component imports with @/ alias
- Type imports grouped separately when needed