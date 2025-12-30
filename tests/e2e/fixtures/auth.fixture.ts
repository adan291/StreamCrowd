/**
 * Authentication Fixtures for E2E Tests
 * Provides pre-authenticated page contexts
 */

import { test as base, Page } from '@playwright/test';

// Mock user data
export const mockUser = {
  id: '123456789',
  login: 'teststreamer',
  display_name: 'TestStreamer',
  profile_image_url: 'https://example.com/avatar.png',
  broadcaster_type: 'partner',
};

export const mockModeratorUser = {
  id: '987654321',
  login: 'testmoderator',
  display_name: 'TestModerator',
  profile_image_url: 'https://example.com/mod-avatar.png',
  broadcaster_type: '',
};

// Auth state interface
interface AuthState {
  token: string;
  user: typeof mockUser;
  expiresAt: number;
}

// Custom fixtures type
type AuthFixtures = {
  authenticatedPage: Page;
  moderatorPage: Page;
  unauthenticatedPage: Page;
};

/**
 * Setup authentication state in localStorage
 */
async function setupAuth(page: Page, user: typeof mockUser): Promise<void> {
  await page.addInitScript((userData) => {
    const authState = {
      token: 'mock-oauth-token-' + Date.now(),
      user: userData,
      expiresAt: Date.now() + 3600000, // 1 hour
    };
    localStorage.setItem('twitch_auth', JSON.stringify(authState));
    localStorage.setItem('twitch_user', JSON.stringify(userData));
  }, user);
}

/**
 * Mock Twitch OAuth flow
 */
async function mockTwitchOAuth(page: Page): Promise<void> {
  // Intercept OAuth redirect
  await page.route('**/oauth2/authorize**', async (route) => {
    const url = new URL(route.request().url());
    const redirectUri = url.searchParams.get('redirect_uri') || '/';
    const state = url.searchParams.get('state') || '';
    
    // Simulate successful OAuth callback
    await route.fulfill({
      status: 302,
      headers: {
        Location: `${redirectUri}#access_token=mock_token&token_type=bearer&state=${state}`,
      },
    });
  });

  // Mock Twitch API calls
  await page.route('**/api.twitch.tv/**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('/users')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [mockUser] }),
      });
    } else if (url.includes('/channels')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            broadcaster_id: mockUser.id,
            broadcaster_name: mockUser.display_name,
            game_name: 'Just Chatting',
            title: 'Test Stream',
          }],
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Extended test with auth fixtures
 */
export const test = base.extend<AuthFixtures>({
  // Authenticated as streamer/owner
  authenticatedPage: async ({ page }, use) => {
    await mockTwitchOAuth(page);
    await setupAuth(page, mockUser);
    await use(page);
  },

  // Authenticated as moderator
  moderatorPage: async ({ page }, use) => {
    await mockTwitchOAuth(page);
    await setupAuth(page, mockModeratorUser);
    await use(page);
  },

  // Not authenticated
  unauthenticatedPage: async ({ page }, use) => {
    await mockTwitchOAuth(page);
    // Clear any existing auth
    await page.addInitScript(() => {
      localStorage.removeItem('twitch_auth');
      localStorage.removeItem('twitch_user');
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
