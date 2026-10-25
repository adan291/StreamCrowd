/**
 * OverlayRouter - entry point for OBS browser-source URLs (?overlayXxx=true).
 *
 * Loaded by index.tsx through a dynamic import, separately from App.tsx, so an
 * overlay only downloads its own component instead of the whole dashboard.
 * Every overlay is lazy as well.
 */
import React, { useEffect, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import type { OverlayRouteType } from '../config/overlayRegistry';
import type { PollOption } from '../types';

const Countdown = lazy(() => import('./Countdown'));
const SpinnerWheel = lazy(() => import('./SpinnerWheel'));
const RandomWinnerOverlay = lazy(() => import('./RandomWinnerOverlay'));
const JudgePanel = lazy(() => import('./JudgePanel'));
const PollOverlay = lazy(() => import('./PollOverlay').then(m => ({ default: m.PollOverlay })));

const PiumOverlay = lazy(() => import('./games/PiumOverlay'));
const RouletteOverlay = lazy(() => import('./games/RouletteOverlay'));
const FishingOverlay = lazy(() => import('./games/FishingOverlay'));
const BattleshipOverlay = lazy(() => import('./games/BattleshipOverlay'));
const DuckHuntOverlay = lazy(() => import('./games/DuckHuntOverlay'));
const VeoVeoOverlay = lazy(() => import('./games/VeoVeoOverlay'));
const PPTOverlay = lazy(() => import('./games/PPTOverlay'));
const AhorcadoOverlay = lazy(() => import('./games/AhorcadoOverlay'));
const CarreraOverlay = lazy(() => import('./games/CarreraOverlay'));
const MemoriaOverlay = lazy(() => import('./games/MemoriaOverlay'));
const PotatoOverlay = lazy(() => import('./games/PotatoOverlay'));
const TriviaOverlay = lazy(() => import('./games/TriviaOverlay'));
const PartyCoOverlay = lazy(() => import('./games/PartyCoOverlay'));

const DEFAULT_SPINNER_OPTIONS: PollOption[] = [
  { id: 1, label: 'Opción 1', votes: 0, color: '#a970ff' },
  { id: 2, label: 'Opción 2', votes: 0, color: '#00f0f0' },
  { id: 3, label: 'Opción 3', votes: 0, color: '#ff6b6b' },
];

const closeWindow = () => window.close();

const OverlayLoading: React.FC = () => (
  <div className="flex items-center justify-center h-full w-full min-h-[200px]">
    <div className="flex flex-col items-center gap-3 text-zinc-400">
      <Loader2 className="w-8 h-8 animate-spin text-twitch-brand" />
      <span className="text-sm">Cargando overlay...</span>
    </div>
  </div>
);

function renderOverlay(type: OverlayRouteType): React.ReactNode {
  switch (type) {
    case 'countdown':
      return <Countdown onClose={closeWindow} chatMessages={[]} isOverlayMode={true} />;
    case 'spinner':
      return <SpinnerWheel options={DEFAULT_SPINNER_OPTIONS} onClose={closeWindow} chatMessages={[]} isOverlayMode={true} />;
    case 'randomWinner':
      return <RandomWinnerOverlay chatMessages={[]} onClose={closeWindow} />;
    case 'judgePanel':
      return <JudgePanel chatMessages={[]} onClose={closeWindow} isOverlayMode={true} />;
    case 'pium':
      return <PiumOverlay />;
    case 'roulette':
      return <RouletteOverlay />;
    case 'fishing':
      return <FishingOverlay />;
    case 'potato':
      return <PotatoOverlay />;
    case 'trivia':
      return <TriviaOverlay />;
    case 'battleship':
      return <BattleshipOverlay />;
    case 'duckHunt':
      return <DuckHuntOverlay />;
    case 'veoVeo':
      return <VeoVeoOverlay />;
    case 'ppt':
      return <PPTOverlay />;
    case 'ahorcado':
      return <AhorcadoOverlay />;
    case 'carrera':
      return <CarreraOverlay />;
    case 'memoria':
      return <MemoriaOverlay />;
    case 'partyCo':
      return <PartyCoOverlay />;
    case 'poll':
    case 'legacyPoll':
      return <PollOverlay />;
    default:
      return null;
  }
}

export const OverlayRouter: React.FC<{ type: OverlayRouteType }> = ({ type }) => {
  // Distinctive title so the source is easy to identify in OBS
  useEffect(() => {
    document.title = '🎬 OVERLAY - StreamCrowd';
  }, []);

  return (
    <ErrorBoundary variant="overlay" name={`overlay:${type}`}>
      <Suspense fallback={<OverlayLoading />}>{renderOverlay(type)}</Suspense>
    </ErrorBoundary>
  );
};

export default OverlayRouter;
