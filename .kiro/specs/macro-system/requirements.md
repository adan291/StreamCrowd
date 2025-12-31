# Requirements Document: Sistema de Macros / Comandos Personalizados

## Introduction

Este documento define los requisitos para implementar un sistema de macros que permita a los streamers crear secuencias de acciones automatizadas, disparadas por eventos del chat, tiempo o condiciones específicas.

## Glossary

- **Macro**: Secuencia de acciones que se ejecutan automáticamente cuando se cumple un trigger
- **Macro_Service**: Servicio que gestiona la creación, edición y ejecución de macros
- **Trigger**: Condición que dispara la ejecución de una macro (chat, tiempo, evento)
- **Action**: Operación individual que forma parte de una macro (enviar mensaje, cambiar escena, etc.)
- **Condition**: Expresión lógica que debe cumplirse para ejecutar una acción
- **Variable**: Valor dinámico que puede usarse en acciones y condiciones

## Requirements

### Requirement 1: Modelo de Datos de Macros

**User Story:** Como streamer, quiero definir macros con múltiples acciones, para automatizar tareas repetitivas.

#### Acceptance Criteria

1. THE Macro_Service SHALL definir una macro con: id, nombre, descripción, trigger, acciones, condiciones y estado (habilitado/deshabilitado)
2. THE Macro_Service SHALL soportar múltiples acciones por macro en orden secuencial
3. THE Macro_Service SHALL permitir delays entre acciones (0-60 segundos)
4. THE Macro_Service SHALL persistir macros en IndexedDB
5. FOR ALL macros guardadas, serializing then deserializing SHALL producir una macro equivalente (round-trip)

---

### Requirement 2: Tipos de Triggers

**User Story:** Como streamer, quiero disparar macros de diferentes formas, para adaptarlas a distintas situaciones.

#### Acceptance Criteria

1. THE Macro_Service SHALL soportar trigger de tipo "chat_command" (comando específico en chat)
2. THE Macro_Service SHALL soportar trigger de tipo "chat_keyword" (palabra clave en cualquier mensaje)
3. THE Macro_Service SHALL soportar trigger de tipo "schedule" (intervalo de tiempo o hora específica)
4. THE Macro_Service SHALL soportar trigger de tipo "event" (nuevo seguidor, raid, suscripción, etc.)
5. THE Macro_Service SHALL soportar trigger de tipo "manual" (botón en la UI)
6. WHEN un trigger se activa, THE Macro_Service SHALL verificar condiciones antes de ejecutar
7. THE Macro_Service SHALL permitir cooldown por trigger (evitar spam)

---

### Requirement 3: Tipos de Acciones

**User Story:** Como streamer, quiero ejecutar diferentes tipos de acciones, para tener control total sobre mi stream.

#### Acceptance Criteria

1. THE Macro_Service SHALL soportar acción "send_chat_message" (enviar mensaje al chat)
2. THE Macro_Service SHALL soportar acción "change_scene" (cambiar escena de OBS)
3. THE Macro_Service SHALL soportar acción "toggle_source" (mostrar/ocultar fuente de OBS)
4. THE Macro_Service SHALL soportar acción "play_sound" (reproducir sonido del soundboard)
5. THE Macro_Service SHALL soportar acción "start_poll" (iniciar encuesta)
6. THE Macro_Service SHALL soportar acción "start_prediction" (iniciar predicción)
7. THE Macro_Service SHALL soportar acción "send_notification" (enviar notificación push/discord/telegram)
8. THE Macro_Service SHALL soportar acción "set_variable" (establecer valor de variable)
9. THE Macro_Service SHALL soportar acción "delay" (esperar X segundos)
10. WHEN una acción falla, THE Macro_Service SHALL continuar con la siguiente acción (no bloquear)

---

### Requirement 4: Sistema de Variables

**User Story:** Como streamer, quiero usar variables dinámicas en mis macros, para personalizar las acciones según el contexto.

#### Acceptance Criteria

