
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Upload, Trash2, Image as ImageIcon, Grid, X, Search, FileWarning, Loader2, LayoutList, LayoutGrid, HardDrive } from 'lucide-react';
import { MediaAsset } from '../types';
import { NotificationType } from './Notification';
import { useI18n } from '../i18n';

interface AssetLibraryProps {
  assets: MediaAsset[];
  onAdd: (asset: MediaAsset) => void;
  onDelete: (id: string) => void;
  onNotification: (type: NotificationType, message: string) => void;
}

const MAX_FILE_SIZE = 40 * 1024 * 1024; // 40MB
const BROWSER_STORAGE_LIMIT_ESTIMATE = 5 * 1024 * 1024; // ~5MB safe limit for localStorage

export const AssetLibrary: React.FC<AssetLibraryProps> = ({ assets, onAdd, onDelete, onNotification }) => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOrder, setSortOrder] = useState<'date' | 'name'>('date');
  const [visibleCount, setVisibleCount] = useState(20);
  const [storageUsed, setStorageUsed] = useState(0);

  // Calculate Storage Usage
  useEffect(() => {
    let total = 0;
    assets.forEach(asset => total += asset.data.length);
    setStorageUsed(total);
  }, [assets]);

  const storagePercent = Math.min(100, (storageUsed / BROWSER_STORAGE_LIMIT_ESTIMATE) * 100);
  const isStorageCritical = storagePercent > 90;

  const processFile = (file: File) => {
    // 1. Validate Type
    if (!file.type.startsWith('image/')) {
        onNotification('error', t.gallery.uploadHint);
        return;
    }

    // 2. Validate Size
    if (file.size > MAX_FILE_SIZE) {
        onNotification('error', t.gallery.maxSize);
        return;
    }
    
    // 3. Storage Check
    if (isStorageCritical) {
        onNotification('error', 'Almacenamiento lleno. Elimina imágenes antiguas.');
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
                onNotification('success', t.notifications.saved);
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

  const handleScroll = () => {
      if (scrollContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
          if (scrollHeight - scrollTop - clientHeight < 100) {
              setVisibleCount(prev => prev + 20);
          }
      }
  };

  const filteredAssets = useMemo(() => {
    let result = assets;
    if (searchQuery) {
        result = result.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result.sort((a, b) => sortOrder === 'date' ? b.date - a.date : a.name.localeCompare(b.name));
  }, [assets, searchQuery, sortOrder]);

  const visibleAssets = filteredAssets.slice(0, visibleCount);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-900 pb-16 md:pb-0">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Grid size={16} className="text-twitch-brand dark:text-twitch-light" />
                    <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">{t.gallery.title}</span>
                </div>
                <div className="flex gap-1.5 sm:gap-2">
                     <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-1.5 text-zinc-500 hover:text-black dark:hover:text-white rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors" title="Cambiar Vista">
                         {viewMode === 'grid' ? <LayoutList size={16}/> : <LayoutGrid size={16}/>}
                     </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-colors border border-zinc-300 dark:border-zinc-700 shadow-sm"
                    >
                        {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14} />}
                        <span className="hidden xs:inline">{t.gallery.upload}</span>
                    </button>
                </div>
            </div>
            
            {/* Search Bar & Sort */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                        type="text" 
                        placeholder={`${t.common.search}...`}
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
                <select 
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs rounded-lg px-2 py-2 focus:outline-none"
                >
                    <option value="date">Recientes</option>
                    <option value="name">Nombre</option>
                </select>
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleUpload} 
            />
        </div>

        {/* Storage Bar */}
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <HardDrive size={12} className={isStorageCritical ? "text-red-500" : "text-zinc-400"} />
            <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-500 ${isStorageCritical ? 'bg-red-500' : storagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                    style={{ width: `${storagePercent}%` }}
                />
            </div>
            <span className={`text-[10px] font-mono ${isStorageCritical ? "text-red-500 font-bold" : "text-zinc-500"}`}>
                {(storageUsed / 1024).toFixed(0)}KB
            </span>
        </div>

        {/* Drop Zone & Content */}
        <div 
            ref={scrollContainerRef}
            className={`flex-1 overflow-y-auto p-4 custom-scrollbar relative transition-colors ${dragActive ? 'bg-twitch-brand/10 dark:bg-twitch-brand/20' : 'bg-zinc-100 dark:bg-black/20'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onScroll={handleScroll}
        >
            {dragActive && (
                <div className="absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed border-twitch-brand pointer-events-none bg-white/50 dark:bg-black/50 backdrop-blur-sm m-2 rounded-xl">
                    <div className="flex flex-col items-center text-twitch-brand dark:text-twitch-light animate-bounce">
                        <Upload size={48} />
                        <span className="font-bold mt-2">Suelta la imagen aquí</span>
                    </div>
                </div>
            )}

            {isProcessing && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-[2px]">
                     <Loader2 size={32} className="animate-spin text-twitch-brand dark:text-twitch-light" />
                </div>
            )}

            {assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3">
                    <ImageIcon size={48} className="opacity-20" />
                    <p className="text-xs text-center max-w-[200px] leading-relaxed">
                        {t.gallery.dragDrop}<br/>
                        <span className="opacity-70">{t.gallery.uploadHint}</span>
                    </p>
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
                    <Search size={32} className="opacity-30" />
                    <p className="text-xs">No se encontraron resultados.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 perspective-1000">
                    {visibleAssets.map((asset) => (
                        <div key={asset.id} className="group relative aspect-square bg-white dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm hover:ring-2 hover:ring-twitch-brand/50 dark:hover:ring-twitch-light/50 transition-all transform hover:-rotate-y-12 hover:scale-105 duration-300">
                            <img src={asset.data} alt={asset.name} className="w-full h-full object-cover" />
                            
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                <span className="text-[10px] text-white font-bold truncate px-2 w-full text-center select-none">{asset.name}</span>
                                <button 
                                    onClick={() => onDelete(asset.id)}
                                    className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-md transition-colors shadow-lg"
                                    title={t.common.delete}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-1">
                    {visibleAssets.map((asset) => (
                         <div key={asset.id} className="flex items-center gap-3 p-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-twitch-brand transition-colors group">
                              <img src={asset.data} className="w-8 h-8 rounded object-cover border border-zinc-300 dark:border-zinc-600" />
                              <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{asset.name}</p>
                                  <p className="text-[10px] text-zinc-500">{new Date(asset.date).toLocaleDateString()}</p>
                              </div>
                              <button 
                                onClick={() => onDelete(asset.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                         </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};
