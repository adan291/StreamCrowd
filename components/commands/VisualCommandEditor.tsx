/**
 * VisualCommandEditor Component
 * 
 * Drag-and-drop visual editor for building command responses.
 * Allows users to construct commands using blocks without writing code.
 */

import React, { useState, useCallback } from 'react';
import { 
  Eye, 
  Code, 
  Layers,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles
} from 'lucide-react';
import { CommandBlock } from './CommandBlock';
import { CommandBlockPanel } from './CommandBlockPanel';
import { useVisualEditor } from '../../src/application/hooks/useVisualEditor';
import type { BlockType, BlockConfig } from '../../types/commandEditor';

interface VisualCommandEditorProps {
  /** Initial text value */
  initialValue?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * Visual command editor with drag-and-drop blocks
 */
export const VisualCommandEditor: React.FC<VisualCommandEditorProps> = ({
  initialValue = '',
  onChange,
  compact = false,
}) => {
  const [mode, setMode] = useState<'visual' | 'text'>('visual');
  const [textValue, setTextValue] = useState(initialValue);
  
  const {
    blocks,
    addBlock,
    removeBlock,
    updateBlock,
    reorderBlocks,
    toText,
    fromText,
    clear,
    preview,
  } = useVisualEditor(initialValue);

  // Sync text value when blocks change
  const handleBlockChange = useCallback(() => {
    const text = toText();
    setTextValue(text);
    onChange?.(text);
  }, [toText, onChange]);

  // Handle adding a block
  const handleAddBlock = useCallback((type: BlockType) => {
    addBlock(type);
    setTimeout(handleBlockChange, 0);
  }, [addBlock, handleBlockChange]);

  // Handle removing a block
  const handleRemoveBlock = useCallback((id: string) => {
    removeBlock(id);
    setTimeout(handleBlockChange, 0);
  }, [removeBlock, handleBlockChange]);

  // Handle updating a block
  const handleUpdateBlock = useCallback((id: string, config: Partial<BlockConfig>) => {
    updateBlock(id, config);
    setTimeout(handleBlockChange, 0);
  }, [updateBlock, handleBlockChange]);

  // Handle moving a block up
  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      reorderBlocks(index, index - 1);
      setTimeout(handleBlockChange, 0);
    }
  }, [reorderBlocks, handleBlockChange]);

  // Handle moving a block down
  const handleMoveDown = useCallback((index: number) => {
    if (index < blocks.length - 1) {
      reorderBlocks(index, index + 1);
      setTimeout(handleBlockChange, 0);
    }
  }, [blocks.length, reorderBlocks, handleBlockChange]);

  // Handle text mode change
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTextValue(value);
    onChange?.(value);
  }, [onChange]);

  // Switch to visual mode and parse text
  const handleSwitchToVisual = useCallback(() => {
    fromText(textValue);
    setMode('visual');
  }, [fromText, textValue]);

  // Switch to text mode
  const handleSwitchToText = useCallback(() => {
    setTextValue(toText());
    setMode('text');
  }, [toText]);

  // Handle clear
  const handleClear = useCallback(() => {
    clear();
    setTextValue('');
    onChange?.('');
  }, [clear, onChange]);

  // Insert variable into text mode
  const handleInsertVariable = useCallback((variable: string) => {
    if (mode === 'text') {
      setTextValue(prev => prev + variable);
      onChange?.(textValue + variable);
    } else {
      addBlock('variable');
      setTimeout(handleBlockChange, 0);
    }
  }, [mode, textValue, onChange, addBlock, handleBlockChange]);

  const sortedBlocks = [...blocks].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          <button
            onClick={handleSwitchToVisual}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              mode === 'visual' 
                ? 'bg-purple-500 text-white' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers size={14} />
            Visual
          </button>
          <button
            onClick={handleSwitchToText}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              mode === 'text' 
                ? 'bg-purple-500 text-white' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Code size={14} />
            Texto
          </button>
        </div>

        {blocks.length > 0 && mode === 'visual' && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-zinc-500 hover:text-red-400 text-sm transition-colors"
          >
            <Trash2 size={14} />
            Limpiar
          </button>
        )}
      </div>

      {/* Editor content */}
      {mode === 'visual' ? (
        <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-[1fr_200px]'} gap-3`}>
          {/* Blocks area */}
          <div className="space-y-3">
            {/* Drop zone */}
            <div className="bg-zinc-800/30 rounded-xl border border-zinc-700 border-dashed min-h-[120px] p-3">
              {sortedBlocks.length > 0 ? (
                <div className="space-y-2">
                  {sortedBlocks.map((block, index) => (
                    <div key={block.id} className="flex items-start gap-1">
                      <CommandBlock
                        block={block}
                        onUpdate={(config) => handleUpdateBlock(block.id, config)}
                        onRemove={() => handleRemoveBlock(block.id)}
                      />
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1 text-zinc-600 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Mover arriba"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === sortedBlocks.length - 1}
                          className="p-1 text-zinc-600 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Mover abajo"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-6">
                  <Sparkles size={24} className="mb-2 opacity-50" />
                  <p className="text-sm">Agrega bloques para construir tu comando</p>
                  <p className="text-xs mt-1">Usa el panel de la derecha o los botones de abajo</p>
                </div>
              )}
            </div>

            {/* Quick add buttons (compact mode) */}
            {compact && (
              <CommandBlockPanel
                onAddBlock={handleAddBlock}
                onInsertVariable={handleInsertVariable}
                compact
              />
            )}

            {/* Preview */}
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                <Eye size={12} />
                <span>Vista previa</span>
              </div>
              <p className="text-zinc-300 text-sm">
                {preview || <span className="text-zinc-600 italic">Sin contenido</span>}
              </p>
            </div>
          </div>

          {/* Block panel (full mode) */}
          {!compact && (
            <CommandBlockPanel
              onAddBlock={handleAddBlock}
              onInsertVariable={handleInsertVariable}
            />
          )}
        </div>
      ) : (
        /* Text mode */
        <div className="space-y-3">
          <textarea
            value={textValue}
            onChange={handleTextChange}
            placeholder="Escribe la respuesta del comando..."
            rows={4}
            className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none resize-none font-mono"
          />
          
          {/* Variable quick insert */}
          <div className="flex flex-wrap gap-1">
            {['$(user)', '$(channel)', '$(game)', '$(random)', '$(args)'].map(v => (
              <button
                key={v}
                onClick={() => handleInsertVariable(v)}
                className="text-xs bg-zinc-800 text-purple-400 px-2 py-1 rounded hover:bg-zinc-700 transition-colors"
              >
                {v}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
              <Eye size={12} />
              <span>Vista previa</span>
            </div>
            <p className="text-zinc-300 text-sm">
              {textValue || <span className="text-zinc-600 italic">Sin contenido</span>}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualCommandEditor;
