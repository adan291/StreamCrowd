/**
 * SessionService - Manages secure sessions for overlay access
 * 
 * This is an alias for OverlaySessionService to match the design specification.
 * The implementation is in OverlaySessionService.ts for better naming clarity
 * and to avoid conflicts with the collaboration SessionService.
 * 
 * @see OverlaySessionService for full implementation
 * @requirements 4.1, 4.2, 4.3, 4.5
 */

export {
  OverlaySessionService as SessionService,
  getOverlaySessionService as getSessionService,
  resetOverlaySessionService as resetSessionService,
  type OverlaySession as Session,
  type OverlayType,
  type SessionValidationResult,
  type CreateSessionOptions,
} from './OverlaySessionService';

// Re-export for convenience
export { OverlaySessionService, getOverlaySessionService, resetOverlaySessionService } from './OverlaySessionService';
