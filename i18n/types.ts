/**
 * Centralized TypeScript types for the i18n system
 * 
 * This file contains all type definitions for translations across all domains.
 * It provides strict typing with autocomplete support for translation keys.
 * 
 * @see REQ-5.1: Tipos TypeScript estrictos con autocompletado de claves
 * @see REQ-2.2: Tipos TypeScript unificados para todas las traducciones
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Supported locales in the application
 */
export type Locale = 'es' | 'en';

/**
 * Default locale used as fallback
 */
export const DEFAULT_LOCALE: Locale = 'es';

// ============================================================================
// Domain Interfaces - Core (loaded at startup)
// ============================================================================

/**
 * Common translations used across the entire application
 * These are loaded at startup and always available
 */
export interface CommonTranslations {
  loading: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  close: string;
  confirm: string;
  search: string;
  settings: string;
  theme: string;
  language: string;
  exit: string;
  // Chat translations (moved from misc for core component usage)
  chat: {
    liveChat: string;
    waitingMessages: string;
    newMessages: string;
    alreadyRegistered: string;
    votedFor: string;
  };
}

/**
 * Error message translations
 * Loaded at startup for error handling
 */
export interface ErrorTranslations {
  // General error messages
  componentError: string;
  componentErrorDescription: string;
  retry: string;
  details: string;
  copy: string;
  unknown: string;
  // Error type messages
  types: {
    validation: string;
    validationDescription: string;
    authentication: string;
    authenticationDescription: string;
    network: string;
    networkDescription: string;
    unexpected: string;
    unexpectedDescription: string;
  };
  // Error codes
  codes: {
    VALIDATION_ERROR: string;
    AUTH_ERROR: string;
    NETWORK_ERROR: string;
    UNEXPECTED_ERROR: string;
  };
  // Feature-specific errors
  features: {
    poll: string;
    pollDescription: string;
    pollClearData: string;
    giveaway: string;
    giveawayDescription: string;
    giveawayPreserveParticipants: string;
    giveawayParticipantsCount: string;
    giveawayParticipantsSingular: string;
    game: string;
    gameDescription: string;
    gameBackToSelector: string;
    gameResetState: string;
    overlay: string;
    overlayDescription: string;
  };
  // Recovery messages
  recovery: {
    tryAgain: string;
    contactSupport: string;
    refreshPage: string;
    checkConnection: string;
    loginAgain: string;
  };
  // Retry messages
  retrying: {
    attempt: string;
    maxAttemptsReached: string;
    retryingIn: string;
  };
  // Network specific
  network: {
    connectionLost: string;
    timeout: string;
    serverError: string;
    notFound: string;
    unauthorized: string;
    forbidden: string;
    rateLimited: string;
  };
  // Validation specific
  validation: {
    required: string;
    invalidFormat: string;
    tooShort: string;
    tooLong: string;
    invalidValue: string;
  };
  // No stack trace message
  noStackTrace: string;
}

/**
 * Navigation and menu translations
 * Loaded at startup for app navigation
 */
export interface NavigationTranslations {
  panel: string;
  poll: string;
  pollDescription: string;
  judge: string;
  judgeDescription: string;
  giveaway: string;
  giveawayDescription: string;
  countdown: string;
  countdownDescription: string;
  spinner: string;
  spinnerDescription: string;
  dynamics: string;
  dynamicsSelector: string;
  dynamicsDescription: string;
  availableActivities: string;
  backToSelector: string;
  gallery: string;
  data: string;
  history: string;
  activity: string;
  analytics: string;
  chat: string;
  stream: string;
  notConnected: string;
  connectToChannel: string;
  invalidChannel: string;
  invalidChannelName: string;
  twitchStream: string;
  loadStream: string;
  openInTwitch: string;
  copyLink: string;
  closeStream: string;
  sounds: string;
  games: string;
  platforms: string;
  platformsSelector: string;
  platformsDescription: string;
  availablePlatforms: string;
}

// ============================================================================
// Domain Interfaces - Features (lazy loaded)
// ============================================================================

/**
 * Poll/voting translations
 */
export interface PollTranslations {
  title: string;
  liveTitle: string;
  createTitle: string;
  question: string;
  questionPlaceholder: string;
  options: string;
  optionPlaceholder: string;
  addOption: string;
  removeOption: string;
  create: string;
  stop: string;
  reset: string;
  active: string;
  ended: string;
  totalVotes: string;
  votes: string;
  votesLabel: string;
  winner: string;
  viewDetails: string;
  ofTotal: string;
  noVotes: string;
  waitingPoll: string;
  createPollHint: string;
  duration: string;
  maxVotes: string;
  unlimited: string;
  seconds: string;
  minutes: string;
  timeRemaining: string;
  voteWith: string;
  openOverlay: string;
  copyOverlayUrl: string;
  urlCopied: string;
  confirm: string;
  confirmHint: string;
  preview: string;
  save: string;
  saveTemplate: string;
  apply: string;
  cancel: string;
  goal: string;
  goalTooltip: string;
  writeQuestion: string;
  minOptions: string;
  storageFull: string;
  templateSaved: string;
  replaceOptions: string;
  noPollActive: string;
  createInPanel: string;
  shareVotes: string;
  obsOverlay: string;
  obsHint: string;
  quick: string;
  yesNo: string;
  sectionTitle: string;
  sectionTitleTooltip: string;
  questionLabel: string;
  questionTooltip: string;
  questionPlaceholderFull: string;
  responseOptions: string;
  addOptionBtn: string;
  timeSec: string;
  barColor: string;
  limitColor: string;
  votePrefix: string;
  votePrefixTooltip: string;
  voteKeyTooltip: string;
  matchMode: string;
  matchModeTooltip: string;
  matchExact: string;
  matchPartial: string;
  startPoll: string;
  clearForm: string;
  templates: string;
  myTemplates: string;
  favorites: string;
  uploadImage: string;
  galleryBtn: string;
  presetApplied: string;
  templateLoaded: string;
  invalidImageType: string;
  imageTooLarge: string;
  fileReadError: string;
  iconSavedToGallery: string;
  imageProcessError: string;
  imageDamaged: string;
  needTwoOptions: string;
  completeAllFields: string;
  allOptionsNeedLabel: string;
  option: string;
  noOptionsToImport: string;
  optionsImported: string;
  quickPollCreated: string;
  spinnerWheel: string;
  randomWinnerTooltip: string;
  raffle: string;
}

