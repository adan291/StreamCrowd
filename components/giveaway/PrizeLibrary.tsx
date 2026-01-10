/**
 * PrizeLibrary Component
 * Manage prize library and delivery tracking
 */

import React, { useState, useMemo } from 'react';
import { 
  Gift, Plus, Trash2, Check, X, Search, Download, 
  Package, CheckCircle, Clock, Tag
} from 'lucide-react';
import { PrizeService } from './services/PrizeService';
import type { Prize, PrizeAssignment } from './types';

interface PrizeLibraryProps {
  onSelectPrize?: (prize: Prize) => void;
  selectionMode?: boolean;
  className?: string;
}

type TabType = 'library' | 'pending';

export const PrizeLibrary: React.FC<PrizeLibraryProps> = ({
  onSelectPrize,
  selectionMode = false,
  className = '',
}) => {
  const [tab, setTab] = useState<TabType>('library');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPrize, setNewPrize] = useState({ name: '', description: '', category: '', value: '' });
  const [refreshKey, setRefreshKey] = useState(0);

  const prizes = useMemo(() => PrizeService.getPrizes(), [refreshKey]);
  const pendingAssignments = useMemo(() => PrizeService.getPendingAssignments(), [refreshKey]);
  const categories = useMemo(() => PrizeService.getCategories(), [refreshKey]);

  const filteredPrizes = useMemo(() => {
    let result = prizes;
    if (selectionMode) {
      result = result.filter(p => p.status === 'available');
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(s) || 
        p.category?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [prizes, search, selectionMode]);

  const handleAddPrize = () => {
    if (!newPrize.name.trim()) return;
    
    PrizeService.addPrize({
      name: newPrize.name.trim(),
      description: newPrize.description.trim() || undefined,
      category: newPrize.category.trim() || undefined,
      value: newPrize.value ? parseFloat(newPrize.value) : undefined,
    });
    
    setNewPrize({ name: '', description: '', category: '', value: '' });
    setShowAddForm(false);
    setRefreshKey(k => k + 1);
  };

  const handleDeletePrize = (id: string) => {
    if (confirm('¿Eliminar este premio?')) {
      PrizeService.deletePrize(id);
      setRefreshKey(k => k + 1);
    }
  };

  const handleMarkDelivered = (assignmentId: string) => {
    PrizeService.markDelivered(assignmentId);
    setRefreshKey(k => k + 1);
  };

  const handleCancelAssignment = (assignmentId: string) => {
    if (confirm('¿Cancelar esta asignación? El premio volverá a estar disponible.')) {
      PrizeService.cancelAssignment(assignmentId);
      setRefreshKey(k => k + 1);
    }
  };

  const exportPending = () => {
    const csv = PrizeService.exportPendingCSV();
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `premios-pendientes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: Prize['status']) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'assigned': return 'bg-amber-500';
      case 'delivered': return 'bg-blue-500';
      case 'cancelled': return 'bg-zinc-400';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            {selectionMode ? 'Seleccionar Premio' : 'Biblioteca de Premios'}
          </h3>
        </div>
        {!selectionMode && (
          <div className="flex gap-1">
            <button
              onClick={() => setShowAddForm(true)}
              className="p-1.5 rounded-lg bg-purple-500 text-white hover:bg-purple-600"
            >
              <Plus size={16} />
            </button>
            {pendingAssignments.length > 0 && (
              <button
                onClick={exportPending}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                title="Exportar pendientes"
              >
                <Download size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      {!selectionMode && (
        <div className="flex gap-2">
          <button
            onClick={() => setTab('library')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg ${
              tab === 'library'
                ? 'bg-purple-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Package size={14} className="inline mr-1" />
            Biblioteca ({prizes.length})
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg ${
              tab === 'pending'
                ? 'bg-purple-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Clock size={14} className="inline mr-1" />
            Pendientes ({pendingAssignments.length})
          </button>
        </div>
      )}

      {/* Search */}
      {(tab === 'library' || selectionMode) && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar premio..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 border-none"
          />
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-2">
          <input
            type="text"
            value={newPrize.name}
            onChange={e => setNewPrize(p => ({ ...p, name: e.target.value }))}
            placeholder="Nombre del premio *"
            className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
          <input
            type="text"
            value={newPrize.description}
            onChange={e => setNewPrize(p => ({ ...p, description: e.target.value }))}
            placeholder="Descripción (opcional)"
            className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newPrize.category}
              onChange={e => setNewPrize(p => ({ ...p, category: e.target.value }))}
              placeholder="Categoría"
              list="categories"
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
            />
            <datalist id="categories">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
            <input
              type="text"
              inputMode="decimal"
              value={newPrize.value}
              onChange={e => setNewPrize(p => ({ ...p, value: e.target.value }))}
              placeholder="Valor €"
              className="w-24 px-3 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddPrize}
              disabled={!newPrize.name.trim()}
              className="flex-1 py-2 text-sm bg-purple-500 text-white rounded-lg disabled:opacity-50"
            >
              Añadir
            </button>
          </div>
        </div>
      )}

      {/* Library list */}
      {(tab === 'library' || selectionMode) && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {filteredPrizes.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">
              {search ? 'No se encontraron premios' : 'No hay premios en la biblioteca'}
            </p>
          ) : (
            filteredPrizes.map(prize => (
              <div
                key={prize.id}
                onClick={() => selectionMode && onSelectPrize?.(prize)}
                className={`p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl ${
                  selectionMode ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(prize.status)}`} />
                    <span className="font-medium text-sm">{prize.name}</span>
                    {prize.category && (
                      <span className="px-1.5 py-0.5 text-xs bg-zinc-200 dark:bg-zinc-700 rounded">
                        {prize.category}
                      </span>
                    )}
                  </div>
                  {!selectionMode && (
                    <button
                      onClick={() => handleDeletePrize(prize.id)}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {prize.description && (
                  <p className="text-xs text-zinc-500 mt-1">{prize.description}</p>
                )}
                {prize.value && (
                  <p className="text-xs text-green-600 mt-1">{prize.value}€</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Pending assignments */}
      {tab === 'pending' && !selectionMode && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {pendingAssignments.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">No hay premios pendientes de entrega</p>
          ) : (
            pendingAssignments.map(assignment => {
              const prize = prizes.find(p => p.id === assignment.prizeId);
              return (
                <div key={assignment.id} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{prize?.name || 'Premio eliminado'}</p>
                      <p className="text-xs text-zinc-500">
                        Ganador: <span className="text-amber-600">{assignment.winner}</span>
                      </p>
                      <p className="text-xs text-zinc-400">
                        {new Date(assignment.assignedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMarkDelivered(assignment.id)}
                        className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        title="Marcar como entregado"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => handleCancelAssignment(assignment.id)}
                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        title="Cancelar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default PrizeLibrary;
