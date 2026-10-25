/**
 * BroadcasterTokenService - Gestión de tokens de broadcaster para moderadores
 * 
 * Este servicio permite que los moderadores ejecuten acciones que requieren
 * el token del broadcaster (predicciones, polls, raids, etc.)
 * 
 * FLUJO:
 * 1. El streamer autoriza la app → su token se guarda en Firebase
 * 2. Los moderadores se logean con sus cuentas
 * 3. Cuando un mod selecciona un canal donde modera, puede usar el token del broadcaster
 *    (si el broadcaster lo ha autorizado previamente)
 * 
 * SEGURIDAD:
 * - Los tokens se guardan en Firebase Realtime Database
 * - Firebase Auth provides anonymous authentication for secure access
 * - Solo se permite usar el token si el usuario es moderador verificado del canal
 * - Los tokens se encriptan con AES-GCM antes de guardar
 * 
 * @module src/application/services/BroadcasterTokenService
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, off, Database } from 'firebase/database';
import { FirebaseAuthService } from '../../infrastructure/auth/FirebaseAuthService';
import { helixFetch } from '../../infrastructure/http/helixFetch';

const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5';

// Firebase config (same as FirebaseSyncAdapter)
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const FIREBASE_PATH = 'broadcaster_tokens';
/** channel_moderators/<broadcasterId>/<modUserId> = true (written by the broadcaster) */
const MODERATORS_PATH = 'channel_moderators';

// ============================================
// Types
// ============================================

/**
 * Token almacenado de un broadcaster
 */
export interface StoredBroadcasterToken {
  /** ID del broadcaster */
  broadcasterId: string;
  /** Login del broadcaster */
  broadcasterLogin: string;
  /** Display name del broadcaster */
  broadcasterName: string;
  /** Access token OAuth (encriptado en Firebase) */
  accessToken: string;
  /** Scopes autorizados */
  scopes: string[];
  /** Timestamp de cuando se guardó */
  storedAt: number;
  /** Timestamp de expiración (si se conoce) */
  expiresAt?: number;
}

/**
 * Resultado de verificación de token
 */
export interface TokenVerificationResult {
  valid: boolean;
  expiresIn?: number;
  scopes?: string[];
  error?: string;
}

/**
 * Scopes requeridos para acciones de broadcaster
 */
export const BROADCASTER_SCOPES = {
  predictions: 'channel:manage:predictions',
  polls: 'channel:manage:polls',
  raids: 'channel:manage:raids',
  broadcast: 'channel:manage:broadcast',
  // Scopes que también pueden usar moderadores
  moderator: [
    'moderator:manage:chat_settings',
    'moderator:manage:announcements',
    'moderator:manage:shoutouts',
    'moderator:manage:chat_messages',
    'moderator:manage:banned_users',
  ],
} as const;

/**
 * Todos los scopes que un broadcaster debería autorizar
 */
export const ALL_BROADCASTER_SCOPES = [
  // Broadcaster-only
  BROADCASTER_SCOPES.predictions,
  BROADCASTER_SCOPES.polls,
  BROADCASTER_SCOPES.raids,
  BROADCASTER_SCOPES.broadcast,
  // Moderator scopes (broadcaster también los necesita)
  ...BROADCASTER_SCOPES.moderator,
  // Lectura
  'channel:read:subscriptions',
  'channel:read:vips',
  'bits:read',
  'moderation:read',
  'moderator:read:chatters',
  'moderator:read:followers',
  // Chat
  'chat:read',
  'chat:edit',
  // Clips
  'clips:edit',
];

// ============================================
// AES-GCM Encryption for Firebase tokens
// ============================================

const ENCRYPTION_APP_ID = 'streamcrowd_firebase_2024';

