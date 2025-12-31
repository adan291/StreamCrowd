/**
 * Twitch OAuth Service
 * 
 * Handles OAuth Implicit Flow for Twitch authentication via popup.
 * This is a browser-specific utility for handling Twitch authentication.
 * 
 * @module infrastructure/auth/TwitchOAuth
 */

// You need to register your app at https://dev.twitch.tv/console/apps
// Set VITE_TWITCH_CLIENT_ID in .env.local or Vercel environment variables
const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5';

// Scopes needed for full functionality
const OAUTH_SCOPES = [
  'chat:read',
  'chat:edit',
  'channel:read:subscriptions',
  'moderator:read:chatters',
  'moderator:read:followers',
  'channel:read:vips',
  'moderation:read',
  'bits:read',
  // Moderation action scopes
  'moderator:manage:banned_users',
  'moderator:manage:chat_messages',
  'moderator:manage:chat_settings',
  'moderator:manage:announcements',
  'channel:manage:vips',
  // Twitch Predictions and Channel Points scopes
  'channel:manage:predictions',
  'channel:read:predictions',
  'channel:manage:redemptions',
  'channel:read:redemptions',
].join(' ');

// Callback path - can be root or specific path, must match Twitch Dev Console
const CALLBACK_PATH = '/';

// ============ TYPES ============

export interface TwitchOAuthResult {
  accessToken: string;
  username: string;
  userId: string;
  expiresIn?: number;
  scopes: string[];
}

export interface TwitchOAuthError {
  error: string;
  errorDescription: string;
}

// ============ HELPER FUNCTIONS ============

/**
 * Get the redirect URI based on current location
 */
function getRedirectUri(): string {
  // Just use origin without trailing slash - must match exactly what's in Twitch Dev Console
  return window.location.origin;
}

/**
 * Generate a random state string for CSRF protection
 */
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build the Twitch OAuth authorization URL
 */
function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'token',
    scope: OAUTH_SCOPES,
    state: state,
    force_verify: 'false', // Don't force re-auth if already authorized
  });
  
  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

/**
 * Validate the token and get user info from Twitch
 */
async function validateToken(accessToken: string): Promise<{ username: string; userId: string; expiresIn: number; scopes: string[] }> {
  const response = await fetch('https://id.twitch.tv/oauth2/validate', {
    headers: {
      'Authorization': `OAuth ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Token validation failed');
  }
  
  const data = await response.json();
  return {
    username: data.login,
    userId: data.user_id,
    expiresIn: data.expires_in,
    scopes: data.scopes || [],
  };
}

// ============ PUBLIC API ============

/**
 * Open OAuth popup and handle the authentication flow
 * @returns Promise that resolves with the OAuth result or rejects with an error
 */
export function openTwitchOAuthPopup(): Promise<TwitchOAuthResult> {
  return new Promise((resolve, reject) => {
    // Validate Client ID is configured
    if (!TWITCH_CLIENT_ID) {
      reject({ 
        error: 'missing_client_id', 
        errorDescription: 'Twitch Client ID not configured. Set VITE_TWITCH_CLIENT_ID in environment variables.' 
      });
      return;
    }

    const state = generateState();
    const authUrl = buildAuthUrl(state);
    
    // Store state for verification
    sessionStorage.setItem('twitch_oauth_state', state);
    
    // Calculate popup position (centered)
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    // Open popup
    const popup = window.open(
      authUrl,
      'TwitchOAuth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`
    );
    
    if (!popup) {
      reject({ error: 'popup_blocked', errorDescription: 'Popup was blocked by the browser' });
      return;
    }
    
    // Listen for messages from the popup
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin
      if (event.origin !== window.location.origin) return;
      
      const { type, accessToken, error, errorDescription, state: returnedState } = event.data;
      
      if (type !== 'twitch_oauth_callback') return;
      
      // Clean up
      window.removeEventListener('message', handleMessage);
      clearInterval(pollTimer);
      sessionStorage.removeItem('twitch_oauth_state');
      
      if (error) {
        reject({ error, errorDescription });
        return;
      }
      
      // Verify state to prevent CSRF
      const savedState = sessionStorage.getItem('twitch_oauth_state');
      if (returnedState !== savedState && savedState !== null) {
        reject({ error: 'state_mismatch', errorDescription: 'State verification failed' });
        return;
      }
      
      try {
        // Validate token and get user info
        const userInfo = await validateToken(accessToken);
        resolve({
          accessToken,
          username: userInfo.username,
          userId: userInfo.userId,
          expiresIn: userInfo.expiresIn,
          scopes: userInfo.scopes,
        });
      } catch (err) {
        reject({ error: 'validation_failed', errorDescription: 'Failed to validate token' });
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Poll to check if popup was closed without completing auth
    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer);
        window.removeEventListener('message', handleMessage);
        sessionStorage.removeItem('twitch_oauth_state');
        reject({ error: 'popup_closed', errorDescription: 'Authentication was cancelled' });
      }
    }, 500);
  });
}

/**
 * Handle the OAuth callback (called from the callback page)
 * Parses the URL fragment and sends the result to the opener window
 */
export function handleOAuthCallback(): void {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  
  const accessToken = params.get('access_token');
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  const state = params.get('state');
  
  // Send result to opener window
  if (window.opener) {
    if (accessToken) {
      window.opener.postMessage({
        type: 'twitch_oauth_callback',
        accessToken,
        state,
      }, window.location.origin);
    } else {
      window.opener.postMessage({
        type: 'twitch_oauth_callback',
        error: error || 'unknown_error',
        errorDescription: errorDescription || 'Authentication failed',
        state,
      }, window.location.origin);
    }
    
    // Close popup after a brief delay to ensure message is sent
    setTimeout(() => window.close(), 100);
  }
}

/**
 * Check if current page is the OAuth callback
 */
export function isOAuthCallback(): boolean {
  return window.location.pathname === CALLBACK_PATH && window.location.hash.includes('access_token');
}

/**
 * Revoke a Twitch OAuth token
 */
export async function revokeTwitchToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        token: accessToken,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
