/**
 * POST /api/firebase-token
 *
 * Exchanges a Twitch user access token for a Firebase custom token, so the
 * Realtime Database rules can trust who the user is (auth.token.twitchId).
 *
 * Without this, every client signs in anonymously and the rules cannot tell a
 * streamer from anyone else: any visitor could overwrite another streamer's
 * stored broadcaster token, profile or giveaways.
 *
 * Flow:
 *   1. Client sends { accessToken } (its own Twitch token).
 *   2. We call https://id.twitch.tv/oauth2/validate. Twitch tells us the
 *      user_id and the client_id the token was issued to.
 *   3. If the client_id is one of ours, we mint a Firebase custom token with
 *      uid "twitch:<user_id>" and claims { twitchId, twitchLogin }.
 *
 * Required environment variables (Vercel → Settings → Environment Variables):
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *     (from a Firebase service account JSON; keep "\n" escapes in the key)
 *   TWITCH_CLIENT_ID (or VITE_TWITCH_CLIENT_ID)
 * Optional:
 *   TWITCH_ALLOWED_CLIENT_IDS  comma-separated extra client ids to accept
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface TwitchValidation {
  clientId: string;
  userId: string;
  login: string;
}

export interface FirebaseTokenDeps {
  validateTwitchToken: (accessToken: string) => Promise<TwitchValidation | null>;
  createCustomToken: (uid: string, claims: Record<string, string>) => Promise<string>;
  allowedClientIds: string[];
}

const MAX_BODY_BYTES = 4096;
const TOKEN_PATTERN = /^[a-z0-9]{20,64}$/i;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

/** Request handler with injectable dependencies (kept pure for testing). */
export async function handleFirebaseTokenRequest(request: Request, deps: FirebaseTokenDeps): Promise<Response> {
  if (request.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  if (deps.allowedClientIds.length === 0) {
    return json(503, { error: 'not_configured' });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json(413, { error: 'payload_too_large' });
  }

  let accessToken: unknown;
  try {
    accessToken = (JSON.parse(raw) as { accessToken?: unknown }).accessToken;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  if (typeof accessToken !== 'string') {
    return json(400, { error: 'missing_access_token' });
  }
  const token = accessToken.replace(/^oauth:/i, '').trim();
  if (!TOKEN_PATTERN.test(token)) {
    return json(400, { error: 'invalid_access_token' });
  }

  let validation: TwitchValidation | null;
  try {
    validation = await deps.validateTwitchToken(token);
  } catch {
    return json(502, { error: 'twitch_unavailable' });
  }

  if (!validation || !validation.userId) {
    return json(401, { error: 'invalid_twitch_token' });
  }

  // Only accept tokens issued to our own Twitch application. A token from any
  // other app would let whoever controls that app impersonate its users here.
  if (!deps.allowedClientIds.includes(validation.clientId)) {
    return json(403, { error: 'foreign_client_id' });
  }

  try {
    const firebaseToken = await deps.createCustomToken(`twitch:${validation.userId}`, {
      twitchId: validation.userId,
      twitchLogin: validation.login.toLowerCase(),
    });
    return json(200, { firebaseToken, twitchId: validation.userId, twitchLogin: validation.login });
  } catch {
    return json(500, { error: 'token_creation_failed' });
  }
}

// ============================================
// Production wiring
// ============================================

async function validateWithTwitch(accessToken: string): Promise<TwitchValidation | null> {
  const response = await fetch('https://id.twitch.tv/oauth2/validate', {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Twitch validate HTTP ${response.status}`);
  const data = (await response.json()) as { client_id?: string; user_id?: string; login?: string };
  if (!data.user_id || !data.client_id) return null;
  return { clientId: data.client_id, userId: data.user_id, login: data.login ?? '' };
}

function getAllowedClientIds(): string[] {
  const ids = [
    process.env.TWITCH_CLIENT_ID,
    process.env.VITE_TWITCH_CLIENT_ID,
    ...(process.env.TWITCH_ALLOWED_CLIENT_IDS ?? '').split(','),
  ]
    .map(id => id?.trim())
    .filter((id): id is string => !!id);
  return Array.from(new Set(ids));
}

function getAdminAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) return null;

  const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getAuth(app);
}

export async function POST(request: Request): Promise<Response> {
  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return json(503, { error: 'not_configured' });
  }

  return handleFirebaseTokenRequest(request, {
    validateTwitchToken: validateWithTwitch,
    createCustomToken: (uid, claims) => adminAuth.createCustomToken(uid, claims),
    allowedClientIds: getAllowedClientIds(),
  });
}

export function GET(): Response {
  return json(405, { error: 'method_not_allowed' });
}
