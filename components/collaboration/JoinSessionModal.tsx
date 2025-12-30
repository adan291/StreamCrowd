// Modal para unirse a una sesión
import React, { useState, useEffect, useRef } from 'react';
import { useCollaborationContext } from '../../context/CollaborationContext';

export interface JoinSessionModalProps {
  userId: string;
  userName: string;
  userAvatar?: string;
  onClose: () => void;
}

// Valid characters for session codes (no I, O, 0, 1 to avoid confusion)
const VALID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function JoinSessionModal({
  userId,
  userName,
  userAvatar,
  onClose
}: JoinSessionModalProps) {
  const { joinSession, isLoading, error, clearError } = useCollaborationContext();
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{
    ownerName: string;
    collaboratorCount: number;
  } | null>(null);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Check for join code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode && joinCode.length === 6) {
      setCode(joinCode.toUpperCase().split(''));
    }
  }, []);

  // Handle input change
  const handleInputChange = (index: number, value: string) => {
    // Only allow valid characters
    const char = value.toUpperCase();
    if (char && !VALID_CHARS.includes(char)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);
    setValidationError(null);

    // Auto-focus next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle key down
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleJoin();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z2-9]/g, '');
    
    if (pastedText.length === 6) {
      // Validate all characters
      const isValid = pastedText.split('').every(char => VALID_CHARS.includes(char));
      if (isValid) {
        setCode(pastedText.split(''));
        inputRefs.current[5]?.focus();
      }
    }
  };

  // Validate code
  const validateCode = (): boolean => {
    const fullCode = code.join('');
    
    if (fullCode.length !== 6) {
      setValidationError('El código debe tener 6 caracteres');
      return false;
    }

    const isValid = fullCode.split('').every(char => VALID_CHARS.includes(char));
    if (!isValid) {
      setValidationError('El código contiene caracteres inválidos');
      return false;
    }

    return true;
  };

  // Handle join
  const handleJoin = async () => {
    if (!validateCode()) return;
    
    const fullCode = code.join('');
    
    try {
      await joinSession(fullCode, userId, userName, userAvatar);
      // Clean URL if it had join parameter
      if (window.location.search.includes('join=')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      onClose();
    } catch (err) {
      // Error is handled by context
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

  // Clear context error on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const fullCode = code.join('');
  const isCodeComplete = fullCode.length === 6;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Unirse a Sesión
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Instructions */}
        <p className="text-gray-400 text-sm mb-6">
          Ingresa el código de 6 caracteres que te compartió el propietario de la sesión.
        </p>

        {/* Code input */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-3">
            Código de Sesión
          </label>
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {code.map((char, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                maxLength={1}
                value={char}
                onChange={e => handleInputChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                className="w-12 h-14 bg-gray-900 text-white text-2xl font-mono 
                         text-center rounded border-2 border-gray-700 
                         focus:border-purple-500 focus:outline-none
                         uppercase transition-colors"
                autoComplete="off"
              />
            ))}
          </div>
          
          {/* Validation error */}
          {validationError && (
            <p className="text-red-400 text-sm text-center mt-2">
              {validationError}
            </p>
          )}
          
          {/* Context error */}
          {error && (
            <p className="text-red-400 text-sm text-center mt-2">
              {error}
            </p>
          )}
        </div>

        {/* Session info preview (if available) */}
        {sessionInfo && (
          <div className="bg-gray-700/50 rounded p-3 mb-4">
            <p className="text-white text-sm">
              <strong>Sesión de:</strong> {sessionInfo.ownerName}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {sessionInfo.collaboratorCount} colaborador(es) conectado(s)
            </p>
          </div>
        )}

        {/* User info */}
        <div className="bg-gray-700/50 rounded p-3 mb-6">
          <p className="text-gray-400 text-xs mb-2">Te unirás como:</p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-sm">{userName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="text-white">{userName}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white 
                     py-2 px-4 rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleJoin}
            disabled={!isCodeComplete || isLoading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 
                     disabled:bg-gray-600 disabled:cursor-not-allowed
                     text-white py-2 px-4 rounded transition-colors"
          >
            {isLoading ? 'Conectando...' : 'Unirse'}
          </button>
        </div>
      </div>
    </div>
  );
}
