# Design: Project Cleanup

## Overview

Este documento describe el diseño y estrategia para la limpieza profunda del proyecto StreamCrowd.

---

## Architecture Decisions

### Decision 1: Mantener `components/` en la Raíz

**Rationale:**
- App.tsx ya importa desde `components/`
- Menos cambios disruptivos
- `src/presentation/components/` se usa solo para componentes específicos de presentación (ErrorBoundary, etc.)

**Structure:**
```
components/           # Componentes de UI y features
src/
  presentation/
    components/       # Solo componentes de infraestructura (ErrorBoundary, etc.)
    hooks/           # Hooks de presentación
```

---

### Decision 2: Mantener Context API Solo para Features Específicas

**Rationale:**
- ThemeContext: Necesario para theming
- I18nContext: Necesario para internacionalización
- CollaborationContext: Feature específica que no necesita Redux

**To Keep:**
- `context/ThemeContext.tsx`
- `i18n/context.tsx` (I18nContext)
- `context/CollaborationContext.tsx`

**To Remove:**
- Ninguno - todos son válidos

---

### Decision 3: Estrategia de Limpieza de Dependencias

**Approach:**
1. Usar `depcheck` para encontrar dependencias no usadas
2. Verificar manualmente cada dependencia antes de eliminar
3. Eliminar solo dependencias confirmadas como innecesarias
4. Mantener dependencias de desarrollo necesarias

**Candidates for Removal:**
- `@mediapipe/*` - Si no se usa para AI Vision
- `electron-builder` - Si no se usa para builds de Electron
- Dependencias duplicadas o con funcionalidad solapada

---

### Decision 4: Organización de Documentación

**Structure:**
```
docs/
  architecture/      # Documentos de arquitectura
  guides/           # Guías de desarrollo
  migration/        # Guías de migración (Redux, etc.)
  security/         # Documentación de seguridad
  archive/          # Documentos obsoletos pero históricos
  
# En raíz solo documentos principales
README.md
CHECKLIST_IMPLEMENTACION.md
DASHBOARD_PROGRESO.md
RESUMEN_ESTADO_ACTUAL.md
```

---

## Cleanup Strategy

### Phase 1: Analysis (Day 1 Morning)

**Tasks:**
1. Ejecutar análisis de dependencias
2. Ejecutar análisis de código duplicado
3. Identificar archivos obsoletos
4. Crear lista de cambios propuestos

**Tools:**
- `depcheck` - Dependencias no usadas
- `jscpd` - Código duplicado
- `eslint` - Imports no usados
- Manual review - Archivos obsoletos

---

### Phase 2: Safe Cleanup (Day 1 Afternoon)

**Tasks:**
1. Eliminar imports no usados (ESLint auto-fix)
2. Limpiar archivos de build
3. Actualizar .gitignore
4. Organizar documentación

**Validation:**
- Tests pasan
- Build exitoso
- No cambios en funcionalidad

---

### Phase 3: Dependency Cleanup (Day 2 Morning)

**Tasks:**
1. Eliminar dependencias confirmadas como innecesarias
2. Actualizar package.json
3. Ejecutar npm install
4. Ejecutar npm audit fix

**Validation:**
- Tests pasan
- Build exitoso
- Bundle size reducido

---

### Phase 4: Code Consolidation (Day 2 Afternoon)

**Tasks:**
1. Consolidar tipos duplicados
2. Extraer código común a utilidades
3. Eliminar código duplicado

**Validation:**
- Tests pasan
- TypeScript compila sin errores
- Código más mantenible

---

### Phase 5: Documentation (Day 3)

**Tasks:**
1. Actualizar README.md
2. Crear índice de documentación
3. Archivar documentos obsoletos
4. Documentar decisiones

**Validation:**
- Documentación clara y actualizada
- Nuevo desarrollador puede seguir instrucciones

---

## File Organization

### Current Structure Issues

```
# Problema: Documentación desorganizada
/
  ├── ANALISIS_COMPLETADO.md
  ├── ARCHITECTURE.md
  ├── ARCHITECTURE_ANALYSIS.md
  ├── CHECKLIST_IMPLEMENTACION.md
  ├── CODE_AUDIT_REPORT.md
  ├── DASHBOARD_PROGRESO.md
  ├── DEMO_TOUR_SCRIPT.md
  ├── DEPENDENCIES.md
  ├── DESPLIEGUE_WEB.md
  ├── DUPLICATE_CODE_ANALYSIS.md
  ├── EJECUTABLE.md
  ├── EXECUTIVE_SUMMARY.md
  ├── HEXAGONAL_MIGRATION_PLAN.md
  ├── INDICE_DOCUMENTACION.md
  ├── INICIO_RAPIDO.md
  ├── MATRIZ_DECISIONES.md
  ├── NARRACION_TTS.txt
  ├── OBS_WEBSOCKET_PLAN.md
  ├── PLAN_EJECUCION_PRIORIZADO.md
  ├── PLAYWRIGHT_ERRORS_REPORT.md
  ├── Problemas y soluciones
  ├── RESUMEN_ESTADO_ACTUAL.md
  ├── RESUMEN_PROBLEMAS_CLASIFICADOS.md
  ├── ROADMAP.md
  ├── SECURITY_AUDIT.md
  ├── STRUCTURE.md
  ├── TAREAS_EJECUTABLES.md
  └── docs/
      ├── TASK_11_SUMMARY.md
      ├── TASK_14_COMPLETION_SUMMARY.md
      ├── ... (30+ archivos TASK_*)
```

