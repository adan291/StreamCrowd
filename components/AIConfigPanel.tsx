import React, { useState, useEffect } from 'react';
import { Bot, Key, Eye, EyeOff, Check, X, Sparkles } from 'lucide-react';
import { AIConfig, saveAIConfig, loadAIConfig, clearAIConfig } from '../services/aiAnalyticsService';

interface AIConfigPanelProps {
  onConfigChange?: (config: AIConfig | null) => void;
}

export const AIConfigPanel: React.FC<AIConfigPanelProps> = ({ onConfigChange }) => {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'gemini',
    apiKey: '',
    enabled: false,
  });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const stored = loadAIConfig();
    if (stored) {
      setConfig(stored);
      onConfigChange?.(stored);
    }
  }, []);

  const handleSave = () => {
    if (config.apiKey) {
      saveAIConfig(config);
      onConfigChange?.(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleClear = () => {
    clearAIConfig();
    setConfig({ provider: 'gemini', apiKey: '', enabled: false });
    onConfigChange?.(null);
  };

  const handleToggle = () => {
    const newConfig = { ...config, enabled: !config.enabled };
    setConfig(newConfig);
    if (newConfig.apiKey) {
      saveAIConfig(newConfig);
      onConfigChange?.(newConfig);
    }
  };

  const testConnection = async () => {
    if (!config.apiKey) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      if (config.provider === 'gemini') {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Responde solo: OK' }] }],
            }),
          }
        );
        setTestResult(response.ok ? 'success' : 'error');
      }
    } catch {
      setTestResult('error');
    }
    
    setTesting(false);
  };

  return (
    <div className="bg-white/5 dark:bg-gray-800/50 rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-purple-400" />
        <h3 className="font-semibold text-white">Configuración IA</h3>
        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
          Opcional
        </span>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Conecta una IA para analizar tu chat y obtener insights avanzados al final de cada stream.
      </p>

      {/* Provider Selection */}
      <div className="mb-4">
        <label className="text-sm text-gray-300 mb-2 block">Proveedor</label>
        <div className="flex gap-2">
          {(['gemini', 'openai', 'anthropic'] as const).map((provider) => (
            <button
              key={provider}
              onClick={() => setConfig({ ...config, provider })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                config.provider === provider
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {provider === 'gemini' && '✨ Gemini'}
              {provider === 'openai' && '🤖 OpenAI'}
              {provider === 'anthropic' && '🧠 Claude'}
            </button>
          ))}
        </div>
      </div>

      {/* API Key Input */}
      <div className="mb-4">
        <label className="text-sm text-gray-300 mb-2 block">API Key</label>
        <div className="relative">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type={showKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder={`Tu ${config.provider} API key...`}
            className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-10 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleSave}
          disabled={!config.apiKey}
          className="flex-1 flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-all"
        >
          {saved ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {saved ? 'Guardado!' : 'Guardar'}
        </button>
        
        <button
          onClick={testConnection}
          disabled={!config.apiKey || testing}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all"
        >
          {testing ? '...' : 'Test'}
        </button>
        
        <button
          onClick={handleClear}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`text-sm p-2 rounded-lg mb-4 ${
          testResult === 'success' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          {testResult === 'success' ? '✓ Conexión exitosa!' : '✗ Error de conexión'}
        </div>
      )}

      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
        <div>
          <p className="text-sm text-white font-medium">Análisis con IA</p>
          <p className="text-xs text-gray-500">Activa para obtener insights avanzados</p>
        </div>
        <button
          onClick={handleToggle}
          disabled={!config.apiKey}
          className={`relative w-12 h-6 rounded-full transition-all ${
            config.enabled ? 'bg-purple-500' : 'bg-gray-600'
          } ${!config.apiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
              config.enabled ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* Info */}
      <div className="mt-4 text-xs text-gray-500">
        <p>💡 Sin API key, se usará análisis local básico.</p>
        <p className="mt-1">
          {config.provider === 'gemini' && (
            <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
              Obtener API key de Gemini →
            </a>
          )}
          {config.provider === 'openai' && (
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
              Obtener API key de OpenAI →
            </a>
          )}
          {config.provider === 'anthropic' && (
            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
              Obtener API key de Anthropic →
            </a>
          )}
        </p>
      </div>
    </div>
  );
};
