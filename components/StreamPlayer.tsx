
import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Volume2, VolumeX, Play, Pause, AlertTriangle, RefreshCw, Maximize, Minimize, Share2, Check } from 'lucide-react';

interface StreamPlayerProps {
  channel: string;
}

declare global {
  interface Window { Twitch: any; }
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({ channel }) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const embedId = useRef(`twitch-embed-${Math.floor(Math.random() * 100000)}`).current;

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!channel) return;
    const channelRegex = /^[a-zA-Z0-9_]{3,25}$/;
    if (!channelRegex.test(channel)) {
        setError("Nombre de canal inválido.");
        setIsReady(false);
        return;
    }
    if (isHidden) return;
    
    let mounted = true;
    let checkInterval: any;

    const cleanup = () => {
      if (playerRef.current) playerRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = ''; 
    };
    cleanup();
    setIsReady(false);
    setError(null);
    setIsLive(null);

    const initializePlayer = () => {
      if (!mounted || !containerRef.current) return;
      const embedElem = document.createElement('div');
      embedElem.id = embedId;
      embedElem.style.width = '100%';
      embedElem.style.height = '100%';
      containerRef.current.appendChild(embedElem);

      const options = {
        width: '100%',
        height: '100%',
        channel: channel,
        parent: [window.location.hostname || 'localhost'],
        muted: true,
        autoplay: true,
        controls: false
      };

      try {
          const player = new window.Twitch.Player(embedId, options);
          playerRef.current = player;

          player.addEventListener(window.Twitch.Player.READY, () => {
            if (!mounted) return;
            setIsReady(true);
            try {
              player.setVolume(0.5);
              if (player.getMuted() !== undefined) setIsMuted(player.getMuted());
            } catch (e) {}
          });

          player.addEventListener(window.Twitch.Player.ONLINE, () => { if (mounted) setIsLive(true); });
          player.addEventListener(window.Twitch.Player.OFFLINE, () => { if (mounted) setIsLive(false); });
          player.addEventListener(window.Twitch.Player.PLAY, () => { if (mounted) setIsPlaying(true); });
          player.addEventListener(window.Twitch.Player.PAUSE, () => { if (mounted) setIsPlaying(false); });
          
      } catch (err) {
        if (mounted) setError("Error al cargar reproductor.");
      }
    };

    let attempts = 0;
    checkInterval = setInterval(() => {
      if (!mounted) { clearInterval(checkInterval); return; }
      if (window.Twitch && window.Twitch.Player) {
        clearInterval(checkInterval);
        initializePlayer();
      } else {
        attempts++;
        if (attempts >= 80) {
          clearInterval(checkInterval);
          if (mounted) setError("Error de conexión con Twitch.");
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
    isPlaying ? playerRef.current.pause() : playerRef.current.play();
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    !document.fullscreenElement ? containerRef.current.requestFullscreen() : document.exitFullscreen();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    playerRef.current.setMuted(newMuted);
    if (!newMuted && volume === 0) {
        setVolume(0.5);
        playerRef.current.setVolume(0.5);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    playerRef.current.setVolume(newVol);
    if (newVol === 0 && !isMuted) {
       setIsMuted(true);
       playerRef.current.setMuted(true);
    } else if (newVol > 0 && isMuted) {
       setIsMuted(false);
       playerRef.current.setMuted(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(`https://twitch.tv/${channel}`).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      });
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl h-full flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle size={32} className="text-red-500 mb-2" />
        <h3 className="text-red-700 dark:text-red-400 font-bold mb-1">Error de carga</h3>
        <p className="text-zinc-500 text-xs">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-xs font-bold text-red-600 flex gap-1 items-center"><RefreshCw size={12}/> Reintentar</button>
      </div>
    );
  }

  if (isHidden) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl h-full flex flex-col items-center justify-center shadow-md p-6 text-center">
         <EyeOff size={32} className="text-zinc-400 mb-2" />
         <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Stream Oculto</h3>
         <button onClick={() => setIsHidden(false)} className="mt-4 bg-twitch-brand text-white px-4 py-2 rounded-full text-xs font-bold flex gap-2"><Eye size={14}/> Ver Stream</button>
      </div>
    );
  }

  const overlayVisibility = (!isPlaying || !isReady) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100';

  return (
    <div ref={containerRef} className={`bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl h-full w-full relative group overflow-hidden ${isFullscreen ? 'rounded-none border-0' : ''}`}>
      {!isReady && (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-zinc-900/90">
           <div className="flex flex-col items-center gap-2">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-twitch-light"></div>
           </div>
        </div>
      )}

      <div className={`absolute inset-0 z-10 pointer-events-none flex flex-col justify-between transition-opacity duration-300 ${overlayVisibility}`}>
        <div className="bg-gradient-to-b from-black/80 to-transparent p-3 flex justify-between items-start pointer-events-auto">
           {isLive === true ? (
             <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 animate-pulse shadow-lg tracking-wider border border-red-500">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
             </span>
           ) : (
             <span className="bg-zinc-700/80 backdrop-blur text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded">OFFLINE</span>
           )}
           <div className="flex gap-2">
             <button onClick={handleShare} className="text-white/70 hover:text-white bg-black/40 p-1.5 rounded-lg backdrop-blur-sm">
                {copied ? <Check size={16} className="text-green-400" /> : <Share2 size={16} />}
             </button>
             <button onClick={() => setIsHidden(true)} className="text-white/70 hover:text-white bg-black/40 p-1.5 rounded-lg backdrop-blur-sm"><EyeOff size={16} /></button>
           </div>
        </div>

        <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pb-4 pointer-events-auto flex items-center gap-3">
           <button onClick={togglePlay} className="text-white hover:text-twitch-light p-1">
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
           </button>
           <div className="flex items-center gap-2 group/vol">
              <button onClick={toggleMute} className="text-white hover:text-twitch-light p-1">
                 {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300">
                <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={handleVolumeChange} onClick={e=>e.stopPropagation()} className="w-20 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-twitch-brand" />
              </div>
           </div>
           <div className="ml-auto">
              <button onClick={toggleFullscreen} className="text-white hover:text-twitch-light p-1">
                 {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