// Derive encryption key from app identifier
async function getFirebaseEncryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_APP_ID),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('firebase_token_salt_v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptForFirebase(text: string): Promise<string> {
  try {
    const key = await getFirebaseEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    
    // Combine IV + ciphertext and encode as base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error('[BroadcasterTokenService] Encryption failed:', err);
    // Fallback to simple obfuscation
    return simpleEncrypt(text);
  }
}

async function decryptFromFirebase(encoded: string): Promise<string> {
  try {
    const key = await getFirebaseEncryptionKey();
    
    // Decode base64
    const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    
    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch {
    // Try fallback decryption for legacy data
    return simpleDecrypt(encoded);
  }
}

// Legacy simple encryption for backwards compatibility
const ENCRYPTION_KEY = 'streamcrowd_2024_key';

function simpleEncrypt(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    );
  }
  return btoa(result);
}

function simpleDecrypt(encoded: string): string {
  try {
    const text = atob(encoded);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return result;
  } catch {
    return '';
  }
}

// ============================================
// Service Class
// ============================================

class BroadcasterTokenServiceImpl {
  private database: Database | null = null;
  private tokensCache: Map<string, StoredBroadcasterToken> = new Map();
  private listeners: Set<() => void> = new Set();
  private subscriptions: Map<string, () => void> = new Map();
  private initialized = false;

  constructor() {
    this.initFirebase();
  }

  private async initFirebase(): Promise<void> {
    try {
      // Initialize Firebase Auth first
      await FirebaseAuthService.initialize();
      
      // Use existing Firebase app or create new one
      const apps = getApps();
      const app = apps.length > 0 ? apps[0] : initializeApp(FIREBASE_CONFIG, 'broadcaster-tokens');
      this.database = getDatabase(app);
      this.initialized = true;
      console.log('[BroadcasterTokenService] Firebase initialized with Auth');
    } catch (err) {
      console.error('[BroadcasterTokenService] Error initializing Firebase:', err);
    }
  }

  /**
   * Ensure Firebase is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initFirebase();
    }
    // Ensure we're authenticated
    if (!FirebaseAuthService.isAuthenticated()) {
      await FirebaseAuthService.signInAnonymously();
    }
  }

  // ============================================
  // Token Management
  // ============================================

  /**
   * Guardar token de un broadcaster en Firebase
   * Llamar esto cuando un streamer autoriza la app
   */
  async storeBroadcasterToken(data: {
    broadcasterId: string;
    broadcasterLogin: string;
    broadcasterName: string;
    accessToken: string;
    scopes: string[];
    expiresIn?: number;
  }): Promise<boolean> {
    await this.ensureInitialized();
    
    if (!this.database) {
      console.error('[BroadcasterTokenService] Firebase not initialized');
      return false;
    }

    try {
      // The rules only let the broadcaster write broadcaster_tokens/<id>.
      // Prove the identity with the token being stored (server-validated).
      const verified = await FirebaseAuthService.signInWithTwitch(data.accessToken, data.broadcasterId);
      if (!verified) {
        console.error('[BroadcasterTokenService] Could not verify broadcaster identity (is /api/firebase-token configured?)');
        return false;
      }
      
      // Encrypt token with AES-GCM before storing in Firebase
      const encryptedToken = await encryptForFirebase(data.accessToken);
      
      const token: StoredBroadcasterToken = {
        broadcasterId: data.broadcasterId,
        broadcasterLogin: data.broadcasterLogin.toLowerCase(),
        broadcasterName: data.broadcasterName,
        accessToken: encryptedToken,
        scopes: data.scopes,
        storedAt: Date.now(),
      };

      // Only add expiresAt if we have expiresIn (Firebase doesn't accept undefined)
      if (data.expiresIn) {
        token.expiresAt = Date.now() + (data.expiresIn * 1000);
      }

      const tokenRef = ref(this.database, `${FIREBASE_PATH}/${data.broadcasterId}`);
      await set(tokenRef, token);

      // Update local cache
      this.tokensCache.set(data.broadcasterId, {
        ...token,
        accessToken: data.accessToken, // Keep decrypted in cache
      });

      this.notifyListeners();
      console.log('[BroadcasterTokenService] Token stored for:', data.broadcasterLogin);

      // Publish the channel's moderator list: the rules let only these users
      // read the stored token. Non-blocking; failure only affects moderators.
      this.syncChannelModerators(data.broadcasterId, data.accessToken).catch(err =>
        console.warn('[BroadcasterTokenService] Could not sync moderators:', err)
      );
      return true;
    } catch (err) {
      console.error('[BroadcasterTokenService] Error storing token:', err);
      return false;
    }
  }

