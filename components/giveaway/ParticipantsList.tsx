/**
 * ParticipantsList Component - VERSION 2.0 TWO COLUMNS
 * Two parallel lists: Participants | Excluded (side by side with tags)
 */

import React, { useState, useMemo } from 'react';
import { Users, X, Download, Upload, Search, Plus, Trash2, RefreshCw, Loader2, UserX, ArrowRight, ArrowLeft, UserMinus } from 'lucide-react';

export type ParticipantSource = 'manual' | 'chat' | 'import' | 'chatter';

export interface ParticipantEntry {
  name: string;
  source: ParticipantSource;
}

export interface ParticipantsListProps {
  participants: Set<string> | string[];
  participantSources?: Map<string, ParticipantSource>;
  onRemove?: (name: string) => void;
  onAdd?: (name: string, source?: ParticipantSource) => boolean | void;
  onAddMultiple?: (names: string[], source?: ParticipantSource) => number | void;
  onClear?: () => void;
  onExport?: () => void;
  onImport?: (content: string) => void;
  onExclude?: (name: string) => void;
  onRemoveExcluded?: (name: string) => void;
  onClearExcluded?: () => void;
  onExportExcluded?: () => void;
  onImportExcluded?: (content: string) => void;
  onMoveToExcluded?: (name: string) => void; // Remove from participants AND add to excluded
  onMoveToParticipants?: (name: string) => void; // Remove from excluded AND add to participants
  onLoadChatters?: () => Promise<string[]>;
  excludedList?: Set<string>;
  isExcluded?: (name: string) => boolean;
  isParticipant?: (name: string) => boolean;
  showActions?: boolean;
  showHeader?: boolean;
  maxHeight?: string;
  className?: string;
  emptyMessage?: string;
  title?: string;
  isLoadingChatters?: boolean;
}

