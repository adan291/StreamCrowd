/**
 * Authentication Fixtures for E2E Tests
 * Provides pre-authenticated page contexts
 */

import type { Page } from '@playwright/test';
// Base fixture waits for the lazy-loaded app after goto/reload
import { test as base } from './base.fixture';

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
    const scopes = [
      'chat:read',
      'chat:edit',
      'channel:manage:predictions',
      'channel:manage:polls',
      'channel:read:redemptions',
      'channel:manage:redemptions',
      'moderator:read:followers',
    ];
    
    const authState = {
      token: 'mock-oauth-token-' + Date.now(),
      user: userData,
      expiresAt: Date.now() + 3600000, // 1 hour
      scopes: scopes,
    };
    localStorage.setItem('twitch_auth', JSON.stringify(authState));
    localStorage.setItem('twitch_user', JSON.stringify(userData));
    localStorage.setItem('twitch_scopes', JSON.stringify(scopes));
    
    // Also set legacy storage keys for compatibility
    localStorage.setItem('twitch_channel', userData.login);
    localStorage.setItem('twitch_token', 'mock-oauth-token');
    localStorage.setItem('twitch_token_expires', String(Date.now() + 3600000));
    localStorage.setItem('twitch_user_id', userData.id);
    localStorage.setItem('twitch_user_name', userData.display_name);
  }, user);
}

/**
 * Mock Twitch OAuth flow and API calls
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

  // Mock Twitch token validation endpoint (id.twitch.tv)
  await page.route('**/id.twitch.tv/oauth2/validate**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        client_id: 'mock-client-id',
        login: mockUser.login,
        scopes: [
          'chat:read',
          'chat:edit',
          'channel:manage:predictions',
          'channel:manage:polls',
          'channel:read:redemptions',
          'channel:manage:redemptions',
          'moderator:read:followers',
        ],
        user_id: mockUser.id,
        expires_in: 3600,
      }),
    });
  });

  // Mock Twitch API calls (api.twitch.tv) with stateful prediction tracking
  // Use page.evaluate to store prediction state in the browser context
  await page.addInitScript(() => {
    (window as unknown as { __mockPrediction: unknown }).__mockPrediction = null;
  });
  
  await page.route('**/api.twitch.tv/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    
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
    } else if (url.includes('/predictions')) {
      // Mock predictions API with state management
      if (method === 'POST') {
        // Create prediction
        const body = route.request().postDataJSON();
        const predictionId = 'mock-prediction-' + Date.now();
        const outcomes = (body?.outcomes || []).map((o: { title: string }, i: number) => ({
          id: `outcome-${i}`,
          title: o.title,
          users: Math.floor(Math.random() * 10),
          channel_points: Math.floor(Math.random() * 10000),
          top_predictors: [],
          color: i === 0 ? 'BLUE' : 'PINK',
        }));
        
        const newPrediction = {
          id: predictionId,
          broadcaster_id: mockUser.id,
          broadcaster_name: mockUser.display_name,
          broadcaster_login: mockUser.login,
          title: body?.title || 'Test Prediction',
          winning_outcome_id: null,
          outcomes,
          prediction_window: body?.prediction_window || 120,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          ended_at: null,
          locked_at: null,
        };
        
        // Store prediction in page context for subsequent GET requests
        await page.evaluate((pred) => {
          (window as unknown as { __mockPrediction: unknown }).__mockPrediction = pred;
        }, newPrediction);
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [newPrediction] }),
        });
      } else if (method === 'PATCH') {
        // Lock/resolve/cancel prediction
        const body = route.request().postDataJSON();
        const currentPrediction = await page.evaluate(() => 
          (window as unknown as { __mockPrediction: unknown }).__mockPrediction
        ) as Record<string, unknown> | null;
        
        const updatedPrediction = {
          ...(currentPrediction || {
            id: body?.id || 'mock-prediction',
            broadcaster_id: mockUser.id,
            broadcaster_name: mockUser.display_name,
            broadcaster_login: mockUser.login,
            title: 'Test Prediction',
            outcomes: [
              { id: 'outcome-0', title: 'Option A', users: 5, channel_points: 5000, top_predictors: [], color: 'BLUE' },
              { id: 'outcome-1', title: 'Option B', users: 3, channel_points: 3000, top_predictors: [], color: 'PINK' },
            ],
            prediction_window: 120,
            created_at: new Date().toISOString(),
          }),
          status: body?.status || 'LOCKED',
          winning_outcome_id: body?.winning_outcome_id || null,
          ended_at: body?.status === 'RESOLVED' || body?.status === 'CANCELED' ? new Date().toISOString() : null,
          locked_at: body?.status === 'LOCKED' ? new Date().toISOString() : (currentPrediction as Record<string, unknown>)?.locked_at || null,
        };
        
        // Clear prediction if resolved or canceled
        if (body?.status === 'RESOLVED' || body?.status === 'CANCELED') {
          await page.evaluate(() => {
            (window as unknown as { __mockPrediction: unknown }).__mockPrediction = null;
          });
        } else {
          await page.evaluate((pred) => {
            (window as unknown as { __mockPrediction: unknown }).__mockPrediction = pred;
          }, updatedPrediction);
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [updatedPrediction] }),
        });
      } else {
        // GET predictions - return current prediction if exists
        const currentPrediction = await page.evaluate(() => 
          (window as unknown as { __mockPrediction: unknown }).__mockPrediction
        );
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: currentPrediction ? [currentPrediction] : [] }),
        });
      }
    } else if (url.includes('/validate')) {
      // Mock token validation - include all required scopes
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          client_id: 'mock-client-id',
          login: mockUser.login,
          scopes: [
            'chat:read',
            'chat:edit',
            'channel:manage:predictions',
            'channel:manage:polls',
            'channel:read:redemptions',
            'channel:manage:redemptions',
            'moderator:read:followers',
          ],
          user_id: mockUser.id,
          expires_in: 3600,
        }),
      });
    } else {
      await route.continue();
    }
  });
  
  // Mock decapi avatar endpoint
  await page.route('**/decapi.me/twitch/avatar/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: 'https://example.com/avatar.png',
    });
  });
}

