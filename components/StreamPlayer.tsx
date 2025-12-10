import React, { useState } from 'react';
import { Eye, EyeOff, AlertTriangle, Share2, Check, Tv, ExternalLink, Play } from 'lucide-react';
import { useI18n } from '../i18n';

interface StreamPlayerProps {
  channel: string;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({ channel }) => {
  const { t } = useI18n();
  const [isLoaded, setIsLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(`https://twitch.tv/${channel}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openInTwitch = () => {
    window.open(`https://twitch.tv/${channel}`, '_blank');
  };

  // No channel connected
  if (!channel || channel.trim() === '') {
    return (
      <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl h-full flex flex-col items-center justify-center p-6 text-center">
        <Tv size={40} className="text-zinc-400 dark:text-zinc-600 mb-3" />
        <h3 className="font-bold text-sm text-zinc-700 dark:text-zinc-300 mb-1">{t.nav.notConnected}</h3>
        <p className="text-zinc-500 text-xs">{t.nav.connectToChannel}</p>
      </div>
    );
  }

  // Invalid channel
  const channelRegex = /^[a-zA-Z0-9_]{3,25}$/;
  if (!channelRegex.test(channel)) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl h-full flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle size={32} className="text-red-500 mb-2" />
        <h3 className="text-red-700 dark:text-red-400 font-bold mb-1">{t.nav.invalidChannel}</h3>
        <p className="text-zinc-500 text-xs">{t.nav.invalidChannelName}</p>
      </div>
    );
  }

  // Not loaded yet - show preview with load button
  if (!isLoaded) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl h-full flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-twitch-brand/20 to-transparent" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-twitch-brand/20 flex items-center justify-center mb-4">
            <Tv size={32} className="text-twitch-light" />
          </div>
          
          <h3 className="font-bold text-sm text-white mb-1">{channel}</h3>
          <p className="text-zinc-500 text-xs mb-4">{t.nav.twitchStream}</p>
          
          <div className="flex flex-col gap-2 w-full max-w-[200px]">
            <button 
              onClick={() => setIsLoaded(true)} 
              className="bg-twitch-brand hover:bg-twitch-light text-white px-4 py-2.5 rounded-lg text-xs font-bold flex gap-2 items-center justify-center transition-colors w-full"
            >
              <Play size={14} fill="currentColor" /> {t.nav.loadStream}
            </button>
            
            <button 
              onClick={openInTwitch} 
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-xs font-bold flex gap-2 items-center justify-center transition-colors w-full"
            >
              <ExternalLink size={14} /> {t.nav.openInTwitch}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loaded - show iframe
  const parent = window.location.hostname || 'localhost';
  const embedUrl = `https://player.twitch.tv/?channel=${channel}&parent=${parent}&muted=true`;

  return (
    <div className="bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl h-full w-full relative group overflow-hidden">
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        title={`Stream de ${channel}`}
      />
      
      {/* Overlay controls on hover */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-2 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="bg-twitch-brand/90 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
          <Tv size={12} /> {channel}
        </span>
        <div className="flex gap-1.5">
          <button onClick={handleShare} className="text-white/80 hover:text-white bg-black/50 p-1.5 rounded-lg" title={t.nav.copyLink}>
            {copied ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
          </button>
          <button onClick={openInTwitch} className="text-white/80 hover:text-white bg-black/50 p-1.5 rounded-lg" title={t.nav.openInTwitch}>
            <ExternalLink size={14} />
          </button>
          <button onClick={() => setIsLoaded(false)} className="text-white/80 hover:text-white bg-black/50 p-1.5 rounded-lg" title={t.nav.closeStream}>
            <EyeOff size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
