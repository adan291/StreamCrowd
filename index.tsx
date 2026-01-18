
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import App from './App';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './context';
import { store, persistor } from './src/application/state/store';

// Handle OAuth callback BEFORE rendering React
// Check if URL has access_token in fragment (regardless of path)
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const accessToken = hashParams.get('access_token');
const oauthError = hashParams.get('error');
const state = hashParams.get('state');

if ((accessToken || oauthError) && window.opener) {
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
  
  // Don't render React app in popup
  throw new Error('OAuth callback handled - stopping React render');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider>
          <I18nProvider>
            <App />
          </I18nProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
