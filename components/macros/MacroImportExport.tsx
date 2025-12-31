/**
 * MacroImportExport Component
 * 
 * Component for importing and exporting macros with preview functionality.
 * 
 * @requirements 8.1 - THE Macro_Service SHALL export selected macros to JSON format
 * @requirements 8.2 - THE Macro_Service SHALL import macros from JSON file
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Download,
  Upload,
  X,
  Check,
  AlertCircle,
  FileJson,
  CheckSquare,
  Square,
  Zap,
  Info,
} from 'lucide-react';
import { useMacros } from '../../hooks/useMacros';
import type { Macro, MacroExport, MacroImportResult } from '../../types/macros';

// ============================================
// Types
// ============================================

export interface MacroImportExportProps {
  /** List of macros available for export */
  macros: Macro[];
  /** Callback when modal is closed */
  onClose: () => void;
}

type Tab = 'export' | 'import';

interface ImportPreview {
  data: MacroExport;
  isValid: boolean;
  errors: string[];
}

// ============================================
// Helpers
// ============================================

/**
 * Format date for display
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Download JSON file
 */
function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate import data structure
 */
function validateImportData(data: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('El archivo no contiene datos válidos');
    return { isValid: false, errors };
  }

  const exportData = data as Partial<MacroExport>;

  if (!exportData.version) {
    errors.push('Falta la versión del archivo');
  }

  if (!exportData.macros || !Array.isArray(exportData.macros)) {
    errors.push('No se encontraron macros en el archivo');
    return { isValid: false, errors };
  }

  if (exportData.macros.length === 0) {
    errors.push('El archivo no contiene macros');
    return { isValid: false, errors };
  }

  // Validate each macro has required fields
  exportData.macros.forEach((macro, index) => {
    if (!macro.name) {
      errors.push(`Macro ${index + 1}: falta el nombre`);
    }
    if (!macro.trigger) {
      errors.push(`Macro ${index + 1}: falta el trigger`);
    }
    if (!macro.actions || !Array.isArray(macro.actions)) {
      errors.push(`Macro ${index + 1}: faltan las acciones`);
    }
  });

  return { isValid: errors.length === 0, errors };
}

// ============================================
// Component
// ============================================

