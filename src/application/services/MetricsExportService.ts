// MetricsExportService - Export metrics to CSV and PDF

import {
  SessionMetrics,
  ExportOptions,
} from '../../../types/metrics';

export class MetricsExportService {
  /**
   * Generate CSV content as string
   */
  generateCSVContent(sessions: SessionMetrics[], options?: ExportOptions): string {
    const rows: string[][] = [];

    // Header row
    const headers = [
      'Session ID',
      'Start Time',
      'End Time',
      'Platform',
      'Channel',
      'Duration (min)',
      'Peak Viewers',
      'Avg Viewers',
      'Total Messages',
      'Unique Chatters',
      'Polls Created',
      'Poll Participation',
      'Predictions Created',
      'Prediction Participation',
      'New Followers',
      'New Subscribers',
    ];
    rows.push(headers);

    // Filter sessions by date range if specified
    let filteredSessions = sessions;
    if (options?.dateRange) {
      filteredSessions = sessions.filter(s => 
        s.startTime >= options.dateRange!.start &&
        s.startTime <= options.dateRange!.end
      );
    }

    // Data rows
    for (const session of filteredSessions) {
      const row = [
        session.id,
        new Date(session.startTime).toISOString(),
        session.endTime ? new Date(session.endTime).toISOString() : '',
        session.platform,
        session.channelName,
        Math.round(session.summary.duration / 60000).toString(),
        session.summary.peakViewers.toString(),
        session.summary.avgViewers.toString(),
        session.summary.totalMessages.toString(),
        session.summary.uniqueChatters.toString(),
        session.summary.pollsCreated.toString(),
        session.summary.pollParticipation.toString(),
        session.summary.predictionsCreated.toString(),
        session.summary.predictionParticipation.toString(),
        session.summary.newFollowers.toString(),
        session.summary.newSubscribers.toString(),
      ];
      rows.push(row);
    }

    // Add events if requested
    if (options?.includeEvents) {
      rows.push([]);
      rows.push(['Events']);
      rows.push(['Session ID', 'Event Type', 'Timestamp', 'Data']);

      for (const session of filteredSessions) {
        for (const event of session.events) {
          rows.push([
            session.id,
            event.type,
            new Date(event.timestamp).toISOString(),
            JSON.stringify(event.data),
          ]);
        }
      }
    }

    // Convert to CSV string
    return rows
      .map(row => row.map(cell => this.escapeCSV(cell)).join(','))
      .join('\n');
  }

  /**
   * Export sessions to CSV format as Blob
   */
  exportCSV(sessions: SessionMetrics[], options?: ExportOptions): Blob {
    const csvContent = this.generateCSVContent(sessions, options);
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Export sessions to PDF format
   */
  async exportPDF(sessions: SessionMetrics[], options?: ExportOptions): Promise<Blob> {
    // Filter sessions by date range if specified
    let filteredSessions = sessions;
    if (options?.dateRange) {
      filteredSessions = sessions.filter(s => 
        s.startTime >= options.dateRange!.start &&
        s.startTime <= options.dateRange!.end
      );
    }

    // Generate HTML content for PDF
    const html = this.generatePDFHTML(filteredSessions, options);

    // For now, return HTML as a blob (in production, use a PDF library)
    // This could be converted to PDF using html2pdf.js or similar
    return new Blob([html], { type: 'text/html;charset=utf-8;' });
  }

  /**
   * Generate HTML content for PDF export
   */
  generatePDFHTML(sessions: SessionMetrics[], options?: ExportOptions): string {
    // Filter sessions by date range if specified
    let filteredSessions = sessions;
    if (options?.dateRange) {
      filteredSessions = sessions.filter(s => 
        s.startTime >= options.dateRange!.start &&
        s.startTime <= options.dateRange!.end
      );
    }

    const totalViewers = filteredSessions.reduce((sum, s) => sum + s.summary.peakViewers, 0);
    const avgViewers = filteredSessions.length > 0 
      ? Math.round(totalViewers / filteredSessions.length) 
      : 0;
    const totalMessages = filteredSessions.reduce((sum, s) => sum + s.summary.totalMessages, 0);
    const totalFollowers = filteredSessions.reduce((sum, s) => sum + s.summary.newFollowers, 0);

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>TwitchVote Metrics Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #9146FF; }
    h2 { color: #333; border-bottom: 2px solid #9146FF; padding-bottom: 5px; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .stat-card { background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #9146FF; }
    .stat-label { font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #9146FF; color: white; }
    tr:hover { background: #f5f5f5; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>📊 TwitchVote Metrics Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <p>Sessions: ${sessions.length}</p>

  <h2>Summary</h2>
  <div class="summary">
    <div class="stat-card">
      <div class="stat-value">${avgViewers}</div>
      <div class="stat-label">Avg Peak Viewers</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalMessages.toLocaleString()}</div>
      <div class="stat-label">Total Messages</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalFollowers}</div>
      <div class="stat-label">New Followers</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${sessions.length}</div>
      <div class="stat-label">Sessions</div>
    </div>
  </div>

  <h2>Session Details</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Duration</th>
        <th>Peak Viewers</th>
        <th>Avg Viewers</th>
        <th>Messages</th>
        <th>Followers</th>
      </tr>
    </thead>
    <tbody>
`;

    for (const session of sessions) {
      const date = new Date(session.startTime).toLocaleDateString();
      const duration = Math.round(session.summary.duration / 60000);
      
      html += `
      <tr>
        <td>${date}</td>
        <td>${duration} min</td>
        <td>${session.summary.peakViewers}</td>
        <td>${session.summary.avgViewers}</td>
        <td>${session.summary.totalMessages}</td>
        <td>${session.summary.newFollowers}</td>
      </tr>
`;
    }

    html += `
    </tbody>
  </table>

  <div class="footer">
    <p>Generated by TwitchVote Live</p>
  </div>
</body>
</html>
`;

    return html;
  }

  /**
   * Escape CSV cell value
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Get export filename
   */
  getFilename(format: 'csv' | 'pdf', sessions: SessionMetrics[]): string {
    const date = new Date().toISOString().split('T')[0];
    const sessionCount = sessions.length;
    return `twitchvote_metrics_${date}_${sessionCount}sessions.${format}`;
  }

  /**
   * Trigger download of exported file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
export const metricsExportService = new MetricsExportService();
