/**
 * Scope Verification Utilities
 * 
 * Provides functions to verify OAuth scopes and prompt for re-authentication
 * when required scopes are missing.
 * 
 * @requirements 1.5 - Require scope channel:manage:predictions for prediction operations
 * @requirements 4.2 - Require scope channel:manage:redemptions for reward operations
 * @requirements 8.1 - Prompt to re-authenticate if OAuth token lacks required scopes
 */

import { AuthService } from '../services/AuthService';

// ============================================
// Scope Definitions
// ============================================

/**
 * Required scopes for different Twitch features
 */
export const TWITCH_SCOPES = {
  // Prediction scopes
  MANAGE_PREDICTIONS: 'channel:manage:predictions',
  READ_PREDICTIONS: 'channel:read:predictions',
  
  // Channel Points / Rewards scopes
  MANAGE_REDEMPTIONS: 'channel:manage:redemptions',
  READ_REDEMPTIONS: 'channel:read:redemptions',
  
  // Chat scopes
  CHAT_READ: 'chat:read',
  CHAT_EDIT: 'chat:edit',
  
  // Moderation scopes
  MODERATOR_MANAGE_BANNED_USERS: 'moderator:manage:banned_users',
  MODERATOR_MANAGE_CHAT_MESSAGES: 'moderator:manage:chat_messages',
  MODERATOR_MANAGE_CHAT_SETTINGS: 'moderator:manage:chat_settings',
  MODERATOR_MANAGE_ANNOUNCEMENTS: 'moderator:manage:announcements',
  MODERATION_READ: 'moderation:read',
  
  // Channel scopes
  CHANNEL_READ_SUBSCRIPTIONS: 'channel:read:subscriptions',
  CHANNEL_READ_VIPS: 'channel:read:vips',
  CHANNEL_MANAGE_VIPS: 'channel:manage:vips',
  MODERATOR_READ_CHATTERS: 'moderator:read:chatters',
  MODERATOR_READ_FOLLOWERS: 'moderator:read:followers',
  BITS_READ: 'bits:read',
} as const;

/**
 * Feature-to-scope mapping for easy lookup
 */
export const FEATURE_SCOPES: Record<string, string[]> = {
  predictions: [TWITCH_SCOPES.MANAGE_PREDICTIONS],
  channelPoints: [TWITCH_SCOPES.MANAGE_REDEMPTIONS],
  rewards: [TWITCH_SCOPES.MANAGE_REDEMPTIONS],
  redemptions: [TWITCH_SCOPES.MANAGE_REDEMPTIONS, TWITCH_SCOPES.READ_REDEMPTIONS],
  chat: [TWITCH_SCOPES.CHAT_READ, TWITCH_SCOPES.CHAT_EDIT],
  moderation: [TWITCH_SCOPES.MODERATOR_MANAGE_BANNED_USERS, TWITCH_SCOPES.MODERATION_READ],
};

// ============================================
// Types
// ============================================

/**
 * Result of a scope verification check
 */
export interface ScopeVerificationResult {
  /** Whether all required scopes are present */
  hasAllScopes: boolean;
  /** List of scopes that are present */
  presentScopes: string[];
  /** List of scopes that are missing */
  missingScopes: string[];
  /** Whether the user is authenticated at all */
  isAuthenticated: boolean;
}

/**
 * Options for scope verification
 */
export interface ScopeVerificationOptions {
  /** Scopes to check for */
  requiredScopes: string[];
  /** Whether to prompt for re-auth if scopes are missing */
  promptReauth?: boolean;
  /** Custom message to show when prompting for re-auth */
  reauthMessage?: string;
}

/**
 * Callback for re-authentication prompt
 */
export type ReauthPromptCallback = (missingScopes: string[], message: string) => void;

// ============================================
// Module State
// ============================================

let reauthPromptCallback: ReauthPromptCallback | null = null;

// ============================================
// Public API
// ============================================

/**
 * Register a callback to be called when re-authentication is needed
 * 
 * @param callback - Function to call when re-auth is needed
 * @returns Cleanup function to unregister the callback
 */
export function registerReauthPrompt(callback: ReauthPromptCallback): () => void {
  reauthPromptCallback = callback;
  return () => {
    if (reauthPromptCallback === callback) {
      reauthPromptCallback = null;
    }
  };
}

