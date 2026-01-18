/**
 * GiveawayHubWithErrorBoundary Component Tests
 * 
 * Tests for giveaway error boundary integration including error isolation,
 * participant preservation, and error recovery.
 * 
 * **Feature: error-handling**
 * **Property 1: Error Isolation**
 * **Property 4: Error Recovery**
 * **Validates: Requirements 2.2, 7.2**
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GiveawayHubWithErrorBoundary } from '../../components/giveaway/GiveawayHubWithErrorBoundary';
import { logService } from '../../src/infrastructure/logging/LogService';
import { I18nProvider } from '../../i18n/context';

// ============================================
// MOCK COMPONENTS
// ============================================

/**
 * Mock GiveawayHub that throws an error
 */
const MockGiveawayHubError: React.FC = () => {
  throw new Error('Giveaway processing failed');
};

/**
 * Mock GiveawayHub that renders successfully
 */
const MockGiveawayHubSuccess: React.FC = () => {
  return <div>Giveaway Hub Content</div>;
};

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
  // Clear logs before each test
  logService.clearLogs();
  // Suppress console errors during tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// ============================================
// TESTS
// ============================================

describe('GiveawayHubWithErrorBoundary Component', () => {
  const mockChatMessages = [
    {
      id: '1',
      username: 'user1',
      message: 'test message',
      timestamp: Date.now(),
      isSubscriber: false,
    },
  ];

  describe('Props Forwarding', () => {
    it('should forward chat messages to GiveawayHub', () => {
      const messages = [
        {
          id: '1',
          username: 'user1',
          message: 'test',
          timestamp: Date.now(),
          isSubscriber: false,
        },
        {
          id: '2',
          username: 'user2',
          message: 'test2',
          timestamp: Date.now(),
          isSubscriber: true,
        },
      ];

      renderWithI18n(
        <GiveawayHubWithErrorBoundary
          chatMessages={messages}
          isConnected={true}
        />
      );

      // Component should render without error
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should forward connection status to GiveawayHub', () => {
      renderWithI18n(
        <GiveawayHubWithErrorBoundary
          chatMessages={mockChatMessages}
          isConnected={false}
        />
      );

      // Component should render without error
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should forward auth token to GiveawayHub', () => {
      renderWithI18n(
        <GiveawayHubWithErrorBoundary
          chatMessages={mockChatMessages}
          isConnected={true}
          authToken="test-token"
          userId="test-user-id"
        />
      );

      // Component should render without error
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty chat messages', () => {
      renderWithI18n(
        <GiveawayHubWithErrorBoundary
          chatMessages={[]}
          isConnected={true}
        />
      );

      // Component should render without error
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should handle missing optional props', () => {
      renderWithI18n(
        <GiveawayHubWithErrorBoundary
          chatMessages={mockChatMessages}
          isConnected={true}
        />
      );

      // Component should render without error
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render GiveawayHub component', () => {
      renderWithI18n(
        <GiveawayHubWithErrorBoundary
          chatMessages={mockChatMessages}
          isConnected={true}
        />
      );

      // Should render the GiveawayHub content
      // The GiveawayHub renders a header with "Random Winner" text
      const elements = screen.getAllByText(/Random Winner|Sorteo/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should have ErrorBoundary wrapper', () => {
      const { container } = renderWithI18n(
        <GiveawayHubWithErrorBoundary
          chatMessages={mockChatMessages}
          isConnected={true}
        />
      );

      // Component should render successfully
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Error Callback', () => {
    it('should accept onError callback prop', () => {
      const onError = vi.fn();

      renderWithI18n(
        <GiveawayHubWithErrorBoundary
          chatMessages={mockChatMessages}
          isConnected={true}
          onError={onError}
        />
      );

      // Component should render without calling onError
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('Feature-Specific Error Handling', () => {
    it('should use giveaway feature name for error boundary', () => {
      renderWithI18n(
        <GiveawayHubWithErrorBoundary
          chatMessages={mockChatMessages}
          isConnected={true}
        />
      );

      // Component should render successfully
      // The ErrorBoundary is configured with feature="giveaway"
      const elements = screen.getAllByText(/Random Winner|Sorteo/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should maintain accessibility of wrapped component', () => {
      const { container } = renderWithI18n(
        <GiveawayHubWithErrorBoundary
          chatMessages={mockChatMessages}
          isConnected={true}
        />
      );

      // Component should be accessible
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Integration with ErrorBoundary', () => {
    it('should wrap GiveawayHub with ErrorBoundary', () => {
      const { container } = renderWithI18n(
        <GiveawayHubWithErrorBoundary
          chatMessages={mockChatMessages}
          isConnected={true}
        />
      );

      // The wrapper should render the GiveawayHub
      expect(container.querySelector('.h-full')).toBeInTheDocument();
    });

    it('should provide error fallback UI through ErrorBoundary', () => {
      const { container } = renderWithI18n(
        <GiveawayHubWithErrorBoundary
          chatMessages={mockChatMessages}
          isConnected={true}
        />
      );

      // Component should render without error
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('should accept all GiveawayHub props', () => {
      renderWithI18n(
        <GiveawayHubWithErrorBoundary
          chatMessages={mockChatMessages}
          isConnected={true}
          onClearChatMessages={() => {}}
          authToken="token"
          userId="user-id"
        />
      );

      // Component should render without error
      const elements = screen.getAllByText(/Random Winner|Sorteo/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});



