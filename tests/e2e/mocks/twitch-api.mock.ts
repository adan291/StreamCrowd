/**
 * Twitch API Mock
 * Intercepts and mocks Twitch API calls
 */

import { Page, Route } from '@playwright/test';

export interface MockUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  broadcaster_type: string;
}

export interface MockChannel {
  broadcaster_id: string;
  broadcaster_name: string;
  game_name: string;
  title: string;
}

export interface TwitchMockConfig {
  user?: MockUser;
  channel?: MockChannel;
  isLive?: boolean;
  viewerCount?: number;
}

const defaultUser: MockUser = {
  id: '123456789',
  login: 'teststreamer',
  display_name: 'TestStreamer',
  profile_image_url: 'https://example.com/avatar.png',
  broadcaster_type: 'partner',
};

// Export for use in tests
export const mockUser = defaultUser;

const defaultChannel: MockChannel = {
  broadcaster_id: '123456789',
  broadcaster_name: 'TestStreamer',
  game_name: 'Just Chatting',
  title: 'Test Stream',
};

/**
 * Setup Twitch API mocks
 */
export async function setupTwitchMock(page: Page, config: TwitchMockConfig = {}): Promise<void> {
  const user = config.user || defaultUser;
  const channel = config.channel || defaultChannel;
  const isLive = config.isLive ?? true;
  const viewerCount = config.viewerCount ?? 1000;

  // Mock OAuth endpoints
  await page.route('**/id.twitch.tv/oauth2/**', async (route: Route) => {
    const url = route.request().url();

    if (url.includes('/authorize')) {
      // Redirect to callback with mock token
      const redirectUri = new URL(url).searchParams.get('redirect_uri') || '/';
      await route.fulfill({
        status: 302,
        headers: {
          Location: `${redirectUri}#access_token=mock_token_${Date.now()}&token_type=bearer`,
        },
      });
    } else if (url.includes('/validate')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          client_id: 'mock_client_id',
          login: user.login,
          user_id: user.id,
          expires_in: 3600,
        }),
      });
    } else if (url.includes('/revoke')) {
      await route.fulfill({ status: 200 });
    } else {
      await route.continue();
    }
  });

  // Mock Helix API endpoints
  await page.route('**/api.twitch.tv/helix/**', async (route: Route) => {
    const url = route.request().url();

    if (url.includes('/users')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [user] }),
      });
    } else if (url.includes('/channels')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [channel] }),
      });
    } else if (url.includes('/streams')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: isLive ? [{
            id: 'stream_123',
            user_id: user.id,
            user_name: user.display_name,
            game_name: channel.game_name,
            title: channel.title,
            viewer_count: viewerCount,
            started_at: new Date().toISOString(),
          }] : [],
        }),
      });
    } else if (url.includes('/polls')) {
      await handlePollsEndpoint(route);
    } else if (url.includes('/predictions')) {
      await handlePredictionsEndpoint(route);
    } else if (url.includes('/chat/chatters')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { user_id: '1', user_login: 'viewer1', user_name: 'Viewer1' },
            { user_id: '2', user_login: 'viewer2', user_name: 'Viewer2' },
          ],
          total: 2,
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    }
  });
}

/**
 * Handle polls endpoint
 */
async function handlePollsEndpoint(route: Route): Promise<void> {
  const method = route.request().method();

  if (method === 'POST') {
    // Create poll
    const body = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: `poll_${Date.now()}`,
          broadcaster_id: '123456789',
          title: body?.title || 'Test Poll',
          choices: (body?.choices || []).map((c: any, i: number) => ({
            id: `choice_${i}`,
            title: c.title,
            votes: 0,
          })),
          status: 'ACTIVE',
          started_at: new Date().toISOString(),
        }],
      }),
    });
  } else if (method === 'PATCH') {
    // End poll
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: 'poll_123',
          status: 'TERMINATED',
          ended_at: new Date().toISOString(),
        }],
      }),
    });
  } else {
    // Get polls
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  }
}

/**
 * Handle predictions endpoint
 */
async function handlePredictionsEndpoint(route: Route): Promise<void> {
  const method = route.request().method();

  if (method === 'POST') {
    const body = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: `prediction_${Date.now()}`,
          broadcaster_id: '123456789',
          title: body?.title || 'Test Prediction',
          outcomes: (body?.outcomes || []).map((o: any, i: number) => ({
            id: `outcome_${i}`,
            title: o.title,
            users: 0,
            channel_points: 0,
          })),
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        }],
      }),
    });
  } else if (method === 'PATCH') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: 'prediction_123',
          status: 'RESOLVED',
          ended_at: new Date().toISOString(),
        }],
      }),
    });
  } else {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  }
}

/**
 * Mock chat messages
 */
export async function mockChatMessage(page: Page, message: {
  username: string;
  message: string;
  isMod?: boolean;
  isSub?: boolean;
}): Promise<void> {
  await page.evaluate((msg) => {
    window.dispatchEvent(new CustomEvent('mock-chat-message', {
      detail: {
        id: `msg_${Date.now()}`,
        username: msg.username,
        displayName: msg.username,
        message: msg.message,
        isMod: msg.isMod || false,
        isSubscriber: msg.isSub || false,
        timestamp: Date.now(),
      },
    }));
  }, message);
}

export default {
  setupTwitchMock,
  mockChatMessage,
};
