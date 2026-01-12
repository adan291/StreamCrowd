/**
 * RaffleTab Component
 * Main tab for creating and running giveaways
 * 
 * Reorganizado para separar claramente:
 * - Configuración básica (tipo, palabra clave, filtros)
 * - Configuración de tiempo (programación + duración)
 * - Configuración avanzada (requisitos, bots, múltiples ganadores)
 */

import React, { useState } from 'react';
import { Play, RotateCcw, Timer, TimerOff, Settings, CircleDot, Users, Plus, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { ModeSelector } from './ModeSelector';
import { ParticipantsList } from './ParticipantsList';
import { WinnerDisplay } from './WinnerDisplay';
import { SpinWheel } from './SpinWheel';
import { RaffleTimingConfigComponent, type RaffleTimingConfig } from './RaffleTimingConfig';
import { PrizeImagePicker } from './PrizeImagePicker';
import { MultiWinnerConfig } from './MultiWinnerConfig';
import { RequirementsConfig } from './RequirementsConfig';
import { BotFilterConfig } from './BotFilterConfig';
import { RafflePreview } from './RafflePreview';
import type { RaffleMode, SubsGiveawayConfig, ParticipationRequirements } from './types';
import type { AnimationPhase } from './hooks/useWinnerAnimation';

// ============================================
// TYPES
// ============================================

export interface RaffleTabProps {
  // Mode
  mode: RaffleMode;
  onModeChange: (mode: RaffleMode) => void;
  
  // Title
  title?: string;
  onTitleChange?: (title: string) => void;
  
  // Config
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  useTimer: boolean;
  onUseTimerChange: (useTimer: boolean) => void;
  subsOnly: boolean;
  onSubsOnlyChange: (subsOnly: boolean) => void;
  
  // Timer duration
  timerDuration?: number; // in seconds
  onTimerDurationChange?: (duration: number) => void;
  
  // Scheduled start/end
  startNow?: boolean;
  onStartNowChange?: (startNow: boolean) => void;
  startDate?: string;
  onStartDateChange?: (date: string) => void;
  startTime?: string;
  onStartTimeChange?: (time: string) => void;
  endDate?: string;
  onEndDateChange?: (date: string) => void;
  endTime?: string;
  onEndTimeChange?: (time: string) => void;
  
  // Prize images
  prizeImages?: string[];
  onPrizeImagesChange?: (images: string[]) => void;
  
  // SpinWheel
  useSpinWheel?: boolean;
  onUseSpinWheelChange?: (useSpinWheel: boolean) => void;
  
  // Timer
  timeLeft: number;
  
  // Participants
  participants: Set<string> | string[];
  participantSources?: Map<string, 'manual' | 'chat' | 'import' | 'chatter'>;
  onAddParticipant?: (name: string) => boolean | void;
  onRemoveParticipant?: (name: string) => void;
  onClearParticipants?: () => void;
  isParticipant?: (name: string) => boolean;
  
  // Excluded list
  excludedList?: Set<string>;
  onExclude?: (name: string) => void;
  onRemoveExcluded?: (name: string) => void;
  onClearExcluded?: () => void;
  onExportExcluded?: () => void;
  onImportExcluded?: (content: string) => void;
  onMoveToExcluded?: (name: string) => void;
  onMoveToParticipants?: (name: string) => void;
  isExcluded?: (name: string) => boolean;
  
  // Participants management
  onAddMultipleParticipants?: (names: string[], source?: string) => void;
  onLoadChatters?: () => Promise<string[]>;
  onImportParticipants?: (content: string) => void;
  onExportParticipants?: () => void;
  isLoadingChatters?: boolean;
  
  // Raffle state
  isRunning: boolean;
  isSelecting: boolean;
  winner: string | null;
  
  // Animation
  animationPhase?: AnimationPhase;
  animationProgress?: number;
  currentDisplayName?: string;
  nearMissCandidates?: string[];
  onSkipAnimation?: () => void;
  
  // Actions
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  canStart: boolean;
  
  // Subs config
  subsConfig?: SubsGiveawayConfig;
  onOpenSubsConfig?: () => void;
  
  // Viewers count (for display)
  viewersCount?: number;
  
  // Create thread action
  onCreateThread?: () => void;
  
  // Multiple winners config
  winnersCount?: number;
  onWinnersCountChange?: (count: number) => void;
  allowRepeatWinners?: boolean;
  onAllowRepeatChange?: (allow: boolean) => void;
  prizes?: string[];
  onPrizesChange?: (prizes: string[]) => void;
  
  // Requirements config
  requirements?: ParticipationRequirements;
  onRequirementsChange?: (requirements: ParticipationRequirements) => void;
  
  // Timing config (nuevo sistema unificado)
  timingConfig?: RaffleTimingConfig;
  onTimingConfigChange?: (config: RaffleTimingConfig) => void;
  
  // View mode
  viewMode?: 'compact' | 'expanded';
  
  // Custom class
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const RaffleTab: React.FC<RaffleTabProps> = ({
  mode,
  onModeChange,
  title = '',
  onTitleChange,
  keyword,
  onKeywordChange,
  useTimer,
  onUseTimerChange,
  subsOnly,
  onSubsOnlyChange,
  timerDuration = 60,
  onTimerDurationChange,
  startNow = true,
  onStartNowChange,
  startDate = '',
  onStartDateChange,
  startTime = '',
  onStartTimeChange,
  endDate = '',
  onEndDateChange,
  endTime = '',
  onEndTimeChange,
  prizeImages = [],
  onPrizeImagesChange,
  useSpinWheel = false,
  onUseSpinWheelChange,
  timeLeft,
  participants,
  participantSources,
  onAddParticipant,
  onRemoveParticipant,
  onClearParticipants,
  isParticipant,
  excludedList,
  onExclude,
  onRemoveExcluded,
  onClearExcluded,
  onExportExcluded,
  onImportExcluded,
  onMoveToExcluded,
  onMoveToParticipants,
  isExcluded,
  onAddMultipleParticipants,
  onLoadChatters,
  onImportParticipants,
  onExportParticipants,
  isLoadingChatters = false,
  isRunning,
  isSelecting,
  winner,
  animationPhase = 'idle',
  animationProgress = 0,
  currentDisplayName = '',
  nearMissCandidates = [],
  onSkipAnimation,
  onStart,
  onStop,
  onReset,
  canStart,
  subsConfig,
  onOpenSubsConfig,
  viewersCount = 0,
  onCreateThread,
  winnersCount = 1,
  onWinnersCountChange,
  allowRepeatWinners = false,
  onAllowRepeatChange,
  prizes = [],
  onPrizesChange,
  requirements = {},
  onRequirementsChange,
  timingConfig,
  onTimingConfigChange,
  viewMode = 'expanded',
  className = '',
}) => {
  const participantArray = Array.isArray(participants) ? participants : Array.from(participants);
  const participantCount = participantArray.length;
  const showWinnerDisplay = isSelecting || winner;
  const canUseSpinWheel = participantCount > 0 && participantCount <= 20 && mode !== 'subs';

  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  // Format time left
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // COMPACT VIEW
  // ============================================
  if (viewMode === 'compact') {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Title input - compact */}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange?.(e.target.value)}
          disabled={isRunning}
          placeholder="Título del sorteo..."
          className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />

        {/* Mode selector - horizontal compact */}
        <ModeSelector
          value={mode}
          onChange={onModeChange}
          disabled={isRunning}
          size="sm"
          showDescriptions={false}
          direction="horizontal"
        />

        {/* Keyword input - compact */}
        {mode === 'keyword' && (
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            disabled={isRunning}
            placeholder="Palabra clave..."
            className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
        )}

        {/* Quick toggles row */}
        {mode !== 'subs' && (
          <div className="flex gap-2">
            <button
              onClick={() => onUseTimerChange(!useTimer)}
              disabled={isRunning}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                useTimer 
                  ? 'bg-purple-500/20 text-purple-500 border border-purple-500/30' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700'
              } disabled:opacity-50`}
            >
              {useTimer ? <Timer size={14} /> : <TimerOff size={14} />}
              Timer
            </button>
            <button
              onClick={() => onSubsOnlyChange(!subsOnly)}
              disabled={isRunning}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                subsOnly 
                  ? 'bg-pink-500/20 text-pink-500 border border-pink-500/30' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700'
              } disabled:opacity-50`}
            >
              <Users size={14} />
              Subs
            </button>
          </div>
        )}

        {/* Timer display when running */}
        {isRunning && useTimer && timeLeft > 0 && (
          <div className="text-center py-2">
            <div className="text-3xl font-bold text-purple-500 font-mono">
              {formatTime(timeLeft)}
            </div>
            <p className="text-xs text-zinc-500">{participantCount} participantes</p>
          </div>
        )}

        {/* Winner display - compact */}
        {showWinnerDisplay && !useSpinWheel && (
          <WinnerDisplay
            currentName={currentDisplayName || winner || ''}
            phase={animationPhase}
            progress={animationProgress}
            nearMissCandidates={nearMissCandidates}
            onSkip={onSkipAnimation}
            className="py-2"
          />
        )}

        {/* Action button - single prominent button */}
        {!useSpinWheel && (
          <div>
            {!isRunning && !winner && (
              <button
                onClick={onStart}
                disabled={!canStart}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={18} />
                Iniciar
              </button>
            )}
            {isRunning && !isSelecting && (
              <button
                onClick={onStop}
                className="w-full py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600"
              >
                Detener
              </button>
            )}
            {winner && (
              <button
                onClick={onReset}
                className="w-full py-3 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium flex items-center justify-center gap-2 hover:bg-zinc-300 dark:hover:bg-zinc-600"
              >
                <RotateCcw size={16} />
                Nuevo
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // EXPANDED VIEW (default)
  // ============================================

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Selector - disabled when running */}
      <div>
        <label className="block text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400 mb-2">
          Tipo de sorteo
        </label>
        <ModeSelector
          value={mode}
          onChange={onModeChange}
          disabled={isRunning}
          size="sm"
          showDescriptions={false}
          direction="horizontal"
        />
      </div>

      {/* Title input */}
      <div>
        <label className="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-2">
          Título del sorteo
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange?.(e.target.value)}
          disabled={isRunning}
          placeholder="Ej: Sorteo de subs, Giveaway especial..."
          className="w-full px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
        />
      </div>

      {/* Keyword input for keyword mode */}
      {mode === 'keyword' && (
        <div>
          <label className="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-2">
            Palabra clave *
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            disabled={isRunning}
            placeholder="Ej: !sorteo"
            className="w-full px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
          />
        </div>
      )}

      {/* Prize image picker */}
      {onPrizeImagesChange && (
        <PrizeImagePicker
          images={prizeImages}
          onChange={onPrizeImagesChange}
          disabled={isRunning}
          maxImages={3}
        />
      )}

      {/* Subs config for subs mode */}
      {mode === 'subs' && onOpenSubsConfig && (
        <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-pink-600 dark:text-pink-400">
                Configuración de Subs
              </p>
              {subsConfig && (
                <p className="text-xs text-zinc-500 mt-1">
                  T1: {subsConfig.tier1Entries}, T2: {subsConfig.tier2Entries}, T3: {subsConfig.tier3Entries}
                </p>
              )}
            </div>
            <button
              onClick={onOpenSubsConfig}
              disabled={isRunning}
              className="p-2 rounded-lg bg-pink-500/20 text-pink-500 hover:bg-pink-500/30 disabled:opacity-50"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* CONFIGURACIÓN DE TIEMPO - Sección colapsable */}
      {/* ============================================ */}
      {mode !== 'subs' && (
        <div className="space-y-3">
          {/* Toggle para activar temporizador */}
          <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <div className="flex items-center gap-2">
              <Clock size={16} className={useTimer ? 'text-purple-500' : 'text-zinc-400'} />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Configurar tiempo
              </span>
            </div>
            <button
              onClick={() => onUseTimerChange(!useTimer)}
              disabled={isRunning}
              className={`
                relative w-10 h-5 rounded-full transition-colors
                ${useTimer ? 'bg-purple-500' : 'bg-zinc-300 dark:bg-zinc-600'}
                disabled:opacity-50
              `}
              aria-label={useTimer ? 'Desactivar temporizador' : 'Activar temporizador'}
            >
              <span
                className={`
                  absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm
                  ${useTimer ? 'left-5' : 'left-0.5'}
                `}
              />
            </button>
          </div>

          {/* Configuración de tiempo expandida - Nuevo componente mejorado */}
          {useTimer && timingConfig && onTimingConfigChange && (
            <div className="p-3 bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/20 rounded-xl">
              <RaffleTimingConfigComponent
                config={timingConfig}
                onChange={onTimingConfigChange}
                disabled={isRunning}
              />
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* FILTROS DE PARTICIPACIÓN */}
      {/* ============================================ */}
      {mode !== 'subs' && (
        <div className="space-y-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
            <Users size={12} />
            Filtros de participación
          </label>
          
          <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              Solo suscriptores
            </span>
            <button
              onClick={() => onSubsOnlyChange(!subsOnly)}
              disabled={isRunning}
              className={`
                relative w-10 h-5 rounded-full transition-colors
                ${subsOnly ? 'bg-pink-500' : 'bg-zinc-300 dark:bg-zinc-600'}
                disabled:opacity-50
              `}
              aria-label={subsOnly ? 'Desactivar solo suscriptores' : 'Activar solo suscriptores'}
            >
              <span
                className={`
                  absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm
                  ${subsOnly ? 'left-5' : 'left-0.5'}
                `}
              />
            </button>
          </div>
        </div>
      )}

      {/* SpinWheel toggle - only when ≤20 participants and not subs mode */}
      {canUseSpinWheel && onUseSpinWheelChange && (
        <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-2">
            <CircleDot size={16} className={useSpinWheel ? 'text-amber-500' : 'text-zinc-400'} />
            <div>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Rueda de la Fortuna
              </span>
              <p className="text-xs text-zinc-500">
                {participantCount}/20 participantes
              </p>
            </div>
          </div>
          <button
            onClick={() => onUseSpinWheelChange(!useSpinWheel)}
            disabled={isRunning}
            className={`
              relative w-10 h-5 rounded-full transition-colors
              ${useSpinWheel ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'}
              disabled:opacity-50
            `}
          >
            <span
              className={`
                absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform
                ${useSpinWheel ? 'left-5' : 'left-0.5'}
              `}
            />
          </button>
        </div>
      )}

      {/* Multiple winners config */}
      {onWinnersCountChange && onAllowRepeatChange && onPrizesChange && (
        <MultiWinnerConfig
          winnersCount={winnersCount}
          onWinnersCountChange={onWinnersCountChange}
          allowRepeatWinners={allowRepeatWinners}
          onAllowRepeatChange={onAllowRepeatChange}
          prizes={prizes}
          onPrizesChange={onPrizesChange}
          disabled={isRunning}
          participantCount={participantCount}
        />
      )}

      {/* Advanced config toggle */}
      <button
        onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
        disabled={isRunning}
        className="w-full flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
      >
        <span className="flex items-center gap-2">
          <Settings size={14} />
          Configuración avanzada
        </span>
        {showAdvancedConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Advanced config content */}
      {showAdvancedConfig && (
        <div className="space-y-3">
          {onRequirementsChange && (
            <RequirementsConfig
              requirements={requirements}
              onChange={onRequirementsChange}
              disabled={isRunning}
            />
          )}
          <BotFilterConfig />
        </div>
      )}

      {/* Timer display when running */}
      {isRunning && useTimer && timeLeft > 0 && (
        <div className="text-center py-4">
          <div className="text-4xl font-bold text-purple-500 font-mono">
            {formatTime(timeLeft)}
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            {participantCount} participantes
          </p>
        </div>
      )}

      {/* Viewers count display - when not running and mode is viewers */}
      {!isRunning && mode === 'viewers' && !useTimer && viewersCount > 0 && (
        <div className="text-center py-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users size={24} className="text-purple-500" />
          </div>
          <div className="text-4xl font-bold text-purple-500">
            {viewersCount}
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            {subsOnly ? 'suscriptores en chat' : 'usuarios en chat'}
          </p>
        </div>
      )}

      {/* Winner display */}
      {showWinnerDisplay && !useSpinWheel && (
        <WinnerDisplay
          currentName={currentDisplayName || winner || ''}
          phase={animationPhase}
          progress={animationProgress}
          nearMissCandidates={nearMissCandidates}
          onSkip={onSkipAnimation}
          className="py-4"
        />
      )}

      {/* SpinWheel display */}
      {useSpinWheel && canUseSpinWheel && !isRunning && (
        <div className="py-4">
          <SpinWheel
            participants={participantArray}
            onWinnerSelected={() => {
              // Note: The parent component handles the winner through onStart/onStop
            }}
            disabled={isRunning}
          />
        </div>
      )}

      {/* Participants list - always show for viewers and keyword modes */}
      {mode !== 'subs' && (
        <ParticipantsList
            participants={participants}
            participantSources={participantSources}
            onAdd={onAddParticipant}
            onAddMultiple={onAddMultipleParticipants}
            onRemove={onRemoveParticipant}
            onClear={onClearParticipants}
            onExclude={onExclude}
            onRemoveExcluded={onRemoveExcluded}
            onClearExcluded={onClearExcluded}
            onExportExcluded={onExportExcluded}
            onImportExcluded={onImportExcluded}
            onMoveToExcluded={onMoveToExcluded}
            onMoveToParticipants={onMoveToParticipants}
            onLoadChatters={onLoadChatters}
            onImport={onImportParticipants}
            onExport={onExportParticipants}
            excludedList={excludedList}
            isExcluded={isExcluded}
            isParticipant={isParticipant}
            isLoadingChatters={isLoadingChatters}
            maxHeight="250px"
            showActions={!isRunning}
            title={isRunning ? `Participantes (${participantCount})` : 'Participantes'}
            emptyMessage={isRunning ? 'Esperando participantes...' : 'Añade participantes o inicia el sorteo'}
          />
      )}

      {/* Raffle Preview - shows summary and start button */}
      {!useSpinWheel && !isRunning && !winner && (
        <RafflePreview
          mode={mode}
          keyword={keyword}
          useTimer={useTimer}
          timerDuration={timerDuration}
          subsOnly={subsOnly}
          participantCount={participantCount}
          isConnected={canStart}
          scheduledStart={!startNow && startDate && startTime ? { date: startDate, time: startTime } : undefined}
          winnersCount={winnersCount}
          prizes={prizes}
          prizeImages={prizeImages}
          timingConfig={timingConfig}
          onStart={onStart}
        />
      )}

      {/* Action buttons when running or has winner */}
      {!useSpinWheel && (isRunning || winner) && (
        <div className="flex gap-2">
          {isRunning && !isSelecting && (
            <button
              onClick={onStop}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-600 transition-colors"
            >
              Detener
            </button>
          )}

          {winner && (
            <button
              onClick={onReset}
              className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            >
              <RotateCcw size={16} />
              Nuevo sorteo
            </button>
          )}
        </div>
      )}

      {/* Create thread button - only for keyword mode without timer */}
      {mode === 'keyword' && !useTimer && keyword.trim() && !isRunning && onCreateThread && (
        <button
          onClick={onCreateThread}
          className="w-full py-2.5 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Crear hilo en segundo plano
        </button>
      )}

      {/* Help text */}
      {!isRunning && !winner && (
        <p className="text-xs text-zinc-500 text-center mt-2">
          {mode === 'viewers' && useTimer && 'Los usuarios que escriban durante el tiempo participarán'}
          {mode === 'viewers' && !useTimer && 'Sorteo instantáneo entre los usuarios del chat'}
          {mode === 'keyword' && useTimer && `Los usuarios que escriban "${keyword || '...'}" participarán`}
          {mode === 'keyword' && !useTimer && 'Crea un hilo para recolectar participantes sin límite de tiempo'}
          {mode === 'subs' && 'Los suscriptores participan según su tier y configuración'}
        </p>
      )}
    </div>
  );
};

export default RaffleTab;
