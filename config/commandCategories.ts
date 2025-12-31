/**
 * Command Categories Configuration
 * 
 * Default categories for organizing custom commands.
 */

import type { CommandCategory } from '../types/commandEditor';

/**
 * Default command categories
 */
export const DEFAULT_CATEGORIES: CommandCategory[] = [
  { id: 'general', name: 'General', icon: '📋', color: 'zinc', isDefault: true, order: 0 },
  { id: 'info', name: 'Información', icon: 'ℹ️', color: 'blue', isDefault: true, order: 1 },
  { id: 'social', name: 'Redes Sociales', icon: '🌐', color: 'purple', isDefault: true, order: 2 },
  { id: 'entertainment', name: 'Entretenimiento', icon: '🎉', color: 'yellow', isDefault: true, order: 3 },
  { id: 'games', name: 'Juegos', icon: '🎮', color: 'green', isDefault: true, order: 4 },
  { id: 'moderation', name: 'Moderación', icon: '🛡️', color: 'red', isDefault: true, order: 5 },
  { id: 'utility', name: 'Utilidades', icon: '🔧', color: 'cyan', isDefault: true, order: 6 },
  { id: 'other', name: 'Otros', icon: '📁', color: 'gray', isDefault: true, order: 7 },
];

/**
 * Color mapping for Tailwind classes
 */
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  zinc: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  gray: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
};

/**
 * Get category by ID
 */
export function getCategoryById(id: string, customCategories: CommandCategory[] = []): CommandCategory | undefined {
  return [...DEFAULT_CATEGORIES, ...customCategories].find(c => c.id === id);
}

/**
 * Get all categories sorted by order
 */
export function getAllCategories(customCategories: CommandCategory[] = []): CommandCategory[] {
  return [...DEFAULT_CATEGORIES, ...customCategories].sort((a, b) => a.order - b.order);
}

/**
 * Get color classes for a category
 */
export function getCategoryColors(color: string): { bg: string; text: string; border: string } {
  return CATEGORY_COLORS[color] || CATEGORY_COLORS.gray;
}

/**
 * Generate a unique ID for a new category
 */
export function generateCategoryId(name: string): string {
  return `custom-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
}

/**
 * Validate category name
 */
export function validateCategoryName(name: string, existingCategories: CommandCategory[]): { valid: boolean; error?: string } {
  if (!name.trim()) {
    return { valid: false, error: 'El nombre es requerido' };
  }
  if (name.length > 30) {
    return { valid: false, error: 'El nombre no puede tener más de 30 caracteres' };
  }
  const exists = existingCategories.some(c => c.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return { valid: false, error: 'Ya existe una categoría con ese nombre' };
  }
  return { valid: true };
}
