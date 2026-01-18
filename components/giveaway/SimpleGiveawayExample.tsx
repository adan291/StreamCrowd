/**
 * SimpleGiveawayExample Component
 * 
 * Example component demonstrating Redux-based giveaway management
 * using the useGiveaway hook. This serves as a reference implementation
 * for simpler giveaway use cases.
 * 
 * @requirements 3.5, 3.6 - Redux-based giveaway state management
 */

import React, { useState } from 'react';
import { Gift, Users, Trophy, Plus, Trash2, Play, RotateCcw } from 'lucide-react';
import { useGiveaway } from '../../src/application/hooks/useGiveaway';

/**
 * Simple giveaway component using Redux state
 * 
 * Features:
 * - Create giveaway with title
 * - Add/remove participants
 * - Select winner with animation
 * - View giveaway history
 * - Cloud sync status
 * 
 * This component demonstrates the Redux migration pattern for giveaway features.
 */
export const SimpleGiveawayExample: React.FC = () => {
  const giveaway = useGiveaway();
  const [title, setTitle] = useState('');
  const [participantName, setParticipantName] = useState('');

  const handleCreateGiveaway = () => {
    if (title.trim()) {
      giveaway.createGiveaway(title);
      setTitle('');
    }
  };

  const handleAddParticipant = () => {
    if (participantName.trim() && giveaway.activeGiveaway) {
      giveaway.addParticipant({
        username: participantName,
        platform: 'twitch',
      });
      setParticipantName('');
    }
  };

  const handleSelectWinner = () => {
    if (giveaway.activeGiveaway && giveaway.participants.length > 0) {
      giveaway.selectWinner();
      // Confirm winner after animation (in real app, this would be after animation completes)
      setTimeout(() => {
        giveaway.confirmWinner();
      }, 2000);
    }
  };

  const handleEndGiveaway = () => {
    giveaway.endGiveaway();
  };

  const handleReset = () => {
    giveaway.resetGiveaway();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Gift className="text-white" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">
            Simple Giveaway (Redux)
          </h2>
        </div>
        
        {/* Cloud Sync Status */}
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${giveaway.cloudSyncEnabled ? 'bg-green-500' : 'bg-zinc-400'}`} />
          <span className="text-zinc-600 dark:text-zinc-400">
            {giveaway.cloudSyncEnabled ? 'Cloud Sync On' : 'Cloud Sync Off'}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {giveaway.error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-600 dark:text-red-400 text-sm">{giveaway.error}</p>
          <button
            onClick={giveaway.clearError}
            className="mt-2 text-xs text-red-500 hover:text-red-600"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Giveaway */}
      {!giveaway.activeGiveaway && (
        <div className="p-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-4">
          <h3 className="font-semibold text-zinc-800 dark:text-white">Create New Giveaway</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateGiveaway()}
              placeholder="Giveaway title..."
              className="flex-1 px-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={handleCreateGiveaway}
              disabled={!title.trim()}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Active Giveaway */}
      {giveaway.activeGiveaway && (
        <div className="space-y-4">
          {/* Giveaway Info */}
          <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-zinc-800 dark:text-white">
                {giveaway.activeGiveaway.title}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                giveaway.status === 'active' ? 'bg-green-500/20 text-green-600' :
                giveaway.status === 'selecting' ? 'bg-yellow-500/20 text-yellow-600' :
                'bg-zinc-500/20 text-zinc-600'
              }`}>
                {giveaway.status}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>{giveaway.participantCount} participants</span>
              </div>
              {giveaway.winner && (
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <Trophy size={16} />
                  <span className="font-semibold">{giveaway.winner.username}</span>
                </div>
              )}
            </div>
          </div>

          {/* Add Participants */}
          {giveaway.status === 'active' && (
            <div className="p-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-4">
              <h4 className="font-semibold text-zinc-800 dark:text-white">Add Participants</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
                  placeholder="Participant username..."
                  className="flex-1 px-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddParticipant}
                  disabled={!participantName.trim()}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={20} />
                </button>
              </div>

              {/* Participants List */}
              {giveaway.participants.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {giveaway.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg"
                    >
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {participant.username}
                      </span>
                      <button
                        onClick={() => giveaway.removeParticipant(participant.id)}
                        className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {giveaway.status === 'active' && (
              <>
                <button
                  onClick={handleSelectWinner}
                  disabled={giveaway.participantCount === 0}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Play size={20} />
                  Select Winner
                </button>
                <button
                  onClick={giveaway.clearParticipants}
                  className="px-4 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </>
            )}
            
            {giveaway.status === 'selecting' && (
              <div className="flex-1 px-4 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-center">
                <p className="text-yellow-600 dark:text-yellow-400 font-medium animate-pulse">
                  Selecting winner...
                </p>
              </div>
            )}

            {giveaway.status === 'ended' && giveaway.winner && (
              <>
                <button
                  onClick={handleEndGiveaway}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  Save to History
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                >
                  <RotateCcw size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* History */}
      {giveaway.historyCount > 0 && (
        <div className="p-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-800 dark:text-white">
              History ({giveaway.historyCount})
            </h3>
            <button
              onClick={giveaway.clearHistory}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {giveaway.history.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-800 dark:text-white text-sm">
                      {item.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Winner: <span className="font-semibold">{item.winner?.username}</span>
                      {' • '}
                      {item.participants.length} participants
                    </p>
                  </div>
                  <button
                    onClick={() => giveaway.removeFromHistory(item.id)}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cloud Sync Controls */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-white">Cloud Sync</p>
            <p className="text-xs text-zinc-500 mt-1">
              {giveaway.cloudSyncEnabled ? 'Syncing to cloud' : 'Local storage only'}
            </p>
          </div>
          <button
            onClick={() => {
              if (giveaway.cloudSyncEnabled) {
                giveaway.disableCloudSync();
              } else {
                giveaway.enableCloudSync();
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              giveaway.cloudSyncEnabled
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
            }`}
          >
            {giveaway.cloudSyncEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleGiveawayExample;
