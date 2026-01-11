import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import { StreamlabsConfig } from './StreamlabsConfig';
import { StreamElementsConfig } from './StreamElementsConfig';
import { IntegrationEventLog } from './IntegrationEventLog';
import { EventMappingEditor } from './EventMappingEditor';

type TabId = 'streamlabs' | 'streamelements' | 'events' | 'mappings';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

export function IntegrationsPanel() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('streamlabs');

  const tabs: Tab[] = [
    { id: 'streamlabs', label: 'Streamlabs', icon: '🎬' },
    { id: 'streamelements', label: 'StreamElements', icon: '⚡' },
    { id: 'events', label: 'Eventos', icon: '📋' },
    { id: 'mappings', label: 'Acciones', icon: '🔗' },
  ];

  return (
    <div className="integrations-panel">
      <div className="integrations-header">
        <h2>Integraciones Externas</h2>
        <p className="integrations-description">
          Conecta con Streamlabs y StreamElements para recibir eventos en tiempo real
        </p>
      </div>

      <div className="integrations-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="integrations-content">
        {activeTab === 'streamlabs' && <StreamlabsConfig />}
        {activeTab === 'streamelements' && <StreamElementsConfig />}
        {activeTab === 'events' && <IntegrationEventLog />}
        {activeTab === 'mappings' && <EventMappingEditor />}
      </div>

      <style>{`
        .integrations-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          height: 100%;
        }

        .integrations-header h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
        }

        .integrations-description {
          color: var(--text-secondary, #888);
          font-size: 0.875rem;
          margin: 0;
        }

        .integrations-tabs {
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid var(--border-color, #333);
          padding-bottom: 0.5rem;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: transparent;
          border: none;
          border-radius: 0.5rem;
          color: var(--text-secondary, #888);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-button:hover {
          background: var(--bg-hover, #2a2a2a);
          color: var(--text-primary, #fff);
        }

        .tab-button.active {
          background: var(--primary-color, #6366f1);
          color: white;
        }

        .tab-icon {
          font-size: 1rem;
        }

        .tab-label {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .integrations-content {
          flex: 1;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
