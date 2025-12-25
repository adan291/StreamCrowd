import React, { useEffect } from 'react';
import { Settings } from 'lucide-react';

export const OVERLAY_BG_COLORS = ['transparent', '#00FF00', '#FF00FF', '#0000FF', '#000000'];

// Clean up body background for overlay mode
const useCleanOverlayBackground = () => {
  useEffect(() => {
    document.body.style.background = 'transparent';
    document.body.style.backgroundColor = 'transparent';
    document.body.classList.remove('bg-dot-pattern', 'bg-dot-pattern-light', 'bg-zinc-100');
    document.documentElement.style.background = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    
    return () => {
      document.body.style.background = '';
      document.body.style.backgroundColor = '';
      document.documentElement.style.background = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);
};

interface OverlayChromaKeyProps {
  bgColor: string;
  setBgColor: (color: string) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}

export const OverlayChromaKey: React.FC<OverlayChromaKeyProps> = ({
  bgColor,
  setBgColor,
  showSettings,
  setShowSettings,
}) => {
  return (
    <>
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="fixed top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg z-50"
        title="Configuración de Chroma Key"
      >
        <Settings size={18} />
      </button>
      
      {showSettings && (
        <div className="fixed top-12 right-2 bg-zinc-900 rounded-xl p-4 shadow-xl border border-zinc-700 z-50 w-48">
          <p className="text-xs text-zinc-400 mb-2 font-bold">Chroma Key (OBS)</p>
          <div className="flex gap-1 flex-wrap">
            {OVERLAY_BG_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setBgColor(color)}
                className={`w-8 h-8 rounded border-2 transition-transform ${
                  bgColor === color ? 'border-white scale-110' : 'border-zinc-600 hover:border-zinc-400'
                } ${color === 'transparent' ? 'bg-[conic-gradient(#666_25%,#888_25%_50%,#666_50%_75%,#888_75%)] bg-[length:8px_8px]' : ''}`}
                style={{ backgroundColor: color === 'transparent' ? undefined : color }}
                title={color === 'transparent' ? 'Transparente' : color}
              />
            ))}
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">
            Transparente = sin fondo para OBS
          </p>
        </div>
      )}
    </>
  );
};

// Hook para usar el chroma key fácilmente
export const useOverlayChromaKey = (defaultColor: string = 'transparent') => {
  const [bgColor, setBgColor] = React.useState(defaultColor);
  const [showSettings, setShowSettings] = React.useState(false);
  
  // Clean up body background for true transparency
  useCleanOverlayBackground();
  
  return {
    bgColor,
    setBgColor,
    showSettings,
    setShowSettings,
    chromaKeyProps: { bgColor, setBgColor, showSettings, setShowSettings },
  };
};