  /**
   * Obtener token de un broadcaster desde Firebase
   */
  async getBroadcasterToken(broadcasterId: string): Promise<StoredBroadcasterToken | null> {
    // Check cache first
    if (this.tokensCache.has(broadcasterId)) {
      return this.tokensCache.get(broadcasterId) || null;
    }

    await this.ensureInitialized();
    
    if (!this.database) {
      return null;
    }

    try {
      const tokenRef = ref(this.database, `${FIREBASE_PATH}/${broadcasterId}`);
      const snapshot = await get(tokenRef);
      
      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.val() as StoredBroadcasterToken;
      
      // Decrypt token with AES-GCM (falls back to legacy decryption)
      const decryptedAccessToken = await decryptFromFirebase(data.accessToken);
      const decryptedToken: StoredBroadcasterToken = {
        ...data,
        accessToken: decryptedAccessToken,
      };

      // Cache it
      this.tokensCache.set(broadcasterId, decryptedToken);
      
      return decryptedToken;
    } catch (err) {
      console.error('[BroadcasterTokenService] Error getting token:', err);
      return null;
    }
  }

  /**
   * Verificar si tenemos token para un broadcaster (async)
   */
  async hasBroadcasterToken(broadcasterId: string): Promise<boolean> {
    const token = await this.getBroadcasterToken(broadcasterId);
    return token !== null;
  }

  /**
   * Verificar si tenemos token en cache (sync)
   */
  hasBroadcasterTokenCached(broadcasterId: string): boolean {
    return this.tokensCache.has(broadcasterId);
  }

  /**
   * Writes channel_moderators/<broadcasterId> = { <modUserId>: true } from
   * Helix "Get Moderators" (scope moderation:read). The database rules use
   * this list to decide which moderators may read the broadcaster token.
   */
  async syncChannelModerators(broadcasterId: string, accessToken: string): Promise<number> {
    if (!this.database || FirebaseAuthService.getTwitchId() !== broadcasterId) return 0;

    const moderators: Record<string, true> = {};
    let cursor: string | undefined;
    for (let page = 0; page < 20; page++) {
      const url = new URL('https://api.twitch.tv/helix/moderation/moderators');
      url.searchParams.set('broadcaster_id', broadcasterId);
      url.searchParams.set('first', '100');
      if (cursor) url.searchParams.set('after', cursor);

      const response = await helixFetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Client-Id': TWITCH_CLIENT_ID },
      });
      if (!response.ok) throw new Error(`Helix moderators HTTP ${response.status}`);

