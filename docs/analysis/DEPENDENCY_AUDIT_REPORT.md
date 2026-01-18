# Dependency Audit Report

**Generated:** January 15, 2026  
**Project:** StreamCrowd v1.0.0  
**Requirements:** 5.1  
**Last Security Patch:** January 15, 2026 (`npm audit fix` - no changes needed)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Dependencies | 1,143 |
| Production Dependencies | 194 |
| Development Dependencies | 870 |
| Optional Dependencies | 133 |
| Critical Vulnerabilities | 0 |
| High Vulnerabilities | 0 |
| Moderate Vulnerabilities | 0 |
| Low Vulnerabilities | 0 |

**Status:** ✅ No security vulnerabilities detected

---

## npm audit Results

```json
{
  "auditReportVersion": 2,
  "vulnerabilities": {},
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 0,
      "high": 0,
      "critical": 0,
      "total": 0
    },
    "dependencies": {
      "prod": 194,
      "dev": 870,
      "optional": 133,
      "peer": 22,
      "peerOptional": 0,
      "total": 1143
    }
  }
}
```

---

## Outdated Packages

The following packages have newer versions available:

| Package | Current | Wanted | Latest | Priority |
|---------|---------|--------|--------|----------|
| @tailwindcss/vite | 4.1.17 | 4.1.18 | 4.1.18 | Low |
| @testing-library/react | 16.3.0 | 16.3.1 | 16.3.1 | Low |
| @types/node | 22.19.2 | 22.19.6 | 25.0.8 | Low |
| electron | 39.2.6 | 39.2.7 | 39.2.7 | Medium |
| electron-builder | 26.0.12 | 26.4.0 | 26.4.0 | Medium |
| fast-check | 3.23.2 | 3.23.2 | 4.5.3 | Low (Major) |
| firebase | 12.7.0 | 12.8.0 | 12.8.0 | Medium |
| jsdom | 27.3.0 | 27.4.0 | 27.4.0 | Low |
| lucide-react | 0.556.0 | 0.556.0 | 0.562.0 | Low |
| recharts | 3.5.1 | 3.6.0 | 3.6.0 | Low |
| tailwindcss | 4.1.17 | 4.1.18 | 4.1.18 | Low |
| typescript | 5.8.3 | 5.8.3 | 5.9.3 | Low (Major) |
| vite | 7.2.7 | 7.3.1 | 7.3.1 | Medium |
| vitest | 4.0.15 | 4.0.17 | 4.0.17 | Low |
| ws | 8.18.3 | 8.19.0 | 8.19.0 | Low |

### Update Recommendations

**Safe to Update (patch/minor):**
- `@tailwindcss/vite`, `tailwindcss` → 4.1.18
- `@testing-library/react` → 16.3.1
- `@types/node` → 22.19.6
- `electron` → 39.2.7
- `electron-builder` → 26.4.0
- `firebase` → 12.8.0
- `jsdom` → 27.4.0
- `recharts` → 3.6.0
- `vite` → 7.3.1
- `vitest` → 4.0.17
- `ws` → 8.19.0

**Requires Testing (major version):**
- `fast-check` 3.x → 4.x (breaking changes possible)
- `typescript` 5.8.x → 5.9.x (minor breaking changes possible)
- `@types/node` 22.x → 25.x (breaking changes possible)

---

## Direct Dependencies Tree (depth=0)

### Production Dependencies (21 packages)

| Package | Version | Purpose |
|---------|---------|---------|
| @hookform/resolvers | 5.2.2 | Form validation integration with Zod |
| @mediapipe/camera_utils | 0.3.1675466862 | Camera utilities for hand tracking |
| @mediapipe/hands | 0.4.1675469240 | Hand gesture recognition |
| @reduxjs/toolkit | 2.11.2 | State management |
| @tailwindcss/vite | 4.1.17 | Tailwind CSS Vite plugin |
| @types/dompurify | 3.0.5 | TypeScript types for DOMPurify |
| @vercel/speed-insights | 1.3.1 | Performance analytics |
| dompurify | 3.3.1 | HTML sanitization (XSS prevention) |
| firebase | 12.7.0 | Backend services (auth, database) |
| lucide-react | 0.556.0 | Icon library |
| obs-websocket-js | 5.0.7 | OBS Studio integration |
| react | 19.2.3 | UI framework |
| react-dom | 19.2.3 | React DOM renderer |
| react-redux | 9.2.0 | React bindings for Redux |
| recharts | 3.5.1 | Charting library |
| redux-persist | 6.0.0 | Redux state persistence |
| socket.io-client | 4.8.3 | WebSocket client |
| tailwindcss | 4.1.17 | CSS framework |
| tmi.js | 1.8.5 | Twitch chat integration |
| zod | 4.3.5 | Schema validation |

