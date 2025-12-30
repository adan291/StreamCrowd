import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useMobileSync } from './hooks/useMobileSync';
import { getNotificationService } from './services/NotificationService';
import { PairingScreen } from './screens/PairingScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { PollsScreen } from './screens/PollsScreen';
import { PredictionsScreen } from './screens/PredictionsScreen';
import { GiveawaysScreen } from './screens/GiveawaysScreen';
import { TimersScreen } from './screens/TimersScreen';
import { ChatScreen } from './screens/ChatScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type { MobileScreen, MobileTab, PairingData, DesktopMessage } from '../types/mobile';

/**
 * Mobile App Entry Point
 * @requirements Mobile Companion - Main app with navigation
 */

import '../index.css';

const App: React.FC = () => {
  const {
    status,
    isConnected,
    error,
    state,
    connect,
    disconnect,
    sendAction,
  } = useMobileSync();

  const [currentScreen, setCurrentScreen] = useState<MobileScreen>('pairing');
  const [currentTab, setCurrentTab] = useState<MobileTab>('dashboard');
  const notificationService = getNotificationService();

  // Initialize notifications
  useEffect(() => {
    notificationService.initialize();
  }, []);

  // Handle pairing
  const handlePair = useCallback(async (pairingData: PairingData) => {
    await connect(pairingData);
  }, [connect]);

  // Navigate based on connection status
  useEffect(() => {
    if (isConnected && currentScreen === 'pairing') {
      setCurrentScreen('dashboard');
    } else if (!isConnected && status === 'disconnected' && currentScreen !== 'pairing') {
      setCurrentScreen('pairing');
    }
  }, [isConnected, status, currentScreen]);

  // Handle tab navigation
  const handleTabChange = (tab: MobileTab) => {
    setCurrentTab(tab);
    if (tab === 'dashboard') setCurrentScreen('dashboard');
    else if (tab === 'chat') setCurrentScreen('chat');
    else if (tab === 'settings') setCurrentScreen('settings');
  };

  // Handle activity screen navigation
  const handleActivityScreen = (screen: MobileScreen) => {
    setCurrentScreen(screen);
    setCurrentTab('activities');
  };

  // Handle back navigation
  const handleBack = () => {
    if (['polls', 'predictions', 'giveaways', 'timers'].includes(currentScreen)) {
      setCurrentScreen('dashboard');
      setCurrentTab('dashboard');
    }
  };

  // Render current screen
  const renderScreen = () => {
    if (currentScreen === 'pairing' || !isConnected) {
      return (
        <PairingScreen
          onPair={handlePair}
          status={status}
          error={error}
        />
      );
    }

    if (!state) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Cargando estado...</p>
          </div>
        </div>
      );
    }

    switch (currentScreen) {
      case 'dashboard':
        return (
          <DashboardScreen
            state={state}
            onNavigate={handleActivityScreen}
            onAction={sendAction}
          />
        );
      case 'polls':
        return (
          <PollsScreen
            state={state}
            onAction={sendAction}
            onBack={handleBack}
          />
        );
      case 'predictions':
        return (
          <PredictionsScreen
            state={state}
            onAction={sendAction}
            onBack={handleBack}
          />
        );
      case 'giveaways':
        return (
          <GiveawaysScreen
            state={state}
            onAction={sendAction}
            onBack={handleBack}
          />
        );
      case 'timers':
        return (
          <TimersScreen
            state={state}
            onAction={sendAction}
            onBack={handleBack}
          />
        );
      case 'chat':
        return (
          <ChatScreen
            state={state}
            onAction={sendAction}
            onBack={() => {
              setCurrentScreen('dashboard');
              setCurrentTab('dashboard');
            }}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            status={status}
            onDisconnect={disconnect}
            onBack={() => {
              setCurrentScreen('dashboard');
              setCurrentTab('dashboard');
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {renderScreen()}
      
      {/* Bottom Navigation - only show when connected */}
      {isConnected && state && !['pairing'].includes(currentScreen) && (
        <BottomNavigation
          currentTab={currentTab}
          onTabChange={handleTabChange}
          hasActivePoll={!!state.poll}
          hasActivePrediction={!!state.prediction}
        />
      )}
    </div>
  );
};

interface BottomNavigationProps {
  currentTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  hasActivePoll: boolean;
  hasActivePrediction: boolean;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange,
  hasActivePoll,
  hasActivePrediction,
}) => {
  const tabs: { id: MobileTab; label: string; icon: string; badge?: boolean }[] = [
    { id: 'dashboard', label: 'Inicio', icon: '🏠' },
    { id: 'activities', label: 'Actividades', icon: '📊', badge: hasActivePoll || hasActivePrediction },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'settings', label: 'Ajustes', icon: '⚙️' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 safe-area-bottom">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-3 flex flex-col items-center gap-1 relative ${
              currentTab === tab.id ? 'text-purple-400' : 'text-zinc-500'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs">{tab.label}</span>
            {tab.badge && (
              <span className="absolute top-2 right-1/4 w-2 h-2 bg-purple-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

// Mount app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('SW registered:', registration.scope);
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}

export default App;
