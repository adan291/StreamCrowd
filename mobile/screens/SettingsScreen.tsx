import React, { useState, useEffect } from 'react';
import type { MobileSettings, MobileConnectionStatus } from '../../types/mobile';
import { DEFAULT_MOBILE_SETTINGS } from '../../types/mobile';

/**
 * SettingsScreen - App settings and preferences
 * @requirements Task 12 - Push Notifications config
 */

interface SettingsScreenProps {
  status: MobileConnectionStatus;
  onDisconnect: () => void;
  onBack: () => void;
}

const STORAGE_KEY = 'mobile_settings';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  status,
  onDisconnect,
  onBack,
}) => {
  const [settings, setSettings] = useState<MobileSettings>(DEFAULT_MOBILE_SETTINGS);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Load settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings({ ...DEFAULT_MOBILE_SETTINGS, ...JSON.parse(saved) });
      }
    } catch {
      // Use defaults
    }
  }, []);

  // Save settings
  const updateSettings = (updates: Partial<MobileSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  };

  const updateNotification = (key: keyof MobileSettings['notifications'], value: boolean) => {
    updateSettings({
      notifications: { ...settings.notifications, [key]: value },
    });
  };

  const handleDisconnect = () => {
    onDisconnect();
    setShowDisconnectConfirm(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="bg-zinc-900 px-4 py-4 border-b border-zinc-800 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">Ajustes</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Connection Status */}
        <Section title="Conexión">
          <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                status === 'connected' ? 'bg-green-500' :
                status === 'connecting' || status === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`} />
              <div>
                <p className="text-white font-medium">Estado</p>
                <p className="text-xs text-zinc-500">
                  {status === 'connected' ? 'Conectado' :
                   status === 'connecting' ? 'Conectando...' :
                   status === 'reconnecting' ? 'Reconectando...' :
                   'Desconectado'}
                </p>
              </div>
            </div>
            {status === 'connected' && (
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
              >
                Desconectar
              </button>
            )}
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notificaciones">
          <div className="bg-zinc-900 rounded-xl divide-y divide-zinc-800">
            <ToggleItem
              label="Notificaciones"
              description="Activar notificaciones push"
              value={settings.notifications.enabled}
              onChange={(v) => updateNotification('enabled', v)}
            />
            
            {settings.notifications.enabled && (
              <>
                <ToggleItem
                  label="Fin de encuesta"
                  value={settings.notifications.pollEnd}
                  onChange={(v) => updateNotification('pollEnd', v)}
                />
                <ToggleItem
                  label="Predicción bloqueada"
                  value={settings.notifications.predictionLock}
                  onChange={(v) => updateNotification('predictionLock', v)}
                />
                <ToggleItem
                  label="Ganador de sorteo"
                  value={settings.notifications.giveawayWinner}
                  onChange={(v) => updateNotification('giveawayWinner', v)}
                />
                <ToggleItem
                  label="Timer finalizado"
                  value={settings.notifications.timerEnd}
                  onChange={(v) => updateNotification('timerEnd', v)}
                />
                <ToggleItem
                  label="Nuevo seguidor"
                  value={settings.notifications.newFollower}
                  onChange={(v) => updateNotification('newFollower', v)}
                />
                <ToggleItem
                  label="Nueva suscripción"
                  value={settings.notifications.newSubscriber}
                  onChange={(v) => updateNotification('newSubscriber', v)}
                />
              </>
            )}
          </div>
        </Section>

        {/* Preferences */}
        <Section title="Preferencias">
          <div className="bg-zinc-900 rounded-xl divide-y divide-zinc-800">
            <ToggleItem
              label="Vibración"
              description="Feedback háptico en acciones"
              value={settings.haptics}
              onChange={(v) => updateSettings({ haptics: v })}
            />
            <ToggleItem
              label="Pantalla encendida"
              description="Mantener pantalla activa"
              value={settings.keepScreenOn}
              onChange={(v) => updateSettings({ keepScreenOn: v })}
            />
          </div>
        </Section>

        {/* Theme */}
        <Section title="Tema">
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex gap-2">
              {(['dark', 'light', 'system'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => updateSettings({ theme })}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                    settings.theme === theme
                      ? 'bg-purple-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {theme === 'dark' ? '🌙 Oscuro' :
                   theme === 'light' ? '☀️ Claro' :
                   '⚙️ Sistema'}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* About */}
        <Section title="Acerca de">
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="text-center">
              <div className="text-3xl mb-2">📱</div>
              <p className="text-white font-medium">StreamTools Mobile</p>
              <p className="text-xs text-zinc-500">Versión 1.0.0</p>
            </div>
          </div>
        </Section>
      </div>

      {/* Disconnect Confirmation */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-white mb-2">¿Desconectar?</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Se cerrará la conexión con la app de escritorio. Podrás volver a conectarte escaneando el código QR.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDisconnect}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                Desconectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div>
    <h2 className="text-sm font-medium text-zinc-400 mb-3 px-1">{title}</h2>
    {children}
  </div>
);

interface ToggleItemProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const ToggleItem: React.FC<ToggleItemProps> = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between p-4">
    <div>
      <p className="text-white font-medium">{label}</p>
      {description && <p className="text-xs text-zinc-500">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-7 rounded-full transition-colors relative ${
        value ? 'bg-purple-500' : 'bg-zinc-700'
      }`}
    >
      <div
        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export default SettingsScreen;
