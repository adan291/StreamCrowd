
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, Save, Bookmark, X, RefreshCcw, Smile, Upload, AlertCircle, Star, Check, Grid, Zap, Eye, Target, Clock, Palette, Infinity as InfinityIcon, Shield, Copy, FileText, GripVertical, Disc3, Download, FolderUp, History } from 'lucide-react';
import { SpinnerWheel } from './SpinnerWheel';
import { Button } from './Button';
import { MAX_OPTIONS, MIN_OPTIONS, CHART_COLORS } from '../constants';
import { SavedPoll, MediaAsset, Poll, ModerationConfig, DEFAULT_MODERATION_CONFIG, CollaborationChannel } from '../types';
import { Tooltip } from './Tooltip';
import { NotificationType } from './Notification';
import { LivePoll } from './LivePoll';
import { ModerationConfigForm } from './ModerationConfigForm';
import { useI18n } from '../i18n';
import { TwitchMessage } from '../types';
import { OBSOverlayUrl } from './OBSOverlayUrl';
import { useOBSTriggers } from '../src/application/hooks/useOBSTriggers';

interface PollCreatorProps {
  onCreate: (title: string, question: string, options: { label: string; color: string; icon?: string; image?: string; voteKey?: string }[], maxVotes?: number, duration?: number, progressBarColor?: string, limitIndicatorColor?: string, moderationConfig?: ModerationConfig, votePrefix?: string, voteMatchMode?: 'exact' | 'partial') => void;
  onNotification?: (type: NotificationType, message: string) => void;
  mediaLibrary?: MediaAsset[];
  onAddAsset?: (asset: MediaAsset) => void;
  moderationConfig?: ModerationConfig;
  onModerationConfigChange?: (config: ModerationConfig) => void;
  chatMessages?: TwitchMessage[];
  onShowHistory?: () => void;
  sidebarHidden?: boolean;
  onClearChatMessages?: () => void;
  userVoteMap?: Map<string, number>;
  collaborationChannels?: CollaborationChannel[];
  mainChannel?: string;
  onAddCollaborator?: (channel: string) => void;
  onRemoveCollaborator?: (channel: string) => void;
  isConnected?: boolean;
  onShowCountdown?: () => void;
}