### Proposed Structure

```
/
  ├── README.md                          # Principal
  ├── CHECKLIST_IMPLEMENTACION.md        # Estado actual
  ├── DASHBOARD_PROGRESO.md              # Dashboard
  ├── RESUMEN_ESTADO_ACTUAL.md           # Resumen
  └── docs/
      ├── README.md                      # Índice de documentación
      ├── architecture/
      │   ├── ARCHITECTURE.md
      │   ├── HEXAGONAL_MIGRATION_PLAN.md
      │   └── STRUCTURE.md
      ├── guides/
      │   ├── INICIO_RAPIDO.md
      │   ├── DESPLIEGUE_WEB.md
      │   └── EJECUTABLE.md
      ├── planning/
      │   ├── PLAN_EJECUCION_PRIORIZADO.md
      │   ├── TAREAS_EJECUTABLES.md
      │   ├── ROADMAP.md
      │   └── MATRIZ_DECISIONES.md
      ├── analysis/
      │   ├── CODE_AUDIT_REPORT.md
      │   ├── SECURITY_AUDIT.md
      │   ├── DUPLICATE_CODE_ANALYSIS.md
      │   └── DEPENDENCY_AUDIT_REPORT.md
      ├── migration/
      │   ├── REDUX_MIGRATION_GUIDE.md
      │   ├── AUTH_REDUX_MIGRATION.md
      │   └── GIVEAWAY_REDUX_MIGRATION.md
      ├── security/
      │   ├── SECURITY_HEADERS.md
      │   ├── SECURITY_ERRORS.md
      │   └── FIREBASE_SECURITY_AUDIT.md
      ├── tasks/
      │   ├── TASK_35_FINAL_VALIDATION.md
      │   ├── TASK_34_PERFORMANCE_TESTING_SUMMARY.md
      │   └── ... (solo los relevantes)
      └── archive/
          ├── ANALISIS_COMPLETADO.md
          ├── ARCHITECTURE_ANALYSIS.md
          ├── EXECUTIVE_SUMMARY.md
          ├── INDICE_DOCUMENTACION.md
          ├── RESUMEN_PROBLEMAS_CLASIFICADOS.md
          ├── Problemas y soluciones
          └── ... (documentos obsoletos)
```

---

## Dependency Analysis

### Tools to Use

```bash
# 1. Find unused dependencies
npx depcheck

# 2. Find duplicate dependencies
npm dedupe

# 3. Check for vulnerabilities
npm audit

# 4. Analyze bundle size
npx vite-bundle-visualizer
```

### Known Candidates for Removal

Based on DEPENDENCIES.md analysis:

**Potentially Unused:**
- `@mediapipe/tasks-vision` - Verificar si AI Vision lo usa
- `electron-builder` - Verificar si se usa para builds
- Dependencias de testing no usadas

**To Keep (Critical):**
- `@reduxjs/toolkit` - Redux state management
- `react-redux` - Redux bindings
- `redux-persist` - State persistence
- `@tanstack/react-query` - Data fetching
- `firebase` - Backend
- `zod` - Validation
- `dompurify` - Sanitization

---

## Code Duplication Strategy

### Analysis

```bash
# Run jscpd to find duplicates
npx jscpd src/ components/
```

### Common Patterns to Extract

1. **Form Validation Logic**
   - Extract to `src/application/utils/validation.ts`

2. **API Error Handling**
   - Extract to `src/infrastructure/api/errorHandling.ts`

3. **Date Formatting**
   - Extract to `src/application/utils/dateUtils.ts`

4. **Storage Utilities**
   - Already in `src/infrastructure/storage/`

---

## Import Cleanup

### ESLint Configuration

```json
{
  "rules": {
    "no-unused-vars": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "unused-imports/no-unused-imports": "error"
  }
}
```

### Auto-fix Command

```bash
npx eslint --fix "**/*.{ts,tsx}"
```

---

## Testing Strategy

### After Each Phase

```bash
# 1. Run unit tests
npm test

# 2. Run E2E tests
npm run test:e2e

# 3. Build project
npm run build

# 4. Check TypeScript
npx tsc --noEmit
```

---

## Rollback Plan

### Git Strategy

```bash
# Create cleanup branch
git checkout -b cleanup/project-cleanup

# Commit after each phase
git commit -m "Phase 1: Analysis complete"
git commit -m "Phase 2: Safe cleanup complete"
# etc.

# If something breaks, revert last commit
git revert HEAD
```

---

## Success Metrics

### Before Cleanup

- Bundle size: ~2.5MB
- Dependencies: 40+
- Code duplication: ~15%
- Documentation files: 50+
- ESLint warnings: ?

### After Cleanup (Target)

- Bundle size: <2.2MB (-12%)
- Dependencies: <35 (-15%)
- Code duplication: <5% (-67%)
- Documentation files: ~30 (-40%)
- ESLint warnings: 0

---

## Notes

- Hacer backup antes de empezar
- Ejecutar tests frecuentemente
- Documentar decisiones importantes
- Comunicar cambios al equipo
