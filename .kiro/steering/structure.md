# StreamCrowd Project Structure

## Root Level Organization

```
├── components/           # React components (presentation layer)
├── src/                 # Hexagonal architecture implementation
├── hooks/               # Custom React hooks (legacy, being migrated to src/)
├── types/               # TypeScript type definitions
├── i18n/                # Internationalization system
├── config/              # Configuration files and presets
├── constants/           # Application constants
├── context/             # React context providers
├── tests/               # Test files organized by domain
├── docs/                # Documentation and planning
├── mobile/              # Mobile PWA specific files
└── electron/            # Electron desktop app files
```

## Hexagonal Architecture (src/)

**Critical**: Follow strict dependency rules - Domain layer must not import from other layers.

```
src/
├── domain/              # Pure business logic (NO external dependencies)
│   ├── entities/        # Data models (Poll, Vote, StreamEvent)
│   └── ports/           # Interface contracts (IChatProvider, IOBSController)
├── application/         # Application services and orchestration
│   ├── services/        # Business logic services
│   ├── hooks/           # React hooks exposing services
│   └── games/           # Game-specific services
└── infrastructure/      # External integrations
    ├── adapters/        # Interface implementations
    ├── factories/       # Dependency injection
    ├── sync/            # Firebase synchronization
    └── auth/            # OAuth authentication
```

## Component Organization

```
components/
├── activity/            # Stream activity and viewer panels
├── collaboration/       # Multi-user collaboration features
├── commands/            # Chat command management
├── games/               # 13+ interactive mini-games
├── giveaway/            # Raffle and giveaway system
├── integrations/        # External service integrations
├── macros/              # Automation and macro system
├── mascot/              # AI vision mascot
├── metrics/             # Analytics and metrics dashboard
├── obs-export/          # OBS integration and export
├── plugins/             # Plugin system
├── timers/              # Timer and countdown features
├── twitch/              # Twitch-specific components
├── ui/                  # Reusable UI components
└── webhooks/            # Webhook management
```

## Internationalization Structure

```
i18n/
├── locales/
│   ├── en/              # English translations
│   └── es/              # Spanish translations (default)
├── context.tsx          # React context for i18n
├── types.ts             # TypeScript definitions for all translations
├── utils.ts             # Formatting and interpolation utilities
└── validation.ts        # Translation completeness validation
```

## Testing Organization

```
tests/
├── components/          # Component tests
├── domain/              # Domain logic tests
├── services/            # Service layer tests
├── e2e/                 # End-to-end tests (Playwright)
├── i18n/                # Translation validation tests
├── mocks/               # Test mocks and fixtures
└── setup.ts             # Test environment setup
```

## Configuration Files

- **package.json**: Dependencies and scripts
- **vite.config.ts**: Build configuration with chunking strategy
- **tsconfig.json**: TypeScript configuration with path aliases
- **eslint.config.js**: Linting rules with circular import detection
- **playwright.config.ts**: E2E testing configuration
- **tailwind.config.js**: Styling configuration

## Naming Conventions

### Files and Directories
- **Components**: PascalCase (`PollCreator.tsx`)
- **Hooks**: camelCase with `use` prefix (`usePollService.ts`)
- **Services**: PascalCase with `Service` suffix (`ModerationService.ts`)
- **Types**: PascalCase (`Poll.ts`, `VoteRecord.ts`)
- **Utilities**: camelCase (`formatDate.ts`)

### Architecture Specific
- **Entities**: PascalCase, singular (`Poll.ts`, `Vote.ts`)
- **Ports**: `I` prefix (`IChatProvider.ts`, `IOBSController.ts`)
- **Adapters**: `Adapter` suffix (`TwitchAdapter.ts`)
- **Services**: `Service` suffix (`AnalyticsService.ts`)

## Import Patterns

```typescript
// Absolute imports using path alias
import { Component } from '@/components/Component';
import { useService } from '@/src/application/hooks/useService';

// Relative imports within same domain
import { Entity } from './Entity';
import { IPort } from '../ports/IPort';
```

## Critical Rules

1. **No Circular Imports**: ESLint enforces with `import/no-cycle` rule
2. **Hexagonal Dependencies**: Domain layer isolation is mandatory
3. **Lazy Loading**: Heavy components use React.lazy() for code splitting
4. **Internationalization**: All user-facing strings must use i18n system
5. **Property Testing**: Core business logic requires property-based tests
6. **TypeScript Strict**: All code must pass strict TypeScript checks