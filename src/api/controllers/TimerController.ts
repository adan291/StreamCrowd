// Timer Controller - Endpoints para gestión de timers
import {
  APIResponse,
  TimerResponse,
  CreateTimerRequest,
  PaginatedResponse,
  PaginationParams,
  APIException,
  RequestContext
} from '../../../types/api';
import { validateOrThrow, COMMON_SCHEMAS } from '../middleware/validation';

interface StoredTimer {
  id: string;
  name: string;
  duration: number;
  remaining: number;
  isRunning: boolean;
  isPaused: boolean;
  createdAt: number;
  startedAt?: number;
  intervalId?: NodeJS.Timeout;
}

const timers: Map<string, StoredTimer> = new Map();

export class TimerController {
  async list(params: PaginationParams, _context: RequestContext): Promise<PaginatedResponse<TimerResponse>> {
    const { page = 1, perPage = 20, sortOrder = 'desc' } = params;
    let list = Array.from(timers.values());
    list.sort((a, b) => sortOrder === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);
    
    const total = list.length;
    const start = (page - 1) * perPage;
    const paginated = list.slice(start, start + perPage);

    return {
      success: true,
      data: paginated.map(this.toResponse),
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) }
    };
  }

  async get(id: string, _context: RequestContext): Promise<APIResponse<TimerResponse>> {
    const timer = timers.get(id);
    if (!timer) throw APIException.notFound('Timer');
    return { success: true, data: this.toResponse(timer) };
  }

  async create(body: CreateTimerRequest, _context: RequestContext): Promise<APIResponse<TimerResponse>> {
    const validated = validateOrThrow(body, COMMON_SCHEMAS.createTimer);
    const id = `timer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const timer: StoredTimer = {
      id,
      name: validated.name,
      duration: validated.duration,
      remaining: validated.duration,
      isRunning: false,
      isPaused: false,
      createdAt: Date.now()
    };

    timers.set(id, timer);

    if (validated.autoStart) {
      this.startTimer(timer);
    }

    return { success: true, data: this.toResponse(timer) };
  }

  async start(id: string, _context: RequestContext): Promise<APIResponse<TimerResponse>> {
    const timer = timers.get(id);
    if (!timer) throw APIException.notFound('Timer');
    if (timer.isRunning) throw APIException.conflict('Timer is already running');

    this.startTimer(timer);
    return { success: true, data: this.toResponse(timer) };
  }

  async pause(id: string, _context: RequestContext): Promise<APIResponse<TimerResponse>> {
    const timer = timers.get(id);
    if (!timer) throw APIException.notFound('Timer');
    if (!timer.isRunning) throw APIException.conflict('Timer is not running');

    this.pauseTimer(timer);
    return { success: true, data: this.toResponse(timer) };
  }

  async reset(id: string, _context: RequestContext): Promise<APIResponse<TimerResponse>> {
    const timer = timers.get(id);
    if (!timer) throw APIException.notFound('Timer');

    this.resetTimer(timer);
    return { success: true, data: this.toResponse(timer) };
  }

  async delete(id: string, _context: RequestContext): Promise<APIResponse<{ deleted: boolean }>> {
    const timer = timers.get(id);
    if (!timer) throw APIException.notFound('Timer');

    if (timer.intervalId) {
      clearInterval(timer.intervalId);
    }
    timers.delete(id);

    return { success: true, data: { deleted: true } };
  }

  private startTimer(timer: StoredTimer): void {
    timer.isRunning = true;
    timer.isPaused = false;
    timer.startedAt = Date.now();

    timer.intervalId = setInterval(() => {
      if (timer.remaining > 0) {
        timer.remaining--;
        this.emitEvent('timer:tick', {
          timerId: timer.id,
          remaining: timer.remaining,
          percentage: (timer.remaining / timer.duration) * 100
        });
      } else {
        this.stopTimer(timer);
        this.emitEvent('timer:completed', this.toResponse(timer));
      }
    }, 1000);
  }

  private pauseTimer(timer: StoredTimer): void {
    if (timer.intervalId) {
      clearInterval(timer.intervalId);
      timer.intervalId = undefined;
    }
    timer.isRunning = false;
    timer.isPaused = true;
  }

  private stopTimer(timer: StoredTimer): void {
    if (timer.intervalId) {
      clearInterval(timer.intervalId);
      timer.intervalId = undefined;
    }
    timer.isRunning = false;
    timer.isPaused = false;
  }

  private resetTimer(timer: StoredTimer): void {
    this.stopTimer(timer);
    timer.remaining = timer.duration;
    timer.startedAt = undefined;
  }

  private toResponse(t: StoredTimer): TimerResponse {
    return {
      id: t.id,
      name: t.name,
      duration: t.duration,
      remaining: t.remaining,
      isRunning: t.isRunning,
      isPaused: t.isPaused,
      createdAt: t.createdAt,
      startedAt: t.startedAt
    };
  }

  private emitEvent(type: string, data: any): void {
    console.log(`[API Event] ${type}:`, data);
  }

  clearAll(): void {
    for (const timer of timers.values()) {
      if (timer.intervalId) clearInterval(timer.intervalId);
    }
    timers.clear();
  }
}

let instance: TimerController | null = null;
export function getTimerController(): TimerController {
  if (!instance) instance = new TimerController();
  return instance;
}