/**
 * Games translations
 */
export interface GamesTranslations {
  title: string;
  subtitle: string;
  piumBall: string;
  piumDesc: string;
  casinoRoulette: string;
  rouletteDesc: string;
  active: string;
  paused: string;
  balls: string;
  bets: string;
  openOverlay: string;
  clearBalls: string;
  spin: string;
  spinning: string;
  reset: string;
  autoSpin: string;
  bettingOpen: string;
  bettingClosed: string;
  winners: string;
  waitingBets: string;
  waitingPium: string;
  // New games
  chatFishing: string;
  fishingDesc: string;
  hotPotato: string;
  potatoDesc: string;
  triviaBattle: string;
  triviaDesc: string;
  fish: string;
  fishing: string;
  cast: string;
  catch: string;
  points: string;
  round: string;
  join: string;
  pass: string;
  eliminated: string;
  waiting: string;
  question: string;
  answer: string;
  correct: string;
  wrong: string;
  streak: string;
  leaderboard: string;
  startGame: string;
  nextRound: string;
  finalResults: string;
  // Battleship & Duck Hunt
  battleship: string;
  battleshipDesc: string;
  duckHunt: string;
  duckHuntDesc: string;
  ships: string;
  shipsRemaining: string;
  hit: string;
  miss: string;
  sunk: string;
  allShipsSunk: string;
  shots: string;
  ducks: string;
  shoot: string;
  accuracy: string;
}

/**
 * Giveaway/raffle translations
 */
export interface GiveawayTranslations {
  title: string;
  subtitle: string;
  openOverlay: string;
  viewers: string;
  keyword: string;
  subsOnly: string;
  keywordLabel: string;
  keywordPlaceholder: string;
  timeLimit: string;
  availableParticipants: string;
  subsInChat: string;
  usersInChat: string;
  time: string;
  participants: string;
  winner: string;
  selectWinner: string;
  selecting: string;
  chooseWinner: string;
  startCollection: string;
  finishAndChoose: string;
  newRaffle: string;
  resetRaffle: string;
  clearAll: string;
  clearAllHint: string;
  viewersHint: string;
  keywordHint: string;
  waitingRaffle: string;
  // Tooltips
  subsOnlyTooltip: string;
  useTimerTooltip: string;
  keywordTooltip: string;
  timeLimitTooltip: string;
  // Error messages
  errors: {
    noValidParticipants: string;
    userAlreadyParticipating: string;
    userAlreadyInChat: string;
    usersAddedToBlacklist: string;
    participantsAdded: string;
    needOAuthChatters: string;
    needOAuthConnection: string;
    couldNotGetChannelId: string;
    tokenMissingChattersScope: string;
    errorLoadingChatters: string;
    needOAuthSubscribers: string;
    tokenMissingSubsScope: string;
    errorLoadingSubscribers: string;
    incompatibleFileVersion: string;
  };
  // Presets
  presets: {
    quick: string;
    quickDescription: string;
    keyword: string;
    keywordDescription: string;
    subs: string;
    subsDescription: string;
  };
}

/**
 * Macros system translations
 */
