/**
 * ErrorFallback Component Tests
 * 
 * Tests for error fallback UI including retry, details toggle,
 * copy functionality, and i18n support.
 * 
 * **Feature: error-handling**
 * **Property 4: Error Recovery**
 * **Property 6: User-Friendly Messages**
 * **Validates: Requirements 1.3, 5.1, 5.2, 5.3, 5.5**
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorFallback } from '../../src/presentation/components/shared/ErrorFallback';
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

describe('ErrorFallback Component', () => {
  const mockError = new Error('Test error message');
  mockError.stack = 'Error: Test error message\n  at TestComponent (test.tsx:10:5)';

  const mockOnReset = vi.fn();

  describe('Rendering (Requirement 5.2)', () => {
    it('should render error message', () => {
      renderWithI18n(
        <ErrorFallback
          feature="polls"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should display feature name in error message', () => {
      renderWithI18n(
        <ErrorFallback
          feature="giveaway"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText(/giveaway/i)).toBeInTheDocument();
    });

    it('should display error description', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Should show user-friendly description
      expect(screen.getByText(/algo salió mal|something went wrong/i)).toBeInTheDocument();
    });

    it('should handle missing feature name', () => {
      renderWithI18n(
        <ErrorFallback
          error={mockError}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should handle null error', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={null}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('Retry Button (Requirement 1.3, 5.3)', () => {
    it('should render retry button', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should call onReset when retry button is clicked', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      fireEvent.click(retryButton);

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });

    it('should have proper styling for retry button', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      expect(retryButton).toHaveClass('bg-red-600');
      expect(retryButton).toHaveClass('text-white');
    });
  });

  describe('Details Toggle (Requirement 5.5)', () => {
    it('should render details toggle button', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      expect(detailsButton).toBeInTheDocument();
    });

    it('should show error details when details button is clicked', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      // Should show error message in details
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should show stack trace when details are expanded', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      // Should show stack trace
      expect(screen.getByText(/at TestComponent/)).toBeInTheDocument();
    });

    it('should toggle details visibility', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });

      // Initially collapsed
      expect(detailsButton).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      fireEvent.click(detailsButton);
      expect(detailsButton).toHaveAttribute('aria-expanded', 'true');

      // Click to collapse
      fireEvent.click(detailsButton);
      expect(detailsButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should rotate chevron icon when details are toggled', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      const chevron = detailsButton.querySelector('svg');

      // Initially not rotated
      expect(chevron).toHaveClass('transition-transform');

      // Click to expand
      fireEvent.click(detailsButton);
      expect(chevron).toHaveClass('rotate-180');

      // Click to collapse
      fireEvent.click(detailsButton);
      expect(chevron).not.toHaveClass('rotate-180');
    });

    it('should handle error with no stack trace', () => {
      const errorNoStack = new Error('No stack error');
      errorNoStack.stack = undefined;

      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={errorNoStack}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      // Should show fallback message (Spanish translation)
      expect(screen.getByText(/sin traza de error disponible/i)).toBeInTheDocument();
    });
  });

  describe('Copy Functionality (Requirement 5.5)', () => {
    it('should render copy button when details are expanded', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      expect(copyButton).toBeInTheDocument();
    });

    it('should copy error to clipboard when copy button is clicked', () => {
      const clipboardWriteText = vi.fn(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardWriteText,
        },
      });

      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      fireEvent.click(copyButton);

      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Test error message')
      );
    });

    it('should include stack trace in copied text', () => {
      const clipboardWriteText = vi.fn(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardWriteText,
        },
      });

      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      fireEvent.click(copyButton);

      const copiedText = clipboardWriteText.mock.calls[0][0];
      expect(copiedText).toContain('Test error message');
      expect(copiedText).toContain('at TestComponent');
    });

    it('should handle clipboard errors gracefully', () => {
      const clipboardWriteText = vi.fn(() => Promise.reject(new Error('Clipboard error')));
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardWriteText,
        },
      });

      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      const copyButton = screen.getByRole('button', { name: /copy|copiar/i });
      
      // Should not throw
      expect(() => fireEvent.click(copyButton)).not.toThrow();
    });
  });

  describe('i18n Support (Requirement 5.1)', () => {
    it('should display Spanish error message', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Spanish locale is default
      expect(screen.getByText(/algo salió mal/i)).toBeInTheDocument();
    });

    it('should display Spanish button labels', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /detalles/i })).toBeInTheDocument();
    });

    it('should translate feature name in error message', () => {
      renderWithI18n(
        <ErrorFallback
          feature="polls"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Feature name should be interpolated
      expect(screen.getByText(/polls/i)).toBeInTheDocument();
    });

    it('should handle unknown feature name', () => {
      renderWithI18n(
        <ErrorFallback
          feature={undefined}
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Should show "unknown" or similar
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const retryButton = screen.getByRole('button', { name: /reintentar|retry/i });
      expect(retryButton).toHaveAttribute('aria-label');

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      expect(detailsButton).toHaveAttribute('aria-label');
      expect(detailsButton).toHaveAttribute('aria-expanded');
    });

    it('should have proper semantic HTML', () => {
      const { container } = renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      // Should have proper heading
      const heading = container.querySelector('h3');
      expect(heading).toBeInTheDocument();

      // Should have proper button elements
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Styling', () => {
    it('should have error styling classes', () => {
      const { container } = renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const errorContainer = container.querySelector('.bg-red-50');
      expect(errorContainer).toBeInTheDocument();
    });

    it('should have dark mode support', () => {
      const { container } = renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const errorContainer = container.querySelector('.dark\\:bg-red-900\\/20');
      expect(errorContainer).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long error messages', () => {
      const longError = new Error('A'.repeat(500));

      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={longError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      // Should display long message (appears in both message and stack trace)
      expect(screen.getAllByText(new RegExp('A{500}'))).toHaveLength(2);
    });

    it('should handle special characters in error message', () => {
      const specialError = new Error('Error: <script>alert("xss")</script>');

      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={specialError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });
      fireEvent.click(detailsButton);

      // Should display as text, not execute (appears in both message and stack trace)
      expect(screen.getAllByText(/script/)).toHaveLength(2);
    });

    it('should handle multiple rapid clicks on details button', () => {
      renderWithI18n(
        <ErrorFallback
          feature="test"
          error={mockError}
          onReset={mockOnReset}
        />
      );

      const detailsButton = screen.getByRole('button', { name: /detalles|details/i });

      // Rapid clicks
      fireEvent.click(detailsButton);
      fireEvent.click(detailsButton);
      fireEvent.click(detailsButton);

      // Should end in expanded state (odd number of clicks)
      expect(detailsButton).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
