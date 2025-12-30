/**
 * Timer Templates Configuration
 * 
 * Predefined templates for common timer use cases.
 */

import type { TimerTemplate } from '../types/timers';

export const TIMER_TEMPLATES: TimerTemplate[] = [
  // Social Media
  {
    id: 'social-twitter',
    name: 'Twitter/X',
    message: '🐦 ¡Sígueme en Twitter! twitter.com/$(channel)',
    intervalMinutes: 30,
    minChatLines: 10,
    category: 'social',
    icon: 'Twitter'
  },
  {
    id: 'social-instagram',
    name: 'Instagram',
    message: '📸 ¡Sígueme en Instagram! instagram.com/$(channel)',
    intervalMinutes: 30,
    minChatLines: 10,
    category: 'social',
    icon: 'Instagram'
  },
  {
    id: 'social-youtube',
    name: 'YouTube',
    message: '🎬 ¡Suscríbete a mi canal de YouTube! youtube.com/@$(channel)',
    intervalMinutes: 45,
    minChatLines: 15,
    category: 'social',
    icon: 'Youtube'
  },
  {
    id: 'social-tiktok',
    name: 'TikTok',
    message: '🎵 ¡Sígueme en TikTok! tiktok.com/@$(channel)',
    intervalMinutes: 30,
    minChatLines: 10,
    category: 'social',
    icon: 'Music'
  },
  
  // Discord
  {
    id: 'discord-join',
    name: 'Discord - Únete',
    message: '💬 ¡Únete a nuestro Discord! Comunidad, sorteos y más: discord.gg/TULINK',
    intervalMinutes: 45,
    minChatLines: 15,
    category: 'discord',
    icon: 'MessageCircle'
  },
  {
    id: 'discord-events',
    name: 'Discord - Eventos',
    message: '🎉 ¿Quieres saber cuándo hay stream? ¡Únete al Discord para notificaciones! discord.gg/TULINK',
    intervalMinutes: 60,
    minChatLines: 20,
    category: 'discord',
    icon: 'Bell'
  },
  
  // Rules
  {
    id: 'rules-respect',
    name: 'Reglas - Respeto',
    message: '📋 Recuerda: Respeta a todos en el chat. ¡Mantengamos un ambiente positivo!',
    intervalMinutes: 60,
    minChatLines: 20,
    category: 'rules',
    icon: 'Shield'
  },
  {
    id: 'rules-spam',
    name: 'Reglas - No Spam',
    message: '🚫 Por favor, evita el spam y los mensajes repetitivos. ¡Gracias por mantener el chat limpio!',
    intervalMinutes: 45,
    minChatLines: 25,
    category: 'rules',
    icon: 'AlertTriangle'
  },
  {
    id: 'rules-language',
    name: 'Reglas - Idioma',
    message: '🌍 Este es un canal en español. ¡Todos son bienvenidos pero mantengamos el chat en español!',
    intervalMinutes: 60,
    minChatLines: 30,
    category: 'rules',
    icon: 'Globe'
  },
  
  // Donations
  {
    id: 'donations-tip',
    name: 'Donaciones - Tip',
    message: '💰 ¿Quieres apoyar el stream? ¡Las donaciones ayudan mucho! streamelements.com/$(channel)/tip',
    intervalMinutes: 45,
    minChatLines: 25,
    category: 'donations',
    icon: 'DollarSign'
  },
  {
    id: 'donations-bits',
    name: 'Donaciones - Bits',
    message: '💎 ¡Apoya el canal con Bits! Cada bit cuenta y apareces en pantalla 🎉',
    intervalMinutes: 45,
    minChatLines: 20,
    category: 'donations',
    icon: 'Gem'
  },
  {
    id: 'donations-sub',
    name: 'Suscripciones',
    message: '⭐ ¡Suscríbete para apoyar el canal! Emotes exclusivos, sin anuncios y más beneficios',
    intervalMinutes: 60,
    minChatLines: 25,
    category: 'donations',
    icon: 'Star'
  },
  
  // Commands
  {
    id: 'commands-help',
    name: 'Comandos - Ayuda',
    message: '❓ ¿Nuevo en el canal? Escribe !comandos para ver la lista de comandos disponibles',
    intervalMinutes: 30,
    minChatLines: 15,
    category: 'commands',
    icon: 'Terminal'
  },
  {
    id: 'commands-points',
    name: 'Comandos - Puntos',
    message: '🎯 ¡Gana puntos del canal viendo el stream! Usa !puntos para ver tu balance',
    intervalMinutes: 45,
    minChatLines: 20,
    category: 'commands',
    icon: 'Coins'
  },
  {
    id: 'commands-game',
    name: 'Comandos - Juego',
    message: '🎮 ¿Qué estamos jugando? $(game) | Usa !juego para más info',
    intervalMinutes: 30,
    minChatLines: 10,
    category: 'commands',
    icon: 'Gamepad2'
  }
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TimerTemplate['category']): TimerTemplate[] {
  return TIMER_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): TimerTemplate['category'][] {
  return ['social', 'rules', 'discord', 'donations', 'commands'];
}

/**
 * Get category display info
 */
export function getCategoryInfo(category: TimerTemplate['category']): { name: string; icon: string; color: string } {
  const info: Record<TimerTemplate['category'], { name: string; icon: string; color: string }> = {
    social: { name: 'Redes Sociales', icon: 'Share2', color: '#3b82f6' },
    rules: { name: 'Reglas', icon: 'Shield', color: '#ef4444' },
    discord: { name: 'Discord', icon: 'MessageCircle', color: '#5865f2' },
    donations: { name: 'Donaciones', icon: 'DollarSign', color: '#10b981' },
    commands: { name: 'Comandos', icon: 'Terminal', color: '#a855f7' }
  };
  return info[category];
}