export interface MacrosTranslations {
  title: string;
  subtitle: string;
  newMacro: string;
  editMacro: string;
  createMacro: string;
  noMacros: string;
  noMacrosDescription: string;
  searchPlaceholder: string;
  macroCount: string;
  macroCountPlural: string;
  // Basic Info
  basicInfo: string;
  name: string;
  namePlaceholder: string;
  description: string;
  descriptionPlaceholder: string;
  enabled: string;
  cooldown: string;
  cooldownSeconds: string;
  // Triggers
  trigger: string;
  triggerTypes: {
    chat_command: string;
    chat_keyword: string;
    schedule: string;
    event: string;
    manual: string;
  };
  triggerDescriptions: {
    chat_command: string;
    chat_keyword: string;
    schedule: string;
    event: string;
    manual: string;
  };
  triggerConfig: {
    command: string;
    commandPlaceholder: string;
    commandHint: string;
    caseSensitive: string;
    minRole: string;
    keywords: string;
    keywordsPlaceholder: string;
    keywordsHint: string;
    matchAll: string;
    scheduleType: string;
    interval: string;
    intervalMinutes: string;
    cron: string;
    cronPlaceholder: string;
    cronHint: string;
    eventType: string;
    minValue: string;
    minValuePlaceholder: string;
    hotkey: string;
    hotkeyPlaceholder: string;
    showInQuickActions: string;
  };
  eventTypes: {
    follower: string;
    raid: string;
    subscription: string;
    bits: string;
    host: string;
    poll_ended: string;
    prediction_resolved: string;
  };
  userRoles: {
    viewer: string;
    subscriber: string;
    moderator: string;
    broadcaster: string;
  };
  // Actions
  actions: string;
  addAction: string;
  selectActionType: string;
  noActions: string;
  noActionsDescription: string;
  actionTypes: {
    send_chat_message: string;
    change_scene: string;
    toggle_source: string;
    play_sound: string;
    start_poll: string;
    start_prediction: string;
    send_notification: string;
    set_variable: string;
    delay: string;
  };
  actionConfig: {
    message: string;
    messagePlaceholder: string;
    platform: string;
    allPlatforms: string;
    sceneName: string;
    sceneNamePlaceholder: string;
    sourceName: string;
    sourceNamePlaceholder: string;
    sourceAction: string;
    show: string;
    hide: string;
    toggle: string;
    soundId: string;
    soundIdPlaceholder: string;
    volume: string;
    pollTitle: string;
    pollTitlePlaceholder: string;
    pollOptions: string;
    pollDuration: string;
    predictionTitle: string;
    predictionTitlePlaceholder: string;
    predictionOutcomes: string;
    predictionDuration: string;
    notificationChannels: string;
    notificationTitle: string;
    notificationTitlePlaceholder: string;
    notificationMessage: string;
    notificationMessagePlaceholder: string;
    variableName: string;
    variableNamePlaceholder: string;
    variableOperation: string;
    variableValue: string;
    variableValuePlaceholder: string;
    operationSet: string;
    operationIncrement: string;
    operationDecrement: string;
    delaySeconds: string;
    delayBefore: string;
    delayBeforeHint: string;
    requiresOBS: string;
  };
  // Conditions
  condition: string;
  conditionOptional: string;
  addCondition: string;
  removeCondition: string;
  addMoreConditions: string;
  conditionHint: string;
  availableVariables: string;
  combineWith: string;
  operators: {
    equals: string;
    not_equals: string;
    greater: string;
    less: string;
    contains: string;
    not_contains: string;
  };
  logicalOperators: {
    and: string;
    or: string;
  };
  // Variables
  variables: {
    username: string;
    displayName: string;
    message: string;
    platform: string;
    timestamp: string;
    viewers: string;
    followers: string;
    uptime: string;
    game: string;
    title: string;
  };
  // Manager
  filters: string;
  filterAll: string;
  filterEnabled: string;
  filterDisabled: string;
  pauseAll: string;
  resumeAll: string;
  allPaused: string;
  allPausedHint: string;
  resume: string;
  duplicate: string;
  execute: string;
  deleteConfirm: string;
  deleteConfirmMessage: string;
  // Card
  executions: string;
  lastExecution: string;
  ago: string;
  errorLastExecution: string;
  // Execution Log
  executionLog: string;
  executionLogSubtitle: string;
  noExecutions: string;
  noExecutionsHint: string;
  allMacros: string;
  filterByStatus: string;
  statusAll: string;
  statusSuccess: string;
  statusFailed: string;
  successful: string;
  failed: string;
  skipped: string;
  clearLog: string;
  today: string;
  yesterday: string;
  // Import/Export
  importExport: string;
  export: string;
  import: string;
  exportDescription: string;
  importDescription: string;
  selectMacros: string;
  selectAll: string;
  deselectAll: string;
  exportSelected: string;
  importFile: string;
  dragDropFile: string;
  importMode: string;
  modeMerge: string;
  modeMergeDesc: string;
  modeReplace: string;
  modeReplaceDesc: string;
  importSuccess: string;
  importError: string;
  exportSuccess: string;
  exportError: string;
  noMacrosToExport: string;
  // Validation
  validation: {
    nameRequired: string;
    triggerRequired: string;
    actionsRequired: string;
    commandRequired: string;
    keywordsRequired: string;
    intervalRequired: string;
    cronRequired: string;
    eventTypeRequired: string;
    moreErrors: string;
  };
  // Messages
  messages: {
    macroCreated: string;
    macroUpdated: string;
    macroDeleted: string;
    macroDuplicated: string;
    macroExecuted: string;
    macroError: string;
    saving: string;
    saveChanges: string;
  };
}

/**
 * Commands translations (includes command enhancement)
 */
