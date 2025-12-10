
import React, { useState, useEffect } from 'react';
import { ConnectionStatus } from '../types';
import { Button } from './Button';
import { Wifi, Loader2, KeyRound, Link as LinkIcon, AlertCircle, XCircle, ShieldAlert } from 'lucide-react';
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
        setLocalError('El nombre del canal es obligatorio.');
        return false;
    }
    const channelRegex = /^[a-zA-Z0-9_]{3,25}$/;
    if (!channelRegex.test(cleanChannel)) {
        setLocalError('Nombre inválido (3-25 caracteres, letras, números y _).');
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
            setLocalError('Token inválido. Asegúrate de copiar el "ACCESS TOKEN".');
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
    <div className="bg-white/90 dark:bg-zinc-900/90 p-6 md:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 backdrop-blur-md max-w-md mx-auto mt-10 md:mt-20 text-center shadow-2xl animate-fade-in-up relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-twitch-brand to-twitch-accent"></div>

      <div className="mb-6 flex justify-center relative">
        <div className="p-4 bg-twitch-brand/10 dark:bg-twitch-brand/20 rounded-full ring-1 ring-twitch-brand/30 relative z-10">
          <Wifi size={40} className="text-twitch-brand dark:text-twitch-light" />
        </div>
        <div className="absolute inset-0 bg-twitch-brand/20 blur-xl rounded-full opacity-50 animate-pulse"></div>
      </div>
      
      <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white tracking-tight">Vincular Chat</h2>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">
          Ingresa el canal para conectar al chat en tiempo real.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-left group">
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-bold ml-1 uppercase flex items-center mb-1 transition-colors group-focus-within:text-twitch-brand">
            Canal / URL
            <Tooltip text="El nombre de usuario o enlace de Twitch (ej. ibai)." />
          </label>
          <div className="relative">
              <input
                type="text"
                value={channel}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="Ej: ibai"
                className={`w-full bg-zinc-50 dark:bg-black/50 border text-zinc-900 dark:text-white rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:ring-2 transition-all font-medium ${localError ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-zinc-300 dark:border-zinc-700 focus:border-twitch-brand dark:focus:border-twitch-light focus:ring-twitch-brand/20 dark:focus:ring-twitch-light/20'}`}
                disabled={status === ConnectionStatus.CONNECTING}
                autoComplete="off"
                spellCheck="false"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  {isUrlDetected ? <LinkIcon size={16} className="text-green-500" /> : localError ? <AlertCircle size={18} className="text-red-500" /> : null}
              </div>
          </div>
        </div>
        
        <div className="text-left">
          <div className="flex items-center mb-1">
            <button 
                type="button" 
                onClick={() => setShowToken(!showToken)}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
                <KeyRound size={12} />
                {showToken ? 'Ocultar' : 'Access Token (Opcional)'}
            </button>
            <Tooltip text="Necesario para que el bot escriba en el chat (anunciar encuestas). Sin esto, funcionará en modo solo lectura." />
          </div>
          {showToken && (
            <div className="animate-fade-in-down">
                <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Ej: uo6dgg01..."
                    className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:border-twitch-brand dark:focus:border-twitch-light text-sm font-mono"
                />
                <div className="text-[10px] text-zinc-400 mt-2 ml-1 leading-relaxed bg-zinc-100 dark:bg-zinc-800/50 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                   <p className="mb-1"><strong>Instrucciones:</strong></p>
                   <ol className="list-decimal pl-3 space-y-1">
                     <li>Ve a <a href="https://twitchtokengenerator.com/" target="_blank" rel="noopener noreferrer" className="text-twitch-brand hover:underline font-bold">twitchtokengenerator.com</a></li>
                     <li>Selecciona "Bot Chat Token" o Custom.</li>
                     <li>Asegura los scopes: <b>chat:read</b> y <b>chat:edit</b>.</li>
                     <li>Genera y copia el <strong>ACCESS TOKEN</strong> (no el Client ID).</li>
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
          {status === ConnectionStatus.CONNECTING ? <><Loader2 className="animate-spin" size={20} /> Conectando...</> : 'Conectar al Chat'}
        </Button>
      </form>
      
      {displayError && (
        <div className={`mt-4 flex items-center gap-3 text-xs font-medium py-3 px-3 rounded-lg border text-left animate-shake ${isAuthError ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/30' : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'}`}>
          <div className="shrink-0">
             {isAuthError ? <ShieldAlert size={20}/> : isNetworkError ? <Wifi size={20}/> : <XCircle size={20}/>}
          </div>
          <div className="flex flex-col">
             <span className="font-bold mb-0.5">{isAuthError ? 'Error de Autenticación' : isNetworkError ? 'Error de Red' : 'Error de Conexión'}</span>
             <span className="break-words w-full opacity-90">{displayError}</span>
          </div>
        </div>
      )}
    </div>
  );
};
