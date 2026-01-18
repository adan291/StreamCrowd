/**
 * LoginForm Component
 * 
 * Example login form component using Redux-based useAuth hook.
 * Demonstrates how to handle authentication with Redux state management.
 * 
 * @requirements 5.4, 5.5
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../application/hooks/useAuth';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';

export interface LoginFormProps {
  /** Callback when login is successful */
  onLoginSuccess?: () => void;
  /** Callback when login fails */
  onLoginFailure?: (error: string) => void;
  /** Custom class name */
  className?: string;
}

/**
 * LoginForm component
 * 
 * Provides a form for user authentication using Redux state.
 * Handles loading states, errors, and success callbacks.
 * 
 * @example
 * ```tsx
 * <LoginForm 
 *   onLoginSuccess={() => navigate('/dashboard')}
 *   onLoginFailure={(error) => console.error(error)}
 * />
 * ```
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  onLoginFailure,
  className = '',
}) => {
  const { 
    isAuthenticated, 
    isLoading, 
    error, 
    loginStart, 
    loginSuccess, 
    loginFailure,
    clearError 
  } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // Handle successful authentication
  useEffect(() => {
    if (isAuthenticated && onLoginSuccess) {
      onLoginSuccess();
    }
  }, [isAuthenticated, onLoginSuccess]);

  // Handle authentication errors
  useEffect(() => {
    if (error && onLoginFailure) {
      onLoginFailure(error);
    }
  }, [error, onLoginFailure]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous errors
    clearError();
    
    // Validate inputs
    if (!username.trim() || !password.trim()) {
      loginFailure('Username and password are required');
      return;
    }

    // Start login process
    loginStart();

    try {
      // Simulate API call (replace with actual authentication logic)
      // In a real app, this would call your authentication service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful login
      // Replace this with actual authentication logic
      const mockUser = {
        id: `user_${Date.now()}`,
        username: username,
        email: `${username}@example.com`,
        platform: 'twitch' as const,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        createdAt: new Date().toISOString(),
      };
      
      const mockToken = `mock_token_${Date.now()}`;
      
      loginSuccess(mockUser, mockToken);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      loginFailure(errorMessage);
    }
  };

  // If already authenticated, show success message
  if (isAuthenticated) {
    return (
      <div className={`bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <LogIn size={20} />
          <span className="font-medium">Already logged in</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 ${className}`}>
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
        Login
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username field */}
        <div>
          <label 
            htmlFor="username" 
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            placeholder="Enter your username"
            autoComplete="username"
          />
        </div>

        {/* Password field */}
        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Logging in...</span>
            </>
          ) : (
            <>
              <LogIn size={20} />
              <span>Login</span>
            </>
          )}
        </button>
      </form>

      {/* Help text */}
      <p className="mt-4 text-xs text-zinc-500 text-center">
        This is a demo login form using Redux state management
      </p>
    </div>
  );
};

export default LoginForm;