export interface CommandsTranslations {
  // Templates
  templates: {
    title: string;
    search: string;
    searchPlaceholder: string;
    noResults: string;
    useTemplate: string;
    customize: string;
    preview: string;
    categories: {
      info: string;
      social: string;
      entertainment: string;
      moderation: string;
      utility: string;
      games: string;
    };
  };
  // Visual Editor
  visualEditor: {
    title: string;
    visualMode: string;
    textMode: string;
    addBlock: string;
    clear: string;
    preview: string;
    noContent: string;
    dragHint: string;
    blocks: {
      text: string;
      variable: string;
      conditional: string;
      api: string;
    };
    blockDescriptions: {
      text: string;
      variable: string;
      conditional: string;
      api: string;
    };
  };
  // Command Tester
  tester: {
    title: string;
    simulateAs: string;
    arguments: string;
    argumentsPlaceholder: string;
    runTest: string;
    autoTest: string;
    result: string;
    noResult: string;
    validCommand: string;
    warnings: string;
    variablesUsed: string;
    userLevels: {
      viewer: string;
      subscriber: string;
      vip: string;
      moderator: string;
      broadcaster: string;
    };
  };
  // AI Generator
  ai: {
    title: string;
    description: string;
    inputLabel: string;
    inputPlaceholder: string;
    generate: string;
    generating: string;
    confidence: string;
    alternatives: string;
    discard: string;
    addCommand: string;
    localMode: string;
    ideas: string;
    examples: {
      greeting: string;
      social: string;
      hug: string;
      uptime: string;
      rank: string;
    };
  };
  // Categories
  categories: {
    title: string;
    newCategory: string;
    editCategory: string;
    deleteCategory: string;
    deleteConfirm: string;
    nameLabel: string;
    namePlaceholder: string;
    iconLabel: string;
    colorLabel: string;
    defaultCategories: {
      general: string;
      info: string;
      social: string;
      entertainment: string;
      games: string;
      moderation: string;
      utility: string;
      other: string;
    };
  };
  // Enhanced Panel
  panel: {
    commands: string;
    templates: string;
    ai: string;
    categories: string;
    newCommand: string;
    editCommand: string;
    testCommand: string;
    allCategories: string;
    activeCommands: string;
    totalUsage: string;
    noCommands: string;
    createOrTemplate: string;
  };
  // Export/Import
  export: {
    title: string;
    exportV2: string;
    exportLegacy: string;
    import: string;
    importMode: string;
    merge: string;
    replace: string;
    mergeDesc: string;
    replaceDesc: string;
    success: string;
    imported: string;
    skipped: string;
    replaced: string;
    error: string;
    invalidFile: string;
    selectFile: string;
    includeCategories: string;
    includeMetadata: string;
  };
  // Analysis
  analysis: {
    title: string;
    refresh: string;
    analyzing: string;
    noCommands: string;
    createFirst: string;
    allGood: string;
    noProblems: string;
    stats: {
      total: string;
      active: string;
      suggestions: string;
      ideas: string;
    };
    sections: {
      duplicates: string;
      similarTriggers: string;
      suggestions: string;
      longResponses: string;
      newIdeas: string;
    };
    priority: {
      low: string;
      medium: string;
      high: string;
    };
    actions: {
      create: string;
      dismiss: string;
      edit: string;
    };
    aiMode: {
      enabled: string;
      local: string;
    };
  };
}

/**
 * Predictions translations (Twitch predictions)
 */
export interface PredictionsTranslations {
  title: string;
  createTitle: string;
  activeTitle: string;
  historyTitle: string;
  // Form
  predictionTitle: string;
  predictionTitlePlaceholder: string;
  outcomes: string;
  outcomePlaceholder: string;
  addOutcome: string;
  removeOutcome: string;
  duration: string;
  durationSeconds: string;
  minOutcomes: string;
  maxOutcomes: string;
  // Actions
  create: string;
  lock: string;
  resolve: string;
  cancel: string;
  creating: string;
  locking: string;
  resolving: string;
  canceling: string;
  // Status
  statusActive: string;
  statusLocked: string;
  statusResolved: string;
  statusCanceled: string;
  // Display
  voters: string;
  points: string;
  totalPoints: string;
  totalVoters: string;
  topPredictors: string;
  selectWinner: string;
  winningOutcome: string;
  // History
  noHistory: string;
  viewDetails: string;
  participants: string;
  // Messages
  noPrediction: string;
  createHint: string;
  partnerRequired: string;
  partnerRequiredDesc: string;
  scopeRequired: string;
  scopeRequiredDesc: string;
  predictionCreated: string;
  predictionLocked: string;
  predictionResolved: string;
  predictionCanceled: string;
  // Errors
  errorCreating: string;
  errorLocking: string;
  errorResolving: string;
  errorCanceling: string;
  errorLoading: string;
  // Validation
  titleRequired: string;
  outcomesRequired: string;
  durationRange: string;
  uniqueOutcomes: string;
  // Broadcaster Auth
  broadcasterAuthRequired: string;
  broadcasterAuthRequiredDesc: string;
  broadcasterAuthSuccess: string;
  moderatorCanCreate: string;
  moderatorCannotCreate: string;
}

/**
 * Rewards/Channel Points translations
 */
export interface RewardsTranslations {
  title: string;
  createTitle: string;
  editTitle: string;
  redemptionsTitle: string;
  // Form
  rewardTitle: string;
  rewardTitlePlaceholder: string;
  cost: string;
  costPlaceholder: string;
  description: string;
  descriptionPlaceholder: string;
  backgroundColor: string;
  // Limits
  maxPerStream: string;
  maxPerStreamEnabled: string;
  maxPerUser: string;
  maxPerUserEnabled: string;
  globalCooldown: string;
  globalCooldownEnabled: string;
  cooldownSeconds: string;
  // Options
  userInputRequired: string;
  skipQueue: string;
  enabled: string;
  paused: string;
  // Actions
  create: string;
  update: string;
  delete: string;
  enable: string;
  disable: string;
  creating: string;
  updating: string;
  deleting: string;
  // Redemptions
  redemptions: string;
  pendingRedemptions: string;
  noRedemptions: string;
  fulfill: string;
  reject: string;
  fulfilling: string;
  rejecting: string;
  filterByReward: string;
  allRewards: string;
  redeemedBy: string;
  redeemedAt: string;
  userInput: string;
  // Status
  statusUnfulfilled: string;
  statusFulfilled: string;
  statusCanceled: string;
  // Messages
  noRewards: string;
  createHint: string;
  scopeRequired: string;
  scopeRequiredDesc: string;
  rewardCreated: string;
  rewardUpdated: string;
  rewardDeleted: string;
  rewardEnabled: string;
  rewardDisabled: string;
  redemptionFulfilled: string;
  redemptionRejected: string;
  // Errors
  errorCreating: string;
  errorUpdating: string;
  errorDeleting: string;
  errorLoading: string;
  errorFulfilling: string;
  errorRejecting: string;
  // Validation
  titleRequired: string;
  costRequired: string;
  costMin: string;
}

