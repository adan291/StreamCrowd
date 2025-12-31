# Design: Tests E2E con Playwright

## Architecture Overview

```
tests/
├── e2e/
│   ├── fixtures/           # Test fixtures y data factories
│   │   ├── auth.fixture.ts
│   │   ├── poll.fixture.ts
│   │   └── data-factory.ts
│   ├── pages/              # Page Object Models
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   ├── DashboardPage.ts
│   │   ├── PollPage.ts
│   │   ├── PredictionPage.ts
│   │   └── ...
│   ├── specs/              # Test specifications
│   │   ├── auth.spec.ts
│   │   ├── polls.spec.ts
│   │   ├── predictions.spec.ts
│   │   ├── giveaways.spec.ts
│   │   ├── timers.spec.ts
│   │   ├── obs.spec.ts
│   │   ├── collaboration.spec.ts
│   │   ├── macros.spec.ts
│   │   ├── responsive.spec.ts
│   │   ├── accessibility.spec.ts
│   │   └── performance.spec.ts
│   ├── mocks/              # API mocks
│   │   ├── twitch-api.mock.ts
│   │   ├── obs-websocket.mock.ts
│   │   └── collaboration-ws.mock.ts
│   └── utils/              # Test utilities
│       ├── test-helpers.ts
│       └── assertions.ts
├── playwright.config.ts
└── global-setup.ts
```

## Page Object Model

### Base Page
```typescript
// tests/e2e/pages/BasePage.ts
export class BasePage {
  constructor(protected page: Page) {}
  
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
  
  async getToast() {
    return this.page.locator('[role="alert"]');
  }
  
  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }
}
```

### Poll Page Example
```typescript
// tests/e2e/pages/PollPage.ts
export class PollPage extends BasePage {
  // Locators
  readonly createButton = this.page.getByRole('button', { name: /crear poll/i });
  readonly titleInput = this.page.getByLabel('Título');
  readonly optionInputs = this.page.locator('[data-testid="poll-option"]');
  readonly submitButton = this.page.getByRole('button', { name: /iniciar/i });
  readonly resultsChart = this.page.locator('[data-testid="poll-results"]');
  
  // Actions
  async createPoll(title: string, options: string[]) {
    await this.createButton.click();
    await this.titleInput.fill(title);
    for (let i = 0; i < options.length; i++) {
      await this.optionInputs.nth(i).fill(options[i]);
    }
    await this.submitButton.click();
  }
  
  async closePoll() {
    await this.page.getByRole('button', { name: /cerrar/i }).click();
  }
  
  async getResults() {
    return this.resultsChart.textContent();
  }
}
```

## Test Fixtures

### Auth Fixture
```typescript
// tests/e2e/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  moderatorPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Mock Twitch OAuth
    await page.route('**/oauth/authorize**', route => {
      route.fulfill({ status: 302, headers: { Location: '/?token=mock' } });
    });
    
    // Set auth state
    await page.evaluate(() => {
      localStorage.setItem('auth', JSON.stringify({
        token: 'mock-token',
        user: { id: '123', name: 'TestUser' }
      }));
    });
    
    await use(page);
  },
  
  moderatorPage: async ({ page }, use) => {
    // Similar but with moderator role
    await use(page);
  }
});
```

### Data Factory
```typescript
// tests/e2e/fixtures/data-factory.ts
export const DataFactory = {
  poll: (overrides = {}) => ({
    title: `Test Poll ${Date.now()}`,
    options: ['Option A', 'Option B', 'Option C'],
    duration: 60,
    ...overrides
  }),
  
  prediction: (overrides = {}) => ({
    title: `Test Prediction ${Date.now()}`,
    outcomes: ['Win', 'Lose'],
    duration: 120,
    ...overrides
  }),
  
  giveaway: (overrides = {}) => ({
    title: `Test Giveaway ${Date.now()}`,
    keyword: '!enter',
    duration: 300,
    ...overrides
  })
};
```

## Mock Services

### OBS WebSocket Mock
```typescript
// tests/e2e/mocks/obs-websocket.mock.ts
export class OBSWebSocketMock {
  private handlers: Map<string, Function> = new Map();
  
  async setup(page: Page) {
    await page.addInitScript(() => {
      window.OBSWebSocket = class {
        connect() { return Promise.resolve(); }
        disconnect() { return Promise.resolve(); }
        call(method: string, params?: any) {
          // Return mock responses based on method
          const responses: Record<string, any> = {
            'GetSceneList': { scenes: [{ sceneName: 'Scene 1' }] },
            'GetCurrentProgramScene': { currentProgramSceneName: 'Scene 1' },
          };
          return Promise.resolve(responses[method] || {});
        }
        on(event: string, handler: Function) {}
      };
    });
  }
}
```

## Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Test Example

```typescript
// tests/e2e/specs/polls.spec.ts
import { test, expect } from '../fixtures/auth.fixture';
import { PollPage } from '../pages/PollPage';
import { DataFactory } from '../fixtures/data-factory';

test.describe('Polls', () => {
  test('should create and close a poll', async ({ authenticatedPage }) => {
    const pollPage = new PollPage(authenticatedPage);
    const pollData = DataFactory.poll();
    
    await authenticatedPage.goto('/polls');
    await pollPage.createPoll(pollData.title, pollData.options);
    
    // Verify poll is active
    await expect(pollPage.resultsChart).toBeVisible();
    
    // Close poll
    await pollPage.closePoll();
    
    // Verify results shown
    await expect(pollPage.getToast()).toContainText('Poll cerrado');
  });
  
  test('should show poll in history after closing', async ({ authenticatedPage }) => {
    // ...
  });
});
```

## CI/CD Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Files to Create

- `tests/e2e/fixtures/auth.fixture.ts`
- `tests/e2e/fixtures/data-factory.ts`
- `tests/e2e/pages/BasePage.ts`
- `tests/e2e/pages/LoginPage.ts`
- `tests/e2e/pages/DashboardPage.ts`
- `tests/e2e/pages/PollPage.ts`
- `tests/e2e/pages/PredictionPage.ts`
- `tests/e2e/pages/GiveawayPage.ts`
- `tests/e2e/pages/TimerPage.ts`
- `tests/e2e/pages/CollaborationPage.ts`
- `tests/e2e/mocks/twitch-api.mock.ts`
- `tests/e2e/mocks/obs-websocket.mock.ts`
- `tests/e2e/specs/*.spec.ts` (11 archivos)
- `playwright.config.ts` (actualizar existente)
