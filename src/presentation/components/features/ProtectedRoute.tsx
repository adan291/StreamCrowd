/**
 * ProtectedRoute Component
 * 
 * Route wrapper that requires authentication using Redux-based useAuth hook.
 * Redirects to login or shows fallback UI when user is not authenticated.
 * 
 * @requirements 5.4, 5.5
 */

import React, { ReactNode } from 'react';
import { useAuth } from '../../../application/hooks/useAuth';
import { Shield, Lock, Loader2, LogIn } from 'lucide-react';

export interface ProtectedRouteProps {
  /** Content to render when authenticated */
  children: ReactNode;
  /** Fallback UI when not authenticated (optional) */
  fallback?: ReactNode;
  /** Callback when authentication is required */
  onAuthRequired?: () => void;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Require specific platform */
  requirePlatform?: 'twitch' | 'youtube' | 'firebase';
}

/**
 * ProtectedRoute component
 * 
 * Wraps content that requires authentication.
 * Uses Redux state to check authentication status.
 * 
 * @example
 * ```tsx
 * <ProtectedRoute 
 *   onAuthRequired={() => navigate('/login')}
 *   fallback={<LoginPrompt />}
 * >
 *   <Dashboard />
 * </ProtectedRoute>
 * ```
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
  onAuthRequired,
  loadingComponent,
  requirePlatform,
}) => {
  const { 
    isAuthenticated, 
    isLoading, 
    user,
    userPlatform 
  } = useAuth();

  // Trigger callback when auth is required
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && onAuthRequired) {
      onAuthRequired();
    }
  }, [isLoading, isAuthenticated, onAuthRequired]);

  // Loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-red-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            Authentication Required
          </h2>
          
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            You need to be logged in to access this content.
          </p>

          {onAuthRequired && (
            <button
              onClick={onAuthRequired}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors mx-auto"
            >
              <LogIn size={20} />
              <span>Go to Login</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Check platform requirement
  if (requirePlatform && userPlatform !== requirePlatform) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-yellow-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            Platform Mismatch
          </h2>
          
          <p className="text-zinc-600 dark:text-zinc-400 mb-2">
            This content requires authentication with <span className="font-semibold capitalize">{requirePlatform}</span>.
          </p>
          
          <p className="text-sm text-zinc-500">
            You are currently logged in with <span className="capitalize">{userPlatform || 'unknown'}</span>.
          </p>
        </div>
      </div>
    );
  }

  // Authenticated - render children
  return <>{children}</>;
};

export default ProtectedRoute;
