# Requirements: Exportación Directa a OBS

## Overview
Sistema para crear y gestionar escenas, fuentes y configuraciones directamente en OBS desde la aplicación, eliminando la necesidad de configuración manual.

## Functional Requirements

### 1. Gestión de Browser Sources
- 1.1 Crear Browser Sources en OBS automáticamente desde la app
- 1.2 Configurar URL, dimensiones y propiedades de cada source
- 1.3 Actualizar sources existentes sin recrearlos
- 1.4 Eliminar sources creados por la app
- 1.5 Detectar sources duplicados y ofrecer reemplazar/renombrar
- 1.6 Previsualizar source antes de crear en OBS

### 2. Templates de Escenas
- 2.1 Biblioteca de templates predefinidos (Gaming, Just Chatting, IRL, etc.)
- 2.2 Cada template incluye escenas, fuentes y transiciones recomendadas
- 2.3 Personalizar template antes de aplicar (colores, posiciones, tamaños)
- 2.4 Crear escena completa en OBS con un click
- 2.5 Importar/exportar templates personalizados (JSON)
- 2.6 Preview visual del template antes de aplicar

### 3. Sincronización de Configuración
- 3.1 Exportar configuración actual de OBS a archivo
- 3.2 Importar configuración desde archivo a OBS
- 3.3 Backup automático antes de cambios destructivos
- 3.4 Historial de cambios con opción de rollback
- 3.5 Sincronizar solo elementos específicos (escenas, fuentes, filtros)
- 3.6 Detectar conflictos y ofrecer resolución

### 4. Gestión de Escenas
- 4.1 Crear nuevas escenas en OBS desde la app
- 4.2 Duplicar escenas existentes
- 4.3 Renombrar y reordenar escenas
- 4.4 Eliminar escenas (con confirmación)
- 4.5 Agrupar escenas por categoría/propósito

### 5. Gestión de Fuentes
- 5.1 Añadir fuentes a escenas existentes
- 5.2 Soportar tipos: Browser, Image, Text, Color Source, Media Source
- 5.3 Configurar transformaciones (posición, escala, rotación)
- 5.4 Configurar filtros básicos (crop, color correction)
- 5.5 Copiar fuentes entre escenas
- 5.6 Bloquear/desbloquear fuentes

### 6. Integración con Overlays de la App
- 6.1 Botón "Añadir a OBS" en cada overlay (polls, predictions, alerts)
- 6.2 Configuración automática de dimensiones óptimas
- 6.3 Posicionamiento sugerido según tipo de overlay
- 6.4 Actualizar URL de overlay si cambia configuración
- 6.5 Indicador visual de qué overlays están en OBS

### 7. Validación y Seguridad
- 7.1 Validar conexión OBS antes de operaciones
- 7.2 Confirmar operaciones destructivas (eliminar, sobrescribir)
- 7.3 Timeout en operaciones largas con opción de cancelar
- 7.4 Log de todas las operaciones realizadas
- 7.5 Modo "dry-run" para previsualizar cambios sin aplicar

## Non-Functional Requirements

### Performance
- Las operaciones deben completarse en menos de 5 segundos
- Preview de templates debe cargar en menos de 1 segundo
- Backup de configuración no debe bloquear la UI

### Usability
- Interfaz drag-and-drop para posicionar fuentes
- Tooltips explicativos en cada opción
- Mensajes de error claros con sugerencias de solución

### Compatibility
- Compatible con OBS WebSocket 5.x
- Funcionar con OBS Studio 28.0+
- Soportar múltiples perfiles de OBS

