import React, { useRef, useState, useMemo } from 'react';
import { Upload, Trash2, Image as ImageIcon, Grid, X, Search, FileWarning, Loader2 } from 'lucide-react';
import { MediaAsset } from '../types';
import { NotificationType } from './Notification';

interface AssetLibraryProps {
  assets: MediaAsset[];
  onAdd: (asset: MediaAsset) => void;
  onDelete: (id: string) => void;
  onNotification: (type: NotificationType, message: string) => void;
}

const MAX_FILE_SIZE = 40 * 1024 * 1024; // 40MB

export const AssetLibrary: React.FC<AssetLibraryProps> = ({ assets, onAdd, onDelete, onNotification }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const processFile = (file: File) => {
    // 1. Validate Type
    if (!file.type.startsWith('image/')) {
        onNotification('error', 'El archivo debe ser una imagen.');
        return;
    }

    // 2. Validate Size
    if (file.size > MAX_FILE_SIZE) {
        onNotification('error', 'La imagen supera el límite de 40MB.');
        return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onerror = () => {
        onNotification('error', 'Error al leer el archivo.');
        setIsProcessing(false);
    };

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.src = readerEvent.target?.result as string;
      
      img.onload = () => {
        try {
            // Create a 150x150 square icon optimized for storage
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const ICON_SIZE = 150; 
            
            canvas.width = ICON_SIZE;
            canvas.height = ICON_SIZE;
            
            if (ctx) {
                // Calculate center crop
                const minDim = Math.min(img.width, img.height);
                const sx = (img.width - minDim) / 2;
                const sy = (img.height - minDim) / 2;

                // Draw image centered and cropped to square
                ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, ICON_SIZE, ICON_SIZE);
                
                const iconDataUrl = canvas.toDataURL('image/png'); // Compressed icon
                
                const newAsset: MediaAsset = {
                    id: Date.now().toString(),
                    name: file.name.split('.')[0].slice(0, 15),
                    data: iconDataUrl,
                    date: Date.now()
                };

                onAdd(newAsset);
                onNotification('success', 'Imagen añadida a la galería');
            }
        } catch (error) {
            console.error(error);
            onNotification('error', 'Error al procesar la imagen.');
        } finally {
            setIsProcessing(false);
        }
      };

      img.onerror = () => {
          onNotification('error', 'El archivo de imagen parece estar dañado.');
          setIsProcessing(false);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        processFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const filteredAssets = useMemo(() => {
    if (!searchQuery) return assets;
    return assets.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [assets, searchQuery]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex flex-col gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Grid size={16} className="text-twitch-brand dark:text-twitch-light" />
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">Galería</span>
                </div>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors border border-zinc-300 dark:border-zinc-700 shadow-sm"
                >
                    {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14} />}
                    <span className="hidden sm:inline">Subir</span>
                </button>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                    type="text" 
                    placeholder="Buscar iconos..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-twitch-brand dark:focus:ring-twitch-light transition-all"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleUpload} 
            />
        </div>

        {/* Drop Zone & Grid */}
        <div 
            className={`flex-1 overflow-y-auto p-4 custom-scrollbar relative transition-colors ${dragActive ? 'bg-twitch-brand/10 dark:bg-twitch-brand/20' : 'bg-zinc-100 dark:bg-black/20'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {dragActive && (
                <div className="absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed border-twitch-brand pointer-events-none bg-white/50 dark:bg-black/50 backdrop-blur-sm m-2 rounded-xl">
                    <div className="flex flex-col items-center text-twitch-brand dark:text-twitch-light animate-bounce">
                        <Upload size={48} />
                        <span className="font-bold mt-2">Suelta la imagen aquí</span>
                    </div>
                </div>
            )}

            {assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3">
                    <ImageIcon size={48} className="opacity-20" />
                    <p className="text-xs text-center max-w-[200px] leading-relaxed">
                        Arrastra imágenes aquí o usa el botón subir.<br/>
                        <span className="opacity-70">Soporta PNG, JPG, GIF (Máx 40MB).</span>
                    </p>
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
                    <Search size={32} className="opacity-30" />
                    <p className="text-xs">No se encontraron resultados.</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-3">
                    {filteredAssets.map((asset) => (
                        <div key={asset.id} className="group relative aspect-square bg-white dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm hover:ring-2 hover:ring-twitch-brand/50 dark:hover:ring-twitch-light/50 transition-all">
                            <img src={asset.data} alt={asset.name} className="w-full h-full object-cover" />
                            
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                <span className="text-[10px] text-white font-bold truncate px-2 w-full text-center select-none">{asset.name}</span>
                                <button 
                                    onClick={() => onDelete(asset.id)}
                                    className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-md transition-colors shadow-lg"
                                    title="Eliminar"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div className="p-2 text-[10px] text-zinc-500 text-center border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
            {assets.length} imágenes guardadas • Máx 40MB por archivo
        </div>
    </div>
  );
};