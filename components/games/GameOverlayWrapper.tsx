/**
 * Game Overlay Wrapper Component
 * 
 * Wraps game overlay components with ErrorBoundary for error isolation.
 * Provides game-specific error recovery options.
 * 
 * Requirements: 2.3, 2.4
 */

import React from 'react';
import { ErrorBoundary } from '../../src/presentation/components/shared/ErrorBoundary';
import { GameErrorFallback } from '../../src/presentation/components/shared/GameErrorFallback';

interface GameOverlayWrapperProps {
  children: React.ReactNode;
  gameName: string;
  gameId: string;
}

/**
 * GameOverlayWrapper - Wraps game overlays with error handling
 * 
 * Features:
 * - Catches errors in game overlays
 * - Displays game-specific error UI
 * - Provides recovery options
 * - Logs errors for debugging
 * 
 * @example
 * <GameOverlayWrapper gameName="Billar" gameId="pium">
 *   <PiumOverlay />
 * </GameOverlayWrapper>
 */
export const GameOverlayWrapper: React.FC<GameOverlayWrapperProps> = ({
  children,
  gameName,
  gameId,
}) => {
  const handleReset = () => {
    // Reload the overlay
    window.location.reload();
  };

  const handleReturnToSelector = () => {
    // Close the overlay and return to game selector
    window.close();
  };

  return (
    <ErrorBoundary
      feature={`overlay-${gameId}`}
      fallback={
        <div className="w-screen h-screen flex items-center justify-center bg-black">
          <GameErrorFallback
            error={new Error(`Error loading ${gameName} overlay`)}
            gameName={gameName}
            onReset={handleReset}
            onReturnToSelector={handleReturnToSelector}
          />
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

GameOverlayWrapper.displayName = 'GameOverlayWrapper';
