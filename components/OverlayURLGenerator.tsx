/**
 * OverlayURLGenerator - Componente para generar URLs de overlay para OBS Browser Source
 * 
 * Permite a los usuarios seleccionar un tipo de overlay, personalizar opciones,
 * y copiar la URL para usar en OBS como Browser Source.
 * 
 * @requirements 2.2, 2.4, 2.6
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  ChevronDown, 
  ChevronRight,
  Monitor,
  Palette,
  Eye,
  Info,
} from 'lucide-react';
import { 
  OVERLAY_TYPES, 
  CHROMA_COLORS,
  generateOverlayURL,
  getOverlaysByCategory,
  type OverlayType,
  type OverlayOptions,
} from '../src/application/services/OverlayURLService';

interface OverlayURLGeneratorProps {
  onNotification?: (type: 'success' | 'info' | 'error', message: string) => void;
  channel?: string;
}

export const OverlayURLGenerator: React.FC<OverlayURLGeneratorProps> = ({ 
  onNotification,
  channel,
}) => {
  // Estado del overlay seleccionado
  const [selectedType, setSelectedType] = useState<string>('poll');
  const [options, setOptions] = useState<OverlayOptions>({
    theme: 'transparent',
    channel,
  });
  
  // Estado de UI
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Dinámicas');

  // Obtener el tipo de overlay seleccionado
  const selectedOverlay = useMemo(() => 
    OVERLAY_TYPES.find(t => t.id === selectedType),
    [selectedType]
  );

  // Generar la URL
  const generatedURL = useMemo(() => {
    try {
      return generateOverlayURL(selectedType, options);
    } catch {
      return '';
    }
  }, [selectedType, options]);

  // Obtener overlays por categoría
  const overlaysByCategory = useMemo(() => getOverlaysByCategory(), []);

  // Copiar URL al portapapeles
  const copyURL = useCallback(async () => {
    if (!generatedURL) return;
    
    try {
      await navigator.clipboard.writeText(generatedURL);
      setCopied(true);
      onNotification?.('success', '✓ URL copiada al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = generatedURL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      onNotification?.('success', '✓ URL copiada');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedURL, onNotification]);

  // Abrir preview en nueva ventana
  const openPreview = useCallback(() => {
    if (!generatedURL) return;
    window.open(generatedURL, '_blank', 'width=800,height=600');
  }, [generatedURL]);

  // Actualizar opciones
  const updateOption = useCallback(<K extends keyof OverlayOptions>(
    key: K, 
    value: OverlayOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <Monitor size={16} className="text-purple-500" />
        <span>Generar URL de Overlay</span>
      </div>

      {/* Selector de tipo de overlay */}
      <div className="space-y-2">
        {Object.entries(overlaysByCategory).map(([category, types]) => {
          const overlayTypes = types as OverlayType[];
          return (
          <div key={category} className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              className="w-full flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {category} ({overlayTypes.length})
              </span>
              {expandedCategory === category ? (
                <ChevronDown size={14} className="text-zinc-400" />
              ) : (
                <ChevronRight size={14} className="text-zinc-400" />
              )}
            </button>
            
            {/* Category items */}
            {expandedCategory === category && (
              <div className="grid grid-cols-2 gap-1 p-2">
                {overlayTypes.map((type: OverlayType) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                      selectedType === type.id
                        ? 'bg-purple-100 dark:bg-purple-500/20 border-2 border-purple-500'
                        : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-500/50'
                    }`}
                    title={type.description}
                  >
                    <span className="text-lg">{type.icon}</span>
                    <span className={`text-xs truncate ${
                      selectedType === type.id
                        ? 'font-medium text-purple-700 dark:text-purple-300'
                        : 'text-zinc-700 dark:text-zinc-300'
                    }`}>
                      {type.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
        })}
      </div>

      {/* Opciones de personalización */}
      {selectedOverlay && (
        <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <Palette size={12} />
            <span>Opciones</span>
          </div>
          
          {/* Tema / Fondo */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Fondo</label>
            <div className="flex gap-1">
              {Object.entries(CHROMA_COLORS).map(([name, color]) => (
                <button
                  key={name}
                  onClick={() => updateOption('bg', color === 'transparent' ? undefined : color)}
                  className={`flex-1 py-1.5 text-xs rounded transition-all ${
                    (options.bg === color || (!options.bg && color === 'transparent'))
                      ? 'ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-zinc-900'
                      : 'hover:opacity-80'
                  }`}
                  style={{ 
                    backgroundColor: color === 'transparent' ? undefined : color,
                    border: color === 'transparent' ? '1px dashed #666' : 'none',
                  }}
                  title={name.charAt(0).toUpperCase() + name.slice(1)}
                >
                  {color === 'transparent' && (
                    <span className="text-zinc-500">∅</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tamaño recomendado */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Tamaño recomendado:</span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300">
              {selectedOverlay.defaultSize.width} × {selectedOverlay.defaultSize.height}
            </span>
          </div>
        </div>
      )}

      {/* URL generada */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={generatedURL}
            readOnly
            className="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg truncate"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={copyURL}
            className={`p-2 rounded-lg transition-all ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
            title={copied ? 'Copiado!' : 'Copiar URL'}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button
            onClick={openPreview}
            className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-lg transition-colors"
            title="Abrir preview"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {/* Instrucciones colapsables */}
      <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info size={14} className="text-blue-500" />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Cómo añadir a OBS
            </span>
          </div>
          {showInstructions ? (
            <ChevronDown size={14} className="text-zinc-400" />
          ) : (
            <ChevronRight size={14} className="text-zinc-400" />
          )}
        </button>
        
        {showInstructions && (
          <BrowserSourceInstructions 
            overlayType={selectedOverlay} 
            url={generatedURL}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Componente de instrucciones para añadir Browser Source en OBS
 * @requirements 2.5
 */
interface BrowserSourceInstructionsProps {
  overlayType?: OverlayType;
  url: string;
}

const BrowserSourceInstructions: React.FC<BrowserSourceInstructionsProps> = ({ 
  overlayType,
  url,
}) => {
  return (
    <div className="p-3 space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
      <ol className="space-y-2 list-decimal list-inside">
        <li>
          En OBS, haz <strong>click derecho</strong> en el panel de Fuentes
        </li>
        <li>
          Selecciona <strong>Añadir → Navegador</strong>
        </li>
        <li>
          Dale un nombre (ej: "{overlayType?.name || 'Overlay'}")
        </li>
        <li>
          Pega la URL copiada en el campo <strong>URL</strong>
        </li>
        <li>
          Configura el tamaño:
          <ul className="ml-4 mt-1 space-y-0.5">
            <li>• Ancho: <code className="px-1 bg-zinc-200 dark:bg-zinc-700 rounded">{overlayType?.defaultSize.width || 800}</code></li>
            <li>• Alto: <code className="px-1 bg-zinc-200 dark:bg-zinc-700 rounded">{overlayType?.defaultSize.height || 600}</code></li>
          </ul>
        </li>
        <li>
          Marca <strong>"Actualizar navegador cuando la escena se active"</strong>
        </li>
        <li>
          Click en <strong>Aceptar</strong>
        </li>
      </ol>

      {/* Tips adicionales */}
      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
        <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">💡 Tips:</p>
        <ul className="space-y-1 text-blue-600 dark:text-blue-300">
          <li>• El fondo transparente funciona automáticamente en OBS</li>
          <li>• Usa Chroma Key si necesitas un color específico para filtros</li>
          <li>• El overlay se sincroniza en tiempo real con la app</li>
        </ul>
      </div>
    </div>
  );
};

export default OverlayURLGenerator;
