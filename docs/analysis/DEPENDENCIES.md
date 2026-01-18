# Dependencies Documentation

**Project:** StreamCrowd v1.0.0  
**Last Updated:** January 15, 2026  
**Requirements:** 5.2

---

## Overview

This document provides a comprehensive overview of all dependencies used in StreamCrowd, organized by category. Each dependency includes its purpose, version, and criticality level.

---

## Critical Dependencies

These packages are essential for the application to function. The app will not work without them.

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.1 | Core UI framework for building user interfaces |
| `react-dom` | ^19.2.1 | React DOM renderer for web applications |
| `@reduxjs/toolkit` | ^2.11.2 | Modern Redux state management with reduced boilerplate |
| `react-redux` | ^9.2.0 | Official React bindings for Redux |
| `redux-persist` | ^6.0.0 | Persist and rehydrate Redux store to localStorage |
| `typescript` | ~5.8.2 | Static type checking for JavaScript |
| `vite` | ^7.2.7 | Fast build tool and development server |
| `zod` | ^4.3.5 | TypeScript-first schema validation library |

---

## Integration Dependencies

These packages enable integration with external services and platforms.

### Firebase (Backend Services)

| Package | Version | Purpose |
|---------|---------|---------|
| `firebase` | ^12.7.0 | Authentication, Firestore database, cloud functions |

**Used for:**
- User authentication (Twitch OAuth)
- Cloud data storage (giveaways, polls, settings)
- Real-time synchronization

### Twitch Integration

| Package | Version | Purpose |
|---------|---------|---------|
| `tmi.js` | ^1.8.5 | Twitch IRC/chat integration for reading and sending messages |

**Used for:**
- Reading chat messages
- Sending bot responses
- Chat commands processing
- Giveaway participation tracking

### OBS Studio Integration

| Package | Version | Purpose |
|---------|---------|---------|
| `obs-websocket-js` | ^5.0.7 | Control OBS Studio via WebSocket protocol |

**Used for:**
- Scene switching
- Source visibility control
- Overlay management
- Stream status monitoring

### Real-time Communication

| Package | Version | Purpose |
|---------|---------|---------|
| `socket.io-client` | ^4.8.3 | WebSocket client for real-time bidirectional communication |

**Used for:**
- Collaboration features
- Real-time updates between clients
- Mobile companion app communication

---

## Utility Dependencies

### UI/Styling

| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | ^4.1.17 | Utility-first CSS framework |
| `@tailwindcss/vite` | ^4.1.17 | Vite plugin for Tailwind CSS |
| `lucide-react` | ^0.556.0 | Modern icon library with React components |

### Data Visualization

| Package | Version | Purpose |
|---------|---------|---------|
| `recharts` | ^3.5.1 | Composable charting library for React |

**Used for:**
- Stream analytics charts
- Viewer count graphs
- Engagement metrics visualization

### Form Handling

| Package | Version | Purpose |
|---------|---------|---------|
| `@hookform/resolvers` | ^5.2.2 | Validation resolvers for react-hook-form (Zod integration) |

### Security

| Package | Version | Purpose |
|---------|---------|---------|
| `dompurify` | ^3.3.1 | HTML sanitization to prevent XSS attacks |
| `@types/dompurify` | ^3.0.5 | TypeScript type definitions for DOMPurify |

### Analytics

| Package | Version | Purpose |
|---------|---------|---------|
| `@vercel/speed-insights` | ^1.3.1 | Performance analytics and monitoring |

### Experimental Features

| Package | Version | Purpose |
|---------|---------|---------|
| `@mediapipe/camera_utils` | ^0.3.1675466862 | Camera utilities for hand tracking features |
| `@mediapipe/hands` | ^0.4.1675469240 | Hand gesture recognition for interactive overlays |

---

## Testing Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^4.0.15 | Fast unit testing framework compatible with Vite |
| `@playwright/test` | ^1.57.0 | End-to-end testing framework |
| `fast-check` | ^3.22.0 | Property-based testing library |
| `@testing-library/react` | ^16.3.0 | React component testing utilities |
| `@testing-library/jest-dom` | ^6.9.1 | Custom DOM matchers for testing |
| `@axe-core/playwright` | ^4.11.0 | Accessibility testing integration |
| `jsdom` | ^27.3.0 | DOM simulation for Node.js testing |

