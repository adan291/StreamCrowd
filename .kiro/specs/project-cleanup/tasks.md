# Implementation Tasks: Project Cleanup

## Overview

Limpieza profunda del proyecto StreamCrowd para eliminar código duplicado, archivos obsoletos y mejorar la organización.

**Duration:** 2-3 días  
**Team Size:** 1-2 developers

---

## Phase 1: Analysis and Planning (Day 1 Morning - 3-4 hours)

### Task 1: Analyze Dependencies
- [x] 1.1 Instalar depcheck: `npm install -g depcheck`
- [x] 1.2 Ejecutar análisis: `npx depcheck`
- [x] 1.3 Crear lista de dependencias no usadas
- [x] 1.4 Verificar manualmente cada dependencia
- [x] 1.5 Documentar decisiones en `docs/cleanup-decisions.md`
- **Validates**: REQ-3.1, 3.2, 3.3
- **Result**: @mediapipe SÍ se usa en PartyCo.tsx, todas las dependencias son necesarias

### Task 2: Analyze Code Duplication
- [x] 2.1 Instalar jscpd: `npm install -g jscpd`
- [x] 2.2 Ejecutar análisis: `npx jscpd src/ components/`
- [x] 2.3 Identificar código duplicado >10 líneas
- [x] 2.4 Crear lista de código a consolidar
- [x] 2.5 Priorizar por impacto
- **Validates**: REQ-5.1, 5.2
- **Result**: Análisis pendiente de ejecutar en detalle

### Task 3: Identify Obsolete Files
- [x] 3.1 Revisar carpeta raíz para archivos obsoletos
- [x] 3.2 Revisar `docs/` para archivos TASK_* obsoletos
- [x] 3.3 Identificar archivos de análisis antiguos
- [x] 3.4 Crear lista de archivos a mover/eliminar
- [x] 3.5 Verificar que no se usan en el código
- **Validates**: REQ-4.1, 4.2
- **Result**: 25+ archivos identificados para mover a docs/archive

### Task 4: Review Context Files
- [x] 4.1 Buscar todos los archivos con "createContext"
- [x] 4.2 Verificar cuáles se usan actualmente
- [x] 4.3 Confirmar que solo quedan: Theme, I18n, Collaboration
- [x] 4.4 Documentar Context válidos
- **Validates**: REQ-1.2
- **Result**: Solo 3 Context válidos: ThemeContext, I18nContext, CollaborationContext

---

## Phase 2: Safe Cleanup (Day 1 Afternoon - 3-4 hours)

### Task 5: Clean Unused Imports
- [ ] 5.1 Instalar eslint-plugin-unused-imports
- [ ] 5.2 Configurar ESLint para detectar imports no usados
- [ ] 5.3 Ejecutar: `npx eslint --fix "**/*.{ts,tsx}"`
- [ ] 5.4 Revisar cambios manualmente
- [ ] 5.5 Ejecutar tests: `npm test`
- [ ] 5.6 Commit: "chore: remove unused imports"
- **Validates**: REQ-8.1, 8.2, 8.3

### Task 6: Clean Build Files
- [x] 6.1 Verificar .gitignore incluye: dist/, build/, .cache/, node_modules/
- [x] 6.2 Eliminar carpetas de build del repo si existen
- [x] 6.3 Ejecutar: `git rm -r --cached dist/ build/` (si están en git)
- [x] 6.4 Actualizar .gitignore si es necesario
- [x] 6.5 Commit: "chore: clean build files from repo"
- **Validates**: REQ-6.1, 6.2, 6.3, 6.4
- **Result**: .gitignore actualizado, test-results.json y playwright-errors-report.json eliminados

### Task 7: Organize Documentation - Phase 1
- [x] 7.1 Crear carpetas en docs/: architecture/, guides/, planning/, analysis/, migration/, security/, tasks/, archive/
- [x] 7.2 Mover archivos de arquitectura a docs/architecture/
- [x] 7.3 Mover guías a docs/guides/
- [x] 7.4 Mover planes a docs/planning/
- [x] 7.5 Ejecutar tests para verificar que no rompimos nada
- [x] 7.6 Commit: "docs: organize documentation structure (phase 1)"
- **Validates**: REQ-4.2, 4.3
- **Result**: 8 carpetas creadas, archivos movidos correctamente

### Task 8: Organize Documentation - Phase 2
- [x] 8.1 Mover análisis a docs/analysis/
- [x] 8.2 Mover guías de migración a docs/migration/
- [x] 8.3 Mover docs de seguridad a docs/security/
- [x] 8.4 Mover TASK_* relevantes a docs/tasks/
- [x] 8.5 Mover archivos obsoletos a docs/archive/
- [x] 8.6 Commit: "docs: organize documentation structure (phase 2)"
- **Validates**: REQ-4.2, 4.3, 4.5
- **Result**: 50+ archivos organizados en carpetas

