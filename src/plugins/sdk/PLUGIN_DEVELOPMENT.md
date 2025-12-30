# Guía de Desarrollo de Plugins para TwitchVote

## Introducción

Los plugins permiten extender la funcionalidad de TwitchVote. Esta guía te ayudará a crear tu primer plugin.

## Estructura de un Plugin

Un plugin consiste en:

1. **manifest.json** - Metadatos y configuración del plugin
2. **index.js** - Código principal del plugin

### Manifest (manifest.json)

```json
{
  "id": "mi-plugin",
  "name": "Mi Plugin",
  "version": "1.0.0",
  "description": "Descripción de mi plugin",
  "author": "Tu Nombre",
  "minAppVersion": "1.0.0",
  "permissions": ["storage", "polls:read"],
  "main": "index.js",
  "icon": "icon.png",
  "homepage": "https://github.com/tu-usuario/mi-plugin",
  "configSchema": {
    "type": "object",
    "properties": {
      "enabled": {
        "type": "boolean",
        "title": "Habilitado",
        "default": true
      }
    }
  },
  "defaultConfig": {
    "enabled": true
  }
}
```

### Permisos Disponibles

| Permiso | Descripción |
|---------|-------------|
| `storage` | Almacenamiento local del plugin |
| `polls:read` | Leer encuestas |
| `polls:write` | Crear/modificar encuestas |
| `predictions:read` | Leer predicciones |
| `predictions:write` | Crear/modificar predicciones |
| `giveaways:read` | Leer sorteos |
| `giveaways:write` | Crear/modificar sorteos |
| `timers:read` | Leer timers |
| `timers:write` | Crear/modificar timers |
| `obs:read` | Leer estado de OBS |
| `obs:write` | Controlar OBS |
| `commands` | Registrar comandos de chat |
| `ui:panel` | Crear paneles en la UI |
| `ui:overlay` | Crear overlays |
| `ui:toolbar` | Añadir botones a la toolbar |
| `notifications` | Enviar notificaciones |

## API del Plugin

Dentro del sandbox, tu plugin tiene acceso a la variable global `pluginAPI`:

### Eventos

```javascript
// Suscribirse a eventos
pluginAPI.events.on('poll:created', (poll) => {
  console.log('Nueva encuesta:', poll.title);
});

// Suscripción única
pluginAPI.events.once('poll:ended', (poll) => {
  console.log('Encuesta finalizada:', poll.id);
});

// Cancelar suscripción
const unsubscribe = pluginAPI.events.on('poll:voted', handler);
unsubscribe(); // Cancela la suscripción

// Emitir eventos personalizados
pluginAPI.events.emit('mi-evento', { data: 'valor' });
```

### Eventos Disponibles

- `poll:created`, `poll:started`, `poll:ended`, `poll:voted`
- `prediction:created`, `prediction:locked`, `prediction:resolved`
- `giveaway:started`, `giveaway:ended`, `giveaway:winner`
- `timer:started`, `timer:paused`, `timer:ended`
- `obs:connected`, `obs:disconnected`, `obs:scene-changed`
- `app:ready`, `app:shutdown`

### Storage

```javascript
// Guardar datos
await pluginAPI.storage.set('clave', { valor: 123 });

// Leer datos
const data = await pluginAPI.storage.get('clave');

// Eliminar
await pluginAPI.storage.remove('clave');

// Limpiar todo
await pluginAPI.storage.clear();

// Listar claves
const keys = await pluginAPI.storage.keys();
```

### Encuestas (requiere `polls:read` o `polls:write`)

```javascript
// Leer encuestas
const polls = await pluginAPI.polls.list();
const poll = await pluginAPI.polls.get('poll-id');
const results = await pluginAPI.polls.getResults('poll-id');

// Crear encuesta (requiere polls:write)
const newPoll = await pluginAPI.polls.create({
  title: 'Mi Encuesta',
  options: ['Opción 1', 'Opción 2'],
  duration: 60
});

// Controlar encuesta
await pluginAPI.polls.start('poll-id');
await pluginAPI.polls.stop('poll-id');
```

