/**
 * useVisualEditor Hook
 * 
 * Manages the state and logic for the visual command editor.
 * Handles block manipulation, drag-and-drop, and text conversion.
 */

import { useState, useCallback, useMemo } from 'react';
import type { 
  CommandBlock, 
  BlockType, 
  BlockConfig,
  TextBlockConfig,
  VariableBlockConfig,
  ConditionalBlockConfig,
  ApiBlockConfig 
} from '../../../types/commandEditor';

/**
 * Generate a unique block ID
 */
function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a default config for a block type
 */
function createDefaultConfig(type: BlockType): BlockConfig {
  switch (type) {
    case 'text':
      return { type: 'text', content: '' };
    case 'variable':
      return { type: 'variable', variable: '$(user)' };
    case 'conditional':
      return { type: 'conditional', condition: 'has_args', trueContent: '', falseContent: '' };
    case 'api':
      return { type: 'api', url: '', fallback: 'Error al obtener datos' };
  }
}

/**
 * Convert blocks to text response
 */
export function blocksToText(blocks: CommandBlock[]): string {
  return blocks
    .sort((a, b) => a.position - b.position)
    .map(block => {
      switch (block.config.type) {
        case 'text':
          return block.config.content;
        case 'variable':
          return block.config.variable;
        case 'conditional': {
          const cond = block.config;
          return `[IF:${cond.condition}]${cond.trueContent}[ELSE]${cond.falseContent}[/IF]`;
        }
        case 'api':
          return `$(customapi.${block.config.url}|${block.config.fallback})`;
        default:
          return '';
      }
    })
    .join('');
}

/**
 * Parse text response to blocks (basic parsing)
 */
export function textToBlocks(text: string): CommandBlock[] {
  const blocks: CommandBlock[] = [];
  let position = 0;
  
  // Simple regex patterns for variables
  const variablePattern = /\$\([^)]+\)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = variablePattern.exec(text)) !== null) {
    // Add text before the variable
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index);
      if (textContent) {
        blocks.push({
          id: generateBlockId(),
          type: 'text',
          config: { type: 'text', content: textContent },
          position: position++,
        });
      }
    }
    
    // Add the variable
    blocks.push({
      id: generateBlockId(),
      type: 'variable',
      config: { type: 'variable', variable: match[0] },
      position: position++,
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    blocks.push({
      id: generateBlockId(),
      type: 'text',
      config: { type: 'text', content: text.slice(lastIndex) },
      position: position++,
    });
  }
  
  // If no blocks were created, create a single text block
  if (blocks.length === 0 && text) {
    blocks.push({
      id: generateBlockId(),
      type: 'text',
      config: { type: 'text', content: text },
      position: 0,
    });
  }
  
  return blocks;
}

/**
 * Generate preview with sample data
 */
export function generatePreview(blocks: CommandBlock[], context?: {
  user?: string;
  channel?: string;
  game?: string;
  title?: string;
}): string {
  const sampleData = {
    user: context?.user || 'Usuario123',
    touser: 'OtroUsuario',
    channel: context?.channel || 'MiCanal',
    game: context?.game || 'Just Chatting',
    title: context?.title || 'Stream de prueba',
    uptime: '2h 30m',
    viewers: '150',
    followers: '5000',
    time: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString(),
    random: String(Math.floor(Math.random() * 100) + 1),
    count: '42',
    args: 'argumento1 argumento2',
    arg1: 'argumento1',
    arg2: 'argumento2',
    query: 'argumento1%20argumento2',
  };
  
  let text = blocksToText(blocks);
  
  // Replace variables with sample data
  Object.entries(sampleData).forEach(([key, value]) => {
    text = text.replace(new RegExp(`\\$\\(${key}\\)`, 'gi'), value);
  });
  
  return text;
}

