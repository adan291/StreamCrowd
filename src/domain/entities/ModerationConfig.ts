/**
 * ModerationConfig Entity - Configuración y resultados de moderación de votos
 * 
 * Esta entidad modela la configuración de moderación, los resultados
 * de validación y las estadísticas de moderación.
 */

/**
 * Razones de rechazo de un voto
 */
export type RejectionReason =
  | 'ACCOUNT_TOO_YOUNG'
  | 'COOLDOWN_ACTIVE'
  | 'VOTE_CHANGE_DISABLED'
  | 'INVALID_OPTION'
  | 'NOT_WHITELISTED'
  | 'BLACKLISTED';

/**
 * Configuración de pesos de votos según tipo de usuario
 */
export interface VoteWeights {
  /** Peso para suscriptores */
  subscriber: number;
  /** Peso para seguidores */
  follower: number;
  /** Peso para usuarios regulares */
  regular: number;
}

/**
 * Configuración de lista de usuarios (whitelist/blacklist)
 */
export interface UserListConfig {
  /** Si la lista está habilitada */
  enabled: boolean;
  /** Lista de nombres de usuario */
  usernames: string[];
}

/**
 * Configuración completa de moderación
 */
export interface ModerationConfig {
  /** Edad mínima de cuenta en días */
  minAccountAgeDays: number;
  /** Si se permite cambiar el voto */
  voteChangeEnabled: boolean;
  /** Cooldown entre cambios de voto en segundos */
  voteChangeCooldownSeconds: number;
  /** Pesos de votos según tipo de usuario */
  weights: VoteWeights;
  /** Configuración de whitelist */
  whitelist: UserListConfig;
  /** Configuración de blacklist */
  blacklist: UserListConfig;
}

/**
 * Resultado de la validación de un voto
 */
export interface ModerationResult {
  /** Si el voto es válido */
  isValid: boolean;
  /** Razón de rechazo (si aplica) */
  rejectionReason?: RejectionReason;
  /** Peso calculado del voto */
  weight: number;
  /** Si es un cambio de voto */
  isVoteChange?: boolean;
  /** ID de la opción anterior (si es cambio de voto) */
  previousOptionId?: number;
  /** Peso anterior (si es cambio de voto) */
  previousWeight?: number;
}

/**
 * Estadísticas de moderación
 */
export interface ModerationStats {
  /** Total de intentos de voto */
  totalAttempts: number;
  /** Votos aceptados */
  acceptedVotes: number;
  /** Votos rechazados por razón */
  rejectedByReason: Record<RejectionReason, number>;
  /** Tasa de aceptación (0-100) */
  acceptanceRate: number;
}

/**
 * Configuración por defecto de moderación
 */
export const DEFAULT_MODERATION_CONFIG: ModerationConfig = {
  minAccountAgeDays: 0,
  voteChangeEnabled: true,
  voteChangeCooldownSeconds: 30,
  weights: {
    subscriber: 1,
    follower: 1,
    regular: 1,
  },
  whitelist: { enabled: false, usernames: [] },
  blacklist: { enabled: false, usernames: [] },
};

/**
 * Estadísticas por defecto de moderación
 */
export const DEFAULT_MODERATION_STATS: ModerationStats = {
  totalAttempts: 0,
  acceptedVotes: 0,
  rejectedByReason: {
    ACCOUNT_TOO_YOUNG: 0,
    COOLDOWN_ACTIVE: 0,
    VOTE_CHANGE_DISABLED: 0,
    INVALID_OPTION: 0,
    NOT_WHITELISTED: 0,
    BLACKLISTED: 0,
  },
  acceptanceRate: 0,
};
