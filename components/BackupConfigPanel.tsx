/**
 * BackupConfigPanel - Cloud Backup Configuration Component
 * 
 * Provides UI for configuring and managing cloud backups:
 * - Provider selection (Google Drive / Custom Server)
 * - Credentials configuration
 * - Sync status indicator
 * - Manual backup/restore buttons
 * 
 * @requirements 3.1, 3.7, 3.8
 */
import React, { useState } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Download,
  Upload,
  Check,
  AlertCircle,
  Clock,
  Settings,
  Key,
  Eye,
  EyeOff,
  Server,
  Trash2,
  Shield,
} from 'lucide-react';
import { useBackupService } from '../hooks/useBackupService';
import { useI18n } from '../i18n';
import type { CloudProvider, BackupSyncStatus } from '../types/backup';
import type { Translations } from '../i18n/locales';

// ============================================
// STATUS INDICATOR COMPONENT
// ============================================

interface StatusIndicatorProps {
  status: BackupSyncStatus;
  lastBackupAt: number | null;
  lastError: string | null;
  t: Translations['backup'];
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, lastBackupAt, lastError, t }) => {
  
  const statusConfig: Record<BackupSyncStatus, { icon: React.ReactNode; color: string; text: string }> = {
    synced: {
      icon: <Check size={14} />,
      color: 'text-green-400 bg-green-400/20',
      text: t.status.synced,
    },
    syncing: {
      icon: <RefreshCw size={14} className="animate-spin" />,
      color: 'text-blue-400 bg-blue-400/20',
      text: t.status.syncing,
    },
    pending: {
      icon: <Clock size={14} />,
      color: 'text-yellow-400 bg-yellow-400/20',
      text: t.status.pending,
    },
    error: {
      icon: <AlertCircle size={14} />,
      color: 'text-red-400 bg-red-400/20',
      text: t.status.error,
    },
    disconnected: {
      icon: <CloudOff size={14} />,
      color: 'text-zinc-400 bg-zinc-400/20',
      text: t.status.disconnected,
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.color}`}>
        {config.icon}
        <span className="text-sm font-medium">{config.text}</span>
      </div>
      {lastBackupAt && status === 'synced' && (
        <span className="text-xs text-zinc-500">
          {t.lastBackup}: {new Date(lastBackupAt).toLocaleString()}
        </span>
      )}
      {lastError && status === 'error' && (
        <span className="text-xs text-red-400 truncate max-w-[200px]" title={lastError}>
          {lastError}
        </span>
      )}
    </div>
  );
};

// ============================================
// PROVIDER CARD COMPONENT
// ============================================

interface ProviderCardProps {
  provider: CloudProvider;
  name: string;
  icon: React.ReactNode;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  name,
  icon,
  description,
  isSelected,
  onSelect,
}) => {
  return (
    <button
      onClick={onSelect}
      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-purple-500 bg-purple-500/10'
          : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-500/20' : 'bg-zinc-700'}`}>
          {icon}
        </div>
        <span className="text-white font-medium">{name}</span>
        {isSelected && <Check size={16} className="text-purple-400 ml-auto" />}
      </div>
      <p className="text-xs text-zinc-400 text-left">{description}</p>
    </button>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const BackupConfigPanel: React.FC = () => {
  const { t } = useI18n();
  const bt = t.backup; // backup translations
  const {
    config,
    status,
    isBackingUp,
    isRestoring,
    connect,
    disconnect,
    backup: performBackup,
    restore,
    setAutoBackupEnabled,
    lastBackupAt,
    lastError,
  } = useBackupService();

  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(config.provider);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState({
    // Google Drive
    accessToken: '',
    refreshToken: '',
    // Custom Server
    serverUrl: '',
    apiKey: '',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isConnected = config.provider !== null;

  const handleConnect = async () => {
    if (!selectedProvider) return;

    setConnecting(true);
    setMessage(null);

    try {
      let credentialsToSend;
      
      if (selectedProvider === 'google-drive') {
        if (!credentials.accessToken) {
          setMessage({ type: 'error', text: bt.errors.missingToken });
          setConnecting(false);
          return;
        }
        credentialsToSend = {
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
          expiresAt: Date.now() + 3600000, // 1 hour
          scope: 'https://www.googleapis.com/auth/drive.appdata',
        };
      } else {
        if (!credentials.serverUrl || !credentials.apiKey) {
          setMessage({ type: 'error', text: bt.errors.missingServerConfig });
          setConnecting(false);
          return;
        }
        credentialsToSend = {
          serverUrl: credentials.serverUrl,
          apiKey: credentials.apiKey,
        };
      }

      const result = await connect({
        provider: selectedProvider,
        credentials: credentialsToSend,
      });

      if (result.success) {
        setMessage({ type: 'success', text: bt.messages.connected });
        setShowCredentials(false);
        // Trigger initial backup
        await performBackup();
      } else {
        setMessage({ type: 'error', text: result.error || bt.errors.connectionFailed });
      }
    } catch (error) {
      setMessage({ type: 'error', text: bt.errors.connectionFailed });
    }

    setConnecting(false);
  };

  const handleDisconnect = () => {
    disconnect();
    setSelectedProvider(null);
    setCredentials({ accessToken: '', refreshToken: '', serverUrl: '', apiKey: '' });
    setMessage({ type: 'success', text: bt.messages.disconnected });
  };

  const handleBackup = async () => {
    setMessage(null);
    const result = await performBackup();
    if (result.success) {
      setMessage({ type: 'success', text: bt.messages.backupSuccess });
    } else {
      setMessage({ type: 'error', text: result.error || bt.errors.backupFailed });
    }
  };

  const handleRestore = async () => {
    if (!window.confirm(bt.confirmRestore)) return;
    
    setMessage(null);
    const result = await restore();
    if (result.success) {
      const items = result.restoredItems;
      const total = items.commands + items.timers + items.presets + items.customSounds +
        (items.aiConfig ? 1 : 0) + (items.moderationSettings ? 1 : 0);
      setMessage({ type: 'success', text: bt.messages.restoreSuccess.replace('{count}', String(total)) });
    } else {
      setMessage({ type: 'error', text: result.error || bt.errors.restoreFailed });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud size={20} className="text-purple-400" />
          <span className="text-white font-medium">{bt.title}</span>
        </div>
        <StatusIndicator status={status} lastBackupAt={lastBackupAt} lastError={lastError} t={bt} />
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Provider Selection (when not connected) */}
      {!isConnected && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">{bt.selectProvider}</p>
          <div className="flex gap-3">
            <ProviderCard
              provider="google-drive"
              name="Google Drive"
              icon={<Cloud size={20} className="text-blue-400" />}
              description={bt.providers.googleDrive.description}
              isSelected={selectedProvider === 'google-drive'}
              onSelect={() => {
                setSelectedProvider('google-drive');
                setShowCredentials(true);
              }}
            />
            <ProviderCard
              provider="custom-server"
              name={bt.providers.customServer.name}
              icon={<Server size={20} className="text-orange-400" />}
              description={bt.providers.customServer.description}
              isSelected={selectedProvider === 'custom-server'}
              onSelect={() => {
                setSelectedProvider('custom-server');
                setShowCredentials(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Credentials Form */}
      {showCredentials && selectedProvider && !isConnected && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-white font-medium">
            <Key size={16} />
            <span>{bt.credentials.title}</span>
          </div>

          {selectedProvider === 'google-drive' ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Access Token</label>
                <input
                  type="text"
                  value={credentials.accessToken}
                  onChange={(e) => setCredentials(prev => ({ ...prev, accessToken: e.target.value }))}
                  placeholder={bt.credentials.accessTokenPlaceholder}
                  className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Refresh Token ({bt.credentials.optional})</label>
                <input
                  type="text"
                  value={credentials.refreshToken}
                  onChange={(e) => setCredentials(prev => ({ ...prev, refreshToken: e.target.value }))}
                  placeholder={bt.credentials.refreshTokenPlaceholder}
                  className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                />
              </div>
              <p className="text-xs text-zinc-500">
                {bt.providers.googleDrive.help}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Server URL</label>
                <input
                  type="url"
                  value={credentials.serverUrl}
                  onChange={(e) => setCredentials(prev => ({ ...prev, serverUrl: e.target.value }))}
                  placeholder="https://your-server.com/api"
                  className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={credentials.apiKey}
                    onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder={bt.credentials.apiKeyPlaceholder}
                    className="w-full px-3 py-2 pr-10 bg-zinc-700 rounded-lg text-white text-sm"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg text-sm flex items-center justify-center gap-2"
            >
              {connecting ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Cloud size={16} />
              )}
              {bt.actions.connect}
            </button>
            <button
              onClick={() => {
                setShowCredentials(false);
                setSelectedProvider(null);
              }}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm"
            >
              {bt.actions.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Connected State */}
      {isConnected && (
        <div className="space-y-4">
          {/* Provider Info */}
          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {config.provider === 'google-drive' ? (
                  <Cloud size={24} className="text-blue-400" />
                ) : (
                  <Server size={24} className="text-orange-400" />
                )}
                <div>
                  <p className="text-white font-medium">
                    {config.provider === 'google-drive' ? 'Google Drive' : bt.providers.customServer.name}
                  </p>
                  <p className="text-xs text-zinc-400">{bt.connected}</p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
                title={bt.actions.disconnect}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Auto-backup Toggle */}
          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-zinc-400" />
                <div>
                  <p className="text-white font-medium">{bt.autoBackup.title}</p>
                  <p className="text-xs text-zinc-400">{bt.autoBackup.description}</p>
                </div>
              </div>
              <button
                onClick={() => setAutoBackupEnabled(!config.autoBackupEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  config.autoBackupEnabled ? 'bg-purple-500' : 'bg-zinc-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    config.autoBackupEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleBackup}
              disabled={isBackingUp}
              className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            >
              {isBackingUp ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {bt.actions.backupNow}
            </button>
            <button
              onClick={handleRestore}
              disabled={isRestoring}
              className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            >
              {isRestoring ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {bt.actions.restore}
            </button>
          </div>
        </div>
      )}

      {/* Security Note */}
      <div className="flex items-start gap-2 text-xs text-zinc-500 bg-zinc-800/50 rounded-lg p-3">
        <Shield size={14} className="mt-0.5 text-green-400 flex-shrink-0" />
        <p>{bt.securityNote}</p>
      </div>
    </div>
  );
};

export default BackupConfigPanel;
