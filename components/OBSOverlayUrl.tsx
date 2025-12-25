import React, { useState } from 'react';
import { Copy, Check, ExternalLink, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface OBSOverlayUrlProps {
  overlayParam: string;
  title?: string;
}

export const OBSOverlayUrl: React.FC<OBSOverlayUrlProps> = ({ 
  overlayParam, 
  title = 'el overlay' 
}) => {
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const getOverlayUrl = () => {
    const baseUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.host}${window.location.pathname}`
      : '';
    return `${baseUrl}?${overlayParam}=true`;
  };

  const openOverlay = () => {
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(getOverlayUrl(), `Overlay_${overlayParam}`, `width=${width},height=${height},left=${left},top=${top}`);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(getOverlayUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-2">
      {/* Compact row */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">OBS:</span>
        
        <button
          onClick={openOverlay}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-twitch-brand hover:bg-twitch-light text-white text-xs font-medium rounded-md transition-colors"
        >
          <ExternalLink size={12} />
          Abrir
        </button>
        
        <span className="text-zinc-400 dark:text-zinc-600 text-xs">o</span>
        
        <button
          onClick={copyUrl}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            copied 
              ? 'bg-green-500 text-white' 
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
          }`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copiado' : 'Copiar URL'}
        </button>
        
        <button
          onClick={() => setShowHelp(!showHelp)}
          className={`ml-auto flex items-center gap-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
            showHelp 
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300' 
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <HelpCircle size={12} />
          {showHelp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Collapsible help */}
      {showHelp && (
        <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
          <div>
            <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">🖥️ Window Capture (recomendado):</p>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
              <li>Clic en "Abrir" → se abre ventana del overlay</li>
              <li>OBS: + → Window Capture → selecciona la ventana</li>
              <li>Filtro Chroma Key: clic derecho → Filtros → + → Chroma Key</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">🌐 Browser Source:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
              <li>Clic en "Copiar URL"</li>
              <li>OBS: + → Browser → pega la URL</li>
              <li>No necesita Chroma Key (fondo transparente)</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default OBSOverlayUrl;
