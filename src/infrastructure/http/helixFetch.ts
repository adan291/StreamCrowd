/**
 * helixFetch - drop-in replacement for fetch() for Twitch Helix calls.
 *
 * - 429 Too Many Requests: waits until the `Ratelimit-Reset` header (epoch
 *   seconds) and retries, at most MAX_RETRIES times. Waits are capped so a
 *   broken header cannot freeze the UI.
 * - 401 Unauthorized with the logged-in user's token (see setHelixSessionToken):
 *   Twitch also answers 401 for missing scopes or "broadcaster_id must match",
 *   so the token is checked with /oauth2/validate before the app-wide
 *   "auth expired" event is emitted. 401s with other tokens (e.g. the
 *   broadcaster token used by moderators) never log the user out.
 *
 * The Response is always returned unchanged, so existing error handling at
 * each call site keeps working.
 */

const MAX_RETRIES = 2;
const MAX_WAIT_MS = 10_000;
const VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate';
const VALIDATE_COOLDOWN_MS = 60_000;

type ExpiredListener = () => void;

let sessionToken: string | null = null;
let expiredNotified = false;
let lastValidateAt = 0;
const listeners = new Set<ExpiredListener>();

const normalizeToken = (token: string) => token.replace(/^oauth:/i, '').replace(/^Bearer\s+/i, '').trim();

/** Registers the logged-in user's Twitch token (null on logout). */
export function setHelixSessionToken(token: string | null): void {
  const next = token ? normalizeToken(token) : null;
  if (next !== sessionToken) {
    sessionToken = next;
    expiredNotified = false;
    lastValidateAt = 0;
  }
}

/** Called once when the session token is confirmed expired/revoked. */
export function onTwitchAuthExpired(listener: ExpiredListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getAuthToken(init?: RequestInit): string | null {
  if (!init?.headers) return null;
  const headers = new Headers(init.headers);
  const auth = headers.get('Authorization');
  return auth ? normalizeToken(auth) : null;
}

/**
 * Milliseconds to wait before retrying a 429, or null when the response does
 * not say when the bucket refills (then the caller gets the 429 right away;
 * Twitch always sends Ratelimit-Reset, so this only happens with mocks/proxies).
 */
function waitMsFor(response: Response, now = Date.now()): number | null {
  const header = typeof response.headers?.get === 'function' ? response.headers.get('Ratelimit-Reset') : null;
  const reset = Number(header);
  if (!header || !Number.isFinite(reset) || reset <= 0) return null;
  return Math.min(MAX_WAIT_MS, Math.max(0, reset * 1000 - now) + 250);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function checkSessionExpired(token: string): Promise<void> {
  const now = Date.now();
  if (expiredNotified || now - lastValidateAt < VALIDATE_COOLDOWN_MS) return;
  lastValidateAt = now;
  try {
    const response = await fetch(VALIDATE_URL, { headers: { Authorization: `OAuth ${token}` } });
    if (response.status === 401 && token === sessionToken && !expiredNotified) {
      expiredNotified = true;
      listeners.forEach(listener => {
        try { listener(); } catch (err) { console.error('[helixFetch] listener error', err); }
      });
    }
  } catch {
    // Network problem: not an auth problem
  }
}

export async function helixFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let response = await fetch(input, init);

  for (let attempt = 0; response?.status === 429 && attempt < MAX_RETRIES; attempt++) {
    const wait = waitMsFor(response);
    if (wait === null) break;
    await sleep(wait);
    response = await fetch(input, init);
  }

  if (response?.status === 401) {
    const token = getAuthToken(init);
    if (token && sessionToken && token === sessionToken) {
      void checkSessionExpired(token);
    }
  }

  return response;
}

/** Test helper */
export function __resetHelixFetchState(): void {
  sessionToken = null;
  expiredNotified = false;
  lastValidateAt = 0;
  listeners.clear();
}
