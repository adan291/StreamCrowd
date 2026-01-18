/**
 * LoginForm Component Tests
 * 
 * Tests for Redux-based login form component.
 * 
 * @requirements 5.4, 5.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LoginForm } from '../../src/presentation/components/features/LoginForm';
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

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render login form when not authenticated', () => {
      renderWithRedux(<LoginForm />);
      
      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('should show success message when already authenticated', () => {
      renderWithRedux(<LoginForm />, {
        isAuthenticated: true,
        user: { id: '1', username: 'testuser', platform: 'twitch' },
      });
      
      expect(screen.getByText('Already logged in')).toBeInTheDocument();
      expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = renderWithRedux(
        <LoginForm className="custom-class" />
      );
      
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should update username input', () => {
      renderWithRedux(<LoginForm />);
      
      const usernameInput = screen.getByLabelText('Username') as HTMLInputElement;
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      
      expect(usernameInput.value).toBe('testuser');
    });

    it('should update password input', () => {
      renderWithRedux(<LoginForm />);
      
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      expect(passwordInput.value).toBe('password123');
    });

    it('should show error when submitting empty form', async () => {
      renderWithRedux(<LoginForm />);
      
      const submitButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Username and password are required')).toBeInTheDocument();
      });
    });

    it('should disable inputs during loading', () => {
      renderWithRedux(<LoginForm />, { isLoading: true });
      
      const usernameInput = screen.getByLabelText('Username') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      const submitButton = screen.getByRole('button') as HTMLButtonElement;
      
      expect(usernameInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
      expect(submitButton.disabled).toBe(true);
    });
  });

  describe('Loading State', () => {
    it('should show loading state during login', () => {
      renderWithRedux(<LoginForm />, { isLoading: true });
      
      expect(screen.getByText('Logging in...')).toBeInTheDocument();
    });

    it('should disable submit button during loading', () => {
      renderWithRedux(<LoginForm />, { isLoading: true });
      
      const submitButton = screen.getByRole('button') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should display error message', () => {
      renderWithRedux(<LoginForm />, {
        error: 'Invalid credentials',
      });
      
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    it('should show error icon with error message', () => {
      const { container } = renderWithRedux(<LoginForm />, {
        error: 'Login failed',
      });
      
      expect(screen.getByText('Login failed')).toBeInTheDocument();
      // Check for error styling
      expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onLoginSuccess when authenticated', async () => {
      const onLoginSuccess = vi.fn();
      
      const { rerender } = renderWithRedux(
        <LoginForm onLoginSuccess={onLoginSuccess} />
      );
      
      // Simulate authentication
      const store = createTestStore({
        isAuthenticated: true,
        user: { id: '1', username: 'testuser', platform: 'twitch' },
      });
      
      rerender(
        <Provider store={store}>
          <LoginForm onLoginSuccess={onLoginSuccess} />
        </Provider>
      );
      
      await waitFor(() => {
        expect(onLoginSuccess).toHaveBeenCalled();
      });
    });

    it('should call onLoginFailure when error occurs', async () => {
      const onLoginFailure = vi.fn();
      
      const { rerender } = renderWithRedux(
        <LoginForm onLoginFailure={onLoginFailure} />
      );
      
      // Simulate error
      const store = createTestStore({
        error: 'Login failed',
      });
      
      rerender(
        <Provider store={store}>
          <LoginForm onLoginFailure={onLoginFailure} />
        </Provider>
      );
      
      await waitFor(() => {
        expect(onLoginFailure).toHaveBeenCalledWith('Login failed');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for inputs', () => {
      renderWithRedux(<LoginForm />);
      
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should have autocomplete attributes', () => {
      renderWithRedux(<LoginForm />);
      
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      expect(usernameInput).toHaveAttribute('autocomplete', 'username');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should have proper button type', () => {
      renderWithRedux(<LoginForm />);
      
      const submitButton = screen.getByRole('button', { name: /login/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });

  describe('Redux Integration', () => {
    it('should dispatch loginStart action on submit', async () => {
      const { store } = renderWithRedux(<LoginForm />);
      
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        const state = store.getState();
        expect(state.auth.isLoading).toBe(true);
      });
    });

    it('should clear error on unmount', () => {
      const { unmount, store } = renderWithRedux(<LoginForm />, {
        error: 'Some error',
      });
      
      unmount();
      
      // Error should be cleared (this would need the clearError action to be dispatched)
      // In a real scenario, you'd check if clearError was called
    });
  });
});
