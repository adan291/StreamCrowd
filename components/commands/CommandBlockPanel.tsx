/**
 * CommandBlockPanel Component
 * 
 * Panel showing available block types that can be added to the visual editor.
 */

import React from 'react';
import { 
  Type, 
  Variable, 
  GitBranch, 
  Globe,
  Plus,
  Info
} from 'lucide-react';
import type { BlockType } from '../../types/commandEditor';
import { AVAILABLE_VARIABLES } from '../../types/commandEditor';

interface BlockTypeInfo {
  type: BlockType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const BLOCK_TYPES: BlockTypeInfo[] = [
  {
    type: 'text',
    name: 'Texto',
    description: 'Texto estático',
    icon: <Type size={16} />,
    color: 'text-zinc-400 hover:text-white hover:bg-zinc-700',
  },
  {
    type: 'variable',
    name: 'Variable',
    description: 'Valor dinámico',
    icon: <Variable size={16} />,
    color: 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/20',
  },
  {
    type: 'conditional',
    name: 'Condicional',
    description: 'Si/entonces',
    icon: <GitBranch size={16} />,
    color: 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20',
  },
  {
    type: 'api',
    name: 'API',
    description: 'Datos externos',
    icon: <Globe size={16} />,
    color: 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20',
  },
];

interface BlockButtonProps {
  blockType: BlockTypeInfo;
  onAdd: (type: BlockType) => void;
}

const BlockButton: React.FC<BlockButtonProps> = ({ blockType, onAdd }) => {
  return (
    <button
      onClick={() => onAdd(blockType.type)}
      className={`
        flex items-center gap-2 w-full p-2 rounded-lg border border-zinc-700
        transition-all ${blockType.color}
      `}
      title={blockType.description}
    >
      {blockType.icon}
      <span className="text-sm font-medium">{blockType.name}</span>
      <Plus size={14} className="ml-auto opacity-50" />
    </button>
  );
};

interface VariableReferenceProps {
  onInsert?: (variable: string) => void;
}

const VariableReference: React.FC<VariableReferenceProps> = ({ onInsert }) => {
  const categories = [
    { id: 'user', name: 'Usuario' },
    { id: 'channel', name: 'Canal' },
    { id: 'stream', name: 'Stream' },
    { id: 'utility', name: 'Utilidad' },
    { id: 'advanced', name: 'Avanzado' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-zinc-500 text-xs">
        <Info size={12} />
        <span>Variables disponibles</span>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {categories.map(cat => {
          const vars = AVAILABLE_VARIABLES.filter(v => v.category === cat.id);
          if (vars.length === 0) return null;
          
          return (
            <div key={cat.id}>
              <p className="text-zinc-600 text-xs mb-1">{cat.name}</p>
              <div className="flex flex-wrap gap-1">
                {vars.map(v => (
                  <button
                    key={v.variable}
                    onClick={() => onInsert?.(v.variable)}
                    className="text-xs bg-zinc-800 text-purple-400 px-1.5 py-0.5 rounded hover:bg-zinc-700 transition-colors"
                    title={v.description}
                  >
                    {v.variable}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface CommandBlockPanelProps {
  onAddBlock: (type: BlockType) => void;
  onInsertVariable?: (variable: string) => void;
  compact?: boolean;
}

/**
 * Panel for adding blocks to the visual editor
 */
export const CommandBlockPanel: React.FC<CommandBlockPanelProps> = ({
  onAddBlock,
  onInsertVariable,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {BLOCK_TYPES.map(blockType => (
          <button
            key={blockType.type}
            onClick={() => onAddBlock(blockType.type)}
            className={`p-2 rounded-lg border border-zinc-700 transition-all ${blockType.color}`}
            title={`Agregar ${blockType.name}`}
          >
            {blockType.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700 space-y-4">
      {/* Block types */}
      <div>
        <p className="text-zinc-400 text-xs font-medium mb-2">Agregar bloque</p>
        <div className="space-y-1">
          {BLOCK_TYPES.map(blockType => (
            <BlockButton
              key={blockType.type}
              blockType={blockType}
              onAdd={onAddBlock}
            />
          ))}
        </div>
      </div>

      {/* Variable reference */}
      <div className="pt-3 border-t border-zinc-700">
        <VariableReference onInsert={onInsertVariable} />
      </div>
    </div>
  );
};

export default CommandBlockPanel;
