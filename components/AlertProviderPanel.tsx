/**
 * AlertProviderPanel Component
 * 
 * Panel para configurar proveedores de alertas externos
 * (StreamElements, Streamlabs).
 * 
 * @requirements 1.1, 1.3, 1.6
 */

import React, { useState, useCallback } from 'react';
import { 
  Bell, 
  Link2, 
  Unlink, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { 
  useAlertProviders,
  AlertProviderType,
} from '../src/application/hooks/useAlertProviders';

interface ProviderCardProps {
  name: AlertProviderType;
  displayName: string;
  description: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  helpUrl: string;
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: (token: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  savedToken?: string;
}

/**
 * Card for a single provider configuration
 */
const ProviderCard: React.FC<ProviderCardProps> = ({
  name,
  displayName,
  description,
  tokenLabel,
  tokenPlaceholder,
  helpUrl,
  isConnected,
  isConnecting,
  onConnect,
  onDisconnect,
  savedToken,
}) => {
  const [token, setToken] = useState(savedToken || '');
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    if (!token.trim()) {
      setError('Token is required');
      return;
    }
    
    setError(null);
    try {
      await onConnect(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [token, onConnect]);

  const handleDisconnect = useCallback(async () => {
    setError(null);
    try {
      await onDisconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnection failed');
    }
  }, [onDisconnect]);

  // Provider-specific colors
  const colors = name === 'streamelements' 
    ? { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' }
    : { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' };

  return (
    <div className={`bg-zinc-800/50 rounded-xl p-5 border ${isConnected ? colors.border : 'border-zinc-700'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
            <Bell size={20} className={colors.text} />
          </div>
          <div>
            <h3 className="text-white font-bold">{displayName}</h3>
            <p className="text-zinc-500 text-xs">{description}</p>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {isConnecting ? (
            <div className="flex items-center gap-2 text-yellow-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Connecting...</span>
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 size={16} />
              <span className="text-sm">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-500">
              <XCircle size={16} />
              <span className="text-sm">Disconnected</span>
            </div>
          )}
        </div>
      </div>

      {/* Token input */}
      {!isConnected && (
        <div className="space-y-3">
          <div>
            <label className="text-zinc-400 text-xs block mb-1">{tokenLabel}</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={tokenPlaceholder}
                className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 pr-10 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Help link */}
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
          >
            <ExternalLink size={12} />
            How to get your token
          </a>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle size={16} className="text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end mt-4 pt-4 border-t border-zinc-700">
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            disabled={isConnecting}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
          >
            <Unlink size={16} />
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting || !token.trim()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
              isConnecting || !token.trim()
                ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
          >
            {isConnecting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Link2 size={16} />
            )}
            Connect
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Main AlertProviderPanel component
 */
export const AlertProviderPanel: React.FC = () => {
  const {
    isStreamElementsConnected,
    isStreamlabsConnected,
    isConnecting,
    connectStreamElements,
    connectStreamlabs,
    disconnectProvider,
    getConfig,
  } = useAlertProviders();

  const seConfig = getConfig('streamelements');
  const slConfig = getConfig('streamlabs');

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Bell size={24} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-white text-xl font-bold">Alert Providers</h2>
          <p className="text-zinc-500 text-sm">Connect external alert services</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl mb-6">
        <AlertCircle size={20} className="text-blue-400 mt-0.5" />
        <div className="text-sm">
          <p className="text-blue-300 font-medium mb-1">External Alert Integration</p>
          <p className="text-blue-400/80">
            Connect your StreamElements or Streamlabs account to receive donations, 
            follows, and subscriptions directly in this app. You can use both services 
            simultaneously.
          </p>
        </div>
      </div>

      {/* Provider cards */}
      <div className="space-y-4">
        {/* StreamElements */}
        <ProviderCard
          name="streamelements"
          displayName="StreamElements"
          description="Receive alerts from StreamElements"
          tokenLabel="JWT Token"
          tokenPlaceholder="Enter your StreamElements JWT token"
          helpUrl="https://streamelements.com/dashboard/account/channels"
          isConnected={isStreamElementsConnected}
          isConnecting={isConnecting}
          onConnect={connectStreamElements}
          onDisconnect={() => disconnectProvider('streamelements')}
          savedToken={seConfig?.jwtToken}
        />

        {/* Streamlabs */}
        <ProviderCard
          name="streamlabs"
          displayName="Streamlabs"
          description="Receive alerts from Streamlabs"
          tokenLabel="Socket Token"
          tokenPlaceholder="Enter your Streamlabs socket token"
          helpUrl="https://streamlabs.com/dashboard#/settings/api-settings"
          isConnected={isStreamlabsConnected}
          isConnecting={isConnecting}
          onConnect={connectStreamlabs}
          onDisconnect={() => disconnectProvider('streamlabs')}
          savedToken={slConfig?.socketToken}
        />
      </div>

      {/* Status summary */}
      <div className="mt-6 pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="text-zinc-500 text-sm">
            {(isStreamElementsConnected ? 1 : 0) + (isStreamlabsConnected ? 1 : 0)} of 2 providers connected
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertProviderPanel;