1. THE Macro_Service SHALL soportar variables de sistema: {username}, {displayName}, {message}, {platform}
2. THE Macro_Service SHALL soportar variables de stream: {viewers}, {followers}, {uptime}
3. THE Macro_Service SHALL soportar variables personalizadas definidas por el usuario
4. THE Macro_Service SHALL permitir operaciones matemáticas básicas en variables numéricas (+, -, *, /)
5. WHEN se ejecuta una acción, THE Macro_Service SHALL reemplazar variables por sus valores actuales
6. IF una variable no existe, THEN THE Macro_Service SHALL usar un valor por defecto vacío

---

### Requirement 5: Sistema de Condiciones

**User Story:** Como streamer, quiero ejecutar acciones solo si se cumplen ciertas condiciones, para tener control granular.

#### Acceptance Criteria

1. THE Macro_Service SHALL soportar condiciones de comparación: igual, diferente, mayor, menor, contiene
2. THE Macro_Service SHALL soportar condiciones lógicas: AND, OR, NOT
3. THE Macro_Service SHALL permitir condiciones anidadas (grupos)
4. THE Macro_Service SHALL evaluar condiciones usando variables del contexto
5. WHEN una condición no se cumple, THE Macro_Service SHALL saltar la acción asociada
6. FOR ALL condiciones válidas, evaluating with the same context SHALL produce el mismo resultado (determinismo)

---

### Requirement 6: Editor Visual de Macros

**User Story:** Como streamer, quiero un editor visual intuitivo, para crear macros sin conocimientos técnicos.

#### Acceptance Criteria

1. THE Macro_Editor SHALL mostrar un formulario para configurar el trigger
2. THE Macro_Editor SHALL mostrar una lista ordenable de acciones (drag & drop)
3. THE Macro_Editor SHALL mostrar un selector de tipo de acción con iconos descriptivos
4. THE Macro_Editor SHALL mostrar campos específicos según el tipo de acción seleccionada
5. THE Macro_Editor SHALL mostrar un editor de condiciones con UI visual
6. THE Macro_Editor SHALL validar la macro antes de guardar
7. THE Macro_Editor SHALL mostrar preview de variables disponibles
8. WHEN el usuario guarda una macro inválida, THE Macro_Editor SHALL mostrar errores específicos

---

### Requirement 7: Gestión de Macros

**User Story:** Como streamer, quiero gestionar mis macros fácilmente, para mantenerlas organizadas.

#### Acceptance Criteria

1. THE Macro_Manager SHALL mostrar lista de todas las macros con estado
2. THE Macro_Manager SHALL permitir habilitar/deshabilitar macros individualmente
3. THE Macro_Manager SHALL permitir duplicar macros existentes
4. THE Macro_Manager SHALL permitir eliminar macros con confirmación
5. THE Macro_Manager SHALL mostrar estadísticas de ejecución por macro
6. THE Macro_Manager SHALL permitir buscar y filtrar macros
7. THE Macro_Manager SHALL mostrar el último error si una macro falló

---

### Requirement 8: Importar/Exportar Macros

**User Story:** Como streamer, quiero compartir mis macros con otros, para ayudar a la comunidad.

#### Acceptance Criteria

1. THE Macro_Service SHALL exportar macros seleccionadas a formato JSON
2. THE Macro_Service SHALL importar macros desde archivo JSON
3. WHEN se importa una macro, THE Macro_Service SHALL validar su estructura
4. IF una macro importada tiene conflicto de nombre, THEN THE Macro_Service SHALL renombrarla automáticamente
5. THE Macro_Service SHALL incluir metadatos en la exportación (versión, fecha, autor)
6. FOR ALL macros exportadas, importing then exporting SHALL producir un archivo equivalente (round-trip)

---

### Requirement 9: Ejecución y Logging

**User Story:** Como streamer, quiero ver qué macros se ejecutan y si hay errores, para depurar problemas.

#### Acceptance Criteria

1. THE Macro_Service SHALL registrar cada ejecución de macro con timestamp
2. THE Macro_Service SHALL registrar el resultado de cada acción (éxito/error)
3. THE Macro_Service SHALL mostrar un log en tiempo real de ejecuciones
4. THE Macro_Service SHALL limitar el historial a las últimas 100 ejecuciones
5. WHEN una macro falla, THE Macro_Service SHALL registrar el error específico
6. THE Macro_Service SHALL permitir pausar todas las macros globalmente (modo emergencia)

