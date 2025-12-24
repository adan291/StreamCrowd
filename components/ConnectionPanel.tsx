
import React, { useState, useEffect } from 'react';
import { ConnectionStatus } from '../types';
import { Button } from './Button';
import { Wifi, Loader2, KeyRound, Link as LinkIcon, AlertCircle, XCircle, ShieldAlert, LogIn } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { useI18n } from '../i18n';
import { openTwitchOAuthPopup, TwitchOAuthError } from '../services/twitchOAuth';

interface ConnectionPanelProps {
  status: ConnectionStatus;
  onConnect: (channel: string, token?: string, userId?: string) => void;
  errorMessage?: string | null;
  savedCredentials?: { channel: string; token: string } | null;
  onClearSavedCredentials?: () => void;
  tokenExpiresIn?: number | null;
  tokenExpiringSoon?: boolean;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ 
  status, 
  onConnect, 
  errorMessage,
  savedCredentials,
  onClearSavedCredentials,
  tokenExpiresIn,
  tokenExpiringSoon
}) => {
  const { t } = useI18n();
  const [channel, setChannel] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUrlDetected, setIsUrlDetected] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  // Handle Twitch OAuth login
  const handleTwitchLogin = async () => {
    setIsOAuthLoading(true);
    setLocalError(null);
    
    try {
      const result = await openTwitchOAuthPopup();
      // Auto-fill channel and token, then connect with userId
      setChannel(result.username);
      setToken(result.accessToken);
      onConnect(result.username, result.accessToken, result.userId);
    } catch (err) {
      const oauthError = err as TwitchOAuthError;
      if (oauthError.error === 'popup_closed') {
        // User cancelled, don't show error
      } else if (oauthError.error === 'popup_blocked') {
        setLocalError(t.connection.oauthPopupBlocked || 'Popup blocked. Please allow popups for this site.');
      } else {
        setLocalError(oauthError.errorDescription || t.connection.oauthError || 'OAuth login failed');
      }
    } finally {
      setIsOAuthLoading(false);
    }
  };

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Quick reconnect with saved credentials
  const handleQuickReconnect = () => {
    if (savedCredentials) {
      onConnect(savedCredentials.channel, savedCredentials.token);
    }
  };

  const extractUsername = (input: string): string => {
    const urlRegex = /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)(?:\/.*)?$/i;
    const match = input.match(urlRegex);
    if (match && match[1]) {
        setIsUrlDetected(true);
        return match[1].toLowerCase();
    }
    if (input.includes('/')) {
        const parts = input.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart) return lastPart.trim();
    }
    setIsUrlDetected(false);
    return input.trim();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const cleanValue = extractUsername(rawValue);
      setChannel(cleanValue);
      if (localError) setLocalError(null);
  };

  const validateChannel = (value: string): boolean => {
    const cleanChannel = value.trim();
    if (!cleanChannel) {
        setLocalError(t.connection.errorChannelRequired);
        return false;
    }
    const channelRegex = /^[a-zA-Z0-9_]{3,25}$/;
    if (!channelRegex.test(cleanChannel)) {
        setLocalError(t.connection.errorChannelInvalid);
        return false;
    }
    setLocalError(null);
    return true;
  };

  const handleBlur = () => {
      if (channel) validateChannel(channel);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (token) {
        const cleanToken = token.trim();
        const tokenRegex = /^(oauth:)?[a-zA-Z0-9_]{30,}$/i;
        if (!tokenRegex.test(cleanToken)) {
            setLocalError(t.connection.errorTokenInvalid);
            return;
        }
    }

    if (validateChannel(channel)) {
        onConnect(channel.trim(), token.trim() || undefined);
    }
  };

  useEffect(() => {
    if (isUrlDetected) {
        const timer = setTimeout(() => setIsUrlDetected(false), 2000);
        return () => clearTimeout(timer);
    }
  }, [isUrlDetected]);

  // Specific error UI logic
  const isAuthError = errorMessage?.includes('OAuth') || errorMessage?.includes('autenticación') || errorMessage?.includes('Token');
  const isNetworkError = errorMessage?.includes('red') || errorMessage?.includes('respuesta');
  
  const displayError = localError || errorMessage;

  if (status === ConnectionStatus.CONNECTED) return null;

  return (
    <div className="glass-card bg-gray-200/95 dark:bg-zinc-900/80 p-5 sm:p-6 md:p-8 rounded-2xl border border-gray-300 dark:border-zinc-700/50 backdrop-blur-xl w-full max-w-md mx-auto text-center shadow-2xl shadow-gray-400/40 dark:shadow-black/30 animate-fade-in-up relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-twitch-brand via-twitch-accent to-twitch-brand"></div>

      <div className="mb-4 sm:mb-6 flex justify-center relative">
        <div className="p-3 sm:p-4 bg-twitch-brand/15 dark:bg-twitch-brand/20 rounded-full ring-2 ring-twitch-brand/40 relative z-10">
          <Wifi size={32} className="sm:w-10 sm:h-10 text-twitch-brand" />
        </div>
        <div className="absolute inset-0 bg-twitch-brand/20 blur-xl rounded-full opacity-50 animate-pulse"></div>
      </div>
      
      <h2 className="text-xl sm:text-2xl font-bold mb-2 text-purple-light dark:text-white tracking-tight">{t.connection.title}</h2>
      <p className="text-slate-600 dark:text-zinc-400 mb-4 sm:mb-6 text-xs sm:text-sm">
          {t.connection.subtitle}
      </p>

      {/* Quick reconnect with saved credentials */}
      {savedCredentials && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 mb-2">
            💾 Sesión guardada: <strong>{savedCredentials.channel}</strong>
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleQuickReconnect}
              disabled={status === ConnectionStatus.CONNECTING}
              className="flex-1 py-2 px-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Reconectar rápido
            </button>
            <button
              onClick={onClearSavedCredentials}
              className="py-2 px-3 bg-zinc-500 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors"
              title="Olvidar credenciales"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-left group">
          <label className="text-xs text-slate-700 dark:text-zinc-400 font-bold ml-1 uppercase flex items-center mb-1 transition-colors group-focus-within:text-twitch-brand">
            {t.connection.channelLabel}
            <Tooltip text={t.connection.channelTooltip} />
          </label>
          <div className="relative">
              <input
                type="text"
                value={channel}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder={t.connection.channelPlaceholder}
                className={`w-full bg-white dark:bg-black/50 border text-gray-800 dark:text-white rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:ring-2 transition-all font-medium placeholder-purple-light dark:placeholder:text-zinc-500 ${localError ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-300 dark:border-zinc-700 focus:border-twitch-brand dark:focus:border-twitch-light focus:ring-twitch-brand/20 dark:focus:ring-twitch-light/20'}`}
                disabled={status === ConnectionStatus.CONNECTING}
                autoComplete="off"
                spellCheck="false"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true">
                  {isUrlDetected ? <LinkIcon size={16} className="text-green-500" aria-label={t.connection.urlDetected} /> : localError ? <AlertCircle size={18} className="text-red-500" aria-label={t.connection.errorConnection} /> : null}
              </div>
          </div>
        </div>
        
        <div className="text-left">
          <div className="flex items-center mb-1">
            <button 
                type="button" 
                onClick={() => setShowToken(!showToken)}
                className="text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors"
                aria-expanded={showToken}
                aria-controls="token-input-section"
            >
                <KeyRound size={12} aria-hidden="true" />
                {showToken ? t.connection.hideToken : t.connection.tokenLabel}
            </button>
            <Tooltip text={t.connection.tokenTooltip} />
          </div>
          {showToken && (
            <div id="token-input-section" className="animate-fade-in-down">
                <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={t.connection.tokenPlaceholder}
                    className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-zinc-700 text-gray-800 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:border-twitch-brand dark:focus:border-twitch-light text-sm font-mono placeholder-purple-light dark:placeholder:text-zinc-500"
                />
                <div className="text-[10px] text-purple-light dark:text-zinc-400 mt-2 ml-1 leading-relaxed bg-white/80 dark:bg-zinc-800/50 p-2 rounded border border-gray-200 dark:border-zinc-800">
                   <p className="mb-1"><strong>{t.connection.instructions}:</strong></p>
                   <ol className="list-decimal pl-3 space-y-1">
                     <li>{t.connection.step1} <a href="https://twitchtokengenerator.com/" target="_blank" rel="noopener noreferrer" className="text-twitch-brand hover:underline font-bold">twitchtokengenerator.com</a></li>
                     <li>{t.connection.step2}</li>
                     <li>{t.connection.step3}</li>
                     <li>{t.connection.step4}</li>
                   </ol>
                </div>
            </div>
          )}
        </div>

        <Button 
          fullWidth 
          type="submit" 
          disabled={!channel.trim() || status === ConnectionStatus.CONNECTING || isOAuthLoading}
          className="h-12 text-base shadow-lg shadow-twitch-brand/20 hover:shadow-twitch-brand/40"
        >
          {status === ConnectionStatus.CONNECTING ? <><Loader2 className="animate-spin" size={20} /> {t.connection.connecting}</> : t.connection.connect}
        </Button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-zinc-700"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-gray-200 dark:bg-zinc-900 text-slate-500 dark:text-zinc-500">
              {t.connection.orLoginWith || 'o inicia sesión con'}
            </span>
          </div>
        </div>

        {/* Twitch OAuth Login Button */}
        <button
          type="button"
          onClick={handleTwitchLogin}
          disabled={status === ConnectionStatus.CONNECTING || isOAuthLoading}
          className="w-full h-12 flex items-center justify-center gap-2 bg-[#9146FF] hover:bg-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
        >
          {isOAuthLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              {t.connection.oauthLoading || 'Conectando...'}
            </>
          ) : (
            <>
              <LogIn size={20} />
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
              </svg>
              {t.connection.loginWithTwitch || 'Iniciar sesión con Twitch'}
            </>
          )}
        </button>
      </form>
      
      {displayError && (
        <div className={`mt-4 flex items-center gap-3 text-xs font-medium py-3 px-3 rounded-lg border text-left animate-shake ${isAuthError ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/30' : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'}`}>
          <div className="shrink-0">
             {isAuthError ? <ShieldAlert size={20}/> : isNetworkError ? <Wifi size={20}/> : <XCircle size={20}/>}
          </div>
          <div className="flex flex-col">
             <span className="font-bold mb-0.5">{isAuthError ? t.connection.errorAuth : isNetworkError ? t.connection.errorNetwork : t.connection.errorConnection}</span>
             <span className="break-words w-full opacity-90">{displayError}</span>
          </div>
        </div>
      )}
    </div>
  );
};