/**
 * Check if a specific scope is present in the current auth state
 * 
 * @param scope - The scope to check for
 * @returns true if the scope is present
 */
export function hasScope(scope: string): boolean {
  const authState = AuthService.getState();
  return authState.scopes.includes(scope);
}

/**
 * Check if all specified scopes are present
 * 
 * @param scopes - Array of scopes to check
 * @returns true if all scopes are present
 */
export function hasAllScopes(scopes: string[]): boolean {
  const authState = AuthService.getState();
  return scopes.every(scope => authState.scopes.includes(scope));
}

/**
 * Check if any of the specified scopes are present
 * 
 * @param scopes - Array of scopes to check
 * @returns true if at least one scope is present
 */
export function hasAnyScope(scopes: string[]): boolean {
  const authState = AuthService.getState();
  return scopes.some(scope => authState.scopes.includes(scope));
}

/**
 * Verify scopes and optionally prompt for re-authentication
 * 
 * @param options - Verification options
 * @returns Verification result
 * 
 * @requirements 8.1 - Prompt to re-authenticate if OAuth token lacks required scopes
 */
export function verifyScopes(options: ScopeVerificationOptions): ScopeVerificationResult {
  const { requiredScopes, promptReauth = false, reauthMessage } = options;
  const authState = AuthService.getState();
  
  const isAuthenticated = AuthService.isAuthenticated();
  const presentScopes = requiredScopes.filter(scope => authState.scopes.includes(scope));
  const missingScopes = requiredScopes.filter(scope => !authState.scopes.includes(scope));
  const hasAllScopes = missingScopes.length === 0;
  
  // Prompt for re-auth if needed and callback is registered
  if (promptReauth && !hasAllScopes && isAuthenticated && reauthPromptCallback) {
    const message = reauthMessage || getDefaultReauthMessage(missingScopes);
    reauthPromptCallback(missingScopes, message);
  }
  
  return {
    hasAllScopes,
    presentScopes,
    missingScopes,
    isAuthenticated,
  };
}

/**
 * Verify scopes for a specific feature
 * 
 * @param feature - Feature name (e.g., 'predictions', 'channelPoints')
 * @param promptReauth - Whether to prompt for re-auth if scopes are missing
 * @returns Verification result
 */
export function verifyScopesForFeature(
  feature: keyof typeof FEATURE_SCOPES,
  promptReauth: boolean = false
): ScopeVerificationResult {
  const requiredScopes = FEATURE_SCOPES[feature] || [];
  return verifyScopes({
    requiredScopes,
    promptReauth,
    reauthMessage: getFeatureReauthMessage(feature),
  });
}

/**
 * Check if the user can use predictions feature
 * 
 * @requirements 1.5 - Require scope channel:manage:predictions for prediction operations
 */
export function canUsePredictions(): boolean {
  return hasScope(TWITCH_SCOPES.MANAGE_PREDICTIONS);
}

/**
 * Check if the user can use channel points/rewards feature
 * 
 * @requirements 4.2 - Require scope channel:manage:redemptions for reward operations
 */
export function canUseChannelPoints(): boolean {
  return hasScope(TWITCH_SCOPES.MANAGE_REDEMPTIONS);
}

/**
 * Get a user-friendly description of a scope
 * 
 * @param scope - The scope to describe
 * @returns Human-readable description
 */
