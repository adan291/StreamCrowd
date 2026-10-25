import { useEffect, useState } from 'react';
import { FirebaseAuthService } from '../src/infrastructure/auth/FirebaseAuthService';

/**
 * Firebase uid whose overlays/<uid> data an OBS browser source must read.
 *
 * Overlay URLs include it as ?owner=<uid>. After Twitch login the uid is
 * "twitch:<user_id>", so the URL stays the same across devices and sessions.
 * Updates when the session changes (anonymous → Twitch identity).
 */
export function useOverlayOwner(): string | null {
  const [owner, setOwner] = useState<string | null>(() => FirebaseAuthService.getUid());

  useEffect(() => {
    let active = true;
    FirebaseAuthService.initialize().catch(() => { /* sync unavailable */ });
    const unsubscribe = FirebaseAuthService.onAuthStateChange(state => {
      if (active) setOwner(state.uid);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return owner;
}

/** Appends ?owner= to an overlay URL when the owner is known. */
export function withOverlayOwner(url: string, owner: string | null): string {
  if (!owner) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}owner=${encodeURIComponent(owner)}`;
}
