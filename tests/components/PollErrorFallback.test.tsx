/**
 * PollErrorFallback Component Tests
 * 
 * Tests for poll-specific error fallback UI including retry, clear data,
 * details toggle, copy functionality, and i18n support.
 * 
 * **Feature: error-handling**
 * **Property 4: Error Recovery**
 * **Property 6: User-Friendly Messages**
 * **Validates: Requirements 2.5, 7.1**
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PollErrorFallback } from '../../src/presentation/components/shared/PollErrorFallback';
import { I18nProvider } from '../../i18n/context';

// ============================================
// SETUP
// ============================================

/**
 * Render component with I18nProvider set to Spanish locale
 */
function renderWithI18n(component: React.ReactElement) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  );
}

beforeEach(() => {
  // Mock localStorage to return Spanish locale
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
    if (key === 'twitch_vote_locale') {
      return 'es';
    }
    return null;
  });

  // Mock clipboard API
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn(() => Promise.resolve()),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('PollErrorFallback Component', () => {
  const mockError = new Error('Poll creation failed');
  mockError.stack = 'Error: Poll creation failed\n  at PollCreator (PollCreator.tsx:45:10)';

  const mockOnReset = vi.fn();
  const mockOnClearData = vi.fn();

  describe('Rendering (Requirement 2.5)', () => {
    it('should render poll-specific error message', () => {
      renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Uses Spanish translation "Error en Encuesta"
      expect(screen.getByText(/error en encuesta/i)).toBeInTheDocument();
    });

    it('should display error description', () => {
      renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Uses feature-specific Spanish translation
      expect(screen.getByText(/ocurrió un error en la encuesta/i)).toBeInTheDocument();
    });

    it('should handle null error', () => {
      renderWithI18n(
        <PollErrorFallback
          error={null}
          onReset={mockOnReset}
        />
      );

      // Uses Spanish translation "Error en Encuesta"
      expect(screen.getByText(/error en encuesta/i)).toBeInTheDocument();
    });
  });

  describe('Retry Button (Requirement 7.1)', () => {
    it('should render retry button', () => {
      renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should call onReset when retry button is clicked', () => {
      renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      fireEvent.click(retryButton);

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Clear Data Button (Requirement 7.1)', () => {
    it('should render clear data button when callback is provided', () => {
      renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onClearData={mockOnClearData}
        />
      );

      // Uses Spanish translation "Limpiar datos"
      const clearButton = screen.getByRole('button', { name: /limpiar datos/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should not render clear data button when callback is not provided', () => {
      renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const clearButton = screen.queryByRole('button', { name: /limpiar datos/i });
      expect(clearButton).not.toBeInTheDocument();
    });

    it('should call onClearData when clear data button is clicked', () => {
      renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onClearData={mockOnClearData}
        />
      );

      const clearButton = screen.getByRole('button', { name: /limpiar datos/i });
      fireEvent.click(clearButton);

      expect(mockOnClearData).toHaveBeenCalledTimes(1);
    });

    it('should have proper styling for clear data button', () => {
      renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onClearData={mockOnClearData}
        />
      );

      const clearButton = screen.getByRole('button', { name: /limpiar datos/i });
      expect(clearButton).toHaveClass('border');
      expect(clearButton).toHaveClass('text-red-700');
    });
  });

  describe('Details Toggle', () => {
    it('should render details toggle button', () => {
      renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      expect(detailsButton).toBeInTheDocument();
    });

    it('should show error details when details button is clicked', () => {
      renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      expect(screen.getByText('Poll creation failed')).toBeInTheDocument();
    });

    it('should show stack trace when details are expanded', () => {
      renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      expect(screen.getByText(/at PollCreator/)).toBeInTheDocument();
    });

    it('should toggle details visibility', () => {
      renderWithI18n(
        <PollErrorFallback
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
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      expect(copyButton).toBeInTheDocument();
    });

    it('should copy poll error to clipboard', () => {
      const clipboardWriteText = vi.fn(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardWriteText,
        },
      });

      renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      fireEvent.click(copyButton);

      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Poll Error')
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
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      fireEvent.click(copyButton);

      const copiedText = clipboardWriteText.mock.calls[0][0];
      expect(copiedText).toContain('Poll creation failed');
    });
  });

  describe('i18n Support', () => {
    it('should display Spanish error message', () => {
      renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Now uses feature-specific Spanish translation
      expect(screen.getByText(/ocurrió un error en la encuesta/i)).toBeInTheDocument();
    });

    it('should display Spanish button labels', () => {
      renderWithI18n(
        <PollErrorFallback
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
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
          onClearData={mockOnClearData}
        />
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      expect(retryButton).toHaveAttribute('aria-label');

      // Uses Spanish translation "Limpiar datos"
      const clearButton = screen.getByRole('button', { name: /limpiar datos/i });
      expect(clearButton).toHaveAttribute('aria-label');

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      expect(detailsButton).toHaveAttribute('aria-label');
      expect(detailsButton).toHaveAttribute('aria-expanded');
    });
  });

  describe('Styling', () => {
    it('should have error styling classes', () => {
      const { container } = renderWithI18n(
        <PollErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const errorContainer = container.querySelector('.bg-red-50');
      expect(errorContainer).toBeInTheDocument();
    });

    it('should have dark mode support', () => {
      const { container } = renderWithI18n(
        <PollErrorFallback
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
        <PollErrorFallback
          error={errorNoStack}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      // Uses Spanish translation "Sin traza de error disponible"
      expect(screen.getByText(/sin traza de error disponible/i)).toBeInTheDocument();
    });

    it('should handle very long error messages', () => {
      const longError = new Error('A'.repeat(500));

      renderWithI18n(
        <PollErrorFallback
          error={longError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      expect(screen.getAllByText(new RegExp('A{500}'))).toHaveLength(2);
    });

    it('should handle multiple rapid clicks on details button', () => {
      renderWithI18n(
        <PollErrorFallback
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
