# StreamCrowd Technical Stack

## Core Technologies

- **Frontend**: React 19.2.1 with TypeScript 5.8
- **Build System**: Vite 7.2.7 with hot module replacement
- **Styling**: Tailwind CSS 4.1.17 with custom design system
- **State Management**: Redux Toolkit 2.11.2 with Redux Persist
- **Desktop App**: Electron 39.2.6 for cross-platform distribution
- **PWA**: Vite PWA plugin with service worker for offline support

## Architecture

- **Pattern**: Hexagonal Architecture (Ports & Adapters)
- **Structure**: Domain → Application → Infrastructure layers
- **Dependency Flow**: Presentation → Application → Domain ← Infrastructure

## Key Libraries

- **Real-time**: Socket.io-client for live updates
- **Charts**: Recharts for analytics visualization  
- **Icons**: Lucide React for consistent iconography
- **Validation**: Zod for runtime type checking
- **Testing**: Vitest + Playwright for unit and E2E tests
- **Property Testing**: fast-check for property-based testing
- **OBS Integration**: obs-websocket-js for stream control
- **Chat Integration**: tmi.js for Twitch chat connectivity
- **Firebase**: Real-time database and authentication
- **AI/ML**: MediaPipe for computer vision features

## Development Commands

```bash
# Development
npm run dev                 # Start development server (localhost:5173)
npm run electron:dev        # Start Electron app with hot reload

# Building
npm run build              # Build for web deployment
npm run build:web          # Explicit web build
npm run electron:build     # Build desktop executables
npm run build:analyze      # Build with bundle analysis

# Testing
npm run test               # Run unit tests (Vitest)
npm run test:watch         # Run tests in watch mode
npm run test:e2e           # Run E2E tests (Playwright)
npm run test:e2e:ui        # Run E2E tests with UI
npm run test:all           # Run all tests

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Auto-fix linting issues
npm run lint:check-cycles  # Check for circular imports (CRITICAL)

# Preview
npm run preview            # Preview production build
```

## Build Configuration

- **Code Splitting**: Manual chunks for vendors (React, Firebase, Charts, etc.)
- **Bundle Analysis**: Rollup visualizer for size optimization
- **Minification**: Terser with console/debugger removal in production
- **PWA**: Service worker with network-first strategy for JS/CSS
- **Security**: Custom security headers plugin

## Development Guidelines

- **Circular Imports**: Strictly forbidden - ESLint enforces with `import/no-cycle`
- **TypeScript**: Strict mode enabled with path aliases (`@/*`)
- **Testing**: Property-based tests required for core logic
- **Architecture**: Follow hexagonal architecture dependency rules
- **Internationalization**: All user-facing strings must use i18n system

## Environment Setup

- **Node.js**: 18+ required
- **Package Manager**: npm (lock file committed)
- **Environment Variables**: Copy `.env.local.example` to `.env.local`
- **Development Port**: 5173 (Vite default)
- **Electron**: Concurrent development with wait-on for startup sync