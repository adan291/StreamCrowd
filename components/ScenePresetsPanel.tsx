/**
 * ScenePresetsPanel - Panel de presets de escenas recomendadas
 * 
 * Muestra configuraciones recomendadas de escenas para diferentes tipos de stream,
 * con overlay URLs sugeridos y tips de configuración.
 * 
 * @requirements 5.2, 5.4
 */

import React, { useState, useCallback } from 'react';
import { 
  Layers,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  ExternalLink,
  Lightbulb,
  Monitor,
  Camera,
  Image,
  Type,
  Volume2,
  Globe,
} from 'lucide-react';
import {
  STREAM_CATEGORIES,
  SCENE_PRESETS,
  generateSourceOverlayURL,
  type ScenePreset,
  type RecommendedScene,
  type SuggestedSource,
  type StreamCategory,
} from '../src/application/services/ScenePresetsService';

interface ScenePresetsPanelProps {
  onNotification?: (type: 'success' | 'info' | 'error', message: string) => void;
}

type ViewState = 'categories' | 'preset' | 'scene';

export const ScenePresetsPanel: React.FC<ScenePresetsPanelProps> = ({
  onNotification,
}) => {
  const [view, setView] = useState<ViewState>('categories');
  const [selectedCategory, setSelectedCategory] = useState<StreamCategory | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<ScenePreset | null>(null);
  const [selectedScene, setSelectedScene] = useState<RecommendedScene | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId: StreamCategory) => {
    const preset = SCENE_PRESETS.find(p => p.category === categoryId);
    if (preset) {
      setSelectedCategory(categoryId);
      setSelectedPreset(preset);
      setView('preset');
    }
  }, []);

  // Handle scene selection
  const handleSceneSelect = useCallback((scene: RecommendedScene) => {
    setSelectedScene(scene);
    setView('scene');
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (view === 'scene') {
      setSelectedScene(null);
      setView('preset');
    } else if (view === 'preset') {
      setSelectedPreset(null);
      setSelectedCategory(null);
      setView('categories');
    }
  }, [view]);

  // Copy URL to clipboard
  const handleCopyUrl = useCallback(async (url: string, sourceName: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      onNotification?.('success', `✓ URL de ${sourceName} copiada`);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  }, [onNotification]);

  // Get source type icon
  const getSourceIcon = (type: SuggestedSource['type']) => {
    switch (type) {
      case 'browser':
        return <Globe size={14} className="text-blue-500" />;
      case 'capture':
        return <Monitor size={14} className="text-purple-500" />;
      case 'camera':
        return <Camera size={14} className="text-green-500" />;
      case 'image':
        return <Image size={14} className="text-amber-500" />;
      case 'text':
        return <Type size={14} className="text-pink-500" />;
      case 'audio':
        return <Volume2 size={14} className="text-cyan-500" />;
      default:
        return <Layers size={14} className="text-zinc-500" />;
    }
  };

  // Render categories view
  const renderCategories = () => (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Selecciona el tipo de contenido que haces para ver escenas recomendadas
      </p>
      
      <div className="grid grid-cols-2 gap-2">
        {STREAM_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategorySelect(category.id)}
            className="p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors text-left group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{category.icon}</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                {category.name}
              </span>
            </div>
            <p className="text-xs text-zinc-500 line-clamp-1">
              {category.description}
            </p>
            <ChevronRight size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-300 group-hover:text-purple-500 transition-colors opacity-0 group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );

  // Render preset view
  const renderPreset = () => {
    if (!selectedPreset) return null;
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">{selectedPreset.icon}</span>
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-white">
              {selectedPreset.name}
            </h4>
            <p className="text-xs text-zinc-500">
              {selectedPreset.description}
            </p>
          </div>
        </div>

        {/* Scenes list */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 font-medium">
            Escenas recomendadas ({selectedPreset.recommendedScenes.length})
          </p>
          
          {selectedPreset.recommendedScenes.map((scene) => (
            <button
              key={scene.name}
              onClick={() => handleSceneSelect(scene)}
              className="w-full p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors text-left flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{scene.icon}</span>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {scene.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {scene.suggestedSources.length} fuentes sugeridas
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-300 group-hover:text-purple-500 transition-colors" />
            </button>
          ))}
        </div>

        {/* General tips */}
        {selectedPreset.generalTips && selectedPreset.generalTips.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={14} className="text-amber-500" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Tips generales
              </span>
            </div>
            <ul className="text-xs text-amber-600 dark:text-amber-300 space-y-1">
              {selectedPreset.generalTips.map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Render scene detail view
  const renderScene = () => {
    if (!selectedScene) return null;
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">{selectedScene.icon}</span>
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-white">
              {selectedScene.name}
            </h4>
            <p className="text-xs text-zinc-500">
              {selectedScene.description}
            </p>
          </div>
        </div>

        {/* Sources list */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 font-medium">
            Fuentes sugeridas
          </p>
          
          {selectedScene.suggestedSources.map((source, index) => {
            const overlayUrl = generateSourceOverlayURL(source);
            
            return (
              <div
                key={index}
                className="p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {getSourceIcon(source.type)}
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {source.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {source.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 rounded">
                    {source.type}
                  </span>
                </div>
                
                {/* Overlay URL if available */}
                {overlayUrl && (
                  <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-700">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={overlayUrl}
                        readOnly
                        className="flex-1 px-2 py-1 text-[10px] font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded truncate"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={() => handleCopyUrl(overlayUrl, source.name)}
                        className={`p-1.5 rounded transition-colors ${
                          copiedUrl === overlayUrl
                            ? 'bg-green-100 dark:bg-green-500/20 text-green-600'
                            : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                        title="Copiar URL"
                      >
                        {copiedUrl === overlayUrl ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                      <button
                        onClick={() => window.open(overlayUrl, '_blank')}
                        className="p-1.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded transition-colors"
                        title="Abrir preview"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Scene tips */}
        {selectedScene.tips && selectedScene.tips.length > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={14} className="text-blue-500" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Tips para esta escena
              </span>
            </div>
            <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
              {selectedScene.tips.map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-2">
        {view !== 'categories' && (
          <button
            onClick={handleBack}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-purple-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {view === 'categories' && 'Presets de Escenas'}
            {view === 'preset' && selectedPreset?.name}
            {view === 'scene' && selectedScene?.name}
          </span>
        </div>
      </div>

      {/* Content */}
      {view === 'categories' && renderCategories()}
      {view === 'preset' && renderPreset()}
      {view === 'scene' && renderScene()}

      {/* Help text */}
      {view === 'categories' && (
        <p className="text-[10px] text-zinc-400 text-center">
          💡 Los presets son sugerencias. Adapta las escenas a tu estilo.
        </p>
      )}
    </div>
  );
};

export default ScenePresetsPanel;
