# Implementation Plan: Form Accessibility Fixes

## Overview

Revisar y corregir todos los elementos de formulario del proyecto para cumplir con estándares de accesibilidad. Cada input, select y textarea debe tener `id`/`name` y una etiqueta asociada.

## Tasks

- [x] 1. Auditar componentes principales
  - Buscar todos los `<input`, `<select`, `<textarea` en el proyecto
  - Identificar cuáles no tienen `id`, `name`, o label asociado
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 2. Corregir componentes de conexión y configuración
  - [x] 2.1 Corregir ConnectionPanel.tsx
    - Añadir id/name a inputs de canal y token
    - Añadir aria-label o label asociado
    - _Requirements: 1.1, 2.1_
  - [x] 2.2 Corregir PollCreator.tsx
    - Añadir id/name a inputs de título, pregunta, opciones
    - Añadir labels apropiados
    - _Requirements: 1.1, 2.1_
  - [x] 2.3 Corregir ModerationConfigForm.tsx
    - Añadir id/name a inputs de configuración
    - _Requirements: 1.1, 2.1_

- [x] 3. Corregir componentes de actividad
  - [x] 3.1 Corregir APIDataPanel.tsx
    - Añadir aria-label a selects de período y fecha
    - _Requirements: 1.1, 2.4_
  - [x] 3.2 Corregir StreamActivity.tsx
    - Añadir aria-label a selects de fecha e inputs de rango
    - _Requirements: 1.1, 2.4_
  - [x] 3.3 Corregir ModerationDrawer.tsx
    - Añadir id/name a inputs de timeout y razón
    - _Requirements: 1.1, 2.1_
  - [x] 3.4 Corregir ViewerPanel.tsx
    - Añadir aria-label a input de búsqueda
    - _Requirements: 1.1, 2.4_

- [x] 4. Corregir componentes de herramientas
  - [x] 4.1 Corregir Countdown.tsx
    - Añadir id/name a inputs de tiempo
    - _Requirements: 1.1, 2.1_
  - [x] 4.2 Corregir SpinnerWheel.tsx
    - Añadir id/name a inputs de configuración
    - _Requirements: 1.1, 2.1_
  - [x] 4.3 Corregir Tools.tsx
    - No tiene inputs de formulario (solo botones)
    - _Requirements: 1.1, 2.1_
  - [x] 4.4 Corregir SoundBoard.tsx
    - Añadir id/name a inputs de volumen y configuración
    - _Requirements: 1.1, 2.1_

- [x] 5. Corregir componentes de juegos
  - [x] 5.1 Corregir VeoVeo.tsx
    - Añadir id/name a inputs de palabra secreta y pista
    - _Requirements: 4.3_
  - [x] 5.2 Corregir Ahorcado.tsx
    - Añadir id/name a inputs de palabra secreta y pista
    - _Requirements: 4.3_
  - [x] 5.3 Corregir HotPotato.tsx
    - Añadir id/name a input de tiempo
    - _Requirements: 4.3_
  - [x] 5.4 Revisar y corregir otros juegos (TriviaBattle, PiumGame, PartyCo, MemoriaIRL, CasinoRoulette, CarreraEmotes)
    - _Requirements: 4.3_

- [x] 6. Corregir otros componentes
  - [x] 6.1 Corregir ChatFeed.tsx
    - Añadir aria-label a input de mensaje si existe
    - _Requirements: 1.1, 2.4_
  - [x] 6.2 Corregir GiveawayHub.tsx
    - Añadir id/name a inputs de configuración de sorteo
    - _Requirements: 1.1, 2.1_
  - [x] 6.3 Corregir JudgePanel.tsx
    - Añadir id/name a inputs de puntuación
    - _Requirements: 1.1, 2.1_
  - [x] 6.4 Corregir RandomWinnerOverlay.tsx
    - Añadir id/name a inputs de configuración
    - _Requirements: 1.1, 2.1_

- [x] 7. Checkpoint - Verificar correcciones
  - Ejecutar build para verificar que no hay errores
  - Abrir la app en el navegador y verificar en DevTools > Issues que no hay warnings de accesibilidad de formularios
  - _Requirements: 1.1, 1.2, 2.1_

## Notes

- Usar `aria-label` para inputs donde no tiene sentido mostrar un label visible (ej: búsqueda con placeholder)
- Usar `<label className="sr-only">` cuando se necesita label para lectores de pantalla pero no visible
- Los IDs deben ser únicos y descriptivos (ej: `channel-input`, `poll-title-input`)
- Preferir `id` + `name` juntos para mejor compatibilidad con autofill