### Development Dependencies (23 packages)

| Package | Version | Purpose |
|---------|---------|---------|
| @axe-core/playwright | 4.11.0 | Accessibility testing |
| @eslint/js | 9.39.2 | ESLint JavaScript config |
| @playwright/test | 1.57.0 | E2E testing framework |
| @testing-library/jest-dom | 6.9.1 | DOM testing matchers |
| @testing-library/react | 16.3.0 | React testing utilities |
| @types/node | 22.19.2 | Node.js TypeScript types |
| @types/ws | 8.18.1 | WebSocket TypeScript types |
| @typescript-eslint/eslint-plugin | 8.53.0 | TypeScript ESLint rules |
| @typescript-eslint/parser | 8.53.0 | TypeScript ESLint parser |
| @vitejs/plugin-react | 5.1.2 | Vite React plugin |
| concurrently | 9.2.1 | Run multiple commands |
| electron | 39.2.6 | Desktop app framework |
| electron-builder | 26.0.12 | Electron packaging |
| eslint | 9.39.2 | Code linting |
| eslint-import-resolver-typescript | 4.4.4 | TypeScript import resolution |
| eslint-plugin-import | 2.32.0 | Import/export linting |
| fast-check | 3.23.2 | Property-based testing |
| jsdom | 27.3.0 | DOM simulation for tests |
| rollup-plugin-visualizer | 6.0.5 | Bundle analysis |
| terser | 5.44.1 | JavaScript minification |
| typescript | 5.8.3 | TypeScript compiler |
| typescript-eslint | 8.53.0 | TypeScript ESLint integration |
| vite | 7.2.7 | Build tool |
| vite-plugin-pwa | 1.2.0 | PWA support |
| vitest | 4.0.15 | Unit testing framework |
| wait-on | 9.0.3 | Wait for resources |
| ws | 8.18.3 | WebSocket library |

---

## Dependency Categories

### Critical Dependencies (App won't work without)
- `react`, `react-dom` - Core UI framework
- `@reduxjs/toolkit`, `react-redux`, `redux-persist` - State management
- `firebase` - Backend services
- `tmi.js` - Twitch chat integration
- `zod` - Data validation

### Integration Dependencies
- `firebase` - Authentication, database, cloud functions
- `tmi.js` - Twitch IRC/chat
- `obs-websocket-js` - OBS Studio control
- `socket.io-client` - Real-time communication

### UI/Styling Dependencies
- `tailwindcss`, `@tailwindcss/vite` - CSS framework
- `lucide-react` - Icons
- `recharts` - Charts and graphs

### Security Dependencies
- `dompurify` - XSS prevention
- `zod` - Input validation

### Testing Dependencies
- `vitest` - Unit testing
- `@playwright/test` - E2E testing
- `fast-check` - Property-based testing
- `@testing-library/react` - React component testing
- `@axe-core/playwright` - Accessibility testing

### Build/Dev Dependencies
- `vite` - Build tool and dev server
- `typescript` - Type checking
- `eslint` - Code quality
- `electron`, `electron-builder` - Desktop app

---

## Extraneous Packages Detected

The following packages are installed but not listed in package.json:

- `@emnapi/core@1.8.1`
- `@emnapi/runtime@1.8.1`
- `@emnapi/wasi-threads@1.1.0`
- `@napi-rs/wasm-runtime@0.2.12`
- `@tybys/wasm-util@0.10.1`

These are likely transitive dependencies from native modules. No action required.

---

## Candidates for Removal

### Potentially Unused
- `@mediapipe/camera_utils`, `@mediapipe/hands` - Hand tracking features (verify if used)
- `@vercel/speed-insights` - Analytics (verify if needed)

### Consider Alternatives
- None identified at this time

---

## Security Recommendations

1. ✅ **No critical vulnerabilities** - The project is currently secure
2. ⚠️ **Keep dependencies updated** - Run `npm update` periodically
3. ⚠️ **Monitor for new vulnerabilities** - Run `npm audit` before releases
4. ✅ **DOMPurify installed** - XSS protection available
5. ✅ **Zod installed** - Input validation available

---

## Action Items

| Priority | Action | Command |
|----------|--------|---------|
| Low | Update patch versions | `npm update` |
| Medium | Update electron | `npm install electron@39.2.7` |
| Medium | Update firebase | `npm install firebase@12.8.0` |
| Medium | Update vite | `npm install vite@7.3.1` |
| Low | Review mediapipe usage | Manual review |

---

**Report Status:** ✅ Complete
