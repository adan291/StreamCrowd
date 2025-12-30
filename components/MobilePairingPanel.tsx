import React, { useState, useEffect, useCallback } from 'react';
import { getMobileServerService } from '../src/services/MobileServerService';
import type { PairingData, ConnectedDevice } from '../types/mobile';

/**
 * MobilePairingPanel - QR code generator and device management
 * @requirements Task 13 - Crear MobilePairingPanel (Desktop)
 */

interface MobilePairingPanelProps {
  channelName?: string;
  onDeviceConnected?: (device: ConnectedDevice) => void;
  onDeviceDisconnected?: (deviceId: string) => void;
}

export const MobilePairingPanel: React.FC<MobilePairingPanelProps> = ({
  channelName,
  onDeviceConnected,
  onDeviceDisconnected,
}) => {
  const [pairingData, setPairingData] = useState<PairingData | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const mobileServer = getMobileServerService();

  // Generate new pairing data
  const generatePairing = useCallback(() => {
    const data = mobileServer.generatePairingData(channelName);
    setPairingData(data);
    setShowQR(true);
  }, [channelName, mobileServer]);

  // Update connected devices
  useEffect(() => {
    setConnectedDevices(mobileServer.getConnectedDevices());

    const unsubConnect = mobileServer.onConnection((device) => {
      setConnectedDevices(mobileServer.getConnectedDevices());
      onDeviceConnected?.(device);
    });

    const unsubDisconnect = mobileServer.onDisconnection((deviceId) => {
      setConnectedDevices(mobileServer.getConnectedDevices());
      onDeviceDisconnected?.(deviceId);
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, [mobileServer, onDeviceConnected, onDeviceDisconnected]);

  // Auto-refresh pairing data when expired
  useEffect(() => {
    if (!pairingData) return;

    const timeUntilExpiry = pairingData.expiresAt - Date.now();
    if (timeUntilExpiry <= 0) {
      generatePairing();
      return;
    }

    const timeout = setTimeout(() => {
      if (showQR) {
        generatePairing();
      }
    }, timeUntilExpiry);

    return () => clearTimeout(timeout);
  }, [pairingData, showQR, generatePairing]);

  // Copy code to clipboard
  const copyCode = async () => {
    if (!pairingData) return;
    try {
      await navigator.clipboard.writeText(pairingData.sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Disconnect device
  const handleDisconnect = (deviceId: string) => {
    mobileServer.disconnectDevice(deviceId);
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Ahora';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}m`;
    return `Hace ${Math.floor(seconds / 3600)}h`;
  };

  // Generate QR code URL (using QR code API)
  const getQRCodeUrl = (data: PairingData): string => {
    const payload = JSON.stringify({
      s: data.sessionId,
      u: data.wsUrl,
      t: data.token,
      e: data.expiresAt,
    });
    const encoded = encodeURIComponent(payload);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <h2 className="text-white font-medium">App Móvil</h2>
            <p className="text-xs text-zinc-500">
              {connectedDevices.length} dispositivo{connectedDevices.length !== 1 ? 's' : ''} conectado{connectedDevices.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={generatePairing}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
        >
          {showQR ? 'Nuevo código' : 'Conectar'}
        </button>
      </div>

      {/* QR Code Section */}
      {showQR && pairingData && (
        <div className="p-6 border-b border-zinc-800">
          <div className="flex flex-col items-center">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl mb-4">
              <img
                src={getQRCodeUrl(pairingData)}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>

            {/* Manual Code */}
            <div className="text-center mb-4">
              <p className="text-zinc-500 text-sm mb-2">O ingresa el código:</p>
              <div className="flex items-center gap-2">
                <code className="text-2xl font-mono font-bold text-white tracking-widest bg-zinc-800 px-4 py-2 rounded-lg">
                  {pairingData.sessionId}
                </code>
                <button
                  onClick={copyCode}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                  title="Copiar código"
                >
                  {copied ? (
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Expiry Timer */}
            <ExpiryTimer expiresAt={pairingData.expiresAt} />

            {/* Instructions */}
            <div className="text-center text-zinc-500 text-sm mt-4">
              <p>1. Abre la app móvil en tu teléfono</p>
              <p>2. Escanea el código QR o ingresa el código</p>
            </div>
          </div>
        </div>
      )}

      {/* Connected Devices */}
      {connectedDevices.length > 0 && (
        <div className="p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Dispositivos conectados</h3>
          <div className="space-y-2">
            {connectedDevices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {device.platform === 'ios' ? '📱' : device.platform === 'android' ? '🤖' : '🌐'}
                  </span>
                  <div>
                    <p className="text-white text-sm font-medium">{device.name}</p>
                    <p className="text-xs text-zinc-500">
                      Conectado {formatTimeAgo(device.connectedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <button
                    onClick={() => handleDisconnect(device.id)}
                    className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors"
                    title="Desconectar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!showQR && connectedDevices.length === 0 && (
        <div className="p-8 text-center">
          <div className="text-4xl mb-4">📲</div>
          <p className="text-zinc-400 text-sm mb-4">
            Conecta tu teléfono para controlar el stream desde cualquier lugar
          </p>
          <button
            onClick={generatePairing}
            className="px-6 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors"
          >
            Generar código QR
          </button>
        </div>
      )}
    </div>
  );
};

interface ExpiryTimerProps {
  expiresAt: number;
}

const ExpiryTimer: React.FC<ExpiryTimerProps> = ({ expiresAt }) => {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, expiresAt - Date.now()));
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  if (remaining <= 0) {
    return (
      <p className="text-red-400 text-sm">Código expirado - genera uno nuevo</p>
    );
  }

  return (
    <p className="text-zinc-500 text-sm">
      Expira en {minutes}:{seconds.toString().padStart(2, '0')}
    </p>
  );
};

export default MobilePairingPanel;
