import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
  animate?: boolean;
}

/**
 * Hook to detect if user prefers reduced motion
 * @requirements 6.5 - Respect prefers-reduced-motion preference
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Skeleton component for loading states
 * @requirements 7.3 - Show loading skeleton while components load
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
  animate = true,
}: SkeletonProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion;
  
  // Use shimmer animation when motion is allowed, static bg otherwise
  const baseClass = shouldAnimate 
    ? 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] animate-shimmer'
    : 'bg-gray-800';

  const getStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;
    return style;
  };

  if (variant === 'text') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClass} rounded h-4`}
            style={{
              ...getStyle(),
              width: i === lines - 1 && lines > 1 ? '75%' : width || '100%',
            }}
            role="presentation"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div
        className={`${baseClass} rounded-full ${className}`}
        style={{
          width: width || '40px',
          height: height || '40px',
          ...getStyle(),
        }}
        role="presentation"
        aria-hidden="true"
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`} style={getStyle()}>
        <div className="flex items-center gap-3 mb-4">
          <Skeleton variant="circular" width={40} height={40} animate={shouldAnimate} />
          <div className="flex-1">
            <Skeleton variant="text" width="60%" animate={shouldAnimate} />
            <Skeleton variant="text" width="40%" animate={shouldAnimate} className="mt-2" />
          </div>
        </div>
        <Skeleton variant="text" lines={3} animate={shouldAnimate} />
      </div>
    );
  }

  // rectangular
  return (
    <div
      className={`${baseClass} rounded ${className}`}
      style={{
        width: width || '100%',
        height: height || '100px',
        ...getStyle(),
      }}
      role="presentation"
      aria-hidden="true"
    />
  );
}

// Preset skeleton components
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return <Skeleton variant="text" lines={lines} className={className} />;
}

export function SkeletonAvatar({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <Skeleton variant="circular" width={size} height={size} className={className} />;
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return <Skeleton variant="card" className={className} />;
}

export function SkeletonButton({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const heights = { sm: 32, md: 40, lg: 48 };
  return <Skeleton variant="rectangular" width={100} height={heights[size]} className={`rounded-lg ${className}`} />;
}

export default Skeleton;


/**
 * PanelSkeleton - Loading skeleton for lazy-loaded panels
 * Simulates the structure of GiveawayHub/JudgePanel
 * @requirements 7.3 - Show loading skeleton while components load
 */
export function PanelSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 space-y-4 ${className}`} role="status" aria-label="Cargando panel...">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-2">
            <Skeleton variant="text" width={150} />
            <Skeleton variant="text" width={100} />
          </div>
        </div>
        <Skeleton variant="rectangular" width={80} height={32} className="rounded-lg" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b border-zinc-700 pb-2">
        <Skeleton variant="rectangular" width={80} height={32} className="rounded-lg" />
        <Skeleton variant="rectangular" width={80} height={32} className="rounded-lg" />
        <Skeleton variant="rectangular" width={80} height={32} className="rounded-lg" />
      </div>

      {/* Collapsible sections skeleton */}
      <div className="space-y-3">
        {/* Section 1 */}
        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" width={120} />
            <Skeleton variant="circular" width={24} height={24} />
          </div>
          <Skeleton variant="rectangular" height={40} className="rounded-lg" />
          <Skeleton variant="rectangular" height={40} className="rounded-lg" />
        </div>

        {/* Section 2 */}
        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" width={100} />
            <Skeleton variant="circular" width={24} height={24} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton variant="rectangular" height={36} className="rounded-lg" />
            <Skeleton variant="rectangular" height={36} className="rounded-lg" />
          </div>
        </div>

        {/* Section 3 */}
        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" width={140} />
            <Skeleton variant="circular" width={24} height={24} />
          </div>
          <Skeleton variant="rectangular" height={80} className="rounded-lg" />
        </div>
      </div>

      {/* Action button skeleton */}
      <Skeleton variant="rectangular" height={48} className="rounded-xl" />
      
      <span className="sr-only">Cargando panel...</span>
    </div>
  );
}

/**
 * GiveawayHubSkeleton - Specific skeleton for GiveawayHub
 * @requirements 7.3 - Show loading skeleton while components load
 */
export function GiveawayHubSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 space-y-4 ${className}`} role="status" aria-label="Cargando sorteos...">
      {/* Header with title and view mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={36} height={36} />
          <Skeleton variant="text" width={120} />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="rectangular" width={100} height={32} className="rounded-lg" />
          <Skeleton variant="rectangular" width={80} height={32} className="rounded-lg" />
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={100} height={36} className="rounded-lg" />
        <Skeleton variant="rectangular" width={100} height={36} className="rounded-lg" />
        <Skeleton variant="rectangular" width={100} height={36} className="rounded-lg" />
      </div>

      {/* Configuration section */}
      <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
        <Skeleton variant="text" width={140} />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton variant="rectangular" height={40} className="rounded-lg" />
          <Skeleton variant="rectangular" height={40} className="rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="rectangular" width={40} height={20} className="rounded-full" />
          <Skeleton variant="text" width={80} />
        </div>
      </div>

      {/* Participants section */}
      <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={100} />
          <Skeleton variant="rectangular" width={32} height={24} className="rounded-full" />
        </div>
        <Skeleton variant="rectangular" height={100} className="rounded-lg" />
      </div>

      {/* Action button */}
      <Skeleton variant="rectangular" height={48} className="rounded-xl" />
      
      <span className="sr-only">Cargando sorteos...</span>
    </div>
  );
}

/**
 * JudgePanelSkeleton - Specific skeleton for JudgePanel
 * @requirements 7.3 - Show loading skeleton while components load
 */
export function JudgePanelSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 space-y-4 ${className}`} role="status" aria-label="Cargando panel de jueces...">
      {/* Header with title and view mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={36} height={36} />
          <Skeleton variant="text" width={140} />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="rectangular" width={100} height={32} className="rounded-lg" />
          <Skeleton variant="rectangular" width={80} height={32} className="rounded-lg" />
        </div>
      </div>

      {/* Wizard steps */}
      <div className="flex items-center justify-between px-4">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center gap-2">
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="text" width={60} className="hidden sm:block" />
          </div>
        ))}
      </div>

      {/* Criteria section */}
      <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={120} />
          <Skeleton variant="rectangular" width={32} height={24} className="rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton variant="rectangular" height={40} className="rounded-lg" />
          <Skeleton variant="rectangular" height={40} className="rounded-lg" />
        </div>
      </div>

      {/* Contestants section */}
      <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={100} />
          <Skeleton variant="rectangular" width={32} height={24} className="rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton variant="rectangular" height={60} className="rounded-lg" />
          <Skeleton variant="rectangular" height={60} className="rounded-lg" />
        </div>
      </div>

      {/* Judges section */}
      <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={80} />
          <Skeleton variant="rectangular" width={32} height={24} className="rounded-full" />
        </div>
        <Skeleton variant="rectangular" height={40} className="rounded-lg" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Skeleton variant="rectangular" height={44} className="flex-1 rounded-xl" />
        <Skeleton variant="rectangular" height={44} className="flex-1 rounded-xl" />
      </div>
      
      <span className="sr-only">Cargando panel de jueces...</span>
    </div>
  );
}
