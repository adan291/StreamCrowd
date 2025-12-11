import React, { useState, useEffect } from 'react';
import { Bot, Key, Eye, EyeOff, Check, X, Sparkles, Shield, Copy, Download } from 'lucide-react';
import { AIConfig, saveAIConfig, loadAIConfig, clearAIConfig, isUsingEnvKey } from '../services/aiAnalyticsService';
import { useI18n } from '../i18n';

interface AIConfigPanelProps {
  onConfigChange?: (config: AIConfig | null) => void;
}

export const AIConfigPanel: React.FC<AIConfigPanelProps> = ({ onConfigChange }) => {
  const { t } = useI18n();
  const [config, setConfig] = useState<AIConfig>({
    provider: 'gemini',
    apiKey: '',
    enabled: false,
  });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [usingEnvKey, setUsingEnvKey] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  useEffect(() => {
    setUsingEnvKey(isUsingEnvKey());
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

  // Get the env variable name based on provider
  const getEnvVarName = () => {
    switch (config.provider) {
      case 'gemini': return 'VITE_GEMINI_API_KEY';
      case 'openai': return 'VITE_OPENAI_API_KEY';
      case 'anthropic': return 'VITE_ANTHROPIC_API_KEY';
      default: return 'VITE_API_KEY';
    }
  };

  // Copy env line to clipboard
  const copyEnvToClipboard = async () => {
    if (!config.apiKey) return;
    const envLine = `${getEnvVarName()}=${config.apiKey}`;
    try {
      await navigator.clipboard.writeText(envLine);
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download .env.local file
  const downloadEnvFile = () => {
    if (!config.apiKey) return;
    const content = `# API Key for ${config.provider}\n${getEnvVarName()}=${config.apiKey}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env.local';
    a.click();
    URL.revokeObjectURL(url);
  };

  const testConnection = async () => {
    if (!config.apiKey) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      if (config.provider === 'gemini') {
        // First, get list of available models
        console.log('Fetching available Gemini models...');
        const modelsResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`
        );
        
        if (!modelsResponse.ok) {
          console.error('Failed to fetch models:', modelsResponse.status);
          setTestResult('error');
          setTesting(false);
          return;
        }
        
        const modelsData = await modelsResponse.json();
        const availableModels = modelsData.models
          ?.filter((m: { supportedGenerationMethods?: string[] }) => 
            m.supportedGenerationMethods?.includes('generateContent')
          )
          .map((m: { name: string }) => m.name.replace('models/', ''))
          || [];
        
        console.log('Available models:', availableModels);
        
        if (availableModels.length === 0) {
          console.error('No models available for generateContent');
          setTestResult('error');
          setTesting(false);
          return;
        }
        
        // Try the first available model
        const modelToUse = availableModels[0];
        console.log(`Testing with model: ${modelToUse}`);
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${config.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Say OK' }] }],
              generationConfig: {
                maxOutputTokens: 10,
              },
            }),
          }
        );
        
        if (response.ok) {
          console.log(`✓ Gemini model ${modelToUse} works!`);
          // Save the working model for later use
          localStorage.setItem('gemini_working_model', modelToUse);
          setTestResult('success');
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Model ${modelToUse} failed:`, response.status, errorData);
          setTestResult('error');
        }
      }
    } catch (err) {
      console.error('Test connection error:', err);
      setTestResult('error');
    }
    
    setTesting(false);
  };

  return (
    <div className="bg-white/5 dark:bg-gray-800/50 rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-purple-400" />
        <h3 className="font-semibold text-white">{t.aiConfig.title}</h3>
        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
          {t.aiConfig.optional}
        </span>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        {t.aiConfig.description}
      </p>

      {/* Provider Selection */}
      <div className="mb-4">
        <label className="text-sm text-gray-300 mb-2 block">{t.aiConfig.provider}</label>
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
        <label className="text-sm text-gray-300 mb-2 block">{t.aiConfig.apiKey}</label>
        <div className="relative">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type={showKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder={t.aiConfig.apiKeyPlaceholder.replace('{provider}', config.provider)}
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
          {saved ? t.aiConfig.saved : t.aiConfig.save}
        </button>
        
        <button
          onClick={testConnection}
          disabled={!config.apiKey || testing}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all"
        >
          {testing ? '...' : t.aiConfig.test}
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
          {testResult === 'success' ? t.aiConfig.connectionSuccess : t.aiConfig.connectionError}
        </div>
      )}

      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
        <div>
          <p className="text-sm text-white font-medium">{t.aiConfig.aiAnalysis}</p>
          <p className="text-xs text-gray-500">{t.aiConfig.activateInsights}</p>
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

      {/* Security Status */}
      {usingEnvKey ? (
        <div className="flex items-center gap-2 p-2 mt-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-xs text-green-400">
            🔒 API Key integrada en la aplicación
          </span>
        </div>
      ) : config.apiKey && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-400">
              🔒 API Key guardada de forma segura (cifrada)
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-2">
            Para desarrollo, puedes guardarla en .env.local:
          </p>
          <div className="flex gap-2">
            <button
              onClick={copyEnvToClipboard}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-all"
            >
              {copiedEnv ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedEnv ? '¡Copiado!' : 'Copiar línea'}
            </button>
            <button
              onClick={downloadEnvFile}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-all"
            >
              <Download className="w-3 h-3" />
              .env.local
            </button>
          </div>
          {copiedEnv && (
            <p className="text-xs text-blue-300 mt-2">
              ✓ Copiado: {getEnvVarName()}=***
            </p>
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 text-xs text-gray-500">
        <p>{t.aiConfig.noApiKeyHint}</p>
        <p className="mt-1">
          {config.provider === 'gemini' && (
            <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
              {t.aiConfig.getApiKey.replace('{provider}', 'Gemini')}
            </a>
          )}
          {config.provider === 'openai' && (
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
              {t.aiConfig.getApiKey.replace('{provider}', 'OpenAI')}
            </a>
          )}
          {config.provider === 'anthropic' && (
            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
              {t.aiConfig.getApiKey.replace('{provider}', 'Anthropic')}
            </a>
          )}
        </p>
      </div>
    </div>
  );
};
