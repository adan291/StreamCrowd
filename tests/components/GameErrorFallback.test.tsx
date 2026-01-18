/**
 * GameErrorFallback Component Tests
 * 
 * Tests for game-specific error fallback UI including retry, return to selector,
 * reset game state, details toggle, copy functionality, and i18n support.
 * 
 * **Feature: error-handling**
 * **Property 4: Error Recovery**
 * **Property 6: User-Friendly Messages**
 * **Validates: Requirements 2.5, 7.3**
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameErrorFallback } from '../../src/presentation/components/shared/GameErrorFallback';
import { I18nProvider } from '../../i18n/context';

// ============================================
// SETUP
// ============================================

/**
 * Render component with I18nProvider
 */
function renderWithI18n(component: React.ReactElement) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  );
}

beforeEach(() => {
  // Mock clipboard API
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn(() => Promise.resolve()),
    },
  });
});

// ============================================
// TESTS
// ============================================

describe('GameErrorFallback Component', () => {
  const mockError = new Error('Game initialization failed');
  mockError.stack = 'Error: Game initialization failed\n  at PiumGame (PiumGame.tsx:50:8)';

  const mockOnReset = vi.fn();
  const mockOnReturnToSelector = vi.fn();
  const mockOnResetGameState = vi.fn();

  describe('Rendering (Requirement 2.5)', () => {
    it('should render game-specific error message', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Uses Spanish translation "Error en Juego"
      expect(screen.getByText(/error en juego/i)).toBeInTheDocument();
    });

    it('should display game name in error message when provided', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          gameName="Pium Ball"
          onReset={mockOnReset}
        />
      );

      // Game name is displayed with "Error" suffix
      expect(screen.getByText(/pium ball.*error/i)).toBeInTheDocument();
    });

    it('should display error description', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Uses feature-specific Spanish translation
      expect(screen.getByText(/ocurrió un error en el juego|algo salió mal|something went wrong/i)).toBeInTheDocument();
    });

    it('should handle null error', () => {
      renderWithI18n(
        <GameErrorFallback
          error={null}
          onReset={mockOnReset}
        />
      );

      // Uses Spanish translation "Error en Juego"
      expect(screen.getByText(/error en juego|game.*error/i)).toBeInTheDocument();
    });

    it('should handle missing game name', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText(/error en juego|game.*error/i)).toBeInTheDocument();
    });
  });

  describe('Retry Button (Requirement 7.3)', () => {
    it('should render retry button', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should call onReset when retry button is clicked', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      fireEvent.click(retryButton);

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Return to Selector Button (Requirement 7.3)', () => {
    it('should render return to selector button when callback is provided', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onReturnToSelector={mockOnReturnToSelector}
        />
      );

      // Uses Spanish translation "Volver a juegos"
      const backButton = screen.getByRole('button', { name: /volver a juegos/i });
      expect(backButton).toBeInTheDocument();
    });

    it('should not render return to selector button when callback is not provided', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const backButton = screen.queryByRole('button', { name: /volver a juegos/i });
      expect(backButton).not.toBeInTheDocument();
    });

    it('should call onReturnToSelector when button is clicked', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onReturnToSelector={mockOnReturnToSelector}
        />
      );

      const backButton = screen.getByRole('button', { name: /volver a juegos/i });
      fireEvent.click(backButton);

      expect(mockOnReturnToSelector).toHaveBeenCalledTimes(1);
    });

    it('should have proper styling for return to selector button', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onReturnToSelector={mockOnReturnToSelector}
        />
      );

      const backButton = screen.getByRole('button', { name: /volver a juegos/i });
      expect(backButton).toHaveClass('border');
      expect(backButton).toHaveClass('text-red-700');
    });
  });

  describe('Reset Game State Button (Requirement 7.3)', () => {
    it('should render reset game state button when callback is provided', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onResetGameState={mockOnResetGameState}
        />
      );

      // Uses Spanish translation "Reiniciar juego"
      const resetButton = screen.getByRole('button', { name: /reiniciar juego/i });
      expect(resetButton).toBeInTheDocument();
    });

    it('should not render reset game state button when callback is not provided', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const resetButton = screen.queryByRole('button', { name: /reiniciar juego/i });
      expect(resetButton).not.toBeInTheDocument();
    });

    it('should call onResetGameState when button is clicked', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onResetGameState={mockOnResetGameState}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reiniciar juego/i });
      fireEvent.click(resetButton);

      expect(mockOnResetGameState).toHaveBeenCalledTimes(1);
    });

    it('should have proper styling for reset game state button', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onResetGameState={mockOnResetGameState}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reiniciar juego/i });
      expect(resetButton).toHaveClass('border');
      expect(resetButton).toHaveClass('text-red-700');
    });
  });

  describe('Details Toggle', () => {
    it('should render details toggle button', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      expect(detailsButton).toBeInTheDocument();
    });

    it('should show error details when details button is clicked', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      expect(screen.getByText('Game initialization failed')).toBeInTheDocument();
    });

    it('should show stack trace when details are expanded', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      expect(screen.getByText(/at PiumGame/)).toBeInTheDocument();
    });

    it('should toggle details visibility', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });

      expect(detailsButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(detailsButton);
      expect(detailsButton).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(detailsButton);
      expect(detailsButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Copy Functionality', () => {
    it('should render copy button when details are expanded', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      expect(copyButton).toBeInTheDocument();
    });

    it('should copy game error to clipboard', () => {
      const clipboardWriteText = vi.fn(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardWriteText,
        },
      });

      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          gameName="Pium Ball"
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      fireEvent.click(copyButton);

      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Game Error')
      );
    });

    it('should include game name in copied text when provided', () => {
      const clipboardWriteText = vi.fn(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardWriteText,
        },
      });

      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          gameName="Pium Ball"
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      fireEvent.click(copyButton);

      const copiedText = clipboardWriteText.mock.calls[0][0];
      expect(copiedText).toContain('Pium Ball');
    });

    it('should include error message in copied text', () => {
      const clipboardWriteText = vi.fn(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardWriteText,
        },
      });

      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      fireEvent.click(copyButton);

      const copiedText = clipboardWriteText.mock.calls[0][0];
      expect(copiedText).toContain('Game initialization failed');
    });
  });

  describe('i18n Support', () => {
    it('should display Spanish error message', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Uses feature-specific Spanish translation
      expect(screen.getByText(/ocurrió un error en el juego/i)).toBeInTheDocument();
    });

    it('should display Spanish button labels', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /detalles/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onReturnToSelector={mockOnReturnToSelector}
          onResetGameState={mockOnResetGameState}
        />
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      expect(retryButton).toHaveAttribute('aria-label');

      // Uses Spanish translation "Volver a juegos"
      const backButton = screen.getByRole('button', { name: /volver a juegos/i });
      expect(backButton).toHaveAttribute('aria-label');

      // Uses Spanish translation "Reiniciar juego"
      const resetButton = screen.getByRole('button', { name: /reiniciar juego/i });
      expect(resetButton).toHaveAttribute('aria-label');

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      expect(detailsButton).toHaveAttribute('aria-label');
      expect(detailsButton).toHaveAttribute('aria-expanded');
    });
  });

  describe('Styling', () => {
    it('should have error styling classes', () => {
      const { container } = renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const errorContainer = container.querySelector('.bg-red-50');
      expect(errorContainer).toBeInTheDocument();
    });

    it('should have dark mode support', () => {
      const { container } = renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const errorContainer = container.querySelector('.dark\\:bg-red-900\\/20');
      expect(errorContainer).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle error with no stack trace', () => {
      const errorNoStack = new Error('No stack error');
      errorNoStack.stack = undefined;

      renderWithI18n(
        <GameErrorFallback
          error={errorNoStack}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      // Uses Spanish translation "Sin traza de error disponible"
      expect(screen.getByText(/sin traza de error disponible/i)).toBeInTheDocument();
    });

    it('should handle very long game name', () => {
      const longGameName = 'A'.repeat(100);

      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          gameName={longGameName}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText(new RegExp(longGameName))).toBeInTheDocument();
    });

    it('should handle multiple rapid clicks on details button', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });

      fireEvent.click(detailsButton);
      fireEvent.click(detailsButton);
      fireEvent.click(detailsButton);

      expect(detailsButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should handle all callbacks being provided', () => {
      renderWithI18n(
        <GameErrorFallback
          error={mockError}
          gameName="Test Game"
          onReset={mockOnReset}
          onReturnToSelector={mockOnReturnToSelector}
          onResetGameState={mockOnResetGameState}
        />
      );

      // Should render all buttons with Spanish translations
      expect(screen.getByRole('button', { name: /reintentar|retry/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /volver a juegos/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reiniciar juego/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /detalles|details/i })).toBeInTheDocument();
    });
  });
});
