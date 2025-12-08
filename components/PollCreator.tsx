import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Play, Save, Bookmark, X, Palette, RefreshCcw, Smile, Image as ImageIcon, Upload, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { MAX_OPTIONS, MIN_OPTIONS, CHART_COLORS } from '../constants';
import { SavedPoll } from '../types';

interface PollCreatorProps {
  onCreate: (title: string, question: string, options: { label: string; color: string; icon?: string; image?: string }[], maxVotes?: number) => void;
}

export const PollCreator: React.FC<PollCreatorProps> = ({ onCreate }) => {
  const [title, setTitle] = useState('Encuesta en Vivo');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<{ label: string; color: string; icon?: string; image?: string }[]>([
    { label: 'Opción 1', color: CHART_COLORS[0], icon: '1️⃣', image: '' }, 
    { label: 'Opción 2', color: CHART_COLORS[1], icon: '2️⃣', image: '' }
  ]);
  const [maxVotes, setMaxVotes] = useState<string>('');
  const [savedPolls, setSavedPolls] = useState<SavedPoll[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newOptions = [...options];
        newOptions[index].image = reader.result as string;
        setOptions(newOptions);
      };
      reader.readAsDataURL(file);
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
    if (!question.trim()) return;
    const newTemplate: SavedPoll = {
      id: Date.now().toString(),
      title,
      question,
      options,
      maxVotes: maxVotes ? parseInt(maxVotes, 10) : undefined
    };
    const newSaved = [...savedPolls, newTemplate];
    setSavedPolls(newSaved);
    localStorage.setItem('twitch_vote_templates', JSON.stringify(newSaved));
  };

  const loadTemplate = (template: SavedPoll) => {
    setTitle(template.title || 'Encuesta en Vivo');
    setQuestion(template.question);
    // Handle migration for old templates
    setOptions(template.options.map((opt, i) => {
      if (typeof opt === 'string') {
        return { label: opt, color: CHART_COLORS[i % CHART_COLORS.length], icon: '', image: '' };
      }
      return { ...opt, icon: opt.icon || '', image: opt.image || '' };
    }));
    setMaxVotes(template.maxVotes ? template.maxVotes.toString() : '');
    setShowTemplates(false);
  };

  const deleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = savedPolls.filter(p => p.id !== id);
    setSavedPolls(newSaved);
    localStorage.setItem('twitch_vote_templates', JSON.stringify(newSaved));
  };

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-xl h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2 text-white">
            <span className="bg-twitch-brand w-8 h-8 rounded flex items-center justify-center text-sm">🛠️</span>
            Crear Nueva Votación
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
              className="text-zinc-400 hover:text-white p-2 rounded hover:bg-zinc-800 transition-colors"
              title="Limpiar formulario"
            >
              <RefreshCcw size={16} />
            </button>
            <button 
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-zinc-400 hover:text-twitch-light transition-colors text-sm flex items-center gap-1 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-twitch-brand"
            >
              <Bookmark size={16} /> Plantillas
            </button>
          </div>
        </div>

        {showTemplates && (
          <div className="mb-6 bg-zinc-950 p-4 rounded-lg border border-zinc-800 animate-fade-in relative z-20 shadow-lg">
            <div className="flex justify-between items-center mb-3">
               <h4 className="text-sm font-bold text-zinc-300">Seleccionar Plantilla</h4>
               <button onClick={() => setShowTemplates(false)}><X size={16} className="text-zinc-500 hover:text-white"/></button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto custom-scrollbar">
              {savedPolls.length === 0 && <p className="text-xs text-zinc-500 italic p-2">No hay plantillas guardadas.</p>}
              {savedPolls.map(poll => (
                <div 
                  key={poll.id} 
                  onClick={() => loadTemplate(poll)}
                  className="group relative bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg text-xs cursor-pointer border border-zinc-700 hover:border-twitch-light transition-all pr-8 shrink-0"
                >
                  <span className="font-bold block truncate max-w-[150px]">{poll.question}</span>
                  <span className="text-zinc-500">{poll.options.length} opciones</span>
                  <button 
                    onClick={(e) => deleteTemplate(poll.id, e)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <form onSubmit={handlePreSubmit} className="space-y-4 flex-1 flex flex-col">
          {/* Title Input */}
          <div className="space-y-1">
            <label className="text-zinc-500 text-xs font-bold ml-1 uppercase">Título de la Sección</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Current Voting"
              className="w-full bg-zinc-950/30 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-twitch-brand focus:ring-1 focus:ring-twitch-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-zinc-400 text-sm font-medium">Pregunta</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="¿Qué juego jugamos hoy?"
                className="flex-1 bg-zinc-950/50 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-twitch-light focus:ring-1 focus:ring-twitch-light"
              />
              <button 
                type="button" 
                onClick={saveTemplate}
                disabled={!question.trim()}
                className="px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                title="Guardar como plantilla"
              >
                <Save size={18} />
              </button>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <label className="text-zinc-400 text-sm font-medium flex justify-between">
              <span>Opciones (Icono/Img + Texto + Color)</span>
              <span className="text-xs text-zinc-500">{options.length}/{MAX_OPTIONS}</span>
            </label>
            
            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
              {options.map((opt, index) => (
                <div key={index} className="flex gap-2 items-center group animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                  
                  {/* Color Picker */}
                  <div 
                    className="w-10 h-10 rounded flex items-center justify-center text-zinc-950 font-bold shrink-0 text-sm shadow-sm relative overflow-hidden cursor-pointer"
                    style={{ backgroundColor: opt.color }}
                  >
                     <input 
                        type="color" 
                        value={opt.color} 
                        onChange={(e) => handleColorChange(index, e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Cambiar color"
                     />
                    <Palette size={14} className="text-black/50 absolute pointer-events-none" />
                  </div>
                  
                  <div className="flex items-center bg-zinc-950/50 border border-zinc-700 rounded-lg flex-1 px-3 py-1 focus-within:border-twitch-light focus-within:ring-1 focus-within:ring-twitch-light transition-all">
                    <span className="text-zinc-500 font-bold mr-2 text-sm">+{index + 1}</span>
                    
                    {/* Icon/Image Switcher */}
                    <div className="relative mr-2 w-8 h-8 flex items-center justify-center">
                       {opt.image ? (
                          <div className="relative w-full h-full group/img">
                             <img src={opt.image} alt="icon" className="w-full h-full object-cover rounded" />
                             <button 
                                type="button" 
                                onClick={() => removeImage(index)}
                                className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                             >
                                <X size={8} className="text-white"/>
                             </button>
                          </div>
                       ) : (
                         <div className="relative w-full">
                           <input
                              type="text"
                              value={opt.icon || ''}
                              onChange={(e) => handleIconChange(index, e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded text-center text-lg focus:outline-none focus:border-twitch-light py-0.5"
                              placeholder="😀"
                              maxLength={2}
                           />
                           {!opt.icon && <Smile size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />}
                         </div>
                       )}
                    </div>
                    
                    {/* Image Upload Button */}
                    <div className="mr-2">
                       <button
                          type="button"
                          onClick={() => fileInputRefs.current[index]?.click()}
                          className="p-1.5 text-zinc-500 hover:text-twitch-light hover:bg-zinc-800 rounded transition-colors"
                          title="Subir imagen personalizada"
                       >
                          <ImageIcon size={16} />
                       </button>
                       <input 
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={el => fileInputRefs.current[index] = el}
                          onChange={(e) => handleImageUpload(index, e)}
                       />
                    </div>

                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="flex-1 bg-transparent border-none text-white py-2 text-sm focus:outline-none"
                      placeholder={`Opción ${index + 1}`}
                    />
                  </div>

                  {options.length > MIN_OPTIONS && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              
               {options.length < MAX_OPTIONS && (
                <button
                  type="button"
                  onClick={addOption}
                  className="w-full py-2 border border-dashed border-zinc-700 text-zinc-400 rounded-lg hover:border-twitch-light hover:text-twitch-light hover:bg-twitch-brand/5 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Plus size={16} /> Agregar Opción
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
             <div className="space-y-1">
               <label className="text-zinc-400 text-xs font-medium">Meta de Votos (Opcional)</label>
               <input
                  type="number"
                  min="1"
                  value={maxVotes}
                  onChange={(e) => setMaxVotes(e.target.value)}
                  placeholder="∞"
                  className="w-full bg-zinc-950/50 border border-zinc-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-twitch-light transition-all"
                />
             </div>
             <div className="flex items-end">
                <Button 
                  fullWidth 
                  type="submit" 
                  disabled={!question.trim() || options.some(o => !o.label.trim())}
                >
                  <Play size={18} /> Iniciar Votación
                </Button>
             </div>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-scale-up">
             <div className="flex items-center gap-3 mb-4">
                <div className="bg-twitch-brand/20 p-2 rounded-full text-twitch-light">
                   <AlertCircle size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">¿Confirmar Votación?</h3>
             </div>
             
             <div className="space-y-4 mb-6">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                   <span className="text-xs text-zinc-500 uppercase font-bold block mb-1">Pregunta</span>
                   <p className="text-white font-medium">{question}</p>
                </div>
                
                <div>
                   <span className="text-xs text-zinc-500 uppercase font-bold block mb-2">Opciones ({options.length})</span>
                   <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                      {options.map((opt, i) => (
                         <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                            <span className="w-4 h-4 rounded-full shrink-0" style={{backgroundColor: opt.color}}></span>
                            <span className="truncate flex-1">{opt.label}</span>
                            {opt.image ? <ImageIcon size={14} className="text-zinc-500"/> : <span>{opt.icon}</span>}
                         </div>
                      ))}
                   </div>
                </div>

                {maxVotes && (
                   <div className="text-sm text-zinc-400 flex gap-2">
                      <span className="font-bold text-white">Límite:</span> {maxVotes} votos
                   </div>
                )}
             </div>

             <div className="flex gap-3">
                <Button onClick={() => setShowConfirm(false)} variant="secondary" fullWidth>Cancelar</Button>
                <Button onClick={confirmCreate} fullWidth>
                  <Play size={16} /> Iniciar Ahora
                </Button>
             </div>
          </div>
        </div>
      )}
    </>
  );
};