### UI

```javascript
// Registrar un panel
const panelId = pluginAPI.ui.registerPanel({
  id: 'mi-panel',
  title: 'Mi Panel',
  icon: '🎮',
  position: 'right',
  render: (container) => {
    container.innerHTML = '<h1>Hola desde mi plugin!</h1>';
  }
});

// Mostrar toast
pluginAPI.ui.showToast('Mensaje de éxito', { type: 'success' });

// Mostrar modal
const result = await pluginAPI.ui.showModal({
  title: 'Confirmar',
  content: '¿Estás seguro?',
  buttons: [
    { label: 'Cancelar', value: false },
    { label: 'Aceptar', value: true, primary: true }
  ]
});
```

### Comandos (requiere `commands`)

```javascript
// Registrar comando
pluginAPI.commands.register({
  name: '!micomando',
  description: 'Mi comando personalizado',
  usage: '!micomando [argumento]',
  handler: (context) => {
    console.log(`Usuario: ${context.user}`);
    console.log(`Argumentos: ${context.args.join(' ')}`);
  }
});
```

### Configuración

```javascript
// Leer configuración
const config = pluginAPI.getConfig();
console.log(config.enabled);

// Actualizar configuración
await pluginAPI.setConfig({ enabled: false });

// Leer manifest
const manifest = pluginAPI.getManifest();
```

### Logging

```javascript
pluginAPI.log('info', 'Mensaje informativo');
pluginAPI.log('warn', 'Advertencia');
pluginAPI.log('error', 'Error', { detalles: 'más info' });
pluginAPI.log('debug', 'Debug info');
```

## Ejemplo Completo

```javascript
// index.js
(function() {
  'use strict';
  
  const config = pluginAPI.getConfig();
  
  // Inicialización
  pluginAPI.log('info', 'Plugin iniciado');
  
  // Suscribirse a eventos
  pluginAPI.events.on('poll:created', async (poll) => {
    if (!config.enabled) return;
    
    pluginAPI.log('info', `Nueva encuesta: ${poll.title}`);
    
    // Guardar en storage
    const count = (await pluginAPI.storage.get('pollCount')) || 0;
    await pluginAPI.storage.set('pollCount', count + 1);
    
    // Mostrar notificación
    pluginAPI.ui.showToast(`Encuesta #${count + 1} creada!`, {
      type: 'info',
      duration: 3000
    });
  });
  
  // Registrar comando
  if (pluginAPI.getManifest().permissions.includes('commands')) {
    pluginAPI.commands.register({
      name: '!stats',
      description: 'Muestra estadísticas del plugin',
      handler: async (ctx) => {
        const count = (await pluginAPI.storage.get('pollCount')) || 0;
        pluginAPI.log('info', `Stats solicitadas por ${ctx.user}: ${count} encuestas`);
      }
    });
  }
})();
```

## Empaquetado

Para distribuir tu plugin, crea un archivo ZIP con:

```
mi-plugin.zip
├── manifest.json
├── index.js
└── icon.png (opcional)
```

## Buenas Prácticas

1. **Manejo de errores**: Siempre usa try/catch para operaciones async
2. **Permisos mínimos**: Solo solicita los permisos que necesitas
3. **Limpieza**: Cancela suscripciones cuando ya no las necesites
4. **Logging**: Usa `pluginAPI.log()` para debugging
5. **Configuración**: Proporciona valores por defecto sensatos
6. **Documentación**: Incluye un README con instrucciones

## Debugging

Los logs de tu plugin aparecen en la sección "Logs" del gestor de plugins. Usa diferentes niveles de log para facilitar el debugging:

- `debug`: Información detallada para desarrollo
- `info`: Información general
- `warn`: Advertencias
- `error`: Errores

## Soporte

Si tienes preguntas o problemas, abre un issue en el repositorio de TwitchVote.
