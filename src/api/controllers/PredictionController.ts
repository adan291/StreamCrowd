// Prediction Controller - Endpoints para gestión de predicciones
import {
  APIResponse,
  PredictionResponse,
  CreatePredictionRequest,
  ResolvePredictionRequest,
  PaginatedResponse,
  PaginationParams,
  APIException,
  RequestContext
} from '../../../types/api';
import { validateOrThrow, COMMON_SCHEMAS } from '../middleware/validation';

interface StoredPrediction {
  id: string;
  title: string;
  outcomes: Array<{ id: string; title: string; points: number; users: number }>;
  status: 'active' | 'locked' | 'resolved' | 'cancelled';
  winningOutcomeId?: string;
  createdAt: number;
  lockedAt?: number;
  resolvedAt?: number;
}

const predictions: Map<string, StoredPrediction> = new Map();

export class PredictionController {
  async list(params: PaginationParams, _context: RequestContext): Promise<PaginatedResponse<PredictionResponse>> {
    const { page = 1, perPage = 20, sortOrder = 'desc' } = params;
    let list = Array.from(predictions.values());
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

  async get(id: string, _context: RequestContext): Promise<APIResponse<PredictionResponse>> {
    const prediction = predictions.get(id);
    if (!prediction) throw APIException.notFound('Prediction');
    return { success: true, data: this.toResponse(prediction) };
  }

  async create(body: CreatePredictionRequest, _context: RequestContext): Promise<APIResponse<PredictionResponse>> {
    const validated = validateOrThrow(body, COMMON_SCHEMAS.createPrediction);
    const id = `pred_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const prediction: StoredPrediction = {
      id,
      title: validated.title,
      outcomes: validated.outcomes.map((o: any, i: number) => ({
        id: `outcome_${i}`,
        title: o.title,
        points: 0,
        users: 0
      })),
      status: 'active',
      createdAt: Date.now()
    };

    predictions.set(id, prediction);
    return { success: true, data: this.toResponse(prediction) };
  }

  async lock(id: string, _context: RequestContext): Promise<APIResponse<PredictionResponse>> {
    const prediction = predictions.get(id);
    if (!prediction) throw APIException.notFound('Prediction');
    if (prediction.status !== 'active') throw APIException.conflict('Prediction is not active');

    prediction.status = 'locked';
    prediction.lockedAt = Date.now();
    return { success: true, data: this.toResponse(prediction) };
  }

  async resolve(id: string, body: ResolvePredictionRequest, _context: RequestContext): Promise<APIResponse<PredictionResponse>> {
    const prediction = predictions.get(id);
    if (!prediction) throw APIException.notFound('Prediction');
    if (prediction.status !== 'locked') throw APIException.conflict('Prediction must be locked first');

    const outcome = prediction.outcomes.find(o => o.id === body.winningOutcomeId);
    if (!outcome) throw APIException.notFound('Outcome');

    prediction.status = 'resolved';
    prediction.winningOutcomeId = body.winningOutcomeId;
    prediction.resolvedAt = Date.now();
    return { success: true, data: this.toResponse(prediction) };
  }

  async cancel(id: string, _context: RequestContext): Promise<APIResponse<PredictionResponse>> {
    const prediction = predictions.get(id);
    if (!prediction) throw APIException.notFound('Prediction');
    if (prediction.status === 'resolved') throw APIException.conflict('Cannot cancel resolved prediction');

    prediction.status = 'cancelled';
    return { success: true, data: this.toResponse(prediction) };
  }

  private toResponse(p: StoredPrediction): PredictionResponse {
    return {
      id: p.id,
      title: p.title,
      outcomes: p.outcomes,
      status: p.status,
      winningOutcomeId: p.winningOutcomeId,
      createdAt: p.createdAt,
      lockedAt: p.lockedAt,
      resolvedAt: p.resolvedAt
    };
  }

  clearAll(): void { predictions.clear(); }
}

let instance: PredictionController | null = null;
export function getPredictionController(): PredictionController {
  if (!instance) instance = new PredictionController();
  return instance;
}