/**
 * Mock WebSocket to simulate successful Twitch IRC connection
 * This must be called BEFORE page.goto() to ensure the mock is in place
 * before tmi.js initializes
 */
async function mockWebSocket(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Store original WebSocket
    const OriginalWebSocket = window.WebSocket;
    
    // Create mock WebSocket class that simulates tmi.js connection
    class MockTwitchWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      
      url: string;
      readyState: number = MockTwitchWebSocket.CONNECTING;
      protocol: string = '';
      extensions: string = '';
      bufferedAmount: number = 0;
      binaryType: BinaryType = 'blob';
      
      onopen: ((event: Event) => void) | null = null;
      onclose: ((event: CloseEvent) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      
      private eventListeners: Map<string, Set<EventListener>> = new Map();
      
      constructor(url: string, protocols?: string | string[]) {
        this.url = url;
        console.log('[MockWebSocket] Creating WebSocket for:', url);
        
        // Check if this is a Twitch IRC WebSocket (tmi.js uses wss://irc-ws.chat.twitch.tv:443)
        if (url.includes('irc-ws.chat.twitch.tv') || url.includes('irc.chat.twitch.tv')) {
          console.log('[MockWebSocket] Mocking Twitch IRC connection');
          
          // Simulate successful connection after a short delay
          setTimeout(() => {
            this.readyState = MockTwitchWebSocket.OPEN;
            console.log('[MockWebSocket] Connection opened');
            
            // Dispatch open event
            const openEvent = new Event('open');
            if (this.onopen) this.onopen(openEvent);
            this.emitEvent('open', openEvent);
            
            // Send TMI welcome messages after connection
            setTimeout(() => {
              this.simulateMessage(':tmi.twitch.tv 001 justinfan12345 :Welcome, GLHF!');
              this.simulateMessage(':tmi.twitch.tv 002 justinfan12345 :Your host is tmi.twitch.tv');
              this.simulateMessage(':tmi.twitch.tv 003 justinfan12345 :This server is rather new');
              this.simulateMessage(':tmi.twitch.tv 004 justinfan12345 :-');
              this.simulateMessage(':tmi.twitch.tv 375 justinfan12345 :-');
              this.simulateMessage(':tmi.twitch.tv 372 justinfan12345 :You are in a maze of twisty passages, all alike.');
              this.simulateMessage(':tmi.twitch.tv 376 justinfan12345 :>');
              this.simulateMessage(':tmi.twitch.tv CAP * ACK :twitch.tv/tags twitch.tv/commands');
            }, 50);
          }, 100);
        } else {
          // For non-Twitch WebSockets, use original
          console.log('[MockWebSocket] Using original WebSocket for:', url);
          return new OriginalWebSocket(url, protocols) as unknown as MockTwitchWebSocket;
        }
      }
      
      private simulateMessage(data: string): void {
        console.log('[MockWebSocket] Simulating message:', data.substring(0, 50));
        const event = new MessageEvent('message', { data: data + '\r\n' });
        if (this.onmessage) this.onmessage(event);
        this.emitEvent('message', event);
      }
      
      // Named emitEvent (not dispatchEvent) so it is not overridden by the
      // public EventTarget-style dispatchEvent(event) declared below.
      private emitEvent(type: string, event: Event): void {
        const listeners = this.eventListeners.get(type);
        if (listeners) {
          listeners.forEach(listener => {
            try {
              listener(event);
            } catch (e) {
              console.error('[MockWebSocket] Error in event listener:', e);
            }
          });
        }
      }
      
      send(data: string): void {
        console.log('[MockWebSocket] Sending:', data.substring(0, 50));
        
        // Handle CAP REQ (capabilities request)
        if (data.includes('CAP REQ')) {
          setTimeout(() => {
            this.simulateMessage(':tmi.twitch.tv CAP * ACK :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
          }, 20);
        }
        
        // Handle NICK command
        if (data.includes('NICK')) {
          // Already sent welcome messages on connect
        }
        
        // Handle JOIN command
        if (data.includes('JOIN #')) {
          const match = data.match(/JOIN #(\w+)/);
          const channel = match?.[1] || 'testchannel';
          console.log('[MockWebSocket] Joining channel:', channel);
          
          setTimeout(() => {
            this.simulateMessage(`:justinfan12345!justinfan12345@justinfan12345.tmi.twitch.tv JOIN #${channel}`);
            this.simulateMessage(`:justinfan12345.tmi.twitch.tv 353 justinfan12345 = #${channel} :justinfan12345`);
            this.simulateMessage(`:justinfan12345.tmi.twitch.tv 366 justinfan12345 #${channel} :End of /NAMES list`);
            this.simulateMessage(`@emote-only=0;followers-only=-1;r9k=0;room-id=12345;slow=0;subs-only=0 :tmi.twitch.tv ROOMSTATE #${channel}`);
          }, 50);
        }
        
        // Handle PING
        if (data.includes('PING')) {
          setTimeout(() => {
            this.simulateMessage('PONG :tmi.twitch.tv');
          }, 10);
        }
        
        // Handle PONG (response to server PING)
        if (data.includes('PONG')) {
          // No response needed
        }
      }
      
      close(code?: number, reason?: string): void {
        console.log('[MockWebSocket] Closing connection');
        this.readyState = MockTwitchWebSocket.CLOSED;
        const closeEvent = new CloseEvent('close', { code: code || 1000, reason: reason || '' });
        if (this.onclose) this.onclose(closeEvent);
        this.emitEvent('close', closeEvent);
      }
      
      addEventListener(type: string, listener: EventListener): void {
        if (!this.eventListeners.has(type)) {
          this.eventListeners.set(type, new Set());
        }
        this.eventListeners.get(type)!.add(listener);
        
        // Also set the on* handler for compatibility
        if (type === 'open' && !this.onopen) this.onopen = listener as (event: Event) => void;
        if (type === 'close' && !this.onclose) this.onclose = listener as (event: CloseEvent) => void;
        if (type === 'message' && !this.onmessage) this.onmessage = listener as (event: MessageEvent) => void;
        if (type === 'error' && !this.onerror) this.onerror = listener as (event: Event) => void;
      }
      
      removeEventListener(type: string, listener: EventListener): void {
        const listeners = this.eventListeners.get(type);
        if (listeners) {
          listeners.delete(listener);
        }
      }
      
      dispatchEvent(event: Event): boolean {
        this.emitEvent(event.type, event);
        return true;
      }
    }
    
    // Replace global WebSocket
    console.log('[MockWebSocket] Replacing global WebSocket');
    (window as unknown as { WebSocket: typeof MockTwitchWebSocket }).WebSocket = MockTwitchWebSocket;
  });
}

