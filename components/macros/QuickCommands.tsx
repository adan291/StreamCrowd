/**
 * QuickCommands Component
 * 
 * Provides quick access to chat commands that cannot be automated via API.
 * Users can click to copy commands to clipboard and paste them in Twitch chat.
 * Supports variables like {mensaje} that users can fill in before copying.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  Pin,
  Bookmark,
  MessageSquare,
  X,
  Save,
  AlertCircle,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export interface QuickCommand {
  id: string;
  name: string;
  command: string;
  description: string;
  variables: string[]; // e.g., ['mensaje', 'usuario']
  isCustom: boolean;
  icon?: string;
  color?: string;
}

export interface QuickCommandsProps {
  /** Whether viewing as moderator */
  isModeratorView?: boolean;
}

// ============================================
// Storage
// ============================================

const STORAGE_KEY = 'streamcrowd_quick_commands';

const loadCustomCommands = (): QuickCommand[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveCustomCommands = (commands: QuickCommand[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(commands));
};

// ============================================
// Predefined Commands
// ============================================

const PREDEFINED_COMMANDS: QuickCommand[] = [
  {
    id: 'pin',
    name: 'Fijar mensaje',
    command: '/pin {mensaje}',
    description: 'Fija un mensaje en el chat (solo funciona en chat nativo de Twitch)',
    variables: ['mensaje'],
    isCustom: false,
    icon: 'Pin',
    color: '#f59e0b',
  },
  {
    id: 'unpin',
    name: 'Desfijar mensaje',
    command: '/unpin',
    description: 'Quita el mensaje fijado del chat',
    variables: [],
    isCustom: false,
    icon: 'Pin',
    color: '#6b7280',
  },
  {
    id: 'marker',
    name: 'Crear marcador',
    command: '/marker {descripcion}',
    description: 'Crea un marcador en el stream para edición posterior',
    variables: ['descripcion'],
    isCustom: false,
    icon: 'Bookmark',
    color: '#8b5cf6',
  },
  {
    id: 'w',
    name: 'Susurro',
    command: '/w {usuario} {mensaje}',
    description: 'Envía un mensaje privado (whisper) a un usuario',
    variables: ['usuario', 'mensaje'],
    isCustom: false,
    icon: 'MessageSquare',
    color: '#06b6d4',
  },
  {
    id: 'color',
    name: 'Cambiar color',
    command: '/color {color}',
    description: 'Cambia el color de tu nombre en el chat (ej: Blue, Coral, #FF0000)',
    variables: ['color'],
    isCustom: false,
    icon: 'MessageSquare',
    color: '#ec4899',
  },
  {
    id: 'me',
    name: 'Acción /me',
    command: '/me {mensaje}',
    description: 'Envía un mensaje en formato de acción (texto en cursiva)',
    variables: ['mensaje'],
    isCustom: false,
    icon: 'MessageSquare',
    color: '#10b981',
  },
  {
    id: 'block',
    name: 'Bloquear usuario',
    command: '/block {usuario}',
    description: 'Bloquea a un usuario (no verás sus mensajes)',
    variables: ['usuario'],
    isCustom: false,
    icon: 'AlertCircle',
    color: '#ef4444',
  },
  {
    id: 'unblock',
    name: 'Desbloquear usuario',
    command: '/unblock {usuario}',
    description: 'Desbloquea a un usuario previamente bloqueado',
    variables: ['usuario'],
    isCustom: false,
    icon: 'AlertCircle',
    color: '#22c55e',
  },
];

// ============================================
// Helper Functions
// ============================================

const extractVariables = (command: string): string[] => {
  const matches = command.match(/\{([^}]+)\}/g);
  return matches ? matches.map(m => m.slice(1, -1)) : [];
};

