# Requirements: App Móvil Companion

## Overview
Aplicación móvil para moderadores que permite controlar funciones básicas de TwitchVote Live desde el teléfono.

## Functional Requirements

### 1. Autenticación y Conexión
- 1.1 Escanear QR code para conectar con sesión activa
- 1.2 Código de emparejamiento manual
- 1.3 Recordar dispositivos conectados
- 1.4 Múltiples dispositivos simultáneos
- 1.5 Desconexión remota de dispositivos

### 2. Control de Polls
- 2.1 Ver poll activo en tiempo real
- 2.2 Crear nuevo poll rápido
- 2.3 Cerrar/finalizar poll
- 2.4 Ver resultados en vivo
- 2.5 Historial de polls recientes

### 3. Control de Predictions
- 3.1 Ver prediction activa
- 3.2 Crear nueva prediction
- 3.3 Resolver prediction (seleccionar ganador)
- 3.4 Cancelar/reembolsar prediction
- 3.5 Ver estadísticas de apuestas

### 4. Control de Giveaways
- 4.1 Ver giveaway activo
- 4.2 Iniciar sorteo
- 4.3 Seleccionar ganador
- 4.4 Re-roll ganador
- 4.5 Ver participantes

### 5. Control de Timers
- 5.1 Ver timers activos
- 5.2 Iniciar/pausar/resetear timer
- 5.3 Crear timer rápido
- 5.4 Countdown presets

### 6. Notificaciones Push
- 6.1 Alertas de eventos importantes
- 6.2 Notificación cuando poll/prediction termina
- 6.3 Alertas de chat (menciones, keywords)
- 6.4 Configurar qué notificaciones recibir

### 7. Chat de Moderadores
- 7.1 Ver chat interno de mods
- 7.2 Enviar mensajes
- 7.3 Menciones con notificación
- 7.4 Historial de mensajes

### 8. Vista Rápida de Métricas
- 8.1 Viewers actuales
- 8.2 Participación en actividades
- 8.3 Gráfico simple de engagement
- 8.4 Alertas de métricas

## Non-Functional Requirements

### Plataformas
- React Native o PWA
- iOS 14+ y Android 10+
- Modo offline básico

### Performance
- Tiempo de carga < 2 segundos
- Sincronización en tiempo real < 200ms
- Bajo consumo de batería

### Seguridad
- Conexión encriptada (WSS)
- Autenticación por sesión
- Timeout de inactividad

### UX
- Interfaz táctil optimizada
- Modo oscuro/claro
- Gestos intuitivos

## Out of Scope
- Funcionalidad completa de la app desktop
- Edición de configuraciones avanzadas
- Gestión de OBS desde móvil
- Streaming desde móvil
