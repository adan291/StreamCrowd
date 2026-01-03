/**
 * MacroPresets Component
 * 
 * Displays pre-configured macro templates that users can quickly add.
 * Especially useful for moderators who need quick access to chat commands.
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Heart,
  Monitor,
  Plus,
  Zap,
  Clock,
  Share2,
  Users,
  Droplet,
  Check,
  Search,
  X,
  Shield,
  Trophy,
  Sparkles,
  Skull,
  Flame,
} from 'lucide-react';
import {
  MACRO_PRESETS,
  PRESET_CATEGORIES,
  type MacroPreset,
  type PresetCategory,
} from '../../config/macroPresets';

// ============================================
// Types
// ============================================

export interface MacroPresetsProps {
  /** Callback when a preset is selected to be added */
  onAddPreset: (preset: MacroPreset) => void;
  /** Whether the user is viewing as moderator (not broadcaster) */
  isModeratorView?: boolean;
  /** Current platform */
  platform?: 'twitch' | 'youtube' | 'kick';
}

type Platform = 'twitch' | 'youtube' | 'kick';

// ============================================
// Icon Mapping
// ============================================

const ICON_MAP: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp size={18} />,
  Heart: <Heart size={18} />,
  Monitor: <Monitor size={18} />,
  Clock: <Clock size={18} />,
  Share2: <Share2 size={18} />,
  Users: <Users size={18} />,
  Droplet: <Droplet size={18} />,
  Trophy: <Trophy size={18} />,
  Sparkles: <Sparkles size={18} />,
  Skull: <Skull size={18} />,
  Flame: <Flame size={18} />,
};

const getIcon = (iconName: string) => ICON_MAP[iconName] || <Zap size={18} />;

// ============================================
// Component
// ============================================

export const MacroPresets: React.FC<MacroPresetsProps> = ({
  onAddPreset,
  isModeratorView = false,
  platform = 'twitch',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory | null>(null);
  const [addedPresets, setAddedPresets] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Filter presets based on platform, user role, category, and search
  const filteredPresets = useMemo(() => {
    let presets = MACRO_PRESETS.filter(p => p.platforms.includes(platform as Platform));
    
    if (isModeratorView) {
      presets = presets.filter(p => p.worksForModerators);
    }
    
    if (selectedCategory) {
      presets = presets.filter(p => p.category === selectedCategory);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      presets = presets.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.macro.name.toLowerCase().includes(query)
      );
    }
    
    return presets;
  }, [platform, isModeratorView, selectedCategory, searchQuery]);

  // Get categories that have presets for the current user role
  const availableCategories = useMemo(() => {
    const categoryIds = new Set(
      MACRO_PRESETS
        .filter(p => p.platforms.includes(platform as Platform))
        .filter(p => !isModeratorView || p.worksForModerators)
        .map(p => p.category)
    );
    return PRESET_CATEGORIES.filter(c => categoryIds.has(c.id));
  }, [platform, isModeratorView]);

  const handleAddPreset = (preset: MacroPreset) => {
    onAddPreset(preset);
    setAddedPresets(prev => new Set([...prev, preset.id]));
    
    // Remove from added after 2 seconds
    setTimeout(() => {
      setAddedPresets(prev => {
        const next = new Set(prev);
        next.delete(preset.id);
        return next;
      });
    }, 2000);
  };

  return (
    <>
      {/* Role View Banner */}
      {isModeratorView && (
        <div className="mx-4 mt-4 flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
          <Shield size={14} className="text-green-500" />
          <span className="text-xs text-green-400">
            Vista de moderador: solo presets basados en comandos de chat
          </span>
        </div>
      )}

      {/* Search Bar */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar presets..."
            className="w-full pl-9 pr-8 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === null
                ? 'bg-pink-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            Todos
          </button>
          {availableCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-pink-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
            >
              {getIcon(category.icon)}
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Presets Grid */}
      <div className="px-4 pb-4">
        {filteredPresets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Zap size={48} className="text-zinc-600 mb-3" />
            <p className="text-zinc-400 mb-1">No hay presets disponibles</p>
            <p className="text-sm text-zinc-500">
              {isModeratorView 
                ? 'No hay presets compatibles con moderadores en esta categoría'
                : 'Selecciona otra categoría'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredPresets.map((preset) => {
              const isAdded = addedPresets.has(preset.id);
              
              return (
                <div
                  key={preset.id}
                  className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className="p-2 rounded-lg shrink-0"
                      style={{ backgroundColor: `${preset.color}20` }}
                    >
                      <div style={{ color: preset.color }}>
                        {getIcon(preset.icon)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white truncate">
                          {preset.name}
                        </h4>
                        {preset.worksForModerators && (
                          <span className="shrink-0 px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-medium rounded">
                            MOD
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2">
                        {preset.description}
                      </p>
                      
                      {/* Preview of action */}
                      {preset.macro.actions[0]?.type === 'send_chat_message' && (
                        <div className="mt-2 px-2 py-1 bg-zinc-900 rounded text-[10px] text-zinc-500 font-mono truncate">
                          {(preset.macro.actions[0].config as { message: string }).message}
                        </div>
                      )}
                    </div>

                    {/* Add Button */}
                    <button
                      onClick={() => handleAddPreset(preset)}
                      disabled={isAdded}
                      className={`shrink-0 p-2 rounded-lg transition-all ${
                        isAdded
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-600'
                      }`}
                      title={isAdded ? 'Añadido' : 'Añadir macro'}
                    >
                      {isAdded ? <Check size={18} /> : <Plus size={18} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Footer Info */}
        <p className="mt-4 text-[10px] text-zinc-500 text-center">
          Los presets se añaden como macros editables. Puedes personalizarlos después.
        </p>
      </div>
    </>
  );
};

export default MacroPresets;
