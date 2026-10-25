/**
 * Overlay registry - single source of truth for overlay URL parameters.
 *
 * Used by App.tsx (OverlayRouter) and hooks/useOverlay.ts (detectOverlayMode).
 * Before, both kept their own list and disagreed: some URLs were treated as
 * overlays by one and not by the other, which mounted the full dashboard
 * inside an OBS browser source.
 *
 * URL parameters generated for users live in
 * src/application/services/OverlayURLService.ts (OVERLAY_TYPES.urlParam);
 * every one of them must appear here.
 */

export type OverlayRouteType =
  | 'countdown'
  | 'spinner'
  | 'randomWinner'
  | 'judgePanel'
  | 'pium'
  | 'roulette'
  | 'fishing'
  | 'potato'
  | 'trivia'
  | 'battleship'
  | 'duckHunt'
  | 'veoVeo'
  | 'ppt'
  | 'ahorcado'
  | 'carrera'
  | 'memoria'
  | 'partyCo'
  | 'poll'
  | 'legacyPoll';

/** [URL parameter, overlay type]. Order matters when several params are present. */
export const OVERLAY_URL_PARAMS: ReadonlyArray<readonly [string, OverlayRouteType]> = [
  ['overlayCountdown', 'countdown'],
  ['overlaySpinner', 'spinner'],
  ['overlayRandomWinner', 'randomWinner'],
  ['overlayGiveaway', 'randomWinner'], // alias
  ['overlayJudgePanel', 'judgePanel'],
  ['overlayJudge', 'judgePanel'], // alias
  ['overlayPium', 'pium'],
  ['overlayRoulette', 'roulette'],
  ['overlayFishing', 'fishing'],
  ['overlayPotato', 'potato'],
  ['overlayTrivia', 'trivia'],
  ['overlayBattleship', 'battleship'],
  ['overlayDuckHunt', 'duckHunt'],
  ['overlayVeoVeo', 'veoVeo'],
  ['overlayPPT', 'ppt'],
  ['overlayAhorcado', 'ahorcado'],
  ['overlayCarrera', 'carrera'],
  ['overlayMemoria', 'memoria'],
  ['overlayPartyCo', 'partyCo'],
  ['overlayPoll', 'poll'],
  ['overlay', 'legacyPoll'],
];

/** Returns the overlay type requested by the URL query string, or null. */
export function getOverlayTypeFromSearch(search: string): OverlayRouteType | null {
  const params = new URLSearchParams(search);
  for (const [param, type] of OVERLAY_URL_PARAMS) {
    if (params.get(param) === 'true') return type;
  }
  return null;
}

/** Overlay type for the current page (null outside the browser or when not an overlay). */
export function getCurrentOverlayType(): OverlayRouteType | null {
  if (typeof window === 'undefined') return null;
  return getOverlayTypeFromSearch(window.location.search);
}
