// Internationalization (i18n) system - Spanish and English only
export type Locale = 'es' | 'en';

export interface Translations {
  common: {
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
  };
  // Macros System
  macros: {
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
  };
  tools: {
    title: string;
    subtitle: string;
    selectLanguage: string;
    switchTheme: string;
    keyboardShortcuts: string;
    keyboardShortcutsDesc: string;
    quickAccess: string;
  };
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
  nav: {
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
  };
  poll: {
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
  };
  moderation: {
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
  };
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
  analytics: {
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
  };
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
  history: {
    title: string;
    noPastPolls: string;
    viewDetails: string;
    exportData: string;
  };
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
  overlay: {
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
  };
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
  chat: {
    newPoll: string;
    options: string;
    voteHint: string;
    pollEnded: string;
    winner: string;
    withVotes: string;
    liveChat: string;
    waitingMessages: string;
    newMessages: string;
    alreadyRegistered: string;
    votedFor: string;
  };
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
  soundboard: {
    title: string;
    bitSounds: string;
    customSounds: string;
    bitDescription: string;
    noCustomSounds: string;
    uploadHint: string;
  };
  randomWinner: {
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
  };
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
  games: {
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
  };
  judgePanel: {
    // Tooltips
    criteriaWeightTooltip: string;
    publicVoteWeightTooltip: string;
    votePrefixTooltip: string;
    // Error messages
    errors: {
      missingCriteriaAndContestants: string;
      missingCriteria: string;
      missingContestants: string;
    };
    // Presets
    presets: {
      basic: string;
      basicDescription: string;
      public: string;
      publicDescription: string;
      // Criteria names
      criteria: {
        creativity: string;
        execution: string;
        originality: string;
      };
    };
  };
  platforms: {
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
  };
  // Predictions
  predictions: {
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
  };
  // Channel Points / Rewards
  rewards: {
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
  };
  // Commands Import/Export
  commandsExport: {
    export: string;
    import: string;
    exporting: string;
    importing: string;
    // Export
    exportTitle: string;
    exportDescription: string;
    exportSuccess: string;
    exportError: string;
    noCommandsToExport: string;
    // Import
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
    // Validation
    invalidFormat: string;
    invalidVersion: string;
    invalidCommands: string;
    commandsImported: string;
    commandsSkipped: string;
    duplicatesFound: string;
    // Confirmation
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
    // Accessibility announcements
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
  // Push Notifications / External Alerts
  pushNotifications: {
    title: string;
    subtitle: string;
    // Channels
    channels: {
      push: string;
      pushDescription: string;
      discord: string;
      discordDescription: string;
      telegram: string;
      telegramDescription: string;
    };
    // Channel Status
    status: {
      enabled: string;
      disabled: string;
      error: string;
      permissionDenied: string;
      permissionGranted: string;
      notSupported: string;
    };
    // Configuration
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
    // Event Types
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
    // Quiet Hours
    quietHours: {
      title: string;
      description: string;
      enabled: string;
      start: string;
      end: string;
      active: string;
    };
    // Actions
    actions: {
      test: string;
      testSuccess: string;
      testError: string;
      save: string;
      reset: string;
      requestPermission: string;
      enableInstructions: string;
    };
    // History
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
    // Stats
    stats: {
      sentToday: string;
      failed: string;
      pending: string;
    };
    // Messages
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
    // Errors
    errors: {
      invalidWebhookUrl: string;
      invalidBotToken: string;
      invalidChatId: string;
      sendFailed: string;
      permissionRequired: string;
    };
  };
}

export const translations: Record<Locale, Translations> = {
  es: {
    common: {
      loading: 'Cargando...',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      confirm: 'Confirmar',
      search: 'Buscar',
      settings: 'Configuración',
      theme: 'Tema',
      language: 'Idioma',
      exit: 'Salir',
    },
    macros: {
      title: 'Macros',
      subtitle: 'Automatizaciones personalizadas',
      newMacro: 'Nueva',
      editMacro: 'Editar Macro',
      createMacro: 'Crear macro',
      noMacros: 'No hay macros configuradas',
      noMacrosDescription: 'Crea tu primera macro para automatizar acciones',
      searchPlaceholder: 'Buscar macros...',
      macroCount: 'macro configurada',
      macroCountPlural: 'macros configuradas',
      // Basic Info
      basicInfo: 'Información básica',
      name: 'Nombre',
      namePlaceholder: 'Ej: Saludo de bienvenida',
      description: 'Descripción',
      descriptionPlaceholder: 'Describe qué hace esta macro...',
      enabled: 'Habilitada',
      cooldown: 'Cooldown',
      cooldownSeconds: 'seg',
      // Triggers
      trigger: 'Disparador (Trigger)',
      triggerTypes: {
        chat_command: 'Comando',
        chat_keyword: 'Palabra clave',
        schedule: 'Programado',
        event: 'Evento',
        manual: 'Manual',
      },
      triggerDescriptions: {
        chat_command: 'Se activa con un comando específico (ej: !raid)',
        chat_keyword: 'Se activa cuando aparece una palabra en el chat',
        schedule: 'Se ejecuta en intervalos de tiempo',
        event: 'Se activa con eventos del stream (follows, raids, etc.)',
        manual: 'Se ejecuta manualmente desde la interfaz',
      },
      triggerConfig: {
        command: 'Comando',
        commandPlaceholder: '!comando',
        commandHint: 'El comando debe empezar con ! (ej: !raid, !saludo)',
        caseSensitive: 'Sensible a mayúsculas',
        minRole: 'Rol mínimo',
        keywords: 'Palabras clave',
        keywordsPlaceholder: 'hola, saludo, bienvenido',
        keywordsHint: 'Separa múltiples palabras con comas',
        matchAll: 'Todas las palabras (AND)',
        scheduleType: 'Tipo de programación',
        interval: 'Intervalo',
        intervalMinutes: 'Intervalo (minutos)',
        cron: 'Cron',
        cronPlaceholder: '*/30 * * * *',
        cronHint: 'Formato: minuto hora día mes día_semana',
        eventType: 'Tipo de evento',
        minValue: 'Valor mínimo (opcional)',
        minValuePlaceholder: 'Mínimo de bits o viewers',
        hotkey: 'Atajo de teclado (opcional)',
        hotkeyPlaceholder: 'Ctrl+Shift+M',
        showInQuickActions: 'Mostrar en acciones rápidas',
      },
      eventTypes: {
        follower: 'Nuevo seguidor',
        raid: 'Raid recibido',
        subscription: 'Nueva suscripción',
        bits: 'Bits recibidos',
        host: 'Host recibido',
        poll_ended: 'Encuesta finalizada',
        prediction_resolved: 'Predicción resuelta',
      },
      userRoles: {
        viewer: 'Cualquier usuario',
        subscriber: 'Suscriptores',
        moderator: 'Moderadores',
        broadcaster: 'Solo streamer',
      },
      // Actions
      actions: 'Acciones',
      addAction: 'Añadir',
      selectActionType: 'Selecciona el tipo de acción:',
      noActions: 'No hay acciones configuradas',
      noActionsDescription: 'Añade acciones para que tu macro haga algo',
      actionTypes: {
        send_chat_message: 'Enviar mensaje',
        change_scene: 'Cambiar escena',
        toggle_source: 'Toggle fuente',
        play_sound: 'Reproducir sonido',
        start_poll: 'Iniciar encuesta',
        start_prediction: 'Iniciar predicción',
        send_notification: 'Enviar notificación',
        set_variable: 'Establecer variable',
        delay: 'Esperar',
      },
      actionConfig: {
        message: 'Mensaje',
        messagePlaceholder: 'Escribe el mensaje a enviar...',
        platform: 'Plataforma',
        allPlatforms: 'Todas las plataformas',
        sceneName: 'Nombre de la escena',
        sceneNamePlaceholder: 'Ej: Gaming, Just Chatting',
        sourceName: 'Nombre de la fuente',
        sourceNamePlaceholder: 'Ej: Webcam, Alert Box',
        sourceAction: 'Acción',
        show: 'Mostrar',
        hide: 'Ocultar',
        toggle: 'Alternar',
        soundId: 'ID del sonido',
        soundIdPlaceholder: 'ID del sonido del soundboard',
        volume: 'Volumen',
        pollTitle: 'Título de la encuesta',
        pollTitlePlaceholder: '¿Qué juego jugamos?',
        pollOptions: 'Opciones',
        pollDuration: 'Duración (segundos)',
        predictionTitle: 'Título de la predicción',
        predictionTitlePlaceholder: '¿Quién ganará?',
        predictionOutcomes: 'Resultados',
        predictionDuration: 'Duración (segundos)',
        notificationChannels: 'Canales',
        notificationTitle: 'Título',
        notificationTitlePlaceholder: 'Título de la notificación',
        notificationMessage: 'Mensaje',
        notificationMessagePlaceholder: 'Contenido de la notificación...',
        variableName: 'Nombre de la variable',
        variableNamePlaceholder: 'mi_variable',
        variableOperation: 'Operación',
        variableValue: 'Valor',
        variableValuePlaceholder: 'Valor o número',
        operationSet: 'Establecer',
        operationIncrement: 'Incrementar',
        operationDecrement: 'Decrementar',
        delaySeconds: 'Segundos de espera',
        delayBefore: 'Delay antes de ejecutar',
        delayBeforeHint: 'Tiempo de espera antes de ejecutar esta acción',
        requiresOBS: 'Requiere conexión con OBS WebSocket',
      },
      // Conditions
      condition: 'Condición',
      conditionOptional: 'opcional',
      addCondition: 'Añadir condición',
      removeCondition: 'Quitar condición',
      addMoreConditions: 'Añadir más condiciones (grupo)',
      conditionHint: 'Añade una condición para ejecutar esta acción solo cuando se cumpla',
      availableVariables: 'Variables disponibles',
      combineWith: 'Combinar con:',
      operators: {
        equals: 'Igual a',
        not_equals: 'Diferente de',
        greater: 'Mayor que',
        less: 'Menor que',
        contains: 'Contiene',
        not_contains: 'No contiene',
      },
      logicalOperators: {
        and: 'Y (AND)',
        or: 'O (OR)',
      },
      // Variables
      variables: {
        username: 'Usuario que activó el trigger',
        displayName: 'Nombre de display del usuario',
        message: 'Mensaje del chat',
        platform: 'Plataforma de origen',
        timestamp: 'Timestamp actual',
        viewers: 'Viewers actuales',
        followers: 'Total de seguidores',
        uptime: 'Tiempo de stream',
        game: 'Juego actual',
        title: 'Título del stream',
      },
      // Manager
      filters: 'Filtros',
      filterAll: 'Todas',
      filterEnabled: 'Habilitadas',
      filterDisabled: 'Deshabilitadas',
      pauseAll: 'Pausar todas',
      resumeAll: 'Reanudar todas',
      allPaused: 'Todas las macros están pausadas',
      allPausedHint: 'Haz clic para reanudar',
      resume: 'Reanudar',
      duplicate: 'Duplicar',
      execute: 'Ejecutar macro',
      deleteConfirm: 'Eliminar macro',
      deleteConfirmMessage: '¿Estás seguro de que quieres eliminar la macro "{name}"? Esta acción no se puede deshacer.',
      // Card
      executions: 'ejecuciones',
      lastExecution: 'Última ejecución',
      ago: 'hace',
      errorLastExecution: 'Error en última ejecución',
      // Execution Log
      executionLog: 'Log de Ejecución',
      executionLogSubtitle: 'ejecuciones',
      noExecutions: 'No hay ejecuciones',
      noExecutionsHint: 'Las ejecuciones de macros aparecerán aquí',
      allMacros: 'Todas las macros',
      filterByStatus: 'Filtrar por estado',
      statusAll: 'Todas',
      statusSuccess: 'Exitosas',
      statusFailed: 'Fallidas',
      successful: 'exitosas',
      failed: 'fallidas',
      skipped: 'omitidas',
      clearLog: 'Limpiar log',
      today: 'Hoy',
      yesterday: 'Ayer',
      // Import/Export
      importExport: 'Importar/Exportar',
      export: 'Exportar',
      import: 'Importar',
      exportDescription: 'Exporta tus macros como archivo JSON',
      importDescription: 'Importa macros desde un archivo JSON',
      selectMacros: 'Seleccionar macros',
      selectAll: 'Seleccionar todas',
      deselectAll: 'Deseleccionar todas',
      exportSelected: 'Exportar seleccionadas',
      importFile: 'Seleccionar archivo',
      dragDropFile: 'Arrastra un archivo aquí o haz clic para seleccionar',
      importMode: 'Modo de importación',
      modeMerge: 'Combinar',
      modeMergeDesc: 'Añade nuevas macros sin eliminar las existentes',
      modeReplace: 'Reemplazar',
      modeReplaceDesc: 'Reemplaza todas las macros existentes',
      importSuccess: 'Macros importadas correctamente',
      importError: 'Error al importar macros',
      exportSuccess: 'Macros exportadas correctamente',
      exportError: 'Error al exportar macros',
      noMacrosToExport: 'No hay macros para exportar',
      // Validation
      validation: {
        nameRequired: 'El nombre es requerido',
        triggerRequired: 'El trigger es requerido',
        actionsRequired: 'Se requiere al menos una acción',
        commandRequired: 'El comando es requerido',
        keywordsRequired: 'Se requiere al menos una palabra clave',
        intervalRequired: 'El intervalo es requerido',
        cronRequired: 'La expresión cron es requerida',
        eventTypeRequired: 'El tipo de evento es requerido',
        moreErrors: 'errores más',
      },
      // Messages
      messages: {
        macroCreated: 'Macro creada correctamente',
        macroUpdated: 'Macro actualizada correctamente',
        macroDeleted: 'Macro eliminada correctamente',
        macroDuplicated: 'Macro duplicada correctamente',
        macroExecuted: 'Macro ejecutada',
        macroError: 'Error al ejecutar macro',
        saving: 'Guardando...',
        saveChanges: 'Guardar cambios',
      },
    },
    tools: {
      title: 'Herramientas',
      subtitle: 'Herramientas y configuración',
      selectLanguage: 'Selecciona el idioma de la interfaz',
      switchTheme: 'Cambia entre modo claro y oscuro',
      keyboardShortcuts: 'Atajos de Teclado',
      keyboardShortcutsDesc: 'Personaliza los atajos de la aplicación',
      quickAccess: 'Accede rápidamente con',
    },
    connection: {
      title: 'Conectar a Twitch',
      subtitle: 'Ingresa el nombre del canal para comenzar',
      channelLabel: 'Canal / URL',
      channelPlaceholder: 'Ej: nombre o canal twitch',
      channelTooltip: 'El nombre de usuario o enlace de Twitch (ej. nombre o canal twitch).',
      tokenLabel: 'Access Token (Opcional)',
      tokenPlaceholder: 'Ej: uo6dgg01...',
      tokenTooltip: 'Necesario para que el bot escriba en el chat (anunciar encuestas). Sin esto, funcionará en modo solo lectura.',
      hideToken: 'Ocultar',
      connect: 'Conectar',
      disconnect: 'Desconectar',
      connecting: 'Conectando...',
      connected: 'Conectado',
      disconnected: 'Desconectado',
      error: 'Error de conexión',
      connectedSuccess: 'Conectado al chat correctamente.',
      tokenHelp: 'El token permite enviar mensajes al chat',
      instructions: 'Instrucciones',
      step1: 'Ve a',
      step2: 'Selecciona "Bot Chat Token" o Custom.',
      step3: 'Asegura los scopes: chat:read y chat:edit.',
      step4: 'Genera y copia el ACCESS TOKEN (no el Client ID).',
      errorAuth: 'Error de Autenticación',
      errorNetwork: 'Error de Red',
      errorConnection: 'Error de Conexión',
      errorChannelRequired: 'El nombre del canal es obligatorio.',
      errorChannelInvalid: 'Nombre inválido (3-25 caracteres, letras, números y _).',
      errorTokenInvalid: 'Token inválido. Asegúrate de copiar el "ACCESS TOKEN".',
      urlDetected: 'URL detectada',
      orLoginWith: 'o inicia sesión con',
      loginWithTwitch: 'Iniciar sesión con Twitch',
      oauthLoading: 'Conectando...',
      oauthError: 'Error al iniciar sesión con Twitch',
      oauthPopupBlocked: 'Popup bloqueado. Permite popups para este sitio.',
    },
    nav: {
      panel: 'Panel',
      poll: 'Encuesta',
      pollDescription: 'Crea votaciones interactivas para tu audiencia',
      judge: 'Jurado',
      judgeDescription: 'Panel de puntuación en vivo',
      giveaway: 'Sorteos',
      giveawayDescription: 'Sorteos y giveaways para tu comunidad',
      countdown: 'Countdown',
      countdownDescription: 'Temporizador con cuenta atrás para eventos',
      spinner: 'Ruleta',
      spinnerDescription: 'Ruleta de la fortuna para decisiones aleatorias',
      dynamics: 'Dinámicas',
      dynamicsSelector: 'Selector de dinámicas',
      dynamicsDescription: 'Selecciona una actividad interactiva para tu stream',
      availableActivities: 'Actividades disponibles',
      backToSelector: 'Volver',
      gallery: 'Galería',
      data: 'Data',
      history: 'Historial',
      activity: 'Actividad',
      analytics: 'Analytics',
      chat: 'Chat',
      stream: 'Stream',
      notConnected: 'No conectado',
      connectToChannel: 'Conéctate a un canal de Twitch para ver el stream.',
      invalidChannel: 'Canal inválido',
      invalidChannelName: 'El nombre del canal no es válido.',
      twitchStream: 'Stream de Twitch',
      loadStream: 'Cargar Stream',
      openInTwitch: 'Abrir en Twitch',
      copyLink: 'Copiar enlace',
      closeStream: 'Cerrar stream',
      sounds: 'Sonidos',
      games: 'Juegos',
      platforms: 'Plataformas',
      platformsSelector: 'Selector de plataformas',
      platformsDescription: 'Selecciona una plataforma para acceder a sus herramientas',
      availablePlatforms: 'Plataformas disponibles',
    },
    poll: {
      title: 'Encuesta',
      liveTitle: 'Encuesta en Vivo',
      createTitle: 'Crear Encuesta',
      question: 'Pregunta',
      questionPlaceholder: '¿Cuál es tu pregunta?',
      options: 'Opciones',
      optionPlaceholder: 'Opción',
      addOption: 'Añadir opción',
      removeOption: 'Eliminar opción',
      create: 'Crear Encuesta',
      stop: 'Detener',
      reset: 'Reiniciar',
      active: 'Activa',
      ended: 'Finalizada',
      totalVotes: 'Votos totales',
      votes: 'votos',
      votesLabel: 'votos',
      winner: 'Ganador',
      viewDetails: 'Ver Detalles',
      ofTotal: 'del total',
      noVotes: 'Sin votos aún',
      waitingPoll: 'Esperando encuesta...',
      createPollHint: 'Crea una encuesta en el panel principal',
      duration: 'Duración',
      maxVotes: 'Límite de votos',
      unlimited: 'Sin límite',
      seconds: 'segundos',
      minutes: 'minutos',
      timeRemaining: 'Tiempo restante',
      voteWith: 'Vota escribiendo',
      openOverlay: 'Abrir Overlay',
      copyOverlayUrl: 'Copiar URL del Overlay',
      urlCopied: 'URL copiada al portapapeles',
      confirm: 'Confirmar Encuesta',
      confirmHint: 'Revisa los detalles antes de lanzar.',
      preview: 'Vista Previa',
      save: 'Guardar',
      saveTemplate: 'Guardar como Plantilla',
      apply: 'Aplicar',
      cancel: 'Cancelar',
      goal: 'Meta',
      goalTooltip: 'Detiene al llegar a X votos',
      writeQuestion: 'Escribe una pregunta para guardar.',
      minOptions: 'La encuesta debe tener al menos 2 opciones.',
      storageFull: 'No se pudo guardar: Límite de almacenamiento excedido.',
      templateSaved: 'Plantilla guardada correctamente.',
      replaceOptions: 'Esto reemplazará las opciones actuales. ¿Deseas continuar?',
      noPollActive: 'No hay votación activa',
      createInPanel: 'Crea una encuesta en el Panel para ver la vista previa.',
      shareVotes: '{label}: {percentage}% de los votos',
      obsOverlay: 'Overlay para OBS',
      obsHint: 'Muestra la encuesta en tu stream con Window Capture.',
      quick: 'Rápido',
      yesNo: 'Sí / No',
      sectionTitle: 'Título de Sección',
      sectionTitleTooltip: "Aparece sobre la pregunta (ej: 'Votando Ahora')",
      questionLabel: 'Pregunta',
      questionTooltip: 'La pregunta principal para los viewers',
      questionPlaceholderFull: '¿Qué jugamos hoy?',
      responseOptions: 'Opciones de Respuesta',
      addOptionBtn: 'Agregar Opción',
      timeSec: 'Tiempo (Seg)',
      barColor: 'Barra',
      limitColor: 'Límite',
      votePrefix: 'Prefijo',
      votePrefixTooltip: 'Símbolo para votar (ej: +1, !1, #1)',
      voteKeyTooltip: 'Palabra clave para votar (ej: si, no, rojo)',
      matchMode: 'Modo',
      matchModeTooltip: 'Exacto: debe coincidir exactamente. Parcial: puede estar dentro del mensaje.',
      matchExact: 'Exacto',
      matchPartial: 'Parcial',
      startPoll: 'Iniciar Votación',
      clearForm: 'Limpiar Formulario',
      templates: 'Plantillas',
      myTemplates: 'Mis Plantillas',
      favorites: 'Favoritos',
      uploadImage: 'Subir Imagen',
      galleryBtn: 'Galería',
      presetApplied: 'Preset aplicado.',
      templateLoaded: 'Plantilla cargada.',
      invalidImageType: 'El archivo debe ser una imagen válida (JPG, PNG, GIF).',
      imageTooLarge: 'La imagen es demasiado grande (Máx 40MB).',
      fileReadError: 'Error al leer el archivo. Intenta de nuevo.',
      iconSavedToGallery: 'Icono procesado y guardado en Galería.',
      imageProcessError: 'Error al procesar la imagen en el navegador.',
      imageDamaged: 'El archivo de imagen parece estar dañado.',
      needTwoOptions: 'Se necesitan al menos 2 opciones.',
      completeAllFields: 'Completa la pregunta y todas las opciones.',
      allOptionsNeedLabel: 'Todas las opciones deben tener una etiqueta.',
      option: 'Opción',
      noOptionsToImport: 'No hay opciones para importar',
      optionsImported: 'opciones importadas',
      quickPollCreated: '¡Encuesta rápida Sí/No creada!',
      spinnerWheel: 'Ruleta',
      randomWinnerTooltip: 'Sortea un ganador entre los viewers',
      raffle: 'Sorteo',
    },
    moderation: {
      title: 'Moderación de Votos',
      config: 'Configuración',
      stats: 'Estadísticas',
      log: 'Registro',
      accepted: 'Aceptados',
      rejected: 'Rechazados',
      voteChanged: 'Cambios de voto',
      acceptanceRate: 'Tasa de aceptación',
      reset: 'Restablecer',
      minAccountAge: 'Edad Mín. Cuenta (días)',
      minAccountAgeTooltip: 'Cuentas más nuevas serán rechazadas. Pon 0 para permitir todas.',
      allowVoteChanges: 'Permitir Cambio de Voto',
      allowVoteChangesTooltip: 'Si está desactivado, los usuarios no pueden cambiar su voto.',
      enabled: 'Activado',
      disabled: 'Desactivado',
      cooldown: 'Cooldown (segundos)',
      cooldownTooltip: 'Tiempo que deben esperar para cambiar su voto.',
      voteWeights: 'Pesos de Voto (1-5)',
      voteWeightsTooltip: 'Mayor peso da más poder de voto a suscriptores/seguidores.',
      subscriber: 'Suscriptor',
      follower: 'Seguidor',
      regularUsers: 'Usuarios regulares siempre tienen peso 1x',
      presets: 'Presets',
      presetName: 'Nombre del preset...',
      loadPreset: 'Cargar Preset',
      noPresets: 'No hay presets guardados',
      presetSaved: 'Preset "{name}" guardado',
      presetLoaded: 'Preset "{name}" cargado',
      presetDeleted: 'Preset "{name}" eliminado',
      enterPresetName: 'Ingresa un nombre para el preset',
      resetDefaults: 'Configuración restablecida',
      whitelist: 'Lista de Votantes Permitidos',
      whitelistTooltip: 'Solo estos usuarios podrán votar. Un nombre por línea.',
      whitelistEnabled: 'Activar lista permitidos',
      whitelistPlaceholder: 'usuario1\nusuario2\nusuario3',
      whitelistCount: '{count} usuarios',
      blacklist: 'Lista de Votantes Exclusiones',
      blacklistTooltip: 'Estos usuarios NO podrán votar. Un nombre por línea.',
      blacklistEnabled: 'Activar lista exclusiones',
      blacklistPlaceholder: 'troll1\nspammer2\nbot3',
      blacklistCount: '{count} bloqueados',
      reasons: {
        accountTooNew: 'Cuenta muy nueva',
        cooldownActive: 'Cooldown activo',
        alreadyVoted: 'Ya votó',
        invalidOption: 'Opción inválida',
        voteChangeCooldown: 'Cooldown de cambio',
        notWhitelisted: 'No en lista blanca',
        blacklisted: 'Usuario bloqueado',
      },
    },
    gallery: {
      title: 'Galería de Medios',
      upload: 'Subir',
      delete: 'Eliminar',
      noAssets: 'No hay imágenes',
      uploadHint: 'Sube imágenes para usar en tus encuestas',
      storageFull: 'Espacio lleno. Elimina imágenes antiguas.',
      dragDrop: 'Arrastra y suelta aquí',
      maxSize: 'Máximo 2MB',
    },
    analytics: {
      title: 'Analytics del Stream',
      configureAI: 'Configurar IA',
      aiActive: 'Activa',
      noData: 'Sin datos disponibles',
      live: 'En vivo',
      history: 'Historial',
      activeSession: 'Sesión activa',
      noActiveStream: 'No hay stream activo',
      connectToSee: 'Conecta a un canal para ver analytics en vivo',
      uniqueViewers: 'Viewers únicos',
      messages: 'Mensajes',
      positive: 'Positivo',
      neutral: 'Neutral',
      negative: 'Negativo',
      engagement: 'Engagement',
      mainTopics: 'Temas principales',
      frequentWords: 'Palabras frecuentes',
      mostUsedEmotes: 'Emotes más usados',
      mostActiveViewers: 'Viewers más activos',
      msgs: 'msgs',
      sessionsThisDay: 'sesión(es) este día',
      totalMessages: 'Total mensajes',
      noSessionsDate: 'No hay sesiones para esta fecha',
      exportData: 'Exportar datos',
      loading: 'Cargando...',
    },
    aiConfig: {
      title: 'Configuración IA',
      optional: 'Opcional',
      description: 'Conecta una IA para analizar tu chat y obtener insights avanzados al final de cada stream.',
      provider: 'Proveedor',
      apiKey: 'API Key',
      apiKeyPlaceholder: 'Tu {provider} API key...',
      saved: '¡Guardado!',
      save: 'Guardar',
      test: 'Test',
      connectionSuccess: '✓ Conexión exitosa!',
      connectionError: '✗ Error de conexión',
      aiAnalysis: 'Análisis con IA',
      activateInsights: 'Activa para obtener insights avanzados',
      noApiKeyHint: '💡 Sin API key, se usará análisis local básico.',
      getApiKey: 'Obtener API key de {provider} →',
    },
    history: {
      title: 'Historial de Encuestas',
      noPastPolls: 'No hay encuestas anteriores',
      viewDetails: 'Ver detalles',
      exportData: 'Exportar datos',
    },
    unifiedHistory: {
      title: 'Historial Unificado',
      subtitle: 'items en total',
      noItems: 'No hay items en el historial',
      adjustFilters: 'Prueba ajustando los filtros',
      all: 'Todo',
      polls: 'Encuestas',
      predictions: 'Predicciones',
      giveaways: 'Sorteos',
      commands: 'Comandos',
      timers: 'Timers',
      search: 'Buscar en historial...',
      filters: 'Filtros',
      dateFrom: 'Desde',
      dateTo: 'Hasta',
      clearFilters: 'Limpiar',
      export: 'Exportar',
      import: 'Importar',
      clear: 'Limpiar',
      close: 'Cerrar',
      delete: 'Eliminar',
      confirmClearAll: '¿Eliminar TODO el historial?',
      confirmClearCategory: '¿Eliminar historial de {category}?',
      importSuccess: 'Importados {count} items',
      importError: 'Error al importar',
      winner: 'Ganador',
      participants: 'participantes',
      votes: 'votos',
      executions: 'ejecuciones',
      interval: 'intervalo',
      executedBy: 'Ejecutado por',
      channel: 'Canal',
    },
    overlay: {
      title: 'Personalizar Overlay',
      customize: 'Personalizar',
      background: 'Fondo',
      textColor: 'Color de Texto',
      borderColor: 'Color de Bordes',
      showBorders: 'Mostrar Bordes',
      fontSize: 'Tamaño de Texto',
      fontStyle: 'Estilo de Texto',
      theme: 'Tema de Fondo',
      light: 'Claro',
      dark: 'Oscuro',
      small: 'S',
      medium: 'M',
      large: 'L',
      normal: 'Normal',
      bold: 'Bold',
      italic: 'Italic',
      chromaKey: 'Chroma Key',
      waitingPoll: 'Esperando encuesta...',
      mode: 'OVERLAY MODE',
      forOBS: 'Para OBS',
      size: 'Tamaño',
      normalSize: 'Normal',
      largeSize: 'Grande',
    },
    notifications: {
      pollCreated: 'Encuesta creada',
      pollEnded: 'Encuesta finalizada',
      pollReset: 'Encuesta reiniciada',
      connectionError: 'Error de conexión',
      storageFull: 'Espacio de almacenamiento lleno',
      copied: 'Copiado al portapapeles',
      saved: 'Guardado correctamente',
      deleted: 'Eliminado correctamente',
      autoEnded: 'Encuesta finalizada por tiempo/límite.',
    },
    chat: {
      newPoll: '📊 Nueva Encuesta',
      options: 'Opciones',
      voteHint: 'Vota escribiendo +1, +2, etc.',
      pollEnded: '🏁 Encuesta Finalizada',
      winner: '🏆 Ganador',
      withVotes: 'con {votes} votos',
      liveChat: 'Chat en Vivo',
      waitingMessages: 'Esperando mensajes...',
      newMessages: 'Nuevos mensajes',
      alreadyRegistered: 'Ya registrado',
      votedFor: 'Votó por',
    },
    mascot: {
      title: 'AI Vision',
      chatSentiment: 'Sentimiento del chat',
      positive: 'Positivo',
      neutral: 'Neutral',
      negative: 'Negativo',
      messages: 'Mensajes',
      votes: 'Votos',
      viewers: 'Viewers',
      intensity: 'Intensidad',
      helpConnectionFailed: 'Verifica que el nombre del canal sea correcto y que tengas conexión a internet',
      helpPollEmpty: 'Añade al menos 2 opciones para crear una encuesta',
      helpNoVotes: 'Intenta anunciar la encuesta en el chat o hacer la pregunta más llamativa',
      helpRepeatedAction: 'Parece que algo no está funcionando como esperabas',
      helpIdle: 'Puedo ayudarte a crear encuestas, analizar el chat y más',
      msgConnectionFailed: '¡No te preocupes! Vamos a intentarlo de nuevo',
      msgPollEmpty: 'Hmm... parece que la encuesta necesita opciones',
      msgNoVotes: 'El chat está muy tranquilo...',
      msgRepeatedAction: '¿Necesitas ayuda con algo?',
      msgIdle: '¡Aquí estoy si me necesitas!',
      msgChatPositive: '¡Qué buen ambiente! 💜',
      msgChatNegative: 'El chat parece un poco tenso...',
      msgChatExcited: '¡El chat está ON FIRE! 🔥',
      msgNotConnected: '¡Hola! Conecta un canal para empezar',
      msgPollGoing: '¡{votes} votos! La encuesta va genial',
      msgWaitingVotes: 'Esperando los primeros votos...',
      msgWatching: 'Observando el chat... 👀',
      dragToMove: 'Arrastra para mover',
      msgLove: '¡Mucho amor en el chat! 💜',
      msgSurprised: '¡Wow! ¿Qué pasó? 😱',
      msgAngry: 'El chat está intenso... 😅',
      msgSleepy: '💤 Esperando actividad...',
      msgHappy: '¡Buen ambiente! 😊',
      msgSad: 'El chat está triste... 😢',
    },
    chatSimulator: {
      title: 'Simulador de Chat',
      active: 'Activo',
      start: 'Iniciar',
      pause: 'Pausar',
      reset: 'Reset',
      settings: 'Configuración',
      context: 'Contexto',
      generic: 'General',
      poll: 'Encuesta',
      game: 'Juego',
      trivia: 'Trivia',
      giveaway: 'Sorteo',
      messagesPerMinute: 'Mensajes por minuto',
      relevantProbability: 'Prob. mensaje relevante',
      uniqueUsers: 'Usuarios únicos',
      burst: 'Ráfaga',
      simulateVotes: 'Simular votos',
      simulateJoins: 'Simular joins',
    },
    soundboard: {
      title: 'Panel de Sonidos',
      bitSounds: 'Sonidos BIT',
      customSounds: 'Mis Sonidos',
      bitDescription: 'Sonidos generados digitalmente (8-bit style)',
      noCustomSounds: 'No hay sonidos personalizados',
      uploadHint: 'Sube archivos de audio para usarlos en tu stream',
    },
    randomWinner: {
      title: 'Random Winner',
      subtitle: 'Selecciona un ganador aleatorio del chat',
      openOverlay: 'Abrir Overlay para OBS',
      viewers: 'Viewers',
      keyword: 'Palabra Clave',
      subsOnly: 'Solo Suscriptores',
      keywordLabel: 'Palabra Clave',
      keywordPlaceholder: 'Ej: participar, sorteo, yo...',
      timeLimit: 'Tiempo límite (segundos)',
      availableParticipants: 'Participantes disponibles',
      subsInChat: 'suscriptores en el chat',
      usersInChat: 'usuarios en el chat',
      time: 'Tiempo',
      participants: 'Participantes',
      winner: '¡GANADOR!',
      selectWinner: 'Seleccionar Ganador',
      selecting: 'Seleccionando...',
      chooseWinner: 'Elegir Ganador',
      startCollection: 'Iniciar Recolección',
      finishAndChoose: 'Terminar y Elegir',
      newRaffle: 'Nuevo Sorteo',
      resetRaffle: 'Reiniciar sorteo',
      clearAll: 'Limpiar Todo (Resetear Participantes)',
      clearAllHint: 'Resetea participantes y configuración',
      viewersHint: 'Selecciona un ganador de los usuarios que han escrito en el chat',
      keywordHint: 'Los usuarios deben escribir la palabra clave para participar',
      waitingRaffle: 'Esperando sorteo...',
      // Tooltips
      subsOnlyTooltip: 'Solo usuarios suscritos al canal pueden participar en el sorteo',
      useTimerTooltip: 'Limita el tiempo de participación. Sin timer, el sorteo permanece abierto indefinidamente',
      keywordTooltip: 'Los usuarios deben escribir esta palabra en el chat para participar',
      timeLimitTooltip: 'Duración en segundos del período de participación',
      // Error messages
      errors: {
        noValidParticipants: 'No hay participantes válidos (todos están en la lista de prohibidos)',
        userAlreadyParticipating: 'Este usuario ya está participando',
        userAlreadyInChat: 'Este usuario ya está en el chat',
        usersAddedToBlacklist: '{count} usuarios añadidos a la lista de prohibidos',
        participantsAdded: 'Añadidos: {added}{duplicates}',
        needOAuthChatters: 'Necesitas conectarte con OAuth y el permiso moderator:read:chatters',
        needOAuthConnection: 'Necesitas estar conectado con un token OAuth',
        couldNotGetChannelId: 'No se pudo obtener el ID del canal',
        tokenMissingChattersScope: 'Token sin permiso. Genera uno nuevo con scope: moderator:read:chatters',
        errorLoadingChatters: 'Error al cargar chatters',
        needOAuthSubscribers: 'Necesitas conectarte con OAuth y el permiso channel:read:subscriptions',
        tokenMissingSubsScope: 'Token sin permiso. Genera uno nuevo con scope: channel:read:subscriptions',
        errorLoadingSubscribers: 'Error al cargar suscriptores',
        incompatibleFileVersion: 'Versión de archivo no compatible',
      },
      // Presets
      presets: {
        quick: 'Sorteo Rápido',
        quickDescription: 'Viewers del chat, sin timer',
        keyword: 'Sorteo por Keyword',
        keywordDescription: 'Palabra clave, 60 segundos',
        subs: 'Sorteo de Subs',
        subsDescription: 'Solo suscriptores',
      },
    },
    spinner: {
      winnerTextColor: 'Color de texto ganador',
      optionsTitle: 'Opciones de la Ruleta',
      presetsTitle: 'Plantillas rápidas',
      presetYesNo: 'Sí/No',
      presetNumbers: 'Números 1-6',
      presetDecisions: 'Decisiones A-D',
      presetPrizes: 'Premios',
      newOptionPlaceholder: 'Nueva opción...',
      clearAll: 'Limpiar todas',
      spinning: 'Girando...',
      spin: 'Girar',
    },
    collaboration: {
      title: 'Colaboración',
      mainChannel: 'Principal',
      placeholder: 'Canal colaborador...',
      remove: 'Quitar',
      errorAdding: 'No se pudo agregar el canal',
      helpText: 'Agrega canales de streamers colaboradores para ver sus mensajes y votos en tiempo real.',
      channelAdded: 'Canal colaborador agregado',
      channelRemoved: 'Canal colaborador eliminado',
    },
    games: {
      title: 'Juegos del Stream',
      subtitle: 'Juegos interactivos para tu stream',
      piumBall: 'Pium Ball',
      piumDesc: 'Los viewers lanzan bolas con !pium',
      casinoRoulette: 'Ruleta Casino',
      rouletteDesc: 'Apuesta con !ruleta-27',
      active: 'Activo',
      paused: 'Pausado',
      balls: 'bolas',
      bets: 'apuestas',
      openOverlay: 'Abrir Overlay OBS',
      clearBalls: 'Limpiar bolas',
      spin: 'Girar',
      spinning: 'Girando...',
      reset: 'Reiniciar',
      autoSpin: 'Auto-spin',
      bettingOpen: 'Apuestas abiertas',
      bettingClosed: 'Apuestas cerradas',
      winners: 'ganador(es)',
      waitingBets: 'Esperando apuestas...',
      waitingPium: 'Esperando !pium del chat...',
      // New games
      chatFishing: 'Pesca de Chat',
      fishingDesc: 'Pesca mensajes del chat',
      hotPotato: 'Patata Caliente',
      potatoDesc: 'Pasa la papa con !pass',
      triviaBattle: 'Trivia Battle',
      triviaDesc: 'Responde preguntas con 1-4',
      fish: 'peces',
      fishing: 'Pescando...',
      cast: '¡Pescar!',
      catch: '¡Captura!',
      points: 'pts',
      round: 'Ronda',
      join: 'Unirse',
      pass: 'Pasar',
      eliminated: 'eliminado',
      waiting: 'Esperando',
      question: 'Pregunta',
      answer: 'Respuesta',
      correct: '¡Correcto!',
      wrong: 'Incorrecto',
      streak: 'Racha',
      leaderboard: 'Ranking',
      startGame: '¡Empezar!',
      nextRound: 'Siguiente',
      finalResults: '¡Resultados!',
      // Battleship & Duck Hunt
      battleship: 'Hundir la Flota',
      battleshipDesc: 'Dispara con coordenadas A1-J10',
      duckHunt: 'Caza de Patos',
      duckHuntDesc: 'Escribe !pato para jugar',
      ships: 'barcos',
      shipsRemaining: 'barcos restantes',
      hit: '¡Tocado!',
      miss: 'Agua',
      sunk: '¡Hundido!',
      allShipsSunk: '¡Todos los barcos hundidos!',
      shots: 'disparos',
      ducks: 'patos',
      shoot: 'Disparar',
      accuracy: 'Precisión',
    },
    judgePanel: {
      // Tooltips
      criteriaWeightTooltip: 'Multiplicador de importancia. Mayor peso = más impacto en puntuación final',
      publicVoteWeightTooltip: 'Porcentaje del voto público en la puntuación final (0-100%)',
      votePrefixTooltip: 'Carácter que los usuarios escriben antes de su voto (ej: +1, #1)',
      // Error messages
      errors: {
        missingCriteriaAndContestants: 'Falta añadir: criterios y concursantes',
        missingCriteria: 'Falta añadir: criterios',
        missingContestants: 'Falta añadir: concursantes',
      },
      // Presets
      presets: {
        basic: 'Torneo Básico',
        basicDescription: '3 criterios estándar',
        public: 'Torneo con Público',
        publicDescription: '3 criterios + votación pública 30%',
        // Criteria names
        criteria: {
          creativity: 'Creatividad',
          execution: 'Ejecución',
          originality: 'Originalidad',
        },
      },
    },
    platforms: {
      // General
      comingSoon: 'Próximamente',
      back: 'Volver',
      backToPlatforms: 'Volver a plataformas',
      availableTools: 'Herramientas disponibles',
      connected: 'Conectado',
      connecting: 'Conectando...',
      disconnected: 'Desconectado',
      error: 'Error de conexión',
      platformConnected: '1 plataforma conectada',
      platformsConnected: '{count} plataformas conectadas',
      platformsDescriptionMulti: 'Conecta múltiples plataformas de streaming',
      selectPlatforms: 'Seleccionar plataformas',
      // Twitch
      twitchTitle: 'Twitch',
      twitchDescription: 'Comandos, predicciones y más',
      twitchToolsDescription: 'Herramientas y funcionalidades de Twitch',
      backToTwitchTools: 'Volver a herramientas de Twitch',
      // YouTube
      youtubeTitle: 'YouTube',
      youtubeDescription: 'Chat en vivo y encuestas',
      youtubeToolsDescription: 'Herramientas y funcionalidades de YouTube',
      backToYoutubeTools: 'Volver a herramientas de YouTube',
      youtubeConnect: 'Conectar con YouTube',
      youtubeDisconnect: 'Desconectar YouTube',
      youtubeLiveChat: 'Chat en vivo',
      youtubePolls: 'Encuestas de YouTube',
      // Kick
      kickTitle: 'Kick',
      kickDescription: 'Chat en tiempo real',
      kickToolsDescription: 'Herramientas y funcionalidades de Kick',
      backToKickTools: 'Volver a herramientas de Kick',
      kickConnect: 'Conectar con Kick',
      kickDisconnect: 'Desconectar Kick',
      kickLiveChat: 'Chat en vivo',
      // Tools
      commands: 'Comandos',
      commandsDescription: 'Comandos personalizados de chat',
      predictions: 'Predicciones',
      predictionsDescription: 'Predicciones de Twitch',
      channelPoints: 'Channel Points',
      channelPointsDescription: 'Recompensas de puntos',
    },
    // Predictions
    predictions: {
      title: 'Predicciones',
      createTitle: 'Crear Predicción',
      activeTitle: 'Predicción Activa',
      historyTitle: 'Historial de Predicciones',
      // Form
      predictionTitle: 'Título',
      predictionTitlePlaceholder: '¿Quién ganará?',
      outcomes: 'Opciones',
      outcomePlaceholder: 'Opción',
      addOutcome: 'Añadir opción',
      removeOutcome: 'Eliminar opción',
      duration: 'Duración',
      durationSeconds: 'segundos',
      minOutcomes: 'Mínimo 2 opciones',
      maxOutcomes: 'Máximo 10 opciones',
      // Actions
      create: 'Crear Predicción',
      lock: 'Bloquear',
      resolve: 'Resolver',
      cancel: 'Cancelar',
      creating: 'Creando...',
      locking: 'Bloqueando...',
      resolving: 'Resolviendo...',
      canceling: 'Cancelando...',
      // Status
      statusActive: 'Activa',
      statusLocked: 'Bloqueada',
      statusResolved: 'Resuelta',
      statusCanceled: 'Cancelada',
      // Display
      voters: 'votantes',
      points: 'puntos',
      totalPoints: 'Puntos totales',
      totalVoters: 'Votantes totales',
      topPredictors: 'Top Predictores',
      selectWinner: 'Seleccionar ganador',
      winningOutcome: 'Opción ganadora',
      // History
      noHistory: 'No hay predicciones anteriores',
      viewDetails: 'Ver detalles',
      participants: 'participantes',
      // Messages
      noPrediction: 'No hay predicción activa',
      createHint: 'Crea una predicción para involucrar a tu audiencia',
      partnerRequired: 'Partner/Affiliate requerido',
      partnerRequiredDesc: 'Las predicciones solo están disponibles para Partners y Affiliates de Twitch',
      scopeRequired: 'Permisos requeridos',
      scopeRequiredDesc: 'Necesitas reconectar tu cuenta con permisos de predicciones',
      predictionCreated: 'Predicción creada',
      predictionLocked: 'Predicción bloqueada',
      predictionResolved: 'Predicción resuelta',
      predictionCanceled: 'Predicción cancelada',
      // Errors
      errorCreating: 'Error al crear predicción',
      errorLocking: 'Error al bloquear predicción',
      errorResolving: 'Error al resolver predicción',
      errorCanceling: 'Error al cancelar predicción',
      errorLoading: 'Error al cargar predicciones',
      // Validation
      titleRequired: 'El título es requerido',
      outcomesRequired: 'Se requieren al menos 2 opciones',
      durationRange: 'La duración debe ser entre 30 y 1800 segundos',
      uniqueOutcomes: 'Las opciones deben ser únicas',
    },
    // Channel Points / Rewards
    rewards: {
      title: 'Channel Points',
      createTitle: 'Crear Recompensa',
      editTitle: 'Editar Recompensa',
      redemptionsTitle: 'Redenciones',
      // Form
      rewardTitle: 'Título',
      rewardTitlePlaceholder: 'Nombre de la recompensa',
      cost: 'Costo',
      costPlaceholder: '100',
      description: 'Descripción',
      descriptionPlaceholder: 'Descripción de la recompensa...',
      backgroundColor: 'Color de fondo',
      // Limits
      maxPerStream: 'Máximo por stream',
      maxPerStreamEnabled: 'Limitar por stream',
      maxPerUser: 'Máximo por usuario',
      maxPerUserEnabled: 'Limitar por usuario',
      globalCooldown: 'Cooldown global',
      globalCooldownEnabled: 'Activar cooldown',
      cooldownSeconds: 'segundos',
      // Options
      userInputRequired: 'Requiere texto del usuario',
      skipQueue: 'Saltar cola de aprobación',
      enabled: 'Habilitada',
      paused: 'Pausada',
      // Actions
      create: 'Crear Recompensa',
      update: 'Actualizar',
      delete: 'Eliminar',
      enable: 'Habilitar',
      disable: 'Deshabilitar',
      creating: 'Creando...',
      updating: 'Actualizando...',
      deleting: 'Eliminando...',
      // Redemptions
      redemptions: 'Redenciones',
      pendingRedemptions: 'Redenciones pendientes',
      noRedemptions: 'No hay redenciones pendientes',
      fulfill: 'Completar',
      reject: 'Rechazar',
      fulfilling: 'Completando...',
      rejecting: 'Rechazando...',
      filterByReward: 'Filtrar por recompensa',
      allRewards: 'Todas las recompensas',
      redeemedBy: 'Canjeado por',
      redeemedAt: 'Canjeado el',
      userInput: 'Mensaje del usuario',
      // Status
      statusUnfulfilled: 'Pendiente',
      statusFulfilled: 'Completada',
      statusCanceled: 'Rechazada',
      // Messages
      noRewards: 'No hay recompensas configuradas',
      createHint: 'Crea recompensas personalizadas para tu canal',
      scopeRequired: 'Permisos requeridos',
      scopeRequiredDesc: 'Necesitas reconectar tu cuenta con permisos de Channel Points',
      rewardCreated: 'Recompensa creada',
      rewardUpdated: 'Recompensa actualizada',
      rewardDeleted: 'Recompensa eliminada',
      rewardEnabled: 'Recompensa habilitada',
      rewardDisabled: 'Recompensa deshabilitada',
      redemptionFulfilled: 'Redención completada',
      redemptionRejected: 'Redención rechazada',
      // Errors
      errorCreating: 'Error al crear recompensa',
      errorUpdating: 'Error al actualizar recompensa',
      errorDeleting: 'Error al eliminar recompensa',
      errorLoading: 'Error al cargar recompensas',
      errorFulfilling: 'Error al completar redención',
      errorRejecting: 'Error al rechazar redención',
      // Validation
      titleRequired: 'El título es requerido',
      costRequired: 'El costo es requerido',
      costMin: 'El costo mínimo es 1',
    },
    // Commands Import/Export
    commandsExport: {
      export: 'Exportar',
      import: 'Importar',
      exporting: 'Exportando...',
      importing: 'Importando...',
      // Export
      exportTitle: 'Exportar Comandos',
      exportDescription: 'Descarga tus comandos como archivo JSON',
      exportSuccess: 'Comandos exportados correctamente',
      exportError: 'Error al exportar comandos',
      noCommandsToExport: 'No hay comandos para exportar',
      // Import
      importTitle: 'Importar Comandos',
      importDescription: 'Sube un archivo JSON con comandos',
      selectFile: 'Seleccionar archivo',
      dragDropFile: 'Arrastra un archivo aquí o haz clic para seleccionar',
      importMode: 'Modo de importación',
      modeMerge: 'Combinar',
      modeMergeDesc: 'Añade nuevos comandos sin eliminar los existentes',
      modeReplace: 'Reemplazar',
      modeReplaceDesc: 'Reemplaza todos los comandos existentes',
      importSuccess: 'Comandos importados correctamente',
      importError: 'Error al importar comandos',
      // Validation
      invalidFormat: 'Formato de archivo inválido',
      invalidVersion: 'Versión de archivo no soportada',
      invalidCommands: 'El archivo contiene comandos inválidos',
      commandsImported: 'comandos importados',
      commandsSkipped: 'comandos omitidos',
      duplicatesFound: 'Se encontraron duplicados',
      // Confirmation
      confirmReplace: '¿Reemplazar comandos?',
      confirmReplaceDesc: 'Esto eliminará todos los comandos existentes',
    },
    // Timers
    timers: {
      title: 'Timers',
      subtitle: 'Mensajes automáticos',
      description: 'Envía mensajes al chat de forma periódica',
      tabTimers: 'Timers',
      tabTemplates: 'Plantillas',
      tabGroups: 'Grupos',
      tabLog: 'Historial',
      engineRunning: 'Motor activo',
      engineStopped: 'Motor detenido',
      startEngine: 'Iniciar',
      stopEngine: 'Detener',
      chatLines: 'Líneas de chat',
      createTimer: 'Crear Timer',
      editTimer: 'Editar Timer',
      timerName: 'Nombre',
      timerNamePlaceholder: 'Ej: Redes sociales',
      timerMessage: 'Mensaje',
      timerMessagePlaceholder: 'Ej: ¡Sígueme en Twitter! twitter.com/$(channel)',
      timerInterval: 'Intervalo (minutos)',
      timerMinLines: 'Líneas mínimas de chat',
      timerMinLinesHelp: 'El timer solo se ejecutará si hay al menos esta cantidad de mensajes en el chat',
      timerGroup: 'Grupo',
      timerEnabled: 'Habilitado',
      timerNoGroup: 'Sin grupo',
      save: 'Guardar',
      cancel: 'Cancelar',
      noTimers: 'No hay timers configurados',
      noTimersDescription: 'Crea tu primer timer o usa una plantilla',
      nextExecution: 'Próxima ejecución',
      lastExecution: 'Última ejecución',
      never: 'Nunca',
      executeNow: 'Ejecutar ahora',
      edit: 'Editar',
      delete: 'Eliminar',
      deleteConfirm: '¿Eliminar este timer?',
      everyMinutes: 'cada {minutes} min',
      minLines: 'mín. {lines} líneas',
      templatesTitle: 'Plantillas',
      templatesDescription: 'Usa plantillas predefinidas para configurar rápidamente',
      useTemplate: 'Usar plantilla',
      templateCategories: {
        social: 'Redes Sociales',
        rules: 'Reglas',
        discord: 'Discord',
        donations: 'Donaciones',
        commands: 'Comandos',
      },
      groupsTitle: 'Grupos',
      groupsDescription: 'Organiza tus timers en grupos',
      createGroup: 'Crear grupo',
      editGroup: 'Editar grupo',
      groupName: 'Nombre del grupo',
      groupColor: 'Color',
      groupTimerCount: '{count} timers',
      noGroups: 'No hay grupos',
      noGroupsDescription: 'Crea grupos para organizar tus timers',
      deleteGroupConfirm: '¿Eliminar este grupo? Los timers se moverán a "Sin grupo"',
      generalGroup: 'General',
      logTitle: 'Historial de ejecución',
      logDescription: 'Últimos mensajes enviados',
      clearLog: 'Limpiar historial',
      noLogEntries: 'No hay entradas en el historial',
      logSuccess: 'Enviado',
      logError: 'Error',
      variablesTitle: 'Variables disponibles',
      variablesHelp: 'Usa estas variables en tus mensajes:',
      variables: {
        channel: 'Nombre del canal',
        game: 'Juego actual',
        uptime: 'Tiempo de stream',
        viewers: 'Viewers actuales',
        followers: 'Total seguidores',
        date: 'Fecha actual',
        time: 'Hora actual',
      },
      nameRequired: 'El nombre es requerido',
      messageRequired: 'El mensaje es requerido',
      intervalMin: 'El intervalo mínimo es 1 minuto',
      intervalMax: 'El intervalo máximo es 120 minutos',
      timerCreated: 'Timer creado',
      timerUpdated: 'Timer actualizado',
      timerDeleted: 'Timer eliminado',
      timerExecuted: 'Timer ejecutado',
      groupCreated: 'Grupo creado',
      groupUpdated: 'Grupo actualizado',
      groupDeleted: 'Grupo eliminado',
      notConnected: 'Chat no conectado',
      notConnectedDescription: 'Conecta al chat para que los timers puedan enviar mensajes',
      toggleTimer: 'Activar/desactivar timer',
      toggleGroup: 'Activar/desactivar grupo',
      timerOptions: 'Opciones del timer',
      groupOptions: 'Opciones del grupo',
      engineStartedAnnouncement: 'Motor de timers iniciado',
      engineStoppedAnnouncement: 'Motor de timers detenido',
      timerExecutedAnnouncement: 'Timer {name} ejecutado',
      timerErrorAnnouncement: 'Error al ejecutar timer {name}',
    },
    // Onboarding
    onboarding: {
      welcomeTitle: '¡Bienvenido a TwitchVote!',
      welcomeMessage: 'Te guiaré paso a paso por todas las funciones de la app.',
      startTutorial: 'Iniciar Tutorial',
      skipTutorial: 'Saltar',
      nextStep: 'Siguiente',
      previousStep: 'Anterior',
      finish: '¡Listo!',
      stepOf: 'Paso {current} de {total}',
      progress: 'Progreso',
      completed: 'completados',
      restartTutorial: 'Tutorial',
      restartTutorialDesc: 'Reinicia el tutorial interactivo para aprender a usar la app',
      restartButton: 'Reiniciar Tutorial',
      interactionRequired: 'Interactúa con el elemento destacado',
      interactionCompleted: '¡Acción completada!',
      clickToInteract: '¡Haz clic aquí!',
      waitingInteraction: 'Esperando interacción...',
      paused: 'Pausado',
      resume: 'Continuar',
      tipDismiss: 'Cerrar',
      tipDismissPermanent: 'No mostrar más',
      tipUnderstood: 'Entendido',
      contextualTipsEnabled: 'Tips contextuales activados',
      contextualTipsDisabled: 'Tips contextuales desactivados',
    },
    backup: {
      title: 'Backup en la Nube',
      selectProvider: 'Selecciona un proveedor de almacenamiento:',
      connected: 'Conectado',
      confirmRestore: '¿Estás seguro de que quieres restaurar? Esto sobrescribirá tu configuración actual.',
      status: {
        synced: 'Sincronizado',
        syncing: 'Sincronizando...',
        pending: 'Pendiente',
        error: 'Error',
        disconnected: 'Desconectado',
      },
      lastBackup: 'Último backup',
      providers: {
        googleDrive: {
          description: 'Almacena tus backups en tu cuenta de Google Drive',
          help: 'Obtén tu token de acceso desde la consola de Google Cloud',
        },
        customServer: {
          name: 'Servidor Propio',
          description: 'Usa tu propio servidor para almacenar backups',
        },
      },
      credentials: {
        title: 'Credenciales',
        optional: 'opcional',
        accessTokenPlaceholder: 'Introduce tu access token...',
        refreshTokenPlaceholder: 'Introduce tu refresh token...',
        apiKeyPlaceholder: 'Introduce tu API key...',
      },
      autoBackup: {
        title: 'Backup Automático',
        description: 'Guarda automáticamente los cambios cada 5 minutos',
      },
      actions: {
        connect: 'Conectar',
        cancel: 'Cancelar',
        disconnect: 'Desconectar',
        backupNow: 'Hacer Backup',
        restore: 'Restaurar',
      },
      messages: {
        connected: 'Conectado correctamente',
        disconnected: 'Desconectado',
        backupSuccess: 'Backup completado correctamente',
        restoreSuccess: 'Restaurados {count} elementos',
      },
      errors: {
        missingToken: 'El access token es requerido',
        missingServerConfig: 'La URL del servidor y API key son requeridos',
        connectionFailed: 'Error al conectar',
        backupFailed: 'Error al hacer backup',
        restoreFailed: 'Error al restaurar',
      },
      securityNote: 'Las credenciales se guardan cifradas en tu navegador. Los datos sensibles (API keys) se encriptan antes de subirse a la nube.',
    },
    // Offline Mode
    offline: {
      offlineBanner: 'Sin conexión a internet',
      reconnected: '¡Conexión restablecida!',
      pendingOperations: 'operaciones pendientes',
      pendingOperation: 'operación pendiente',
      syncing: 'Sincronizando...',
      offline: 'Offline',
      online: 'Online',
    },
    // Push Notifications / External Alerts
    pushNotifications: {
      title: 'Notificaciones',
      subtitle: 'Configura alertas externas para tu stream',
      // Channels
      channels: {
        push: 'Navegador',
        pushDescription: 'Notificaciones del navegador cuando la app está minimizada',
        discord: 'Discord',
        discordDescription: 'Envía alertas a un canal de Discord via webhook',
        telegram: 'Telegram',
        telegramDescription: 'Envía alertas a un chat de Telegram via bot',
      },
      // Channel Status
      status: {
        enabled: 'Habilitado',
        disabled: 'Deshabilitado',
        error: 'Error de configuración',
        permissionDenied: 'Permiso denegado',
        permissionGranted: 'Permiso concedido',
        notSupported: 'No soportado en este navegador',
      },
      // Configuration
      config: {
        webhookUrl: 'URL del Webhook',
        webhookUrlPlaceholder: 'https://discord.com/api/webhooks/...',
        webhookUrlHelp: 'Crea un webhook en tu servidor de Discord y pega la URL aquí',
        botToken: 'Token del Bot',
        botTokenPlaceholder: '123456789:ABCdefGHI...',
        botTokenHelp: 'Crea un bot con @BotFather en Telegram y copia el token',
        chatId: 'Chat ID',
        chatIdPlaceholder: '-1001234567890',
        chatIdHelp: 'ID del chat o grupo donde enviar las alertas',
        username: 'Nombre del Bot (opcional)',
        usernamePlaceholder: 'TwitchVote Alerts',
        avatarUrl: 'Avatar URL (opcional)',
        avatarUrlPlaceholder: 'https://ejemplo.com/avatar.png',
      },
      // Event Types
      events: {
        title: 'Tipos de Eventos',
        follower: 'Nuevo seguidor',
        raid: 'Raid recibido',
        host: 'Host recibido',
        donation: 'Donación',
        subscription: 'Nueva suscripción',
        bits: 'Bits recibidos',
        poll_ended: 'Encuesta finalizada',
        prediction_resolved: 'Predicción resuelta',
        giveaway_winner: 'Ganador de sorteo',
        command_executed: 'Comando ejecutado',
      },
      // Quiet Hours
      quietHours: {
        title: 'Modo Silencioso',
        description: 'Suprime todas las notificaciones durante estas horas',
        enabled: 'Activar modo silencioso',
        start: 'Hora de inicio',
        end: 'Hora de fin',
        active: 'Modo silencioso activo',
      },
      // Actions
      actions: {
        test: 'Probar',
        testSuccess: '¡Notificación de prueba enviada!',
        testError: 'Error al enviar notificación de prueba',
        save: 'Guardar configuración',
        reset: 'Restablecer',
        requestPermission: 'Solicitar permiso',
        enableInstructions: 'Habilita las notificaciones en la configuración de tu navegador',
      },
      // History
      history: {
        title: 'Historial de Notificaciones',
        noEntries: 'No hay notificaciones en el historial',
        sentAt: 'Enviada',
        success: 'Éxito',
        failed: 'Fallida',
        pending: 'Pendiente',
        clear: 'Limpiar historial',
        clearConfirm: '¿Eliminar todo el historial de notificaciones?',
      },
      // Stats
      stats: {
        sentToday: 'Enviadas hoy',
        failed: 'Fallidas',
        pending: 'Pendientes',
      },
      // Messages
      messages: {
        configSaved: 'Configuración guardada',
        configReset: 'Configuración restablecida',
        permissionGranted: 'Permiso de notificaciones concedido',
        permissionDenied: 'Permiso de notificaciones denegado',
        testSent: 'Notificación de prueba enviada',
        testFailed: 'Error al enviar notificación de prueba',
        notificationSent: 'Notificación enviada',
        notificationFailed: 'Error al enviar notificación',
        quietHoursActive: 'Notificaciones silenciadas por modo silencioso',
      },
      // Errors
      errors: {
        invalidWebhookUrl: 'URL de webhook inválida',
        invalidBotToken: 'Token de bot inválido',
        invalidChatId: 'Chat ID inválido',
        sendFailed: 'Error al enviar notificación',
        permissionRequired: 'Se requiere permiso de notificaciones',
      },
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      confirm: 'Confirm',
      search: 'Search',
      settings: 'Settings',
      theme: 'Theme',
      language: 'Language',
      exit: 'Exit',
    },
    macros: {
      title: 'Macros',
      subtitle: 'Custom automations',
      newMacro: 'New',
      editMacro: 'Edit Macro',
      createMacro: 'Create macro',
      noMacros: 'No macros configured',
      noMacrosDescription: 'Create your first macro to automate actions',
      searchPlaceholder: 'Search macros...',
      macroCount: 'macro configured',
      macroCountPlural: 'macros configured',
      // Basic Info
      basicInfo: 'Basic information',
      name: 'Name',
      namePlaceholder: 'Ex: Welcome greeting',
      description: 'Description',
      descriptionPlaceholder: 'Describe what this macro does...',
      enabled: 'Enabled',
      cooldown: 'Cooldown',
      cooldownSeconds: 'sec',
      // Triggers
      trigger: 'Trigger',
      triggerTypes: {
        chat_command: 'Command',
        chat_keyword: 'Keyword',
        schedule: 'Scheduled',
        event: 'Event',
        manual: 'Manual',
      },
      triggerDescriptions: {
        chat_command: 'Triggered by a specific command (e.g., !raid)',
        chat_keyword: 'Triggered when a keyword appears in chat',
        schedule: 'Runs at time intervals',
        event: 'Triggered by stream events (follows, raids, etc.)',
        manual: 'Manually executed from the interface',
      },
      triggerConfig: {
        command: 'Command',
        commandPlaceholder: '!command',
        commandHint: 'Command must start with ! (e.g., !raid, !hello)',
        caseSensitive: 'Case sensitive',
        minRole: 'Minimum role',
        keywords: 'Keywords',
        keywordsPlaceholder: 'hello, greeting, welcome',
        keywordsHint: 'Separate multiple words with commas',
        matchAll: 'All words (AND)',
        scheduleType: 'Schedule type',
        interval: 'Interval',
        intervalMinutes: 'Interval (minutes)',
        cron: 'Cron',
        cronPlaceholder: '*/30 * * * *',
        cronHint: 'Format: minute hour day month weekday',
        eventType: 'Event type',
        minValue: 'Minimum value (optional)',
        minValuePlaceholder: 'Minimum bits or viewers',
        hotkey: 'Keyboard shortcut (optional)',
        hotkeyPlaceholder: 'Ctrl+Shift+M',
        showInQuickActions: 'Show in quick actions',
      },
      eventTypes: {
        follower: 'New follower',
        raid: 'Raid received',
        subscription: 'New subscription',
        bits: 'Bits received',
        host: 'Host received',
        poll_ended: 'Poll ended',
        prediction_resolved: 'Prediction resolved',
      },
      userRoles: {
        viewer: 'Any user',
        subscriber: 'Subscribers',
        moderator: 'Moderators',
        broadcaster: 'Broadcaster only',
      },
      // Actions
      actions: 'Actions',
      addAction: 'Add',
      selectActionType: 'Select action type:',
      noActions: 'No actions configured',
      noActionsDescription: 'Add actions for your macro to do something',
      actionTypes: {
        send_chat_message: 'Send message',
        change_scene: 'Change scene',
        toggle_source: 'Toggle source',
        play_sound: 'Play sound',
        start_poll: 'Start poll',
        start_prediction: 'Start prediction',
        send_notification: 'Send notification',
        set_variable: 'Set variable',
        delay: 'Wait',
      },
      actionConfig: {
        message: 'Message',
        messagePlaceholder: 'Type the message to send...',
        platform: 'Platform',
        allPlatforms: 'All platforms',
        sceneName: 'Scene name',
        sceneNamePlaceholder: 'Ex: Gaming, Just Chatting',
        sourceName: 'Source name',
        sourceNamePlaceholder: 'Ex: Webcam, Alert Box',
        sourceAction: 'Action',
        show: 'Show',
        hide: 'Hide',
        toggle: 'Toggle',
        soundId: 'Sound ID',
        soundIdPlaceholder: 'Soundboard sound ID',
        volume: 'Volume',
        pollTitle: 'Poll title',
        pollTitlePlaceholder: 'What game should we play?',
        pollOptions: 'Options',
        pollDuration: 'Duration (seconds)',
        predictionTitle: 'Prediction title',
        predictionTitlePlaceholder: 'Who will win?',
        predictionOutcomes: 'Outcomes',
        predictionDuration: 'Duration (seconds)',
        notificationChannels: 'Channels',
        notificationTitle: 'Title',
        notificationTitlePlaceholder: 'Notification title',
        notificationMessage: 'Message',
        notificationMessagePlaceholder: 'Notification content...',
        variableName: 'Variable name',
        variableNamePlaceholder: 'my_variable',
        variableOperation: 'Operation',
        variableValue: 'Value',
        variableValuePlaceholder: 'Value or number',
        operationSet: 'Set',
        operationIncrement: 'Increment',
        operationDecrement: 'Decrement',
        delaySeconds: 'Wait seconds',
        delayBefore: 'Delay before execution',
        delayBeforeHint: 'Wait time before executing this action',
        requiresOBS: 'Requires OBS WebSocket connection',
      },
      // Conditions
      condition: 'Condition',
      conditionOptional: 'optional',
      addCondition: 'Add condition',
      removeCondition: 'Remove condition',
      addMoreConditions: 'Add more conditions (group)',
      conditionHint: 'Add a condition to execute this action only when met',
      availableVariables: 'Available variables',
      combineWith: 'Combine with:',
      operators: {
        equals: 'Equals',
        not_equals: 'Not equals',
        greater: 'Greater than',
        less: 'Less than',
        contains: 'Contains',
        not_contains: 'Does not contain',
      },
      logicalOperators: {
        and: 'AND',
        or: 'OR',
      },
      // Variables
      variables: {
        username: 'User who triggered',
        displayName: 'User display name',
        message: 'Chat message',
        platform: 'Source platform',
        timestamp: 'Current timestamp',
        viewers: 'Current viewers',
        followers: 'Total followers',
        uptime: 'Stream uptime',
        game: 'Current game',
        title: 'Stream title',
      },
      // Manager
      filters: 'Filters',
      filterAll: 'All',
      filterEnabled: 'Enabled',
      filterDisabled: 'Disabled',
      pauseAll: 'Pause all',
      resumeAll: 'Resume all',
      allPaused: 'All macros are paused',
      allPausedHint: 'Click to resume',
      resume: 'Resume',
      duplicate: 'Duplicate',
      execute: 'Execute macro',
      deleteConfirm: 'Delete macro',
      deleteConfirmMessage: 'Are you sure you want to delete the macro "{name}"? This action cannot be undone.',
      // Card
      executions: 'executions',
      lastExecution: 'Last execution',
      ago: 'ago',
      errorLastExecution: 'Error in last execution',
      // Execution Log
      executionLog: 'Execution Log',
      executionLogSubtitle: 'executions',
      noExecutions: 'No executions',
      noExecutionsHint: 'Macro executions will appear here',
      allMacros: 'All macros',
      filterByStatus: 'Filter by status',
      statusAll: 'All',
      statusSuccess: 'Successful',
      statusFailed: 'Failed',
      successful: 'successful',
      failed: 'failed',
      skipped: 'skipped',
      clearLog: 'Clear log',
      today: 'Today',
      yesterday: 'Yesterday',
      // Import/Export
      importExport: 'Import/Export',
      export: 'Export',
      import: 'Import',
      exportDescription: 'Export your macros as a JSON file',
      importDescription: 'Import macros from a JSON file',
      selectMacros: 'Select macros',
      selectAll: 'Select all',
      deselectAll: 'Deselect all',
      exportSelected: 'Export selected',
      importFile: 'Select file',
      dragDropFile: 'Drag a file here or click to select',
      importMode: 'Import mode',
      modeMerge: 'Merge',
      modeMergeDesc: 'Add new macros without removing existing ones',
      modeReplace: 'Replace',
      modeReplaceDesc: 'Replace all existing macros',
      importSuccess: 'Macros imported successfully',
      importError: 'Error importing macros',
      exportSuccess: 'Macros exported successfully',
      exportError: 'Error exporting macros',
      noMacrosToExport: 'No macros to export',
      // Validation
      validation: {
        nameRequired: 'Name is required',
        triggerRequired: 'Trigger is required',
        actionsRequired: 'At least one action is required',
        commandRequired: 'Command is required',
        keywordsRequired: 'At least one keyword is required',
        intervalRequired: 'Interval is required',
        cronRequired: 'Cron expression is required',
        eventTypeRequired: 'Event type is required',
        moreErrors: 'more errors',
      },
      // Messages
      messages: {
        macroCreated: 'Macro created successfully',
        macroUpdated: 'Macro updated successfully',
        macroDeleted: 'Macro deleted successfully',
        macroDuplicated: 'Macro duplicated successfully',
        macroExecuted: 'Macro executed',
        macroError: 'Error executing macro',
        saving: 'Saving...',
        saveChanges: 'Save changes',
      },
    },
    tools: {
      title: 'Tools',
      subtitle: 'Tools and settings',
      selectLanguage: 'Select interface language',
      switchTheme: 'Switch between light and dark mode',
      keyboardShortcuts: 'Keyboard Shortcuts',
      keyboardShortcutsDesc: 'Customize application shortcuts',
      quickAccess: 'Quick access with',
    },
    connection: {
      title: 'Connect to Twitch',
      subtitle: 'Enter the channel name to start',
      channelLabel: 'Channel / URL',
      channelPlaceholder: 'Ex: name o chanel twitch',
      channelTooltip: 'The username or Twitch link (e.g. name o chanel     twitch).',
      tokenLabel: 'Access Token (Optional)',
      tokenPlaceholder: 'Ex: uo6dgg01...',
      tokenTooltip: 'Required for the bot to write in chat (announce polls). Without this, it will work in read-only mode.',
      hideToken: 'Hide',
      connect: 'Connect',
      disconnect: 'Disconnect',
      connecting: 'Connecting...',
      connected: 'Connected',
      disconnected: 'Disconnected',
      error: 'Connection error',
      connectedSuccess: 'Successfully connected to chat.',
      tokenHelp: 'Token allows sending messages to chat',
      instructions: 'Instructions',
      step1: 'Go to',
      step2: 'Select "Bot Chat Token" or Custom.',
      step3: 'Ensure scopes: chat:read and chat:edit.',
      step4: 'Generate and copy the ACCESS TOKEN (not Client ID).',
      errorAuth: 'Authentication Error',
      errorNetwork: 'Network Error',
      errorConnection: 'Connection Error',
      errorChannelRequired: 'Channel name is required.',
      errorChannelInvalid: 'Invalid name (3-25 characters, letters, numbers and _).',
      errorTokenInvalid: 'Invalid token. Make sure to copy the "ACCESS TOKEN".',
      urlDetected: 'URL detected',
      orLoginWith: 'or login with',
      loginWithTwitch: 'Login with Twitch',
      oauthLoading: 'Connecting...',
      oauthError: 'Failed to login with Twitch',
      oauthPopupBlocked: 'Popup blocked. Please allow popups for this site.',
    },
    nav: {
      panel: 'Panel',
      poll: 'Poll',
      pollDescription: 'Create interactive polls for your audience',
      judge: 'Judge',
      judgeDescription: 'Live scoring panel',
      giveaway: 'Giveaways',
      giveawayDescription: 'Giveaways and raffles for your community',
      countdown: 'Countdown',
      countdownDescription: 'Countdown timer for events',
      spinner: 'Spinner',
      spinnerDescription: 'Fortune wheel for random decisions',
      dynamics: 'Dynamics',
      dynamicsSelector: 'Dynamics selector',
      dynamicsDescription: 'Select an interactive activity for your stream',
      availableActivities: 'Available activities',
      backToSelector: 'Back',
      gallery: 'Gallery',
      data: 'Data',
      history: 'History',
      activity: 'Activity',
      analytics: 'Analytics',
      chat: 'Chat',
      stream: 'Stream',
      notConnected: 'Not connected',
      connectToChannel: 'Connect to a Twitch channel to watch the stream.',
      invalidChannel: 'Invalid channel',
      invalidChannelName: 'Channel name is not valid.',
      twitchStream: 'Twitch Stream',
      loadStream: 'Load Stream',
      openInTwitch: 'Open in Twitch',
      copyLink: 'Copy link',
      closeStream: 'Close stream',
      sounds: 'Sounds',
      games: 'Games',
      platforms: 'Platforms',
      platformsSelector: 'Platform selector',
      platformsDescription: 'Select a platform to access its tools',
      availablePlatforms: 'Available platforms',
    },
    poll: {
      title: 'Poll',
      liveTitle: 'Live Poll',
      createTitle: 'Create Poll',
      question: 'Question',
      questionPlaceholder: 'What is your question?',
      options: 'Options',
      optionPlaceholder: 'Option',
      addOption: 'Add option',
      removeOption: 'Remove option',
      create: 'Create Poll',
      stop: 'Stop',
      reset: 'Reset',
      active: 'Active',
      ended: 'Ended',
      totalVotes: 'Total votes',
      votes: 'votes',
      votesLabel: 'votes',
      winner: 'Winner',
      viewDetails: 'View Details',
      ofTotal: 'of total',
      noVotes: 'No votes yet',
      waitingPoll: 'Waiting for poll...',
      createPollHint: 'Create a poll in the main panel',
      duration: 'Duration',
      maxVotes: 'Vote limit',
      unlimited: 'Unlimited',
      seconds: 'seconds',
      minutes: 'minutes',
      timeRemaining: 'Time remaining',
      voteWith: 'Vote by typing',
      openOverlay: 'Open Overlay',
      copyOverlayUrl: 'Copy Overlay URL',
      urlCopied: 'URL copied to clipboard',
      confirm: 'Confirm Poll',
      confirmHint: 'Review details before launching.',
      preview: 'Preview',
      save: 'Save',
      saveTemplate: 'Save as Template',
      apply: 'Apply',
      cancel: 'Cancel',
      goal: 'Goal',
      goalTooltip: 'Stops when reaching X votes',
      writeQuestion: 'Write a question to save.',
      minOptions: 'Poll must have at least 2 options.',
      storageFull: 'Could not save: Storage limit exceeded.',
      templateSaved: 'Template saved successfully.',
      replaceOptions: 'This will replace current options. Continue?',
      noPollActive: 'No active poll',
      createInPanel: 'Create a poll in the Panel to see the preview.',
      shareVotes: '{label}: {percentage}% of votes',
      obsOverlay: 'OBS Overlay',
      obsHint: 'Show the poll in your stream with Window Capture.',
      quick: 'Quick',
      yesNo: 'Yes / No',
      sectionTitle: 'Section Title',
      sectionTitleTooltip: "Appears above the question (e.g. 'Voting Now')",
      questionLabel: 'Question',
      questionTooltip: 'The main question for viewers',
      questionPlaceholderFull: 'What are we playing today?',
      responseOptions: 'Response Options',
      addOptionBtn: 'Add Option',
      timeSec: 'Time (Sec)',
      barColor: 'Bar',
      limitColor: 'Limit',
      votePrefix: 'Prefix',
      votePrefixTooltip: 'Symbol to vote (e.g: +1, !1, #1)',
      voteKeyTooltip: 'Keyword to vote (e.g: yes, no, red)',
      matchMode: 'Mode',
      matchModeTooltip: 'Exact: must match exactly. Partial: can be within the message.',
      matchExact: 'Exact',
      matchPartial: 'Partial',
      startPoll: 'Start Poll',
      clearForm: 'Clear Form',
      templates: 'Templates',
      myTemplates: 'My Templates',
      favorites: 'Favorites',
      uploadImage: 'Upload Image',
      galleryBtn: 'Gallery',
      presetApplied: 'Preset applied.',
      templateLoaded: 'Template loaded.',
      invalidImageType: 'File must be a valid image (JPG, PNG, GIF).',
      imageTooLarge: 'Image is too large (Max 40MB).',
      fileReadError: 'Error reading file. Try again.',
      iconSavedToGallery: 'Icon processed and saved to Gallery.',
      imageProcessError: 'Error processing image in browser.',
      imageDamaged: 'Image file appears to be damaged.',
      needTwoOptions: 'At least 2 options are required.',
      completeAllFields: 'Complete the question and all options.',
      allOptionsNeedLabel: 'All options must have a label.',
      option: 'Option',
      noOptionsToImport: 'No options to import',
      optionsImported: 'options imported',
      quickPollCreated: 'Quick Yes/No poll created!',
      spinnerWheel: 'Spinner',
      randomWinnerTooltip: 'Raffle a winner from viewers',
      raffle: 'Raffle',
    },
    moderation: {
      title: 'Vote Moderation',
      config: 'Configuration',
      stats: 'Statistics',
      log: 'Log',
      accepted: 'Accepted',
      rejected: 'Rejected',
      voteChanged: 'Vote changes',
      acceptanceRate: 'Acceptance rate',
      reset: 'Reset',
      minAccountAge: 'Min Account Age (days)',
      minAccountAgeTooltip: 'Accounts younger than this will be rejected. Set to 0 to allow all.',
      allowVoteChanges: 'Allow Vote Changes',
      allowVoteChangesTooltip: 'When disabled, users cannot change their vote after voting.',
      enabled: 'Enabled',
      disabled: 'Disabled',
      cooldown: 'Cooldown (seconds)',
      cooldownTooltip: 'Time users must wait before changing their vote.',
      voteWeights: 'Vote Weights (1-5)',
      voteWeightsTooltip: 'Higher weights give more voting power to subscribers/followers.',
      subscriber: 'Subscriber',
      follower: 'Follower',
      regularUsers: 'Regular users always have weight 1x',
      presets: 'Presets',
      presetName: 'Preset name...',
      loadPreset: 'Load Preset',
      noPresets: 'No presets saved yet',
      presetSaved: 'Preset "{name}" saved',
      presetLoaded: 'Preset "{name}" loaded',
      presetDeleted: 'Preset "{name}" deleted',
      enterPresetName: 'Enter a preset name',
      resetDefaults: 'Settings reset to defaults',
      whitelist: 'Permitted list',
      whitelistTooltip: 'Only these users will be able to vote. One name per line.',
      whitelistEnabled: 'Enable permitted',
      whitelistPlaceholder: 'user1\nuser2\nuser3',
      whitelistCount: '{count} users',
      blacklist: 'List Excluded',
      blacklistTooltip: 'These users will NOT be able to vote. One name per line.',
      blacklistEnabled: 'Enable list Excluded',
      blacklistPlaceholder: 'troll1\nspammer2\nbot3',
      blacklistCount: '{count} blocked',
      reasons: {
        accountTooNew: 'Account too new',
        cooldownActive: 'Cooldown active',
        alreadyVoted: 'Already voted',
        invalidOption: 'Invalid option',
        voteChangeCooldown: 'Change cooldown',
        notWhitelisted: 'Not whitelisted',
        blacklisted: 'User blocked',
      },
    },
    gallery: {
      title: 'Media Gallery',
      upload: 'Upload',
      delete: 'Delete',
      noAssets: 'No images',
      uploadHint: 'Upload images to use in your polls',
      storageFull: 'Storage full. Delete old images.',
      dragDrop: 'Drag and drop here',
      maxSize: 'Max 2MB',
    },
    analytics: {
      title: 'Stream Analytics',
      configureAI: 'Configure AI',
      aiActive: 'Active',
      noData: 'No data available',
      live: 'Live',
      history: 'History',
      activeSession: 'Active session',
      noActiveStream: 'No active stream',
      connectToSee: 'Connect to a channel to see live analytics',
      uniqueViewers: 'Unique viewers',
      messages: 'Messages',
      positive: 'Positive',
      neutral: 'Neutral',
      negative: 'Negative',
      engagement: 'Engagement',
      mainTopics: 'Main topics',
      frequentWords: 'Frequent words',
      mostUsedEmotes: 'Most used emotes',
      mostActiveViewers: 'Most active viewers',
      msgs: 'msgs',
      sessionsThisDay: 'session(s) this day',
      totalMessages: 'Total messages',
      noSessionsDate: 'No sessions for this date',
      exportData: 'Export data',
      loading: 'Loading...',
    },
    aiConfig: {
      title: 'AI Configuration',
      optional: 'Optional',
      description: 'Connect an AI to analyze your chat and get advanced insights at the end of each stream.',
      provider: 'Provider',
      apiKey: 'API Key',
      apiKeyPlaceholder: 'Your {provider} API key...',
      saved: 'Saved!',
      save: 'Save',
      test: 'Test',
      connectionSuccess: '✓ Connection successful!',
      connectionError: '✗ Connection error',
      aiAnalysis: 'AI Analysis',
      activateInsights: 'Enable for advanced insights',
      noApiKeyHint: '💡 Without API key, basic local analysis will be used.',
      getApiKey: 'Get {provider} API key →',
    },
    history: {
      title: 'Poll History',
      noPastPolls: 'No past polls',
      viewDetails: 'View details',
      exportData: 'Export data',
    },
    unifiedHistory: {
      title: 'Unified History',
      subtitle: 'items total',
      noItems: 'No items in history',
      adjustFilters: 'Try adjusting the filters',
      all: 'All',
      polls: 'Polls',
      predictions: 'Predictions',
      giveaways: 'Giveaways',
      commands: 'Commands',
      timers: 'Timers',
      search: 'Search history...',
      filters: 'Filters',
      dateFrom: 'From',
      dateTo: 'To',
      clearFilters: 'Clear',
      export: 'Export',
      import: 'Import',
      clear: 'Clear',
      close: 'Close',
      delete: 'Delete',
      confirmClearAll: 'Delete ALL history?',
      confirmClearCategory: 'Delete {category} history?',
      importSuccess: 'Imported {count} items',
      importError: 'Import error',
      winner: 'Winner',
      participants: 'participants',
      votes: 'votes',
      executions: 'executions',
      interval: 'interval',
      executedBy: 'Executed by',
      channel: 'Channel',
    },
    overlay: {
      title: 'Customize Overlay',
      customize: 'Customize',
      background: 'Background',
      textColor: 'Text Color',
      borderColor: 'Border Color',
      showBorders: 'Show Borders',
      fontSize: 'Font Size',
      fontStyle: 'Font Style',
      theme: 'Background Theme',
      light: 'Light',
      dark: 'Dark',
      small: 'S',
      medium: 'M',
      large: 'L',
      normal: 'Normal',
      bold: 'Bold',
      italic: 'Italic',
      chromaKey: 'Chroma Key',
      waitingPoll: 'Waiting for poll...',
      mode: 'OVERLAY MODE',
      forOBS: 'For OBS',
      size: 'Size',
      normalSize: 'Normal',
      largeSize: 'Large',
    },
    notifications: {
      pollCreated: 'Poll created',
      pollEnded: 'Poll ended',
      pollReset: 'Poll reset',
      connectionError: 'Connection error',
      storageFull: 'Storage full',
      copied: 'Copied to clipboard',
      saved: 'Saved successfully',
      deleted: 'Deleted successfully',
      autoEnded: 'Poll ended by time/limit.',
    },
    chat: {
      newPoll: '📊 New Poll',
      options: 'Options',
      voteHint: 'Vote by typing +1, +2, etc.',
      pollEnded: '🏁 Poll Ended',
      winner: '🏆 Winner',
      withVotes: 'with {votes} votes',
      liveChat: 'Live Chat',
      waitingMessages: 'Waiting for messages...',
      newMessages: 'New messages',
      alreadyRegistered: 'Already registered',
      votedFor: 'Voted for',
    },
    mascot: {
      title: 'AI Vision',
      chatSentiment: 'Chat sentiment',
      positive: 'Positive',
      neutral: 'Neutral',
      negative: 'Negative',
      messages: 'Messages',
      votes: 'Votes',
      viewers: 'Viewers',
      intensity: 'Intensity',
      helpConnectionFailed: 'Check that the channel name is correct and you have internet connection',
      helpPollEmpty: 'Add at least 2 options to create a poll',
      helpNoVotes: 'Try announcing the poll in chat or make the question more engaging',
      helpRepeatedAction: 'Something seems to not be working as expected',
      helpIdle: 'I can help you create polls, analyze chat and more',
      msgConnectionFailed: "Don't worry! Let's try again",
      msgPollEmpty: 'Hmm... looks like the poll needs options',
      msgNoVotes: 'Chat is very quiet...',
      msgRepeatedAction: 'Need help with something?',
      msgIdle: "I'm here if you need me!",
      msgChatPositive: 'Great vibes! 💜',
      msgChatNegative: 'Chat seems a bit tense...',
      msgChatExcited: 'Chat is ON FIRE! 🔥',
      msgNotConnected: 'Hello! Connect a channel to start',
      msgPollGoing: '{votes} votes! Poll is going great',
      msgWaitingVotes: 'Waiting for the first votes...',
      msgWatching: 'Watching the chat... 👀',
      dragToMove: 'Drag to move',
      msgLove: 'So much love in chat! 💜',
      msgSurprised: 'Wow! What happened? 😱',
      msgAngry: 'Chat is intense... 😅',
      msgSleepy: '💤 Waiting for activity...',
      msgHappy: 'Good vibes! 😊',
      msgSad: 'Chat is sad... 😢',
    },
    chatSimulator: {
      title: 'Chat Simulator',
      active: 'Active',
      start: 'Start',
      pause: 'Pause',
      reset: 'Reset',
      settings: 'Settings',
      context: 'Context',
      generic: 'General',
      poll: 'Poll',
      game: 'Game',
      trivia: 'Trivia',
      giveaway: 'Giveaway',
      messagesPerMinute: 'Messages per minute',
      relevantProbability: 'Relevant message prob.',
      uniqueUsers: 'Unique users',
      burst: 'Burst',
      simulateVotes: 'Simulate votes',
      simulateJoins: 'Simulate joins',
    },
    soundboard: {
      title: 'Sound Board',
      bitSounds: 'BIT Sounds',
      customSounds: 'My Sounds',
      bitDescription: 'Digitally generated sounds (8-bit style)',
      noCustomSounds: 'No custom sounds',
      uploadHint: 'Upload audio files to use in your stream',
    },
    randomWinner: {
      title: 'Random Winner',
      subtitle: 'Select a random winner from chat',
      openOverlay: 'Open Overlay for OBS',
      viewers: 'Viewers',
      keyword: 'Keyword',
      subsOnly: 'Subscribers Only',
      keywordLabel: 'Keyword',
      keywordPlaceholder: 'Ex: participate, raffle, me...',
      timeLimit: 'Time limit (seconds)',
      availableParticipants: 'Available participants',
      subsInChat: 'subscribers in chat',
      usersInChat: 'users in chat',
      time: 'Time',
      participants: 'Participants',
      winner: 'WINNER!',
      selectWinner: 'Select Winner',
      selecting: 'Selecting...',
      chooseWinner: 'Choose Winner',
      startCollection: 'Start Collection',
      finishAndChoose: 'Finish and Choose',
      newRaffle: 'New Raffle',
      resetRaffle: 'Reset raffle',
      clearAll: 'Clear All (Reset Participants)',
      clearAllHint: 'Reset participants and settings',
      viewersHint: 'Select a winner from users who have written in chat',
      keywordHint: 'Users must type the keyword to participate',
      waitingRaffle: 'Waiting for raffle...',
      // Tooltips
      subsOnlyTooltip: 'Only channel subscribers can participate in the raffle',
      useTimerTooltip: 'Limits participation time. Without timer, the raffle stays open indefinitely',
      keywordTooltip: 'Users must type this word in chat to participate',
      timeLimitTooltip: 'Duration in seconds of the participation period',
      // Error messages
      errors: {
        noValidParticipants: 'No valid participants (all are in the blacklist)',
        userAlreadyParticipating: 'This user is already participating',
        userAlreadyInChat: 'This user is already in chat',
        usersAddedToBlacklist: '{count} users added to blacklist',
        participantsAdded: 'Added: {added}{duplicates}',
        needOAuthChatters: 'You need to connect with OAuth and the moderator:read:chatters permission',
        needOAuthConnection: 'You need to be connected with an OAuth token',
        couldNotGetChannelId: 'Could not get channel ID',
        tokenMissingChattersScope: 'Token missing permission. Generate a new one with scope: moderator:read:chatters',
        errorLoadingChatters: 'Error loading chatters',
        needOAuthSubscribers: 'You need to connect with OAuth and the channel:read:subscriptions permission',
        tokenMissingSubsScope: 'Token missing permission. Generate a new one with scope: channel:read:subscriptions',
        errorLoadingSubscribers: 'Error loading subscribers',
        incompatibleFileVersion: 'Incompatible file version',
      },
      // Presets
      presets: {
        quick: 'Quick Raffle',
        quickDescription: 'Chat viewers, no timer',
        keyword: 'Keyword Raffle',
        keywordDescription: 'Keyword, 60 seconds',
        subs: 'Subs Raffle',
        subsDescription: 'Subscribers only',
      },
    },
    spinner: {
      winnerTextColor: 'Winner text color',
      optionsTitle: 'Spinner Options',
      presetsTitle: 'Quick presets',
      presetYesNo: 'Yes/No',
      presetNumbers: 'Numbers 1-6',
      presetDecisions: 'Decisions A-D',
      presetPrizes: 'Prizes',
      newOptionPlaceholder: 'New option...',
      clearAll: 'Clear all',
      spinning: 'Spinning...',
      spin: 'Spin',
    },
    collaboration: {
      title: 'Collaboration',
      mainChannel: 'Main',
      placeholder: 'Collaborator channel...',
      remove: 'Remove',
      errorAdding: 'Could not add channel',
      helpText: 'Add collaborator streamer channels to see their messages and votes in real time.',
      channelAdded: 'Collaborator channel added',
      channelRemoved: 'Collaborator channel removed',
    },
    games: {
      title: 'Stream Games',
      subtitle: 'Interactive games for your stream',
      piumBall: 'Pium Ball',
      piumDesc: 'Viewers throw balls with !pium',
      casinoRoulette: 'Casino Roulette',
      rouletteDesc: 'Bet with !ruleta-27',
      active: 'Active',
      paused: 'Paused',
      balls: 'balls',
      bets: 'bets',
      openOverlay: 'Open OBS Overlay',
      clearBalls: 'Clear balls',
      spin: 'Spin',
      spinning: 'Spinning...',
      reset: 'Reset',
      autoSpin: 'Auto-spin',
      bettingOpen: 'Betting open',
      bettingClosed: 'Betting closed',
      winners: 'winner(s)',
      waitingBets: 'Waiting for bets...',
      waitingPium: 'Waiting for !pium from chat...',
      // New games
      chatFishing: 'Chat Fishing',
      fishingDesc: 'Fish chat messages',
      hotPotato: 'Hot Potato',
      potatoDesc: 'Pass the potato with !pass',
      triviaBattle: 'Trivia Battle',
      triviaDesc: 'Answer questions with 1-4',
      fish: 'fish',
      fishing: 'Fishing...',
      cast: 'Cast!',
      catch: 'Catch!',
      points: 'pts',
      round: 'Round',
      join: 'Join',
      pass: 'Pass',
      eliminated: 'eliminated',
      waiting: 'Waiting',
      question: 'Question',
      answer: 'Answer',
      correct: 'Correct!',
      wrong: 'Wrong',
      streak: 'Streak',
      leaderboard: 'Leaderboard',
      startGame: 'Start!',
      nextRound: 'Next',
      finalResults: 'Results!',
      // Battleship & Duck Hunt
      battleship: 'Battleship',
      battleshipDesc: 'Fire with coordinates A1-J10',
      duckHunt: 'Duck Hunt',
      duckHuntDesc: 'Type !pato to play',
      ships: 'ships',
      shipsRemaining: 'ships remaining',
      hit: 'Hit!',
      miss: 'Miss',
      sunk: 'Sunk!',
      allShipsSunk: 'All ships sunk!',
      shots: 'shots',
      ducks: 'ducks',
      shoot: 'Shoot',
      accuracy: 'Accuracy',
    },
    judgePanel: {
      // Tooltips
      criteriaWeightTooltip: 'Importance multiplier. Higher weight = more impact on final score',
      publicVoteWeightTooltip: 'Percentage of public vote in the final score (0-100%)',
      votePrefixTooltip: 'Character users type before their vote (e.g: +1, #1)',
      // Error messages
      errors: {
        missingCriteriaAndContestants: 'Missing: criteria and contestants',
        missingCriteria: 'Missing: criteria',
        missingContestants: 'Missing: contestants',
      },
      // Presets
      presets: {
        basic: 'Basic Tournament',
        basicDescription: '3 standard criteria',
        public: 'Public Tournament',
        publicDescription: '3 criteria + 30% public voting',
        // Criteria names
        criteria: {
          creativity: 'Creativity',
          execution: 'Execution',
          originality: 'Originality',
        },
      },
    },
    platforms: {
      // General
      comingSoon: 'Coming Soon',
      back: '← Back',
      backToPlatforms: 'Back to platforms',
      availableTools: 'Available tools',
      connected: 'Connected',
      connecting: 'Connecting...',
      disconnected: 'Disconnected',
      error: 'Connection error',
      platformConnected: '1 platform connected',
      platformsConnected: '{count} platforms connected',
      platformsDescriptionMulti: 'Connect multiple streaming platforms',
      selectPlatforms: 'Select platforms',
      // Twitch
      twitchTitle: 'Twitch',
      twitchDescription: 'Commands, predictions and more',
      twitchToolsDescription: 'Twitch tools and features',
      backToTwitchTools: 'Back to Twitch tools',
      // YouTube
      youtubeTitle: 'YouTube',
      youtubeDescription: 'Live chat and polls',
      youtubeToolsDescription: 'YouTube tools and features',
      backToYoutubeTools: 'Back to YouTube tools',
      youtubeConnect: 'Connect to YouTube',
      youtubeDisconnect: 'Disconnect YouTube',
      youtubeLiveChat: 'Live chat',
      youtubePolls: 'YouTube polls',
      // Kick
      kickTitle: 'Kick',
      kickDescription: 'Real-time chat',
      kickToolsDescription: 'Kick tools and features',
      backToKickTools: 'Back to Kick tools',
      kickConnect: 'Connect to Kick',
      kickDisconnect: 'Disconnect Kick',
      kickLiveChat: 'Live chat',
      // Tools
      commands: 'Commands',
      commandsDescription: 'Custom chat commands',
      predictions: 'Predictions',
      predictionsDescription: 'Twitch predictions',
      channelPoints: 'Channel Points',
      channelPointsDescription: 'Point rewards',
    },
    // Predictions
    predictions: {
      title: 'Predictions',
      createTitle: 'Create Prediction',
      activeTitle: 'Active Prediction',
      historyTitle: 'Prediction History',
      // Form
      predictionTitle: 'Title',
      predictionTitlePlaceholder: 'Who will win?',
      outcomes: 'Outcomes',
      outcomePlaceholder: 'Outcome',
      addOutcome: 'Add outcome',
      removeOutcome: 'Remove outcome',
      duration: 'Duration',
      durationSeconds: 'seconds',
      minOutcomes: 'Minimum 2 outcomes',
      maxOutcomes: 'Maximum 10 outcomes',
      // Actions
      create: 'Create Prediction',
      lock: 'Lock',
      resolve: 'Resolve',
      cancel: 'Cancel',
      creating: 'Creating...',
      locking: 'Locking...',
      resolving: 'Resolving...',
      canceling: 'Canceling...',
      // Status
      statusActive: 'Active',
      statusLocked: 'Locked',
      statusResolved: 'Resolved',
      statusCanceled: 'Canceled',
      // Display
      voters: 'voters',
      points: 'points',
      totalPoints: 'Total points',
      totalVoters: 'Total voters',
      topPredictors: 'Top Predictors',
      selectWinner: 'Select winner',
      winningOutcome: 'Winning outcome',
      // History
      noHistory: 'No previous predictions',
      viewDetails: 'View details',
      participants: 'participants',
      // Messages
      noPrediction: 'No active prediction',
      createHint: 'Create a prediction to engage your audience',
      partnerRequired: 'Partner/Affiliate required',
      partnerRequiredDesc: 'Predictions are only available for Twitch Partners and Affiliates',
      scopeRequired: 'Permissions required',
      scopeRequiredDesc: 'You need to reconnect your account with prediction permissions',
      predictionCreated: 'Prediction created',
      predictionLocked: 'Prediction locked',
      predictionResolved: 'Prediction resolved',
      predictionCanceled: 'Prediction canceled',
      // Errors
      errorCreating: 'Error creating prediction',
      errorLocking: 'Error locking prediction',
      errorResolving: 'Error resolving prediction',
      errorCanceling: 'Error canceling prediction',
      errorLoading: 'Error loading predictions',
      // Validation
      titleRequired: 'Title is required',
      outcomesRequired: 'At least 2 outcomes are required',
      durationRange: 'Duration must be between 30 and 1800 seconds',
      uniqueOutcomes: 'Outcomes must be unique',
    },
    // Channel Points / Rewards
    rewards: {
      title: 'Channel Points',
      createTitle: 'Create Reward',
      editTitle: 'Edit Reward',
      redemptionsTitle: 'Redemptions',
      // Form
      rewardTitle: 'Title',
      rewardTitlePlaceholder: 'Reward name',
      cost: 'Cost',
      costPlaceholder: '100',
      description: 'Description',
      descriptionPlaceholder: 'Reward description...',
      backgroundColor: 'Background color',
      // Limits
      maxPerStream: 'Max per stream',
      maxPerStreamEnabled: 'Limit per stream',
      maxPerUser: 'Max per user',
      maxPerUserEnabled: 'Limit per user',
      globalCooldown: 'Global cooldown',
      globalCooldownEnabled: 'Enable cooldown',
      cooldownSeconds: 'seconds',
      // Options
      userInputRequired: 'Require user input',
      skipQueue: 'Skip approval queue',
      enabled: 'Enabled',
      paused: 'Paused',
      // Actions
      create: 'Create Reward',
      update: 'Update',
      delete: 'Delete',
      enable: 'Enable',
      disable: 'Disable',
      creating: 'Creating...',
      updating: 'Updating...',
      deleting: 'Deleting...',
      // Redemptions
      redemptions: 'Redemptions',
      pendingRedemptions: 'Pending redemptions',
      noRedemptions: 'No pending redemptions',
      fulfill: 'Fulfill',
      reject: 'Reject',
      fulfilling: 'Fulfilling...',
      rejecting: 'Rejecting...',
      filterByReward: 'Filter by reward',
      allRewards: 'All rewards',
      redeemedBy: 'Redeemed by',
      redeemedAt: 'Redeemed at',
      userInput: 'User message',
      // Status
      statusUnfulfilled: 'Pending',
      statusFulfilled: 'Fulfilled',
      statusCanceled: 'Rejected',
      // Messages
      noRewards: 'No rewards configured',
      createHint: 'Create custom rewards for your channel',
      scopeRequired: 'Permissions required',
      scopeRequiredDesc: 'You need to reconnect your account with Channel Points permissions',
      rewardCreated: 'Reward created',
      rewardUpdated: 'Reward updated',
      rewardDeleted: 'Reward deleted',
      rewardEnabled: 'Reward enabled',
      rewardDisabled: 'Reward disabled',
      redemptionFulfilled: 'Redemption fulfilled',
      redemptionRejected: 'Redemption rejected',
      // Errors
      errorCreating: 'Error creating reward',
      errorUpdating: 'Error updating reward',
      errorDeleting: 'Error deleting reward',
      errorLoading: 'Error loading rewards',
      errorFulfilling: 'Error fulfilling redemption',
      errorRejecting: 'Error rejecting redemption',
      // Validation
      titleRequired: 'Title is required',
      costRequired: 'Cost is required',
      costMin: 'Minimum cost is 1',
    },
    // Commands Import/Export
    commandsExport: {
      export: 'Export',
      import: 'Import',
      exporting: 'Exporting...',
      importing: 'Importing...',
      // Export
      exportTitle: 'Export Commands',
      exportDescription: 'Download your commands as a JSON file',
      exportSuccess: 'Commands exported successfully',
      exportError: 'Error exporting commands',
      noCommandsToExport: 'No commands to export',
      // Import
      importTitle: 'Import Commands',
      importDescription: 'Upload a JSON file with commands',
      selectFile: 'Select file',
      dragDropFile: 'Drag a file here or click to select',
      importMode: 'Import mode',
      modeMerge: 'Merge',
      modeMergeDesc: 'Add new commands without removing existing ones',
      modeReplace: 'Replace',
      modeReplaceDesc: 'Replace all existing commands',
      importSuccess: 'Commands imported successfully',
      importError: 'Error importing commands',
      // Validation
      invalidFormat: 'Invalid file format',
      invalidVersion: 'Unsupported file version',
      invalidCommands: 'File contains invalid commands',
      commandsImported: 'commands imported',
      commandsSkipped: 'commands skipped',
      duplicatesFound: 'Duplicates found',
      // Confirmation
      confirmReplace: 'Replace commands?',
      confirmReplaceDesc: 'This will delete all existing commands',
    },
    // Timers
    timers: {
      title: 'Timers',
      subtitle: 'Automatic messages',
      description: 'Send messages to chat periodically',
      tabTimers: 'Timers',
      tabTemplates: 'Templates',
      tabGroups: 'Groups',
      tabLog: 'History',
      engineRunning: 'Engine running',
      engineStopped: 'Engine stopped',
      startEngine: 'Start',
      stopEngine: 'Stop',
      chatLines: 'Chat lines',
      createTimer: 'Create Timer',
      editTimer: 'Edit Timer',
      timerName: 'Name',
      timerNamePlaceholder: 'Ex: Social media',
      timerMessage: 'Message',
      timerMessagePlaceholder: 'Ex: Follow me on Twitter! twitter.com/$(channel)',
      timerInterval: 'Interval (minutes)',
      timerMinLines: 'Minimum chat lines',
      timerMinLinesHelp: 'Timer will only execute if there are at least this many messages in chat',
      timerGroup: 'Group',
      timerEnabled: 'Enabled',
      timerNoGroup: 'No group',
      save: 'Save',
      cancel: 'Cancel',
      noTimers: 'No timers configured',
      noTimersDescription: 'Create your first timer or use a template',
      nextExecution: 'Next execution',
      lastExecution: 'Last execution',
      never: 'Never',
      executeNow: 'Execute now',
      edit: 'Edit',
      delete: 'Delete',
      deleteConfirm: 'Delete this timer?',
      everyMinutes: 'every {minutes} min',
      minLines: 'min. {lines} lines',
      templatesTitle: 'Templates',
      templatesDescription: 'Use predefined templates for quick setup',
      useTemplate: 'Use template',
      templateCategories: {
        social: 'Social Media',
        rules: 'Rules',
        discord: 'Discord',
        donations: 'Donations',
        commands: 'Commands',
      },
      groupsTitle: 'Groups',
      groupsDescription: 'Organize your timers in groups',
      createGroup: 'Create group',
      editGroup: 'Edit group',
      groupName: 'Group name',
      groupColor: 'Color',
      groupTimerCount: '{count} timers',
      noGroups: 'No groups',
      noGroupsDescription: 'Create groups to organize your timers',
      deleteGroupConfirm: 'Delete this group? Timers will be moved to "No group"',
      generalGroup: 'General',
      logTitle: 'Execution history',
      logDescription: 'Last sent messages',
      clearLog: 'Clear history',
      noLogEntries: 'No history entries',
      logSuccess: 'Sent',
      logError: 'Error',
      variablesTitle: 'Available variables',
      variablesHelp: 'Use these variables in your messages:',
      variables: {
        channel: 'Channel name',
        game: 'Current game',
        uptime: 'Stream uptime',
        viewers: 'Current viewers',
        followers: 'Total followers',
        date: 'Current date',
        time: 'Current time',
      },
      nameRequired: 'Name is required',
      messageRequired: 'Message is required',
      intervalMin: 'Minimum interval is 1 minute',
      intervalMax: 'Maximum interval is 120 minutes',
      timerCreated: 'Timer created',
      timerUpdated: 'Timer updated',
      timerDeleted: 'Timer deleted',
      timerExecuted: 'Timer executed',
      groupCreated: 'Group created',
      groupUpdated: 'Group updated',
      groupDeleted: 'Group deleted',
      notConnected: 'Chat not connected',
      notConnectedDescription: 'Connect to chat so timers can send messages',
      toggleTimer: 'Toggle timer',
      toggleGroup: 'Toggle group',
      timerOptions: 'Timer options',
      groupOptions: 'Group options',
      engineStartedAnnouncement: 'Timer engine started',
      engineStoppedAnnouncement: 'Timer engine stopped',
      timerExecutedAnnouncement: 'Timer {name} executed',
      timerErrorAnnouncement: 'Error executing timer {name}',
    },
    // Onboarding
    onboarding: {
      welcomeTitle: 'Welcome to TwitchVote!',
      welcomeMessage: "I'll guide you step by step through all the app features.",
      startTutorial: 'Start Tutorial',
      skipTutorial: 'Skip',
      nextStep: 'Next',
      previousStep: 'Previous',
      finish: 'Done!',
      stepOf: 'Step {current} of {total}',
      progress: 'Progress',
      completed: 'completed',
      restartTutorial: 'Tutorial',
      restartTutorialDesc: 'Restart the interactive tutorial to learn how to use the app',
      restartButton: 'Restart Tutorial',
      interactionRequired: 'Interact with the highlighted element',
      interactionCompleted: 'Action completed!',
      clickToInteract: 'Click here!',
      waitingInteraction: 'Waiting for interaction...',
      paused: 'Paused',
      resume: 'Resume',
      tipDismiss: 'Close',
      tipDismissPermanent: "Don't show again",
      tipUnderstood: 'Got it',
      contextualTipsEnabled: 'Contextual tips enabled',
      contextualTipsDisabled: 'Contextual tips disabled',
    },
    backup: {
      title: 'Cloud Backup',
      selectProvider: 'Select a storage provider:',
      connected: 'Connected',
      confirmRestore: 'Are you sure you want to restore? This will overwrite your current configuration.',
      status: {
        synced: 'Synced',
        syncing: 'Syncing...',
        pending: 'Pending',
        error: 'Error',
        disconnected: 'Disconnected',
      },
      lastBackup: 'Last backup',
      providers: {
        googleDrive: {
          description: 'Store your backups in your Google Drive account',
          help: 'Get your access token from the Google Cloud console',
        },
        customServer: {
          name: 'Custom Server',
          description: 'Use your own server to store backups',
        },
      },
      credentials: {
        title: 'Credentials',
        optional: 'optional',
        accessTokenPlaceholder: 'Enter your access token...',
        refreshTokenPlaceholder: 'Enter your refresh token...',
        apiKeyPlaceholder: 'Enter your API key...',
      },
      autoBackup: {
        title: 'Auto Backup',
        description: 'Automatically save changes every 5 minutes',
      },
      actions: {
        connect: 'Connect',
        cancel: 'Cancel',
        disconnect: 'Disconnect',
        backupNow: 'Backup Now',
        restore: 'Restore',
      },
      messages: {
        connected: 'Connected successfully',
        disconnected: 'Disconnected',
        backupSuccess: 'Backup completed successfully',
        restoreSuccess: 'Restored {count} items',
      },
      errors: {
        missingToken: 'Access token is required',
        missingServerConfig: 'Server URL and API key are required',
        connectionFailed: 'Connection failed',
        backupFailed: 'Backup failed',
        restoreFailed: 'Restore failed',
      },
      securityNote: 'Credentials are stored encrypted in your browser. Sensitive data (API keys) is encrypted before uploading to the cloud.',
    },
    // Offline Mode
    offline: {
      offlineBanner: 'No internet connection',
      reconnected: 'Connection restored!',
      pendingOperations: 'pending operations',
      pendingOperation: 'pending operation',
      syncing: 'Syncing...',
      offline: 'Offline',
      online: 'Online',
    },
    // Push Notifications / External Alerts
    pushNotifications: {
      title: 'Notifications',
      subtitle: 'Configure external alerts for your stream',
      // Channels
      channels: {
        push: 'Browser',
        pushDescription: 'Browser notifications when the app is minimized',
        discord: 'Discord',
        discordDescription: 'Send alerts to a Discord channel via webhook',
        telegram: 'Telegram',
        telegramDescription: 'Send alerts to a Telegram chat via bot',
      },
      // Channel Status
      status: {
        enabled: 'Enabled',
        disabled: 'Disabled',
        error: 'Configuration error',
        permissionDenied: 'Permission denied',
        permissionGranted: 'Permission granted',
        notSupported: 'Not supported in this browser',
      },
      // Configuration
      config: {
        webhookUrl: 'Webhook URL',
        webhookUrlPlaceholder: 'https://discord.com/api/webhooks/...',
        webhookUrlHelp: 'Create a webhook in your Discord server and paste the URL here',
        botToken: 'Bot Token',
        botTokenPlaceholder: '123456789:ABCdefGHI...',
        botTokenHelp: 'Create a bot with @BotFather on Telegram and copy the token',
        chatId: 'Chat ID',
        chatIdPlaceholder: '-1001234567890',
        chatIdHelp: 'ID of the chat or group where alerts will be sent',
        username: 'Bot Name (optional)',
        usernamePlaceholder: 'TwitchVote Alerts',
        avatarUrl: 'Avatar URL (optional)',
        avatarUrlPlaceholder: 'https://example.com/avatar.png',
      },
      // Event Types
      events: {
        title: 'Event Types',
        follower: 'New follower',
        raid: 'Raid received',
        host: 'Host received',
        donation: 'Donation',
        subscription: 'New subscription',
        bits: 'Bits received',
        poll_ended: 'Poll ended',
        prediction_resolved: 'Prediction resolved',
        giveaway_winner: 'Giveaway winner',
        command_executed: 'Command executed',
      },
      // Quiet Hours
      quietHours: {
        title: 'Quiet Mode',
        description: 'Suppress all notifications during these hours',
        enabled: 'Enable quiet mode',
        start: 'Start time',
        end: 'End time',
        active: 'Quiet mode active',
      },
      // Actions
      actions: {
        test: 'Test',
        testSuccess: 'Test notification sent!',
        testError: 'Error sending test notification',
        save: 'Save configuration',
        reset: 'Reset',
        requestPermission: 'Request permission',
        enableInstructions: 'Enable notifications in your browser settings',
      },
      // History
      history: {
        title: 'Notification History',
        noEntries: 'No notifications in history',
        sentAt: 'Sent',
        success: 'Success',
        failed: 'Failed',
        pending: 'Pending',
        clear: 'Clear history',
        clearConfirm: 'Delete all notification history?',
      },
      // Stats
      stats: {
        sentToday: 'Sent today',
        failed: 'Failed',
        pending: 'Pending',
      },
      // Messages
      messages: {
        configSaved: 'Configuration saved',
        configReset: 'Configuration reset',
        permissionGranted: 'Notification permission granted',
        permissionDenied: 'Notification permission denied',
        testSent: 'Test notification sent',
        testFailed: 'Error sending test notification',
        notificationSent: 'Notification sent',
        notificationFailed: 'Error sending notification',
        quietHoursActive: 'Notifications silenced by quiet mode',
      },
      // Errors
      errors: {
        invalidWebhookUrl: 'Invalid webhook URL',
        invalidBotToken: 'Invalid bot token',
        invalidChatId: 'Invalid chat ID',
        sendFailed: 'Error sending notification',
        permissionRequired: 'Notification permission required',
      },
    },
  },
};