      const body = await response.json() as { data?: Array<{ user_id: string }>; pagination?: { cursor?: string } };
      for (const mod of body.data ?? []) {
        if (/^\d+$/.test(mod.user_id)) moderators[mod.user_id] = true;
      }
      cursor = body.pagination?.cursor;
      if (!cursor) break;
    }

    await set(ref(this.database, `${MODERATORS_PATH}/${broadcasterId}`), moderators);
    return Object.keys(moderators).length;
  }

  /**
   * Eliminar token de un broadcaster
   */
  async removeBroadcasterToken(broadcasterId: string): Promise<void> {
    if (!this.database) return;
    // Only the broadcaster may delete it (rules); moderators just drop the cache
    if (FirebaseAuthService.getTwitchId() !== broadcasterId) {
      this.tokensCache.delete(broadcasterId);
      this.notifyListeners();
      return;
    }

    try {
      const tokenRef = ref(this.database, `${FIREBASE_PATH}/${broadcasterId}`);
      await set(tokenRef, null);
      this.tokensCache.delete(broadcasterId);
      this.notifyListeners();
    } catch (err) {
      console.error('[BroadcasterTokenService] Error removing token:', err);
    }
  }

  /**
   * Suscribirse a cambios en el token de un broadcaster
   */
  subscribeToToken(broadcasterId: string, callback: (token: StoredBroadcasterToken | null) => void): () => void {
    if (!this.database) {
      return () => {};
    }

    const tokenRef = ref(this.database, `${FIREBASE_PATH}/${broadcasterId}`);
    
    const unsubscribe = onValue(tokenRef, async (snapshot) => {
      if (!snapshot.exists()) {
        this.tokensCache.delete(broadcasterId);
        callback(null);
        return;
      }

      const data = snapshot.val() as StoredBroadcasterToken;
      
      // Decrypt token asynchronously
      try {
        const decryptedAccessToken = await decryptFromFirebase(data.accessToken);
        const decryptedToken: StoredBroadcasterToken = {
          ...data,
          accessToken: decryptedAccessToken,
        };

        this.tokensCache.set(broadcasterId, decryptedToken);
        callback(decryptedToken);
      } catch (err) {
        console.error('[BroadcasterTokenService] Error decrypting token in subscription:', err);
        callback(null);
      }
    });

    // Store unsubscribe function
    this.subscriptions.set(broadcasterId, () => {
      off(tokenRef);
    });

    return () => {
      off(tokenRef);
      this.subscriptions.delete(broadcasterId);
    };
  }

  // ============================================
  // Scope Verification
  // ============================================

  /**
   * Verificar si el token tiene los scopes requeridos
   */
  async hasRequiredScopes(broadcasterId: string, requiredScopes: string[]): Promise<boolean> {
    const token = await this.getBroadcasterToken(broadcasterId);
    if (!token) return false;

    return requiredScopes.every(scope => token.scopes.includes(scope));
  }

  /**
   * Verificar si puede crear predicciones
   */
  async canCreatePredictions(broadcasterId: string): Promise<boolean> {
    return this.hasRequiredScopes(broadcasterId, [BROADCASTER_SCOPES.predictions]);
  }

  /**
   * Verificar si puede crear polls
   */
  async canCreatePolls(broadcasterId: string): Promise<boolean> {
    return this.hasRequiredScopes(broadcasterId, [BROADCASTER_SCOPES.polls]);
  }

  /**
   * Verificar si puede iniciar raids
   */
  async canStartRaids(broadcasterId: string): Promise<boolean> {
    return this.hasRequiredScopes(broadcasterId, [BROADCASTER_SCOPES.raids]);
  }

  // ============================================
  // Token Validation
  // ============================================

  /**
   * Validar token con Twitch API
   */
  async validateToken(broadcasterId: string): Promise<TokenVerificationResult> {
    const storedToken = await this.getBroadcasterToken(broadcasterId);
    if (!storedToken) {
      return { valid: false, error: 'No token stored for this broadcaster' };
    }

    try {
      const response = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': `OAuth ${storedToken.accessToken}`,
        },
      });

      if (response.status === 401) {
        // Token inválido o revocado - eliminarlo
        await this.removeBroadcasterToken(broadcasterId);
        return { valid: false, error: 'Token expired or revoked' };
      }

      if (!response.ok) {
        // 429 / 5xx: error transitorio, NO borrar el token
        return { valid: false, error: `Token validation temporarily unavailable (HTTP ${response.status})` };
      }

      const data = await response.json();
      
      // Actualizar scopes si cambiaron (solo el broadcaster puede escribir)
      if (data.scopes && this.database && FirebaseAuthService.getTwitchId() === broadcasterId) {
        const tokenRef = ref(this.database, `${FIREBASE_PATH}/${broadcasterId}/scopes`);
        await set(tokenRef, data.scopes);
        
        // Update cache
        const cached = this.tokensCache.get(broadcasterId);
        if (cached) {
          cached.scopes = data.scopes;
        }
      }

      return {
        valid: true,
        expiresIn: data.expires_in,
        scopes: data.scopes,
      };
    } catch (err) {
      console.error('[BroadcasterTokenService] Error validating token:', err);
      return { valid: false, error: 'Network error' };
    }
  }

  // ============================================
  // Action Execution
  // ============================================

  /**
   * Obtener token para ejecutar una acción de broadcaster
   * Retorna el access token si está disponible y válido
   */
  async getTokenForAction(
    broadcasterId: string,
    requiredScopes: string[]
  ): Promise<{ token: string } | { error: string }> {
    const storedToken = await this.getBroadcasterToken(broadcasterId);
    
    if (!storedToken) {
      return { 
        error: 'El streamer no ha autorizado la app. Pídele que conecte su cuenta en Stream Crowd.' 
      };
    }

    // Verificar scopes
    const missingScopes = requiredScopes.filter(
      scope => !storedToken.scopes.includes(scope)
    );

    if (missingScopes.length > 0) {
      return {
        error: `Faltan permisos: ${missingScopes.join(', ')}. El streamer debe reconectar su cuenta.`
      };
    }

    // Verificar si el token ha expirado (si conocemos la fecha)
    if (storedToken.expiresAt && Date.now() > storedToken.expiresAt) {
      // Intentar validar por si acaso
      const validation = await this.validateToken(broadcasterId);
      if (!validation.valid) {
        return { error: 'El token del streamer ha expirado. Debe reconectar su cuenta.' };
      }
    }

    return { token: storedToken.accessToken };
  }

  // ============================================
  // Listeners
  // ============================================

  /**
   * Suscribirse a cambios en los tokens
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (e) {
        console.error('[BroadcasterTokenService] Error in listener:', e);
      }
    });
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    // Unsubscribe from all Firebase listeners
    for (const [, unsubscribe] of this.subscriptions) {
      unsubscribe();
    }
    this.subscriptions.clear();
    this.tokensCache.clear();
    this.listeners.clear();
  }
}

// ============================================
// Singleton Export
// ============================================

export const BroadcasterTokenService = new BroadcasterTokenServiceImpl();

// ============================================
// Static Method Exports
// ============================================

/**
 * Construir URL de OAuth para que el broadcaster autorice
 */
