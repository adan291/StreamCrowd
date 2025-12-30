/**
 * Plugin de Ejemplo para TwitchVote
 * 
 * Este plugin demuestra cómo usar las APIs disponibles:
 * - Eventos
 * - Storage
 * - Configuración
 * - Notificaciones
 * - Logging
 */
(function() {
  'use strict';
  
  // Obtener configuración inicial
  const config = pluginAPI.getConfig();
  const manifest = pluginAPI.getManifest();
  
  // Log de inicio
  pluginAPI.log('info', `${manifest.name} v${manifest.version} iniciado`);
  pluginAPI.log('debug', 'Configuración:', config);
  
  // ============================================
  // Inicialización
  // ============================================
  
  async function init() {
    // Cargar historial desde storage
    const history = await pluginAPI.storage.get('pollHistory') || [];
    pluginAPI.log('info', `Historial cargado: ${history.length} encuestas`);
    
    // Mostrar notificación de inicio si está habilitado
    if (config.showNotifications) {
      pluginAPI.ui.showToast('Plugin de ejemplo activado', {
        type: 'success',
        duration: 2000
      });
    }
  }
  
  // ============================================
  // Event Handlers
  // ============================================
  
  // Escuchar creación de encuestas
  pluginAPI.events.on('poll:created', async (poll) => {
    pluginAPI.log('info', `Nueva encuesta detectada: ${poll.title}`);
    
    // Guardar en historial
    await savePollToHistory(poll);
    
    // Mostrar notificación
    if (config.showNotifications) {
      pluginAPI.ui.showToast(`Nueva encuesta: ${poll.title}`, {
        type: 'info',
        duration: 3000
      });
    }
  });
  
  // Escuchar fin de encuestas
  pluginAPI.events.on('poll:ended', async (poll) => {
    pluginAPI.log('info', `Encuesta finalizada: ${poll.title}`);
    
    // Actualizar historial con resultados
    await updatePollInHistory(poll.id, { ended: true, results: poll.results });
  });
  
  // Escuchar cambios de configuración
  pluginAPI.events.on('config:changed', (newConfig) => {
    pluginAPI.log('info', 'Configuración actualizada');
    Object.assign(config, newConfig);
  });
  
  // ============================================
  // Storage Functions
  // ============================================
  
  async function savePollToHistory(poll) {
    try {
      let history = await pluginAPI.storage.get('pollHistory') || [];
      
      // Añadir nueva encuesta
      history.unshift({
        id: poll.id,
        title: poll.title,
        createdAt: Date.now(),
        ended: false
      });
      
      // Limitar tamaño del historial
      if (history.length > config.maxHistory) {
        history = history.slice(0, config.maxHistory);
      }
      
      await pluginAPI.storage.set('pollHistory', history);
      pluginAPI.log('debug', `Historial actualizado: ${history.length} encuestas`);
    } catch (error) {
      pluginAPI.log('error', 'Error guardando en historial', { error: error.message });
    }
  }
  
  async function updatePollInHistory(pollId, updates) {
    try {
      const history = await pluginAPI.storage.get('pollHistory') || [];
      const index = history.findIndex(p => p.id === pollId);
      
      if (index !== -1) {
        history[index] = { ...history[index], ...updates };
        await pluginAPI.storage.set('pollHistory', history);
      }
    } catch (error) {
      pluginAPI.log('error', 'Error actualizando historial', { error: error.message });
    }
  }
  
  // ============================================
  // Public API (para otros plugins)
  // ============================================
  
  // Emitir evento personalizado con estadísticas
  async function emitStats() {
    const history = await pluginAPI.storage.get('pollHistory') || [];
    const stats = {
      totalPolls: history.length,
      endedPolls: history.filter(p => p.ended).length,
      activePolls: history.filter(p => !p.ended).length
    };
    
    pluginAPI.events.emit('example:stats', stats);
    return stats;
  }
  
  // ============================================
  // Iniciar
  // ============================================
  
  init().catch(error => {
    pluginAPI.log('error', 'Error en inicialización', { error: error.message });
  });
  
  // Exponer funciones para debugging (opcional)
  if (typeof window !== 'undefined') {
    window.__examplePlugin = {
      emitStats,
      getConfig: () => config
    };
  }
})();
