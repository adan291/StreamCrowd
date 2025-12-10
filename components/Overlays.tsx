
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Layers, ExternalLink, Copy, CheckCircle2, Monitor, Globe, AlertCircle, Moon, Sun, Save, Download, Edit3 } from 'lucide-react';
import { Poll, VoteRecord } from '../types';
import { LivePoll } from './LivePoll';
import { Button } from './Button';

interface OverlaysProps {
  currentPoll: Poll | null;
  voteHistory: VoteRecord[];
  theme: 'dark' | 'light';
  channelName?: string;
  isVisible?: boolean; // New prop to control rendering overhead
}

export const Overlays: React.FC<OverlaysProps> = ({ currentPoll, voteHistory, theme, channelName, isVisible = true }) => {
  const [copied, setCopied] = useState(false);
  const [overlayContainer, setOverlayContainer] = useState<HTMLElement | null>(null);
  const [overlayTheme, setOverlayTheme] = useState<'dark' | 'light'>('dark');
  const overlayWindowRef = useRef<Window | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [customChannel, setCustomChannel] = useState<string>('');

  // Determine final channel to use in URL
  const displayChannel = customChannel || channelName || '';

  // Generate the actual URL for this deployment
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}${window.location.pathname}`
    : '';
    
  const overlayUrl = `${baseUrl}?overlay=true${displayChannel ? `&channel=${displayChannel}` : ''}`;

  useEffect(() => {
    // If we have a prop channel name and haven't set a custom one, you might want to sync
    // But usually, manual input overrides prop.
  }, [channelName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        if (overlayWindowRef.current && !overlayWindowRef.current.closed) {
            overlayWindowRef.current.close();
        }
    };
  }, []);

  // Sync theme changes to the open window
  useEffect(() => {
    if (overlayWindowRef.current && !overlayWindowRef.current.closed) {
        if (overlayTheme === 'dark') {
            overlayWindowRef.current.document.documentElement.classList.add('dark');
        } else {
            overlayWindowRef.current.document.documentElement.classList.remove('dark');
        }
    }
  }, [overlayTheme]);

  const saveOverlayConfig = () => {
    try {
      const config = { theme: overlayTheme, customChannel };
      localStorage.setItem('twitch_vote_overlay_config', JSON.stringify(config));
      setSaveStatus('Guardado');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const loadOverlayConfig = () => {
    try {
      const saved = localStorage.getItem('twitch_vote_overlay_config');
      if (saved) {
        const config = JSON.parse(saved);
        if (config.theme) setOverlayTheme(config.theme);
        if (config.customChannel) setCustomChannel(config.customChannel);
        setSaveStatus('Cargado');
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePopout = () => {
    if (overlayWindowRef.current && !overlayWindowRef.current.closed) {
        overlayWindowRef.current.focus();
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
        overlayWindowRef.current = newWindow;

        // Clone styles specifically for the popout to ensure fonts/resets match
        const styles = Array.from(document.styleSheets)
            .map(styleSheet => {
                try {
                    return Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('');
                } catch (e) { return ''; }
            })
            .join('\n');

        newWindow.document.open();
        newWindow.document.write(`
            <!DOCTYPE html>
            <html lang="es" class="${overlayTheme}">
            <head>
                <meta charset="UTF-8" />
                <title>Overlay - TwitchVote Live</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <script>
                    tailwind.config = {
                        darkMode: 'class',
                        theme: {
                          extend: {
                            colors: {
                              twitch: {
                                dark: '#18181b',
                                light: '#a970ff',
                                brand: '#6441a5',
                                accent: '#00f0f0'
                              }
                            },
                            animation: {
                              'scale-up': 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                              'fade-in': 'fadeIn 0.2s ease-out forwards',
                            }
                          }
                        }
                    }
                </script>
                <style>
                    body { background-color: transparent !important; overflow: hidden; margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; height: 100vh; width: 100vw; }
                    html { height: 100%; width: 100%; }
                    #overlay-root { height: 100%; width: 100%; display: flex; flex-direction: column; }
                    ${styles} 
                    /* Custom scrollbar for popup */
                    ::-webkit-scrollbar { width: 6px; }
                    ::-webkit-scrollbar-track { background: transparent; }
                    ::-webkit-scrollbar-thumb { background: rgba(150,150,150,0.5); border-radius: 10px; }
                </style>
            </head>
            <body>
                <div id="overlay-root"></div>
            </body>
            </html>
        `);
        newWindow.document.close();
        
        // Wait for DOM to be ready before setting container
        setTimeout(() => {
            const container = newWindow.document.getElementById('overlay-root');
            if (container) setOverlayContainer(container);
        }, 100);

        newWindow.onbeforeunload = () => {
            setOverlayContainer(null);
            overlayWindowRef.current = null;
        };
    } else {
        alert("Por favor, permite ventanas emergentes para usar el Popout.");
    }
  };

  const copyOverlayLink = () => {
    navigator.clipboard.writeText(overlayUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="h-full flex flex-col bg-zinc-100 dark:bg-zinc-900">
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
         <div className="flex items-center gap-2">
            <Layers size={16} className="text-twitch-brand dark:text-twitch-light" />
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">Configuración de Overlay</span>
         </div>
         <div className="flex gap-2">
            <button 
              onClick={loadOverlayConfig} 
              className="flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-twitch-brand dark:hover:text-twitch-light px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              title="Cargar configuración guardada"
            >
              <Download size={14}/> Cargar Plantilla
            </button>
            <button 
              onClick={saveOverlayConfig} 
              className="flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-twitch-brand dark:hover:text-twitch-light px-2 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              title="Guardar configuración actual"
            >
              <Save size={14}/> Guardar Plantilla
            </button>
            {saveStatus && <span className="text-xs text-green-500 font-bold animate-fade-in self-center">{saveStatus}</span>}
         </div>
      </div>

      <div className="p-4 md:p-6 flex-1 overflow-y-auto custom-scrollbar">
         <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Live Preview Section */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col h-[450px]">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Vista Previa en Vivo</h3>
                    </div>
                </div>
                
                {/* 
                   Changed overflow-hidden to overflow-y-auto to allow scrolling if content overflows in preview 
                */}
                <div className="flex-1 bg-zinc-100 dark:bg-black/50 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 relative overflow-y-auto custom-scrollbar bg-dot-pattern flex flex-col">
                    {currentPoll ? (
                        <div className="w-full h-full p-4 relative">
                             <LivePoll 
                                poll={currentPoll} 
                                voteHistory={voteHistory} 
                                onStop={()=>{}} 
                                onReset={()=>{}} 
                                theme={theme}
                                variant="preview"
                                shouldRenderChart={isVisible}
                             />
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                            <Layers size={48} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                            <p className="text-zinc-400 dark:text-zinc-500 font-bold">No hay votación activa</p>
                            <p className="text-zinc-500 dark:text-zinc-600 text-xs">Crea una encuesta en el Panel para ver la vista previa.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Method 1: Browser Source */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                            <Globe size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-zinc-900 dark:text-white">Browser Source (Recomendado)</h3>
                            <p className="text-xs text-zinc-500">Copia esta URL y añádela como "Browser Source" en OBS.</p>
                        </div>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                         {/* Channel Overwrite Input */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                                Canal de Twitch (Opcional)
                            </label>
                            <div className="flex items-center relative">
                                <input 
                                    type="text" 
                                    value={customChannel}
                                    onChange={(e) => setCustomChannel(e.target.value)}
                                    placeholder={channelName || "Ej: ibai"}
                                    className="w-full bg-zinc-50 dark:bg-black/30 border border-zinc-300 dark:border-zinc-700 rounded-lg py-1.5 pl-3 pr-8 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-twitch-brand"
                                />
                                <Edit3 size={14} className="absolute right-3 text-zinc-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="bg-zinc-50 dark:bg-black/30 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                            <code className="text-xs text-zinc-600 dark:text-zinc-400 truncate flex-1 font-mono select-all">
                                {overlayUrl}
                            </code>
                            <button onClick={copyOverlayLink} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors text-zinc-500" title="Copiar URL">
                                {copied ? <CheckCircle2 size={16} className="text-green-500"/> : <Copy size={16}/>}
                            </button>
                        </div>
                        
                        <div className="flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/10 p-2 rounded border border-amber-200 dark:border-amber-900/30">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <p>Importante: Mantén esta web abierta para que el overlay de OBS reciba los datos en tiempo real.</p>
                        </div>
                    </div>
                </div>

                {/* Method 2: Window Capture */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-500/10 rounded-lg text-twitch-brand">
                                <Monitor size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900 dark:text-white">Ventana Popout</h3>
                                <p className="text-xs text-zinc-500">Para "Window Capture".</p>
                            </div>
                        </div>
                        
                        {/* Theme Toggle for Overlay */}
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700">
                            <button 
                                onClick={() => setOverlayTheme('light')}
                                className={`p-1.5 rounded-md transition-all ${overlayTheme === 'light' ? 'bg-white text-yellow-500 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                                title="Fondo Claro"
                            >
                                <Sun size={14} />
                            </button>
                            <button 
                                onClick={() => setOverlayTheme('dark')}
                                className={`p-1.5 rounded-md transition-all ${overlayTheme === 'dark' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                                title="Fondo Oscuro"
                            >
                                <Moon size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end">
                        <button 
                            onClick={handlePopout}
                            className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg ${overlayContainer ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-twitch-brand hover:bg-twitch-light text-white shadow-twitch-brand/20'}`}
                        >
                            <ExternalLink size={16} /> 
                            {overlayContainer ? 'Enfocar Ventana' : 'Abrir Overlay'}
                        </button>
                    </div>
                </div>
            </div>

         </div>
      </div>

      {/* Render Portal for Popout */}
      {overlayContainer && currentPoll && createPortal(
          <div className="w-full h-full overflow-y-auto p-4 bg-transparent animate-fade-in">
                <LivePoll 
                    poll={currentPoll} 
                    voteHistory={voteHistory} 
                    onStop={()=>{}} 
                    onReset={()=>{}} 
                    theme={overlayTheme}
                    variant="overlay"
                    shouldRenderChart={true}
                />
          </div>,
          overlayContainer
      )}
    </div>
  );
};
