import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
  animate?: boolean;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
  animate = true,
}: SkeletonProps) {
  const baseClass = `bg-gray-800 ${animate ? 'animate-pulse' : ''}`;

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
      <div className={`${baseClass} rounded-lg p-4 ${className}`} style={getStyle()}>
        <div className="flex items-center gap-3 mb-4">
          <Skeleton variant="circular" width={40} height={40} animate={false} />
          <div className="flex-1">
            <Skeleton variant="text" width="60%" animate={false} />
            <Skeleton variant="text" width="40%" animate={false} className="mt-2" />
          </div>
        </div>
        <Skeleton variant="text" lines={3} animate={false} />
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
