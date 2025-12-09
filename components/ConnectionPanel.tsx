import React, { useState, useEffect } from 'react';
import { ConnectionStatus } from '../types';
import { Button } from './Button';
import { Wifi, WifiOff, Loader2, KeyRound, Link as LinkIcon, Check, AlertCircle } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface ConnectionPanelProps {
  status: ConnectionStatus;
  onConnect: (channel: string, token?: string) => void;
  onDisconnect: () => void;
  channelName?: string;
  errorMessage?: string | null;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ status, onConnect, onDisconnect, channelName, errorMessage }) => {
  const [channel, setChannel] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUrlDetected, setIsUrlDetected] = useState(false);

  // Helper to extract username from URL or raw text
  const extractUsername = (input: string): string => {
    // Regex to catch twitch.tv/username pattern
    const urlRegex = /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)(?:\/.*)?$/i;
    const match = input.match(urlRegex);
    
    if (match && match[1]) {
        setIsUrlDetected(true);
        return match[1].toLowerCase();
    }
    
    // If input contains slashes but not twitch.tv, just take the last part
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
        setLocalError('El nombre del canal no puede estar vacío.');
        return false;
    }
    // Twitch username: 4-25 characters, alphanumeric + underscores
    const channelRegex = /^[a-zA-Z0-9_]{3,25}$/;
    if (!channelRegex.test(cleanChannel)) {
        setLocalError('Nombre inválido (solo letras, números y guion bajo).');
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
    if (validateChannel(channel)) {
        onConnect(channel.trim(), token.trim() || undefined);
    }
  };

  // Reset URL detected icon after a moment
  useEffect(() => {
    if (isUrlDetected) {
        const timer = setTimeout(() => setIsUrlDetected(false), 2000);
        return () => clearTimeout(timer);
    }
  }, [isUrlDetected]);

  if (status === ConnectionStatus.CONNECTED) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-green-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between shadow-lg mb-6 animate-fade-in-down gap-4 transition-colors">
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e] shrink-0"></div>
            <div className="flex flex-col">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium uppercase tracking-wider leading-none mb-1">Conectado a</span>
                <span className="font-bold text-zinc-900 dark:text-white text-xl tracking-wide leading-none truncate max-w-[200px]">
                    {channelName || channel}
                </span>
            </div>
        </div>
        <button 
            onClick={() => {
                onDisconnect();
                setChannel('');
                setToken('');
                setLocalError(null);
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-500 text-white shadow-sm text-sm border border-red-500/50"
        >
            <WifiOff size={16} />
            Desconectar
        </button>
      </div>
    );
  }

  // Determine which error to show (validation error or API error)
  const displayError = localError || errorMessage;

  return (
    <div className="bg-white/90 dark:bg-zinc-900/90 p-6 md:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 backdrop-blur-md max-w-md mx-auto mt-20 text-center shadow-2xl animate-fade-in-up relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-twitch-brand to-twitch-accent"></div>

      <div className="mb-6 flex justify-center relative">
        <div className="p-4 bg-twitch-brand/10 dark:bg-twitch-brand/20 rounded-full ring-1 ring-twitch-brand/30 relative z-10">
          <Wifi size={40} className="text-twitch-brand dark:text-twitch-light" />
        </div>
        <div className="absolute inset-0 bg-twitch-brand/20 blur-xl rounded-full opacity-50 animate-pulse"></div>
      </div>
      
      <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white tracking-tight">Vincular Chat</h2>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">
          Ingresa el canal o pega la URL para conectar.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-left group">
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-bold ml-1 uppercase flex items-center mb-1 transition-colors group-focus-within:text-twitch-brand">
            Canal / URL
            <Tooltip text="El nombre de usuario o enlace de Twitch (ej. https://twitch.tv/ibai)." />
          </label>
          <div className="relative">
              <input
                type="text"
                value={channel}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="Ej: ibai o twitch.tv/ibai"
                className={`w-full bg-zinc-50 dark:bg-black/50 border text-zinc-900 dark:text-white rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:ring-2 transition-all font-medium ${displayError ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-zinc-300 dark:border-zinc-700 focus:border-twitch-brand dark:focus:border-twitch-light focus:ring-twitch-brand/20 dark:focus:ring-twitch-light/20'}`}
                disabled={status === ConnectionStatus.CONNECTING}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none transition-all duration-300">
                  {isUrlDetected ? (
                      <div className="flex items-center gap-1 text-green-500 animate-scale-up">
                          <LinkIcon size={16} />
                          <Check size={14} />
                      </div>
                  ) : displayError ? (
                      <AlertCircle size={18} className="text-red-500" />
                  ) : null}
              </div>
          </div>
        </div>
        
        <div className="text-left">
          <button 
            type="button" 
            onClick={() => setShowToken(!showToken)}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300 flex items-center gap-1 mb-1 transition-colors"
          >
            <KeyRound size={12} />
            {showToken ? 'Ocultar Token (Opcional)' : 'Token OAuth (Opcional)'}
            <Tooltip text="Necesario para que el bot responda en el chat (!poll, !stop). Puedes generarlo en twitchtokengenerator.com" />
          </button>
          
          {showToken && (
            <div className="animate-fade-in-down">
                <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="oauth:xxxxxxxxxxxxx"
                className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:border-twitch-brand dark:focus:border-twitch-light focus:ring-2 focus:ring-twitch-brand/20 dark:focus:ring-twitch-light/20 transition-all text-sm font-mono"
                disabled={status === ConnectionStatus.CONNECTING}
                />
            </div>
          )}
        </div>

        <Button 
          fullWidth 
          type="submit" 
          disabled={!channel.trim() || status === ConnectionStatus.CONNECTING}
          className="h-12 text-base shadow-lg shadow-twitch-brand/20 hover:shadow-twitch-brand/40"
        >
          {status === ConnectionStatus.CONNECTING ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Conectando...
            </>
          ) : (
            'Conectar al Chat'
          )}
        </Button>
      </form>
      
      {displayError && (
        <div className="mt-4 flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-medium bg-red-100 dark:bg-red-500/10 py-2 px-3 rounded-lg border border-red-200 dark:border-red-500/20 text-left animate-shake">
          <AlertCircle size={16} className="shrink-0" />
          {displayError}
        </div>
      )}
      
      <style>{`
          @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-5px); }
              75% { transform: translateX(5px); }
          }
          .animate-shake {
              animation: shake 0.3s ease-in-out;
          }
      `}</style>
    </div>
  );
};