/**
 * Moderation translations
 */
export interface ModerationTranslations {
  title: string;
  config: string;
  stats: string;
  log: string;
  accepted: string;
  rejected: string;
  voteChanged: string;
  acceptanceRate: string;
  reset: string;
  minAccountAge: string;
  minAccountAgeTooltip: string;
  allowVoteChanges: string;
  allowVoteChangesTooltip: string;
  enabled: string;
  disabled: string;
  cooldown: string;
  cooldownTooltip: string;
  voteWeights: string;
  voteWeightsTooltip: string;
  subscriber: string;
  follower: string;
  regularUsers: string;
  presets: string;
  presetName: string;
  loadPreset: string;
  noPresets: string;
  presetSaved: string;
  presetLoaded: string;
  presetDeleted: string;
  enterPresetName: string;
  resetDefaults: string;
  whitelist: string;
  whitelistTooltip: string;
  whitelistEnabled: string;
  whitelistPlaceholder: string;
  whitelistCount: string;
  blacklist: string;
  blacklistTooltip: string;
  blacklistEnabled: string;
  blacklistPlaceholder: string;
  blacklistCount: string;
  reasons: {
    accountTooNew: string;
    cooldownActive: string;
    alreadyVoted: string;
    invalidOption: string;
    voteChangeCooldown: string;
    notWhitelisted: string;
    blacklisted: string;
  };
}

/**
 * Analytics translations
 */
export interface AnalyticsTranslations {
  title: string;
  configureAI: string;
  aiActive: string;
  noData: string;
  live: string;
  history: string;
  activeSession: string;
  noActiveStream: string;
  connectToSee: string;
  uniqueViewers: string;
  messages: string;
  positive: string;
  neutral: string;
  negative: string;
  engagement: string;
  mainTopics: string;
  frequentWords: string;
  mostUsedEmotes: string;
  mostActiveViewers: string;
  msgs: string;
  sessionsThisDay: string;
  totalMessages: string;
  noSessionsDate: string;
  exportData: string;
  loading: string;
}

/**
 * Overlay translations
 */
export interface OverlayTranslations {
  title: string;
  customize: string;
  background: string;
  textColor: string;
  borderColor: string;
  showBorders: string;
  fontSize: string;
  fontStyle: string;
  theme: string;
  light: string;
  dark: string;
  small: string;
  medium: string;
  large: string;
  normal: string;
  bold: string;
  italic: string;
  chromaKey: string;
  waitingPoll: string;
  mode: string;
  forOBS: string;
  size: string;
  normalSize: string;
  largeSize: string;
}

/**
 * Platforms translations (Twitch, YouTube, Kick)
 */
export interface PlatformsTranslations {
  // General
  comingSoon: string;
  back: string;
  backToPlatforms: string;
  availableTools: string;
  connected: string;
  connecting: string;
  disconnected: string;
  error: string;
  platformConnected: string;
  platformsConnected: string;
  platformsDescriptionMulti: string;
  selectPlatforms: string;
  // Broadcaster Auth
  broadcasterAuthorized: string;
  broadcasterNotAuthorized: string;
  authorizeApp: string;
  streamerAuthorized: string;
  // Twitch
  twitchTitle: string;
  twitchDescription: string;
  twitchToolsDescription: string;
  backToTwitchTools: string;
  // YouTube
  youtubeTitle: string;
  youtubeDescription: string;
  youtubeToolsDescription: string;
  backToYoutubeTools: string;
  youtubeConnect: string;
  youtubeDisconnect: string;
  youtubeLiveChat: string;
  youtubePolls: string;
  // Kick
  kickTitle: string;
  kickDescription: string;
  kickToolsDescription: string;
  backToKickTools: string;
  kickConnect: string;
  kickDisconnect: string;
  kickLiveChat: string;
  // Tools
  commands: string;
  commandsDescription: string;
  predictions: string;
  predictionsDescription: string;
  channelPoints: string;
  channelPointsDescription: string;
}

/**
 * Miscellaneous translations (mascot, chat, collaboration, etc.)
 */
