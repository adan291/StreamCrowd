/**
 * PrizeImagePicker Component
 * Component for selecting/uploading prize images
 */

import React, { useRef } from 'react';
import { Image as ImageIcon, Upload, X, Plus } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface PrizeImagePickerProps {
  /** Current images (base64 or URLs) */
  images: string[];
  /** Callback when images change */
  onChange: (images: string[]) => void;
  /** Maximum number of images */
  maxImages?: number;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const PrizeImagePicker: React.FC<PrizeImagePickerProps> = ({
  images,
  onChange,
  maxImages = 3,
  disabled = false,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) return; // Max 5MB

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        
        // Resize image to max 400x400 for storage efficiency
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 400;
          let { width, height } = img;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          onChange([...images, resizedBase64]);
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
        Imagen del premio
      </label>

      <div className="flex gap-2 flex-wrap">
        {/* Existing images */}
        {images.map((img, index) => (
          <div
            key={index}
            className="relative w-20 h-20 rounded-xl overflow-hidden group"
          >
            <img
              src={img}
              alt={`Premio ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}

        {/* Add button */}
        {canAddMore && !disabled && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:border-purple-500 hover:text-purple-500 transition-colors"
          >
            <Plus size={20} />
            <span className="text-[10px]">Añadir</span>
          </button>
        )}

        {/* Empty state */}
        {images.length === 0 && disabled && (
          <div className="w-20 h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <ImageIcon size={24} className="text-zinc-400" />
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Help text */}
      {canAddMore && !disabled && (
        <p className="text-xs text-zinc-400">
          Máximo {maxImages} imágenes, 5MB cada una
        </p>
      )}
    </div>
  );
};

export default PrizeImagePicker;
