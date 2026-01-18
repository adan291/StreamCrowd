/**
 * ProtectedRoute Component Tests
 * 
 * Tests for Redux-based protected route component.
 * 
 * @requirements 5.4, 5.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ProtectedRoute } from '../../src/presentation/components/features/ProtectedRoute';
import authReducer from '../../src/application/state/slices/authSlice';

// Helper to create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        ...initialState,
      },
    },
  });
};

// Helper to render with Redux
const renderWithRedux = (
  component: React.ReactElement,
  initialState = {}
) => {
  const store = createTestStore(initialState);
  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store,
  };
};

const mockUser = {
  id: 'user123',
  username: 'testuser',
  email: 'test@example.com',
  platform: 'twitch' as const,
  avatar: 'https://example.com/avatar.jpg',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show default loading UI when loading', () => {
      renderWithRedux(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { isLoading: true }
      );
      
      expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
    });

    it('should show custom loading component when provided', () => {
      renderWithRedux(
        <ProtectedRoute loadingComponent={<div>Custom Loading</div>}>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { isLoading: true }
      );
      
      expect(screen.getByText('Custom Loading')).toBeInTheDocument();
      expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });
  });

  describe('Unauthenticated State', () => {
    it('should show default auth required message when not authenticated', () => {
      renderWithRedux(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );
      
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('You need to be logged in to access this content.')).toBeInTheDocument();
    });

    it('should show custom fallback when provided', () => {
      renderWithRedux(
        <ProtectedRoute fallback={<div>Custom Fallback</div>}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );
      
      expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });

    it('should not render protected content when not authenticated', () => {
      renderWithRedux(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );
      
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should call onAuthRequired callback when not authenticated', async () => {
      const onAuthRequired = vi.fn();
      
      renderWithRedux(
        <ProtectedRoute onAuthRequired={onAuthRequired}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );
      
      await waitFor(() => {
        expect(onAuthRequired).toHaveBeenCalledTimes(1);
      });
    });

    it('should show login button when onAuthRequired is provided', () => {
      const onAuthRequired = vi.fn();
      
      renderWithRedux(
        <ProtectedRoute onAuthRequired={onAuthRequired}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );
      
      expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument();
    });
  });

  describe('Authenticated State', () => {
    it('should render protected content when authenticated', () => {
      renderWithRedux(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          user: mockUser,
        }
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should not show auth required message when authenticated', () => {
      renderWithRedux(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          user: mockUser,
        }
      );
      
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });

    it('should not call onAuthRequired when authenticated', async () => {
      const onAuthRequired = vi.fn();
      
      renderWithRedux(
        <ProtectedRoute onAuthRequired={onAuthRequired}>
          <div>Protected Content</div>
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          user: mockUser,
        }
      );
      
      // Wait a bit to ensure callback is not called
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onAuthRequired).not.toHaveBeenCalled();
    });
  });

  describe('Platform Requirements', () => {
    it('should render content when platform matches', () => {
      renderWithRedux(
        <ProtectedRoute requirePlatform="twitch">
          <div>Protected Content</div>
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          user: mockUser,
        }
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should show platform mismatch message when platform does not match', () => {
      renderWithRedux(
        <ProtectedRoute requirePlatform="youtube">
          <div>Protected Content</div>
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          user: mockUser,
        }
      );
      
      expect(screen.getByText('Platform Mismatch')).toBeInTheDocument();
      expect(screen.getByText(/This content requires authentication with/)).toBeInTheDocument();
      expect(screen.getByText(/youtube/)).toBeInTheDocument();
    });

    it('should not render content when platform does not match', () => {
      renderWithRedux(
        <ProtectedRoute requirePlatform="youtube">
          <div>Protected Content</div>
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          user: mockUser,
        }
      );
      
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show current platform in mismatch message', () => {
      renderWithRedux(
        <ProtectedRoute requirePlatform="youtube">
          <div>Protected Content</div>
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          user: mockUser,
        }
      );
      
      expect(screen.getByText(/You are currently logged in with/)).toBeInTheDocument();
      expect(screen.getByText(/twitch/)).toBeInTheDocument();
    });
  });

  describe('Children Rendering', () => {
    it('should render multiple children', () => {
      renderWithRedux(
        <ProtectedRoute>
          <div>Child 1</div>
          <div>Child 2</div>
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          user: mockUser,
        }
      );
      
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });

    it('should render complex component trees', () => {
      const ComplexComponent = () => (
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back!</p>
        </div>
      );
      
      renderWithRedux(
        <ProtectedRoute>
          <ComplexComponent />
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          user: mockUser,
        }
      );
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome back!')).toBeInTheDocument();
    });
  });

  describe('Redux Integration', () => {
    it('should react to authentication state changes', () => {
      const { rerender } = renderWithRedux(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );
      
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      
      // Simulate login
      const store = createTestStore({
        isAuthenticated: true,
        user: mockUser,
      });
      
      rerender(
        <Provider store={store}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </Provider>
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should react to logout', () => {
      const { rerender } = renderWithRedux(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        {
          isAuthenticated: true,
          user: mockUser,
        }
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      
      // Simulate logout
      const store = createTestStore({
        isAuthenticated: false,
        user: null,
      });
      
      rerender(
        <Provider store={store}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </Provider>
      );
      
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user gracefully', () => {
      renderWithRedux(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        {
          isAuthenticated: false,
          user: null,
        }
      );
      
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });

    it('should not call onAuthRequired multiple times', async () => {
      const onAuthRequired = vi.fn();
      
      const { rerender } = renderWithRedux(
        <ProtectedRoute onAuthRequired={onAuthRequired}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );
      
      await waitFor(() => {
        expect(onAuthRequired).toHaveBeenCalledTimes(1);
      });
      
      // Rerender with same state
      rerender(
        <Provider store={createTestStore()}>
          <ProtectedRoute onAuthRequired={onAuthRequired}>
            <div>Protected Content</div>
          </ProtectedRoute>
        </Provider>
      );
      
      // Should still only be called once
      expect(onAuthRequired).toHaveBeenCalledTimes(1);
    });
  });
});
