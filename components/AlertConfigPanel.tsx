/**
 * AlertConfigPanel Component
 * 
 * Panel de configuración para alertas personalizadas.
 * Permite crear, editar y previsualizar alertas.
 * 
 * @requirements 1.2, 1.4
 */

import React, { useState, useCallback } from 'react';
import { 
  Bell, 
  Heart, 
  Star, 
  Users, 
  Gift, 
  Coins,
  Play,
  Save,
  Trash2,
  Volume2,
  VolumeX,
  Eye,
  Settings,
  Palette
} from 'lucide-react';
import { 
  useAlerts, 
  AlertConfig, 
  AlertEventType 
} from '../src/application/hooks/useAlerts';

// Event type configuration
const EVENT_TYPES: { type: AlertEventType; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { type: 'follow', label: 'Nuevo Seguidor', icon: Heart },
  { type: 'sub', label: 'Suscripción', icon: Star },
  { type: 'raid', label: 'Raid', icon: Users },
  { type: 'gift', label: 'Regalo de Sub', icon: Gift },
  { type: 'bits', label: 'Bits', icon: Coins },
];

// Template options
const TEMPLATES = [
  { value: 'default', label: 'Default' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'fancy', label: 'Fancy' },
] as const;

// Animation options
const ANIMATIONS = [
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'zoom', label: 'Zoom' },
] as const;

interface AlertConfigFormProps {
  config: AlertConfig;
  onSave: (config: AlertConfig) => void;
  onPreview: (config: AlertConfig) => void;
  onDelete: (id: string) => void;
}

/**
 * Form for editing a single alert configuration
 */