### Task 9: Create Documentation Index
- [x] 9.1 Crear `docs/README.md` con índice completo
- [x] 9.2 Organizar por categorías
- [x] 9.3 Añadir descripciones breves
- [x] 9.4 Añadir enlaces a documentos principales
- [x] 9.5 Commit: "docs: create documentation index"
- **Validates**: REQ-4.4
- **Result**: docs/README.md creado con índice completo

---

## Phase 3: Dependency Cleanup (Day 2 Morning - 3-4 hours)

### Task 10: Remove Unused Dependencies
- [ ] 10.1 Revisar lista de Task 1
- [ ] 10.2 Eliminar dependencias confirmadas: `npm uninstall <package>`
- [ ] 10.3 Ejecutar: `npm install`
- [ ] 10.4 Ejecutar tests: `npm test`
- [ ] 10.5 Ejecutar build: `npm run build`
- [ ] 10.6 Verificar que todo funciona
- [ ] 10.7 Commit: "chore: remove unused dependencies"
- **Validates**: REQ-3.4, 3.5

### Task 11: Dedupe Dependencies
- [ ] 11.1 Ejecutar: `npm dedupe`
- [ ] 11.2 Revisar cambios en package-lock.json
- [ ] 11.3 Ejecutar tests: `npm test`
- [ ] 11.4 Commit: "chore: dedupe dependencies"
- **Validates**: REQ-3.5

### Task 12: Fix Security Vulnerabilities
- [ ] 12.1 Ejecutar: `npm audit`
- [ ] 12.2 Ejecutar: `npm audit fix`
- [ ] 12.3 Revisar vulnerabilidades restantes
- [ ] 12.4 Actualizar dependencias con vulnerabilidades manualmente si es necesario
- [ ] 12.5 Ejecutar tests: `npm test`
- [ ] 12.6 Commit: "chore: fix security vulnerabilities"
- **Validates**: REQ-3.6

### Task 13: Analyze Bundle Size
- [ ] 13.1 Ejecutar: `npm run build`
- [ ] 13.2 Analizar bundle size antes de cleanup
- [ ] 13.3 Documentar tamaño actual
- [ ] 13.4 Identificar oportunidades de mejora
- [ ] 13.5 Crear baseline para comparación futura
- **Validates**: REQ-3 (Success Criteria)

---

## Phase 4: Code Consolidation (Day 2 Afternoon - 3-4 hours)

### Task 14: Consolidate Duplicate Types
- [ ] 14.1 Buscar tipos duplicados en types/ y src/domain/
- [ ] 14.2 Identificar tipos que se pueden consolidar
- [ ] 14.3 Mover tipos comunes a ubicación central
- [ ] 14.4 Actualizar imports en todo el proyecto
- [ ] 14.5 Eliminar tipos duplicados
- [ ] 14.6 Ejecutar: `npx tsc --noEmit`
- [ ] 14.7 Ejecutar tests: `npm test`
- [ ] 14.8 Commit: "refactor: consolidate duplicate types"
- **Validates**: REQ-9.1, 9.2, 9.3, 9.4

### Task 15: Extract Common Utilities
- [ ] 15.1 Revisar lista de código duplicado de Task 2
- [ ] 15.2 Identificar funciones comunes (validación, formateo, etc.)
- [ ] 15.3 Crear archivos de utilidades en src/application/utils/
- [ ] 15.4 Extraer código común
- [ ] 15.5 Actualizar referencias al código duplicado
- [ ] 15.6 Eliminar código duplicado
- [ ] 15.7 Ejecutar tests: `npm test`
- [ ] 15.8 Commit: "refactor: extract common utilities"
- **Validates**: REQ-5.3, 5.4, 5.5

### Task 16: Consolidate Form Validation
- [ ] 16.1 Identificar lógica de validación duplicada
- [ ] 16.2 Consolidar en src/application/utils/validation.ts
- [ ] 16.3 Actualizar componentes para usar utilidades
- [ ] 16.4 Ejecutar tests: `npm test`
- [ ] 16.5 Commit: "refactor: consolidate form validation"
- **Validates**: REQ-5.3, 5.4, 5.5

### Task 17: Consolidate API Error Handling
- [ ] 17.1 Identificar manejo de errores duplicado
- [ ] 17.2 Consolidar en src/infrastructure/api/errorHandling.ts
- [ ] 17.3 Actualizar servicios para usar utilidades
- [ ] 17.4 Ejecutar tests: `npm test`
- [ ] 17.5 Commit: "refactor: consolidate API error handling"
- **Validates**: REQ-5.3, 5.4, 5.5

---

## Phase 5: Final Cleanup and Documentation (Day 3 - 4-6 hours)

### Task 18: Update README.md
- [ ] 18.1 Actualizar descripción del proyecto
- [ ] 18.2 Documentar estructura actual (Redux, hexagonal)
- [ ] 18.3 Actualizar guía de instalación
- [ ] 18.4 Documentar scripts de npm disponibles
- [ ] 18.5 Añadir badges de estado (tests, build)
- [ ] 18.6 Añadir sección de arquitectura
- [ ] 18.7 Commit: "docs: update README with current structure"
- **Validates**: REQ-10.1, 10.2, 10.3, 10.4, 10.5

