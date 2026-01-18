/**
 * UserProfile Component Tests
 * 
 * Tests for Redux-based user profile component.
 * 
 * @requirements 5.4, 5.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { UserProfile } from '../../src/presentation/components/features/UserProfile';
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

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering States', () => {
    it('should show loading state', () => {
      renderWithRedux(<UserProfile />, { isLoading: true });
      
      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });

    it('should show not logged in message when not authenticated', () => {
      renderWithRedux(<UserProfile />);
      
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    it('should render compact view by default', () => {
      renderWithRedux(<UserProfile />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('twitch')).toBeInTheDocument();
      // Should not show detailed info in compact view
      expect(screen.queryByText('User ID')).not.toBeInTheDocument();
    });

    it('should render detailed view when detailed prop is true', () => {
      renderWithRedux(<UserProfile detailed={true} />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('User ID')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Member Since')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = renderWithRedux(
        <UserProfile className="custom-class" />,
        {
          isAuthenticated: true,
          user: mockUser,
        }
      );
      
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('User Information Display', () => {
    it('should display username', () => {
      renderWithRedux(<UserProfile />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should display platform', () => {
      renderWithRedux(<UserProfile />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      expect(screen.getByText('twitch')).toBeInTheDocument();
    });

    it('should display avatar image when available', () => {
      renderWithRedux(<UserProfile />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      const avatar = screen.getByAltText('testuser') as HTMLImageElement;
      expect(avatar).toBeInTheDocument();
      expect(avatar.src).toBe('https://example.com/avatar.jpg');
    });

    it('should display fallback avatar when no image', () => {
      renderWithRedux(<UserProfile />, {
        isAuthenticated: true,
        user: { ...mockUser, avatar: undefined },
      });
      
      // Should show first letter of username
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should display email in detailed view', () => {
      renderWithRedux(<UserProfile detailed={true} />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display user ID in detailed view', () => {
      renderWithRedux(<UserProfile detailed={true} />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      expect(screen.getByText('user123')).toBeInTheDocument();
    });

    it('should display formatted creation date in detailed view', () => {
      renderWithRedux(<UserProfile detailed={true} />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      expect(screen.getByText('January 1, 2024')).toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    it('should show logout button', () => {
      renderWithRedux(<UserProfile />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      const logoutButton = screen.getByTitle('Logout');
      expect(logoutButton).toBeInTheDocument();
    });

    it('should call onLogout callback when logout is clicked', () => {
      const onLogout = vi.fn();
      
      renderWithRedux(<UserProfile onLogout={onLogout} />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      const logoutButton = screen.getByTitle('Logout');
      fireEvent.click(logoutButton);
      
      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('should dispatch logout action when logout is clicked', () => {
      const { store } = renderWithRedux(<UserProfile />, {
        isAuthenticated: true,
        user: mockUser,
        token: 'test-token',
      });
      
      const logoutButton = screen.getByTitle('Logout');
      fireEvent.click(logoutButton);
      
      const state = store.getState();
      expect(state.auth.isAuthenticated).toBe(false);
      expect(state.auth.user).toBeNull();
      expect(state.auth.token).toBeNull();
    });

    it('should show logout button in detailed view', () => {
      renderWithRedux(<UserProfile detailed={true} />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing username gracefully', () => {
      renderWithRedux(<UserProfile />, {
        isAuthenticated: true,
        user: { ...mockUser, username: undefined },
      });
      
      expect(screen.getByText('Unknown User')).toBeInTheDocument();
    });

    it('should handle missing platform gracefully', () => {
      renderWithRedux(<UserProfile />, {
        isAuthenticated: true,
        user: { ...mockUser, platform: undefined },
      });
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.queryByText('twitch')).not.toBeInTheDocument();
    });

    it('should not show email section if email is missing', () => {
      renderWithRedux(<UserProfile detailed={true} />, {
        isAuthenticated: true,
        user: { ...mockUser, email: undefined },
      });
      
      expect(screen.queryByText('Email')).not.toBeInTheDocument();
    });

    it('should not show creation date if missing', () => {
      renderWithRedux(<UserProfile detailed={true} />, {
        isAuthenticated: true,
        user: { ...mockUser, createdAt: undefined },
      });
      
      expect(screen.queryByText('Member Since')).not.toBeInTheDocument();
    });
  });

  describe('Redux Integration', () => {
    it('should react to auth state changes', () => {
      const { rerender } = renderWithRedux(<UserProfile />);
      
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
      
      // Simulate login
      const store = createTestStore({
        isAuthenticated: true,
        user: mockUser,
      });
      
      rerender(
        <Provider store={store}>
          <UserProfile />
        </Provider>
      );
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should use Redux selectors for user data', () => {
      renderWithRedux(<UserProfile />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      // Verify that component displays data from Redux state
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('twitch')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible logout button', () => {
      renderWithRedux(<UserProfile />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      const logoutButton = screen.getByTitle('Logout');
      expect(logoutButton).toHaveAttribute('title', 'Logout');
    });

    it('should have proper alt text for avatar', () => {
      renderWithRedux(<UserProfile />, {
        isAuthenticated: true,
        user: mockUser,
      });
      
      const avatar = screen.getByAltText('testuser');
      expect(avatar).toBeInTheDocument();
    });
  });
});
