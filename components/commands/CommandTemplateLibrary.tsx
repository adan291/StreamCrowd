/**
 * CommandTemplateLibrary Component
 * 
 * Displays predefined command templates organized by category.
 * Users can browse, search, and add templates to their commands.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  X,
  Check,
  Sparkles
} from 'lucide-react';
import { 
  COMMAND_TEMPLATES, 
  TEMPLATE_CATEGORIES,
  getAllCategoriesWithTemplates,
  searchTemplates 
} from '../../config/commandTemplates';
import type { CommandTemplate, TemplateCategory, TemplateVariable } from '../../types/commandEditor';

interface TemplateCustomizeModalProps {
  template: CommandTemplate;
  onConfirm: (trigger: string, response: string) => void;
  onCancel: () => void;
}

/**
 * Modal for customizing template variables before adding
 */
const TemplateCustomizeModal: React.FC<TemplateCustomizeModalProps> = ({
  template,
  onConfirm,
  onCancel,
}) => {
  const [trigger, setTrigger] = useState(template.trigger);
  const [variableValues, setVariableValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    template.variables.forEach(v => {
      initial[v.key] = v.defaultValue || '';
    });
    return initial;
  });

  const handleVariableChange = useCallback((key: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const processedResponse = useMemo(() => {
    let response = template.response;
    template.variables.forEach(v => {
      const value = variableValues[v.key] || v.placeholder;
      response = response.replace(`{${v.key}}`, value);
    });
    return response;
  }, [template, variableValues]);

  const canConfirm = useMemo(() => {
    return template.variables
      .filter(v => v.required)
      .every(v => variableValues[v.key]?.trim());
  }, [template.variables, variableValues]);

  const handleConfirm = useCallback(() => {
    if (canConfirm) {
      onConfirm(trigger, processedResponse);
    }
  }, [canConfirm, trigger, processedResponse, onConfirm]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template.icon}</span>
            <div>
              <h3 className="text-white font-bold">{template.name}</h3>
              <p className="text-zinc-500 text-xs">{template.description}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Trigger */}
          <div>
            <label className="text-zinc-400 text-xs block mb-1">
              Comando (trigger)
            </label>
            <div className="flex items-center">
              <span className="bg-zinc-700 text-purple-400 px-3 py-2 rounded-l-lg border border-r-0 border-zinc-600">
                !
              </span>
              <input
                type="text"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value.toLowerCase())}
                className="flex-1 bg-zinc-700 text-white rounded-r-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Variables */}
          {template.variables.length > 0 && (
            <div className="space-y-3">
              <label className="text-zinc-400 text-xs block">
                Personalizar variables
              </label>
              {template.variables.map(variable => (
                <div key={variable.key}>
                  <label className="text-zinc-500 text-xs block mb-1">
                    {variable.label}
                    {variable.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={variableValues[variable.key]}
                    onChange={(e) => handleVariableChange(variable.key, e.target.value)}
                    placeholder={variable.placeholder}
                    className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          <div>
            <label className="text-zinc-400 text-xs block mb-1">
              Vista previa
            </label>
            <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
              <p className="text-zinc-300 text-sm">{processedResponse}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors text-sm"
          >
            <Plus size={16} />
            Agregar Comando
          </button>
        </div>
      </div>
    </div>
  );
};

interface TemplateCardProps {
  template: CommandTemplate;
  onSelect: (template: CommandTemplate) => void;
}

/**
 * Single template card
 */
const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(template)}
      className="w-full text-left bg-zinc-800/50 hover:bg-zinc-800 rounded-lg p-3 border border-zinc-700 hover:border-purple-500/50 transition-all group"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">{template.name}</span>
            <span className="text-purple-400 font-mono text-xs">!{template.trigger}</span>
          </div>
          <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">
            {template.description}
          </p>
        </div>
        <Plus 
          size={16} 
          className="text-zinc-600 group-hover:text-purple-400 transition-colors flex-shrink-0 mt-1" 
        />
      </div>
    </button>
  );
};

interface CategorySectionProps {
  category: TemplateCategory;
  meta: { name: string; icon: string; description: string };
  templates: CommandTemplate[];
  onSelectTemplate: (template: CommandTemplate) => void;
  defaultExpanded?: boolean;
}

/**
 * Collapsible category section
 */
const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  meta,
  templates,
  onSelectTemplate,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{meta.icon}</span>
          <span className="text-white font-medium text-sm">{meta.name}</span>
          <span className="text-zinc-500 text-xs">({templates.length})</span>
        </div>
        {expanded ? (
          <ChevronDown size={16} className="text-zinc-500" />
        ) : (
          <ChevronRight size={16} className="text-zinc-500" />
        )}
      </button>
      
      {expanded && (
        <div className="p-3 space-y-2 bg-zinc-900/50">
          {templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelectTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface CommandTemplateLibraryProps {
  onAddCommand: (trigger: string, response: string, userLevel: string, cooldown: number) => void;
  onClose?: () => void;
}

/**
 * Main template library component
 */
export const CommandTemplateLibrary: React.FC<CommandTemplateLibraryProps> = ({
  onAddCommand,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<CommandTemplate | null>(null);

  const categoriesWithTemplates = useMemo(() => getAllCategoriesWithTemplates(), []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchTemplates(searchQuery);
  }, [searchQuery]);

  const handleSelectTemplate = useCallback((template: CommandTemplate) => {
    setSelectedTemplate(template);
  }, []);

  const handleConfirmTemplate = useCallback((trigger: string, response: string) => {
    if (selectedTemplate) {
      onAddCommand(trigger, response, selectedTemplate.userLevel, selectedTemplate.cooldown);
      setSelectedTemplate(null);
    }
  }, [selectedTemplate, onAddCommand]);

  const handleCancelTemplate = useCallback(() => {
    setSelectedTemplate(null);
  }, []);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-purple-400" />
            <h3 className="text-white font-bold">Plantillas de Comandos</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar plantillas..."
            className="w-full bg-zinc-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
        {searchResults ? (
          // Search results
          searchResults.length > 0 ? (
            <div className="space-y-2">
              <p className="text-zinc-500 text-xs">
                {searchResults.length} resultado(s) para "{searchQuery}"
              </p>
              {searchResults.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              <p>No se encontraron plantillas</p>
            </div>
          )
        ) : (
          // Categories
          categoriesWithTemplates.map(({ category, meta, templates }, index) => (
            <CategorySection
              key={category}
              category={category}
              meta={meta}
              templates={templates}
              onSelectTemplate={handleSelectTemplate}
              defaultExpanded={index === 0}
            />
          ))
        )}
      </div>

      {/* Customize Modal */}
      {selectedTemplate && (
        <TemplateCustomizeModal
          template={selectedTemplate}
          onConfirm={handleConfirmTemplate}
          onCancel={handleCancelTemplate}
        />
      )}
    </div>
  );
};

export default CommandTemplateLibrary;
