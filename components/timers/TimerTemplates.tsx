/**
 * TimerTemplates Component
 * 
 * Displays predefined timer templates organized by category.
 */

import React, { useState } from 'react';
import { 
  Share2, Shield, MessageCircle, DollarSign, Terminal,
  Twitter, Instagram, Youtube, Music, Bell, AlertTriangle,
  Globe, Gem, Star, Coins, Gamepad2, ChevronDown, ChevronRight
} from 'lucide-react';
import type { TimerTemplate } from '../../types/timers';
import { TIMER_TEMPLATES, getCategoryInfo, getTemplateCategories } from '../../config/timerTemplates';
import { useI18n, interpolate } from '../../i18n';

// Icon mapping
const ICONS: Record<string, React.ReactNode> = {
  Twitter: <Twitter size={18} />,
  Instagram: <Instagram size={18} />,
  Youtube: <Youtube size={18} />,
  Music: <Music size={18} />,
  MessageCircle: <MessageCircle size={18} />,
  Bell: <Bell size={18} />,
  Shield: <Shield size={18} />,
  AlertTriangle: <AlertTriangle size={18} />,
  Globe: <Globe size={18} />,
  DollarSign: <DollarSign size={18} />,
  Gem: <Gem size={18} />,
  Star: <Star size={18} />,
  Terminal: <Terminal size={18} />,
  Coins: <Coins size={18} />,
  Gamepad2: <Gamepad2 size={18} />,
  Share2: <Share2 size={18} />,
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Share2: <Share2 size={16} />,
  Shield: <Shield size={16} />,
  MessageCircle: <MessageCircle size={16} />,
  DollarSign: <DollarSign size={16} />,
  Terminal: <Terminal size={16} />,
};

interface TimerTemplatesProps {
  onUseTemplate: (template: TimerTemplate) => void;
}

export const TimerTemplates: React.FC<TimerTemplatesProps> = ({
  onUseTemplate
}) => {
  const { t } = useI18n();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(getTemplateCategories())
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const categories = getTemplateCategories();

  // Get translated category name
  const getCategoryName = (category: string): string => {
    const key = category as keyof typeof t.timers.templateCategories;
    return t.timers.templateCategories[key] || category;
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-400 mb-4">
        {t.timers.templatesDescription}
      </div>

      {categories.map(category => {
        const info = getCategoryInfo(category);
        const templates = TIMER_TEMPLATES.filter(t => t.category === category);
        const isExpanded = expandedCategories.has(category);

        return (
          <div key={category} className="border border-zinc-800 rounded-lg overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span style={{ color: info.color }}>
                  {CATEGORY_ICONS[info.icon] || <Share2 size={16} />}
                </span>
                <span className="font-medium text-white">{getCategoryName(category)}</span>
                <span className="text-xs text-zinc-500">({templates.length})</span>
              </div>
              {isExpanded ? (
                <ChevronDown size={16} className="text-zinc-400" />
              ) : (
                <ChevronRight size={16} className="text-zinc-400" />
              )}
            </button>

            {/* Templates */}
            {isExpanded && (
              <div className="p-2 space-y-2">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span style={{ color: info.color }}>
                          {ICONS[template.icon] || <MessageCircle size={18} />}
                        </span>
                        <span className="font-medium text-white">{template.name}</span>
                      </div>
                      <button
                        onClick={() => onUseTemplate(template)}
                        className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                      >
                        {t.timers.useTemplate}
                      </button>
                    </div>
                    
                    <p className="text-sm text-zinc-400 mb-2 line-clamp-2">
                      {template.message}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{interpolate(t.timers.everyMinutes, { minutes: template.intervalMinutes })}</span>
                      <span>{interpolate(t.timers.minLines, { lines: template.minChatLines })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TimerTemplates;
