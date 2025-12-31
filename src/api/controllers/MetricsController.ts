// Metrics Controller - Endpoints para métricas del stream
import {
  APIResponse,
  CurrentMetricsResponse,
  SessionMetricsResponse,
  PaginatedResponse,
  PaginationParams,
  APIException,
  RequestContext
} from '../../../types/api';

interface MetricsSnapshot {
  viewers: number;
  peakViewers: number;
  chatMessages: number;
  chatMessagesPerMinute: number;
  engagement: number;
  uptime: number;
  timestamp: number;
}

interface SessionData {
  id: string;
  startedAt: number;
  endedAt?: number;
  snapshots: MetricsSnapshot[];
}

// In-memory storage
let currentMetrics: MetricsSnapshot = {
  viewers: 0,
  peakViewers: 0,
  chatMessages: 0,
  chatMessagesPerMinute: 0,
  engagement: 0,
  uptime: 0,
  timestamp: Date.now()
};

const sessions: Map<string, SessionData> = new Map();
let currentSessionId: string | null = null;

export class MetricsController {
  async getCurrent(_context: RequestContext): Promise<APIResponse<CurrentMetricsResponse>> {
    return {
      success: true,
      data: { ...currentMetrics }
    };
  }

  async getSession(id: string, _context: RequestContext): Promise<APIResponse<SessionMetricsResponse>> {
    const session = sessions.get(id);
    if (!session) {
      throw APIException.notFound('Session');
    }

    const duration = (session.endedAt || Date.now()) - session.startedAt;
    const snapshots = session.snapshots;

    // Calculate aggregates
    const peakViewers = Math.max(...snapshots.map(s => s.viewers), 0);
    const averageViewers = snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.viewers, 0) / snapshots.length
      : 0;
    const totalChatMessages = snapshots.length > 0
      ? snapshots[snapshots.length - 1].chatMessages
      : 0;
    const averageEngagement = snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.engagement, 0) / snapshots.length
      : 0;

    return {
      success: true,
      data: {
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration,
        peakViewers,
        averageViewers,
        totalChatMessages,
        averageEngagement
      }
    };
  }

  async getHistory(params: PaginationParams, _context: RequestContext): Promise<PaginatedResponse<SessionMetricsResponse>> {
    const { page = 1, perPage = 20, sortOrder = 'desc' } = params;
    
    let list = Array.from(sessions.values());
    list.sort((a, b) => sortOrder === 'asc' ? a.startedAt - b.startedAt : b.startedAt - a.startedAt);

    const total = list.length;
    const start = (page - 1) * perPage;
    const paginated = list.slice(start, start + perPage);

    const data = paginated.map(session => {
      const duration = (session.endedAt || Date.now()) - session.startedAt;
      const snapshots = session.snapshots;
      const peakViewers = Math.max(...snapshots.map(s => s.viewers), 0);
      const averageViewers = snapshots.length > 0
        ? snapshots.reduce((sum, s) => sum + s.viewers, 0) / snapshots.length
        : 0;

      return {
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration,
        peakViewers,
        averageViewers,
        totalChatMessages: snapshots[snapshots.length - 1]?.chatMessages || 0,
        averageEngagement: snapshots.length > 0
          ? snapshots.reduce((sum, s) => sum + s.engagement, 0) / snapshots.length
          : 0
      };
    });

    return {
      success: true,
      data,
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) }
    };
  }

  // ============================================
  // Internal methods for updating metrics
  // ============================================

  updateMetrics(update: Partial<MetricsSnapshot>): void {
    currentMetrics = {
      ...currentMetrics,
      ...update,
      timestamp: Date.now()
    };

    if (update.viewers && update.viewers > currentMetrics.peakViewers) {
      currentMetrics.peakViewers = update.viewers;
    }

    // Record snapshot if session is active
    if (currentSessionId) {
      const session = sessions.get(currentSessionId);
      if (session) {
        session.snapshots.push({ ...currentMetrics });
      }
    }
  }

  startSession(): string {
    const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    sessions.set(id, {
      id,
      startedAt: Date.now(),
      snapshots: []
    });

    currentSessionId = id;
    currentMetrics = {
      viewers: 0,
      peakViewers: 0,
      chatMessages: 0,
      chatMessagesPerMinute: 0,
      engagement: 0,
      uptime: 0,
      timestamp: Date.now()
    };

    return id;
  }

  endSession(): void {
    if (currentSessionId) {
      const session = sessions.get(currentSessionId);
      if (session) {
        session.endedAt = Date.now();
      }
      currentSessionId = null;
    }
  }

  clearAll(): void {
    sessions.clear();
    currentSessionId = null;
    currentMetrics = {
      viewers: 0,
      peakViewers: 0,
      chatMessages: 0,
      chatMessagesPerMinute: 0,
      engagement: 0,
      uptime: 0,
      timestamp: Date.now()
    };
  }
}

let instance: MetricsController | null = null;
export function getMetricsController(): MetricsController {
  if (!instance) instance = new MetricsController();
  return instance;
}
