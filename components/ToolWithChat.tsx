import React, { useState } from 'react';
import { TwitchMessage, PollOption, CollaborationChannel } from '../types';
import { ChatFeed } from './ChatFeed';
import { StreamPlayer } from './StreamPlayer';
import { CollaborationPanel } from './CollaborationPanel';
import { MessageSquare, Tv, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n, useTranslationModule } from '../i18n';

interface ToolWithChatProps {
  children: React.ReactNode;
  chatMessages: TwitchMessage[];
  userVoteMap: Map<string, number>;
  pollOptions?: PollOption[];
  collaborationChannels?: CollaborationChannel[];
  mainChannel?: string;
  title?: string;
  onAddCollaborator?: (channel: string) => void;
  onRemoveCollaborator?: (channel: string) => void;
  isConnected?: boolean;
}

export const ToolWithChat: React.FC<ToolWithChatProps> = ({
  children,
  chatMessages,
  userVoteMap,
  pollOptions,
  collaborationChannels = [],
  mainChannel = '',
  onAddCollaborator,
  onRemoveCollaborator,
  isConnected = true,
}) => {
  const { t } = useI18n();
  
  // Navigation module is already loaded as core, no need for lazy loading
  // useTranslationModule('nav'); // Removed - nav is core module
  
  const [showPanel, setShowPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'stream' | 'collab'>('chat');
  const [panelMode, setPanelMode] = useState<'tabs' | 'split'>('tabs');
  const [splitRatio, setSplitRatio] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [showCollabInSplit, setShowCollabInSplit] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex bg-black/90 backdrop-blur-sm">
      {/* Main tool content */}
      <div className="flex-1 flex items-center justify-center overflow-auto transition-all duration-300">
        {children}
      </div>

      {/* Panel toggle button when hidden */}
      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-twitch-brand hover:bg-twitch-light text-white p-2 rounded-l-lg shadow-lg transition-all z-50 flex flex-col items-center gap-1"
          title="Mostrar panel"
        >
          <ChevronLeft size={20} />
          <MessageSquare size={16} />
        </button>
      )}

      {/* Right Panel - Full Chat/Stream/Collab panel */}
      {showPanel && (
        <div 
          className="h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl animate-slide-in-right w-80 lg:w-96"
        >
          {/* Collapse button */}
          <button 
            className="absolute top-1/2 -translate-y-1/2 -left-4 w-4 h-16 flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 rounded-l-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors z-10 shadow-sm"
            onClick={() => setShowPanel(false)}
            title="Ocultar panel"
          >
            <ChevronRight size={14} />
          </button>

          {/* Header with tabs */}
          <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            {panelMode === 'tabs' ? (
              <>
                <button 
                  className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'text-twitch-brand border-b-2 border-twitch-brand' : 'text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                  onClick={() => setActiveTab('chat')}
                >
                  <MessageSquare size={16} /> {t.nav.chat}
                </button>
                <button 
                  className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'stream' ? 'text-twitch-brand border-b-2 border-twitch-brand' : 'text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                  onClick={() => setActiveTab('stream')}
                >
                  <Tv size={16} /> {t.nav.stream}
                </button>
                <button 
                  className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'collab' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                  onClick={() => setActiveTab('collab')}
                >
                  <Users size={16} /> 
                  {collaborationChannels.length > 0 && (
                    <span className="bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] px-1 py-0.5 rounded-full font-bold">
                      {collaborationChannels.length}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <div className="flex-1 py-2 px-3 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-400">
                  <span className="flex items-center gap-1"><MessageSquare size={12} /> Chat</span>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <span className="flex items-center gap-1"><Tv size={12} /> Stream</span>
                  {collaborationChannels.length > 0 && (
                    <>
                      <span className="text-zinc-300 dark:text-zinc-700">|</span>
                      <span className="flex items-center gap-1 text-cyan-500"><Users size={12} /> +{collaborationChannels.length}</span>
                    </>
                  )}
                </div>
              </div>
            )}
            {/* Mode toggle button */}
            <button
              onClick={() => setPanelMode(panelMode === 'tabs' ? 'split' : 'tabs')}
              className="p-2 mr-1 text-zinc-400 hover:text-twitch-brand hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title={panelMode === 'tabs' ? 'Ver ambos (split)' : 'Ver uno (tabs)'}
            >
              {panelMode === 'tabs' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              )}
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {panelMode === 'tabs' ? (
              // Tab mode - show one at a time
              activeTab === 'chat' ? (
                <ChatFeed 
                  messages={chatMessages} 
                  userVoteMap={userVoteMap} 
                  options={pollOptions}
                  collaborationChannels={collaborationChannels}
                  mainChannel={mainChannel}
                  isConnected={isConnected}
                />
              ) : activeTab === 'stream' ? (
                <div className="h-full p-2 bg-black">
                  <StreamPlayer channel={mainChannel} />
                </div>
              ) : (
                // Collaboration tab
                <div className="h-full p-4 overflow-y-auto">
                  <CollaborationPanel
                    mainChannel={mainChannel}
                    collaborationChannels={collaborationChannels}
                    onAddCollaborator={onAddCollaborator || (() => {})}
                    onRemoveCollaborator={onRemoveCollaborator || (() => {})}
                    isConnected={isConnected}
                  />
                </div>
              )
            ) : (
              // Split mode - show chat and stream with collab toggle
              <>
                {/* Collab toggle in split mode */}
                <div className="flex items-center justify-between px-2 py-1 bg-zinc-100 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
                  <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-400">
                    <MessageSquare size={12} /> Chat + <Tv size={12} /> Stream
                  </div>
                  <button
                    onClick={() => setShowCollabInSplit(!showCollabInSplit)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      showCollabInSplit 
                        ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' 
                        : 'text-zinc-400 hover:text-cyan-500 hover:bg-cyan-500/10'
                    }`}
                    title="Mostrar/ocultar colaboración"
                  >
                    <Users size={12} />
                    {collaborationChannels.length > 0 && (
                      <span className="bg-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-[10px] px-1 rounded-full">
                        {collaborationChannels.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Collab panel overlay in split mode */}
                {showCollabInSplit && (
                  <div className="absolute inset-0 z-10 bg-white dark:bg-zinc-900 overflow-y-auto p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                        <Users size={16} className="text-cyan-500" /> Colaboración
                      </h3>
                      <button
                        onClick={() => setShowCollabInSplit(false)}
                        className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <CollaborationPanel
                      mainChannel={mainChannel}
                      collaborationChannels={collaborationChannels}
                      onAddCollaborator={onAddCollaborator || (() => {})}
                      onRemoveCollaborator={onRemoveCollaborator || (() => {})}
                      isConnected={isConnected}
                    />
                  </div>
                )}

                {/* Chat section */}
                <div 
                  className="overflow-hidden shrink-0"
                  style={{ height: `${splitRatio}%` }}
                >
                  <ChatFeed 
                    messages={chatMessages} 
                    userVoteMap={userVoteMap} 
                    options={pollOptions}
                    collaborationChannels={collaborationChannels}
                    mainChannel={mainChannel}
                    isConnected={isConnected}
                  />
                </div>
                
                {/* Draggable divider */}
                <div 
                  className={`h-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-twitch-brand/50 cursor-row-resize flex items-center justify-center shrink-0 transition-colors ${isDraggingSplit ? 'bg-twitch-brand/50' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDraggingSplit(true);
                    const startY = e.clientY;
                    const startRatio = splitRatio;
                    const container = e.currentTarget.parentElement;
                    if (!container) return;
                    const containerHeight = container.offsetHeight;
                    
                    const handleMouseMove = (e: MouseEvent) => {
                      const deltaY = e.clientY - startY;
                      const deltaRatio = (deltaY / containerHeight) * 100;
                      const newRatio = Math.min(80, Math.max(20, startRatio + deltaRatio));
                      setSplitRatio(newRatio);
                    };
                    
                    const handleMouseUp = () => {
                      setIsDraggingSplit(false);
                      window.removeEventListener('mousemove', handleMouseMove);
                      window.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    window.addEventListener('mousemove', handleMouseMove);
                    window.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  <div className="w-8 h-1 bg-zinc-400 dark:bg-zinc-600 rounded-full" />
                </div>
                
                {/* Stream section */}
                <div 
                  className="flex-1 overflow-hidden bg-black p-1"
                  style={{ minHeight: '20%' }}
                >
                  <StreamPlayer channel={mainChannel} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
