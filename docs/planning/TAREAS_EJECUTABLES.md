# 📋 TAREAS EJECUTABLES - StreamCrowd

**Formato:** Checklist ejecutable para cada tarea  
**Uso:** Copiar/pegar en issues de GitHub o Jira

---

## FASE 1: FOUNDATION (Semana 1)

### TASK-001: Crear estructura de carpetas base
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1 día | **Asignado a:** [Developer 1]

**Descripción:**
Reorganizar `src/` y `components/` según arquitectura hexagonal propuesta.

**Pasos:**
- [ ] Crear carpetas base:
  ```bash
  mkdir -p src/domain/{entities,services,types,schemas,errors}
  mkdir -p src/application/{state/slices,services,hooks,utils}
  mkdir -p src/infrastructure/{adapters,repositories,api,logging,persistence}
  mkdir -p src/presentation/{components/{shared,features,layouts,pages},providers}
  ```
- [ ] Crear `index.ts` vacíos en cada carpeta
- [ ] Crear `STRUCTURE.md` documentando la nueva estructura
- [ ] Actualizar imports en `App.tsx` si es necesario
- [ ] Ejecutar `npm run lint` sin errores

**Criterios de Aceptación:**
- ✅ Todas las carpetas creadas
- ✅ `STRUCTURE.md` documentado
- ✅ Linting pasa
- ✅ Aplicación sigue funcionando

**Notas:**
- No mover archivos aún, solo crear estructura
- Esto es la base para todas las otras tareas

---

### TASK-002: Configurar ESLint para evitar imports circulares
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 0.5 días | **Asignado a:** [Developer 2]

**Descripción:**
Instalar y configurar plugin de ESLint para detectar imports circulares.

**Pasos:**
- [ ] Instalar: `npm install eslint-plugin-import --save-dev`
- [ ] Actualizar `.eslintrc.json`:
  ```json
  {
    "plugins": ["import"],
    "rules": {
      "import/no-cycle": ["error", { "maxDepth": "∞" }],
      "import/no-self-import": "error"
    }
  }
  ```
- [ ] Ejecutar: `npm run lint`
- [ ] Documentar en README

**Criterios de Aceptación:**
- ✅ ESLint pasa sin errores de ciclos
- ✅ Configuración documentada

---

### TASK-003: Instalar y configurar Redux Toolkit
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1 día | **Asignado a:** [Developer 1]

**Descripción:**
Setup inicial de Redux con persistencia y DevTools.

**Pasos:**
- [ ] Instalar: `npm install @reduxjs/toolkit react-redux redux-persist`
- [ ] Crear `src/application/state/store.ts`:
  ```typescript
  import { configureStore } from '@reduxjs/toolkit';
  import { persistStore, persistReducer } from 'redux-persist';
  import storage from 'redux-persist/lib/storage';

  const persistConfig = {
    key: 'streamcrowd',
    storage,
    whitelist: [],
  };

  export const store = configureStore({
    reducer: {},
  });

  export const persistor = persistStore(store);
  export type RootState = ReturnType<typeof store.getState>;
  export type AppDispatch = typeof store.dispatch;
  ```
- [ ] Crear `src/application/state/hooks.ts`:
  ```typescript
  import { useDispatch, useSelector } from 'react-redux';
  import type { RootState, AppDispatch } from './store';

  export const useAppDispatch = () => useDispatch<AppDispatch>();
  export const useAppSelector = <T,>(selector: (state: RootState) => T) => useSelector(selector);
  ```
- [ ] Conectar en `App.tsx`:
  ```typescript
  import { Provider } from 'react-redux';
  import { PersistGate } from 'redux-persist/integration/react';
  import { store, persistor } from './application/state/store';

  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      {/* App content */}
    </PersistGate>
  </Provider>
  ```
- [ ] Verificar Redux DevTools en navegador
- [ ] Tests básicos de store

**Criterios de Aceptación:**
- ✅ Redux store funciona
- ✅ DevTools visible en navegador
- ✅ Persistencia funciona (localStorage)
- ✅ App sigue funcionando

---

### TASK-004: Auditar y documentar dependencias
**Prioridad:** 🟢 MEDIA | **Estimación:** 1 día | **Asignado a:** [Developer 3]

**Descripción:**
Auditar todas las dependencias del proyecto.

**Pasos:**
- [ ] Ejecutar auditoría:
  ```bash
  npm audit > audit-report.txt
  npm outdated > outdated-report.txt
  npm ls > dependency-tree.txt
  ```
