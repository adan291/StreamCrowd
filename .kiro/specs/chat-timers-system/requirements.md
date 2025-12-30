# Chat Timers System - Requirements

## Overview

Sistema de mensajes automáticos (timers) que envía mensajes al chat de forma periódica. Útil para recordatorios de redes sociales, reglas del canal, promociones, etc.

## User Stories

### US-1: Crear Timer
**Como** streamer
**Quiero** crear un timer con un mensaje y un intervalo
**Para** automatizar mensajes repetitivos en mi chat

**Acceptance Criteria:**
- AC1.1: El formulario debe tener campos para nombre, mensaje, intervalo (minutos) y líneas mínimas de chat
- AC1.2: El intervalo mínimo debe ser 1 minuto, máximo 120 minutos
- AC1.3: Las líneas mínimas de chat (0-100) evitan spam cuando el chat está inactivo
- AC1.4: El mensaje puede usar variables como $(channel), $(game), $(uptime)
- AC1.5: Se debe poder habilitar/deshabilitar el timer individualmente

### US-2: Gestionar Timers
**Como** streamer
**Quiero** ver, editar y eliminar mis timers
**Para** mantener mis mensajes automáticos actualizados

**Acceptance Criteria:**
- AC2.1: Lista de timers con nombre, mensaje (truncado), intervalo y estado
- AC2.2: Indicador visual de cuándo se enviará el próximo mensaje
- AC2.3: Botón para editar cada timer
- AC2.4: Botón para eliminar con confirmación
- AC2.5: Toggle para activar/desactivar rápidamente

### US-3: Ejecución de Timers
**Como** streamer
**Quiero** que los timers se ejecuten automáticamente
**Para** no tener que enviar mensajes manualmente

**Acceptance Criteria:**
- AC3.1: Los timers solo se ejecutan cuando el chat está conectado
- AC3.2: Respetar el intervalo configurado entre mensajes
- AC3.3: Respetar las líneas mínimas de chat antes de enviar
- AC3.4: Mostrar log de mensajes enviados con timestamp
- AC3.5: Los timers deben pausarse si se desconecta el chat

### US-4: Plantillas de Timers
**Como** streamer
**Quiero** usar plantillas predefinidas de timers comunes
**Para** configurar rápidamente mensajes típicos

**Acceptance Criteria:**
- AC4.1: Plantillas para: redes sociales, reglas, discord, donaciones, comandos
- AC4.2: Las plantillas deben ser personalizables antes de guardar
- AC4.3: Mostrar preview del mensaje con variables sustituidas

### US-5: Grupos de Timers
**Como** streamer
**Quiero** agrupar timers por categoría
**Para** activar/desactivar grupos completos fácilmente

**Acceptance Criteria:**
- AC5.1: Crear grupos personalizados (ej: "Redes", "Promociones", "Reglas")
- AC5.2: Asignar timers a grupos
- AC5.3: Toggle para activar/desactivar todo un grupo
- AC5.4: Grupo "General" por defecto para timers sin grupo

## Technical Requirements

### TR-1: Persistencia
- Los timers deben guardarse en localStorage
- Restaurar estado al recargar la aplicación

### TR-2: Rendimiento
- Los timers deben usar un único intervalo central (no uno por timer)
- Evitar memory leaks al desmontar componentes

### TR-3: Integración
- Integrar con el sistema de chat existente (tmi.js)
- Usar las mismas variables que los comandos personalizados

### TR-4: Accesibilidad
- Todos los controles deben ser accesibles por teclado
- ARIA labels en elementos interactivos

## Out of Scope
- Envío de mensajes a múltiples canales simultáneamente
- Programación por horarios específicos (solo intervalos)
- Integración con bots externos
