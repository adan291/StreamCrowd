// Plugin Install Modal - Instalar plugins desde archivo o URL
import React, { useState, useCallback, useRef } from 'react';

interface PluginInstallModalProps {
  onInstall: (file: File | null, url: string | null) => void;
  onClose: () => void;
}

type InstallMethod = 'file' | 'url';

export const PluginInstallModal: React.FC<PluginInstallModalProps> = ({
  onInstall,
  onClose
}) => {
  const [method, setMethod] = useState<InstallMethod>('file');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.zip') || droppedFile.name.endsWith('.json'))) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }, []);

  const handleInstall = async () => {
    setLoading(true);
    try {
      if (method === 'file' && file) {
        onInstall(file, null);
      } else if (method === 'url' && url) {
        onInstall(null, url);
      }
    } finally {
      setLoading(false);
    }
  };

  const canInstall = (method === 'file' && file) || (method === 'url' && url.trim());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Instalar Plugin</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Method Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setMethod('file')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              method === 'file'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Desde Archivo
          </button>
          <button
            onClick={() => setMethod('url')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              method === 'url'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Desde URL
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {method === 'file' ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-purple-500 bg-purple-500/10'
                  : file
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.json"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {file ? (
                <>
                  <svg className="w-12 h-12 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="mt-2 text-sm text-red-400 hover:text-red-300"
                  >
                    Quitar archivo
                  </button>
                </>
              ) : (
                <>
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-300">
                    Arrastra un archivo aquí o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Archivos .zip o .json
                  </p>
                </>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-300 mb-2">URL del Plugin</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://ejemplo.com/mi-plugin.zip"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Ingresa la URL directa al archivo del plugin (.zip o .json)
              </p>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="px-4 pb-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex gap-2">
              <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-yellow-200">
                Solo instala plugins de fuentes confiables. Los plugins tienen acceso a funciones de la aplicación según sus permisos.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleInstall}
            disabled={!canInstall || loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            )}
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
};
