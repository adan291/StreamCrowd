import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Volume2, VolumeX, Play, Pause, AlertTriangle, RefreshCw } from 'lucide-react';

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
  
  // Playback Controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true); // Twitch embeds usually start muted
  const [volume, setVolume] = useState(0.5);

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const embedId = "twitch-embed";

  useEffect(() => {
    if (!channel || isHidden) return;
    
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
      if (!mounted) return;

      const hostname = window.location.hostname;
      const parent = hostname === '' ? 'localhost' : hostname;

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
          const player = new window.Twitch.Player(embedId, options);
          playerRef.current = player;

          if (!mounted) return;

          // Event Listeners
          player.addEventListener(window.Twitch.Player.READY, () => {
            if (!mounted) return;
            setIsReady(true);
            player.setVolume(0.5);
            setIsMuted(player.getMuted());
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
        if (mounted) setError("Error al inicializar el reproductor.");
      }
    };

    // Robust SDK Loader: Wait for script to load
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
        if (attempts >= 50) { // 5 seconds
          clearInterval(checkInterval);
          if (mounted) setError("No se pudo cargar el SDK de Twitch. Verifica tu conexión o bloqueadores de anuncios.");
        }
      }
    }, 100);

    return () => {
      mounted = false;
      clearInterval(checkInterval);
      cleanup();
    };
  }, [channel, isHidden]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    playerRef.current.setMuted(newMuted);

    // If unmuting and volume is 0, reset to 50% so user can hear
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
    
    // Auto-mute if dragged to 0
    if (newVol === 0) {
        if (!isMuted) {
            setIsMuted(true);
            playerRef.current.setMuted(true);
        }
    } else {
        // Auto-unmute if dragged up
        if (isMuted) {
            setIsMuted(false);
            playerRef.current.setMuted(false);
        }
    }
  };

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  if (isHidden) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl h-full flex flex-col items-center justify-center shadow-lg animate-fade-in p-6 text-center">
         <div className="bg-zinc-800 p-4 rounded-full mb-4">
             <EyeOff size={32} className="text-zinc-500" />
         </div>
         <h3 className="text-white font-bold text-lg mb-2">Stream Oculto</h3>
         <p className="text-zinc-500 text-sm mb-6">El reproductor está pausado para ahorrar recursos.</p>
         <button 
           onClick={() => setIsHidden(false)}
           className="bg-twitch-brand hover:bg-twitch-light text-white px-6 py-2 rounded-full font-bold transition-colors flex items-center gap-2"
         >
            <Eye size={18} /> Ver Stream
         </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/10 border border-red-900/30 rounded-xl h-full flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h3 className="text-red-400 font-bold mb-2">Error del Reproductor</h3>
        <p className="text-zinc-400 text-sm mb-4">{error}</p>
        <button 
           onClick={() => window.location.reload()}
           className="text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
        >
            <RefreshCw size={14} /> Recargar Página
        </button>
      </div>
    );
  }

  return (
    <div className="bg-black border border-zinc-800 rounded-xl h-full flex flex-col shadow-lg overflow-hidden relative group">
      {/* Container for Twitch Embed */}
      <div 
        ref={containerRef} 
        id={embedId} 
        className="w-full h-full"
      />

      {/* Loading Spinner */}
      {!isReady && (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-zinc-900">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-twitch-light"></div>
        </div>
      )}

      {/* Control Overlay */}
      <div className={`absolute inset-0 z-10 pointer-events-none flex flex-col justify-between transition-opacity duration-300 ${isReady ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
        
        {/* Top Bar */}
        <div className="bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-start pointer-events-auto">
           {/* Status Badge */}
           <div className="flex items-center gap-2">
              {isLive === true && (
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                   <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
                </span>
              )}
              {isLive === false && (
                <span className="bg-zinc-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                   OFFLINE
                </span>
              )}
           </div>

           {/* Hide Button */}
           <button 
             onClick={() => setIsHidden(true)}
             className="text-white/80 hover:text-white bg-black/50 hover:bg-black/80 p-2 rounded-lg backdrop-blur-sm transition-all"
             title="Ocultar Stream"
           >
             <EyeOff size={20} />
           </button>
        </div>

        {/* Bottom Controls Bar */}
        <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pb-6 pointer-events-auto">
           <div className="flex items-center gap-4">
              
              {/* Play/Pause */}
              <button 
                 onClick={togglePlay}
                 className="text-white hover:text-twitch-light transition-colors"
                 title={isPlaying ? "Pausar" : "Reproducir"}
              >
                 {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              </button>

              {/* Volume Group */}
              <div className="flex items-center gap-2 group/vol">
                 <button 
                   onClick={toggleMute}
                   className="text-white hover:text-twitch-light transition-colors"
                   title={isMuted ? "Activar Sonido" : "Silenciar"}
                 >
                    {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                 </button>
                 
                 <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
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
                     className="w-24 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-twitch-brand"
                   />
                 </div>
              </div>

              {/* Info Text */}
              <div className="ml-auto text-xs text-zinc-400 font-mono">
                 {channel}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};