/**
 * GiveawayErrorFallback Component Tests
 * 
 * Tests for giveaway-specific error fallback UI including retry, preserve participants,
 * details toggle, copy functionality, and i18n support.
 * 
 * **Feature: error-handling**
 * **Property 4: Error Recovery**
 * **Property 6: User-Friendly Messages**
 * **Validates: Requirements 2.5, 7.2**
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GiveawayErrorFallback } from '../../src/presentation/components/shared/GiveawayErrorFallback';
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

describe('GiveawayErrorFallback Component', () => {
  const mockError = new Error('Giveaway selection failed');
  mockError.stack = 'Error: Giveaway selection failed\n  at GiveawayHub (GiveawayHub.tsx:120:15)';

  const mockOnReset = vi.fn();
  const mockOnPreserveParticipants = vi.fn();

  describe('Rendering (Requirement 2.5)', () => {
    it('should render giveaway-specific error message', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Uses Spanish translation "Error en Sorteo"
      expect(screen.getByText(/error en sorteo/i)).toBeInTheDocument();
    });

    it('should display error description', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Uses feature-specific Spanish translation
      expect(screen.getByText(/ocurrió un error en el sorteo/i)).toBeInTheDocument();
    });

    it('should handle null error', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={null}
          onReset={mockOnReset}
        />
      );

      // Uses Spanish translation "Error en Sorteo"
      expect(screen.getByText(/error en sorteo/i)).toBeInTheDocument();
    });
  });

  describe('Participant Count Display (Requirement 7.2)', () => {
    it('should display participant count when provided', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
          participantCount={42}
        />
      );

      // Uses Spanish translation with participant count
      expect(screen.getByText(/42.*participantes/i)).toBeInTheDocument();
    });

    it('should use singular form for one participant', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
          participantCount={1}
        />
      );

      expect(screen.getByText(/1 participant/i)).toBeInTheDocument();
    });

    it('should not display participant count when zero', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
          participantCount={0}
        />
      );

      expect(screen.queryByText(/participants/i)).not.toBeInTheDocument();
    });

    it('should not display participant count when not provided', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      expect(screen.queryByText(/participants/i)).not.toBeInTheDocument();
    });
  });

  describe('Retry Button (Requirement 7.2)', () => {
    it('should render retry button', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should call onReset when retry button is clicked', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      fireEvent.click(retryButton);

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Preserve Participants Button (Requirement 7.2)', () => {
    it('should render preserve participants button when callback is provided', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onPreserveParticipants={mockOnPreserveParticipants}
          participantCount={10}
        />
      );

      // Uses Spanish translation "Mantener participantes"
      const preserveButton = screen.getByRole('button', { name: /mantener participantes/i });
      expect(preserveButton).toBeInTheDocument();
    });

    it('should not render preserve participants button when callback is not provided', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
          participantCount={10}
        />
      );

      const preserveButton = screen.queryByRole('button', { name: /mantener participantes/i });
      expect(preserveButton).not.toBeInTheDocument();
    });

    it('should not render preserve participants button when no participants', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onPreserveParticipants={mockOnPreserveParticipants}
          participantCount={0}
        />
      );

      const preserveButton = screen.queryByRole('button', { name: /mantener participantes/i });
      expect(preserveButton).not.toBeInTheDocument();
    });

    it('should call onPreserveParticipants when button is clicked', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onPreserveParticipants={mockOnPreserveParticipants}
          participantCount={10}
        />
      );

      const preserveButton = screen.getByRole('button', { name: /mantener participantes/i });
      fireEvent.click(preserveButton);

      expect(mockOnPreserveParticipants).toHaveBeenCalledTimes(1);
    });

    it('should have proper styling for preserve participants button', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onPreserveParticipants={mockOnPreserveParticipants}
          participantCount={10}
        />
      );

      const preserveButton = screen.getByRole('button', { name: /mantener participantes/i });
      expect(preserveButton).toHaveClass('border');
      expect(preserveButton).toHaveClass('text-red-700');
    });
  });

  describe('Details Toggle', () => {
    it('should render details toggle button', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      expect(detailsButton).toBeInTheDocument();
    });

    it('should show error details when details button is clicked', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      expect(screen.getByText('Giveaway selection failed')).toBeInTheDocument();
    });

    it('should show stack trace when details are expanded', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      expect(screen.getByText(/at GiveawayHub/)).toBeInTheDocument();
    });

    it('should toggle details visibility', () => {
      renderWithI18n(
        <GiveawayErrorFallback
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
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      expect(copyButton).toBeInTheDocument();
    });

    it('should copy giveaway error to clipboard', () => {
      const clipboardWriteText = vi.fn(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardWriteText,
        },
      });

      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      fireEvent.click(copyButton);

      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Giveaway Error')
      );
    });

    it('should include error message in copied text', () => {
      const clipboardWriteText = vi.fn(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardWriteText,
        },
      });

      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      fireEvent.click(copyButton);

      const copiedText = clipboardWriteText.mock.calls[0][0];
      expect(copiedText).toContain('Giveaway selection failed');
    });
  });

  describe('i18n Support', () => {
    it('should display Spanish error message', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Uses feature-specific Spanish translation
      expect(screen.getByText(/ocurrió un error en el sorteo/i)).toBeInTheDocument();
    });

    it('should display Spanish button labels', () => {
      renderWithI18n(
        <GiveawayErrorFallback
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
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onPreserveParticipants={mockOnPreserveParticipants}
          participantCount={10}
        />
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      expect(retryButton).toHaveAttribute('aria-label');

      // Uses Spanish translation "Mantener participantes"
      const preserveButton = screen.getByRole('button', { name: /mantener participantes/i });
      expect(preserveButton).toHaveAttribute('aria-label');

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      expect(detailsButton).toHaveAttribute('aria-label');
      expect(detailsButton).toHaveAttribute('aria-expanded');
    });
  });

  describe('Styling', () => {
    it('should have error styling classes', () => {
      const { container } = renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const errorContainer = container.querySelector('.bg-red-50');
      expect(errorContainer).toBeInTheDocument();
    });

    it('should have dark mode support', () => {
      const { container } = renderWithI18n(
        <GiveawayErrorFallback
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
        <GiveawayErrorFallback
          error={errorNoStack}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      // Uses Spanish translation "Sin traza de error disponible"
      expect(screen.getByText(/sin traza de error disponible/i)).toBeInTheDocument();
    });

    it('should handle very large participant count', () => {
      renderWithI18n(
        <GiveawayErrorFallback
          error={mockError}
          onReset={mockOnReset}
          participantCount={999999}
        />
      );

      // Uses Spanish translation with participant count
      expect(screen.getByText(/999999.*participantes/i)).toBeInTheDocument();
    });

    it('should handle multiple rapid clicks on details button', () => {
      renderWithI18n(
        <GiveawayErrorFallback
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
  });
});
