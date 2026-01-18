/**
 * Example Component demonstrating the new lazy loading i18n system
 * 
 * This component shows how to:
 * 1. Use core translations (always available)
 * 2. Load feature modules on demand
 * 3. Handle loading states
 * 4. Switch locales
 */

import React, { useState } from 'react';
import { useI18n, useTranslationModule } from './context';
import type { LazyTranslationModule } from './types';

export const I18nExampleComponent: React.FC = () => {
  const { t, locale, setLocale, isLoading } = useI18n();
  const [selectedModule, setSelectedModule] = useState<LazyTranslationModule>('poll');
  
  // Load the selected module
  const { isLoaded, isLoading: moduleLoading, error } = useTranslationModule(selectedModule);

  const handleModuleChange = (module: LazyTranslationModule) => {
    setSelectedModule(module);
  };

  const handleLocaleChange = () => {
    setLocale(locale === 'es' ? 'en' : 'es');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>i18n Lazy Loading Demo</h1>
      
      {/* Core translations - always available */}
      <section>
        <h2>Core Translations (Always Available)</h2>
        <p><strong>Loading:</strong> {t.common.loading}</p>
        <p><strong>Save:</strong> {t.common.save}</p>
        <p><strong>Cancel:</strong> {t.common.cancel}</p>
        <p><strong>Current Language:</strong> {t.common.language} ({locale})</p>
        <button onClick={handleLocaleChange}>
          Switch to {locale === 'es' ? 'English' : 'Español'}
        </button>
      </section>

      {/* Module selector */}
      <section style={{ marginTop: '20px' }}>
        <h2>Feature Module Selector</h2>
        <select 
          value={selectedModule} 
          onChange={(e) => handleModuleChange(e.target.value as LazyTranslationModule)}
        >
          <option value="poll">Poll</option>
          <option value="games">Games</option>
          <option value="giveaway">Giveaway</option>
          <option value="macros">Macros</option>
          <option value="commands">Commands</option>
          <option value="predictions">Predictions</option>
          <option value="rewards">Rewards</option>
          <option value="moderation">Moderation</option>
          <option value="analytics">Analytics</option>
          <option value="overlay">Overlay</option>
          <option value="platforms">Platforms</option>
          <option value="misc">Miscellaneous</option>
        </select>
      </section>

      {/* Module content */}
      <section style={{ marginTop: '20px' }}>
        <h2>Module Content: {selectedModule}</h2>
        
        {moduleLoading && (
          <div style={{ color: 'blue' }}>
            {t.common.loading} {selectedModule} module...
          </div>
        )}
        
        {error && (
          <div style={{ color: 'red' }}>
            Error loading module: {error.message}
          </div>
        )}
        
        {isLoaded && !moduleLoading && !error && (
          <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
            {selectedModule === 'poll' && (
              <div>
                <p><strong>Title:</strong> {t.poll?.title}</p>
                <p><strong>Create:</strong> {t.poll?.create}</p>
                <p><strong>Question:</strong> {t.poll?.question}</p>
              </div>
            )}
            
            {selectedModule === 'games' && (
              <div>
                <p><strong>Title:</strong> {t.games?.title}</p>
                <p><strong>Subtitle:</strong> {t.games?.subtitle}</p>
                <p><strong>Active:</strong> {t.games?.active}</p>
              </div>
            )}
            
            {selectedModule === 'giveaway' && (
              <div>
                <p><strong>Title:</strong> {t.giveaway?.title}</p>
                <p><strong>Subtitle:</strong> {t.giveaway?.subtitle}</p>
                <p><strong>Winner:</strong> {t.giveaway?.winner}</p>
              </div>
            )}
            
            {/* Add more module examples as needed */}
            {!['poll', 'games', 'giveaway'].includes(selectedModule) && (
              <div>
                <p>Module "{selectedModule}" loaded successfully!</p>
                <p>Check the browser console to see the loaded translations.</p>
                <button onClick={() => console.log(`${selectedModule} translations:`, t[selectedModule])}>
                  Log {selectedModule} translations
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Loading indicator */}
      {isLoading && (
        <div style={{ 
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          backgroundColor: 'yellow', 
          padding: '5px 10px',
          borderRadius: '4px'
        }}>
          System Loading...
        </div>
      )}
    </div>
  );
};

export default I18nExampleComponent;