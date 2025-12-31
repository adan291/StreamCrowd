/**
 * CommandPanel Component
 * 
 * Panel de configuración para comandos personalizados de chat.
 * Permite crear, editar y gestionar comandos.
 * Incluye funcionalidad de import/export.
 * 
 * @requirements 2.3, 6.1, 6.2, 6.4, 6.6
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  Terminal, 
  Plus,
  Save,
  Trash2,
  Edit2,
  Clock,
  Users,
  Hash,
  MessageSquare,
  BarChart3,
  X,
  Check,
  AlertCircle,
  Download,
  Upload,
  FileJson,
  AlertTriangle
} from 'lucide-react';
import { 
  useCommands, 
  CustomCommand, 
  UserLevel 
} from '../src/application/hooks/useCommands';
import { useCommandsExport } from '../src/application/hooks/useCommandsExport';
import type { ImportMode, ImportResult, ImportValidationResult } from '../types/commandExport';

// User level configuration
const USER_LEVELS: { value: UserLevel; label: string; description: string }[] = [
  { value: 'everyone', label: 'Todos', description: 'Cualquier usuario' },
  { value: 'subscriber', label: 'Suscriptor', description: 'Solo suscriptores' },
  { value: 'vip', label: 'VIP', description: 'VIPs y superiores' },
  { value: 'moderator', label: 'Moderador', description: 'Moderadores y broadcaster' },
  { value: 'broadcaster', label: 'Broadcaster', description: 'Solo el streamer' },
];

// Variable help text
const VARIABLES_HELP = [
  { variable: '{user}', description: 'Nombre del usuario' },
  { variable: '{channel}', description: 'Nombre del canal' },
  { variable: '{count}', description: 'Veces que se ha usado el comando' },
  { variable: '{args}', description: 'Todos los argumentos' },
  { variable: '{arg0}', description: 'Primer argumento' },
  { variable: '{random}', description: 'Número aleatorio 1-100' },
  { variable: '{random:1:10}', description: 'Número aleatorio entre 1 y 10' },
];

interface CommandFormData {
  name: string;
  response: string;
  cooldown: number;
  userLevel: UserLevel;
  enabled: boolean;
}

const defaultFormData: CommandFormData = {
  name: '',
  response: '',
  cooldown: 5,
  userLevel: 'everyone',
  enabled: true,
};


interface CommandFormProps {
  initialData?: CommandFormData;
  onSave: (data: CommandFormData) => void;
  onCancel: () => void;
  isEditing: boolean;
}

/**
 * Form for creating/editing a command
 */
