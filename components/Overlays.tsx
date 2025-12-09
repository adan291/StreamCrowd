
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [copied, setCopied] = useState(false);
  const [manualChannel, setManualChannel] = useState('');
  const [urlError, setUrlError] = useState('');
  
  // State for the external popout window
  const [externalWindow, setExternalWindow] = useState<Window | null>(null);

  const displayChannel = channelName || manualChannel;

  const handlePopout = () => {
    // If already open, focus it
    if (externalWindow && !externalWindow.closed) {
        externalWindow.focus();
        return;
    }

    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const newWindow = window.open(
      '', 
      'TwitchVoteOverlay', 
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (newWindow) {
        // Copy Styles from main window to popout to ensure Tailwind works
        const styles = Array.from(document.styleSheets)
            .map(styleSheet => {
                try {
                    return Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('');
                } catch (e) { return ''; }
            })
            .join('\n');

        newWindow.document.write(`
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
                                colors: { twitch: { brand: '#6441a5', light: '#a970ff' } },
                                animation: { 'pulse-slow': 'pulse 3s infinite' }
                            }
                        }
                    }
                </script>
                <style>
                    body { background-color: transparent; overflow: hidden; margin: 0; }
                    /* Inject main window styles for fonts/resets */
                    ${styles} 
                </style>
            </head>
            <body class="${theme === 'dark' ? 'dark' : ''}">
                <div id="overlay-root"></div>
            </body>
            </html>
        `);
        newWindow.document.close();
        
        // Setup listener to clear state when window closes
        newWindow.onbeforeunload = () => {
            setExternalWindow(null);
        };

        setExternalWindow(newWindow);
    } else {
        alert("Por favor, permite ventanas emergentes.");
    }
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
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-twitch-brand/10 rounded-lg flex items-center justify-center">
                            <Layers className="text-twitch-brand" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Votación Dinámica (OBS)</h3>
                            <p className="text-sm text-zinc-500">Overlay transparente en tiempo real.</p>
                        </div>
                    </div>
                    {externalWindow && (
                         <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2 py-1 rounded animate-pulse">
                             Ventana Abierta
                         </span>
                    )}
                </div>

                {/* Preview Box */}
                <div className="bg-zinc-100 dark:bg-black/50 rounded-lg h-64 mb-6 border border-dashed border-zinc-300 dark:border-zinc-700 relative overflow-hidden flex items-center justify-center">
                    {currentPoll ? (
                        <div className="w-full h-full p-2 scale-75 origin-center">
                             <LivePoll 
                                poll={currentPoll} 
                                voteHistory={voteHistory} 
                                onStop={()=>{}} 
                                onReset={()=>{}} 
                                theme={theme}
                                variant="preview"
                             />
                        </div>
                    ) : (
                        <p className="text-zinc-400 text-sm">No hay votación activa para previsualizar</p>
                    )}
                </div>

                {!channelName && (
                   <div className="mb-4">
                       <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1 block">Canal para Overlay</label>
                       <input 
                            type="text" 
                            placeholder="Ej: ibai"
                            value={manualChannel}
                            onChange={(e) => validateManualChannel(e.target.value)}
                            className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${urlError ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-twitch-brand`}
                        />
                       {urlError && <p className="text-red-500 text-xs mt-1">{urlError}</p>}
                   </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                        onClick={handlePopout}
                        className="flex-1 bg-twitch-brand hover:bg-twitch-light text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-twitch-brand/20"
                    >
                        <ExternalLink size={16} /> 
                        {externalWindow ? 'Enfocar Ventana' : 'Abrir Ventana (Popout)'}
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
                    Captura la ventana emergente en OBS (Window Capture) o usa la URL como Browser Source.
                </p>
            </div>
         </div>
      </div>

      {/* Render the Poll into the External Window using Portal */}
      {externalWindow && currentPoll && createPortal(
          <div className="h-screen w-screen flex flex-col items-center justify-center p-4">
               <div className="w-full max-w-4xl h-full">
                    <LivePoll 
                        poll={currentPoll} 
                        voteHistory={voteHistory} 
                        onStop={()=>{}} 
                        onReset={()=>{}} 
                        theme={theme}
                        variant="overlay"
                    />
               </div>
          </div>,
          externalWindow.document.body
      )}
    </div>
  );
};
