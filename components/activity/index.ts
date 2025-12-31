/**
 * Activity components barrel export
 * 
 * Exports all subcomponents for the StreamActivity refactor
 */

export { ActivityStats } from './ActivityStats';
export type { ActivityStatsProps } from './ActivityStats';

// Re-export colors from centralized utility for backward compatibility
export { EVENT_COLORS, getEventColor, getEventTint } from '../../src/application/utils/uiColors';

export { EventFeed } from './EventFeed';
export type { EventFeedProps, PollOption } from './EventFeed';

export { ViewerPanel } from './ViewerPanel';
export type { ViewerPanelProps, ModerationAction } from './ViewerPanel';

export { ModerationDrawer } from './ModerationDrawer';
export type { ModerationDrawerProps, ModerationUser } from './ModerationDrawer';

export { ViewerProfile } from './ViewerProfile';
export type { ViewerProfileProps } from './ViewerProfile';

export { APIDataPanel } from './APIDataPanel';
export type { APIDataPanelProps } from './APIDataPanel';
