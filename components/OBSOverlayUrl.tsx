import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, ExternalLink, HelpCircle, X, Monitor } from 'lucide-react';

interface OBSOverlayUrlProps {
  overlayParam: string;
  title?: string;
}

export const OBSOverlayUrl: React.FC<OBSOverlayUrlProps> = ({ 
  overlayParam, 
  title = 'overlay' 
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

  const helpModal = showHelp ? createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      style={{ zIndex: 99999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'auto' }}
      onClick={() => setShowHelp(false)}
    >
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-sm rounded-xl shadow-2xl p-4 animate-scale-up"
        style={{ pointerEvents: 'auto' }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2 text-sm">
            <Monitor size={16} className="text-purple-500" />
            Configurar OBS
          </h3>
          <button 
            onClick={() => setShowHelp(false)} 
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="space-y-3 text-xs">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-500/10 rounded-lg border border-purple-200 dark:border-purple-500/20">
            <p className="font-semibold text-purple-700 dark:text-purple-300 mb-1.5 flex items-center gap-1.5">
              🖥️ Window Capture
              <span className="text-[10px] bg-purple-200 dark:bg-purple-500/30 px-1.5 py-0.5 rounded-full">recomendado</span>
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-purple-600/80 dark:text-purple-400/80 text-[11px]">
              <li>"Abrir" → se abre ventana</li>
              <li>OBS: + → Window Capture</li>
              <li>Filtro Chroma Key (verde)</li>
            </ol>
          </div>
          
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">🌐 Browser Source</p>
            <ol className="list-decimal list-inside space-y-0.5 text-zinc-500 dark:text-zinc-400 text-[11px]">
              <li>"URL" → copiar enlace</li>
              <li>OBS: + → Browser → pegar</li>
              <li>Fondo transparente automático</li>
            </ol>
          </div>
        </div>
        
        <button
          onClick={() => setShowHelp(false)}
          className="mt-3 w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors text-xs"
        >
          Entendido
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {/* Compact inline badge */}
      <div className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border border-purple-500/20 rounded-full px-2 py-1">
        <Monitor size={12} className="text-purple-500" />
        <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400">OBS</span>
        
        <button
          onClick={openOverlay}
          className="flex items-center gap-1 px-2 py-0.5 bg-purple-500 hover:bg-purple-600 text-white text-[10px] font-medium rounded-full transition-colors"
          title={`Abrir ${title}`}
        >
          <ExternalLink size={10} />
          Abrir
        </button>
        
        <button
          onClick={copyUrl}
          className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full transition-all ${
            copied 
              ? 'bg-green-500 text-white' 
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
          }`}
          title="Copiar URL para Browser Source"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? '✓' : 'URL'}
        </button>
        
        <button
          onClick={() => setShowHelp(true)}
          className="p-0.5 text-zinc-400 hover:text-purple-500 transition-colors"
          title="Ayuda"
        >
          <HelpCircle size={12} />
        </button>
      </div>

      {helpModal}
    </>
  );
};

export default OBSOverlayUrl;
