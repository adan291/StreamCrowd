
import React, { useEffect, useState, useRef } from 'react';
import { Layers, ExternalLink, Copy, CheckCircle2, Monitor, Globe, AlertCircle, Moon, Sun, Save, Download, Edit3 } from 'lucide-react';
import { Poll, VoteRecord } from '../types';
import { LivePoll } from './LivePoll';
import { Button } from './Button';
import { useI18n } from '../i18n';

interface OverlaysProps {
  currentPoll: Poll | null;
  voteHistory: VoteRecord[];
  theme: 'dark' | 'light';
  channelName?: string;
  isVisible?: boolean;
  overlayWindowRef?: React.MutableRefObject<Window | null>;
}

export const Overlays: React.FC<OverlaysProps> = ({ currentPoll, voteHistory, theme, channelName, isVisible = true, overlayWindowRef: externalWindowRef }) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [overlayTheme, setOverlayTheme] = useState<'dark' | 'light'>('dark');
  const internalWindowRef = useRef<Window | null>(null);
  const overlayWindowRef = externalWindowRef || internalWindowRef;
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

  // Note: We don't close the window on unmount anymore since the ref is managed by App
  // This allows the popup to persist when switching tabs

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
      setSaveStatus(t.notifications.saved);
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
        setSaveStatus(t.common.loading);
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

    const width = 900;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    // Open the overlay URL directly - this gives us a full React instance with working charts
    const newWindow = window.open(
      overlayUrl, 
      'TwitchVoteOverlay', 
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (newWindow) {
        overlayWindowRef.current = newWindow;
        newWindow.onbeforeunload = () => {
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shrink-0">
         <div className="flex items-center gap-2">
            <Layers size={16} className="text-twitch-brand dark:text-twitch-light" />
            <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">{t.overlay.title}</span>
         </div>
         <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={loadOverlayConfig} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-[10px] sm:text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-twitch-brand dark:hover:text-twitch-light px-2 py-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700 sm:border-0"
              title={t.moderation.loadPreset}
            >
              <Download size={14}/> <span className="hidden xs:inline">{t.moderation.loadPreset}</span>
            </button>
            <button 
              onClick={saveOverlayConfig} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-[10px] sm:text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-twitch-brand dark:hover:text-twitch-light px-2 py-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700 sm:border-0"
              title={t.poll.save}
            >
              <Save size={14}/> <span className="hidden xs:inline">{t.poll.save}</span>
            </button>
            {saveStatus && <span className="text-xs text-green-500 font-bold animate-fade-in self-center">{saveStatus}</span>}
         </div>
      </div>

      <div className="p-3 sm:p-4 md:p-6 flex-1 overflow-y-auto custom-scrollbar pb-20 md:pb-6">
         <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            
            {/* Live Preview Section */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 md:p-6 shadow-sm flex flex-col h-[350px] sm:h-[400px] md:h-[450px]">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t.poll.preview}</h3>
                    </div>
                </div>
                
                {/* 
                   Changed overflow-hidden to overflow-y-auto to allow scrolling if content overflows in preview 
                */}
                <div className="flex-1 bg-zinc-100 dark:bg-black/50 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 relative overflow-y-auto custom-scrollbar bg-dot-pattern flex flex-col">
                    {currentPoll ? (
                        <div className="w-full h-full min-h-[400px] p-4 relative">
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
                            <p className="text-zinc-400 dark:text-zinc-500 font-bold">{t.poll.noPollActive}</p>
                            <p className="text-zinc-500 dark:text-zinc-600 text-xs">{t.poll.createInPanel}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6">
                {/* Method 2: Window Capture - Now the main option */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-3 bg-purple-500/10 rounded-lg text-twitch-brand shrink-0">
                                <Monitor size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">{t.poll.openOverlay}</h3>
                                <p className="text-[10px] sm:text-xs text-zinc-500">{t.poll.obsHint}</p>
                            </div>
                        </div>
                        
                        {/* Theme Toggle for Overlay */}
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700">
                            <button 
                                onClick={() => setOverlayTheme('light')}
                                className={`p-1.5 rounded-md transition-all ${overlayTheme === 'light' ? 'bg-white text-yellow-500 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                                title={t.overlay.light}
                            >
                                <Sun size={14} />
                            </button>
                            <button 
                                onClick={() => setOverlayTheme('dark')}
                                className={`p-1.5 rounded-md transition-all ${overlayTheme === 'dark' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                                title={t.overlay.dark}
                            >
                                <Moon size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end">
                        <button 
                            onClick={handlePopout}
                            className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg bg-twitch-brand hover:bg-twitch-light text-white shadow-twitch-brand/20"
                        >
                            <ExternalLink size={16} /> 
                            {t.poll.openOverlay}
                        </button>
                    </div>
                </div>
            </div>

         </div>
      </div>


    </div>
  );
};
