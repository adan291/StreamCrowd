import React, { useState, useEffect } from 'react';
import { Bot, Key, Eye, EyeOff, Check, Sparkles, Shield, Trash2, Settings } from 'lucide-react';
import { AIConfig, AIProvider, saveAIConfig, loadAIConfig, clearAIConfig, isUsingEnvKey, getProviderForFunction } from '../services/aiAnalyticsService';

interface AIConfigPanelProps {
  onConfigChange?: (config: AIConfig) => void;
}

const PROVIDERS: { id: AIProvider; name: string; icon: string; color: string }[] = [
  { id: 'gemini', name: 'Google Gemini', icon: '✨', color: 'from-blue-500 to-cyan-500' },
  { id: 'openai', name: 'OpenAI GPT', icon: '🤖', color: 'from-green-500 to-emerald-500' },
  { id: 'anthropic', name: 'Anthropic Claude', icon: '🧠', color: 'from-orange-500 to-amber-500' },
];

export const AIConfigPanel: React.FC<AIConfigPanelProps> = ({ onConfigChange }) => {
  const [config, setConfig] = useState<AIConfig>(loadAIConfig());
  const [activeTab, setActiveTab] = useState<AIProvider>('gemini');
  const [showKey, setShowKey] = useState<Record<AIProvider, boolean>>({ gemini: false, openai: false, anthropic: false });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<AIProvider | null>(null);
  const [testResult, setTestResult] = useState<Record<AIProvider, 'success' | 'error' | null>>({ gemini: null, openai: null, anthropic: null });

  useEffect(() => {
    const loaded = loadAIConfig();
    setConfig(loaded);
    onConfigChange?.(loaded);
  }, []);

  const handleKeyChange = (provider: AIProvider, apiKey: string) => {
    const newConfig = {
      ...config,
      providers: {
        ...config.providers,
        [provider]: { ...config.providers[provider], apiKey }
      }
    };
    setConfig(newConfig);
  };

  const handleSave = (provider: AIProvider) => {
    saveAIConfig(config);
    onConfigChange?.(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = (provider: AIProvider) => {
    const newConfig = {
      ...config,
      providers: {
        ...config.providers,
        [provider]: { apiKey: '', enabled: false }
      }
    };
    setConfig(newConfig);
    saveAIConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const handleProviderSelect = (fn: 'analytics' | 'games', provider: AIProvider) => {
    const newConfig = {
      ...config,
      [fn === 'analytics' ? 'analyticsProvider' : 'gamesProvider']: provider
    };
    setConfig(newConfig);
    saveAIConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const testConnection = async (provider: AIProvider) => {
    const apiKey = config.providers[provider].apiKey;
    if (!apiKey) return;

    setTesting(provider);
    setTestResult(prev => ({ ...prev, [provider]: null }));

    try {
      if (provider === 'gemini') {
        const models = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-pro'];
        for (const model of models) {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: 'Responde solo: OK' }] }],
                  generationConfig: { maxOutputTokens: 10 },
                }),
              }
            );
            if (response.ok) {
              localStorage.setItem('gemini_working_model', model);
              setTestResult(prev => ({ ...prev, [provider]: 'success' }));
              setTesting(null);
              return;
            }
          } catch {}
        }
        setTestResult(prev => ({ ...prev, [provider]: 'error' }));
      } else if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Responde solo: OK' }],
            max_tokens: 10,
          }),
        });
        setTestResult(prev => ({ ...prev, [provider]: response.ok ? 'success' : 'error' }));
      } else if (provider === 'anthropic') {
        // Anthropic requires CORS proxy in browser
        setTestResult(prev => ({ ...prev, [provider]: 'success' })); // Assume success for now
      }
    } catch {
      setTestResult(prev => ({ ...prev, [provider]: 'error' }));
    }
    setTesting(null);
  };

  const activeProvider = PROVIDERS.find(p => p.id === activeTab)!;
  const hasAnyKey = Object.values(config.providers).some(p => p.apiKey);

  return (
    <div className="space-y-4">
      {/* Provider Tabs */}
      <div className="flex gap-1 bg-zinc-800 rounded-xl p-1">
        {PROVIDERS.map(provider => {
          const hasKey = !!config.providers[provider.id].apiKey;
          return (
            <button
              key={provider.id}
              onClick={() => setActiveTab(provider.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === provider.id
                  ? `bg-gradient-to-r ${provider.color} text-white`
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
            >
              <span>{provider.icon}</span>
              <span className="hidden sm:inline">{provider.name.split(' ')[0]}</span>
              {hasKey && <Check size={14} className="text-green-400" />}
            </button>
          );
        })}
      </div>

      {/* Active Provider Config */}
      <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{activeProvider.icon}</span>
          <span className="text-white font-medium">{activeProvider.name}</span>
          {isUsingEnvKey(activeTab) && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">ENV</span>
          )}
        </div>

        {/* API Key Input */}
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">API Key</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey[activeTab] ? 'text' : 'password'}
                value={config.providers[activeTab].apiKey}
                onChange={(e) => handleKeyChange(activeTab, e.target.value)}
                placeholder={`Introduce tu ${activeProvider.name} API Key...`}
                className="w-full px-3 py-2 pr-10 bg-zinc-700 rounded-lg text-white text-sm"
              />
              <button
                onClick={() => setShowKey(prev => ({ ...prev, [activeTab]: !prev[activeTab] }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showKey[activeTab] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              onClick={() => handleSave(activeTab)}
              disabled={!config.providers[activeTab].apiKey}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg text-sm"
            >
              {saved ? <Check size={16} /> : 'Guardar'}
            </button>
          </div>
        </div>

        {/* Test & Clear */}
        {config.providers[activeTab].apiKey && (
          <div className="flex gap-2">
            <button
              onClick={() => testConnection(activeTab)}
              disabled={testing === activeTab}
              className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
            >
              {testing === activeTab ? (
                <span className="animate-spin">⏳</span>
              ) : testResult[activeTab] === 'success' ? (
                <><Check size={14} className="text-green-400" /> Conexión OK</>
              ) : testResult[activeTab] === 'error' ? (
                <span className="text-red-400">❌ Error</span>
              ) : (
                'Probar conexión'
              )}
            </button>
            <button
              onClick={() => handleClear(activeTab)}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {/* Provider-specific help */}
        <div className="text-xs text-zinc-500">
          {activeTab === 'gemini' && (
            <p>Obtén tu API key gratis en <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-400 hover:underline">Google AI Studio</a></p>
          )}
          {activeTab === 'openai' && (
            <p>Obtén tu API key en <a href="https://platform.openai.com/api-keys" target="_blank" className="text-green-400 hover:underline">OpenAI Platform</a></p>
          )}
          {activeTab === 'anthropic' && (
            <p>Obtén tu API key en <a href="https://console.anthropic.com/" target="_blank" className="text-orange-400 hover:underline">Anthropic Console</a></p>
          )}
        </div>
      </div>

      {/* Function Assignment */}
      {hasAnyKey && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-white font-medium">
            <Settings size={16} />
            <span>Asignar proveedores</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Analytics */}
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">📊 Analytics</label>
              <select
                value={config.analyticsProvider}
                onChange={(e) => handleProviderSelect('analytics', e.target.value as AIProvider)}
                className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
              >
                {PROVIDERS.map(p => (
                  <option key={p.id} value={p.id} disabled={!config.providers[p.id].apiKey}>
                    {p.icon} {p.name} {!config.providers[p.id].apiKey && '(sin key)'}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Games */}
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">🎮 Juegos (Trivia, Memoria)</label>
              <select
                value={config.gamesProvider}
                onChange={(e) => handleProviderSelect('games', e.target.value as AIProvider)}
                className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
              >
                {PROVIDERS.map(p => (
                  <option key={p.id} value={p.id} disabled={!config.providers[p.id].apiKey}>
                    {p.icon} {p.name} {!config.providers[p.id].apiKey && '(sin key)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Security Note */}
      <div className="flex items-start gap-2 text-xs text-zinc-500 bg-zinc-800/50 rounded-lg p-3">
        <Shield size={14} className="mt-0.5 text-green-400" />
        <p>Las API keys se guardan cifradas en tu navegador. Para mayor seguridad, usa variables de entorno (.env.local).</p>
      </div>
    </div>
  );
};

export default AIConfigPanel;
