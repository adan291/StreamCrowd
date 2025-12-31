// Poll Controller - Endpoints para gestión de encuestas
import {
  APIResponse,
  PollResponse,
  CreatePollRequest,
  UpdatePollRequest,
  PaginatedResponse,
  PaginationParams,
  APIException,
  RequestContext
} from '../../../types/api';
import { validateOrThrow, COMMON_SCHEMAS } from '../middleware/validation';

// In-memory storage for polls (in production, use a database)
interface StoredPoll {
  id: string;
  question: string;
  options: Array<{ id: number; label: string; votes: number; color: string }>;
  totalVotes: number;
  isActive: boolean;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
}

const polls: Map<string, StoredPoll> = new Map();
const POLL_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];

export class PollController {
  // ============================================
  // GET /polls - List all polls
  // ============================================
  async list(
    params: PaginationParams,
    _context: RequestContext
  ): Promise<PaginatedResponse<PollResponse>> {
    const { page = 1, perPage = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params;

    let pollList = Array.from(polls.values());

    // Sort
    pollList.sort((a, b) => {
      const aVal = a[sortBy as keyof StoredPoll] as any;
      const bVal = b[sortBy as keyof StoredPoll] as any;
      const order = sortOrder === 'asc' ? 1 : -1;
      return aVal > bVal ? order : -order;
    });

    // Paginate
    const total = pollList.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const paginatedPolls = pollList.slice(start, start + perPage);

    return {
      success: true,
      data: paginatedPolls.map(this.toPollResponse),
      meta: {
        page,
        perPage,
        total,
        totalPages,
        timestamp: Date.now()
      }
    };
  }

  // ============================================
  // GET /polls/:id - Get single poll
  // ============================================
  async get(id: string, _context: RequestContext): Promise<APIResponse<PollResponse>> {
    const poll = polls.get(id);
    if (!poll) {
      throw APIException.notFound('Poll');
    }

    return {
      success: true,
      data: this.toPollResponse(poll)
    };
  }

  // ============================================
  // POST /polls - Create new poll
  // ============================================
  async create(
    body: CreatePollRequest,
    _context: RequestContext
  ): Promise<APIResponse<PollResponse>> {
    const validated = validateOrThrow(body, COMMON_SCHEMAS.createPoll);

    const id = this.generateId();
    const poll: StoredPoll = {
      id,
      question: validated.question,
      options: validated.options.map((label: string, index: number) => ({
        id: index,
        label,
        votes: 0,
        color: POLL_COLORS[index % POLL_COLORS.length]
      })),
      totalVotes: 0,
      isActive: false,
      createdAt: Date.now()
    };

    polls.set(id, poll);

    return {
      success: true,
      data: this.toPollResponse(poll)
    };
  }

  // ============================================
  // PUT /polls/:id - Update poll
  // ============================================
  async update(
    id: string,
    body: UpdatePollRequest,
    _context: RequestContext
  ): Promise<APIResponse<PollResponse>> {
    const poll = polls.get(id);
    if (!poll) {
      throw APIException.notFound('Poll');
    }

    if (poll.isActive) {
      throw APIException.conflict('Cannot update an active poll');
    }

    if (body.question) {
      poll.question = body.question;
    }

    if (body.options) {
      poll.options = body.options.map((label, index) => ({
        id: index,
        label,
        votes: 0,
        color: POLL_COLORS[index % POLL_COLORS.length]
      }));
      poll.totalVotes = 0;
    }

    return {
      success: true,
      data: this.toPollResponse(poll)
    };
  }

  // ============================================
  // DELETE /polls/:id - Delete poll
  // ============================================
  async delete(id: string, _context: RequestContext): Promise<APIResponse<{ deleted: boolean }>> {
    const poll = polls.get(id);
    if (!poll) {
      throw APIException.notFound('Poll');
    }

    if (poll.isActive) {
      throw APIException.conflict('Cannot delete an active poll');
    }

    polls.delete(id);

    return {
      success: true,
      data: { deleted: true }
    };
  }

  // ============================================
  // POST /polls/:id/start - Start poll
  // ============================================
  async start(id: string, _context: RequestContext): Promise<APIResponse<PollResponse>> {
    const poll = polls.get(id);
    if (!poll) {
      throw APIException.notFound('Poll');
    }

    if (poll.isActive) {
      throw APIException.conflict('Poll is already active');
    }

    poll.isActive = true;
    poll.startedAt = Date.now();
    poll.endedAt = undefined;

    // Emit event for WebSocket subscribers
    this.emitEvent('poll:started', this.toPollResponse(poll));

    return {
      success: true,
      data: this.toPollResponse(poll)
    };
  }

  // ============================================
  // POST /polls/:id/stop - Stop poll
  // ============================================
  async stop(id: string, _context: RequestContext): Promise<APIResponse<PollResponse>> {
    const poll = polls.get(id);
    if (!poll) {
      throw APIException.notFound('Poll');
    }

    if (!poll.isActive) {
      throw APIException.conflict('Poll is not active');
    }

    poll.isActive = false;
    poll.endedAt = Date.now();

    // Emit event for WebSocket subscribers
    this.emitEvent('poll:stopped', this.toPollResponse(poll));

    return {
      success: true,
      data: this.toPollResponse(poll)
    };
  }

  // ============================================
  // GET /polls/:id/results - Get poll results
  // ============================================
  async getResults(id: string, _context: RequestContext): Promise<APIResponse<{
    poll: PollResponse;
    winner: { id: number; label: string; votes: number; percentage: number } | null;
    results: Array<{ id: number; label: string; votes: number; percentage: number }>;
  }>> {
    const poll = polls.get(id);
    if (!poll) {
      throw APIException.notFound('Poll');
    }

    const results = poll.options.map(opt => ({
      id: opt.id,
      label: opt.label,
      votes: opt.votes,
      percentage: poll.totalVotes > 0 ? (opt.votes / poll.totalVotes) * 100 : 0
    })).sort((a, b) => b.votes - a.votes);

    const winner = poll.totalVotes > 0 ? results[0] : null;

    return {
      success: true,
      data: {
        poll: this.toPollResponse(poll),
        winner,
        results
      }
    };
  }

  // ============================================
  // POST /polls/:id/vote - Cast a vote (internal use)
  // ============================================
  async vote(
    id: string,
    optionId: number,
    _context: RequestContext
  ): Promise<APIResponse<PollResponse>> {
    const poll = polls.get(id);
    if (!poll) {
      throw APIException.notFound('Poll');
    }

    if (!poll.isActive) {
      throw APIException.conflict('Poll is not active');
    }

    const option = poll.options.find(o => o.id === optionId);
    if (!option) {
      throw APIException.notFound('Option');
    }

    option.votes++;
    poll.totalVotes++;

    // Emit event for WebSocket subscribers
    this.emitEvent('poll:vote', {
      pollId: id,
      optionId,
      votes: option.votes,
      totalVotes: poll.totalVotes
    });

    return {
      success: true,
      data: this.toPollResponse(poll)
    };
  }

  // ============================================
  // Helpers
  // ============================================

  private toPollResponse(poll: StoredPoll): PollResponse {
    return {
      id: poll.id,
      question: poll.question,
      options: poll.options,
      totalVotes: poll.totalVotes,
      isActive: poll.isActive,
      createdAt: poll.createdAt,
      startedAt: poll.startedAt,
      endedAt: poll.endedAt
    };
  }

  private generateId(): string {
    return `poll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(type: string, data: any): void {
    // This would integrate with WebSocketService
    // For now, just log
    console.log(`[API Event] ${type}:`, data);
  }

  // ============================================
  // Testing Helpers
  // ============================================

  clearAll(): void {
    polls.clear();
  }

  getPollCount(): number {
    return polls.size;
  }
}

// Singleton instance
let instance: PollController | null = null;

export function getPollController(): PollController {
  if (!instance) {
    instance = new PollController();
  }
  return instance;
}
