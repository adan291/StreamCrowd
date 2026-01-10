/**
 * BotDetectionService
 * Detects and filters bot accounts
 */

import type { BotDetectionConfig } from '../types';

// Known bot accounts on Twitch
const KNOWN_BOTS = [
  'nightbot',
  'streamelements',
  'streamlabs',
  'moobot',
  'fossabot',
  'wizebot',
  'soundalerts',
  'streamholics',
  'stay_hydrated_bot',
  'anotherttvviewer',
  'commanderroot',
  'dinu',
  'electricallongboard',
  'lurxx',
  'virgoproz',
  'kaxips',
  'skinnyseahorse',
  'teyyd',
  'unixchat',
  'zanekyber',
  'logviewer',
  'streamstickers',
  'own3d',
  'lolrankbot',
  'blerp',
  'pokemoncommunitygame',
  'songlistbot',
  'botisimo',
  'pretzelrocks',
  'sery_bot',
  'restreambot',
];

const STORAGE_KEY = 'giveaway_bot_config';

export interface FilterResult {
  allowed: boolean;
  reason?: string;
}

export interface FilterStats {
  total: number;
  filtered: number;
  byReason: Record<string, number>;
}

export class BotDetectionService {
  private static config: BotDetectionConfig | null = null;
  private static filterStats: FilterStats = { total: 0, filtered: 0, byReason: {} };

  // ============================================
  // CONFIG
  // ============================================

  static getConfig(): BotDetectionConfig {
    if (!this.config) {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        this.config = data ? JSON.parse(data) : this.getDefaultConfig();
      } catch {
        this.config = this.getDefaultConfig();
      }
    }
    return this.config;
  }

  static saveConfig(config: BotDetectionConfig): void {
    this.config = config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  static getDefaultConfig(): BotDetectionConfig {
    return {
      enabled: false,
      filterKnownBots: true,
      minAccountAge: 0,
      requireVerifiedEmail: false,
      customBotList: [],
    };
  }

  // ============================================
  // FILTERING
  // ============================================

  static checkUser(
    username: string,
    accountCreatedAt?: number,
    isVerified?: boolean
  ): FilterResult {
    const config = this.getConfig();
    
    if (!config.enabled) {
      return { allowed: true };
    }

    const lowerUsername = username.toLowerCase();
    this.filterStats.total++;

    // Check known bots
    if (config.filterKnownBots && KNOWN_BOTS.includes(lowerUsername)) {
      this.recordFiltered('known_bot');
      return { allowed: false, reason: 'Bot conocido' };
    }

    // Check custom bot list
    if (config.customBotList.some(bot => bot.toLowerCase() === lowerUsername)) {
      this.recordFiltered('custom_bot');
      return { allowed: false, reason: 'En lista personalizada de bots' };
    }

    // Check account age
    if (config.minAccountAge > 0 && accountCreatedAt) {
      const ageInDays = (Date.now() - accountCreatedAt) / (1000 * 60 * 60 * 24);
      if (ageInDays < config.minAccountAge) {
        this.recordFiltered('account_age');
        return { 
          allowed: false, 
          reason: `Cuenta muy nueva (${Math.floor(ageInDays)} días < ${config.minAccountAge} días)` 
        };
      }
    }

    // Check verified email
    if (config.requireVerifiedEmail && isVerified === false) {
      this.recordFiltered('not_verified');
      return { allowed: false, reason: 'Email no verificado' };
    }

    return { allowed: true };
  }

  static filterParticipants(
    participants: Array<{ username: string; accountCreatedAt?: number; isVerified?: boolean }>
  ): { allowed: typeof participants; filtered: Array<typeof participants[0] & { reason: string }> } {
    const allowed: typeof participants = [];
    const filtered: Array<typeof participants[0] & { reason: string }> = [];

    participants.forEach(p => {
      const result = this.checkUser(p.username, p.accountCreatedAt, p.isVerified);
      if (result.allowed) {
        allowed.push(p);
      } else {
        filtered.push({ ...p, reason: result.reason || 'Filtrado' });
      }
    });

    return { allowed, filtered };
  }

  // ============================================
  // STATS
  // ============================================

  private static recordFiltered(reason: string): void {
    this.filterStats.filtered++;
    this.filterStats.byReason[reason] = (this.filterStats.byReason[reason] || 0) + 1;
  }

  static getStats(): FilterStats {
    return { ...this.filterStats };
  }

  static resetStats(): void {
    this.filterStats = { total: 0, filtered: 0, byReason: {} };
  }

  // ============================================
  // KNOWN BOTS
  // ============================================

  static getKnownBots(): string[] {
    return [...KNOWN_BOTS];
  }

  static isKnownBot(username: string): boolean {
    return KNOWN_BOTS.includes(username.toLowerCase());
  }

  // ============================================
  // CUSTOM BOT LIST
  // ============================================

  static addToCustomList(username: string): void {
    const config = this.getConfig();
    const lower = username.toLowerCase().trim();
    if (!config.customBotList.includes(lower)) {
      config.customBotList.push(lower);
      this.saveConfig(config);
    }
  }

  static removeFromCustomList(username: string): void {
    const config = this.getConfig();
    const lower = username.toLowerCase().trim();
    config.customBotList = config.customBotList.filter(b => b !== lower);
    this.saveConfig(config);
  }
}

export default BotDetectionService;
