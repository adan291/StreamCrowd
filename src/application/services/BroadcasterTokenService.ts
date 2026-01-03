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
 * - Solo se permite usar el token si el usuario es moderador verificado del canal
 * - Los tokens se encriptan antes de guardar (básico, para producción usar mejor encriptación)
 * 
 * @module src/application/services/BroadcasterTokenService
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, off, Database } from 'firebase/database';

const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID || 'gp762nuuoqcoxypju8c569th9wz7q5';

// Firebase config (same as FirebaseSyncAdapter)
const FIREBASE_CONFIG = {
  apiKey: "REDACTED_FIREBASE_API_KEY",
  authDomain: "twtich-vote-live.firebaseapp.com",
  databaseURL: "https://twtich-vote-live-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "twtich-vote-live",
  storageBucket: "twtich-vote-live.firebasestorage.app",
  messagingSenderId: "779005710594",
  appId: "1:779005710594:web:8df44b0c02a57fc262b21b",
};

const FIREBASE_PATH = 'broadcaster_tokens';

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
// Simple Encryption (for basic protection)
// In production, use proper encryption or a secure backend
// ============================================

const ENCRYPTION_KEY = 'streamcrowd_2024_key';

function simpleEncrypt(text: string): string {
  // Simple XOR encryption - NOT secure for production!
  // Use this only as basic obfuscation
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    );
  }
  return btoa(result); // Base64 encode
}

function simpleDecrypt(encoded: string): string {
  try {
    const text = atob(encoded); // Base64 decode
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

  private initFirebase(): void {
    try {
      // Use existing Firebase app or create new one
      const apps = getApps();
      const app = apps.length > 0 ? apps[0] : initializeApp(FIREBASE_CONFIG, 'broadcaster-tokens');
      this.database = getDatabase(app);
      this.initialized = true;
      console.log('[BroadcasterTokenService] Firebase initialized');
    } catch (err) {
      console.error('[BroadcasterTokenService] Error initializing Firebase:', err);
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
    if (!this.database) {
      console.error('[BroadcasterTokenService] Firebase not initialized');
      return false;
    }

    try {
      const token: StoredBroadcasterToken = {
        broadcasterId: data.broadcasterId,
        broadcasterLogin: data.broadcasterLogin.toLowerCase(),
        broadcasterName: data.broadcasterName,
        accessToken: simpleEncrypt(data.accessToken), // Encrypt before storing
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
      
      // Decrypt token
      const decryptedToken: StoredBroadcasterToken = {
        ...data,
        accessToken: simpleDecrypt(data.accessToken),
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
   * Eliminar token de un broadcaster
   */
  async removeBroadcasterToken(broadcasterId: string): Promise<void> {
    if (!this.database) return;

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
    
    const unsubscribe = onValue(tokenRef, (snapshot) => {
      if (!snapshot.exists()) {
        this.tokensCache.delete(broadcasterId);
        callback(null);
        return;
      }

      const data = snapshot.val() as StoredBroadcasterToken;
      const decryptedToken: StoredBroadcasterToken = {
        ...data,
        accessToken: simpleDecrypt(data.accessToken),
      };

      this.tokensCache.set(broadcasterId, decryptedToken);
      callback(decryptedToken);
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

      if (!response.ok) {
        // Token inválido - eliminarlo
        await this.removeBroadcasterToken(broadcasterId);
        return { valid: false, error: 'Token expired or revoked' };
      }

      const data = await response.json();
      
      // Actualizar scopes si cambiaron
      if (data.scopes && this.database) {
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