/**
 * Connect to app by entering channel name and clicking connect
 */
async function connectToChannel(page: Page, channel: string): Promise<boolean> {
  try {
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    
    // Enable console logging for debugging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('MockWebSocket') || text.includes('tmi') || text.includes('connect') || text.includes('status')) {
        console.log(`[Browser Console] ${msg.type()}: ${text}`);
      }
    });
    
    // Log any page errors
    page.on('pageerror', error => {
      console.log(`[Page Error] ${error.message}`);
    });
    
    // First check if there's a quick reconnect button (saved session)
    const quickReconnect = page.getByRole('button', { name: /reconectar rápido/i });
    const quickReconnectVisible = await quickReconnect.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (quickReconnectVisible) {
      console.log('Found quick reconnect button, clicking...');
      await quickReconnect.click();
      
      // Wait a bit for the connection to process
      await page.waitForTimeout(3000);
      
      // Check if we're now on the dashboard
      const navDynamics = page.locator('[data-tour="nav-dynamics"]');
      const isVisible = await navDynamics.isVisible({ timeout: 1000 }).catch(() => false);
      console.log('After quick reconnect, nav-dynamics visible:', isVisible);
      
      if (isVisible) {
        console.log('Connected via quick reconnect');
        return true;
      }
      
      // Wait longer for connection with longer timeout
      const connected = await page.waitForSelector(
        '[data-tour="nav-dynamics"]',
        { state: 'visible', timeout: 30000 }
      ).catch((e) => {
        console.log('Failed to find nav-dynamics after quick reconnect:', e.message);
        return null;
      });
      
      if (connected) {
        console.log('Connected via quick reconnect (after wait)');
        return true;
      }
      console.log('Quick reconnect did not complete, trying manual connection...');
    }
    
    // Otherwise, enter channel name and connect
    const channelInput = page.locator('input[placeholder*="nombre"], input[placeholder*="canal"], input[placeholder*="Ej:"]').first();
    await channelInput.waitFor({ state: 'visible', timeout: 5000 });
    await channelInput.clear();
    await channelInput.fill(channel);
    
    // Wait a bit for the connect button to become enabled
    await page.waitForTimeout(500);
    
    // Click connect button (it should be enabled now that we have a channel name)
    const connectButton = page.getByRole('button', { name: /^conectar$/i });
    await connectButton.waitFor({ state: 'visible', timeout: 3000 });
    
    // Check if button is enabled
    const isDisabled = await connectButton.isDisabled();
    if (isDisabled) {
      console.log('Connect button is disabled, channel input may not have worked');
      // Try clicking anyway or wait
      await page.waitForTimeout(500);
    }
    
    await connectButton.click({ force: true });
    
    // Wait a bit for the connection to process
    await page.waitForTimeout(2000);
    
    // Wait for the sidebar navigation to appear (indicates connected state)
    const connected = await page.waitForSelector(
      '[data-tour="nav-dynamics"]',
      { state: 'visible', timeout: 30000 }
    ).catch((e) => {
      console.log('Failed to find nav-dynamics after manual connect:', e.message);
      return null;
    });
    
    if (connected) {
      console.log('Connected via manual connection');
      return true;
    }
    
    console.log('Manual connection did not complete');
    return false;
  } catch (e) {
    console.log('Connection failed:', e);
    return false;
  }
}

