import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Play, Save, Bookmark, X, Palette, RefreshCcw, Smile, Image as ImageIcon, Upload, AlertCircle, Star, MousePointerClick, Check, Grid, Filter } from 'lucide-react';
import { Button } from './Button';
import { MAX_OPTIONS, MIN_OPTIONS, CHART_COLORS } from '../constants';
import { SavedPoll, MediaAsset } from '../types';
import { Tooltip } from './Tooltip';
import { NotificationType } from './Notification';

interface PollCreatorProps {
  onCreate: (title: string, question: string, options: { label: string; color: string; icon?: string; image?: string }[], maxVotes?: number) => void;
  onNotification?: (type: NotificationType, message: string) => void;
  mediaLibrary?: MediaAsset[]; // New prop for accessing global assets
}

export const PollCreator: React.FC<PollCreatorProps> = ({ onCreate, onNotification, mediaLibrary = [] }) => {
  const [title, setTitle] = useState('Encuesta en Vivo');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<{ label: string; color: string; icon?: string; image?: string }[]>([
    { label: 'Opción 1', color: CHART_COLORS[0], icon: '1️⃣', image: '' }, 
    { label: 'Opción 2', color: CHART_COLORS[1], icon: '2️⃣', image: '' }
  ]);
  const [maxVotes, setMaxVotes] = useState<string>('');
  const [savedPolls, setSavedPolls] = useState<SavedPoll[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState<number | null>(null); // Index of option being edited
  
  // Hidden file input refs
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('twitch_vote_templates');
    if (saved) {
      try {
        setSavedPolls(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading templates', e);
      }
    }
  }, []);

  const addOption = () => {
    if (options.length < MAX_OPTIONS) {
      const nextColor = CHART_COLORS[options.length % CHART_COLORS.length];
      setOptions([...options, { label: `Opción ${options.length + 1}`, color: nextColor, icon: '', image: '' }]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > MIN_OPTIONS) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index].label = value;
    setOptions(newOptions);
  };

  const handleIconChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index].icon = value;
    setOptions(newOptions);
  };

  const handleColorChange = (index: number, color: string) => {
    const newOptions = [...options];
    newOptions[index].color = color;
    setOptions(newOptions);
  };

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    // Reset input value to allow selecting same file again
    const resetInput = () => {
        if (fileInputRefs.current[index]) {
            fileInputRefs.current[index]!.value = '';
        }
    };

    if (file) {
      // Validate Type
      if (!file.type.startsWith('image/')) {
        if (onNotification) onNotification('error', 'El archivo debe ser una imagen válida.');
        resetInput();
        return;
      }
      // Validate Size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        if (onNotification) onNotification('error', 'La imagen es demasiado grande (Máx 2MB).');
        resetInput();
        return;
      }

      const reader = new FileReader();
      
      reader.onerror = () => {
          if (onNotification) onNotification('error', 'Error al leer el archivo.');
          resetInput();
      };

      reader.onload = (readerEvent) => {
        const img = new Image();
        img.src = readerEvent.target?.result as string;
        
        img.onload = () => {
          try {
              // Create a 150x150 square icon
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
                  
                  const newOptions = [...options];
                  newOptions[index].image = iconDataUrl;
                  setOptions(newOptions);
              }
          } catch (err) {
              console.error(err);
              if (onNotification) onNotification('error', 'Error al procesar la imagen.');
          }
        };

        img.onerror = () => {
            if (onNotification) onNotification('error', 'El archivo de imagen está dañado.');
        };
      };
      reader.readAsDataURL(file);
    }
    
    resetInput();
  };

  const selectAssetFromLibrary = (asset: MediaAsset) => {
      if (showAssetPicker !== null) {
          const newOptions = [...options];
          newOptions[showAssetPicker].image = asset.data;
          setOptions(newOptions);
          setShowAssetPicker(null);
      }
  };

  const removeImage = (index: number) => {
    const newOptions = [...options];
    newOptions[index].image = '';
    setOptions(newOptions);
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = '';
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && options.every(opt => opt.label.trim())) {
      setShowConfirm(true);
    }
  };

  const confirmCreate = () => {
    const max = maxVotes ? parseInt(maxVotes, 10) : undefined;
    const finalTitle = title.trim() || 'Encuesta en Vivo';
    onCreate(finalTitle, question, options, max);
    setShowConfirm(false);
  };

  const saveTemplate = () => {
    if (!question.trim()) {
        if (onNotification) onNotification('error', 'Escribe una pregunta para guardar la plantilla.');
        return;
    }
    
    const newTemplate: SavedPoll = {
      id: Date.now().toString(),
      title,
      question,
      options,
      maxVotes: maxVotes ? parseInt(maxVotes, 10) : undefined,
      isFavorite: false
    };
    const newSaved = [...savedPolls, newTemplate];
    setSavedPolls(newSaved);
    localStorage.setItem('twitch_vote_templates', JSON.stringify(newSaved));
    
    if (onNotification) onNotification('success', 'Plantilla guardada correctamente.');
  };

  const loadTemplate = (template: SavedPoll) => {
    setTitle(template.title || 'Encuesta en Vivo');
    setQuestion(template.question);
    setOptions(template.options.map((opt, i) => ({
       ...opt, 
       color: opt.color || CHART_COLORS[i % CHART_COLORS.length],
       icon: opt.icon || '', 
       image: opt.image || '' 
    })));
    setMaxVotes(template.maxVotes ? template.maxVotes.toString() : '');
    setShowTemplates(false);
    if (onNotification) onNotification('info', `Plantilla "${template.question}" cargada.`);
  };

  const deleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = savedPolls.filter(p => p.id !== id);
    setSavedPolls(newSaved);
    localStorage.setItem('twitch_vote_templates', JSON.stringify(newSaved));
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = savedPolls.map(p => 
       p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    );
    setSavedPolls(newSaved);
    localStorage.setItem('twitch_vote_templates', JSON.stringify(newSaved));
  };

  const sortedTemplates = [...savedPolls]
    .filter(t => !filterFavorites || t.isFavorite)
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return parseInt(b.id) - parseInt(a.id);
    });

  return (
    <>
      <div className="h-full flex flex-col relative p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
            <span className="bg-twitch-brand w-8 h-8 rounded flex items-center justify-center text-sm text-white">🛠️</span>
            Crear
          </h3>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => {
                setTitle('Encuesta en Vivo');
                setQuestion('');
                setOptions([
                  { label: 'Opción 1', color: CHART_COLORS[0], icon: '1️⃣', image: '' }, 
                  { label: 'Opción 2', color: CHART_COLORS[1], icon: '2️⃣', image: '' }
                ]);
                setMaxVotes('');
              }}
              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white p-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              title="Limpiar formulario"
            >
              <RefreshCcw size={16} />
            </button>
            <button 
              onClick={() => setShowTemplates(!showTemplates)}
              className={`text-sm flex items-center gap-1 bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-lg border transition-colors ${showTemplates ? 'border-twitch-brand text-twitch-brand dark:text-twitch-light' : 'border-zinc-300 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-twitch-brand dark:hover:text-twitch-light'}`}
            >
              <Bookmark size={16} /> Plantillas
            </button>
          </div>
        </div>

        {/* Templates Dropdown */}
        {showTemplates && (
          <div className="mb-6 bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 animate-fade-in relative z-20 shadow-lg">
            <div className="flex justify-between items-center mb-3">
               <div className="flex items-center gap-4">
                  <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Mis Plantillas ({savedPolls.length})</h4>
                  <button 
                    onClick={() => setFilterFavorites(!filterFavorites)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors border ${filterFavorites ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    title="Mostrar solo favoritos"
                  >
                     <Star size={12} fill={filterFavorites ? "currentColor" : "none"} />
                     Favoritos
                  </button>
               </div>
               <button onClick={() => setShowTemplates(false)}><X size={16} className="text-zinc-500 hover:text-black dark:hover:text-white"/></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
              {sortedTemplates.length === 0 && (
                <div className="col-span-2 text-center py-6 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg">
                    <p className="text-xs text-zinc-500 mb-2">
                      {filterFavorites ? 'No tienes plantillas favoritas.' : 'No hay plantillas guardadas.'}
                    </p>
                    {filterFavorites && (
                       <button onClick={() => setFilterFavorites(false)} className="text-xs text-twitch-brand hover:underline">Ver todas</button>
                    )}
                </div>
              )}
              {sortedTemplates.map(poll => (
                <div 
                  key={poll.id} 
                  onClick={() => loadTemplate(poll)}
                  className={`group relative bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border p-3 rounded-lg text-xs cursor-pointer transition-all flex flex-col gap-2 ${poll.isFavorite ? 'border-yellow-400/30 dark:border-yellow-500/30' : 'border-zinc-200 dark:border-zinc-800 hover:border-twitch-brand/50 dark:hover:border-twitch-light/50'}`}
                >
                  <div className="flex justify-between items-start">
                     <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate pr-6 text-sm">{poll.question}</span>
                     <div className="flex gap-1 absolute top-2 right-2">
                         <button 
                           onClick={(e) => toggleFavorite(poll.id, e)}
                           className={`transition-colors p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 ${poll.isFavorite ? 'text-yellow-500 dark:text-yellow-400' : 'text-zinc-400 hover:text-yellow-500'}`}
                           title="Favorito"
                         >
                           <Star size={14} fill={poll.isFavorite ? "currentColor" : "none"} />
                         </button>
                         <button 
                           onClick={(e) => deleteTemplate(poll.id, e)}
                           className="text-zinc-400 hover:text-red-500 p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                           title="Eliminar"
                         >
                           <Trash2 size={14} />
                         </button>
                     </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-1">
                     {poll.options.slice(0, 3).map((o, idx) => (
                        <span key={idx} className="w-2 h-2 rounded-full flex items-center justify-center overflow-hidden" style={{backgroundColor: o.color}}>
                          {o.image && <img src={o.image} className="w-full h-full object-cover" />}
                        </span>
                     ))}
                     {poll.options.length > 3 && <span className="text-[10px] text-zinc-500">+{poll.options.length - 3}</span>}
                  </div>
                  
                  <div className="flex justify-between items-end mt-1">
                     <span className="text-zinc-500">{poll.options.length} opciones</span>
                     <span className="text-twitch-brand dark:text-twitch-light opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-bold">
                        Cargar <MousePointerClick size={12}/>
                     </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <form onSubmit={handlePreSubmit} className="space-y-4 flex-1 flex flex-col">
          {/* Title Input */}
          <div className="space-y-1">
            <label className="text-zinc-500 dark:text-zinc-500 text-xs font-bold ml-1 uppercase flex items-center">
              Título de la Sección
              <Tooltip text="Texto pequeño que aparece arriba de la pregunta en el panel (ej: 'Votando Ahora')." />
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Current Voting"
              className="w-full bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-twitch-brand focus:ring-1 focus:ring-twitch-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-zinc-500 dark:text-zinc-400 text-sm font-medium flex items-center">
              Pregunta
              <Tooltip text="La pregunta principal que verán los espectadores." />
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="¿Qué juego jugamos hoy?"
                className="flex-1 bg-white dark:bg-zinc-950/50 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:border-twitch-brand dark:focus:border-twitch-light focus:ring-1 focus:ring-twitch-brand dark:focus:ring-twitch-light"
              />
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="flex justify-between items-end">
                <label className="text-zinc-500 dark:text-zinc-400 text-sm font-medium flex items-center gap-2">
                    Opciones de Respuesta
                    <Tooltip text="Configura el color, icono y texto. Puedes subir una imagen o elegirla de la galería." />
                </label>
                <span className="text-xs text-zinc-500">{options.length}/{MAX_OPTIONS}</span>
            </div>
            
            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar pb-2">
               {/* Header for options table-like structure */}
               <div className="grid grid-cols-[40px_48px_1fr_40px] gap-2 px-1 text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">
                  <div className="text-center">Color</div>
                  <div className="text-center">Media</div>
                  <div>Etiqueta</div>
                  <div></div>
               </div>

              {options.map((opt, index) => (
                <div key={index} className="flex gap-2 items-center group animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                  
                  {/* Color Picker */}
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-950 font-bold shrink-0 text-sm shadow-sm relative overflow-hidden cursor-pointer hover:ring-2 ring-zinc-400 dark:ring-zinc-500 transition-all"
                    style={{ backgroundColor: opt.color }}
                    title="Cambiar color"
                  >
                     <input 
                        type="color" 
                        value={opt.color} 
                        onChange={(e) => handleColorChange(index, e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                     />
                    <Palette size={14} className="text-black/40 absolute pointer-events-none" />
                  </div>
                  
                  {/* Icon/Image Selector */}
                  <div className="relative w-12 h-10 shrink-0">
                     <div className={`w-full h-full bg-white dark:bg-zinc-950 border rounded-lg flex items-center justify-center overflow-hidden relative group/icon transition-colors ${opt.image ? 'border-twitch-brand/50' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-500'}`}>
                        {opt.image ? (
                           <>
                              <img src={opt.image} alt="icon" className="w-full h-full object-cover" />
                              <button 
                                 type="button" 
                                 onClick={() => removeImage(index)}
                                 className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/icon:opacity-100 transition-opacity"
                                 title="Eliminar imagen"
                              >
                                 <X size={16} className="text-red-500" />
                              </button>
                           </>
                        ) : (
                           <>
                              <input
                                 type="text"
                                 value={opt.icon || ''}
                                 onChange={(e) => handleIconChange(index, e.target.value)}
                                 className="w-full h-full bg-transparent text-center text-xl text-zinc-900 dark:text-white focus:outline-none z-10 relative"
                                 placeholder="😀"
                                 maxLength={2}
                              />
                              {!opt.icon && <Smile size={12} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-700 pointer-events-none" />}
                              
                              <div className="absolute bottom-0 right-0 left-0 flex h-6 opacity-0 group-hover/icon:opacity-100 transition-opacity z-20">
                                <button
                                    type="button"
                                    onClick={() => fileInputRefs.current[index]?.click()}
                                    className="flex-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-twitch-brand dark:hover:bg-twitch-brand text-zinc-500 dark:text-zinc-400 hover:text-white flex items-center justify-center transition-colors border-r border-zinc-300 dark:border-zinc-700"
                                    title="Subir archivo"
                                >
                                    <Upload size={10} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAssetPicker(index)}
                                    className="flex-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-twitch-brand dark:hover:bg-twitch-brand text-zinc-500 dark:text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                                    title="Vincular imagen de Galería"
                                >
                                    <Grid size={10} />
                                </button>
                              </div>
                           </>
                        )}
                     </div>
                     {/* Hidden File Input */}
                     <input 
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={el => fileInputRefs.current[index] = el}
                        onChange={(e) => handleImageUpload(index, e)}
                     />
                  </div>
                  
                  {/* Label Input */}
                  <div className="flex-1 relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold pointer-events-none">+{index+1}</span>
                     <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        className="w-full bg-white dark:bg-zinc-950/50 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-twitch-brand dark:focus:border-twitch-light focus:ring-1 focus:ring-twitch-brand dark:focus:ring-twitch-light transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                        placeholder={`Etiqueta de opción ${index + 1}`}
                     />
                  </div>

                  {/* Remove Button */}
                  <div className="w-10 flex justify-center">
                      {options.length > MIN_OPTIONS ? (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Eliminar opción"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <div className="w-8"></div> // Spacer
                      )}
                  </div>
                </div>
              ))}
              
               {options.length < MAX_OPTIONS && (
                <button
                  type="button"
                  onClick={addOption}
                  className="w-full py-2 border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-400 rounded-lg hover:border-twitch-brand hover:text-twitch-brand dark:hover:border-twitch-light dark:hover:text-twitch-light hover:bg-twitch-brand/5 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Plus size={16} /> Agregar Opción
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
             <div className="flex flex-col sm:flex-row gap-4 mb-4">
                 <div className="flex-1 space-y-1">
                   <label className="text-zinc-500 dark:text-zinc-400 text-xs font-medium flex items-center">
                     Meta de Votos (Opcional)
                     <Tooltip text="Detiene la encuesta automáticamente al llegar a este número de votos." />
                   </label>
                   <input
                      type="number"
                      min="1"
                      value={maxVotes}
                      onChange={(e) => setMaxVotes(e.target.value)}
                      placeholder="∞"
                      className="w-full bg-white dark:bg-zinc-950/50 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-twitch-brand dark:focus:border-twitch-light transition-all"
                    />
                 </div>
                 <div className="flex items-end">
                    <button 
                      type="button" 
                      onClick={saveTemplate}
                      disabled={!question.trim()}
                      className="w-full sm:w-auto px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-bold text-sm h-[42px]"
                      title="Guardar configuración actual como plantilla"
                    >
                      <Save size={16} /> <span className="sm:hidden lg:inline">Guardar Plantilla</span>
                    </button>
                 </div>
             </div>
             
             <Button 
               fullWidth 
               type="submit" 
               disabled={!question.trim() || options.some(o => !o.label.trim())}
             >
               <Play size={18} /> Iniciar Votación
             </Button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-scale-up">
             <div className="flex items-center gap-3 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div className="bg-twitch-brand/20 p-2.5 rounded-full text-twitch-brand dark:text-twitch-light">
                   <AlertCircle size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">¿Iniciar Votación?</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs">Revisa que todo esté correcto antes de enviar al chat.</p>
                </div>
             </div>
             
             <div className="space-y-4 mb-6">
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                   <span className="text-xs text-twitch-brand dark:text-twitch-light uppercase font-bold block mb-1 tracking-wider">{title}</span>
                   <p className="text-zinc-900 dark:text-white font-bold text-lg leading-tight">{question}</p>
                </div>
                
                <div>
                   <span className="text-xs text-zinc-500 uppercase font-bold block mb-2 px-1">Opciones ({options.length})</span>
                   <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                      {options.map((opt, i) => (
                         <div key={i} className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/30 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800/50">
                            <span className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center overflow-hidden" style={{backgroundColor: opt.image ? 'transparent' : opt.color}}>
                                {opt.image ? (
                                    <img src={opt.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-black font-bold text-lg">{opt.icon || i+1}</span>
                                )}
                            </span>
                            <span className="font-bold text-zinc-400 text-xs mr-1">+{i+1}</span>
                            <span className="truncate flex-1 font-medium">{opt.label}</span>
                         </div>
                      ))}
                   </div>
                </div>

                {maxVotes && (
                   <div className="text-sm bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300 p-2 rounded-lg flex items-center gap-2 justify-center">
                      <MousePointerClick size={14}/>
                      Se detendrá automáticamente a los <span className="font-bold text-zinc-900 dark:text-white">{maxVotes}</span> votos.
                   </div>
                )}
             </div>

             <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => setShowConfirm(false)} variant="secondary">Cancelar</Button>
                <Button onClick={confirmCreate}>
                  <Check size={18} /> Confirmar e Iniciar
                </Button>
             </div>
          </div>
        </div>
      )}

      {/* Asset Picker Modal */}
      {showAssetPicker !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-up flex flex-col max-h-[80vh]">
                  <div className="flex justify-between items-center mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          <Grid size={18} /> Vincular Imagen de Galería
                      </h3>
                      <button onClick={() => setShowAssetPicker(null)} className="text-zinc-500 hover:text-black dark:hover:text-white"><X size={20}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-100 dark:bg-black/20 rounded-lg p-3 min-h-[200px]">
                      {mediaLibrary.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                              <ImageIcon size={32} />
                              <p className="text-sm">No hay imágenes guardadas.</p>
                              <p className="text-xs">Sube imágenes en la pestaña "Galería".</p>
                          </div>
                      ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                              {mediaLibrary.map(asset => (
                                  <button 
                                      key={asset.id} 
                                      onClick={() => selectAssetFromLibrary(asset)}
                                      className="aspect-square bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-twitch-brand dark:hover:border-twitch-light hover:ring-2 ring-twitch-brand/50 dark:ring-twitch-light/50 overflow-hidden transition-all group relative"
                                  >
                                      <img src={asset.data} alt={asset.name} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <span className="text-xs font-bold text-white">Usar</span>
                                      </div>
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </>
  );
};