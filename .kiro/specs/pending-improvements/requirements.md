# Pending Improvements - Requirements

## Overview

Tareas pendientes y mejoras identificadas para completar la funcionalidad de la aplicación.

## User Stories

### US-1: Integración de Traducciones de Timers
**Como** desarrollador
**Quiero** integrar las traducciones de timers con el sistema i18n principal
**Para** que la UI de timers esté correctamente traducida

**Acceptance Criteria:**
- AC1.1: Las traducciones de `timerLocales.ts` deben integrarse en `locales.ts`
- AC1.2: Los componentes de timers deben usar `useI18n()` para obtener textos

### US-2: Selector de Plataforma IA
**Como** streamer
**Quiero** seleccionar qué proveedor de IA usar en la sección Data
**Para** elegir entre diferentes modelos de IA según mis preferencias

**Acceptance Criteria:**
- AC2.1: Añadir selector de plataforma IA en el panel de configuración existente
- AC2.2: Opciones: OpenAI, Anthropic, Local (Ollama), Ninguno
- AC2.3: Guardar preferencia en localStorage
- AC2.4: Mostrar estado de conexión/API key configurada

### US-3: Mejoras de Accesibilidad en Timers
**Como** usuario con discapacidad visual
**Quiero** que los cambios de estado se anuncien por screen reader
**Para** poder usar la funcionalidad de timers sin ver la pantalla

**Acceptance Criteria:**
- AC3.1: Anunciar cuando un timer se ejecuta
- AC3.2: Anunciar cuando el motor se inicia/detiene
- AC3.3: Usar aria-live regions para actualizaciones dinámicas

### US-4: Notificaciones Toast para Timers
**Como** streamer
**Quiero** ver notificaciones cuando los timers se ejecutan
**Para** saber que los mensajes se están enviando correctamente

**Acceptance Criteria:**
- AC4.1: Mostrar toast cuando un timer envía un mensaje
- AC4.2: Mostrar toast de error si falla el envío
- AC4.3: Las notificaciones deben ser discretas y no intrusivas

### US-5: Validación y Migración de Datos de Timers
**Como** usuario
**Quiero** que mis datos de timers se validen al cargar
**Para** evitar errores si el formato de datos cambia entre versiones

**Acceptance Criteria:**
- AC5.1: Validar estructura de timers al cargar de localStorage
- AC5.2: Migrar datos antiguos a nuevo formato si es necesario
- AC5.3: Manejar datos corruptos sin perder toda la configuración

## Technical Requirements

### TR-1: Compatibilidad
- Mantener compatibilidad con datos existentes
- No romper funcionalidad actual

### TR-2: Rendimiento
- Las validaciones no deben afectar el tiempo de carga
- Las notificaciones no deben bloquear la UI

## Out of Scope
- Nuevas funcionalidades de timers
- Cambios en la arquitectura existente
