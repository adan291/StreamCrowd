
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './context';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getCurrentOverlayType } from './config/overlayRegistry';

// OBS overlays and the dashboard are separate chunks: an overlay URL never
// downloads the dashboard (App.tsx and everything it imports).
const overlayType = getCurrentOverlayType();
const App = lazy(() => import('./App'));
const OverlayRouter = lazy(() => import('./components/OverlayRouter'));

/** Shown while the dashboard chunk downloads. data-app-loading is used by the E2E fixture. */
const AppLoading: React.FC = () => (
  <div
    data-app-loading=""
    role="status"
    aria-label="Cargando StreamCrowd"
    className="min-h-screen flex items-center justify-center bg-slate-200 dark:bg-black"
  >
    <div className="w-10 h-10 rounded-full border-4 border-twitch-brand border-t-transparent animate-spin" />
  </div>
);

// Handle OAuth callback BEFORE rendering React
// Check if URL has access_token in fragment (regardless of path)
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const accessToken = hashParams.get('access_token');
const oauthError = hashParams.get('error');
const state = hashParams.get('state');

const isOAuthPopupCallback = Boolean((accessToken || oauthError) && window.opener);

if (isOAuthPopupCallback) {
  // This is an OAuth callback in a popup
  if (accessToken) {
    window.opener.postMessage({
      type: 'twitch_oauth_callback',
      accessToken,
      state,
    }, window.location.origin);
  } else {
    window.opener.postMessage({
      type: 'twitch_oauth_callback',
      error: oauthError || 'unknown_error',
      errorDescription: hashParams.get('error_description') || 'Authentication failed',
      state,
    }, window.location.origin);
  }
  
  // Close popup immediately
  window.close();
  
  // Fallback: if window.close() doesn't work (some browsers block it), show a message
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#18181b;color:white;font-family:system-ui,sans-serif;text-align:center;padding:20px;">
      <div style="width:40px;height:40px;border:3px solid #9146ff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:16px;"></div>
      <p style="margin:0;font-size:14px;">Autenticación completada</p>
      <p style="margin:8px 0 0;font-size:12px;opacity:0.7;">Puedes cerrar esta ventana</p>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>
  `;
  
  // Don't render the React app in the popup (no throw: avoids a fake uncaught error)
} else {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary variant="app">
        <ThemeProvider>
          <I18nProvider>
            {/* Overlays stay transparent while loading (OBS); the dashboard shows a spinner */}
            <Suspense fallback={overlayType ? null : <AppLoading />}>
              {overlayType ? <OverlayRouter type={overlayType} /> : <App />}
            </Suspense>
          </I18nProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