const CommandForm: React.FC<CommandFormProps> = ({ 
  initialData = defaultFormData, 
  onSave, 
  onCancel,
  isEditing 
}) => {
  const [formData, setFormData] = useState<CommandFormData>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof CommandFormData, string>>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof CommandFormData, string>> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.name)) {
      newErrors.name = 'Solo letras, números y guiones bajos';
    }
    
    if (!formData.response.trim()) {
      newErrors.response = 'La respuesta es requerida';
    }
    
    if (formData.cooldown < 0) {
      newErrors.cooldown = 'El cooldown no puede ser negativo';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  }, [formData, validate, onSave]);

  const handleChange = useCallback(<K extends keyof CommandFormData>(
    field: K, 
    value: CommandFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold">
          {isEditing ? 'Editar Comando' : 'Nuevo Comando'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Command Name */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">
            Nombre del Comando
          </label>
          <div className="flex items-center">
            <span className="bg-zinc-700 text-purple-400 px-3 py-2 rounded-l-lg border border-r-0 border-zinc-600">
              !
            </span>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value.toLowerCase())}
              placeholder="comando"
              className={`flex-1 bg-zinc-700 text-white rounded-r-lg px-3 py-2 text-sm border ${
                errors.name ? 'border-red-500' : 'border-zinc-600'
              } focus:border-purple-500 focus:outline-none`}
            />
          </div>
          {errors.name && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.name}
            </p>
          )}
        </div>

        {/* Response */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">
            Respuesta
          </label>
          <textarea
            value={formData.response}
            onChange={(e) => handleChange('response', e.target.value)}
            placeholder="¡Hola {user}! Bienvenido al stream"
            rows={3}
            className={`w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border ${
              errors.response ? 'border-red-500' : 'border-zinc-600'
            } focus:border-purple-500 focus:outline-none resize-none`}
          />
          {errors.response && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.response}
            </p>
          )}
          
          {/* Variables Help */}
          <div className="mt-2 flex flex-wrap gap-1">
            {VARIABLES_HELP.slice(0, 4).map(({ variable }) => (
              <button
                key={variable}
                type="button"
                onClick={() => handleChange('response', formData.response + variable)}
                className="text-xs bg-zinc-700 text-purple-400 px-2 py-1 rounded hover:bg-zinc-600 transition-colors"
              >
                {variable}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Cooldown */}
          <div>
            <label className="text-zinc-400 text-xs block mb-1">
              Cooldown (segundos)
            </label>
            <input
              type="number"
              min="0"
              max="3600"
              value={formData.cooldown}
              onChange={(e) => handleChange('cooldown', parseInt(e.target.value) || 0)}
              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* User Level */}
          <div>
            <label className="text-zinc-400 text-xs block mb-1">
              Nivel de Usuario
            </label>
            <select
              value={formData.userLevel}
              onChange={(e) => handleChange('userLevel', e.target.value as UserLevel)}
              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
            >
              {USER_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Enabled Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 text-sm">Comando Activo</span>
          <div 
            className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
              formData.enabled ? 'bg-green-500' : 'bg-zinc-600'
            }`}
            onClick={() => handleChange('enabled', !formData.enabled)}
          >
            <div 
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                formData.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-zinc-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm"
        >
          <Save size={16} />
          {isEditing ? 'Guardar Cambios' : 'Crear Comando'}
        </button>
      </div>
    </form>
  );
};


interface CommandItemProps {
  command: CustomCommand;
  onEdit: (command: CustomCommand) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

/**
 * Single command item in the list
 */
const CommandItem: React.FC<CommandItemProps> = ({ 
  command, 
  onEdit, 
  onDelete,
  onToggle 
}) => {
  const levelInfo = USER_LEVELS.find(l => l.value === command.userLevel);

  return (
    <div className={`bg-zinc-800/50 rounded-xl p-4 border transition-all ${
      command.enabled ? 'border-zinc-700' : 'border-zinc-800 opacity-60'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-400 font-mono font-bold">
              !{command.name}
            </span>
            {!command.enabled && (
              <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">
                Desactivado
              </span>
            )}
          </div>
          <p className="text-zinc-400 text-sm line-clamp-2 mb-2">
            {command.response}
          </p>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {command.cooldown}s
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              {levelInfo?.label}
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 size={12} />
              {command.usageCount} usos
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <div 
            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
              command.enabled ? 'bg-green-500' : 'bg-zinc-600'
            }`}
            onClick={() => onToggle(command.id, !command.enabled)}
          >
            <div 
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                command.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
          <button
            onClick={() => onEdit(command)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(command.id)}
            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Import Modal Component
 * @requirements 6.2, 6.4, 6.6
 */
interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File, mode: ImportMode) => Promise<ImportResult>;
  validateImport: (data: unknown) => ImportValidationResult;
  parseFile: (file: File) => Promise<unknown>;
  existingCommandCount: number;
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  validateImport,
  parseFile,
  existingCommandCount,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setResult(null);
    setIsLoading(true);

    try {
      const data = await parseFile(file);
      const validationResult = validateImport(data);
      setValidation(validationResult);
    } catch (error) {
      setValidation({
        valid: false,
        errors: [error instanceof Error ? error.message : 'Error al leer el archivo'],
        warnings: [],
        commandCount: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [parseFile, validateImport]);

  const handleImport = useCallback(async () => {
    if (!selectedFile || !validation?.valid) return;

    setIsLoading(true);
    try {
      const importResult = await onImport(selectedFile, importMode);
      setResult(importResult);
      if (importResult.success) {
        setTimeout(() => {
          onClose();
          setSelectedFile(null);
          setValidation(null);
          setResult(null);
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        imported: 0,
        skipped: 0,
        replaced: 0,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, validation, importMode, onImport, onClose]);

  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setValidation(null);
    setResult(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Upload size={20} className="text-purple-400" />
            Importar Comandos
          </h3>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* File Selection */}
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-4 border-2 border-dashed border-zinc-700 rounded-xl hover:border-purple-500 transition-colors flex flex-col items-center gap-2"
          >
            <FileJson size={32} className="text-zinc-500" />
            <span className="text-zinc-400 text-sm">
              {selectedFile ? selectedFile.name : 'Seleccionar archivo JSON'}
            </span>
          </button>
        </div>

        {/* Validation Results */}
        {validation && (
          <div className="mb-4 space-y-2">
            {validation.valid ? (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <Check size={16} />
                  <span>Archivo válido: {validation.commandCount} comandos</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-2 text-red-400 text-sm">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold mb-1">Errores de validación:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {validation.errors.slice(0, 5).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {validation.errors.length > 5 && (
                        <li>...y {validation.errors.length - 5} más</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-2 text-yellow-400 text-sm">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold mb-1">Advertencias:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {validation.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Import Mode Selection */}
        {validation?.valid && !result && (
          <div className="mb-4">
            <label className="text-zinc-400 text-xs block mb-2">Modo de importación</label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="mt-1"
                />
                <div>
                  <p className="text-white text-sm font-medium">Combinar</p>
                  <p className="text-zinc-500 text-xs">
                    Añade nuevos comandos, omite los que ya existen
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="mt-1"
                />
                <div>
                  <p className="text-white text-sm font-medium">Reemplazar</p>
                  <p className="text-zinc-500 text-xs">
                    Elimina los {existingCommandCount} comandos actuales y los reemplaza
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Import Result */}
        {result && (
          <div className={`mb-4 p-3 rounded-lg ${
            result.success 
              ? 'bg-green-500/10 border border-green-500/30' 
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            {result.success ? (
              <div className="text-green-400 text-sm">
                <p className="font-bold flex items-center gap-2">
                  <Check size={16} />
                  Importación exitosa
                </p>
                <p className="mt-1">
                  {result.imported} comandos importados
                  {result.skipped > 0 && `, ${result.skipped} omitidos`}
                  {result.replaced > 0 && `, ${result.replaced} reemplazados`}
                </p>
              </div>
            ) : (
              <div className="text-red-400 text-sm">
                <p className="font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  Error en la importación
                </p>
                <p className="mt-1">{result.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={!validation?.valid || isLoading || result?.success}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors text-sm"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload size={16} />
                Importar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main CommandPanel component
 */
export const CommandPanel: React.FC = () => {
  const { commands, addCommand, updateCommand, deleteCommand, prefix } = useCommands();
  const [showForm, setShowForm] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CustomCommand | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  // Import/Export hook
  const handleImportCommands = useCallback((newCommands: Omit<CustomCommand, 'id' | 'usageCount'>[]) => {
    newCommands.forEach(cmd => addCommand(cmd));
  }, [addCommand]);

  const { exportCommands, importCommands, validateImport, parseFile } = useCommandsExport(
    commands,
    handleImportCommands
  );

  const handleAddCommand = useCallback((data: CommandFormData) => {
    addCommand({
      name: data.name,
      response: data.response,
      cooldown: data.cooldown,
      userLevel: data.userLevel,
      enabled: data.enabled,
    });
    setShowForm(false);
  }, [addCommand]);

  const handleUpdateCommand = useCallback((data: CommandFormData) => {
    if (editingCommand) {
      updateCommand(editingCommand.id, {
        name: data.name,
        response: data.response,
        cooldown: data.cooldown,
        userLevel: data.userLevel,
        enabled: data.enabled,
      });
      setEditingCommand(null);
    }
  }, [editingCommand, updateCommand]);

  const handleDeleteCommand = useCallback((id: string) => {
    if (confirm('¿Estás seguro de eliminar este comando?')) {
      deleteCommand(id);
    }
  }, [deleteCommand]);

  const handleToggleCommand = useCallback((id: string, enabled: boolean) => {
    updateCommand(id, { enabled });
  }, [updateCommand]);

  const handleEdit = useCallback((command: CustomCommand) => {
    setEditingCommand(command);
    setShowForm(false);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setEditingCommand(null);
  }, []);

  // Filter commands by search term
  const filteredCommands = commands.filter(cmd => 
    cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.response.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort by usage count (most used first)
  const sortedCommands = [...filteredCommands].sort((a, b) => b.usageCount - a.usageCount);

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Terminal size={24} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-white text-xl font-bold">Comandos Personalizados</h2>
            <p className="text-zinc-500 text-sm">
              Prefix: <span className="text-purple-400 font-mono">{prefix}</span>
            </p>
          </div>
        </div>
        
        {!showForm && !editingCommand && (
          <div className="flex items-center gap-2">
            {/* Export Button */}
            <button
              onClick={exportCommands}
              disabled={commands.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 rounded-lg transition-colors text-sm"
              title="Exportar comandos"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            
            {/* Import Button */}
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm"
              title="Importar comandos"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">Importar</span>
            </button>
            
            {/* New Command Button */}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm"
            >
              <Plus size={16} />
              Nuevo Comando
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      {!showForm && !editingCommand && commands.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar comandos..."
              className="w-full bg-zinc-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <CommandForm
          onSave={handleAddCommand}
          onCancel={handleCancelForm}
          isEditing={false}
        />
      )}

      {editingCommand && (
        <CommandForm
          initialData={{
            name: editingCommand.name,
            response: editingCommand.response,
            cooldown: editingCommand.cooldown,
            userLevel: editingCommand.userLevel,
            enabled: editingCommand.enabled,
          }}
          onSave={handleUpdateCommand}
          onCancel={handleCancelForm}
          isEditing={true}
        />
      )}

      {/* Commands List */}
      {!showForm && !editingCommand && (
        <>
          {sortedCommands.length > 0 ? (
            <div className="space-y-3">
              {sortedCommands.map(command => (
                <CommandItem
                  key={command.id}
                  command={command}
                  onEdit={handleEdit}
                  onDelete={handleDeleteCommand}
                  onToggle={handleToggleCommand}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
              <p>
                {searchTerm 
                  ? 'No se encontraron comandos' 
                  : 'No hay comandos configurados'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 text-purple-400 hover:text-purple-300 text-sm"
                >
                  Crear tu primer comando
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Stats Footer */}
      {!showForm && !editingCommand && commands.length > 0 && (
        <div className="mt-6 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between text-sm">
            <div className="text-zinc-500">
              {commands.filter(c => c.enabled).length} de {commands.length} comandos activos
            </div>
            <div className="text-zinc-500">
              Total de usos: {commands.reduce((sum, c) => sum + c.usageCount, 0)}
            </div>
          </div>
        </div>
      )}

      {/* Variables Reference */}
      {(showForm || editingCommand) && (
        <div className="mt-4 p-3 bg-zinc-800/30 rounded-lg">
          <h4 className="text-zinc-400 text-xs font-bold mb-2">Variables Disponibles</h4>
          <div className="grid grid-cols-2 gap-2">
            {VARIABLES_HELP.map(({ variable, description }) => (
              <div key={variable} className="flex items-center gap-2 text-xs">
                <code className="text-purple-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                  {variable}
                </code>
                <span className="text-zinc-500">{description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={importCommands}
        validateImport={validateImport}
        parseFile={parseFile}
        existingCommandCount={commands.length}
      />
    </div>
  );
};

export default CommandPanel;
