/**
 * BlacklistModal Component
 * Modal for managing blacklisted users in giveaways
 */

import React, { useState, useRef } from 'react';
import { Ban, UserPlus, Download, Upload, Trash2, Search, X } from 'lucide-react';
import { AnimatedModal } from '../AnimatedModal';

// ============================================
// TYPES
// ============================================

export interface BlacklistModalProps {
  /** Set of blacklisted usernames (lowercase) */
  blacklist: Set<string>;
  /** Callback to add user to blacklist */
  onAdd: (name: string) => void;
  /** Callback to remove user from blacklist */
  onRemove: (name: string) => void;
  /** Callback to clear entire blacklist */
  onClear?: () => void;
  /** Callback to export blacklist */
  onExport?: () => void;
  /** Callback to import blacklist from file content */
  onImport?: (content: string) => void;
  /** Callback to close modal */
  onClose: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const BlacklistModal: React.FC<BlacklistModalProps> = ({
  blacklist,
  onAdd,
  onRemove,
  onClear,
  onExport,
  onImport,
  onClose,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const blacklistArray = Array.from(blacklist).sort();
  const filteredList = searchQuery
    ? blacklistArray.filter((name: string) => name.includes(searchQuery.toLowerCase()))
    : blacklistArray;

  const handleAdd = () => {
    const name = inputValue.trim().toLowerCase();
    if (!name) return;

    if (blacklist.has(name)) {
      setMessage({ type: 'error', text: 'Este usuario ya está en la lista' });
    } else {
      onAdd(name);
      setMessage({ type: 'success', text: `${name} añadido a la lista` });
      setInputValue('');
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onImport(content);
      setMessage({ type: 'success', text: 'Lista importada correctamente' });
      setTimeout(() => setMessage(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClear = () => {
    if (onClear && window.confirm('¿Estás seguro de que quieres vaciar toda la lista?')) {
      onClear();
      setMessage({ type: 'success', text: 'Lista vaciada' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <AnimatedModal
      isOpen={true}
      onClose={onClose}
      title="Lista de Excluidos"
      subtitle={`${blacklist.size} usuario${blacklist.size !== 1 ? 's' : ''} bloqueado${blacklist.size !== 1 ? 's' : ''}`}
      icon={<Ban size={20} />}
      size="md"
    >
      {/* Add user input */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <UserPlus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nombre de usuario"
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Añadir
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
            : 'bg-red-500/20 text-red-600 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center justify-between mb-3">
        {/* Search */}
        {blacklist.size > 5 && (
          <div className="relative flex-1 mr-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-sm"
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {onExport && blacklist.size > 0 && (
            <button
              onClick={onExport}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 hover:text-blue-500 transition-colors"
              title="Exportar lista"
            >
              <Download size={16} />
            </button>
          )}
          {onImport && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 hover:text-green-500 transition-colors"
                title="Importar lista"
              >
                <Upload size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                onChange={handleImportFile}
                className="hidden"
              />
            </>
          )}
          {onClear && blacklist.size > 0 && (
            <button
              onClick={handleClear}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 hover:text-red-500 transition-colors"
              title="Vaciar lista"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="min-h-[200px] max-h-[300px] overflow-y-auto bg-zinc-50 dark:bg-zinc-900 rounded-xl">
        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-zinc-400">
            <Ban size={32} className="mb-2 opacity-50" />
            <p className="text-sm">
              {searchQuery ? 'No se encontraron resultados' : 'Lista vacía'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredList.map((name) => (
              <div
                key={name}
                className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-800 rounded-lg group"
              >
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {name}
                </span>
                <button
                  onClick={() => onRemove(name)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 transition-all"
                  title="Eliminar"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center mt-4">
        Los usuarios en esta lista no podrán ganar sorteos
      </p>
    </AnimatedModal>
  );
};

export default BlacklistModal;