export interface MiscTranslations {
  // Tools
  tools: {
    title: string;
    subtitle: string;
    selectLanguage: string;
    switchTheme: string;
    keyboardShortcuts: string;
    keyboardShortcutsDesc: string;
    quickAccess: string;
  };
  // Connection
  connection: {
    title: string;
    subtitle: string;
    channelLabel: string;
    channelPlaceholder: string;
    channelTooltip: string;
    tokenLabel: string;
    tokenPlaceholder: string;
    tokenTooltip: string;
    hideToken: string;
    connect: string;
    disconnect: string;
    connecting: string;
    connected: string;
    disconnected: string;
    error: string;
    connectedSuccess: string;
    tokenHelp: string;
    instructions: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    errorAuth: string;
    errorNetwork: string;
    errorConnection: string;
    errorChannelRequired: string;
    errorChannelInvalid: string;
    errorTokenInvalid: string;
    urlDetected: string;
    orLoginWith: string;
    loginWithTwitch: string;
    oauthLoading: string;
    oauthError: string;
    oauthPopupBlocked: string;
  };
  // Mascot
  mascot: {
    title: string;
    chatSentiment: string;
    positive: string;
    neutral: string;
    negative: string;
    messages: string;
    votes: string;
    viewers: string;
    intensity: string;
    helpConnectionFailed: string;
    helpPollEmpty: string;
    helpNoVotes: string;
    helpRepeatedAction: string;
    helpIdle: string;
    msgConnectionFailed: string;
    msgPollEmpty: string;
    msgNoVotes: string;
    msgRepeatedAction: string;
    msgIdle: string;
    msgChatPositive: string;
    msgChatNegative: string;
    msgChatExcited: string;
    msgNotConnected: string;
    msgPollGoing: string;
    msgWaitingVotes: string;
    msgWatching: string;
    dragToMove: string;
    msgLove: string;
    msgSurprised: string;
    msgAngry: string;
    msgSleepy: string;
    msgHappy: string;
    msgSad: string;
  };
  // Chat
  chat: {
    newPoll: string;
    options: string;
    voteHint: string;
    pollEnded: string;
    winner: string;
    withVotes: string;
  };
  // Chat Simulator
  chatSimulator: {
    title: string;
    active: string;
    start: string;
    pause: string;
    reset: string;
    settings: string;
    context: string;
    generic: string;
    poll: string;
    game: string;
    trivia: string;
    giveaway: string;
    messagesPerMinute: string;
    relevantProbability: string;
    uniqueUsers: string;
    burst: string;
    simulateVotes: string;
    simulateJoins: string;
  };
  // Collaboration
  collaboration: {
    title: string;
    mainChannel: string;
    placeholder: string;
    remove: string;
    errorAdding: string;
    helpText: string;
    channelAdded: string;
    channelRemoved: string;
  };
  // Soundboard
  soundboard: {
    title: string;
    bitSounds: string;
    customSounds: string;
    bitDescription: string;
    noCustomSounds: string;
    uploadHint: string;
  };
  // Spinner
  spinner: {
    winnerTextColor: string;
    optionsTitle: string;
    presetsTitle: string;
    presetYesNo: string;
    presetNumbers: string;
    presetDecisions: string;
    presetPrizes: string;
    newOptionPlaceholder: string;
    clearAll: string;
    spinning: string;
    spin: string;
  };
  // Gallery
  gallery: {
    title: string;
    upload: string;
    delete: string;
    noAssets: string;
    uploadHint: string;
    storageFull: string;
    dragDrop: string;
    maxSize: string;
  };
  // History
  history: {
    title: string;
    noPastPolls: string;
    viewDetails: string;
    exportData: string;
  };
  // Unified History
  unifiedHistory: {
    title: string;
    subtitle: string;
    noItems: string;
    adjustFilters: string;
    all: string;
    polls: string;
    predictions: string;
    giveaways: string;
    commands: string;
    timers: string;
    search: string;
    filters: string;
    dateFrom: string;
    dateTo: string;
    clearFilters: string;
    export: string;
    import: string;
    clear: string;
    close: string;
    delete: string;
    confirmClearAll: string;
    confirmClearCategory: string;
    importSuccess: string;
    importError: string;
    winner: string;
    participants: string;
    votes: string;
    executions: string;
    interval: string;
    executedBy: string;
    channel: string;
  };
  // Notifications
  notifications: {
    pollCreated: string;
    pollEnded: string;
    pollReset: string;
    connectionError: string;
    storageFull: string;
    copied: string;
    saved: string;
    deleted: string;
    autoEnded: string;
  };
  // AI Config
  aiConfig: {
    title: string;
    optional: string;
    description: string;
    provider: string;
    apiKey: string;
    apiKeyPlaceholder: string;
    saved: string;
    save: string;
    test: string;
    connectionSuccess: string;
    connectionError: string;
    aiAnalysis: string;
    activateInsights: string;
    noApiKeyHint: string;
    getApiKey: string;
  };
  // Judge Panel
  judgePanel: {
    criteriaWeightTooltip: string;
    publicVoteWeightTooltip: string;
    votePrefixTooltip: string;
    errors: {
      missingCriteriaAndContestants: string;
      missingCriteria: string;
      missingContestants: string;
    };
    presets: {
      basic: string;
      basicDescription: string;
      public: string;
      publicDescription: string;
      criteria: {
        creativity: string;
        execution: string;
        originality: string;
      };
    };
  };
  // Twitch Polls (API-based)
  twitchPolls: {
    title: string;
    createTitle: string;
    activeTitle: string;
    historyTitle: string;
    question: string;
    questionPlaceholder: string;
    choices: string;
    choicePlaceholder: string;
    addChoice: string;
    removeChoice: string;
    duration: string;
    durationSeconds: string;
    create: string;
    creating: string;
    terminate: string;
    archive: string;
    statusActive: string;
    statusCompleted: string;
    statusTerminated: string;
    statusArchived: string;
    votes: string;
    totalVotes: string;
    winner: string;
    noHistory: string;
    noPoll: string;
    createHint: string;
    pollCreated: string;
    pollTerminated: string;
    pollArchived: string;
    errorCreating: string;
    errorTerminating: string;
    errorArchiving: string;
    broadcasterAuthRequired: string;
    broadcasterAuthRequiredDesc: string;
    moderatorCanCreate: string;
  };
  // Commands Export/Import
  commandsExport: {
    export: string;
    import: string;
    exporting: string;
    importing: string;
    exportTitle: string;
    exportDescription: string;
    exportSuccess: string;
    exportError: string;
    noCommandsToExport: string;
    importTitle: string;
    importDescription: string;
    selectFile: string;
    dragDropFile: string;
    importMode: string;
    modeMerge: string;
    modeMergeDesc: string;
    modeReplace: string;
    modeReplaceDesc: string;
    importSuccess: string;
    importError: string;
    invalidFormat: string;
    invalidVersion: string;
    invalidCommands: string;
    commandsImported: string;
    commandsSkipped: string;
    duplicatesFound: string;
    confirmReplace: string;
    confirmReplaceDesc: string;
  };
  // Timers
  timers: {
    title: string;
    subtitle: string;
    description: string;
    tabTimers: string;
    tabTemplates: string;
    tabGroups: string;
    tabLog: string;
    engineRunning: string;
    engineStopped: string;
    startEngine: string;
    stopEngine: string;
    chatLines: string;
    createTimer: string;
    editTimer: string;
    timerName: string;
    timerNamePlaceholder: string;
    timerMessage: string;
    timerMessagePlaceholder: string;
    timerInterval: string;
    timerMinLines: string;
    timerMinLinesHelp: string;
    timerGroup: string;
    timerEnabled: string;
    timerNoGroup: string;
    save: string;
    cancel: string;
    noTimers: string;
    noTimersDescription: string;
    nextExecution: string;
    lastExecution: string;
    never: string;
    executeNow: string;
    edit: string;
    delete: string;
    deleteConfirm: string;
    everyMinutes: string;
    minLines: string;
    templatesTitle: string;
    templatesDescription: string;
    useTemplate: string;
    templateCategories: {
      social: string;
      rules: string;
      discord: string;
      donations: string;
      commands: string;
    };
    groupsTitle: string;
    groupsDescription: string;
    createGroup: string;
    editGroup: string;
    groupName: string;
    groupColor: string;
    groupTimerCount: string;
    noGroups: string;
    noGroupsDescription: string;
    deleteGroupConfirm: string;
    generalGroup: string;
    logTitle: string;
    logDescription: string;
    clearLog: string;
    noLogEntries: string;
    logSuccess: string;
    logError: string;
    variablesTitle: string;
    variablesHelp: string;
    variables: {
      channel: string;
      game: string;
      uptime: string;
      viewers: string;
      followers: string;
      date: string;
      time: string;
    };
    nameRequired: string;
    messageRequired: string;
    intervalMin: string;
    intervalMax: string;
    timerCreated: string;
    timerUpdated: string;
    timerDeleted: string;
    timerExecuted: string;
    groupCreated: string;
    groupUpdated: string;
    groupDeleted: string;
    notConnected: string;
    notConnectedDescription: string;
    toggleTimer: string;
    toggleGroup: string;
    timerOptions: string;
    groupOptions: string;
    engineStartedAnnouncement: string;
    engineStoppedAnnouncement: string;
    timerExecutedAnnouncement: string;
    timerErrorAnnouncement: string;
  };
  // Onboarding
  onboarding: {
    welcomeTitle: string;
    welcomeMessage: string;
    startTutorial: string;
    skipTutorial: string;
    nextStep: string;
    previousStep: string;
    finish: string;
    stepOf: string;
    progress: string;
    completed: string;
    restartTutorial: string;
    restartTutorialDesc: string;
    restartButton: string;
    interactionRequired: string;
    interactionCompleted: string;
    clickToInteract: string;
    waitingInteraction: string;
    paused: string;
    resume: string;
    tipDismiss: string;
    tipDismissPermanent: string;
    tipUnderstood: string;
    contextualTipsEnabled: string;
    contextualTipsDisabled: string;
  };
  // Backup
  backup: {
    title: string;
    selectProvider: string;
    connected: string;
    confirmRestore: string;
    status: {
      synced: string;
      syncing: string;
      pending: string;
      error: string;
      disconnected: string;
    };
    lastBackup: string;
    providers: {
      googleDrive: {
        description: string;
        help: string;
      };
      customServer: {
        name: string;
        description: string;
      };
    };
    credentials: {
      title: string;
      optional: string;
      accessTokenPlaceholder: string;
      refreshTokenPlaceholder: string;
      apiKeyPlaceholder: string;
    };
    autoBackup: {
      title: string;
      description: string;
    };
    actions: {
      connect: string;
      cancel: string;
      disconnect: string;
      backupNow: string;
      restore: string;
    };
    messages: {
      connected: string;
      disconnected: string;
      backupSuccess: string;
      restoreSuccess: string;
    };
    errors: {
      missingToken: string;
      missingServerConfig: string;
      connectionFailed: string;
      backupFailed: string;
      restoreFailed: string;
    };
    securityNote: string;
  };
  // Offline Mode
  offline: {
    offlineBanner: string;
    reconnected: string;
    pendingOperations: string;
    pendingOperation: string;
    syncing: string;
    offline: string;
    online: string;
  };
  // Push Notifications
  pushNotifications: {
    title: string;
    subtitle: string;
    channels: {
      push: string;
      pushDescription: string;
      discord: string;
      discordDescription: string;
      telegram: string;
      telegramDescription: string;
    };
    status: {
      enabled: string;
      disabled: string;
      error: string;
      permissionDenied: string;
      permissionGranted: string;
      notSupported: string;
    };
    config: {
      webhookUrl: string;
      webhookUrlPlaceholder: string;
      webhookUrlHelp: string;
      botToken: string;
      botTokenPlaceholder: string;
      botTokenHelp: string;
      chatId: string;
      chatIdPlaceholder: string;
      chatIdHelp: string;
      username: string;
      usernamePlaceholder: string;
      avatarUrl: string;
      avatarUrlPlaceholder: string;
    };
    events: {
      title: string;
      follower: string;
      raid: string;
      host: string;
      donation: string;
      subscription: string;
      bits: string;
      poll_ended: string;
      prediction_resolved: string;
      giveaway_winner: string;
      command_executed: string;
    };
    quietHours: {
      title: string;
      description: string;
      enabled: string;
      start: string;
      end: string;
      active: string;
    };
    actions: {
      test: string;
      testSuccess: string;
      testError: string;
      save: string;
      reset: string;
      requestPermission: string;
      enableInstructions: string;
    };
    history: {
      title: string;
      noEntries: string;
      sentAt: string;
      success: string;
      failed: string;
      pending: string;
      clear: string;
      clearConfirm: string;
    };
    stats: {
      sentToday: string;
      failed: string;
      pending: string;
    };
    messages: {
      configSaved: string;
      configReset: string;
      permissionGranted: string;
      permissionDenied: string;
      testSent: string;
      testFailed: string;
      notificationSent: string;
      notificationFailed: string;
      quietHoursActive: string;
    };
    errors: {
      invalidWebhookUrl: string;
      invalidBotToken: string;
      invalidChatId: string;
      sendFailed: string;
      permissionRequired: string;
    };
  };
}

