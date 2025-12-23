import React, { useState } from 'react';
import { X, Gamepad2, Target, CircleDot, Fish, Bomb, HelpCircle, Ship, Crosshair, Eye, Swords, Skull, Flag, Camera, Dice6, ChevronDown, Tv, Brain, Users } from 'lucide-react';
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
import { PartyCo } from './games/PartyCo';

type GameTab = 'pium' | 'roulette' | 'fishing' | 'potato' | 'trivia' | 'battleship' | 'duckhunt' | 'veoveo' | 'ppt' | 'ahorcado' | 'carrera' | 'memoria' | 'partyco';
type GameCategory = 'chat' | 'irl' | 'streamer';

interface GameInfo {
  id: GameTab;
  name: string;
  icon: React.ReactNode;
  cmd: string;
  category: GameCategory;
}

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

const CATEGORIES: { id: GameCategory; name: string; icon: React.ReactNode; color: string }[] = [
  { id: 'streamer', name: 'Streamer & Chat', icon: <Tv size={14} />, color: 'from-orange-500 to-red-500' },
  { id: 'chat', name: 'Chat Interactivo', icon: <Users size={14} />, color: 'from-purple-500 to-pink-500' },
  { id: 'irl', name: 'IRL / Cámara', icon: <Camera size={14} />, color: 'from-green-500 to-teal-500' },
];

const GAMES: GameInfo[] = [
  // Streamer & Chat - El streamer hace pruebas o juega con el chat
  { id: 'trivia', name: 'Trivia', icon: <HelpCircle size={16} />, cmd: '1-4', category: 'streamer' },
  { id: 'ahorcado', name: 'Ahorcado', icon: <Skull size={16} />, cmd: '!letra', category: 'streamer' },
  { id: 'partyco', name: 'Party&Co', icon: <Dice6 size={16} />, cmd: '!CO', category: 'streamer' },
  { id: 'battleship', name: 'Hundir', icon: <Ship size={16} />, cmd: 'A1-J10', category: 'streamer' },
  
  // Chat Interactivo - El chat juega entre sí
  { id: 'pium', name: 'Billar', icon: <Target size={16} />, cmd: '!pium', category: 'chat' },
  { id: 'roulette', name: 'Ruleta', icon: <CircleDot size={16} />, cmd: '!ruleta', category: 'chat' },
  { id: 'fishing', name: 'Pesca', icon: <Fish size={16} />, cmd: 'chat', category: 'chat' },
  { id: 'potato', name: 'Patata', icon: <Bomb size={16} />, cmd: '!papa', category: 'chat' },
  { id: 'duckhunt', name: 'Patos', icon: <Crosshair size={16} />, cmd: '!pato', category: 'chat' },
  { id: 'ppt', name: 'PPT', icon: <Swords size={16} />, cmd: '!piedra', category: 'chat' },
  { id: 'carrera', name: 'Carrera', icon: <Flag size={16} />, cmd: '!apostar', category: 'chat' },
  
  // IRL / Cámara - Requieren cámara o entorno real
  { id: 'veoveo', name: 'Veo Veo', icon: <Eye size={16} />, cmd: '!veo', category: 'irl' },
  { id: 'memoria', name: 'Memoria', icon: <Camera size={16} />, cmd: 'IRL', category: 'irl' },
];

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
  const [activeGame, setActiveGame] = useState<GameTab>('trivia');
  const [activeCategory, setActiveCategory] = useState<GameCategory>('streamer');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const currentCategory = CATEGORIES.find(c => c.id === activeCategory)!;
  const gamesInCategory = GAMES.filter(g => g.category === activeCategory);

  const handleSelectGame = (gameId: GameTab) => {
    setActiveGame(gameId);
  };

  const handleSelectCategory = (categoryId: GameCategory) => {
    setActiveCategory(categoryId);
    setShowCategoryDropdown(false);
    // Seleccionar el primer juego de la categoría
    const firstGame = GAMES.find(g => g.category === categoryId);
    if (firstGame) {
      setActiveGame(firstGame.id);
    }
  };

  const renderGameContent = () => {
    switch (activeGame) {
      case 'pium': return <PiumGame chatMessages={chatMessages} isConnected={isConnected} />;
      case 'roulette': return <CasinoRoulette chatMessages={chatMessages} isConnected={isConnected} />;
      case 'fishing': return <ChatFishing chatMessages={chatMessages} isConnected={isConnected} />;
      case 'potato': return <HotPotato chatMessages={chatMessages} isConnected={isConnected} />;
      case 'trivia': return <TriviaBattle chatMessages={chatMessages} isConnected={isConnected} />;
      case 'battleship': return <BattleshipGame chatMessages={chatMessages} isConnected={isConnected} />;
      case 'duckhunt': return <DuckHunt chatMessages={chatMessages} isConnected={isConnected} />;
      case 'veoveo': return <VeoVeo chatMessages={chatMessages} isConnected={isConnected} />;
      case 'ppt': return <PiedraPapelTijera chatMessages={chatMessages} isConnected={isConnected} />;
      case 'ahorcado': return <Ahorcado chatMessages={chatMessages} isConnected={isConnected} />;
      case 'carrera': return <CarreraEmotes chatMessages={chatMessages} isConnected={isConnected} authToken={authToken} channelName={mainChannel} />;
      case 'memoria': return <MemoriaIRL chatMessages={chatMessages} isConnected={isConnected} />;
      case 'partyco': return <PartyCo chatMessages={chatMessages} isConnected={isConnected} />;
      default: return null;
    }
  };

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

      {/* Category Selector + Game Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-2 p-2">
          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r ${currentCategory.color} text-white transition-all hover:opacity-90`}
            >
              {currentCategory.icon}
              <span className="hidden sm:inline">{currentCategory.name}</span>
              <ChevronDown size={14} className={`transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showCategoryDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowCategoryDropdown(false)}
                />
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-20 min-w-[180px]">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleSelectCategory(cat.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                        activeCategory === cat.id 
                          ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white' 
                          : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                      }`}
                    >
                      <span className={`p-1 rounded bg-gradient-to-r ${cat.color} text-white`}>
                        {cat.icon}
                      </span>
                      {cat.name}
                      <span className="ml-auto text-xs text-zinc-400">
                        {GAMES.filter(g => g.category === cat.id).length}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Game Tabs for current category */}
          <div className="flex-1 flex gap-1 overflow-x-auto">
            {gamesInCategory.map((game) => (
              <button
                key={game.id}
                onClick={() => handleSelectGame(game.id)}
                className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                  activeGame === game.id
                    ? 'bg-white dark:bg-zinc-800 text-twitch-brand shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800/50'
                }`}
              >
                {game.icon}
                <span>{game.name}</span>
                <span className="text-[9px] opacity-50 hidden sm:inline">{game.cmd}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="flex-1 overflow-y-auto">
        {renderGameContent()}
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
