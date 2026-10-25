/**
 * Security tests for firebase-rules.json against the Realtime Database emulator.
 *
 * Run with:  npm run test:rules   (needs Java 11+; downloads firebase-tools via npx)
 *
 * Uses only Node built-ins and the emulator REST API, so it does not depend
 * on the app's Firebase SDK version. Identities are unsigned JWTs, which the
 * emulator accepts (same approach as @firebase/rules-unit-testing):
 *   - "streamer"/"mod"/"attacker": custom-token users with the twitchId claim
 *     minted by api/firebase-token.ts in production
 *   - "anon": anonymous Firebase user (no twitchId)
 *   - "nobody": no auth at all (an OBS browser source)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000';
const PROJECT = process.env.GCLOUD_PROJECT || 'demo-streamcrowd';
const NS = `${PROJECT}-rules-test`;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// ---------- auth helpers ----------
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

function unsignedToken(uid, { provider = 'custom', claims = {} } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT,
    iat: now,
    exp: now + 3600,
    auth_time: now,
    sub: uid,
    user_id: uid,
    firebase: { sign_in_provider: provider, identities: {} },
    ...claims,
  };
  return `${b64url({ alg: 'none', kid: 'fakekid', typ: 'JWT' })}.${b64url(payload)}.`;
}

const STREAMER = '111';
const MOD = '222';
const ATTACKER = '333';
const twitchUser = (id) => unsignedToken(`twitch:${id}`, { claims: { twitchId: id, twitchLogin: `user${id}` } });

const who = {
  streamer: twitchUser(STREAMER),
  mod: twitchUser(MOD),
  attacker: twitchUser(ATTACKER),
  anon: unsignedToken('anon-uid-1', { provider: 'anonymous' }),
  nobody: null,
  admin: 'owner',
};

// ---------- REST helpers ----------
async function request(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  let url = `http://${HOST}/${path}.json?ns=${NS}`;
  // Firebase ID tokens go in ?auth= (REST API). A Bearer header is treated as
  // an OAuth/admin credential by the emulator and bypasses the rules.
  if (token === 'owner') headers.Authorization = 'Bearer owner';
  else if (token) url += `&auth=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  await res.text();
  return res.status;
}
const read = (as, path) => request('GET', path, who[as]);
const write = (as, path, value) => request('PUT', path, who[as], value);
const patch = (as, path, value) => request('PATCH', path, who[as], value);
const del = (as, path) => request('DELETE', path, who[as]);

const results = [];
async function allow(name, op) {
  const status = await op();
  results.push([status >= 200 && status < 300, `ALLOW ${name}`, status]);
}
async function deny(name, op) {
  const status = await op();
  results.push([status === 401 || status === 403, `DENY  ${name}`, status]);
}

// ---------- setup ----------
// RULES_FILE lets you check another rules file (e.g. an older version)
const rules = readFileSync(process.env.RULES_FILE ? resolve(process.env.RULES_FILE) : resolve(ROOT, 'firebase-rules.json'), 'utf8');
const rulesStatus = await fetch(`http://${HOST}/.settings/rules.json?ns=${NS}`, {
  method: 'PUT',
  headers: { Authorization: 'Bearer owner' },
  body: rules,
}).then(r => r.status);
if (rulesStatus !== 200) {
  console.error(`Could not load rules into the emulator (HTTP ${rulesStatus}). Is the database emulator running on ${HOST}?`);
  process.exit(2);
}
await del('admin', '');

// ---------- broadcaster_tokens ----------
const token = { broadcasterId: STREAMER, broadcasterLogin: 'streamer', broadcasterName: 'Streamer', accessToken: 'enc', scopes: ['a'], storedAt: 1 };
const T = `broadcaster_tokens/${STREAMER}`;
await allow('streamer stores own token', () => write('streamer', T, token));
await deny('attacker overwrites token', () => write('attacker', T, { ...token, accessToken: 'evil' }));
await deny('anonymous overwrites token', () => write('anon', T, token));
await deny('attacker deletes token', () => del('attacker', T));
await deny('token stored under a different broadcasterId', () => write('attacker', `broadcaster_tokens/${ATTACKER}`, token));
await deny('attacker reads token', () => read('attacker', T));
await deny('anonymous reads token', () => read('anon', T));
await deny('OBS (no auth) reads token', () => read('nobody', T));
await deny('mod reads token before being listed', () => read('mod', T));
await allow('streamer reads own token', () => read('streamer', T));
await allow('streamer updates scopes', () => write('streamer', `${T}/scopes`, ['a', 'b']));

// ---------- channel_moderators ----------
await deny('attacker adds self as moderator', () => write('attacker', `channel_moderators/${STREAMER}/${ATTACKER}`, true));
await allow('streamer publishes moderators', () => write('streamer', `channel_moderators/${STREAMER}`, { [MOD]: true }));
await deny('moderator list with non-numeric id', () => write('streamer', `channel_moderators/${STREAMER}`, { abc: true }));
await allow('listed mod reads token', () => read('mod', T));
await deny('mod writes token', () => write('mod', `${T}/scopes`, ['x']));
await deny('attacker still cannot read token', () => read('attacker', T));
await deny('mod reads moderator list', () => read('mod', `channel_moderators/${STREAMER}`));
await allow('streamer deletes own token', () => del('streamer', T));

// ---------- platform_broadcaster_tokens ----------
const yt = { platform: 'youtube', broadcasterId: 'UCabc', accessToken: 'enc', storedAt: 1, ownerTwitchId: STREAMER };
const Y = 'platform_broadcaster_tokens/youtube/UCabc';
await allow('streamer stores youtube token', () => write('streamer', Y, yt));
await deny('attacker overwrites youtube token', () => write('attacker', Y, { ...yt, ownerTwitchId: ATTACKER }));
await deny('attacker forges ownerTwitchId', () => write('attacker', 'platform_broadcaster_tokens/youtube/UCnew', yt));
await deny('anonymous stores platform token', () => write('anon', 'platform_broadcaster_tokens/youtube/UCx', yt));
await allow('listed mod reads youtube token', () => read('mod', Y));
await deny('attacker reads youtube token', () => read('attacker', Y));
await deny('twitch platform entry for someone else', () =>
  write('attacker', `platform_broadcaster_tokens/twitch/${STREAMER}`, { ...yt, platform: 'twitch', broadcasterId: STREAMER, ownerTwitchId: ATTACKER }));
await allow('streamer stores own twitch platform token', () =>
  write('streamer', `platform_broadcaster_tokens/twitch/${STREAMER}`, { ...yt, platform: 'twitch', broadcasterId: STREAMER }));

// ---------- streamers ----------
const profile = { twitchId: STREAMER, displayName: 'Streamer', channel: 'streamer', updatedAt: 1 };
const P = `streamers/${STREAMER}`;
await allow('streamer writes profile', () => write('streamer', `${P}/profile`, profile));
await deny('attacker overwrites profile', () => write('attacker', `${P}/profile`, profile));
await deny('anonymous overwrites profile', () => write('anon', `${P}/profile`, profile));
await allow('anyone reads profile', () => read('nobody', `${P}/profile`));
const sorteo = { id: 's1', name: 'Sorteo', isActive: true, createdAt: 1, isPublic: true };
await allow('streamer saves giveaway', () => write('streamer', `${P}/sorteos/s1`, sorteo));
await allow('streamer updates giveaway partially', () => patch('streamer', `${P}/sorteos/s1`, { isActive: false, updatedAt: 2 }));
await deny('attacker edits giveaway', () => patch('attacker', `${P}/sorteos/s1`, { winner: 'attacker' }));
await deny('attacker deletes giveaway', () => del('attacker', `${P}/sorteos/s1`));
await allow('anyone reads giveaways', () => read('nobody', `${P}/sorteos`));
await allow('streamer deletes giveaway', () => del('streamer', `${P}/sorteos/s1`));

// ---------- overlays ----------
await allow('anonymous writes own overlay', () => write('anon', 'overlays/anon-uid-1/poll', { q: 1 }));
await allow('streamer writes own overlay', () => write('streamer', `overlays/twitch:${STREAMER}/game`, { type: 'x' }));
await deny('attacker writes streamer overlay', () => write('attacker', `overlays/twitch:${STREAMER}/game`, { type: 'evil' }));
await allow('OBS without login reads overlay', () => read('nobody', `overlays/twitch:${STREAMER}/game`));

// ---------- default deny ----------
await deny('unknown node', () => write('streamer', 'random/x', 1));
await deny('other user private data', () => read('attacker', `users/twitch:${STREAMER}`));

// ---------- report ----------
let failed = 0;
for (const [ok, name, status] of results) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` (HTTP ${status})`}`);
}
console.log(`\n${results.length - failed}/${results.length} rule checks passed`);
process.exit(failed ? 1 : 0);
