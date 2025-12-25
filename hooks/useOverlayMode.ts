import { useEffect, useState } from 'react';

/**
 * Hook for overlay mode functionality
 * - Cleans up body background for true transparency in OBS
 * - Provides background color state with transparent as default
 */
export function useOverlayMode(isOverlayMode: boolean = false) {
  const [bgColor, setBgColor] = useState('transparent');

  // Clean up body background for overlay mode (removes dot pattern)
  useEffect(() => {
    if (isOverlayMode) {
      // Remove background patterns from body and html for true transparency
      document.body.style.background = 'transparent';
      document.body.style.backgroundColor = 'transparent';
      document.body.classList.remove('bg-dot-pattern', 'bg-dot-pattern-light', 'bg-zinc-100');
      document.documentElement.style.background = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
      
      return () => {
        // Restore on unmount (though overlay usually doesn't unmount)
        document.body.style.background = '';
        document.body.style.backgroundColor = '';
        document.documentElement.style.background = '';
        document.documentElement.style.backgroundColor = '';
      };
    }
  }, [isOverlayMode]);

  return { bgColor, setBgColor };
}

// Standard overlay background colors for chroma key
export const OVERLAY_BG_COLORS = ['transparent', '#00FF00', '#FF00FF', '#0000FF', '#000000'];