export function getScopeDescription(scope: string): string {
  const descriptions: Record<string, string> = {
    [TWITCH_SCOPES.MANAGE_PREDICTIONS]: 'Gestionar predicciones del canal',
    [TWITCH_SCOPES.READ_PREDICTIONS]: 'Ver predicciones del canal',
    [TWITCH_SCOPES.MANAGE_REDEMPTIONS]: 'Gestionar recompensas de Channel Points',
    [TWITCH_SCOPES.READ_REDEMPTIONS]: 'Ver redenciones de Channel Points',
    [TWITCH_SCOPES.CHAT_READ]: 'Leer mensajes del chat',
    [TWITCH_SCOPES.CHAT_EDIT]: 'Enviar mensajes al chat',
    [TWITCH_SCOPES.MODERATOR_MANAGE_BANNED_USERS]: 'Banear/desbanear usuarios',
    [TWITCH_SCOPES.MODERATOR_MANAGE_CHAT_MESSAGES]: 'Eliminar mensajes del chat',
    [TWITCH_SCOPES.MODERATOR_MANAGE_CHAT_SETTINGS]: 'Gestionar configuración del chat',
    [TWITCH_SCOPES.MODERATOR_MANAGE_ANNOUNCEMENTS]: 'Enviar anuncios',
    [TWITCH_SCOPES.MODERATION_READ]: 'Ver información de moderación',
    [TWITCH_SCOPES.CHANNEL_READ_SUBSCRIPTIONS]: 'Ver suscriptores',
    [TWITCH_SCOPES.CHANNEL_READ_VIPS]: 'Ver VIPs del canal',
    [TWITCH_SCOPES.CHANNEL_MANAGE_VIPS]: 'Gestionar VIPs del canal',
    [TWITCH_SCOPES.MODERATOR_READ_CHATTERS]: 'Ver lista de espectadores',
    [TWITCH_SCOPES.MODERATOR_READ_FOLLOWERS]: 'Ver seguidores',
    [TWITCH_SCOPES.BITS_READ]: 'Ver bits',
  };
  
  return descriptions[scope] || scope;
}

/**
 * Get descriptions for multiple scopes
 * 
 * @param scopes - Array of scopes to describe
 * @returns Array of human-readable descriptions
 */
export function getScopeDescriptions(scopes: string[]): string[] {
  return scopes.map(getScopeDescription);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get default re-authentication message for missing scopes
 */
function getDefaultReauthMessage(missingScopes: string[]): string {
  const descriptions = getScopeDescriptions(missingScopes);
  const scopeList = descriptions.join(', ');
  return `Para usar esta función, necesitas reconectar tu cuenta de Twitch con los siguientes permisos: ${scopeList}`;
}

/**
 * Get feature-specific re-authentication message
 */
function getFeatureReauthMessage(feature: string): string {
  const messages: Record<string, string> = {
    predictions: 'Para usar predicciones, necesitas reconectar tu cuenta de Twitch con el permiso de gestionar predicciones.',
    channelPoints: 'Para usar Channel Points, necesitas reconectar tu cuenta de Twitch con el permiso de gestionar recompensas.',
    rewards: 'Para gestionar recompensas, necesitas reconectar tu cuenta de Twitch con el permiso de gestionar redenciones.',
    redemptions: 'Para ver y gestionar redenciones, necesitas reconectar tu cuenta de Twitch con los permisos correspondientes.',
    chat: 'Para usar el chat, necesitas reconectar tu cuenta de Twitch con los permisos de chat.',
    moderation: 'Para usar funciones de moderación, necesitas reconectar tu cuenta de Twitch con los permisos de moderación.',
  };
  
  return messages[feature] || getDefaultReauthMessage(FEATURE_SCOPES[feature] || []);
}

/**
 * Create a scope checker function for a specific set of scopes
 * Useful for creating reusable permission checks
 * 
 * @param requiredScopes - Scopes to check for
 * @returns Function that returns true if all scopes are present
 */
export function createScopeChecker(requiredScopes: string[]): () => boolean {
  return () => hasAllScopes(requiredScopes);
}

/**
 * Wrap an async function with scope verification
 * Returns an error if scopes are missing
 * 
 * @param requiredScopes - Scopes required for the operation
 * @param fn - Function to wrap
 * @param errorMessage - Custom error message if scopes are missing
 * @returns Wrapped function that checks scopes before executing
 */
export function withScopeCheck<T, Args extends unknown[]>(
  requiredScopes: string[],
  fn: (...args: Args) => Promise<T>,
  errorMessage?: string
): (...args: Args) => Promise<T | { error: string; missingScopes: string[] }> {
  return async (...args: Args) => {
    const result = verifyScopes({ requiredScopes });
    
    if (!result.isAuthenticated) {
      return {
        error: 'No estás autenticado. Por favor, conecta tu cuenta de Twitch.',
        missingScopes: requiredScopes,
      };
    }
    
    if (!result.hasAllScopes) {
      return {
        error: errorMessage || getDefaultReauthMessage(result.missingScopes),
        missingScopes: result.missingScopes,
      };
    }
    
    return fn(...args);
  };
}