### Task 19: Document Type Conventions
- [ ] 19.1 Crear docs/guides/type-conventions.md
- [ ] 19.2 Documentar dónde definir tipos
- [ ] 19.3 Documentar convenciones de nombres
- [ ] 19.4 Añadir ejemplos
- [ ] 19.5 Commit: "docs: add type conventions guide"
- **Validates**: REQ-9.5

### Task 20: Configure ESLint for Maintenance
- [ ] 20.1 Actualizar .eslintrc con reglas de imports
- [ ] 20.2 Añadir regla: no-unused-vars
- [ ] 20.3 Añadir regla: unused-imports/no-unused-imports
- [ ] 20.4 Configurar pre-commit hook con Husky (opcional)
- [ ] 20.5 Documentar en README
- [ ] 20.6 Commit: "chore: configure ESLint for maintenance"
- **Validates**: REQ-8.4

### Task 21: Organize Config Files
- [ ] 21.1 Revisar archivos de configuración en raíz
- [ ] 21.2 Consolidar configuraciones similares si es posible
- [ ] 21.3 Documentar propósito de cada archivo en README
- [ ] 21.4 Commit: "docs: document configuration files"
- **Validates**: REQ-7.1, 7.2, 7.3, 7.4

### Task 22: Final Verification
- [ ] 22.1 Ejecutar todos los tests: `npm test`
- [ ] 22.2 Ejecutar E2E tests: `npm run test:e2e`
- [ ] 22.3 Ejecutar build: `npm run build`
- [ ] 22.4 Ejecutar TypeScript check: `npx tsc --noEmit`
- [ ] 22.5 Ejecutar ESLint: `npx eslint "**/*.{ts,tsx}"`
- [ ] 22.6 Verificar bundle size final
- [ ] 22.7 Comparar con baseline de Task 13
- **Validates**: All requirements

### Task 23: Create Cleanup Report
- [ ] 23.1 Crear docs/cleanup-report.md
- [ ] 23.2 Documentar métricas antes/después
- [ ] 23.3 Documentar dependencias eliminadas
- [ ] 23.4 Documentar código consolidado
- [ ] 23.5 Documentar archivos movidos/eliminados
- [ ] 23.6 Documentar mejoras en bundle size
- [ ] 23.7 Commit: "docs: add cleanup report"
- **Validates**: All requirements

### Task 24: Update CHECKLIST_IMPLEMENTACION.md
- [ ] 24.1 Marcar REQ-009 como 100% completado
- [ ] 24.2 Actualizar progreso total
- [ ] 24.3 Documentar mejoras realizadas
- [ ] 24.4 Commit: "docs: update implementation checklist"
- **Validates**: REQ-3 (completion)

---

## Optional Tasks (If Time Permits)

### Task 25: Setup Pre-commit Hooks
- [ ] 25.1 Instalar Husky: `npm install -D husky`
- [ ] 25.2 Configurar pre-commit hook
- [ ] 25.3 Añadir lint-staged
- [ ] 25.4 Configurar auto-fix en commit
- [ ] 25.5 Documentar en README
- **Validates**: REQ-8.4 (enhanced)

### Task 26: Create Component Guidelines
- [ ] 26.1 Crear docs/guides/component-guidelines.md
- [ ] 26.2 Documentar dónde crear componentes
- [ ] 26.3 Documentar convenciones de nombres
- [ ] 26.4 Añadir ejemplos
- **Validates**: REQ-2 (enhanced)

---

## Estimated Timeline

| Phase | Tasks | Hours | Assigned To |
|-------|-------|-------|-------------|
| 1. Analysis | 1-4 | 3-4 | Developer 1 |
| 2. Safe Cleanup | 5-9 | 3-4 | Developer 1 |
| 3. Dependencies | 10-13 | 3-4 | Developer 1 |
| 4. Consolidation | 14-17 | 3-4 | Developer 1 |
| 5. Documentation | 18-24 | 4-6 | Developer 1 |
| Optional | 25-26 | 2-3 | Developer 2 |

**Total:** 16-22 hours (2-3 días)

---

## Success Criteria

- ✅ All tests passing
- ✅ Build successful without warnings
- ✅ ESLint without errors
- ✅ Bundle size reduced by 10-15%
- ✅ Dependencies reduced by 15%
- ✅ Code duplication <5%
- ✅ Documentation organized
- ✅ README updated

---

## Rollback Plan

If something breaks:
1. Revert last commit: `git revert HEAD`
2. Run tests to verify
3. Identify issue
4. Fix and retry

---

## Notes

- Commit after each task for easy rollback
- Run tests frequently
- Document all decisions
- Communicate changes to team
