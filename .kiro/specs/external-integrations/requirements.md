# Requirements: Integraciones Externas (Streamlabs, StreamElements)

## Overview
Integrar con plataformas populares de streaming como Streamlabs y StreamElements para sincronizar alertas, donaciones y eventos.

## Functional Requirements

### 1. Integración Streamlabs
- 1.1 Autenticación OAuth con Streamlabs
- 1.2 Recibir eventos de donaciones en tiempo real
- 1.3 Recibir eventos de follows/subs
- 1.4 Sincronizar alertas con overlays de Streamlabs
- 1.5 Acceder a configuración de alertas

### 2. Integración StreamElements
- 2.1 Autenticación JWT con StreamElements
- 2.2 Recibir eventos de tips/donaciones
- 2.3 Recibir eventos de follows/subs/raids
- 2.4 Integrar con sistema de puntos de SE
- 2.5 Sincronizar con overlays de SE

### 3. Gestión de Conexiones
- 3.1 Panel de configuración de integraciones
- 3.2 Estado de conexión en tiempo real
- 3.3 Reconexión automática
- 3.4 Logs de eventos recibidos
- 3.5 Desconexión/revocación de acceso

### 4. Mapeo de Eventos
- 4.1 Configurar qué eventos disparan acciones
- 4.2 Filtros por monto mínimo (donaciones)
- 4.3 Mapear eventos a macros existentes
- 4.4 Personalizar respuestas por tipo de evento

### 5. Sincronización Bidireccional
- 5.1 Enviar comandos a Streamlabs/SE
- 5.2 Activar alertas desde la app
- 5.3 Sincronizar estado de overlays
- 5.4 Control de media requests

### 6. Historial y Analytics
- 6.1 Registro de todos los eventos recibidos
- 6.2 Estadísticas de donaciones/subs
- 6.3 Exportar historial de eventos
- 6.4 Integrar con dashboard de métricas

## Non-Functional Requirements

### Seguridad
- Tokens almacenados de forma segura (encriptados)
- Refresh automático de tokens
- Scopes mínimos necesarios

### Fiabilidad
- Reconexión automática en < 5 segundos
- Buffer de eventos durante desconexión
- Retry con backoff exponencial

### Performance
- Latencia de eventos < 500ms
- Sin impacto en rendimiento de la app principal

## Out of Scope
- Integración con OBS (ya existe)
- Integración con Discord/Telegram (ya existe en webhooks)
- Creación de alertas personalizadas en Streamlabs/SE
