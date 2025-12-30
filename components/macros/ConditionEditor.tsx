/**
 * ConditionEditor Component
 * 
 * Visual editor for macro conditions.
 * Supports simple conditions and groups with AND/OR logic.
 * 
 * @requirements 6.5 - THE Macro_Editor SHALL show a condition editor with visual UI
 * @requirements 6.7 - THE Macro_Editor SHALL show preview of available variables
 */

import React, { useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
  Info,
} from 'lucide-react';
import type {
  MacroCondition,
  SimpleCondition,
  ConditionGroup,
  ConditionOperator,
  LogicalOperator,
} from '../../types/macros';

// ============================================
// Types
// ============================================

export interface ConditionEditorProps {
  /** Current condition (undefined if no condition) */
  condition?: MacroCondition;
  /** Callback when condition changes */
  onChange: (condition: MacroCondition | undefined) => void;
}

// ============================================
// Constants
// ============================================

const OPERATORS: { value: ConditionOperator; label: string; description: string }[] = [
  { value: 'equals', label: '=', description: 'Igual a' },
  { value: 'not_equals', label: '≠', description: 'Diferente de' },
  { value: 'greater', label: '>', description: 'Mayor que' },
  { value: 'less', label: '<', description: 'Menor que' },
  { value: 'contains', label: '∈', description: 'Contiene' },
  { value: 'not_contains', label: '∉', description: 'No contiene' },
];

const LOGICAL_OPERATORS: { value: LogicalOperator; label: string }[] = [
  { value: 'and', label: 'Y (AND)' },
  { value: 'or', label: 'O (OR)' },
];

