// ExportDialog - Export metrics data to CSV or PDF

import React, { useState, useMemo } from 'react';
import { useMetricsExport } from '../../hooks/useMetricsExport';
import { SessionMetrics, MetricType } from '../../types/metrics';

interface ExportDialogProps {
  sessions: SessionMetrics[];
  onClose: () => void;
}

const METRIC_OPTIONS: { value: MetricType; label: string }[] = [
  { value: 'viewers', label: 'Viewers' },
  { value: 'chat_messages', label: 'Mensajes de chat' },
  { value: 'poll_participation', label: 'Participación en polls' },
  { value: 'prediction_participation', label: 'Participación en predictions' },
  { value: 'followers', label: 'Nuevos followers' },
  { value: 'subscribers', label: 'Nuevos suscriptores' },
];

export const ExportDialog: React.FC<ExportDialogProps> = ({
  sessions,
  onClose,
}) => {
  const { isExporting, error, exportCSV, exportPDF, getPreview } = useMetricsExport();

  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [includeEvents, setIncludeEvents] = useState(true);
  const [includeInsights, setIncludeInsights] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>([
    'viewers',
    'chat_messages',
    'followers',
    'subscribers',
  ]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [showPreview, setShowPreview] = useState(false);

  // Filter sessions by date range
  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    if (dateRange.start) {
      const startTs = new Date(dateRange.start).getTime();
      filtered = filtered.filter(s => s.startTime >= startTs);
    }

    if (dateRange.end) {
      const endTs = new Date(dateRange.end).getTime() + 86400000; // Include end day
      filtered = filtered.filter(s => s.startTime <= endTs);
    }

    return filtered;
  }, [sessions, dateRange]);

  // Toggle metric selection
  const toggleMetric = (metric: MetricType) => {
    setSelectedMetrics(prev =>
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  // Handle export
  const handleExport = async () => {
    const options = {
      dateRange: dateRange.start || dateRange.end
        ? {
            start: dateRange.start ? new Date(dateRange.start).getTime() : 0,
            end: dateRange.end ? new Date(dateRange.end).getTime() + 86400000 : Date.now(),
          }
        : undefined,
      metrics: selectedMetrics,
      includeEvents,
      includeInsights,
      format,
    };

    if (format === 'csv') {
      exportCSV(filteredSessions, options);
    } else {
      await exportPDF(filteredSessions, options);
    }

    onClose();
  };

  // Get preview
  const preview = useMemo(() => {
    if (!showPreview) return '';
    return getPreview(filteredSessions, {
      includeEvents,
      metrics: selectedMetrics,
      format: 'csv',
    });
  }, [showPreview, filteredSessions, includeEvents, selectedMetrics, getPreview]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">📤 Exportar Métricas</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Format selection */}
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Formato
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('csv')}
                className={`flex-1 py-3 rounded-lg border-2 transition-colors ${
                  format === 'csv'
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="text-2xl mb-1">📊</div>
                <div className="font-semibold">CSV</div>
                <div className="text-xs text-gray-500">Datos tabulares</div>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`flex-1 py-3 rounded-lg border-2 transition-colors ${
                  format === 'pdf'
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="text-2xl mb-1">📄</div>
                <div className="font-semibold">PDF</div>
                <div className="text-xs text-gray-500">Reporte visual</div>
              </button>
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Rango de fechas (opcional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
          </div>

          {/* Metrics selection */}
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Métricas a incluir
            </label>
            <div className="grid grid-cols-2 gap-2">
              {METRIC_OPTIONS.map(option => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(option.value)}
                    onChange={() => toggleMetric(option.value)}
                    className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-gray-300 text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional options */}
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Opciones adicionales
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700">
                <input
                  type="checkbox"
                  checked={includeEvents}
                  onChange={(e) => setIncludeEvents(e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-gray-300 text-sm">Incluir eventos (polls, predictions, raids)</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700">
                <input
                  type="checkbox"
                  checked={includeInsights}
                  onChange={(e) => setIncludeInsights(e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-gray-300 text-sm">Incluir insights generados</span>
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-white font-semibold">
                  {filteredSessions.length} sesiones seleccionadas
                </div>
                <div className="text-gray-400 text-sm">
                  {selectedMetrics.length} métricas • {includeEvents ? 'Con eventos' : 'Sin eventos'}
                </div>
              </div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-purple-400 text-sm hover:text-purple-300"
              >
                {showPreview ? 'Ocultar preview' : 'Ver preview'}
              </button>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-xs mb-2">Preview (primeras líneas)</div>
              <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap font-mono">
                {preview}
              </pre>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 p-4 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || filteredSessions.length === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
          >
            {isExporting ? 'Exportando...' : `Exportar ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
