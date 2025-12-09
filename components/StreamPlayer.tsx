
import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Volume2, VolumeX, Play, Pause, AlertTriangle, RefreshCw, Maximize, Minimize, Share2, Check } from 'lucide-react';

interface StreamPlayerProps {
  channel: string;
}

declare global {
  interface Window {
    Twitch: any;
  }
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({ channel }) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [isLive, setIsLive] = useState<boolean | null>(null); // null = unknown
  const [copied, setCopied] = useState(false);
  
  // Playback Controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true); // Twitch embeds usually start muted
  const [volume, setVolume] = useState(0.5);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Generate a unique ID for this instance to prevent collisions
  const embedId = useRef(`twitch-embed-${Math.floor(Math.random() * 100000)}`).current;

  // Handle Fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    // 1. Strict Channel Validation
    if (!channel) return;
    
    const channelRegex = /^[a-zA-Z0-9_]{3,25}$/;
    if (!channelRegex.test(channel)) {
        setError("Nombre de canal inválido (solo letras, números y '_').");
        setIsReady(false);
        return;
    }

    if (isHidden) return;
    
    let mounted = true;
    let checkInterval: any;
    let attempts = 0;

    // Cleanup previous instance
    const cleanup = () => {
      if (playerRef.current) {
        playerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = ''; 
      }
    };
    
    cleanup();
    setIsReady(false);
    setError(null);
    setIsLive(null);

    const initializePlayer = () => {
      if (!mounted || !containerRef.current) return;

      const hostname = window.location.hostname;
      const parent = hostname === '' ? 'localhost' : hostname;

      // Manually create the embed element with UNIQUE ID
      const embedElem = document.createElement('div');
      embedElem.id = embedId;
      embedElem.style.width = '100%';
      embedElem.style.height = '100%';
      containerRef.current.appendChild(embedElem);

      const options = {
        width: '100%',
        height: '100%',
        channel: channel,
        parent: [parent],
        muted: true, // Start muted to allow autoplay
        autoplay: true,
        controls: false // Hide default controls to use our overlay
      };

      try {
          // 2. Wrap embed creation in try-catch
          const player = new window.Twitch.Player(embedId, options);
          playerRef.current = player;

          if (!mounted) return;

          // Event Listeners
          player.addEventListener(window.Twitch.Player.READY, () => {
            if (!mounted) return;
            setIsReady(true);
            try {
              player.setVolume(0.5);
              if (player.getMuted() !== undefined) setIsMuted(player.getMuted());
            } catch (e) {
               console.warn("Error setting volume/mute status", e);
            }
          });

          player.addEventListener(window.Twitch.Player.ONLINE, () => {
            if (mounted) setIsLive(true);
          });

          player.addEventListener(window.Twitch.Player.OFFLINE, () => {
            if (mounted) setIsLive(false);
          });

          player.addEventListener(window.Twitch.Player.PLAY, () => {
            if (mounted) setIsPlaying(true);
          });

          player.addEventListener(window.Twitch.Player.PAUSE, () => {
            if (mounted) setIsPlaying(false);
          });
          
      } catch (err) {
        console.error("Twitch Player Init Error:", err);
        if (mounted) setError("Error al cargar el reproductor de Twitch.");
      }
    };

    // 3. Robust SDK Loader with Timeout Error
    checkInterval = setInterval(() => {
      if (!mounted) {
        clearInterval(checkInterval);
        return;
      }

      if (window.Twitch && window.Twitch.Player) {
        clearInterval(checkInterval);
        initializePlayer();
      } else {
        attempts++;
        if (attempts >= 80) { // 8 seconds timeout
          clearInterval(checkInterval);
          if (mounted) setError("No se pudo conectar con Twitch. Verifica tu conexión.");
        }
      }
    }, 100);

    return () => {
      mounted = false;
      clearInterval(checkInterval);
      cleanup();
    };
  }, [channel, isHidden, embedId]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    playerRef.current.setMuted(newMuted);

    if (!newMuted && volume === 0) {
        const defaultVol = 0.5;
        setVolume(defaultVol);
        playerRef.current.setVolume(defaultVol);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    playerRef.current.setVolume(newVol);
    
    if (newVol === 0) {
        if (!isMuted) {
            setIsMuted(true);
            playerRef.current.setMuted(true);
        }
    } else {
        if (isMuted) {
            setIsMuted(false);
            playerRef.current.setMuted(false);
        }
    }
  };

  const handleShare = (e: React.MouseEvent) => {
      e.stopPropagation();
      const url = `https://twitch.tv/${channel}`;
      navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      });
  };

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  // Invalid Channel Error State
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl h-full flex flex-col items-center justify-center p-6 text-center w-full animate-fade-in">
        <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full mb-3">
             <AlertTriangle size={32} className="text-red-500" />
        </div>
        <h3 className="text-red-700 dark:text-red-400 font-bold mb-1 text-sm">No se pudo cargar el stream</h3>
        <p className="text-zinc-600 dark:text-zinc-400 text-xs mb-4 max-w-[200px]">{error}</p>
        <button 
           onClick={() => window.location.reload()}
           className="text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
            <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    );
  }

  // Hidden State
  if (isHidden) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl h-full flex flex-col items-center justify-center shadow-md animate-fade-in p-6 text-center w-full">
         <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full mb-3 text-zinc-400 dark:text-zinc-500">
             <EyeOff size={32} />
         </div>
         <h3 className="text-zinc-900 dark:text-white font-bold text-sm mb-1">Stream Oculto</h3>
         <p className="text-zinc-500 text-xs mb-4">El reproductor está pausado.</p>
         <button 
           onClick={() => setIsHidden(false)}
           className="bg-twitch-brand hover:bg-twitch-light text-white px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-twitch-brand/20 hover:scale-105 active:scale-95"
         >
            <Eye size={16} /> Ver Stream
         </button>
      </div>
    );
  }

  // Main Player Render
  const overlayVisibility = (!isPlaying || !isReady) 
      ? 'opacity-100' 
      : 'opacity-0 group-hover:opacity-100';

  return (
    <div 
      ref={containerRef}
      className={`bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl h-full w-full flex flex-col shadow-lg overflow-hidden relative group ${isFullscreen ? 'rounded-none border-0' : ''}`}
    >
      {/* Loading Spinner */}
      {!isReady && !error && (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-zinc-900/90 backdrop-blur-sm">
           <div className="flex flex-col items-center gap-3">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-twitch-light"></div>
             <span className="text-twitch-light text-xs font-bold animate-pulse">Conectando...</span>
           </div>
        </div>
      )}

      {/* Control Overlay */}
      <div className={`absolute inset-0 z-10 pointer-events-none flex flex-col justify-between transition-opacity duration-300 ${overlayVisibility}`}>
        
        {/* Top Bar */}
        <div className="bg-gradient-to-b from-black/80 to-transparent p-3 flex justify-between items-start pointer-events-auto">
           {/* Status Badge */}
           <div className="flex items-center gap-2">
              {isLive === true ? (
                <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 animate-pulse shadow-green-500/20 shadow-lg tracking-wider">
                   <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
                </span>
              ) : (
                <span className="bg-zinc-700/80 backdrop-blur text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider">
                   OFFLINE
                </span>
              )}
           </div>

           <div className="flex gap-2">
             <button 
                onClick={handleShare}
                className="text-white/70 hover:text-white bg-black/40 hover:bg-black/70 p-1.5 rounded-lg backdrop-blur-sm transition-all"
                title="Copiar enlace"
             >
                {copied ? <Check size={16} className="text-green-400" /> : <Share2 size={16} />}
             </button>

             <button 
               onClick={() => setIsHidden(true)}
               className="text-white/70 hover:text-white bg-black/40 hover:bg-black/70 p-1.5 rounded-lg backdrop-blur-sm transition-all"
               title="Ocultar"
             >
               <EyeOff size={16} />
             </button>
           </div>
        </div>

        {/* Bottom Controls Bar */}
        <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pb-4 pointer-events-auto">
           <div className="flex items-center gap-3">
              
              {/* Play/Pause */}
              <button 
                 onClick={togglePlay}
                 className="text-white hover:text-twitch-light transition-colors p-1"
              >
                 {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>

              {/* Volume Group */}
              <div className="flex items-center gap-2 group/vol">
                 <button 
                   onClick={toggleMute}
                   className="text-white hover:text-twitch-light transition-colors p-1"
                 >
                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                 </button>
                 
                 <div className="w-0 overflow-hidden group-hover/vol:w-16 sm:group-hover/vol:w-20 transition-all duration-300">
                   <input
                     type="range"
                     min="0"
                     max="1"
                     step="0.01"
                     value={isMuted ? 0 : volume}
                     onChange={handleVolumeChange}
                     onClick={stopPropagation}
                     onMouseDown={stopPropagation}
                     onMouseUp={stopPropagation}
                     className="w-16 sm:w-20 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-twitch-brand"
                   />
                 </div>
              </div>

              {/* Info Text */}
              <div className="ml-auto flex items-center gap-3">
                 <span className="text-[10px] text-zinc-400 font-mono hidden sm:block opacity-70">
                   {channel}
                 </span>
                 
                 {/* Fullscreen Toggle */}
                 <button 
                    onClick={toggleFullscreen}
                    className="text-white hover:text-twitch-light transition-colors p-1"
                 >
                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
