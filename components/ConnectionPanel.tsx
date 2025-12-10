
import React, { useState, useEffect } from 'react';
import { ConnectionStatus } from '../types';
import { Button } from './Button';
import { Wifi, Loader2, KeyRound, Link as LinkIcon, AlertCircle, XCircle, ShieldAlert } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { useI18n } from '../i18n';

interface ConnectionPanelProps {
  status: ConnectionStatus;
  onConnect: (channel: string, token?: string) => void;
  onDisconnect: () => void;
  channelName?: string;
  errorMessage?: string | null;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ status, onConnect, onDisconnect, channelName, errorMessage }) => {
  const { t } = useI18n();
  const [channel, setChannel] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUrlDetected, setIsUrlDetected] = useState(false);

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
      <p className="text-slate-500 dark:text-zinc-400 mb-4 sm:mb-6 text-xs sm:text-sm">
          {t.connection.subtitle}
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-left group">
          <label className="text-xs text-slate-600 dark:text-zinc-400 font-bold ml-1 uppercase flex items-center mb-1 transition-colors group-focus-within:text-twitch-brand">
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
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  {isUrlDetected ? <LinkIcon size={16} className="text-green-500" /> : localError ? <AlertCircle size={18} className="text-red-500" /> : null}
              </div>
          </div>
        </div>
        
        <div className="text-left">
          <div className="flex items-center mb-1">
            <button 
                type="button" 
                onClick={() => setShowToken(!showToken)}
                className="text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
                <KeyRound size={12} />
                {showToken ? t.connection.hideToken : t.connection.tokenLabel}
            </button>
            <Tooltip text={t.connection.tokenTooltip} />
          </div>
          {showToken && (
            <div className="animate-fade-in-down">
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
          disabled={!channel.trim() || status === ConnectionStatus.CONNECTING}
          className="h-12 text-base shadow-lg shadow-twitch-brand/20 hover:shadow-twitch-brand/40"
        >
          {status === ConnectionStatus.CONNECTING ? <><Loader2 className="animate-spin" size={20} /> {t.connection.connecting}</> : t.connection.connect}
        </Button>
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