/**
 * Extended test with auth fixtures
 */
export const test = base.extend<AuthFixtures>({
  // Authenticated as streamer/owner - mocks WebSocket and connects
  authenticatedPage: async ({ page }, use) => {
    // Setup mocks BEFORE navigation - this is critical
    await mockWebSocket(page);
    await mockTwitchOAuth(page);
    await setupAuth(page, mockUser);
    
    // Also dismiss the tour by setting localStorage
    await page.addInitScript(() => {
      localStorage.setItem('tour_completed', 'true');
      localStorage.setItem('tour_dismissed', 'true');
    });
    
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to be interactive
    await page.waitForLoadState('networkidle');
    
    // Connect to channel (will use mocked WebSocket)
    const connected = await connectToChannel(page, mockUser.login);
    
    if (!connected) {
      // Take a screenshot for debugging
      console.warn('Failed to connect, tests may fail. Current URL:', page.url());
    }
    
    // Dismiss tour if it appears
    const skipTourButton = page.getByRole('button', { name: /saltar|skip/i });
    if (await skipTourButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipTourButton.click();
      await page.waitForTimeout(300);
    }
    
    await use(page);
  },

  // Authenticated as moderator
  moderatorPage: async ({ page }, use) => {
    await mockWebSocket(page);
    await mockTwitchOAuth(page);
    await setupAuth(page, mockModeratorUser);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await connectToChannel(page, mockModeratorUser.login);
    
    await use(page);
  },

  // Not authenticated
  unauthenticatedPage: async ({ page }, use) => {
    await mockTwitchOAuth(page);
    // Clear any existing auth
    await page.addInitScript(() => {
      localStorage.removeItem('twitch_auth');
      localStorage.removeItem('twitch_user');
      localStorage.removeItem('twitch_channel');
      localStorage.removeItem('twitch_token');
      localStorage.removeItem('twitch_token_expires');
      localStorage.removeItem('twitch_user_id');
      localStorage.removeItem('twitch_user_name');
    });
    await use(page);
  },
});

export { expect } from './base.fixture';