- [ ] Crear `DEPENDENCIES.md` con:
  - Dependencias críticas (app no funciona sin ellas)
  - Dependencias de integraciones (Twitch, Firebase, OBS)
  - Dependencias de utilidades
  - Dependencias de testing
  - Candidatas a eliminar
- [ ] Identificar vulnerabilidades críticas
- [ ] Actualizar vulnerabilidades: `npm audit fix`
- [ ] Documentar propósito de cada dependencia

**Criterios de Aceptación:**
- ✅ `DEPENDENCIES.md` creado
- ✅ Vulnerabilidades críticas parcheadas
- ✅ Dependencias sin uso identificadas

---

### TASK-005: Instalar herramientas de validación y seguridad
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 0.5 días | **Asignado a:** [Developer 2]

**Descripción:**
Instalar Zod, DOMPurify y otras herramientas de seguridad.

**Pasos:**
- [ ] Instalar: `npm install zod @hookform/resolvers dompurify`
- [ ] Instalar tipos: `npm install --save-dev @types/dompurify`
- [ ] Crear `src/domain/schemas/validation.ts` con ejemplo:
  ```typescript
  import { z } from 'zod';

  export const MessageSchema = z.object({
    username: z.string().min(1).max(25),
    message: z.string().min(1).max(500),
    timestamp: z.date(),
  });
  ```
- [ ] Documentar en README

**Criterios de Aceptación:**
- ✅ Paquetes instalados
- ✅ Schema de ejemplo creado
- ✅ Tipos disponibles

---

## FASE 2: SEGURIDAD (Semana 1-2)

### TASK-006: Auditar firebase-rules.json
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1.5 días | **Asignado a:** [Security Lead]

**Descripción:**
Revisar y reforzar reglas de Firebase.

**Pasos:**
- [ ] Leer `firebase-rules.json` completo
- [ ] Documentar permisos actuales
- [ ] Identificar riesgos (read/write sin validación)
- [ ] Aplicar principio de mínimo privilegio
- [ ] Crear `FIREBASE_SECURITY.md` con cambios
- [ ] Testear en emulador Firebase

**Criterios de Aceptación:**
- ✅ Rules refactorizado
- ✅ Riesgos documentados
- ✅ Tests en emulador pasan

---

### TASK-007: Implementar PKCE en OAuth2
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1.5 días | **Asignado a:** [Developer 1]

**Descripción:**
Implementar flujo PKCE en Twitch, YouTube, etc.

**Pasos:**
- [ ] Crear `src/infrastructure/auth/PkceFlow.ts`
- [ ] Implementar generación de code_verifier y code_challenge
- [ ] Actualizar TwitchAdapter para usar PKCE
- [ ] Actualizar YouTubeAdapter si existe
- [ ] Tests de PKCE flow
- [ ] Documentar en README

**Criterios de Aceptación:**
- ✅ PKCE implementado
- ✅ Tokens NO aparecen en URLs
- ✅ Tests pasan

---

### TASK-008: Mover tokens a HttpOnly cookies
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1 día | **Asignado a:** [Developer 2]

**Descripción:**
Almacenar refresh tokens en HttpOnly cookies.

**Pasos:**
- [ ] Configurar backend para set-cookie HttpOnly
- [ ] Actualizar API client para leer de cookies
- [ ] Eliminar tokens de localStorage
- [ ] Tests de cookies seguras
- [ ] Documentar cambios

**Criterios de Aceptación:**
- ✅ Tokens en HttpOnly cookies
- ✅ localStorage limpio
- ✅ Tests pasan

---

### TASK-009: Session management para overlays
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1 día | **Asignado a:** [Developer 3]

**Descripción:**
Usar session IDs en lugar de tokens en URLs de overlays.

**Pasos:**
- [ ] Crear `src/application/services/SessionService.ts`
- [ ] Generar session IDs con expiración
- [ ] Validar session en overlays
- [ ] Eliminar tokens de URLs
- [ ] Tests de session management

**Criterios de Aceptación:**
- ✅ SessionService funciona
- ✅ Overlays usan session IDs
- ✅ Tokens NO en URLs

---

### TASK-010: Crear validación con Zod
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1.5 días | **Asignado a:** [Developer 1]

**Descripción:**
Crear schemas Zod para datos críticos.