export function buildBroadcasterAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: ALL_BROADCASTER_SCOPES.join(' '),
    state: state,
    force_verify: 'false',
  });

  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Verificar si el usuario actual puede ejecutar acciones de broadcaster
 * en un canal específico
 */
export async function canExecuteBroadcasterAction(
  broadcasterId: string,
  currentUserId: string,
  requiredScopes: string[]
): Promise<{ canExecute: boolean; reason?: string; needsBroadcasterAuth?: boolean }> {
  // Si el usuario es el broadcaster, puede hacerlo con su propio token
  if (broadcasterId === currentUserId) {
    return { canExecute: true };
  }

  // Si es moderador, necesitamos el token del broadcaster
  const hasToken = await BroadcasterTokenService.hasBroadcasterToken(broadcasterId);
  if (!hasToken) {
    return {
      canExecute: false,
      reason: 'El streamer no ha autorizado la app para esta acción.',
      needsBroadcasterAuth: true,
    };
  }

  const hasScopes = await BroadcasterTokenService.hasRequiredScopes(broadcasterId, requiredScopes);
  if (!hasScopes) {
    return {
      canExecute: false,
      reason: 'El streamer necesita reconectar su cuenta con más permisos.',
      needsBroadcasterAuth: true,
    };
  }

  return { canExecute: true };
}
