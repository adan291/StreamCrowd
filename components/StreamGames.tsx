import React, { useState } from 'react';
import { X, Gamepad2, Target, CircleDot, Fish, Bomb, HelpCircle, Ship, Crosshair, Eye, Swords, Skull, Flag, Camera } from 'lucide-react';
import { TwitchMessage, CollaborationChannel } from '../types';
import { useI18n } from '../i18n';
import { ToolWithChat } from './ToolWithChat';
import { PiumGame } from './games/PiumGame';
import { CasinoRoulette } from './games/CasinoRoulette';
import { ChatFishing } from './games/ChatFishing';
import { HotPotato } from './games/HotPotato';
import { TriviaBattle } from './games/TriviaBattle';
import { BattleshipGame } from './games/BattleshipGame';
import { DuckHunt } from './games/DuckHunt';
import { VeoVeo } from './games/VeoVeo';
import { PiedraPapelTijera } from './games/PiedraPapelTijera';
import { Ahorcado } from './games/Ahorcado';
import { CarreraEmotes } from './games/CarreraEmotes';
import { MemoriaIRL } from './games/MemoriaIRL';

type GameTab = 'pium' | 'roulette' | 'fishing' | 'potato' | 'trivia' | 'battleship' | 'duckhunt' | 'veoveo' | 'ppt' | 'ahorcado' | 'carrera' | 'memoria';

interface StreamGamesProps {
  chatMessages: TwitchMessage[];
  onClose?: () => void;
  isEmbedded?: boolean;
  userVoteMap?: Map<string, number>;
  collaborationChannels?: CollaborationChannel[];
  mainChannel?: string;
  onAddCollaborator?: (channel: string) => void;
  onRemoveCollaborator?: (channel: string) => void;
  isConnected?: boolean;
  authToken?: string;
}

export const StreamGames: React.FC<StreamGamesProps> = ({
  chatMessages,
  onClose,
  isEmbedded = false,
  userVoteMap = new Map(),
  collaborationChannels = [],
  mainChannel,
  onAddCollaborator,
  onRemoveCollaborator,
  isConnected = true,
  authToken,
}) => {
  const { t } = useI18n();
  const [activeGame, setActiveGame] = useState<GameTab>('pium');

  const games = [
    { id: 'pium' as GameTab, name: 'Billar', icon: <Target size={16} />, cmd: '!pium' },
    { id: 'roulette' as GameTab, name: 'Ruleta', icon: <CircleDot size={16} />, cmd: '!ruleta' },
    { id: 'fishing' as GameTab, name: 'Pesca', icon: <Fish size={16} />, cmd: 'chat' },
    { id: 'potato' as GameTab, name: 'Patata', icon: <Bomb size={16} />, cmd: '!papa' },
    { id: 'trivia' as GameTab, name: 'Trivia', icon: <HelpCircle size={16} />, cmd: '1-4' },
    { id: 'battleship' as GameTab, name: 'Hundir', icon: <Ship size={16} />, cmd: 'A1-J10' },
    { id: 'duckhunt' as GameTab, name: 'Patos', icon: <Crosshair size={16} />, cmd: '!pato' },
    { id: 'veoveo' as GameTab, name: 'Veo Veo', icon: <Eye size={16} />, cmd: '!veo' },
    { id: 'ppt' as GameTab, name: 'PPT', icon: <Swords size={16} />, cmd: '!piedra' },
    { id: 'ahorcado' as GameTab, name: 'Ahorcado', icon: <Skull size={16} />, cmd: '!letra' },
    { id: 'carrera' as GameTab, name: 'Carrera', icon: <Flag size={16} />, cmd: '!apostar' },
    { id: 'memoria' as GameTab, name: 'Memoria', icon: <Camera size={16} />, cmd: 'IRL' },
  ];

  const content = (
    <div className={`${isEmbedded ? 'h-full' : ''} flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl">
            <Gamepad2 className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {t.games?.title || 'Stream Games'}
            </h2>
            <p className="text-xs text-zinc-500">
              {t.games?.subtitle || 'Interactive games for your stream'}
            </p>
          </div>
        </div>
        {!isEmbedded && onClose && (
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Game Tabs - Scrollable */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 shrink-0 overflow-x-auto">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => setActiveGame(game.id)}
            className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-medium transition-all whitespace-nowrap ${
              activeGame === game.id
                ? 'text-twitch-brand border-b-2 border-twitch-brand bg-white dark:bg-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {game.icon}
            <span>{game.name}</span>
            <span className="text-[9px] opacity-50 hidden sm:inline">{game.cmd}</span>
          </button>
        ))}
      </div>

      {/* Game Content */}
      <div className="flex-1 overflow-y-auto">
        {activeGame === 'pium' && (
          <PiumGame chatMessages={chatMessages} isConnected={isConnected} />
        )}
        {activeGame === 'roulette' && (
          <CasinoRoulette chatMessages={chatMessages} isConnected={isConnected} />
        )}
        {activeGame === 'fishing' && (
          <ChatFishing chatMessages={chatMessages} isConnected={isConnected} />
        )}
        {activeGame === 'potato' && (
          <HotPotato chatMessages={chatMessages} isConnected={isConnected} />
        )}
        {activeGame === 'trivia' && (
          <TriviaBattle chatMessages={chatMessages} isConnected={isConnected} />
        )}
        {activeGame === 'battleship' && (
          <BattleshipGame chatMessages={chatMessages} isConnected={isConnected} />
        )}
        {activeGame === 'duckhunt' && (
          <DuckHunt chatMessages={chatMessages} isConnected={isConnected} />
        )}
        {activeGame === 'veoveo' && (
          <VeoVeo chatMessages={chatMessages} isConnected={isConnected} />
        )}
        {activeGame === 'ppt' && (
          <PiedraPapelTijera chatMessages={chatMessages} isConnected={isConnected} />
        )}
        {activeGame === 'ahorcado' && (
          <Ahorcado chatMessages={chatMessages} isConnected={isConnected} />
        )}
        {activeGame === 'carrera' && (
          <CarreraEmotes chatMessages={chatMessages} isConnected={isConnected} authToken={authToken} channelName={mainChannel} />
        )}
        {activeGame === 'memoria' && (
          <MemoriaIRL chatMessages={chatMessages} isConnected={isConnected} />
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <ToolWithChat
      chatMessages={chatMessages}
      userVoteMap={userVoteMap}
      collaborationChannels={collaborationChannels}
      mainChannel={mainChannel}
      onAddCollaborator={onAddCollaborator}
      onRemoveCollaborator={onRemoveCollaborator}
      isConnected={isConnected}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full mx-4 relative max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {content}
      </div>
    </ToolWithChat>
  );
};

export default StreamGames;