**Pasos:**
- [ ] Crear schemas en `src/domain/schemas/`:
  - [ ] `pollSchema.ts`
  - [ ] `giveawaySchema.ts`
  - [ ] `gameSchema.ts`
  - [ ] `userSchema.ts`
  - [ ] `messageSchema.ts`
- [ ] Tests para cada schema
- [ ] Documentar uso en README

**Criterios de Aceptación:**
- ✅ Schemas creados
- ✅ Tests >80% cobertura
- ✅ Documentado

---

### TASK-011: Sanitización de mensajes
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1 día | **Asignado a:** [Developer 2]

**Descripción:**
Prevenir XSS en chat con DOMPurify.

**Pasos:**
- [ ] Crear hook `useSanitizedInput.ts`
- [ ] Integrar DOMPurify en ChatList
- [ ] Tests de XSS prevention
- [ ] Documentar en README

**Criterios de Aceptación:**
- ✅ ChatList sanitiza mensajes
- ✅ Tests de XSS pasan
- ✅ Documentado

---

## FASE 3: REFACTORIZACIÓN (Semana 2-3)

### TASK-012: Migrar Poll a Redux
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 2 días | **Asignado a:** [Developer 1]

**Descripción:**
Mover estado de poll a Redux.

**Pasos:**
- [ ] Crear `src/application/state/slices/pollSlice.ts`
- [ ] Crear `src/application/services/PollService.ts`
- [ ] Crear hook `src/application/hooks/usePoll.ts`
- [ ] Refactorizar componentes:
  - [ ] `PollCreator.tsx`
  - [ ] `LivePoll.tsx`
  - [ ] `PollOverlay.tsx`
- [ ] Tests de pollSlice
- [ ] Verificar que todo funciona

**Criterios de Aceptación:**
- ✅ Poll en Redux
- ✅ Componentes refactorizados
- ✅ Tests pasan
- ✅ Funcionalidad igual

---

### TASK-013: Migrar Giveaway a Redux
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 2 días | **Asignado a:** [Developer 2]

**Descripción:**
Mover estado de giveaway a Redux.

**Pasos:**
- [ ] Crear `giveawaySlice.ts`
- [ ] Crear `GiveawayService.ts`
- [ ] Crear hook `useGiveaway.ts`
- [ ] Refactorizar componentes de giveaway
- [ ] Tests

**Criterios de Aceptación:**
- ✅ Giveaway en Redux
- ✅ Componentes refactorizados
- ✅ Tests pasan

---

### TASK-014: Migrar Games a Redux
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 2 días | **Asignado a:** [Developer 3]

**Descripción:**
Centralizar estado de juegos.

**Pasos:**
- [ ] Crear `gamesSlice.ts` con sub-features
- [ ] Crear servicios por juego
- [ ] Refactorizar componentes de games
- [ ] Tests

**Criterios de Aceptación:**
- ✅ Games en Redux
- ✅ Todos los juegos refactorizados
- ✅ Tests pasan

---

### TASK-015: Migrar Auth a Redux
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1.5 días | **Asignado a:** [Developer 1]

**Descripción:**
Centralizar estado de autenticación.

**Pasos:**
- [ ] Crear `authSlice.ts`
- [ ] Crear `AuthService.ts`
- [ ] Refactorizar componentes de auth
- [ ] Integrar con token refresh
- [ ] Tests

**Criterios de Aceptación:**
- ✅ Auth en Redux
- ✅ Login/logout funciona
- ✅ Tests pasan

---

### TASK-016: Crear capa de Servicios de Aplicación
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 2 días | **Asignado a:** [Developer 2]

**Descripción:**
Abstraer lógica de negocio en servicios.

**Pasos:**
- [ ] Para cada feature (poll, giveaway, game, etc.):
  - [ ] Crear `src/application/services/FeatureService.ts`
  - [ ] Implementar casos de uso
  - [ ] Inyectar dependencias
- [ ] Tests de servicios

**Criterios de Aceptación:**
- ✅ Servicios creados
- ✅ Tests >80%
- ✅ Inyección de dependencias funciona

---

### TASK-017: Crear capa de Repositories
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1.5 días | **Asignado a:** [Developer 3]

**Descripción:**
Abstraer acceso a datos.

**Pasos:**
- [ ] Crear `src/infrastructure/repositories/`
- [ ] Implementar:
  - [ ] `PollRepository.ts`
  - [ ] `GiveawayRepository.ts`
  - [ ] `UserRepository.ts`