export const MacroImportExport: React.FC<MacroImportExportProps> = ({
  macros,
  onClose,
}) => {
  const { exportMacros, importMacros } = useMacros();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [activeTab, setActiveTab] = useState<Tab>('export');
  const [selectedMacros, setSelectedMacros] = useState<Set<string>>(new Set());
  const [authorName, setAuthorName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<MacroImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Toggle macro selection
   */
  const toggleMacroSelection = useCallback((macroId: string) => {
    setSelectedMacros(prev => {
      const next = new Set(prev);
      if (next.has(macroId)) {
        next.delete(macroId);
      } else {
        next.add(macroId);
      }
      return next;
    });
  }, []);

  /**
   * Select all macros
   */
  const selectAll = useCallback(() => {
    setSelectedMacros(new Set(macros.map(m => m.id)));
  }, [macros]);

  /**
   * Deselect all macros
   */
  const deselectAll = useCallback(() => {
    setSelectedMacros(new Set());
  }, []);

  /**
   * Handle export
   * @requirements 8.1
   */
  const handleExport = useCallback(async () => {
    if (selectedMacros.size === 0) {
      setError('Selecciona al menos una macro para exportar');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const json = await exportMacros(
        Array.from(selectedMacros),
        authorName || undefined
      );
      
      const filename = `macros_${new Date().toISOString().split('T')[0]}.json`;
      downloadJson(json, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setIsExporting(false);
    }
  }, [selectedMacros, authorName, exportMacros]);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setImportResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const validation = validateImportData(data);

      setImportPreview({
        data: data as MacroExport,
        isValid: validation.isValid,
        errors: validation.errors,
      });
    } catch (err) {
      setError('Error al leer el archivo. Asegúrate de que es un JSON válido.');
      setImportPreview(null);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Handle import
   * @requirements 8.2
   */
  const handleImport = useCallback(async () => {
    if (!importPreview || !importPreview.isValid) return;

    setIsImporting(true);
    setError(null);

    try {
      const result = await importMacros(JSON.stringify(importPreview.data));
      setImportResult(result);
      setImportPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar');
    } finally {
      setIsImporting(false);
    }
  }, [importPreview, importMacros]);

  /**
   * Clear import state
   */
  const clearImport = useCallback(() => {
    setImportPreview(null);
    setImportResult(null);
    setError(null);
  }, []);

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <FileJson size={20} className="text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Importar / Exportar</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'export'
                ? 'bg-purple-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <Download size={16} />
            Exportar
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'import'
                ? 'bg-purple-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <Upload size={16} />
            Importar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {activeTab === 'export' ? (
          /* Export Tab */
          <div className="space-y-4">
            {/* Author Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Autor (opcional)
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Tu nombre o alias"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>

            {/* Macro Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-zinc-400">
                  Seleccionar macros ({selectedMacros.size}/{macros.length})
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Todas
                  </button>
                  <span className="text-zinc-600">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Ninguna
                  </button>
                </div>
              </div>

              <div className="space-y-1 max-h-60 overflow-y-auto">
                {macros.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">
                    No hay macros para exportar
                  </p>
                ) : (
                  macros.map((macro) => (
                    <button
                      key={macro.id}
                      onClick={() => toggleMacroSelection(macro.id)}
                      className="w-full flex items-center gap-3 p-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors text-left"
                    >
                      {selectedMacros.has(macro.id) ? (
                        <CheckSquare size={18} className="text-purple-400 shrink-0" />
                      ) : (
                        <Square size={18} className="text-zinc-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{macro.name}</p>
                        <p className="text-xs text-zinc-500">
                          {macro.actions.length} acciones
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Import Tab */
          <div className="space-y-4">
            {/* File Input */}
            {!importPreview && !importResult && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-zinc-700 hover:border-purple-500 rounded-lg transition-colors group"
                >
                  <div className="text-center">
                    <Upload
                      size={32}
                      className="mx-auto mb-2 text-zinc-500 group-hover:text-purple-400 transition-colors"
                    />
                    <p className="text-zinc-400 group-hover:text-white transition-colors">
                      Haz clic para seleccionar un archivo
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Archivos .json exportados desde TwitchVote
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* Import Preview */}
            {importPreview && (
              <div className="space-y-4">
                <div className="p-3 bg-zinc-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileJson size={16} className="text-purple-400" />
                    <span className="text-sm font-medium text-white">
                      Vista previa
                    </span>
                  </div>
                  
                  <div className="text-xs text-zinc-400 space-y-1">
                    <p>Versión: {importPreview.data.version}</p>
                    <p>Fecha: {formatDate(importPreview.data.exportedAt)}</p>
                    {importPreview.data.author && (
                      <p>Autor: {importPreview.data.author}</p>
                    )}
                    <p>Macros: {importPreview.data.macros.length}</p>
                  </div>
                </div>

                {/* Validation Errors */}
                {importPreview.errors.length > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                      <div className="text-sm text-red-400">
                        <p className="font-medium mb-1">Errores de validación:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {importPreview.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Macro List Preview */}
                {importPreview.isValid && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importPreview.data.macros.map((macro, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-lg"
                      >
                        <Zap size={14} className="text-purple-400" />
                        <span className="text-sm text-white truncate">
                          {macro.name}
                        </span>
                        <span className="text-xs text-zinc-500 ml-auto">
                          {macro.actions?.length || 0} acciones
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={clearImport}
                    className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!importPreview.isValid || isImporting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isImporting ? (
                      'Importando...'
                    ) : (
                      <>
                        <Upload size={16} />
                        Importar
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-lg ${
                    importResult.success
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-yellow-500/10 border border-yellow-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {importResult.success ? (
                      <Check size={20} className="text-green-400" />
                    ) : (
                      <Info size={20} className="text-yellow-400" />
                    )}
                    <span
                      className={`font-medium ${
                        importResult.success ? 'text-green-400' : 'text-yellow-400'
                      }`}
                    >
                      {importResult.success
                        ? 'Importación completada'
                        : 'Importación parcial'}
                    </span>
                  </div>

                  <div className="text-sm space-y-1">
                    <p className="text-zinc-300">
                      {importResult.imported} macros importadas
                    </p>
                    {importResult.skipped > 0 && (
                      <p className="text-zinc-400">
                        {importResult.skipped} macros omitidas
                      </p>
                    )}
                    {importResult.renamed.length > 0 && (
                      <p className="text-zinc-400">
                        {importResult.renamed.length} macros renombradas
                      </p>
                    )}
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-zinc-700">
                      <p className="text-xs text-red-400">
                        Errores: {importResult.errors.join(', ')}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={clearImport}
                  className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors text-sm"
                >
                  Importar más
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer (Export only) */}
      {activeTab === 'export' && (
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleExport}
            disabled={selectedMacros.size === 0 || isExporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              'Exportando...'
            ) : (
              <>
                <Download size={18} />
                Exportar {selectedMacros.size} macro{selectedMacros.size !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default MacroImportExport;
