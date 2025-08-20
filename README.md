# Microsoft Sunit Carpenter Learning Clone

A pixel-perfect recreation of the Microsoft Sunit Carpenter Learning interface built with React, TypeScript, shadcn/ui, and Tailwind CSS.

## Features

- **Authentic Microsoft Design**: Recreates the exact look and feel of Sunit Carpenter Learning
- **Responsive Layout**: Works beautifully on desktop and mobile devices
- **Interactive Components**: Functional sidebar navigation, course outline, and media controls
- **Modern Tech Stack**: Built with React 18, TypeScript, and modern tooling
- **Smooth Animations**: Subtle hover effects and transitions throughout
- **Accessibility**: Proper ARIA labels and keyboard navigation support

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for component primitives
- **Lucide React** for icons
- **Radix UI** for accessible components

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd TrainingSite
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── accordion.tsx
│   │   ├── progress.tsx
│   │   └── separator.tsx
│   ├── Header.tsx          # Top navigation bar
│   ├── Sidebar.tsx         # Left navigation panel
│   ├── CourseOutline.tsx   # Expandable course menu
│   ├── HeroSection.tsx     # Main content area
│   └── ControlsBar.tsx     # Bottom media controls
├── lib/
│   └── utils.ts           # Utility functions
├── styles/
│   └── globals.css        # Global styles and animations
├── App.tsx                # Main application component
└── main.tsx              # Application entry point
```

## Key Components

### Header
- Microsoft branding with colored logo squares
- Breadcrumb navigation
- User controls and action buttons

### Sidebar
- Tabbed navigation (Menu, Transcript, Resources)
- Expandable course outline with progress indicators
- Progress tracking with visual progress bar

### Hero Section
- Abstract blue gradient background
- Animated floating elements and dotted patterns
- Course title and metadata display

### Controls Bar
- Video-style playback controls
- Progress bar with time display
- Microsoft footer links

## Customization

### Colors
The Microsoft color palette is defined in `tailwind.config.js`:
- Primary Blue: `#0078d4`
- Microsoft Red: `#d13438`
- Microsoft Green: `#107c10`
- Microsoft Yellow: `#ffb900`

### Typography
Uses Inter font family as a substitute for Geist fonts. You can update the font imports in `globals.css` to use actual Geist fonts if available.

### Animations
Custom animations are defined in `globals.css`:
- `float`: Gentle floating animation for background elements
- `pulse-dot`: Pulsing animation for decorative dots
- Accordion animations for expandable sections

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational purposes only. Microsoft, Sunit Carpenter Learning, and related trademarks are property of Microsoft Corporation.
