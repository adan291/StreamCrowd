/**
 * PrizeService
 * Manages prize library and delivery tracking
 */

import type { Prize, PrizeAssignment, PrizeStatus } from '../types';

const PRIZES_KEY = 'giveaway_prizes';
const ASSIGNMENTS_KEY = 'giveaway_prize_assignments';

export class PrizeService {
  // ============================================
  // PRIZE LIBRARY
  // ============================================

  static getPrizes(): Prize[] {
    try {
      const data = localStorage.getItem(PRIZES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static savePrizes(prizes: Prize[]): void {
    localStorage.setItem(PRIZES_KEY, JSON.stringify(prizes));
  }

  static addPrize(prize: Omit<Prize, 'id' | 'createdAt' | 'status'>): Prize {
    const newPrize: Prize = {
      ...prize,
      id: Math.random().toString(36).substring(2, 9),
      status: 'available',
      createdAt: Date.now(),
    };
    const prizes = this.getPrizes();
    prizes.push(newPrize);
    this.savePrizes(prizes);
    return newPrize;
  }

  static updatePrize(id: string, updates: Partial<Prize>): void {
    const prizes = this.getPrizes();
    const index = prizes.findIndex(p => p.id === id);
    if (index !== -1) {
      prizes[index] = { ...prizes[index], ...updates };
      this.savePrizes(prizes);
    }
  }

  static deletePrize(id: string): void {
    const prizes = this.getPrizes().filter(p => p.id !== id);
    this.savePrizes(prizes);
  }

  static getPrizeById(id: string): Prize | undefined {
    return this.getPrizes().find(p => p.id === id);
  }

  static getAvailablePrizes(): Prize[] {
    return this.getPrizes().filter(p => p.status === 'available');
  }

  static getCategories(): string[] {
    const prizes = this.getPrizes();
    const categories = new Set(prizes.map(p => p.category).filter(Boolean));
    return Array.from(categories) as string[];
  }

  // ============================================
  // PRIZE ASSIGNMENTS
  // ============================================

  static getAssignments(): PrizeAssignment[] {
    try {
      const data = localStorage.getItem(ASSIGNMENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveAssignments(assignments: PrizeAssignment[]): void {
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  }

  static assignPrize(prizeId: string, giveawayId: string, winner: string): PrizeAssignment {
    const assignment: PrizeAssignment = {
      id: Math.random().toString(36).substring(2, 9),
      prizeId,
      giveawayId,
      winner,
      status: 'pending',
      assignedAt: Date.now(),
    };

    // Update prize status
    this.updatePrize(prizeId, { status: 'assigned' });

    // Save assignment
    const assignments = this.getAssignments();
    assignments.push(assignment);
    this.saveAssignments(assignments);

    return assignment;
  }

  static markDelivered(assignmentId: string): void {
    const assignments = this.getAssignments();
    const index = assignments.findIndex(a => a.id === assignmentId);
    if (index !== -1) {
      assignments[index].status = 'delivered';
      assignments[index].deliveredAt = Date.now();
      
      // Update prize status
      this.updatePrize(assignments[index].prizeId, { status: 'delivered' as PrizeStatus });
      
      this.saveAssignments(assignments);
    }
  }

  static cancelAssignment(assignmentId: string): void {
    const assignments = this.getAssignments();
    const index = assignments.findIndex(a => a.id === assignmentId);
    if (index !== -1) {
      assignments[index].status = 'cancelled';
      
      // Return prize to available
      this.updatePrize(assignments[index].prizeId, { status: 'available' });
      
      this.saveAssignments(assignments);
    }
  }

  static getPendingAssignments(): PrizeAssignment[] {
    return this.getAssignments().filter(a => a.status === 'pending');
  }

  static getAssignmentsByWinner(winner: string): PrizeAssignment[] {
    return this.getAssignments().filter(a => a.winner.toLowerCase() === winner.toLowerCase());
  }

  // ============================================
  // EXPORT
  // ============================================

  static exportPendingCSV(): string {
    const pending = this.getPendingAssignments();
    const prizes = this.getPrizes();
    
    const headers = ['Ganador', 'Premio', 'Fecha Asignación'];
    const rows = pending.map(a => {
      const prize = prizes.find(p => p.id === a.prizeId);
      return [
        a.winner,
        prize?.name || 'Premio eliminado',
        new Date(a.assignedAt).toLocaleString(),
      ];
    });

    return [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  }
}

export default PrizeService;
