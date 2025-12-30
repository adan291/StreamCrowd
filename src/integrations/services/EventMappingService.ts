import type {
  EventMapping,
  EventFilters,
  MappedAction,
  IntegrationEvent,
  IntegrationProvider,
  IntegrationEventType,
} from '../../../types/integrations';

const STORAGE_KEY = 'integration:mappings';

export class EventMappingService {
  private mappings: EventMapping[] = [];
  private actionExecutors: Map<MappedAction['type'], (action: MappedAction, event: IntegrationEvent) => Promise<void>> = new Map();

  constructor() {
    this.loadMappings();
  }

  // ============================================
  // CRUD Operations
  // ============================================

  createMapping(
    name: string,
    provider: IntegrationProvider,
    eventType: IntegrationEventType,
    action: MappedAction,
    filters: EventFilters = {}
  ): EventMapping {
    const mapping: EventMapping = {
      id: crypto.randomUUID(),
      name,
      provider,
      eventType,
      filters,
      action,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.mappings.push(mapping);
    this.saveMappings();
    return mapping;
  }

  getMapping(id: string): EventMapping | undefined {
    return this.mappings.find(m => m.id === id);
  }

  getMappings(): EventMapping[] {
    return [...this.mappings];
  }

  getMappingsByProvider(provider: IntegrationProvider): EventMapping[] {
    return this.mappings.filter(m => m.provider === provider);
  }

  getMappingsByEventType(eventType: IntegrationEventType): EventMapping[] {
    return this.mappings.filter(m => m.eventType === eventType);
  }

  getEnabledMappings(): EventMapping[] {
    return this.mappings.filter(m => m.enabled);
  }

  updateMapping(id: string, updates: Partial<Omit<EventMapping, 'id' | 'createdAt'>>): EventMapping | null {
    const index = this.mappings.findIndex(m => m.id === id);
    if (index === -1) return null;

    this.mappings[index] = {
      ...this.mappings[index],
      ...updates,
      updatedAt: new Date(),
    };

    this.saveMappings();
    return this.mappings[index];
  }

  deleteMapping(id: string): boolean {
    const index = this.mappings.findIndex(m => m.id === id);
    if (index === -1) return false;

    this.mappings.splice(index, 1);
    this.saveMappings();
    return true;
  }

  toggleMapping(id: string): boolean {
    const mapping = this.mappings.find(m => m.id === id);
    if (!mapping) return false;

    mapping.enabled = !mapping.enabled;
    mapping.updatedAt = new Date();
    this.saveMappings();
    return mapping.enabled;
  }

  clearMappings(): void {
    this.mappings = [];
    this.saveMappings();
  }

  // ============================================
  // Event Matching
  // ============================================

  findMatchingMappings(event: IntegrationEvent): EventMapping[] {
    return this.getEnabledMappings().filter(mapping => {
      // Check provider and event type
      if (mapping.provider !== event.provider) return false;
      if (mapping.eventType !== event.type) return false;

      // Check filters
      return this.matchesFilters(event, mapping.filters);
    });
  }

  private matchesFilters(event: IntegrationEvent, filters: EventFilters): boolean {
    const { data } = event;

    // Amount filters
    if (filters.minAmount !== undefined && (data.amount || 0) < filters.minAmount) {
      return false;
    }
    if (filters.maxAmount !== undefined && (data.amount || 0) > filters.maxAmount) {
      return false;
    }

    // Username filters
    if (filters.usernames?.length) {
      const usernames = filters.usernames.map(u => u.toLowerCase());
      if (!usernames.includes(data.username.toLowerCase())) {
        return false;
      }
    }

    if (filters.excludeUsernames?.length) {
      const excluded = filters.excludeUsernames.map(u => u.toLowerCase());
      if (excluded.includes(data.username.toLowerCase())) {
        return false;
      }
    }

    // Keyword filters
    if (filters.keywords?.length) {
      const message = data.message?.toLowerCase() || '';
      const hasKeyword = filters.keywords.some(k => message.includes(k.toLowerCase()));
      if (!hasKeyword) {
        return false;
      }
    }

    // Tier filter
    if (filters.tierFilter?.length && data.tier) {
      if (!filters.tierFilter.includes(data.tier)) {
        return false;
      }
    }

    // Min months filter
    if (filters.minMonths !== undefined && (data.months || 0) < filters.minMonths) {
      return false;
    }

    return true;
  }

  // ============================================
  // Action Execution
  // ============================================

  registerActionExecutor(
    type: MappedAction['type'],
    executor: (action: MappedAction, event: IntegrationEvent) => Promise<void>
  ): void {
    this.actionExecutors.set(type, executor);
  }

  async executeAction(mapping: EventMapping, event: IntegrationEvent): Promise<void> {
    const executor = this.actionExecutors.get(mapping.action.type);
    if (!executor) {
      console.warn(`No executor registered for action type: ${mapping.action.type}`);
      return;
    }

    try {
      await executor(mapping.action, event);
    } catch (error) {
      console.error(`Failed to execute action for mapping ${mapping.id}:`, error);
      throw error;
    }
  }

  async processEvent(event: IntegrationEvent): Promise<{ mapping: EventMapping; success: boolean; error?: string }[]> {
    const matchingMappings = this.findMatchingMappings(event);
    const results: { mapping: EventMapping; success: boolean; error?: string }[] = [];

    for (const mapping of matchingMappings) {
      try {
        await this.executeAction(mapping, event);
        results.push({ mapping, success: true });
      } catch (error) {
        results.push({ 
          mapping, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return results;
  }

  // ============================================
  // Persistence
  // ============================================

  private loadMappings(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.mappings = parsed.map((m: EventMapping) => ({
          ...m,
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
        }));
      }
    } catch {
      this.mappings = [];
    }
  }

  private saveMappings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.mappings));
    } catch (error) {
      console.error('Failed to save mappings:', error);
    }
  }

  // ============================================
  // Import/Export
  // ============================================

  exportMappings(): string {
    return JSON.stringify(this.mappings, null, 2);
  }

  importMappings(json: string, replace = false): number {
    try {
      const imported = JSON.parse(json) as EventMapping[];
      
      if (!Array.isArray(imported)) {
        throw new Error('Invalid format: expected array');
      }

      if (replace) {
        this.mappings = [];
      }

      let count = 0;
      for (const mapping of imported) {
        if (this.isValidMapping(mapping)) {
          this.mappings.push({
            ...mapping,
            id: crypto.randomUUID(), // Generate new ID
            createdAt: new Date(mapping.createdAt),
            updatedAt: new Date(),
          });
          count++;
        }
      }

      this.saveMappings();
      return count;
    } catch (error) {
      throw new Error(`Failed to import mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private isValidMapping(obj: unknown): obj is EventMapping {
    if (!obj || typeof obj !== 'object') return false;
    const m = obj as Record<string, unknown>;
    return (
      typeof m.name === 'string' &&
      typeof m.provider === 'string' &&
      typeof m.eventType === 'string' &&
      typeof m.action === 'object' &&
      m.action !== null
    );
  }
}
