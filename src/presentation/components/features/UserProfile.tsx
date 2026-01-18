/**
 * UserProfile Component
 * 
 * Example user profile component using Redux-based useAuth hook.
 * Displays user information and provides logout functionality.
 * 
 * @requirements 5.4, 5.5
 */

import React from 'react';
import { useAuth } from '../../../application/hooks/useAuth';
import { User, LogOut, Mail, Calendar, Shield, Loader2 } from 'lucide-react';

export interface UserProfileProps {
  /** Callback when logout is triggered */
  onLogout?: () => void;
  /** Custom class name */
  className?: string;
  /** Show detailed information */
  detailed?: boolean;
}

/**
 * UserProfile component
 * 
 * Displays authenticated user information from Redux state.
 * Provides logout functionality and reacts to auth state changes.
 * 
 * @example
 * ```tsx
 * <UserProfile 
 *   detailed={true}
 *   onLogout={() => navigate('/login')}
 * />
 * ```
 */
export const UserProfile: React.FC<UserProfileProps> = ({
  onLogout,
  className = '',
  detailed = false,
}) => {
  const { 
    user, 
    isAuthenticated, 
    isLoading,
    userId,
    username,
    userAvatar,
    userPlatform,
    logout 
  } = useAuth();

  const handleLogout = () => {
    logout();
    if (onLogout) {
      onLogout();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-zinc-500">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  // Not authenticated state
  if (!isAuthenticated || !user) {
    return (
      <div className={`bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-2 text-zinc-500">
          <User size={20} />
          <span>Not logged in</span>
        </div>
      </div>
    );
  }

  // Compact view
  if (!detailed) {
    return (
      <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt={username || 'User'} 
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {(username || 'U')[0].toUpperCase()}
              </div>
            )}
            
            {/* User info */}
            <div>
              <div className="font-medium text-zinc-900 dark:text-white">
                {username || 'Unknown User'}
              </div>
              {userPlatform && (
                <div className="text-xs text-zinc-500 capitalize">
                  {userPlatform}
                </div>
              )}
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Detailed view
  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header with avatar */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6">
        <div className="flex items-center gap-4">
          {userAvatar ? (
            <img 
              src={userAvatar} 
              alt={username || 'User'} 
              className="w-20 h-20 rounded-full border-4 border-white"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-blue-500 font-bold text-2xl border-4 border-white">
              {(username || 'U')[0].toUpperCase()}
            </div>
          )}
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">
              {username || 'Unknown User'}
            </h2>
            {userPlatform && (
              <div className="flex items-center gap-1 text-white/80 text-sm mt-1">
                <Shield size={14} />
                <span className="capitalize">{userPlatform}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile details */}
      <div className="p-6 space-y-4">
        {/* User ID */}
        {userId && (
          <div className="flex items-start gap-3">
            <User size={18} className="text-zinc-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                User ID
              </div>
              <div className="text-sm text-zinc-900 dark:text-white font-mono">
                {userId}
              </div>
            </div>
          </div>
        )}

        {/* Email */}
        {user.email && (
          <div className="flex items-start gap-3">
            <Mail size={18} className="text-zinc-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                Email
              </div>
              <div className="text-sm text-zinc-900 dark:text-white">
                {user.email}
              </div>
            </div>
          </div>
        )}

        {/* Created date */}
        {user.createdAt && (
          <div className="flex items-start gap-3">
            <Calendar size={18} className="text-zinc-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                Member Since
              </div>
              <div className="text-sm text-zinc-900 dark:text-white">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors mt-6"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
