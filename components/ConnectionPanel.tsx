import React, { useState } from 'react';
import { ConnectionStatus } from '../types';
import { Button } from './Button';
import { Wifi, WifiOff, Loader2, KeyRound } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface ConnectionPanelProps {
  status: ConnectionStatus;
  onConnect: (channel: string, token?: string) => void;
  onDisconnect: () => void;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ status, onConnect, onDisconnect }) => {
  const [channel, setChannel] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (channel.trim()) {
      onConnect(channel.trim(), token.trim() || undefined);
    }
  };

  if (status === ConnectionStatus.CONNECTED) {
    return (
      <div className="bg-zinc-900 border border-green-500/30 p-4 rounded-xl flex items-center justify-between shadow-lg mb-6 animate-fade-in-down">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
          <div>
            <span className="text-zinc-400 text-sm block">Conectado a</span>
            <span className="font-bold text-white text-lg tracking-wide uppercase">{channel}</span>
          </div>
        </div>
        <Button variant="danger" onClick={() => {
          onDisconnect();
          setChannel('');
          setToken('');
        }} size="sm">
          <WifiOff size={18} />
          Desconectar
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800 backdrop-blur-sm max-w-md mx-auto mt-20 text-center shadow-2xl animate-fade-in-up">
      <div className="mb-6 flex justify-center">
        <div className="p-4 bg-twitch-brand/20 rounded-full">
          <Wifi size={48} className="text-twitch-light" />
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-2 text-white">Vincular Chat de Twitch</h2>
      <p className="text-zinc-400 mb-6">Ingresa el nombre del canal para leer los votos.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-left">
          <label className="text-xs text-zinc-500 font-bold ml-1 uppercase flex items-center">
            Canal
            <Tooltip text="El nombre de usuario de Twitch donde se leerá el chat (ej. ibai)." />
          </label>
          <input
            type="text"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="Ej: ibai"
            className="w-full bg-black/50 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-twitch-light focus:ring-1 focus:ring-twitch-light transition-all"
            disabled={status === ConnectionStatus.CONNECTING}
          />
        </div>
        
        <div className="text-left">
          <button 
            type="button" 
            onClick={() => setShowToken(!showToken)}
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mb-1 transition-colors"
          >
            <KeyRound size={12} />
            {showToken ? 'Ocultar Token (Opcional)' : 'Token OAuth (Opcional)'}
            <Tooltip text="Necesario para que el bot responda en el chat (!poll, !stop). Puedes generarlo en twitchtokengenerator.com (scope: chat:edit)." />
          </button>
          
          {showToken && (
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="oauth:xxxxxxxxxxxxx"
              className="w-full bg-black/50 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-twitch-light focus:ring-1 focus:ring-twitch-light transition-all text-sm"
              disabled={status === ConnectionStatus.CONNECTING}
            />
          )}
        </div>

        <Button 
          fullWidth 
          type="submit" 
          disabled={!channel.trim() || status === ConnectionStatus.CONNECTING}
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
      {status === ConnectionStatus.ERROR && (
        <p className="mt-4 text-red-500 text-sm bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20">
          Error al conectar. Verifica el nombre del canal o el token.
        </p>
      )}
    </div>
  );
};