const AVAILABLE_VARIABLES = [
  { name: '{username}', description: 'Usuario que activó el trigger' },
  { name: '{displayName}', description: 'Nombre de display del usuario' },
  { name: '{message}', description: 'Mensaje del chat' },
  { name: '{platform}', description: 'Plataforma de origen' },
  { name: '{viewers}', description: 'Viewers actuales' },
  { name: '{followers}', description: 'Total de seguidores' },
  { name: '{uptime}', description: 'Tiempo de stream' },
  { name: '{game}', description: 'Juego actual' },
  { name: '{title}', description: 'Título del stream' },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Create a default simple condition
 */
function createDefaultSimpleCondition(): SimpleCondition {
  return {
    leftOperand: '',
    operator: 'equals',
    rightOperand: '',
  };
}

/**
 * Create a default condition
 */
function createDefaultCondition(): MacroCondition {
  return {
    type: 'simple',
    simple: createDefaultSimpleCondition(),
  };
}

// ============================================
// Sub-Components
// ============================================

interface SimpleConditionEditorProps {
  condition: SimpleCondition;
  onChange: (condition: SimpleCondition) => void;
  onRemove?: () => void;
  showRemove?: boolean;
}

const SimpleConditionEditor: React.FC<SimpleConditionEditorProps> = ({
  condition,
  onChange,
  onRemove,
  showRemove = false,
}) => {
  const [showVariables, setShowVariables] = useState(false);

  const updateCondition = useCallback((updates: Partial<SimpleCondition>) => {
    onChange({ ...condition, ...updates });
  }, [condition, onChange]);

  const insertVariable = useCallback((field: 'left' | 'right', variable: string) => {
    if (field === 'left') {
      updateCondition({ leftOperand: condition.leftOperand + variable });
    } else {
      updateCondition({ rightOperand: condition.rightOperand + variable });
    }
    setShowVariables(false);
  }, [condition, updateCondition]);

  return (
    <div className="bg-zinc-700/50 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        {/* Left Operand */}
        <div className="flex-1">
          <input
            type="text"
            value={condition.leftOperand}
            onChange={(e) => updateCondition({ leftOperand: e.target.value })}
            placeholder="Variable o valor"
            className="w-full px-2 py-1.5 bg-zinc-600 border border-zinc-500 rounded text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        {/* Operator */}
        <select
          value={condition.operator}
          onChange={(e) => updateCondition({ operator: e.target.value as ConditionOperator })}
          className="px-2 py-1.5 bg-zinc-600 border border-zinc-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          title="Operador de comparación"
        >
          {OPERATORS.map(op => (
            <option key={op.value} value={op.value} title={op.description}>
              {op.label} {op.description}
            </option>
          ))}
        </select>

        {/* Right Operand */}
        <div className="flex-1">
          <input
            type="text"
            value={condition.rightOperand}
            onChange={(e) => updateCondition({ rightOperand: e.target.value })}
            placeholder="Variable o valor"
            className="w-full px-2 py-1.5 bg-zinc-600 border border-zinc-500 rounded text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        {/* Remove Button */}
        {showRemove && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            aria-label="Eliminar condición"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Variable Helper */}
      <div>
        <button
          type="button"
          onClick={() => setShowVariables(!showVariables)}
          className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
        >
          <Info size={12} />
          Variables disponibles
          {showVariables ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showVariables && (
          <div className="mt-2 p-2 bg-zinc-600/50 rounded-lg">
            <div className="grid grid-cols-2 gap-1">
              {AVAILABLE_VARIABLES.map(v => (
                <div key={v.name} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insertVariable('left', v.name)}
                    className="text-xs bg-zinc-500 text-purple-300 px-1.5 py-0.5 rounded hover:bg-zinc-400 transition-colors"
                    title={`Insertar en izquierda: ${v.description}`}
                  >
                    ←
                  </button>
                  <span className="text-xs text-zinc-300 flex-1 truncate" title={v.description}>
                    {v.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => insertVariable('right', v.name)}
                    className="text-xs bg-zinc-500 text-purple-300 px-1.5 py-0.5 rounded hover:bg-zinc-400 transition-colors"
                    title={`Insertar en derecha: ${v.description}`}
                  >
                    →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ConditionGroupEditorProps {
  group: ConditionGroup;
  onChange: (group: ConditionGroup) => void;
}

const ConditionGroupEditor: React.FC<ConditionGroupEditorProps> = ({
  group,
  onChange,
}) => {
  const updateOperator = useCallback((operator: LogicalOperator) => {
    onChange({ ...group, operator });
  }, [group, onChange]);

  const updateCondition = useCallback((index: number, condition: MacroCondition) => {
    const newConditions = [...group.conditions];
    newConditions[index] = condition;
    onChange({ ...group, conditions: newConditions });
  }, [group, onChange]);

  const addCondition = useCallback(() => {
    onChange({
      ...group,
      conditions: [...group.conditions, createDefaultCondition()],
    });
  }, [group, onChange]);

  const removeCondition = useCallback((index: number) => {
    if (group.conditions.length > 1) {
      onChange({
        ...group,
        conditions: group.conditions.filter((_, i) => i !== index),
      });
    }
  }, [group, onChange]);

  return (
    <div className="space-y-3">
      {/* Logical Operator Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400">Combinar con:</span>
        <div className="flex gap-1">
          {LOGICAL_OPERATORS.map(op => (
            <button
              key={op.value}
              type="button"
              onClick={() => updateOperator(op.value)}
              className={`px-2 py-1 rounded text-xs transition-all ${
                group.operator === op.value
                  ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                  : 'bg-zinc-700 border border-zinc-600 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {group.conditions.map((condition, index) => (
          <div key={index}>
            {index > 0 && (
              <div className="flex items-center justify-center py-1">
                <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                  {group.operator === 'and' ? 'Y' : 'O'}
                </span>
              </div>
            )}
            {condition.type === 'simple' && condition.simple && (
              <SimpleConditionEditor
                condition={condition.simple}
                onChange={(simple) => updateCondition(index, { type: 'simple', simple })}
                onRemove={() => removeCondition(index)}
                showRemove={group.conditions.length > 1}
              />
            )}
          </div>
        ))}
      </div>

      {/* Add Condition Button */}
      <button
        type="button"
        onClick={addCondition}
        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
      >
        <Plus size={12} />
        Añadir condición
      </button>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const ConditionEditor: React.FC<ConditionEditorProps> = ({
  condition,
  onChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(!!condition);

  /**
   * Enable condition
   */
  const enableCondition = useCallback(() => {
    onChange(createDefaultCondition());
    setIsExpanded(true);
  }, [onChange]);

  /**
   * Disable condition
   */
  const disableCondition = useCallback(() => {
    onChange(undefined);
    setIsExpanded(false);
  }, [onChange]);

  /**
   * Convert to group
   */
  const convertToGroup = useCallback(() => {
    if (condition?.type === 'simple' && condition.simple) {
      onChange({
        type: 'group',
        group: {
          operator: 'and',
          conditions: [
            { type: 'simple', simple: condition.simple },
            createDefaultCondition(),
          ],
        },
      });
    }
  }, [condition, onChange]);

  /**
   * Update simple condition
   */
  const updateSimple = useCallback((simple: SimpleCondition) => {
    onChange({ type: 'simple', simple });
  }, [onChange]);

  /**
   * Update group
   */
  const updateGroup = useCallback((group: ConditionGroup) => {
    onChange({ type: 'group', group });
  }, [onChange]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white"
        >
          <Filter size={14} className="text-purple-400" />
          Condición (opcional)
          {condition && (
            <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
              Activa
            </span>
          )}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {condition && (
          <button
            type="button"
            onClick={disableCondition}
            className="text-xs text-zinc-500 hover:text-red-400"
          >
            Quitar condición
          </button>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="pl-4 border-l-2 border-purple-500/30">
          {!condition ? (
            <div className="text-center py-4">
              <p className="text-sm text-zinc-500 mb-2">
                Añade una condición para ejecutar esta acción solo cuando se cumpla
              </p>
              <button
                type="button"
                onClick={enableCondition}
                className="flex items-center gap-1 mx-auto px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors"
              >
                <Plus size={14} />
                Añadir condición
              </button>
            </div>
          ) : condition.type === 'simple' && condition.simple ? (
            <div className="space-y-3">
              <SimpleConditionEditor
                condition={condition.simple}
                onChange={updateSimple}
              />
              <button
                type="button"
                onClick={convertToGroup}
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
              >
                <Plus size={12} />
                Añadir más condiciones (grupo)
              </button>
            </div>
          ) : condition.type === 'group' && condition.group ? (
            <ConditionGroupEditor
              group={condition.group}
              onChange={updateGroup}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ConditionEditor;