- [ ] Tests con datos mock

**Criterios de Aceptación:**
- ✅ Repositories creados
- ✅ Tests pasan

---

### TASK-018: Consolidar componentes UI shared
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1.5 días | **Asignado a:** [Developer 1]

**Descripción:**
Crear librería de componentes base.

**Pasos:**
- [ ] Mover a `components/shared/`:
  - [ ] Button
  - [ ] Tooltip
  - [ ] Modal
  - [ ] Input
  - [ ] etc.
- [ ] Documentar props en JSDoc
- [ ] Tests de componentes

**Criterios de Aceptación:**
- ✅ Shared components organizados
- ✅ Documentados
- ✅ Testados

---

### TASK-019: Reorganizar features en components/features/
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1.5 días | **Asignado a:** [Developer 2]

**Descripción:**
Estructurar por feature.

**Pasos:**
- [ ] Crear estructura `features/poll/`, `features/giveaway/`, etc.
- [ ] Mover componentes
- [ ] Actualizar imports
- [ ] Verificar sin imports circulares

**Criterios de Aceptación:**
- ✅ Features reorganizadas
- ✅ Imports correctos
- ✅ Linting pasa

---

## FASE 4: ERROR HANDLING (Semana 2-3)

### TASK-020: Crear ErrorBoundary genérico
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1 día | **Asignado a:** [Developer 3]

**Descripción:**
Componente reutilizable para capturar errores.

**Pasos:**
- [ ] Implementar `components/shared/ErrorBoundary.tsx`
- [ ] Configurar logging de errores
- [ ] Crear fallback UI
- [ ] Tests de ErrorBoundary

**Criterios de Aceptación:**
- ✅ ErrorBoundary funciona
- ✅ Fallback se muestra
- ✅ Errores se loguean

---

### TASK-021: Crear LogService centralizado
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1 día | **Asignado a:** [Developer 1]

**Descripción:**
Logging con Pino.

**Pasos:**
- [ ] Instalar: `npm install pino pino-pretty`
- [ ] Crear `src/infrastructure/logging/LogService.ts`
- [ ] Tests de LogService
- [ ] Integrar con ErrorBoundary

**Criterios de Aceptación:**
- ✅ LogService funciona
- ✅ Logs en consola
- ✅ Structured logging

---

### TASK-022: Implementar retry logic
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1 día | **Asignado a:** [Developer 2]

**Descripción:**
Hook/utility para reintentos con backoff.

**Pasos:**
- [ ] Crear `src/application/utils/retryLogic.ts`
- [ ] Crear hook `useRetry.ts`
- [ ] Integrar en llamadas críticas
- [ ] Tests con simulated failures

**Criterios de Aceptación:**
- ✅ Retry logic funciona
- ✅ Exponential backoff correcto
- ✅ Tests pasan

---

### TASK-023: Wrappear features críticas con ErrorBoundary
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1.5 días | **Asignado a:** [Developer 3]

**Descripción:**
Añadir boundaries a games, giveaway, etc.

**Pasos:**
- [ ] Identificar 5+ features críticas
- [ ] Wrappear cada una
- [ ] Tests de fallos simulados
- [ ] Documentar en README

**Criterios de Aceptación:**
- ✅ 5+ features wrappadas
- ✅ Tests de recuperación pasan

---

### TASK-024: Archivo de configuración de errores
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 0.5 días | **Asignado a:** [Developer 1]

**Descripción:**
Enums y constantes para tipos de errores.

**Pasos:**
- [ ] Crear `src/domain/errors/AppErrors.ts`
- [ ] Definir tipos de errores
- [ ] Crear custom Error classes

**Criterios de Aceptación:**
- ✅ Error types definidos
- ✅ Usados en aplicación

---

## FASE 5: TESTING Y OPTIMIZACIÓN (Semana 3-4)

### TASK-025: Implementar Page Object Model
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 2 días | **Asignado a:** [QA Lead]

**Descripción:**
Tests E2E mantenibles con Playwright.

**Pasos:**
- [ ] Crear `tests/pages/BasePage.ts`
- [ ] Crear page objects para:
  - [ ] GiveawayPage
  - [ ] PollPage
  - [ ] GamePage
- [ ] Implementar Page Object Methods
- [ ] Documentar uso

**Criterios de Aceptación:**
- ✅ POM implementado
- ✅ Tests usan POM
- ✅ 50% tests refactorizados

---

