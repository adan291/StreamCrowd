/**
 * CommandBlock Component
 * 
 * Individual block in the visual command editor.
 * Supports text, variable, conditional, and API blocks.
 */

import React, { useCallback } from 'react';
import { 
  GripVertical, 
  X, 
  Type, 
  Variable, 
  GitBranch, 
  Globe,
  ChevronDown
} from 'lucide-react';
import type { 
  CommandBlock as CommandBlockType, 
  BlockConfig,
  TextBlockConfig,
  VariableBlockConfig,
  ConditionalBlockConfig,
  ApiBlockConfig 
} from '../../types/commandEditor';
import { AVAILABLE_VARIABLES } from '../../types/commandEditor';

interface BlockProps {
  block: CommandBlockType;
  onUpdate: (config: Partial<BlockConfig>) => void;
  onRemove: () => void;
  isDragging?: boolean;
}

/**
 * Text block editor
 */
const TextBlockEditor: React.FC<{
  config: TextBlockConfig;
  onUpdate: (config: Partial<TextBlockConfig>) => void;
}> = ({ config, onUpdate }) => {
  return (
    <input
      type="text"
      value={config.content}
      onChange={(e) => onUpdate({ content: e.target.value })}
      placeholder="Escribe texto..."
      className="flex-1 bg-transparent text-white text-sm focus:outline-none"
    />
  );
};

/**
 * Variable block editor
 */
const VariableBlockEditor: React.FC<{
  config: VariableBlockConfig;
  onUpdate: (config: Partial<VariableBlockConfig>) => void;
}> = ({ config, onUpdate }) => {
  return (
    <div className="relative flex-1">
      <select
        value={config.variable}
        onChange={(e) => onUpdate({ variable: e.target.value })}
        className="w-full bg-transparent text-purple-400 text-sm focus:outline-none appearance-none cursor-pointer pr-6"
      >
        {AVAILABLE_VARIABLES.map(v => (
          <option key={v.variable} value={v.variable} className="bg-zinc-800">
            {v.variable} - {v.name}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
    </div>
  );
};

/**
 * Conditional block editor
 */
const ConditionalBlockEditor: React.FC<{
  config: ConditionalBlockConfig;
  onUpdate: (config: Partial<ConditionalBlockConfig>) => void;
}> = ({ config, onUpdate }) => {
  const conditions = [
    { value: 'has_args', label: 'Tiene argumentos' },
    { value: 'is_sub', label: 'Es suscriptor' },
    { value: 'is_mod', label: 'Es moderador' },
    { value: 'is_vip', label: 'Es VIP' },
    { value: 'random', label: 'Aleatorio (50%)' },
  ];

  return (
    <div className="flex-1 space-y-2">
      <select
        value={config.condition}
        onChange={(e) => onUpdate({ condition: e.target.value as ConditionalBlockConfig['condition'] })}
        className="w-full bg-zinc-700 text-white text-xs rounded px-2 py-1 focus:outline-none"
      >
        {conditions.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={config.trueContent}
          onChange={(e) => onUpdate({ trueContent: e.target.value })}
          placeholder="Si verdadero..."
          className="bg-zinc-700 text-green-400 text-xs rounded px-2 py-1 focus:outline-none"
        />
        <input
          type="text"
          value={config.falseContent}
          onChange={(e) => onUpdate({ falseContent: e.target.value })}
          placeholder="Si falso..."
          className="bg-zinc-700 text-red-400 text-xs rounded px-2 py-1 focus:outline-none"
        />
      </div>
    </div>
  );
};

/**
 * API block editor
 */
const ApiBlockEditor: React.FC<{
  config: ApiBlockConfig;
  onUpdate: (config: Partial<ApiBlockConfig>) => void;
}> = ({ config, onUpdate }) => {
  return (
    <div className="flex-1 space-y-2">
      <input
        type="text"
        value={config.url}
        onChange={(e) => onUpdate({ url: e.target.value })}
        placeholder="https://api.example.com/..."
        className="w-full bg-zinc-700 text-cyan-400 text-xs rounded px-2 py-1 focus:outline-none"
      />
      <input
        type="text"
        value={config.fallback}
        onChange={(e) => onUpdate({ fallback: e.target.value })}
        placeholder="Texto si falla..."
        className="w-full bg-zinc-700 text-zinc-400 text-xs rounded px-2 py-1 focus:outline-none"
      />
    </div>
  );
};

/**
 * Block type icons and colors
 */
const BLOCK_STYLES: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  text: { icon: <Type size={14} />, color: 'border-zinc-600', label: 'Texto' },
  variable: { icon: <Variable size={14} />, color: 'border-purple-500', label: 'Variable' },
  conditional: { icon: <GitBranch size={14} />, color: 'border-yellow-500', label: 'Condicional' },
  api: { icon: <Globe size={14} />, color: 'border-cyan-500', label: 'API' },
};

/**
 * Main CommandBlock component
 */
export const CommandBlock: React.FC<BlockProps> = ({
  block,
  onUpdate,
  onRemove,
  isDragging = false,
}) => {
  const style = BLOCK_STYLES[block.type];

  const handleUpdate = useCallback((update: Partial<BlockConfig>) => {
    onUpdate(update);
  }, [onUpdate]);

  const renderEditor = () => {
    switch (block.config.type) {
      case 'text':
        return <TextBlockEditor config={block.config} onUpdate={handleUpdate} />;
      case 'variable':
        return <VariableBlockEditor config={block.config} onUpdate={handleUpdate} />;
      case 'conditional':
        return <ConditionalBlockEditor config={block.config} onUpdate={handleUpdate} />;
      case 'api':
        return <ApiBlockEditor config={block.config} onUpdate={handleUpdate} />;
    }
  };

  return (
    <div
      className={`
        flex items-start gap-2 p-2 rounded-lg border-l-2 bg-zinc-800/50
        ${style.color}
        ${isDragging ? 'opacity-50 ring-2 ring-purple-500' : ''}
        transition-all
      `}
    >
      {/* Drag handle */}
      <div 
        className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 mt-1"
        title="Arrastrar para reordenar"
      >
        <GripVertical size={16} />
      </div>

      {/* Block type indicator */}
      <div className="flex items-center gap-1 text-zinc-500 mt-1" title={style.label}>
        {style.icon}
      </div>

      {/* Block content */}
      <div className="flex-1 min-w-0">
        {renderEditor()}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="text-zinc-500 hover:text-red-400 transition-colors mt-1"
        title="Eliminar bloque"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default CommandBlock;
