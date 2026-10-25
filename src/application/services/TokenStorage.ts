/**
 * TokenStorage - Encrypted storage for platform OAuth tokens
 *
 * Tokens are encrypted with AES-GCM before being written to localStorage.
 *
 * SECURITY (storage format v2):
 * - The AES key is generated randomly per browser profile with Web Crypto,
 *   marked NON-EXTRACTABLE and kept in IndexedDB. Scripts can use it but can
 *   never read the raw key, and a copy of localStorage alone is not enough to
 *   decrypt the tokens.
 * - Every encryption uses its own random 12-byte IV (AES-GCM must never reuse
 *   an IV with the same key).
 * - Decryption failures throw; corrupted entries are removed by retrieve().
 *
 * LIMITS: this protects tokens at rest (backups, copied profiles, other
 * origins). It cannot protect against code running in this page (XSS), which
 * can call decrypt like the app does. Keep the CSP strict and token lifetimes
 * short.
 *
 * Fallbacks:
 * - IndexedDB unavailable (some private modes, tests): a key derived from a
 *   constant is used ('legacy'). That is obfuscation, not real encryption.
 * - Web Crypto unavailable: tokens are stored base64-encoded ('plain').
 *
 * Format v1 (single IV for both tokens, constant-derived key) is still read
 * and transparently rewritten as v2.
 *
 * @module src/application/services/TokenStorage
 * @requirements 4.1, 4.2 - Persistent and encrypted credential storage
 */

import type { Platform } from '../../../types/platform';

// ============================================
// Types
// ============================================

/**
 * Platform credentials stored in TokenStorage
 */
export interface PlatformCredentials {
  platform: Platform;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  username: string;
  userId: string;
  scopes: string[];
}

/** Which key encrypted an entry */
type KeyId = 'idb' | 'legacy' | 'plain';

interface EncryptedField {
  data: string;
  iv: string;
}

/**
 * Internal storage format for encrypted tokens.
 * v2 entries have `keyId` + per-field IVs; v1 entries have a shared `iv`.
 */
interface StoredToken {
  // v2
  keyId?: KeyId;
  accessToken?: EncryptedField;
  refreshToken?: EncryptedField;
  // v1 (legacy, read-only)
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  iv?: string;
  // common
  expiresAt?: number;
  username: string;
  userId: string;
  scopes: string[];
  storedAt: number;
}

interface StoredPlatformTokens {
  version: number;
  tokens: Partial<Record<Platform, StoredToken>>;
}

// ============================================
// Constants
// ============================================

const STORAGE_KEY = 'streamcrowd_platform_tokens';
const STORAGE_VERSION = 2;
const SUPPORTED_VERSIONS = [1, 2];

// Legacy (v1) key derivation inputs - kept only to read old data / fallback
const APP_IDENTIFIER = 'streamcrowd_2024_secure';
const LEGACY_SALT = 'streamcrowd_salt_v1';

const KEYSTORE_DB = 'streamcrowd_keystore';
const KEYSTORE_STORE = 'keys';
const KEYSTORE_KEY_ID = 'platform-tokens-aes-gcm';

// ============================================
// Key management helpers
// ============================================

function hasWebCrypto(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

function openKeystore(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const request = indexedDB.open(KEYSTORE_DB, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(KEYSTORE_STORE)) {
          request.result.createObjectStore(KEYSTORE_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<CryptoKey | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYSTORE_STORE, 'readonly');
    const req = tx.objectStore(KEYSTORE_STORE).get(key);
    req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
    req.onerror = () => reject(req.error);
  });
}

/** Uses add() (not put) so two tabs racing cannot overwrite each other's key */
function idbAdd(db: IDBDatabase, key: string, value: CryptoKey): Promise<boolean> {
  return new Promise(resolve => {
    const tx = db.transaction(KEYSTORE_STORE, 'readwrite');
    const req = tx.objectStore(KEYSTORE_STORE).add(value, key);
    req.onsuccess = () => resolve(true);
    req.onerror = event => {
      event.preventDefault(); // ConstraintError: another tab stored a key first
      resolve(false);
    };
  });
}

