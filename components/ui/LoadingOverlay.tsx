import React from 'react';
import { Spinner } from './Spinner';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  blur?: boolean;
  fullScreen?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function LoadingOverlay({
  isLoading,
  message = 'Cargando...',
  blur = true,
  fullScreen = false,
  children,
  className = '',
}: LoadingOverlayProps) {
  if (!isLoading && children) {
    return <>{children}</>;
  }

  if (!isLoading) {
    return null;
  }

  const overlayClass = fullScreen
    ? 'fixed inset-0 z-50'
    : 'absolute inset-0 z-10';

  const bgClass = blur
    ? 'bg-gray-950/80 backdrop-blur-sm'
    : 'bg-gray-950/90';

  return (
    <div className={`relative ${className}`}>
      {children}
      <div
        className={`${overlayClass} ${bgClass} flex flex-col items-center justify-center`}
        role="alert"
        aria-busy="true"
        aria-live="polite"
      >
        <Spinner size="lg" color="primary" />
        {message && (
          <p className="mt-4 text-gray-300 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}

// Inline loading state
export function InlineLoading({
  message = 'Cargando...',
  className = '',
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-gray-400 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Spinner size="sm" color="gray" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

// Button loading state wrapper
export function ButtonLoading({
  isLoading,
  loadingText = 'Procesando...',
  children,
}: {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <span className="flex items-center gap-2">
        <Spinner size="sm" color="current" />
        <span>{loadingText}</span>
      </span>
    );
  }
  return <>{children}</>;
}

// Skeleton wrapper for async content
export function AsyncContent({
  isLoading,
  skeleton,
  children,
  error,
  errorMessage = 'Error al cargar',
}: {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  error?: boolean;
  errorMessage?: string;
}) {
  if (error) {
    return (
      <div className="flex items-center justify-center p-4 text-red-400">
        <span>⚠️ {errorMessage}</span>
      </div>
    );
  }

  if (isLoading) {
    return <>{skeleton}</>;
  }

  return <>{children}</>;
}

export default LoadingOverlay;
