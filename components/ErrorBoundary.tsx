import React from 'react';

/**
 * ErrorBoundary - catches render errors so one broken panel or overlay does
 * not blank the whole page (or the OBS browser source).
 *
 * - Chunk load errors (stale deploy: lazy chunk no longer exists) trigger one
 *   automatic page reload, guarded in sessionStorage to avoid reload loops.
 * - variant "overlay": renders nothing visible (keeps the OBS source
 *   transparent) and retries automatically every `autoRetryMs`.
 * - variant "panel" / "app": shows a message with a retry button.
 */

type Variant = 'app' | 'panel' | 'overlay';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  variant?: Variant;
  /** Name shown in the message and in the console */
  name?: string;
  /** Overlay variant only: retry interval in ms (default 5000) */
  autoRetryMs?: number;
  /** Changing this value resets the boundary (e.g. the active tab) */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
  attempt: number;
}

const CHUNK_RELOAD_KEY = 'streamcrowd_chunk_reload_at';

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);
}

/** Reloads once per minute at most; returns true if a reload was triggered */
function reloadForChunkError(): boolean {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable: still reload once
  }
  window.location.reload();
  return true;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, attempt: 0 };
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, info.componentStack);

    if (isChunkLoadError(error) && reloadForChunkError()) return;

    if (this.props.variant === 'overlay') {
      this.scheduleRetry();
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.reset();
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private scheduleRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.reset(), this.props.autoRetryMs ?? 5000);
  }

  private reset = (): void => {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    // Changing `attempt` remounts the children (see key below)
    this.setState(s => ({ error: null, attempt: s.attempt + 1 }));
  };

  render(): React.ReactNode {
    const { error, attempt } = this.state;
    const { variant = 'panel', name, children } = this.props;

    if (!error) {
      return <React.Fragment key={attempt}>{children}</React.Fragment>;
    }

    if (variant === 'overlay') {
      // Keep the OBS source transparent while retrying
      return null;
    }

    const isApp = variant === 'app';
    return (
      <div
        role="alert"
        className={`${isApp ? 'min-h-screen' : 'h-full min-h-[200px]'} flex items-center justify-center p-6 text-center`}
      >
        <div className="max-w-md space-y-3">
          <p className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            {name ? `Algo ha fallado en ${name}` : 'Algo ha fallado'}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 break-words">{error.message}</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="px-4 py-2 rounded-lg bg-twitch-brand text-white text-sm font-medium hover:opacity-90"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 text-sm font-medium hover:opacity-90"
            >
              Recargar página
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
