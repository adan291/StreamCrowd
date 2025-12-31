// Giveaway Controller - Endpoints para gestión de sorteos
import {
  APIResponse,
  GiveawayResponse,
  CreateGiveawayRequest,
  ParticipantResponse,
  PaginatedResponse,
  PaginationParams,
  APIException,
  RequestContext
} from '../../../types/api';
import { validateOrThrow, COMMON_SCHEMAS } from '../middleware/validation';

interface StoredGiveaway {
  id: string;
  name: string;
  keyword?: string;
  mode: 'viewers' | 'keyword' | 'subs';
  participants: Map<string, { username: string; joinedAt: number; entries: number }>;
  isActive: boolean;
  winner?: string;
  createdAt: number;
}

const giveaways: Map<string, StoredGiveaway> = new Map();

export class GiveawayController {
  async list(params: PaginationParams, _context: RequestContext): Promise<PaginatedResponse<GiveawayResponse>> {
    const { page = 1, perPage = 20, sortOrder = 'desc' } = params;
    let list = Array.from(giveaways.values());
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

  async get(id: string, _context: RequestContext): Promise<APIResponse<GiveawayResponse>> {
    const giveaway = giveaways.get(id);
    if (!giveaway) throw APIException.notFound('Giveaway');
    return { success: true, data: this.toResponse(giveaway) };
  }

  async create(body: CreateGiveawayRequest, _context: RequestContext): Promise<APIResponse<GiveawayResponse>> {
    const validated = validateOrThrow(body, COMMON_SCHEMAS.createGiveaway);
    const id = `giveaway_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const giveaway: StoredGiveaway = {
      id,
      name: validated.name,
      keyword: validated.keyword,
      mode: validated.mode,
      participants: new Map(),
      isActive: false,
      createdAt: Date.now()
    };

    giveaways.set(id, giveaway);
    return { success: true, data: this.toResponse(giveaway) };
  }

  async start(id: string, _context: RequestContext): Promise<APIResponse<GiveawayResponse>> {
    const giveaway = giveaways.get(id);
    if (!giveaway) throw APIException.notFound('Giveaway');
    if (giveaway.isActive) throw APIException.conflict('Giveaway is already active');

    giveaway.isActive = true;
    giveaway.winner = undefined;
    return { success: true, data: this.toResponse(giveaway) };
  }

  async draw(id: string, _context: RequestContext): Promise<APIResponse<GiveawayResponse & { winner: string }>> {
    const giveaway = giveaways.get(id);
    if (!giveaway) throw APIException.notFound('Giveaway');
    if (!giveaway.isActive) throw APIException.conflict('Giveaway is not active');
    if (giveaway.participants.size === 0) throw APIException.conflict('No participants');

    // Select random winner
    const participants = Array.from(giveaway.participants.values());
    const totalEntries = participants.reduce((sum, p) => sum + p.entries, 0);
    let random = Math.floor(Math.random() * totalEntries);
    
    let winner = participants[0].username;
    for (const p of participants) {
      random -= p.entries;
      if (random < 0) {
        winner = p.username;
        break;
      }
    }

    giveaway.winner = winner;
    giveaway.isActive = false;

    return { success: true, data: { ...this.toResponse(giveaway), winner } };
  }

  async getParticipants(id: string, params: PaginationParams, _context: RequestContext): Promise<PaginatedResponse<ParticipantResponse>> {
    const giveaway = giveaways.get(id);
    if (!giveaway) throw APIException.notFound('Giveaway');

    const { page = 1, perPage = 50 } = params;
    const list = Array.from(giveaway.participants.values());
    const total = list.length;
    const start = (page - 1) * perPage;
    const paginated = list.slice(start, start + perPage);

    return {
      success: true,
      data: paginated,
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) }
    };
  }

  async addParticipant(id: string, username: string, entries: number = 1): Promise<void> {
    const giveaway = giveaways.get(id);
    if (!giveaway || !giveaway.isActive) return;

    const existing = giveaway.participants.get(username);
    if (existing) {
      existing.entries += entries;
    } else {
      giveaway.participants.set(username, { username, joinedAt: Date.now(), entries });
    }
  }

  private toResponse(g: StoredGiveaway): GiveawayResponse {
    return {
      id: g.id,
      name: g.name,
      keyword: g.keyword,
      mode: g.mode,
      participantCount: g.participants.size,
      isActive: g.isActive,
      winner: g.winner,
      createdAt: g.createdAt
    };
  }

  clearAll(): void { giveaways.clear(); }
}

let instance: GiveawayController | null = null;
export function getGiveawayController(): GiveawayController {
  if (!instance) instance = new GiveawayController();
  return instance;
}
