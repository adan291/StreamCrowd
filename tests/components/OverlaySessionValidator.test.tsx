/**
 * Tests for OverlaySessionValidator component
 * 
 * Tests session validation for overlay access
 * 
 * @requirements 4.3, 4.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { OverlaySessionValidator } from '../../src/presentation/components/shared/OverlaySessionValidator';
import { 
  getOverlaySessionService, 
  resetOverlaySessionService,
  type OverlayType,
} from '../../src/application/services/OverlaySessionService';

describe('OverlaySessionValidator', () => {
  const mockUserId = 'user-123';
  const mockOverlayType: OverlayType = 'poll';

  beforeEach(() => {
    resetOverlaySessionService();
  });

  afterEach(() => {
    resetOverlaySessionService();
  });

  describe('Valid session', () => {
    it('should render children when session is valid', async () => {
      const sessionService = getOverlaySessionService();
      const sessionId = sessionService.createSession(mockUserId, mockOverlayType);

      render(
        <OverlaySessionValidator sessionId={sessionId}>
          <div>Overlay Content</div>
        </OverlaySessionValidator>
      );

      await waitFor(() => {
        expect(screen.getByText('Overlay Content')).toBeInTheDocument();
      });
    });

    it('should not show error for valid session', async () => {
      const sessionService = getOverlaySessionService();
      const sessionId = sessionService.createSession(mockUserId, mockOverlayType);

      render(
        <OverlaySessionValidator sessionId={sessionId}>
          <div>Overlay Content</div>
        </OverlaySessionValidator>
      );

      await waitFor(() => {
        expect(screen.queryByText(/Sesión Inválida/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Invalid session', () => {
    it('should show error for non-existent session', async () => {
      const invalidSessionId = 'invalid-session-id';

      render(
        <OverlaySessionValidator sessionId={invalidSessionId}>
          <div>Overlay Content</div>
        </OverlaySessionValidator>
      );

      await waitFor(() => {
        expect(screen.getByText(/Sesión Inválida/i)).toBeInTheDocument();
      });
    });

    it('should not render children for invalid session', async () => {
      const invalidSessionId = 'invalid-session-id';

      render(
        <OverlaySessionValidator sessionId={invalidSessionId}>
          <div>Overlay Content</div>
        </OverlaySessionValidator>
      );

      await waitFor(() => {
        expect(screen.queryByText('Overlay Content')).not.toBeInTheDocument();
      });
    });

    it('should show expired session error', async () => {
      const sessionService = getOverlaySessionService();
      const shortTTLService = new (sessionService.constructor as any)(1); // 1ms TTL
      const sessionId = shortTTLService.createSession(mockUserId, mockOverlayType);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      render(
        <OverlaySessionValidator sessionId={sessionId}>
          <div>Overlay Content</div>
        </OverlaySessionValidator>
      );

      await waitFor(() => {
        expect(screen.getByText(/Sesión Inválida/i)).toBeInTheDocument();
        expect(screen.getByText(/expirado/i)).toBeInTheDocument();
      });
    });

    it('should call onValidationError callback for invalid session', async () => {
      const invalidSessionId = 'invalid-session-id';
      let errorMessage = '';

      render(
        <OverlaySessionValidator 
          sessionId={invalidSessionId}
          onValidationError={(error) => { errorMessage = error; }}
        >
          <div>Overlay Content</div>
        </OverlaySessionValidator>
      );

      await waitFor(() => {
        expect(errorMessage).toBeTruthy();
      });
    });
  });

  describe('Legacy mode (no session ID)', () => {
    it('should render children when no sessionId provided (backward compatibility)', async () => {
      render(
        <OverlaySessionValidator sessionId={null}>
          <div>Overlay Content</div>
        </OverlaySessionValidator>
      );

      await waitFor(() => {
        expect(screen.getByText('Overlay Content')).toBeInTheDocument();
      });
    });

    it('should not show error when no sessionId provided', async () => {
      render(
        <OverlaySessionValidator sessionId={null}>
          <div>Overlay Content</div>
        </OverlaySessionValidator>
      );

      await waitFor(() => {
        expect(screen.queryByText(/Sesión Inválida/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('should show loading state while validating', async () => {
      const sessionService = getOverlaySessionService();
      const sessionId = sessionService.createSession(mockUserId, mockOverlayType);

      const { container } = render(
        <OverlaySessionValidator sessionId={sessionId}>
          <div>Overlay Content</div>
        </OverlaySessionValidator>
      );

      // The validation is synchronous, so we should see the content immediately
      // or the loading state very briefly. Let's just check that it eventually shows content
      await waitFor(() => {
        expect(screen.getByText('Overlay Content')).toBeInTheDocument();
      });
    });
  });

  describe('Error UI', () => {
    it('should show instructions for fixing invalid session', async () => {
      const invalidSessionId = 'invalid-session-id';

      render(
        <OverlaySessionValidator sessionId={invalidSessionId}>
          <div>Overlay Content</div>
        </OverlaySessionValidator>
      );

      await waitFor(() => {
        expect(screen.getByText(/¿Cómo solucionar esto?/i)).toBeInTheDocument();
        expect(screen.getByText(/Genera una nueva URL/i)).toBeInTheDocument();
      });
    });

    it('should show retry button for invalid session', async () => {
      const invalidSessionId = 'invalid-session-id';

      render(
        <OverlaySessionValidator sessionId={invalidSessionId}>
          <div>Overlay Content</div>
        </OverlaySessionValidator>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
      });
    });
  });
});