async function loadOrCreateDeviceKey(): Promise<CryptoKey | null> {
  if (!hasWebCrypto()) return null;
  const db = await openKeystore();
  if (!db) return null;

  try {
    const existing = await idbGet(db, KEYSTORE_KEY_ID);
    if (existing) return existing;

    const generated = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable
      ['encrypt', 'decrypt']
    );
    const added = await idbAdd(db, KEYSTORE_KEY_ID, generated);
    if (added) return generated;

    // Lost the race: use the key the other tab stored
    return (await idbGet(db, KEYSTORE_KEY_ID)) ?? null;
  } catch (err) {
    console.warn('[TokenStorage] IndexedDB keystore unavailable:', err);
    return null;
  } finally {
    db.close();
  }
}

async function deriveLegacyKey(): Promise<CryptoKey | null> {
  if (!hasWebCrypto()) return null;
  try {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(APP_IDENTIFIER),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: encoder.encode(LEGACY_SALT), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function utf8ToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

function base64ToUtf8(base64: string): string {
  return new TextDecoder().decode(base64ToBytes(base64));
}

// ============================================
// TokenStorage Class
// ============================================

class TokenStorageImpl {
  private deviceKey: CryptoKey | null = null;
  private legacyKey: CryptoKey | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the encryption keys. Called automatically by every async method.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = this.doInitialize();
    }
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    this.deviceKey = await loadOrCreateDeviceKey();
    this.legacyKey = await deriveLegacyKey();
    if (!this.deviceKey) {
      console.warn('[TokenStorage] No device key (IndexedDB/Web Crypto unavailable); using fallback key');
    }
    this.initialized = true;
  }

  /**
   * Store credentials for a platform
   */
  async store(platform: Platform, credentials: PlatformCredentials): Promise<void> {
    await this.initialize();

    const { keyId, key } = this.currentKey();
    const storedToken: StoredToken = {
      keyId,
      accessToken: await this.encrypt(credentials.accessToken, key),
      refreshToken: credentials.refreshToken ? await this.encrypt(credentials.refreshToken, key) : undefined,
      expiresAt: credentials.expiresAt,
      username: credentials.username,
      userId: credentials.userId,
      scopes: credentials.scopes,
      storedAt: Date.now(),
    };

    const storage = this.getStorage();
    storage.version = STORAGE_VERSION;
    storage.tokens[platform] = storedToken;
    this.saveStorage(storage);
  }

  /**
   * Retrieve credentials for a platform. Entries that cannot be decrypted are
   * removed and null is returned (the user has to log in again).
   */
  async retrieve(platform: Platform): Promise<PlatformCredentials | null> {
    await this.initialize();

    const storedToken = this.getStorage().tokens[platform];
    if (!storedToken) return null;

    try {
      const isLegacyEntry = !storedToken.keyId;
      const { accessToken, refreshToken } = isLegacyEntry
        ? await this.decryptV1(storedToken)
        : await this.decryptV2(storedToken);

      const credentials: PlatformCredentials = {
        platform,
        accessToken,
        refreshToken,
        expiresAt: storedToken.expiresAt,
        username: storedToken.username,
        userId: storedToken.userId,
        scopes: storedToken.scopes,
      };

      // Upgrade old entries (v1, or fallback key now that a device key exists)
      if (isLegacyEntry || (storedToken.keyId !== 'idb' && this.deviceKey)) {
        await this.store(platform, credentials);
      }

      return credentials;
    } catch (err) {
      console.error(`[TokenStorage] Failed to decrypt credentials for ${platform}:`, err);
      await this.remove(platform);
      return null;
    }
  }

  /**
   * Remove credentials for a platform
   */
  async remove(platform: Platform): Promise<void> {
    await this.initialize();
    const storage = this.getStorage();
    delete storage.tokens[platform];
    this.saveStorage(storage);
  }

  /**
   * Check if credentials exist for a platform (synchronous)
   */
  has(platform: Platform): boolean {
    return platform in this.getStorage().tokens;
  }

  /**
   * Get all platforms with stored credentials
   */
  getStoredPlatforms(): Platform[] {
    return Object.keys(this.getStorage().tokens) as Platform[];
  }

  /**
   * Clear all stored credentials
   */
  async clearAll(): Promise<void> {
    await this.initialize();
    this.saveStorage({ version: STORAGE_VERSION, tokens: {} });
  }

  // ============================================
  // Private Methods
  // ============================================

  private currentKey(): { keyId: KeyId; key: CryptoKey | null } {
    if (this.deviceKey) return { keyId: 'idb', key: this.deviceKey };
    if (this.legacyKey) return { keyId: 'legacy', key: this.legacyKey };
    return { keyId: 'plain', key: null };
  }

  private keyFor(keyId: KeyId): CryptoKey | null {
    if (keyId === 'plain') return null;
    const key = keyId === 'idb' ? this.deviceKey : this.legacyKey;
    if (!key) throw new Error(`Encryption key "${keyId}" is not available`);
    return key;
  }

  private async decryptV2(token: StoredToken): Promise<{ accessToken: string; refreshToken?: string }> {
    if (!token.accessToken || !token.keyId) throw new Error('Malformed token entry');
    const key = this.keyFor(token.keyId);
    return {
      accessToken: await this.decrypt(token.accessToken, key),
      refreshToken: token.refreshToken ? await this.decrypt(token.refreshToken, key) : undefined,
    };
  }

  /** v1: shared IV, constant-derived key, silent base64 fallback on write */
  private async decryptV1(token: StoredToken): Promise<{ accessToken: string; refreshToken?: string }> {
    if (!token.encryptedAccessToken || !token.iv) throw new Error('Malformed legacy token entry');
    const decryptLegacy = async (data: string): Promise<string> => {
      if (this.legacyKey) {
        try {
          return await this.decrypt({ data, iv: token.iv! }, this.legacyKey);
        } catch {
          // v1 wrote plain base64 when encryption failed
        }
      }
      // Only accept the base64 fallback if it decodes to printable ASCII
      // (OAuth tokens); otherwise it is undecryptable ciphertext.
      const decoded = base64ToUtf8Legacy(data);
      if (!/^[\x20-\x7e]+$/.test(decoded)) throw new Error('Legacy token could not be decrypted');
      return decoded;
    };
    return {
      accessToken: await decryptLegacy(token.encryptedAccessToken),
      refreshToken: token.encryptedRefreshToken ? await decryptLegacy(token.encryptedRefreshToken) : undefined,
    };
  }

  private async encrypt(plaintext: string, key: CryptoKey | null): Promise<EncryptedField> {
    if (!key) {
      return { data: utf8ToBase64(plaintext), iv: '' };
    }
    const iv = crypto.getRandomValues(new Uint8Array(12)); // fresh IV per encryption
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      new TextEncoder().encode(plaintext) as BufferSource
    );
    return { data: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
  }

  /** Throws on failure (wrong key, tampered data) */
  private async decrypt(field: EncryptedField, key: CryptoKey | null): Promise<string> {
    if (!key) {
      return base64ToUtf8(field.data);
    }
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(field.iv) as BufferSource },
      key,
      base64ToBytes(field.data) as BufferSource
    );
    return new TextDecoder().decode(decrypted);
  }

  private getStorage(): StoredPlatformTokens {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: STORAGE_VERSION, tokens: {} };

      const parsed = JSON.parse(raw) as StoredPlatformTokens;
      if (!parsed || typeof parsed !== 'object' || !SUPPORTED_VERSIONS.includes(parsed.version) || !parsed.tokens) {
        return { version: STORAGE_VERSION, tokens: {} };
      }
      return parsed;
    } catch {
      return { version: STORAGE_VERSION, tokens: {} };
    }
  }

  private saveStorage(storage: StoredPlatformTokens): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    } catch (err) {
      console.error('[TokenStorage] Failed to save storage:', err);
    }
  }
}

/** v1 used btoa(text) directly (Latin-1); tokens are ASCII so atob is enough */
function base64ToUtf8Legacy(base64: string): string {
  return atob(base64);
}

// ============================================
// Singleton Export
// ============================================

export const TokenStorage = new TokenStorageImpl();