### TASK-026: Añadir data-testid a componentes
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1.5 días | **Asignado a:** [Developer 1]

**Descripción:**
Selectores estables para E2E.

**Pasos:**
- [ ] Auditar componentes frecuentemente usados
- [ ] Añadir `data-testid` a:
  - [ ] Buttons
  - [ ] Forms
  - [ ] Modals
  - [ ] Lists
- [ ] Verificar selectores en tests

**Criterios de Aceptación:**
- ✅ data-testid añadidos
- ✅ Selectores estables
- ✅ Tests usan data-testid

---

### TASK-027: Code splitting (Vite)
**Prioridad:** 🟡 ALTA | **Estimación:** 1.5 días | **Asignado a:** [Developer 2]

**Descripción:**
Overlays en chunks separados.

**Pasos:**
- [ ] Configurar Vite manualChunks
- [ ] Crear componentes overlay lazy-loaded
- [ ] Medir bundle size
- [ ] Documentar cambios

**Criterios de Aceptación:**
- ✅ Vite configurado
- ✅ Cada overlay <100KB
- ✅ Overlays cargan <2s

---

### TASK-028: Optimizar sincronización real-time
**Prioridad:** 🟡 ALTA | **Estimación:** 2 días | **Asignado a:** [Developer 3]

**Descripción:**
Debouncing, throttling, batch updates.

**Pasos:**
- [ ] Crear hooks de debounce/throttle
- [ ] Implementar request deduplication
- [ ] Usar React 18 batch updates
- [ ] Tests de performance

**Criterios de Aceptación:**
- ✅ Hooks creados
- ✅ Request deduplication funciona
- ✅ UI fluida

---

### TASK-029: Consolidar i18n
**Prioridad:** 🟢 MEDIA | **Estimación:** 1.5 días | **Asignado a:** [Developer 1]

**Descripción:**
Centralizar traducciones.

**Pasos:**
- [ ] Estructurar i18n/locales/
- [ ] Configurar react-i18next
- [ ] Migrar strings hardcodeados
- [ ] Tests de i18n

**Criterios de Aceptación:**
- ✅ i18n reorganizado
- ✅ Strings en JSON
- ✅ Cambio de idioma funciona

---

### TASK-030: Configurar CI/CD (GitHub Actions)
**Prioridad:** 🟢 MEDIA | **Estimación:** 1 día | **Asignado a:** [DevOps]

**Descripción:**
Lint, tests, build, deploy automático.

**Pasos:**
- [ ] Crear `.github/workflows/ci.yml`
- [ ] Configurar branch protection
- [ ] Setup husky para git hooks
- [ ] Configurar lint-staged

**Criterios de Aceptación:**
- ✅ GitHub Actions ejecutando
- ✅ Branch protection en main
- ✅ Pre-commit hooks funciona

---

### TASK-031: Documentación final
**Prioridad:** 🟢 MEDIA | **Estimación:** 1 día | **Asignado a:** [Tech Lead]

**Descripción:**
README, ARCHITECTURE.md, guías.

**Pasos:**
- [ ] Actualizar README
- [ ] Crear ARCHITECTURE.md
- [ ] Crear guías de desarrollo
- [ ] Documentar decisiones técnicas

**Criterios de Aceptación:**
- ✅ Documentación completa
- ✅ Guías claras
- ✅ Decisiones documentadas

---

### TASK-032: Validación y QA
**Prioridad:** 🔴 CRÍTICA | **Estimación:** 1.5 días | **Asignado a:** [QA Lead]

**Descripción:**
Tests finales, verificación de requisitos.

**Pasos:**
- [ ] Ejecutar todos los tests
- [ ] Verificar criterios de éxito
- [ ] Lighthouse audit
- [ ] Security audit final
- [ ] Performance testing

**Criterios de Aceptación:**
- ✅ Todos los tests pasan
- ✅ Lighthouse >85
- ✅ Security audit OK
- ✅ Performance OK

---

## 📊 MATRIZ DE ASIGNACIÓN

```
Developer 1: TASK-001, 003, 010, 012, 015, 016, 018, 021, 024, 026, 029, 031
Developer 2: TASK-002, 005, 008, 011, 013, 017, 019, 022, 027, 030
Developer 3: TASK-004, 009, 014, 020, 023, 028
Security Lead: TASK-006, 007
QA Lead: TASK-025, 032
Tech Lead: TASK-031
```

---

**Última actualización:** Enero 14, 2026