const SOURCE_COLORS: Record<ParticipantSource, { bg: string; text: string }> = {
  manual: { bg: 'bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
  chat: { bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400' },
  import: { bg: 'bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400' },
  chatter: { bg: 'bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' },
};

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  participantSources,
  onRemove,
  onAdd,
  onAddMultiple,
  onClear,
  onExport,
  onImport,
  onExclude,
  onRemoveExcluded,
  onClearExcluded,
  onExportExcluded,
  onImportExcluded,
  onMoveToExcluded,
  onMoveToParticipants,
  onLoadChatters,
  excludedList = new Set(),
  isExcluded,
  isParticipant,
  showActions = true,
  showHeader = true,
  maxHeight = '180px',
  className = '',
  emptyMessage = 'Sin participantes',
  isLoadingChatters = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newParticipant, setNewParticipant] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const participantArray = useMemo(() => Array.isArray(participants) ? participants : Array.from(participants), [participants]);
  const excludedArray = useMemo(() => Array.from(excludedList), [excludedList]);

  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participantArray;
    const q = searchQuery.toLowerCase();
    return participantArray.filter((p: string) => p.toLowerCase().includes(q));
  }, [participantArray, searchQuery]);

  const filteredExcluded = useMemo(() => {
    if (!searchQuery.trim()) return excludedArray;
    const q = searchQuery.toLowerCase();
    return excludedArray.filter((p: string) => p.toLowerCase().includes(q));
  }, [excludedArray, searchQuery]);

  const count = participantArray.length;
  const excludedCount = excludedArray.length;

  const handleAdd = () => {
    const name = newParticipant.trim();
    if (!name || !onAdd) return;
    
    // Check if already in excluded list
    const inExcluded = isExcluded ? isExcluded(name) : excludedList.has(name.toLowerCase());
    if (inExcluded) {
      setFeedback({ type: 'error', message: `"${name}" está en excluidos` });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    
    // Check if already a participant
    const inParticipants = isParticipant ? isParticipant(name) : participantArray.some(p => p.toLowerCase() === name.toLowerCase());
    if (inParticipants) {
      setFeedback({ type: 'error', message: `"${name}" ya es participante` });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    
    const result = onAdd(name, 'manual');
    if (result === false) {
      setFeedback({ type: 'error', message: `No se pudo añadir "${name}"` });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    
    setNewParticipant('');
    setFeedback(null);
  };

  const handleExclude = () => {
    if (newParticipant.trim() && onExclude) {
      onExclude(newParticipant.trim());
      setNewParticipant('');
    }
  };

  const handleBulkAdd = () => {
    if (!bulkText.trim() || !onAddMultiple) return;
    const names = bulkText.split(/[\n,;]+/).map((n: string) => n.trim()).filter((n: string) => n.length > 0);
    if (names.length > 0) {
      onAddMultiple(names, 'manual');
      setBulkText('');
      setShowBulkAdd(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;
    const reader = new FileReader();
    reader.onload = (event) => onImport(event.target?.result as string);
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = () => {
    if (onExport) { onExport(); return; }
    const blob = new Blob([participantArray.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'participantes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcluded = () => {
    if (onExportExcluded) { onExportExcluded(); return; }
    const blob = new Blob([excludedArray.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'excluidos.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportExcludedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportExcluded) return;
    const reader = new FileReader();
    reader.onload = (event) => onImportExcluded(event.target?.result as string);
    reader.readAsText(file);
    e.target.value = '';
  };

  const getSource = (name: string): ParticipantSource => participantSources?.get(name.toLowerCase()) || 'chat';

  return (
    <div className={`bg-zinc-50 dark:bg-zinc-800/50 rounded-xl ${className}`} data-component="ParticipantsList-v2">
      {/* Header with input */}
      {showHeader && (
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-700 space-y-2">
          {(onAdd || onExclude) && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Nombre del usuario"
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-zinc-900 border focus:ring-2 focus:ring-purple-500 ${
                  feedback?.type === 'error' ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'
                }`}
              />
              {onAdd && (
                <button onClick={handleAdd} disabled={!newParticipant.trim()} className="p-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50" title="Añadir participante">
                  <Plus size={16} />
                </button>
              )}
              {onExclude && (
                <button onClick={handleExclude} disabled={!newParticipant.trim()} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50" title="Añadir a excluidos">
                  <UserMinus size={16} />
                </button>
              )}
            </div>
          )}
          {/* Feedback message */}
          {feedback && (
            <p className={`text-xs ${feedback.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
              {feedback.message}
            </p>
          )}
          {onAddMultiple && (
            <>
              <button onClick={() => setShowBulkAdd(!showBulkAdd)} className="text-xs text-purple-500 hover:text-purple-600">
                {showBulkAdd ? 'Ocultar' : 'Añadir múltiples...'}
              </button>
              {showBulkAdd && (
                <div className="space-y-2">
                  <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Un nombre por línea" className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 resize-none" rows={3} />
                  <button onClick={handleBulkAdd} disabled={!bulkText.trim()} className="w-full py-1.5 text-sm bg-purple-500 text-white rounded-lg disabled:opacity-50">Añadir todos</button>
                </div>
              )}
            </>
          )}
          {(count > 5 || excludedCount > 0) && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar..." className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600" />
            </div>
          )}
        </div>
      )}

      {/* TWO COLUMN HEADERS - Participantes | Excluidos */}
      <div className="grid grid-cols-2 border-b border-zinc-200 dark:border-zinc-700">
        <div className="p-2 flex items-center justify-between border-r border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-purple-500" />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Participantes</span>
            <span className="text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full">{count}</span>
          </div>
          <div className="flex items-center gap-0.5">
            {onLoadChatters && (
              <button onClick={onLoadChatters} disabled={isLoadingChatters} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-purple-500 disabled:opacity-50" title="Cargar chatters">
                {isLoadingChatters ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              </button>
            )}
            {count > 0 && <button onClick={handleExport} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-blue-500" title="Exportar"><Download size={12} /></button>}
            {onImport && (
              <label className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-green-500 cursor-pointer">
                <Upload size={12} /><input type="file" accept=".txt,.csv" onChange={handleImportFile} className="hidden" />
              </label>
            )}
            {onClear && count > 0 && <button onClick={onClear} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-red-500" title="Limpiar"><Trash2 size={12} /></button>}
          </div>
        </div>
        <div className="p-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <UserX size={14} className="text-red-500" />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Excluidos</span>
            {excludedCount > 0 && <span className="text-[10px] bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">{excludedCount}</span>}
          </div>
          <div className="flex items-center gap-0.5">
            {excludedCount > 0 && <button onClick={handleExportExcluded} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-blue-500" title="Exportar excluidos"><Download size={12} /></button>}
            {onImportExcluded && (
              <label className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-green-500 cursor-pointer" title="Importar excluidos">
                <Upload size={12} /><input type="file" accept=".txt,.csv" onChange={handleImportExcludedFile} className="hidden" />
              </label>
            )}
            {onClearExcluded && excludedCount > 0 && <button onClick={onClearExcluded} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-red-500" title="Limpiar excluidos"><Trash2 size={12} /></button>}
          </div>
        </div>
      </div>

      {/* TWO COLUMNS WITH HORIZONTAL TAGS */}
      <div className="grid grid-cols-2">
        {/* LEFT: Participants */}
        <div className="p-2 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto" style={{ maxHeight }}>
          {filteredParticipants.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-4">{searchQuery ? 'Sin resultados' : emptyMessage}</p>
          ) : (
            <div className="flex flex-row flex-wrap gap-1 items-start content-start">
              {filteredParticipants.map((name: string, i: number) => {
                const isExcluded = excludedList.has(name.toLowerCase());
                const source = getSource(name);
                const colors = SOURCE_COLORS[source];
                return (
                  <span 
                    key={`p-${name}-${i}`} 
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs whitespace-nowrap group ${isExcluded ? 'bg-red-500/20 text-red-500 line-through' : `${colors.bg} ${colors.text}`}`}
                  >
                    {name}
                    {showActions && (
                      <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onMoveToExcluded && !isExcluded && <button onClick={() => onMoveToExcluded(name)} className="hover:text-orange-500" title="Mover a excluidos"><ArrowRight size={10} /></button>}
                        {onRemove && <button onClick={() => onRemove(name)} className="hover:text-red-500" title="Eliminar"><X size={10} /></button>}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Excluded */}
        <div className="p-2 overflow-y-auto" style={{ maxHeight }}>
          {filteredExcluded.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-4">{searchQuery ? 'Sin resultados' : 'Sin excluidos'}</p>
          ) : (
            <div className="flex flex-row flex-wrap gap-1 items-start content-start">
              {filteredExcluded.map((name: string, i: number) => (
                <span 
                  key={`e-${name}-${i}`} 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs whitespace-nowrap bg-red-500/20 text-red-600 dark:text-red-400 group"
                >
                  {name}
                  {showActions && (
                    <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onMoveToParticipants && <button onClick={() => onMoveToParticipants(name)} className="hover:text-green-500" title="Mover a participantes"><ArrowLeft size={10} /></button>}
                      {onRemoveExcluded && <button onClick={() => onRemoveExcluded(name)} className="hover:text-red-500" title="Eliminar"><X size={10} /></button>}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;