export interface UseVisualEditorReturn {
  /** Current blocks */
  blocks: CommandBlock[];
  /** Add a new block */
  addBlock: (type: BlockType, position?: number) => void;
  /** Remove a block */
  removeBlock: (id: string) => void;
  /** Update a block's config */
  updateBlock: (id: string, config: Partial<BlockConfig>) => void;
  /** Move a block to a new position */
  moveBlock: (id: string, newPosition: number) => void;
  /** Reorder blocks (for drag and drop) */
  reorderBlocks: (sourceIndex: number, destinationIndex: number) => void;
  /** Convert blocks to text */
  toText: () => string;
  /** Load blocks from text */
  fromText: (text: string) => void;
  /** Clear all blocks */
  clear: () => void;
  /** Get preview with sample data */
  preview: string;
  /** Set blocks directly */
  setBlocks: (blocks: CommandBlock[]) => void;
}

/**
 * Hook for managing visual editor state
 */
export function useVisualEditor(initialText: string = ''): UseVisualEditorReturn {
  const [blocks, setBlocks] = useState<CommandBlock[]>(() => 
    initialText ? textToBlocks(initialText) : []
  );

  const addBlock = useCallback((type: BlockType, position?: number) => {
    setBlocks(prev => {
      const newPosition = position ?? prev.length;
      const newBlock: CommandBlock = {
        id: generateBlockId(),
        type,
        config: createDefaultConfig(type),
        position: newPosition,
      };
      
      // Adjust positions of existing blocks
      const updated = prev.map(b => 
        b.position >= newPosition 
          ? { ...b, position: b.position + 1 }
          : b
      );
      
      return [...updated, newBlock].sort((a, b) => a.position - b.position);
    });
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const blockToRemove = prev.find(b => b.id === id);
      if (!blockToRemove) return prev;
      
      return prev
        .filter(b => b.id !== id)
        .map(b => 
          b.position > blockToRemove.position
            ? { ...b, position: b.position - 1 }
            : b
        );
    });
  }, []);

  const updateBlock = useCallback((id: string, configUpdate: Partial<BlockConfig>) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== id) return block;
      return {
        ...block,
        config: { ...block.config, ...configUpdate } as BlockConfig,
      };
    }));
  }, []);

  const moveBlock = useCallback((id: string, newPosition: number) => {
    setBlocks(prev => {
      const block = prev.find(b => b.id === id);
      if (!block) return prev;
      
      const oldPosition = block.position;
      if (oldPosition === newPosition) return prev;
      
      return prev.map(b => {
        if (b.id === id) {
          return { ...b, position: newPosition };
        }
        if (oldPosition < newPosition) {
          // Moving down
          if (b.position > oldPosition && b.position <= newPosition) {
            return { ...b, position: b.position - 1 };
          }
        } else {
          // Moving up
          if (b.position >= newPosition && b.position < oldPosition) {
            return { ...b, position: b.position + 1 };
          }
        }
        return b;
      }).sort((a, b) => a.position - b.position);
    });
  }, []);

  const reorderBlocks = useCallback((sourceIndex: number, destinationIndex: number) => {
    setBlocks(prev => {
      const result = [...prev].sort((a, b) => a.position - b.position);
      const [removed] = result.splice(sourceIndex, 1);
      result.splice(destinationIndex, 0, removed);
      
      return result.map((block, index) => ({
        ...block,
        position: index,
      }));
    });
  }, []);

  const toText = useCallback(() => blocksToText(blocks), [blocks]);

  const fromText = useCallback((text: string) => {
    setBlocks(textToBlocks(text));
  }, []);

  const clear = useCallback(() => {
    setBlocks([]);
  }, []);

  const preview = useMemo(() => generatePreview(blocks), [blocks]);

  return {
    blocks,
    addBlock,
    removeBlock,
    updateBlock,
    moveBlock,
    reorderBlocks,
    toText,
    fromText,
    clear,
    preview,
    setBlocks,
  };
}

export default useVisualEditor;