export const PollCreator: React.FC<PollCreatorProps> = ({ onCreate, onNotification, mediaLibrary = [], onAddAsset, moderationConfig = DEFAULT_MODERATION_CONFIG, onModerationConfigChange, chatMessages = [], onShowHistory, sidebarHidden = false, onClearChatMessages, userVoteMap = new Map(), collaborationChannels = [], mainChannel, onAddCollaborator, onRemoveCollaborator, isConnected = true, onShowCountdown }) => {
  const { t } = useI18n();
  const { triggerPollStart } = useOBSTriggers();
  const [title, setTitle] = useState(t.poll.title);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<{ label: string; color: string; icon?: string; image?: string; voteKey?: string }[]>([
    { label: 'Opción 1', color: CHART_COLORS[0], icon: '1️⃣', image: '', voteKey: '' }, 
    { label: 'Opción 2', color: CHART_COLORS[1], icon: '2️⃣', image: '', voteKey: '' }
  ]);
  const [maxVotes, setMaxVotes] = useState<string>('');
  const [duration, setDuration] = useState<string>(''); // Duration in seconds
  const [votePrefix, setVotePrefix] = useState<string>('+');
  
  // Default colors (hidden from UI)
  const progressBarColor = '#3b82f6';
  const limitIndicatorColor = '#ef4444';
  
  const [savedPolls, setSavedPolls] = useState<SavedPoll[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState<number | null>(null);
  
  // Modal for preset confirmation
  const [showPresetConfirm, setShowPresetConfirm] = useState<'yesno' | 'rating' | 'abc' | null>(null);
  
  // Moderation panel state
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [localModerationConfig, setLocalModerationConfig] = useState<ModerationConfig>(moderationConfig);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const [quickMode, setQuickMode] = useState(true); // Toggle para modo rápido
  
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Check for duplicate voteKeys
  const duplicateVoteKeys = useMemo(() => {
    const keys = options.map(o => o.voteKey?.toLowerCase()).filter(k => k && k.length > 0);
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    keys.forEach(k => {
      if (k && seen.has(k)) duplicates.add(k);
      if (k) seen.add(k);
    });
    return duplicates;
  }, [options]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc - Close modals
      if (e.key === 'Escape') {
        if (showConfirm) setShowConfirm(false);
        else if (showPreview) setShowPreview(false);
        else if (showImportModal) { setShowImportModal(false); setImportText(''); }
        else if (showAssetPicker !== null) setShowAssetPicker(null);
        else if (showPresetConfirm) setShowPresetConfirm(null);
        else if (showSpinner) setShowSpinner(false);
        else if (showTemplates) setShowTemplates(false);
      }
      
      // Ctrl+Enter - Create poll (if form is valid)
      if (e.ctrlKey && e.key === 'Enter') {
        if (question.trim() && options.every(opt => opt.label.trim()) && options.length >= 2) {
          e.preventDefault();
          handlePreSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirm, showPreview, showImportModal, showAssetPicker, showPresetConfirm, showSpinner, showTemplates, question, options]);

  const applyPreset = (type: 'yesno' | 'rating' | 'abc') => {
      if (type === 'yesno') {
          setOptions([
              { label: 'Sí', color: '#22c55e', icon: '✅', image: '' },
              { label: 'No', color: '#ef4444', icon: '❌', image: '' }
          ]);
      } else if (type === 'rating') {
          setOptions([
              { label: '1 - Malo', color: '#ef4444', icon: '😡', image: '' },
              { label: '2 - Regular', color: '#f97316', icon: '😐', image: '' },
              { label: '3 - Bueno', color: '#eab308', icon: '🙂', image: '' },
              { label: '4 - Muy Bueno', color: '#3b82f6', icon: '😃', image: '' },
              { label: '5 - Excelente', color: '#a855f7', icon: '🔥', image: '' }
          ]);
      } else if (type === 'abc') {
          setOptions([
              { label: `${t.poll.option} A`, color: CHART_COLORS[0], icon: '🅰️', image: '' },
              { label: `${t.poll.option} B`, color: CHART_COLORS[1], icon: '🅱️', image: '' },
              { label: `${t.poll.option} C`, color: CHART_COLORS[2], icon: '©️', image: '' }
          ]);
      }
      setShowPresetConfirm(null);
      if (onNotification) onNotification('info', t.poll.presetApplied);
  };

  const addOption = () => {
    if (options.length < MAX_OPTIONS) {
      const nextColor = CHART_COLORS[options.length % CHART_COLORS.length];
      setOptions([...options, { label: `${t.poll.option} ${options.length + 1}`, color: nextColor, icon: '', image: '', voteKey: '' }]);
    }
  };

  const duplicateOption = (index: number) => {
    if (options.length < MAX_OPTIONS) {
      const opt = options[index];
      const newOptions = [...options];
      newOptions.splice(index + 1, 0, { 
        ...opt, 
        label: `${opt.label} (copia)`,
        voteKey: '' // Clear voteKey to avoid duplicates
      });
      setOptions(newOptions);
    }
  };

  const importOptionsFromText = () => {
    const lines = importText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      if (onNotification) onNotification('error', t.poll.noOptionsToImport || 'No hay opciones para importar');
      return;
    }
    const newOptions = lines.slice(0, MAX_OPTIONS).map((line, i) => ({
      label: line.trim().slice(0, 100),
      color: CHART_COLORS[i % CHART_COLORS.length],
      icon: '',
      image: '',
      voteKey: ''
    }));
    setOptions(newOptions);
    setShowImportModal(false);
    setImportText('');
    if (onNotification) onNotification('success', `${newOptions.length} ${t.poll.optionsImported || 'opciones importadas'}`);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newOptions = [...options];
    const draggedItem = newOptions[draggedIndex];
    newOptions.splice(draggedIndex, 1);
    newOptions.splice(index, 0, draggedItem);
    setOptions(newOptions);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Presets data
  const presets = {
    yesno: {
      question: '¿Sí o No?',
      options: [
        { label: 'Sí', color: '#22c55e', icon: '✅', image: '', voteKey: 'si' },
        { label: 'No', color: '#ef4444', icon: '❌', image: '', voteKey: 'no' }
      ]
    },
    rating: {
      question: '¿Qué puntuación le das?',
      options: [
        { label: '1 - Malo', color: '#ef4444', icon: '😡', image: '', voteKey: '' },
        { label: '2 - Regular', color: '#f97316', icon: '😐', image: '', voteKey: '' },
        { label: '3 - Bueno', color: '#eab308', icon: '🙂', image: '', voteKey: '' },
        { label: '4 - Muy Bueno', color: '#3b82f6', icon: '😃', image: '', voteKey: '' },
        { label: '5 - Excelente', color: '#a855f7', icon: '🔥', image: '', voteKey: '' }
      ]
    },
    abc: {
      question: '¿Cuál prefieres?',
      options: [
        { label: `${t.poll.option} A`, color: CHART_COLORS[0], icon: '🅰️', image: '', voteKey: '' },
        { label: `${t.poll.option} B`, color: CHART_COLORS[1], icon: '🅱️', image: '', voteKey: '' },
        { label: `${t.poll.option} C`, color: CHART_COLORS[2], icon: '©️', image: '', voteKey: '' }
      ]
    }
  };

  // Handle preset button click - either launch immediately or set values
  const handlePresetClick = (type: 'yesno' | 'rating' | 'abc') => {
    const preset = presets[type];
    const prefix = votePrefix.trim() || '+';
    
    if (quickMode) {
      // Modo rápido: crear encuesta directamente
      // Apply default voteKeys (1, 2, 3...) if empty
      const finalOptions = preset.options.map((opt, i) => ({
        ...opt,
        voteKey: opt.voteKey?.trim() || String(i + 1)
      }));
      
      onCreate(
        t.poll.liveTitle, 
        question || preset.question, 
        finalOptions, 
        undefined, 
        undefined, 
        progressBarColor, 
        limitIndicatorColor, 
        localModerationConfig, 
        prefix, 
        'exact'
      );
      if (onNotification) onNotification('success', t.poll.quickPollCreated || '¡Encuesta rápida creada!');
    } else {
      // Modo normal: solo setear valores
      if (question.trim() || options.some(o => o.label !== `${t.poll.option} ${options.indexOf(o)+1}`)) {
        setShowPresetConfirm(type);
      } else {
        applyPreset(type);
      }
    }
  };

  const handleVoteKeyChange = (index: number, value: string) => {
    const newOptions = [...options];
    // Remove spaces and special characters, keep only alphanumeric
    newOptions[index].voteKey = value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    setOptions(newOptions);
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
    const resetInput = () => {
        if (fileInputRefs.current[index]) {
            fileInputRefs.current[index]!.value = '';
        }
    };

    if (file) {
      if (!file.type.startsWith('image/')) {
        if (onNotification) onNotification('error', t.poll.invalidImageType);
        resetInput();
        return;
      }
      if (file.size > MAX_FILE_SIZE) { 
        if (onNotification) onNotification('error', t.poll.imageTooLarge);
        resetInput();
        return;
      }

      const reader = new FileReader();
      
      reader.onerror = () => {
          if (onNotification) onNotification('error', t.poll.fileReadError);
          resetInput();
      };

      reader.onload = (readerEvent) => {
        const img = new Image();
        img.src = readerEvent.target?.result as string;
        
        img.onload = () => {
          try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const ICON_SIZE = 150; 
              canvas.width = ICON_SIZE;
              canvas.height = ICON_SIZE;
              if (ctx) {
                  const minDim = Math.min(img.width, img.height);
                  ctx.drawImage(img, (img.width - minDim) / 2, (img.height - minDim) / 2, minDim, minDim, 0, 0, ICON_SIZE, ICON_SIZE);
                  const iconDataUrl = canvas.toDataURL('image/png');
                  
                  if (onAddAsset) {
                      const newAsset: MediaAsset = {
                          id: Date.now().toString(),
                          name: file.name.split('.')[0].slice(0, 15) || `Img ${index}`,
                          data: iconDataUrl,
                          date: Date.now()
                      };
                      onAddAsset(newAsset);
                  }
                  const newOptions = [...options];
                  newOptions[index].image = iconDataUrl;
                  setOptions(newOptions);
                  if (onNotification) onNotification('success', t.poll.iconSavedToGallery);
              }
          } catch (err) {
              if (onNotification) onNotification('error', t.poll.imageProcessError);
          } finally {
             resetInput();
          }
        };

        img.onerror = () => {
             if (onNotification) onNotification('error', t.poll.imageDamaged);
             resetInput();
        };
      };
      reader.readAsDataURL(file);
    } else {
       resetInput();
    }
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
    if (fileInputRefs.current[index]) fileInputRefs.current[index]!.value = '';
  };

  const handlePreSubmit = () => {
    if (question.trim() && options.every(opt => opt.label.trim()) && options.length >= 2) {
      setShowConfirm(true);
    } else if (options.length < 2) {
        if (onNotification) onNotification('error', t.poll.needTwoOptions);
    } else {
        if (onNotification) onNotification('error', t.poll.completeAllFields);
    }
  };

  const confirmCreate = () => {
    const max = maxVotes ? parseInt(maxVotes, 10) : undefined;
    // Ensure 0 is treated as 0 (no limit) or undefined based on logic preference, 
    // but typically 0 means unlimited in this UI.
    // If the input is empty string, it's undefined. If it's '0', it's 0.
    const dur = duration !== '' ? parseInt(duration, 10) : undefined;
    const prefix = votePrefix.trim() || '+';
    
    // Apply default voteKeys (1, 2, 3...) if empty
    const finalOptions = options.map((opt, i) => ({
      ...opt,
      voteKey: opt.voteKey?.trim() || String(i + 1)
    }));
    
    onCreate(title.trim() || t.poll.liveTitle, question, finalOptions, max, dur, progressBarColor, limitIndicatorColor, localModerationConfig, prefix, 'exact');
    setShowConfirm(false);
    
    // OBS Trigger: Poll start
    triggerPollStart();
  };
  
  const handleModerationConfigChange = (config: ModerationConfig) => {
    setLocalModerationConfig(config);
    onModerationConfigChange?.(config);
  };

  const saveTemplate = () => {
    if (!question.trim()) {
        if (onNotification) onNotification('error', t.poll.writeQuestion);
        return;
    }
    if (options.length < 2) {
        if (onNotification) onNotification('error', t.poll.minOptions);
        return;
    }
    if (options.some(opt => !opt.label.trim())) {
        if (onNotification) onNotification('error', t.poll.allOptionsNeedLabel);
        return;
    }
    const newTemplate: SavedPoll = {
      id: Date.now().toString(),
      title,
      question,
      options,
      maxVotes: maxVotes ? parseInt(maxVotes, 10) : undefined,
      duration: duration !== '' ? parseInt(duration, 10) : undefined,
      progressBarColor,
      limitIndicatorColor,
      isFavorite: false
    };
    try {
      const newSaved = [...savedPolls, newTemplate];
      localStorage.setItem('twitch_vote_templates', JSON.stringify(newSaved));
      setSavedPolls(newSaved);
      if (onNotification) onNotification('success', t.poll.templateSaved);
    } catch (e) {
      if (onNotification) onNotification('error', t.poll.storageFull);
    }
  };

  const loadTemplate = (template: SavedPoll) => {
    setTitle(template.title || t.poll.liveTitle);
    setQuestion(template.question);
    setOptions(template.options.map((opt, i) => ({
       ...opt, 
       color: opt.color || CHART_COLORS[i % CHART_COLORS.length],
       icon: opt.icon || '', 
       image: opt.image || '' 
    })));
    setMaxVotes(template.maxVotes ? template.maxVotes.toString() : '');
    setDuration(template.duration !== undefined ? template.duration.toString() : '');

    
    setShowTemplates(false);
    if (onNotification) onNotification('info', t.poll.templateLoaded);
  };

  const deleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = savedPolls.filter(p => p.id !== id);
    setSavedPolls(newSaved);
    localStorage.setItem('twitch_vote_templates', JSON.stringify(newSaved));
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = savedPolls.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p);
    setSavedPolls(newSaved);
    localStorage.setItem('twitch_vote_templates', JSON.stringify(newSaved));
  };

  // Export templates to JSON file
  const exportTemplates = () => {
    if (savedPolls.length === 0) {
      if (onNotification) onNotification('error', 'No hay plantillas para exportar');
      return;
    }
    const dataStr = JSON.stringify(savedPolls, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantillas_encuestas_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onNotification) onNotification('success', `${savedPolls.length} plantillas exportadas`);
  };

  // Import templates from JSON file
  const templateFileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImportTemplates = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as SavedPoll[];
        if (!Array.isArray(imported)) {
          throw new Error('Invalid format');
        }
        // Validate and assign new IDs to avoid conflicts
        const validTemplates = imported.filter(t => t.question && Array.isArray(t.options)).map(t => ({
          ...t,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          isFavorite: t.isFavorite || false
        }));
        
        if (validTemplates.length === 0) {
          if (onNotification) onNotification('error', 'No se encontraron plantillas válidas');
          return;
        }
        
        const newSaved = [...savedPolls, ...validTemplates];
        localStorage.setItem('twitch_vote_templates', JSON.stringify(newSaved));
        setSavedPolls(newSaved);
        if (onNotification) onNotification('success', `${validTemplates.length} plantillas importadas`);
      } catch (err) {
        if (onNotification) onNotification('error', 'Error al leer el archivo. Asegúrate de que sea un JSON válido.');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (templateFileInputRef.current) templateFileInputRef.current.value = '';
  };

  const sortedTemplates = [...savedPolls]
    .filter(t => !filterFavorites || t.isFavorite)
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return parseInt(b.id) - parseInt(a.id);
    });

  const MAX_FILE_SIZE = 40 * 1024 * 1024;

  // Construct a poll object for the LivePoll preview
  const previewPoll: Poll = {
      id: 'preview',
      title: title,
      question: question || 'Vista Previa',
      options: options.map((o, i) => ({
        id: i + 1,
        label: o.label || `${t.poll.option} ${i + 1}`,
        votes: Math.floor(Math.random() * 50) + 10,
        color: o.color,
        icon: o.icon,
        image: o.image
      })),
      isActive: true,
      totalVotes: 0, 
      startTime: Date.now(),
      maxVotes: maxVotes ? parseInt(maxVotes, 10) : undefined,
      duration: duration !== '' ? parseInt(duration, 10) : undefined,
      progressBarColor,
      limitIndicatorColor
  };
  previewPoll.totalVotes = previewPoll.options.reduce((acc, curr) => acc + curr.votes, 0);

  return (
    <>
      <div className="h-full flex flex-col relative p-3 sm:p-4 md:p-6 bg-zinc-50 dark:bg-black/10 overflow-y-auto custom-scrollbar pb-20 md:pb-6">
        <div className={`flex justify-between items-center mb-4 sm:mb-6 shrink-0 transition-all duration-300 ${sidebarHidden ? 'pt-12 md:pt-0' : ''}`}>
          <h3 className="text-base sm:text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
            <span className="bg-twitch-brand w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm text-white shadow-lg shadow-twitch-brand/30">🛠️</span>
            <span className="hidden xs:inline">{t.poll.createTitle}</span>
            <span className="xs:hidden">{t.poll.create}</span>
          </h3>
          <div className="flex gap-1.5 sm:gap-2">
            <button 
              type="button"
              onClick={() => {
                setTitle(t.poll.liveTitle);
                setQuestion('');
                setOptions([ { label: `${t.poll.option} 1`, color: CHART_COLORS[0], icon: '1️⃣', image: '' }, { label: `${t.poll.option} 2`, color: CHART_COLORS[1], icon: '2️⃣', image: '' } ]);
                setMaxVotes('');
                setDuration('');
              }}
              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white p-1.5 sm:p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              title={t.poll.clearForm}
            >
              <RefreshCcw size={16} />
            </button>
            <button 
              onClick={() => setShowTemplates(!showTemplates)}
              className={`text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 bg-white dark:bg-zinc-900 px-2 sm:px-3 py-1.5 rounded-lg border transition-all ${showTemplates ? 'border-twitch-brand text-twitch-brand dark:text-twitch-light' : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'}`}
            >
              <Bookmark size={14} /> <span className="hidden xs:inline">{t.poll.templates}</span>
            </button>
            {onShowHistory && (
              <Tooltip text="Ver historial de encuestas pasadas">
                <button 
                  type="button"
                  onClick={onShowHistory}
                  className="text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 bg-white dark:bg-zinc-900 px-2 sm:px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-twitch-brand transition-all"
                >
                  <History size={14} /> <span className="hidden xs:inline">Historial</span>
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {showTemplates && (
          <div className="mb-4 sm:mb-6 bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-fade-in-down relative z-30 shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3">
               <div className="flex items-center gap-2 sm:gap-4">
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300">{t.poll.myTemplates} ({savedPolls.length})</h4>
                  <button onClick={() => setFilterFavorites(!filterFavorites)} className={`flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full transition-colors border ${filterFavorites ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400' : 'border-transparent text-zinc-500'}`}>
                     <Star size={10} fill={filterFavorites ? "currentColor" : "none"} /> {t.poll.favorites}
                  </button>
               </div>
               <div className="flex items-center gap-1">
                  {/* Export templates */}
                  <Tooltip text="Descargar plantillas como archivo JSON">
                    <button 
                      onClick={exportTemplates} 
                      disabled={savedPolls.length === 0}
                      className="p-1.5 text-zinc-400 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download size={14} />
                    </button>
                  </Tooltip>
                  {/* Import templates */}
                  <Tooltip text="Cargar plantillas desde archivo JSON">
                    <button 
                      onClick={() => templateFileInputRef.current?.click()} 
                      className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                    >
                      <FolderUp size={14} />
                    </button>
                  </Tooltip>
                  <input 
                    type="file"
                    id="template-import-file"
                    name="template-import-file"
                    aria-label="Importar plantillas"
                    ref={templateFileInputRef} 
                    accept=".json" 
                    onChange={handleImportTemplates} 
                    className="hidden" 
                  />
                  <button onClick={() => setShowTemplates(false)} className="p-1.5 text-zinc-500 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
               </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] sm:max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
              {sortedTemplates.map(poll => (
                <div key={poll.id} onClick={() => loadTemplate(poll)} className={`group relative bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 border p-2 sm:p-3 rounded-lg text-xs cursor-pointer transition-all flex flex-col gap-2 ${poll.isFavorite ? 'border-yellow-400/30' : 'border-zinc-200 dark:border-zinc-800'}`}>
                  <div className="flex justify-between items-start">
                     <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate pr-6 text-xs sm:text-sm">{poll.question}</span>
                     <div className="flex gap-1 absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
                         <button onClick={(e) => toggleFavorite(poll.id, e)} className={`transition-colors p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 ${poll.isFavorite ? 'text-yellow-500' : 'text-zinc-400 hover:text-yellow-500'}`}><Star size={12} fill={poll.isFavorite ? "currentColor" : "none"} /></button>
                         <button onClick={(e) => deleteTemplate(poll.id, e)} className="text-zinc-400 hover:text-red-500 p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><Trash2 size={12} /></button>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4 flex-1 flex flex-col">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-center">
              {/* Toggle Modo Rápido */}
              <Tooltip text={quickMode ? 'Modo Rápido: Los presets crean la encuesta directamente' : 'Modo Normal: Los presets solo rellenan el formulario'}>
                <button 
                  type="button"
                  onClick={() => setQuickMode(!quickMode)}
                  className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold transition-all ${
                    quickMode 
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/40' 
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 border border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  <Zap size={12} className={quickMode ? 'text-green-500' : 'text-zinc-400'} />
                  <span className="hidden sm:inline">{quickMode ? 'Rápido' : 'Normal'}</span>
                  <div className={`w-6 h-3.5 rounded-full transition-colors relative ${quickMode ? 'bg-green-500' : 'bg-zinc-400'}`}>
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${quickMode ? 'translate-x-3' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              </Tooltip>
              
              <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700 shrink-0" />
              
              {/* Plantillas - Presets */}
              <Tooltip text="Encuesta rápida Sí/No">
                <button type="button" onClick={() => handlePresetClick('yesno')} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm transition-colors ${quickMode ? 'bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30 hover:bg-green-500/20' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-twitch-brand'}`}><Check size={12} className="text-green-500"/> {t.poll.yesNo}</button>
              </Tooltip>
              <Tooltip text="Encuesta de puntuación 1-5">
                <button type="button" onClick={() => handlePresetClick('rating')} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm transition-colors ${quickMode ? 'bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-twitch-brand'}`}><Star size={12} className="text-yellow-500"/> 1 - 5</button>
              </Tooltip>
              <Tooltip text="Encuesta de opciones A/B/C">
                <button type="button" onClick={() => handlePresetClick('abc')} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm transition-colors ${quickMode ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-twitch-brand'}`}><Grid size={12} className="text-blue-500"/> A / B / C</button>
              </Tooltip>
              
              <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700 shrink-0" />
              
              {/* Importar Opciones */}
              <Tooltip text="Importar opciones desde texto">
                <button type="button" onClick={() => setShowImportModal(true)} className="whitespace-nowrap px-3 py-1 bg-white dark:bg-zinc-900 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1 shadow-sm hover:border-twitch-brand transition-colors"><FileText size={12} className="text-purple-500"/> Opciones</button>
              </Tooltip>
              
              <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700 shrink-0" />
              
              {/* Herramientas */}
              <Tooltip text="Gira la ruleta con las opciones actuales">
                <button type="button" onClick={() => setShowSpinner(true)} className="whitespace-nowrap px-3 py-1 bg-gradient-to-r from-pink-500/10 to-purple-500/10 dark:from-pink-500/20 dark:to-purple-500/20 rounded-full text-xs font-medium text-pink-600 dark:text-pink-400 border border-pink-500/30 flex items-center gap-1 shadow-sm hover:from-pink-500/20 hover:to-purple-500/20 transition-colors"><Disc3 size={12} className="text-pink-500"/> {t.poll.spinnerWheel}</button>
              </Tooltip>
              <Tooltip text="Countdown que suma tiempo con subs y bits">
                <button type="button" onClick={onShowCountdown} className="whitespace-nowrap px-3 py-1 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 rounded-full text-xs font-medium text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-1 shadow-sm hover:from-cyan-500/20 hover:to-blue-500/20 transition-colors"><Clock size={12} className="text-cyan-500"/> Countdown</button>
              </Tooltip>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="space-y-1 sm:col-span-1">
                <label htmlFor="poll-title" className="text-zinc-500 dark:text-zinc-500 text-xs font-bold ml-1 uppercase flex items-center">{t.poll.sectionTitle} <Tooltip text={t.poll.sectionTitleTooltip}/></label>
                <input id="poll-title" name="poll-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.poll.title} className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-twitch-brand focus:ring-1 focus:ring-twitch-brand select-text" />
            </div>
             <div className="space-y-1 sm:col-span-2">
                <label htmlFor="poll-question" className="text-zinc-500 dark:text-zinc-400 text-xs font-bold ml-1 uppercase flex items-center">{t.poll.questionLabel} <Tooltip text={t.poll.questionTooltip}/></label>
                <input id="poll-question" name="poll-question" type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t.poll.questionPlaceholderFull} className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-twitch-brand dark:focus:border-twitch-light focus:ring-1 focus:ring-twitch-brand dark:focus:ring-twitch-light shadow-sm select-text" />
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-hidden flex flex-col bg-zinc-100 dark:bg-zinc-900/40 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800/50">
            <div className="flex justify-between items-end px-1">
                <label className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase flex items-center gap-2">{t.poll.responseOptions}</label>
                <span className="text-[10px] text-zinc-400 font-mono bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{options.length}/{MAX_OPTIONS}</span>
            </div>
            
            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar pb-2">
              {options.map((opt, index) => (
                <div 
                  key={index} 
                  className={`flex gap-2 items-center group animate-fade-in-up ${draggedIndex === index ? 'opacity-50' : ''}`} 
                  style={{ animationDelay: `${index * 50}ms` }}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400 shrink-0" title="Arrastrar para reordenar">
                    <GripVertical size={14} />
                  </div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm shadow-sm relative overflow-hidden cursor-pointer hover:scale-105 transition-transform ring-1 ring-black/5 dark:ring-white/5" style={{ backgroundColor: opt.color }} title="Color">
                     <input type="color" id={`option-color-${index}`} name={`option-color-${index}`} aria-label={`Color de opción ${index + 1}`} value={opt.color} onChange={(e) => handleColorChange(index, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  </div>
                  <div className="relative w-[42px] h-9 shrink-0">
                     <div className={`w-full h-full bg-white dark:bg-zinc-900 border rounded-lg flex items-center justify-center overflow-hidden relative group/icon transition-all ${opt.image ? 'border-twitch-brand/50' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-500'}`}>
                        {opt.image ? (
                           <><img src={opt.image} alt="icon" className="w-full h-full object-cover" /><button type="button" onClick={() => removeImage(index)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/icon:opacity-100 transition-opacity"><X size={14} className="text-white" /></button></>
                        ) : (
                           <>
                              <input type="text" id={`option-icon-${index}`} name={`option-icon-${index}`} aria-label={`Emoji de opción ${index + 1}`} value={opt.icon || ''} onChange={(e) => handleIconChange(index, e.target.value)} className="w-full h-full bg-transparent text-center text-lg text-zinc-900 dark:text-white focus:outline-none z-10 relative font-emoji" placeholder="😀" maxLength={2} />
                              {!opt.icon && <Smile size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-700 pointer-events-none" />}
                              <div className="absolute bottom-0 right-0 left-0 flex h-full opacity-0 group-hover/icon:opacity-100 transition-opacity z-20 bg-white dark:bg-zinc-900">
                                <button type="button" onClick={() => fileInputRefs.current[index]?.click()} className="flex-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-twitch-brand flex items-center justify-center border-r border-zinc-100 dark:border-zinc-800" title={t.poll.uploadImage}><Upload size={14} /></button>
                                <button type="button" onClick={() => setShowAssetPicker(index)} className="flex-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-twitch-brand flex items-center justify-center" title={t.poll.galleryBtn}><Grid size={14} /></button>
                              </div>
                           </>
                        )}
                     </div>
                     <input type="file" id={`option-image-${index}`} name={`option-image-${index}`} accept="image/*" className="hidden" ref={el => fileInputRefs.current[index] = el} onChange={(e) => handleImageUpload(index, e)} />
                  </div>
                  <div className="flex-1 flex gap-1.5">
                     <input 
                        id={`option-label-${index}`}
                        name={`option-label-${index}`}
                        aria-label={`Texto de opción ${index + 1}`}
                        type="text" 
                        value={opt.label} 
                        onChange={(e) => handleOptionChange(index, e.target.value)} 
                        className="flex-1 bg-white dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-twitch-brand dark:focus:border-twitch-light focus:ring-1 focus:ring-twitch-brand dark:focus:ring-twitch-light select-text" 
                        placeholder={`${t.poll.option} ${index + 1}`} 
                     />
                     <div className="relative w-28">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-mono pointer-events-none">{votePrefix}</span>
                        <input 
                           id={`option-votekey-${index}`}
                           name={`option-votekey-${index}`}
                           aria-label={`Clave de voto de opción ${index + 1}`}
                           type="text" 
                           value={opt.voteKey || ''} 
                           onChange={(e) => handleVoteKeyChange(index, e.target.value)} 
                           className={`w-full bg-white dark:bg-zinc-900/80 border text-zinc-900 dark:text-white rounded-lg pl-5 pr-2 py-2 text-xs font-mono focus:outline-none focus:ring-1 select-text ${
                             opt.voteKey && duplicateVoteKeys.has(opt.voteKey.toLowerCase()) 
                               ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                               : 'border-zinc-300 dark:border-zinc-700 focus:border-twitch-brand dark:focus:border-twitch-light focus:ring-twitch-brand dark:focus:ring-twitch-light'
                           }`}
                           placeholder={`ej: ${index + 1}/casa`}
                           title={t.poll.voteKeyTooltip}
                        />
                        {opt.voteKey && duplicateVoteKeys.has(opt.voteKey.toLowerCase()) && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" title="Clave duplicada" />
                        )}
                     </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                      {options.length < MAX_OPTIONS && (
                        <button type="button" onClick={() => duplicateOption(index)} className="p-1.5 text-zinc-300 hover:text-twitch-brand hover:bg-twitch-brand/10 rounded-lg transition-colors" title="Duplicar opción">
                          <Copy size={12} />
                        </button>
                      )}
                      {options.length > MIN_OPTIONS && (
                        <button type="button" onClick={() => removeOption(index)} className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar opción">
                          <Trash2 size={12} />
                        </button>
                      )}
                  </div>
                </div>
              ))}
               {options.length < MAX_OPTIONS && <button type="button" onClick={addOption} className="w-full py-2.5 border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 rounded-lg hover:border-twitch-brand hover:text-twitch-brand dark:hover:border-twitch-light dark:hover:text-twitch-light hover:bg-twitch-brand/5 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide mt-2"><Plus size={14} /> {t.poll.addOptionBtn}</button>}
            </div>
            
            {/* Live vote preview */}
            <div className="mt-3 p-2 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-lg">
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold mb-1">Los viewers votarán con:</p>
              <div className="flex flex-wrap gap-1">
                {options.map((opt, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white dark:bg-zinc-900 rounded text-xs font-mono text-twitch-brand dark:text-twitch-light border border-zinc-300 dark:border-zinc-700">
                    {votePrefix}{opt.voteKey || (i + 1)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
             <div className="flex flex-col sm:flex-row gap-4 mb-4">
                 <div className="flex-1 grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                       <label htmlFor="poll-max-votes" className="text-zinc-500 dark:text-zinc-400 text-xs font-bold ml-1 uppercase flex items-center">{t.poll.goal} <Tooltip text={t.poll.goalTooltip}/></label>
                       <div className="relative">
                           <Target size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
                           <input id="poll-max-votes" name="poll-max-votes" type="number" min="1" value={maxVotes} onChange={(e) => setMaxVotes(e.target.value)} placeholder="∞" className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg pl-9 pr-2 py-2 text-sm focus:outline-none focus:border-twitch-brand dark:focus:border-twitch-light" />
                       </div>
                     </div>
                     <div className="space-y-1">
                       <label htmlFor="poll-duration" className="text-zinc-500 dark:text-zinc-400 text-xs font-bold ml-1 uppercase flex items-center">{t.poll.timeSec}</label>
                       <div className="relative">
                            {(duration === '' || duration === '0') ? (
                                <InfinityIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
                            ) : (
                                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-twitch-brand dark:text-twitch-light"/>
                            )}
                            <input
                                id="poll-duration"
                                name="poll-duration"
                                type="number"
                                min="0" 
                                value={duration} 
                                onChange={(e) => setDuration(e.target.value)}
                                placeholder={`0 = ${t.poll.unlimited}`}
                                className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-lg pl-8 pr-2 py-2 text-sm focus:outline-none focus:border-twitch-brand dark:focus:border-twitch-light"
                            />
                       </div>
                     </div>
                 </div>
                 
                 {/* Vote Prefix Config */}
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <label htmlFor="poll-vote-prefix" className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase flex items-center">{t.poll.votePrefix}<Tooltip text={t.poll.votePrefixTooltip}/></label>
                       <input 
                         id="poll-vote-prefix"
                         name="poll-vote-prefix"
                         type="text" 
                         value={votePrefix} 
                         onChange={e => setVotePrefix(e.target.value.slice(0, 3))} 
                         placeholder="+"
                         maxLength={3}
                         className="w-12 h-8 text-center bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-twitch-brand"
                       />
                    </div>
                 </div>
             </div>
             
             {/* Moderation Toggle Button */}
             <div className="mb-4">
                <button 
                  type="button" 
                  onClick={() => setShowModerationPanel(!showModerationPanel)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                    showModerationPanel 
                      ? 'bg-twitch-brand/10 border-twitch-brand/30 text-twitch-brand dark:text-twitch-light' 
                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-twitch-brand/50'
                  }`}
                >
                  <span className="flex items-center gap-2 font-bold text-sm">
                    <Shield size={16} />
                    {t.moderation.title}
                  </span>
                  <span className="text-xs">
                    {showModerationPanel ? `▲ ${t.connection.hideToken}` : `▼ ${t.moderation.config}`}
                  </span>
                </button>
             </div>
             
             {/* Moderation Config Form */}
             {showModerationPanel && (
               <div className="mb-4 animate-fade-in">
                 <ModerationConfigForm
                   config={localModerationConfig}
                   onChange={handleModerationConfigChange}
                   onNotification={onNotification}
                 />
               </div>
             )}
             
             <div className="flex gap-2 mb-4">
                <button type="button" onClick={() => setShowPreview(true)} className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold text-sm h-[42px] flex items-center gap-1.5" title={t.poll.preview}><Eye size={16} /> <span className="hidden xs:inline">{t.poll.preview}</span></button>
                <button type="button" onClick={saveTemplate} disabled={!question.trim()} className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 font-bold text-sm h-[42px] flex items-center gap-1.5" title={t.poll.saveTemplate}><Save size={16} /> <span className="hidden xs:inline">{t.poll.save}</span></button>
                <div className="flex-1"></div>
                <OBSOverlayUrl overlayParam="overlayPoll" title="la encuesta" />
             </div>

             <Tooltip text="Atajo: Ctrl+Enter">
               <Button fullWidth type="button" onClick={handlePreSubmit} disabled={!question.trim() || options.some(o => !o.label.trim())} className="shadow-lg shadow-twitch-brand/20 hover:shadow-twitch-brand/40 h-12 text-base">
                 <Zap size={20} className="fill-current" /> {t.poll.create}
                 <span className="ml-2 text-[10px] opacity-60 hidden sm:inline bg-white/20 px-1.5 py-0.5 rounded">Ctrl+↵</span>
               </Button>
             </Tooltip>
          </div>
        </form>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-4xl rounded-2xl shadow-2xl p-6 animate-scale-up flex flex-col max-h-[90vh]">
                 <div className="flex justify-between items-center mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2 shrink-0">
                      <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2"><Eye size={18} className="text-twitch-brand"/> {t.poll.preview}</h3>
                      <button onClick={() => setShowPreview(false)} className="text-zinc-500 hover:text-black dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full p-1 transition-colors"><X size={18}/></button>
                 </div>
                 <div className="flex-1 bg-zinc-50 dark:bg-black/20 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-y-auto custom-scrollbar relative">
                    {/* Render LivePoll with dummy data for exact preview */}
                    <LivePoll 
                        poll={previewPoll} 
                        voteHistory={[]} 
                        onStop={()=>{}} 
                        onReset={()=>{}} 
                        variant="preview"
                        theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                    />
                 </div>
                 <div className="mt-4 flex justify-end shrink-0"><Button onClick={() => setShowPreview(false)}>{t.common.close}</Button></div>
             </div>
        </div>
      )}

      {showPresetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-sm rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{t.poll.apply}?</h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4">{t.poll.replaceOptions}</p>
              <div className="flex justify-end gap-2">
                 <Button variant="secondary" onClick={() => setShowPresetConfirm(null)}>{t.poll.cancel}</Button>
                 <Button onClick={() => applyPreset(showPresetConfirm)}>{t.poll.apply}</Button>
              </div>
           </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-scale-up">
             <div className="flex items-center gap-3 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div className="bg-twitch-brand/10 p-2.5 rounded-full text-twitch-brand dark:text-twitch-light animate-pulse"><AlertCircle size={24} /></div>
                <div><h3 className="text-xl font-bold text-zinc-900 dark:text-white">{t.poll.confirm}</h3><p className="text-zinc-500 dark:text-zinc-400 text-xs">{t.poll.confirmHint}</p></div>
             </div>
             <div className="space-y-4 mb-6">
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-2 opacity-10"><Zap size={64} className="text-twitch-brand"/></div>
                   <span className="text-[10px] text-twitch-brand dark:text-twitch-light uppercase font-bold block mb-1 tracking-wider">{title}</span>
                   <p className="text-zinc-900 dark:text-white font-bold text-lg leading-tight break-words">{question}</p>
                   <div className="flex gap-3 mt-3">
                       {maxVotes && <span className="text-xs text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded flex items-center gap-1"><Target size={10}/> Meta: {maxVotes}</span>}
                       {duration && <span className="text-xs text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded flex items-center gap-1"><Clock size={10}/> {duration}s</span>}
                   </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar pr-1 space-y-2">
                      {options.map((opt, i) => (
                         <div key={i} className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/30 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800/50">
                            <span className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center overflow-hidden shadow-sm border border-black/5" style={{backgroundColor: opt.image ? 'transparent' : opt.color}}>{opt.image ? <img src={opt.image} alt="" className="w-full h-full object-cover" /> : <span className="text-black font-bold text-lg mix-blend-multiply">{opt.icon || i+1}</span>}</span>
                            <span className="font-bold text-zinc-400 text-xs mr-1 bg-zinc-200 dark:bg-zinc-800 px-1.5 rounded">+{i+1}</span>
                            <span className="truncate flex-1 font-medium">{opt.label}</span>
                         </div>
                      ))}
                </div>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => setShowConfirm(false)} variant="secondary">Volver</Button>
                <Button onClick={confirmCreate}><Check size={18} /> Lanzar Ahora</Button>
             </div>
          </div>
        </div>
      )}

      {showAssetPicker !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-up flex flex-col max-h-[80vh]">
                  <div className="flex justify-between items-center mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2"><Grid size={18} className="text-twitch-brand"/> Vincular de Galería</h3>
                      <button onClick={() => setShowAssetPicker(null)} className="text-zinc-500 hover:text-black dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full p-1 transition-colors"><X size={18}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50 dark:bg-black/20 rounded-xl p-3 min-h-[200px]">
                      {mediaLibrary.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2"><Grid size={32} className="opacity-50" /><p className="text-sm">Galería vacía.</p></div>
                      ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                              {mediaLibrary.map(asset => (
                                  <button key={asset.id} onClick={() => selectAssetFromLibrary(asset)} className="aspect-square bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-twitch-brand overflow-hidden transition-all group relative shadow-sm">
                                      <img src={asset.data} alt={asset.name} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-xs font-bold text-white bg-twitch-brand px-2 py-0.5 rounded-full shadow-lg">Usar</span></div>
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Import Options Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-purple-500"/> Importar Opciones
              </h3>
              <button onClick={() => { setShowImportModal(false); setImportText(''); }} className="text-zinc-500 hover:text-black dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full p-1 transition-colors">
                <X size={18}/>
              </button>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
              Pega una lista de opciones, una por línea (máx. {MAX_OPTIONS}):
            </p>
            <textarea
              id="import-options-text"
              name="import-options-text"
              aria-label="Lista de opciones a importar"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`Opción 1\nOpción 2\nOpción 3\n...`}
              className="w-full h-40 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-twitch-brand resize-none"
            />
            <p className="text-xs text-zinc-400 mt-2 mb-4">
              {importText.split('\n').filter(l => l.trim()).length} opciones detectadas
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShowImportModal(false); setImportText(''); }}>Cancelar</Button>
              <Button onClick={importOptionsFromText} disabled={!importText.trim()}>
                <FileText size={16} /> Importar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Spinner Wheel Modal */}
      {showSpinner && (
        <SpinnerWheel 
          options={options.map((opt, i) => ({
            id: i + 1,
            label: opt.label,
            votes: 0,
            color: opt.color,
            icon: opt.icon,
            image: opt.image,
            voteKey: opt.voteKey
          }))} 
          onClose={() => setShowSpinner(false)}
          chatMessages={chatMessages}
          votePrefix={votePrefix}
          userVoteMap={userVoteMap}
          collaborationChannels={collaborationChannels}
          mainChannel={mainChannel}
          onAddCollaborator={onAddCollaborator}
          onRemoveCollaborator={onRemoveCollaborator}
          isConnected={isConnected}
        />
      )}

    </>
  );
};