const generateId = () => `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============================================
// Icon Component
// ============================================

const CommandIcon: React.FC<{ icon?: string; color?: string }> = ({ icon, color = '#a855f7' }) => {
  const iconProps = { size: 18, style: { color } };
  
  switch (icon) {
    case 'Pin': return <Pin {...iconProps} />;
    case 'Bookmark': return <Bookmark {...iconProps} />;
    case 'MessageSquare': return <MessageSquare {...iconProps} />;
    case 'AlertCircle': return <AlertCircle {...iconProps} />;
    default: return <MessageSquare {...iconProps} />;
  }
};

// ============================================
// Command Card Component
// ============================================

interface CommandCardProps {
  command: QuickCommand;
  onCopy: (command: string) => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

const CommandCard: React.FC<CommandCardProps> = ({ command, onCopy, onDelete, onEdit }) => {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const finalCommand = useMemo(() => {
    let result = command.command;
    for (const [key, value] of Object.entries(variableValues)) {
      result = result.replace(`{${key}}`, value || `{${key}}`);
    }
    return result;
  }, [command.command, variableValues]);

  const handleCopy = useCallback(() => {
    // Check if all variables are filled
    const hasEmptyVariables = command.variables.some(v => !variableValues[v]?.trim());
    
    if (hasEmptyVariables && command.variables.length > 0) {
      // Copy with placeholders if not all filled
      onCopy(finalCommand);
    } else {
      onCopy(finalCommand);
    }
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [finalCommand, onCopy, command.variables, variableValues]);

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 hover:border-zinc-600 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="p-2 rounded-lg shrink-0"
          style={{ backgroundColor: `${command.color || '#a855f7'}20` }}
        >
          <CommandIcon icon={command.icon} color={command.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-white truncate">{command.name}</h4>
            {command.isCustom && (
              <span className="shrink-0 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-medium rounded">
                CUSTOM
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mb-2">{command.description}</p>
          
          {/* Command Preview */}
          <div className="px-2 py-1.5 bg-zinc-900 rounded text-xs text-zinc-300 font-mono mb-2">
            {finalCommand}
          </div>

          {/* Variable Inputs */}
          {command.variables.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {command.variables.map((variable) => (
                <input
                  key={variable}
                  type="text"
                  placeholder={variable}
                  value={variableValues[variable] || ''}
                  onChange={(e) => setVariableValues(prev => ({
                    ...prev,
                    [variable]: e.target.value
                  }))}
                  className="flex-1 min-w-[100px] px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className={`p-2 rounded-lg transition-all ${
              copied
                ? 'bg-green-500/20 text-green-400'
                : 'bg-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-600'
            }`}
            title={copied ? 'Copiado!' : 'Copiar al portapapeles'}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          
          {command.isCustom && (
            <>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="p-2 bg-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-600 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-2 bg-zinc-700 text-zinc-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Editor Modal Component
// ============================================

interface CommandEditorProps {
  command?: QuickCommand;
  onSave: (command: Omit<QuickCommand, 'id' | 'isCustom'>) => void;
  onCancel: () => void;
}

const CommandEditor: React.FC<CommandEditorProps> = ({ command, onSave, onCancel }) => {
  const [name, setName] = useState(command?.name || '');
  const [commandText, setCommandText] = useState(command?.command || '/');
  const [description, setDescription] = useState(command?.description || '');

  const detectedVariables = useMemo(() => extractVariables(commandText), [commandText]);

  const handleSave = () => {
    if (!name.trim() || !commandText.trim()) return;
    
    onSave({
      name: name.trim(),
      command: commandText.trim(),
      description: description.trim(),
      variables: detectedVariables,
      color: '#a855f7',
      icon: 'MessageSquare',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            {command ? 'Editar comando' : 'Nuevo comando rápido'}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mi comando personalizado"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Comando</label>
            <input
              type="text"
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              placeholder="/comando {variable}"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Usa {'{variable}'} para crear campos editables
            </p>
          </div>

          {detectedVariables.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {detectedVariables.map((v) => (
                <span
                  key={v}
                  className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded"
                >
                  {v}
                </span>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿Para qué sirve este comando?"
              rows={2}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !commandText.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Save size={16} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const QuickCommands: React.FC<QuickCommandsProps> = ({ isModeratorView = false }) => {
  const [customCommands, setCustomCommands] = useState<QuickCommand[]>(loadCustomCommands);
  const [showEditor, setShowEditor] = useState(false);
  const [editingCommand, setEditingCommand] = useState<QuickCommand | undefined>();
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  const allCommands = useMemo(() => {
    return [...PREDEFINED_COMMANDS, ...customCommands];
  }, [customCommands]);

  const handleCopy = useCallback((command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedMessage(command);
    setTimeout(() => setCopiedMessage(null), 3000);
  }, []);

  const handleSaveCommand = useCallback((data: Omit<QuickCommand, 'id' | 'isCustom'>) => {
    if (editingCommand) {
      // Update existing
      const updated = customCommands.map(c => 
        c.id === editingCommand.id 
          ? { ...c, ...data }
          : c
      );
      setCustomCommands(updated);
      saveCustomCommands(updated);
    } else {
      // Create new
      const newCommand: QuickCommand = {
        ...data,
        id: generateId(),
        isCustom: true,
      };
      const updated = [...customCommands, newCommand];
      setCustomCommands(updated);
      saveCustomCommands(updated);
    }
    setShowEditor(false);
    setEditingCommand(undefined);
  }, [customCommands, editingCommand]);

  const handleDeleteCommand = useCallback((id: string) => {
    const updated = customCommands.filter(c => c.id !== id);
    setCustomCommands(updated);
    saveCustomCommands(updated);
  }, [customCommands]);

  const handleEditCommand = useCallback((command: QuickCommand) => {
    setEditingCommand(command);
    setShowEditor(true);
  }, []);

  return (
    <div className="p-4">
      {/* Info Banner */}
      <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-200">
            <p className="font-medium mb-1">Comandos sin API</p>
            <p className="text-amber-300/80">
              Estos comandos no están disponibles via API de Twitch. 
              Copia el comando y pégalo directamente en el chat de Twitch.
            </p>
          </div>
        </div>
      </div>

      {/* Copied Toast */}
      {copiedMessage && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg animate-in slide-in-from-bottom-2">
          <Check size={16} />
          <span className="text-sm">Copiado al portapapeles</span>
        </div>
      )}

      {/* Add Custom Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setEditingCommand(undefined);
            setShowEditor(true);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm"
        >
          <Plus size={16} />
          Nuevo comando
        </button>
      </div>

      {/* Commands List */}
      <div className="grid gap-3">
        {allCommands.map((command) => (
          <CommandCard
            key={command.id}
            command={command}
            onCopy={handleCopy}
            onDelete={command.isCustom ? () => handleDeleteCommand(command.id) : undefined}
            onEdit={command.isCustom ? () => handleEditCommand(command) : undefined}
          />
        ))}
      </div>

      {/* Empty State */}
      {allCommands.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare size={48} className="text-zinc-600 mb-3" />
          <p className="text-zinc-400 mb-1">No hay comandos rápidos</p>
          <p className="text-sm text-zinc-500">
            Crea tu primer comando personalizado
          </p>
        </div>
      )}

      {/* Footer */}
      <p className="mt-4 text-[10px] text-zinc-500 text-center">
        Los comandos se copian al portapapeles. Pégalos en el chat de Twitch para ejecutarlos.
      </p>

      {/* Editor Modal */}
      {showEditor && (
        <CommandEditor
          command={editingCommand}
          onSave={handleSaveCommand}
          onCancel={() => {
            setShowEditor(false);
            setEditingCommand(undefined);
          }}
        />
      )}
    </div>
  );
};

export default QuickCommands;