// ============================================================================
// Combined Translations Interface
// ============================================================================

/**
 * Complete translations interface combining all domains
 * This is the main type used by the i18n context
 */
export interface Translations {
  // Core modules (loaded at startup)
  common: CommonTranslations;
  errors: ErrorTranslations;
  nav: NavigationTranslations;
  
  // Feature modules (lazy loaded)
  poll: PollTranslations;
  games: GamesTranslations;
  giveaway: GiveawayTranslations;
  macros: MacrosTranslations;
  commands: CommandsTranslations;
  predictions: PredictionsTranslations;
  rewards: RewardsTranslations;
  moderation: ModerationTranslations;
  analytics: AnalyticsTranslations;
  overlay: OverlayTranslations;
  platforms: PlatformsTranslations;
  misc: MiscTranslations;
}

// ============================================================================
// Lazy Loading Types
// ============================================================================

/**
 * Core modules that are always loaded at startup
 * These contain essential translations needed for basic app functionality
 */
export type CoreTranslationModule = 'common' | 'errors' | 'nav';

/**
 * Lazy-loaded translation modules
 * These are loaded on-demand when the user accesses specific features
 */
export type LazyTranslationModule = keyof Omit<Translations, CoreTranslationModule>;

/**
 * All translation module keys
 */
export type TranslationModule = keyof Translations;