const AlertConfigForm: React.FC<AlertConfigFormProps> = ({ 
  config, 
  onSave, 
  onPreview,
  onDelete 
}) => {
  const [localConfig, setLocalConfig] = useState<AlertConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = useCallback(<K extends keyof AlertConfig>(
    field: K, 
    value: AlertConfig[K]
  ) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    onSave(localConfig);
    setHasChanges(false);
  }, [localConfig, onSave]);

  const handlePreview = useCallback(() => {
    onPreview(localConfig);
  }, [localConfig, onPreview]);

  const eventInfo = EVENT_TYPES.find(e => e.type === config.eventType);
  const Icon = eventInfo?.icon || Bell;

  return (
    <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Icon size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-bold">{eventInfo?.label}</h3>
            <p className="text-zinc-500 text-xs">ID: {config.id}</p>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-zinc-400 text-sm">
            {localConfig.enabled ? 'Activo' : 'Inactivo'}
          </span>
          <div 
            className={`w-12 h-6 rounded-full p-1 transition-colors ${
              localConfig.enabled ? 'bg-green-500' : 'bg-zinc-600'
            }`}
            onClick={() => handleChange('enabled', !localConfig.enabled)}
          >
            <div 
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                localConfig.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Visual Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
          <Palette size={14} />
          <span>Apariencia</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Template */}
          <div>
            <label className="text-zinc-400 text-xs block mb-1">Template</label>
            <select
              value={localConfig.template}
              onChange={(e) => handleChange('template', e.target.value as AlertConfig['template'])}
              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
            >
              {TEMPLATES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Animation */}
          <div>
            <label className="text-zinc-400 text-xs block mb-1">Animación</label>
            <select
              value={localConfig.animation}
              onChange={(e) => handleChange('animation', e.target.value as AlertConfig['animation'])}
              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
            >
              {ANIMATIONS.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">
            Duración: {(localConfig.duration / 1000).toFixed(1)}s
          </label>
          <input
            type="range"
            min="1000"
            max="15000"
            step="500"
            value={localConfig.duration}
            onChange={(e) => handleChange('duration', parseInt(e.target.value))}
            className="w-full accent-purple-500"
          />
        </div>

        {/* Audio Settings */}
        <div className="flex items-center gap-2 text-zinc-400 text-sm mt-4 mb-2">
          {localConfig.soundVolume > 0 ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span>Audio</span>
        </div>

        <div>
          <label className="text-zinc-400 text-xs block mb-1">URL del Sonido</label>
          <input
            type="text"
            value={localConfig.soundUrl || ''}
            onChange={(e) => handleChange('soundUrl', e.target.value || undefined)}
            placeholder="https://example.com/sound.mp3"
            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-zinc-400 text-xs block mb-1">
            Volumen: {localConfig.soundVolume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={localConfig.soundVolume}
            onChange={(e) => handleChange('soundVolume', parseInt(e.target.value))}
            className="w-full accent-purple-500"
          />
        </div>

        {/* Custom Settings */}
        <div className="flex items-center gap-2 text-zinc-400 text-sm mt-4 mb-2">
          <Settings size={14} />
          <span>Personalización</span>
        </div>

        <div>
          <label className="text-zinc-400 text-xs block mb-1">Mensaje Personalizado</label>
          <input
            type="text"
            value={localConfig.customMessage || ''}
            onChange={(e) => handleChange('customMessage', e.target.value || undefined)}
            placeholder="¡Gracias por el apoyo!"
            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-zinc-400 text-xs block mb-1">URL de Imagen</label>
          <input
            type="text"
            value={localConfig.customImage || ''}
            onChange={(e) => handleChange('customImage', e.target.value || undefined)}
            placeholder="https://example.com/image.png"
            className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-700">
        <button
          onClick={() => onDelete(config.id)}
          className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
        >
          <Trash2 size={16} />
          Eliminar
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors text-sm"
          >
            <Eye size={16} />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
              hasChanges 
                ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Save size={16} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main AlertConfigPanel component
 */
export const AlertConfigPanel: React.FC = () => {
  const { configs, saveConfig, deleteConfig, previewAlert } = useAlerts();
  const [selectedType, setSelectedType] = useState<AlertEventType | null>(null);

  const handlePreview = useCallback((config: AlertConfig) => {
    previewAlert(config);
  }, [previewAlert]);

  const handleDelete = useCallback((id: string) => {
    if (confirm('¿Estás seguro de eliminar esta configuración de alerta?')) {
      deleteConfig(id);
    }
  }, [deleteConfig]);

  // Get config for selected type
  const selectedConfig = selectedType 
    ? configs.find(c => c.eventType === selectedType)
    : null;

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Bell size={24} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-white text-xl font-bold">Alertas Personalizadas</h2>
          <p className="text-zinc-500 text-sm">Configura alertas para eventos del stream</p>
        </div>
      </div>

      {/* Event Type Selector */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {EVENT_TYPES.map(({ type, label, icon: Icon }) => {
          const config = configs.find(c => c.eventType === type);
          const isSelected = selectedType === type;
          const isEnabled = config?.enabled ?? false;
          
          return (
            <button
              key={type}
              onClick={() => setSelectedType(isSelected ? null : type)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                isSelected 
                  ? 'bg-purple-500/20 border-purple-500' 
                  : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
              } border`}
            >
              <div className="relative">
                <Icon 
                  size={24} 
                  className={isSelected ? 'text-purple-400' : 'text-zinc-400'} 
                />
                {isEnabled && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                )}
              </div>
              <span className={`text-xs ${isSelected ? 'text-purple-300' : 'text-zinc-500'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Config Form */}
      {selectedConfig ? (
        <AlertConfigForm
          config={selectedConfig}
          onSave={saveConfig}
          onPreview={handlePreview}
          onDelete={handleDelete}
        />
      ) : (
        <div className="text-center py-12 text-zinc-500">
          <Bell size={48} className="mx-auto mb-4 opacity-30" />
          <p>Selecciona un tipo de evento para configurar su alerta</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="text-zinc-500 text-sm">
            {configs.filter(c => c.enabled).length} de {configs.length} alertas activas
          </div>
          <button
            onClick={() => {
              // Test all enabled alerts
              configs
                .filter(c => c.enabled)
                .forEach((config, index) => {
                  setTimeout(() => previewAlert(config), index * 2000);
                });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm"
          >
            <Play size={16} />
            Probar Todas
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertConfigPanel;
