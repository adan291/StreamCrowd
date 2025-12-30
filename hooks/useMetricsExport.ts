// useMetricsExport - Hook for exporting metrics data

import { useState, useCallback } from 'react';
import { SessionMetrics, ExportOptions } from '../types/metrics';
import { metricsExportService } from '../src/application/services/MetricsExportService';

interface UseMetricsExportReturn {
  isExporting: boolean;
  error: string | null;
  exportCSV: (sessions: SessionMetrics[], options?: ExportOptions) => void;
  exportPDF: (sessions: SessionMetrics[], options?: ExportOptions) => Promise<void>;
  getPreview: (sessions: SessionMetrics[], options?: ExportOptions) => string;
}

export function useMetricsExport(): UseMetricsExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Export to CSV
  const exportCSV = useCallback((sessions: SessionMetrics[], options?: ExportOptions) => {
    setIsExporting(true);
    setError(null);

    try {
      const blob = metricsExportService.exportCSV(sessions, options);
      const filename = metricsExportService.getFilename('csv', sessions);
      metricsExportService.downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error exporting CSV');
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Export to PDF
  const exportPDF = useCallback(async (sessions: SessionMetrics[], options?: ExportOptions) => {
    setIsExporting(true);
    setError(null);

    try {
      const blob = await metricsExportService.exportPDF(sessions, options);
      const filename = metricsExportService.getFilename('pdf', sessions);
      metricsExportService.downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error exporting PDF');
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Get preview of export data
  const getPreview = useCallback((sessions: SessionMetrics[], options?: ExportOptions): string => {
    try {
      const content = metricsExportService.generateCSVContent(sessions, options);
      // Return first 1000 characters as preview
      return content.substring(0, 1000) + (content.length > 1000 ? '\n...' : '');
    } catch {
      return 'Error generating preview';
    }
  }, []);

  return {
    isExporting,
    error,
    exportCSV,
    exportPDF,
    getPreview,
  };
}