/**
 * Type guard to check if a module is a core module
 */
export function isCoreModule(module: TranslationModule): module is CoreTranslationModule {
  return module === 'common' || module === 'errors' || module === 'nav';
}

/**
 * Type guard to check if a module is a lazy module
 */
export function isLazyModule(module: TranslationModule): module is LazyTranslationModule {
  return !isCoreModule(module);
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type for translation values with interpolation support
 * Supports both simple strings and strings with {{variable}} placeholders
 */
export type TranslationValue = string;

/**
 * Type for interpolation variables
 */
export type InterpolationValues = Record<string, string | number>;

/**
 * Type for a translation function
 */
export type TranslateFunction = (
  key: string,
  values?: InterpolationValues
) => string;

/**
 * Type for partial translations (used during lazy loading)
 */
export type PartialTranslations = Partial<Translations>;

/**
 * Type for translation module loader function
 */
export type TranslationModuleLoader<T extends TranslationModule> = () => Promise<{
  default: Translations[T];
}>;

/**
 * Map of lazy module loaders
 */
export type LazyModuleLoaders = {
  [K in LazyTranslationModule]: TranslationModuleLoader<K>;
};

// ============================================================================
// Context Types
// ============================================================================

/**
 * State for tracking loaded modules
 */
export type LoadedModulesState = {
  [K in LazyTranslationModule]?: boolean;
};

/**
 * i18n Context value type
 */
export interface I18nContextValue {
  /** Current locale */
  locale: Locale;
  /** Function to change locale */
  setLocale: (locale: Locale) => void;
  /** All translations (core + loaded lazy modules) */
  t: Translations;
  /** Load a lazy translation module */
  loadModule: (module: LazyTranslationModule) => Promise<void>;
  /** Check if a lazy module is loaded */
  isModuleLoaded: (module: LazyTranslationModule) => boolean;
  /** Check if currently loading a module */
  isLoading: boolean;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of translation validation
 */
export interface ValidationResult {
  /** Keys present in ES but missing in EN */
  missingInEn: string[];
  /** Keys present in EN but missing in ES */
  missingInEs: string[];
  /** Total number of keys */
  totalKeys: number;
  /** Coverage percentage per locale */
  coverage: {
    es: number;
    en: number;
  };
  /** Whether validation passed */
  isValid: boolean;
}

/**
 * Type inconsistency found during validation
 */
export interface TypeInconsistency {
  key: string;
  esType: string;
  enType: string;
}
