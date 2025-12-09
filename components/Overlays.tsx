
import React from 'react';
import { Layers, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { Poll, VoteRecord } from '../types';
import { LivePoll } from './LivePoll';

interface OverlaysProps {
  currentPoll: Poll | null;
  voteHistory: VoteRecord[];
  theme: 'dark' | 'light';
  channelName?: string;
}

export const Overlays: React.FC<OverlaysProps> = ({ currentPoll, voteHistory, theme, channelName }) => {
  const [copied, setCopied] = React.useState(false);
  const [manualChannel, setManualChannel] = React.useState('');
  const [urlError, setUrlError] = React.useState('');

  const displayChannel = channelName || manualChannel;

  const handlePopout = () => {
    // Open a new window
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open(
      '', 
      'TwitchVoteOverlay', 
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );

    if (!popup) {
        alert("Por favor, permite las ventanas emergentes para abrir el Overlay.");
        return;
    }

    // Capture Styles safely (handle CORS)
    const styleSheets = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('');
        } catch (e) {
          return '';
        }
      })
      .join('\n');

    // Create the full HTML content string
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Overlay - TwitchVote Live</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  colors: {
                    twitch: { brand: '#6441a5', light: '#a970ff' }
                  },
                  animation: {
                    'pulse-slow': 'pulse 3s infinite',
                  }
                }
              }
            }
          </script>
          <style>
            body { background-color: transparent !important; overflow: hidden; }
            #root { height: 100vh; padding: 20px; }
            /* Hide controls that aren't needed in OBS */
            .no-obs { display: none !important; }
            ${styleSheets}
          </style>
        </head>
        <body class="${theme === 'dark' ? 'dark' : ''}">
          <div id="root">
            <div class="h-full flex flex-col items-center justify-center text-center p-8">
                <h1 class="text-4xl font-bold text-[#a970ff] mb-4" style="text-shadow: 2px 2px 0px #000;">Modo Ventana / OBS</h1>
                <p class="text-xl text-white font-bold mb-8" style="text-shadow: 1px 1px 0px #000;">
                    ${displayChannel ? `Canal: ${displayChannel}` : 'Sin conexión'}
                </p>
                <div class="bg-black/80 p-6 rounded-xl border-2 border-[#a970ff] max-w-md">
                    <p class="text-white mb-2">Para integrar en OBS:</p>
                    <ol class="text-left text-zinc-300 space-y-2 list-decimal list-inside">
                        <li>Captura esta región de la pantalla principal.</li>
                        <li>Usa un filtro "Color Key" para eliminar el fondo si es necesario.</li>
                    </ol>
                </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Write to the new window and close the document stream
    popup.document.open();
    popup.document.write(htmlContent);
    popup.document.close();
  };

  const validateManualChannel = (val: string) => {
      setManualChannel(val);
      const regex = /^[a-zA-Z0-9_]{3,25}$/;
      if (val && !regex.test(val)) {
          setUrlError("Formato inválido");
      } else {
          setUrlError("");
      }
  };

  const copyOverlayLink = () => {
    if (!displayChannel) {
        setUrlError("Se requiere un canal");
        return;
    }
    // Simulate copying a link
    navigator.clipboard.writeText(`https://twitchvote.live/overlay/${displayChannel}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-100 dark:bg-zinc-900">
      <div className="flex items-center gap-2 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
         <Layers size={16} className="text-twitch-brand dark:text-twitch-light" />
         <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">Overlays & OBS</span>
      </div>

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
         <div className="grid grid-cols-1 gap-6">
            {/* Card 1: Standard Overlay */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-twitch-brand/10 rounded-lg flex items-center justify-center">
                            <Layers className="text-twitch-brand" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Votación Estándar</h3>
                            <p className="text-sm text-zinc-500">Diseño vertical optimizado para barras laterales.</p>
                        </div>
                    </div>
                    <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold px-2 py-1 rounded">Activo</span>
                </div>

                {/* Preview Box */}
                <div className="bg-zinc-100 dark:bg-black/50 rounded-lg h-48 mb-6 flex items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700 relative overflow-hidden">
                    {displayChannel && (
                        <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm z-10 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> {displayChannel}
                        </div>
                    )}

                    {currentPoll ? (
                        <div className="scale-50 origin-center w-full max-w-[80%]">
                             {/* Mini preview */}
                             <div className="bg-transparent p-4">
                                <h4 className="text-white font-bold text-2xl mb-2 text-center drop-shadow-md">{currentPoll.question}</h4>
                                <div className="space-y-2">
                                    {currentPoll.options.slice(0,3).map(o => (
                                        <div key={o.id} className="h-8 bg-zinc-800/80 rounded relative overflow-hidden">
                                            <div className="absolute top-0 left-0 h-full bg-twitch-brand" style={{width: '60%'}}></div>
                                            <span className="relative z-10 text-white px-2 py-1 block">{o.label}</span>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    ) : (
                        <p className="text-zinc-400 text-sm">No hay votación activa para previsualizar</p>
                    )}
                </div>

                {/* Inputs & Actions */}
                {!channelName && (
                   <div className="mb-4">
                       <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1 block">Canal para Overlay</label>
                       <div className="flex gap-2">
                          <input 
                             type="text" 
                             placeholder="Ej: ibai"
                             value={manualChannel}
                             onChange={(e) => validateManualChannel(e.target.value)}
                             className={`flex-1 bg-zinc-50 dark:bg-zinc-900 border ${urlError ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-twitch-brand`}
                          />
                       </div>
                       {urlError && <p className="text-red-500 text-xs mt-1">{urlError}</p>}
                   </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                        onClick={handlePopout}
                        className="flex-1 bg-twitch-brand hover:bg-twitch-light text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-twitch-brand/20"
                    >
                        <ExternalLink size={16} /> Abrir Ventana (Popout)
                    </button>
                    <button 
                        onClick={copyOverlayLink}
                        disabled={!displayChannel || !!urlError}
                        className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />} 
                        {copied ? '¡URL Copiada!' : 'Copiar URL OBS'}
                    </button>
                </div>
                <p className="mt-3 text-xs text-zinc-500 text-center">
                    Usa "Browser Source" en OBS con la URL copiada o captura la ventana emergente.
                </p>
            </div>
         </div>
      </div>
    </div>
  );
};