### Testing Strategy

- **Unit Tests:** Vitest for fast, isolated component and function testing
- **Integration Tests:** Testing Library for React component integration
- **E2E Tests:** Playwright for full user flow testing
- **Property Tests:** fast-check for property-based testing of correctness properties
- **Accessibility Tests:** axe-core for WCAG compliance verification

---

## Build & Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^7.2.7 | Build tool and development server |
| `@vitejs/plugin-react` | ^5.0.0 | React support for Vite |
| `vite-plugin-pwa` | ^1.0.0 | Progressive Web App support |
| `typescript` | ~5.8.2 | TypeScript compiler |
| `terser` | ^5.44.1 | JavaScript minification for production builds |
| `rollup-plugin-visualizer` | ^6.0.5 | Bundle size analysis |

### Linting & Code Quality

| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | ^9.39.2 | JavaScript/TypeScript linting |
| `@eslint/js` | ^9.39.2 | ESLint JavaScript configuration |
| `@typescript-eslint/eslint-plugin` | ^8.53.0 | TypeScript-specific ESLint rules |
| `@typescript-eslint/parser` | ^8.53.0 | TypeScript parser for ESLint |
| `typescript-eslint` | ^8.53.0 | TypeScript ESLint integration |
| `eslint-plugin-import` | ^2.32.0 | Import/export linting (circular import detection) |
| `eslint-import-resolver-typescript` | ^4.4.4 | TypeScript import resolution for ESLint |

### Desktop Application (Electron)

| Package | Version | Purpose |
|---------|---------|---------|
| `electron` | ^39.2.6 | Desktop application framework |
| `electron-builder` | ^26.0.12 | Electron packaging and distribution |
| `concurrently` | ^9.2.1 | Run multiple commands simultaneously |
| `wait-on` | ^9.0.3 | Wait for resources before starting Electron |

### Type Definitions

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/node` | ^22.14.0 | Node.js TypeScript types |
| `@types/ws` | ^8.18.1 | WebSocket TypeScript types |
| `@types/dompurify` | ^3.0.5 | DOMPurify TypeScript types |

### WebSocket

| Package | Version | Purpose |
|---------|---------|---------|
| `ws` | ^8.18.3 | WebSocket library for Node.js (testing/development) |

---

## Candidates for Removal

The following packages should be reviewed for potential removal:

### Potentially Unused

| Package | Reason | Action |
|---------|--------|--------|
| `@mediapipe/camera_utils` | Hand tracking feature may not be actively used | Verify usage in codebase |
| `@mediapipe/hands` | Hand tracking feature may not be actively used | Verify usage in codebase |
| `@vercel/speed-insights` | Analytics may not be needed for self-hosted deployments | Review analytics requirements |

### Recommendations

1. **Review MediaPipe packages:** Search codebase for `@mediapipe` imports. If not used, remove to reduce bundle size.
2. **Review Vercel Speed Insights:** Determine if analytics are needed. Consider removing for privacy-focused deployments.

---

## Dependency Statistics

| Category | Count |
|----------|-------|
| Production Dependencies | 21 |
| Development Dependencies | 23 |
| Total Direct Dependencies | 44 |
| Total Transitive Dependencies | ~1,100 |

---

## Security Status

| Metric | Status |
|--------|--------|
| Critical Vulnerabilities | ✅ 0 |
| High Vulnerabilities | ✅ 0 |
| Moderate Vulnerabilities | ✅ 0 |
| Low Vulnerabilities | ✅ 0 |

**Last Audit:** January 15, 2026  
**Last Security Patch Run:** January 15, 2026 (`npm audit fix` - no changes needed)

---

## Update Policy

1. **Patch Updates:** Apply automatically via `npm update`
2. **Minor Updates:** Review changelog, apply if no breaking changes
3. **Major Updates:** Test thoroughly in development before applying
4. **Security Updates:** Apply immediately for critical/high vulnerabilities

### Commands

```bash
# Check for outdated packages
npm outdated

# Update all packages to latest compatible versions
npm update

# Check for security vulnerabilities
npm audit

# Fix security vulnerabilities (non-breaking)
npm audit fix
```

---

## Notes

- All dependencies are actively maintained
- No deprecated packages detected
- Bundle size is optimized with tree-shaking
- TypeScript types are available for all packages

---

**Documentation Status:** ✅ Complete
