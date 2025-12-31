// Modal para invitar colaboradores
import React, { useState, useEffect } from 'react';
import { CollaboratorRole } from '../../types/collaboration';

export interface InviteModalProps {
  sessionCode: string;
  onClose: () => void;
}

export function InviteModal({ sessionCode, onClose }: InviteModalProps) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [defaultRole, setDefaultRole] = useState<CollaboratorRole>('moderator');
  const [showQR, setShowQR] = useState(false);

  // Generate invite link
  const inviteLink = `${window.location.origin}?join=${sessionCode}`;

  // Generate QR code URL (using a free QR API)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`;

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Invitar Colaboradores
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Session code */}
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">
            Código de Sesión
          </label>
          <div className="flex gap-2">
            <code className="flex-1 bg-gray-900 px-4 py-3 rounded text-purple-400 
                           font-mono text-2xl text-center tracking-widest">
              {sessionCode}
            </code>
            <button
              onClick={() => copyToClipboard(sessionCode, 'code')}
              className={`px-4 rounded transition-colors ${
                copied === 'code'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {copied === 'code' ? '✓' : '📋'}
            </button>
          </div>
        </div>

        {/* Invite link */}
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">
            Link de Invitación
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 bg-gray-900 px-3 py-2 rounded text-gray-300 
                       text-sm truncate focus:outline-none"
            />
            <button
              onClick={() => copyToClipboard(inviteLink, 'link')}
              className={`px-4 rounded transition-colors ${
                copied === 'link'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {copied === 'link' ? '✓' : '📋'}
            </button>
          </div>
        </div>

        {/* QR Code toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowQR(!showQR)}
            className="text-purple-400 text-sm hover:underline"
          >
            {showQR ? '▼ Ocultar código QR' : '▶ Mostrar código QR'}
          </button>
          
          {showQR && (
            <div className="mt-3 flex justify-center">
              <div className="bg-white p-2 rounded">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>
          )}
        </div>

        {/* Default role for invitees */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">
            Rol por defecto para invitados
          </label>
          <select
            value={defaultRole}
            onChange={e => setDefaultRole(e.target.value as CollaboratorRole)}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded
                     focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="admin">Admin - Todos los permisos excepto gestión de sesión</option>
            <option value="moderator">Moderador - Puede crear y editar contenido</option>
            <option value="viewer">Viewer - Solo puede ver</option>
          </select>
        </div>

        {/* Instructions */}
        <div className="bg-gray-700/50 rounded p-3 mb-4">
          <p className="text-gray-300 text-sm">
            <strong>Instrucciones:</strong>
          </p>
          <ol className="text-gray-400 text-sm mt-2 space-y-1 list-decimal list-inside">
            <li>Comparte el código o link con tus colaboradores</li>
            <li>Ellos deben abrir la aplicación y hacer clic en "Unirse a Sesión"</li>
            <li>Ingresar el código de 6 caracteres</li>
            <li>¡Listo! Podrán colaborar en tiempo real</li>
          </ol>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white 
                   py-2 px-4 rounded transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
