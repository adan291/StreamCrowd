# 🎯 MATRIZ DE DECISIONES TÉCNICAS

## Decisiones Clave Tomadas

### 1. Arquitectura: Hexagonal + Feature-Based
**Decisión:** Reorganizar en capas (domain, application, infrastructure, presentation)  
**Razón:** Separación clara de responsabilidades, testeable, escalable  
**Alternativa Rechazada:** Mantener estructura actual (imposible mantener)  
**Riesgo:** Curva de aprendizaje inicial  
**Mitigación:** Documentación clara, code reviews exhaustivos

### 2. State Management: Redux Toolkit
**Decisión:** Usar Redux Toolkit en lugar de Context API  
**Razón:** DevTools, performance, state predecible, middleware  
**Alternativa Rechazada:** Zustand (menos maduro para este proyecto)  
**Riesgo:** Boilerplate inicial  
**Mitigación:** Generadores de código, templates

### 3. Seguridad: PKCE + HttpOnly Cookies
**Decisión:** Implementar OAuth2 PKCE con refresh tokens en HttpOnly cookies  
**Razón:** Cumplimiento de estándares, protección de tokens  
**Alternativa Rechazada:** Mantener tokens en localStorage (inseguro)  
**Riesgo:** Cambios en backend requeridos  
**Mitigación:** Coordinación con backend team

### 4. Validación: Zod
**Decisión:** Usar Zod para validación de entrada  
**Razón:** Type-safe, runtime validation, buena DX  
**Alternativa Rechazada:** Joi (más pesado), Yup (menos mantenido)  
**Riesgo:** Curva de aprendizaje  
**Mitigación:** Ejemplos y documentación

### 5. Testing: Playwright + Page Object Model
**Decisión:** Reescribir E2E tests con POM  
**Razón:** Tests mantenibles, selectores estables, mejor cobertura  
**Alternativa Rechazada:** Cypress (menos flexible)  
**Riesgo:** Tiempo de refactorización  
**Mitigación:** Paralelizar con otras tareas

### 6. Performance: Code Splitting Manual
**Decisión:** Configurar Vite con manualChunks para overlays  
**Razón:** Control fino sobre bundle, overlays independientes  
**Alternativa Rechazada:** Dynamic imports solo (menos control)  
**Riesgo:** Complejidad de configuración  
**Mitigación:** Documentación clara

### 7. Real-time: Debouncing + Throttling
**Decisión:** Implementar debouncing/throttling en listeners  
**Razón:** Reducir re-renders, mejorar performance  
**Alternativa Rechazada:** Batch updates solo (insuficiente)  
**Riesgo:** Latencia perceptible  
**Mitigación:** Tuning de delays

### 8. Error Handling: Error Boundaries + Logging
**Decisión:** Error Boundaries por feature + logging centralizado  
**Razón:** Resiliencia, debugging, user experience  
**Alternativa Rechazada:** Try-catch solo (no suficiente)  
**Riesgo:** Overhead de logging  
**Mitigación:** Configuración de niveles de log

### 9. CI/CD: GitHub Actions
**Decisión:** Usar GitHub Actions para CI/CD  
**Razón:** Integrado con GitHub, gratuito, suficiente para el proyecto  
**Alternativa Rechazada:** Jenkins (overkill), GitLab CI (no disponible)  
**Riesgo:** Curva de aprendizaje  
**Mitigación:** Documentación y ejemplos

### 10. i18n: react-i18next
**Decisión:** Usar react-i18next con namespaces por feature  
**Razón:** Maduro, flexible, buena performance  
**Alternativa Rechazada:** Lingui (menos flexible)  
**Riesgo:** Migración de strings  
**Mitigación:** Script de migración

---

## Matriz de Impacto vs Esfuerzo

```
ALTO IMPACTO, BAJO ESFUERZO (Hacer Primero)
├─ REQ-001: Estructura de carpetas
├─ REQ-002: Redux Toolkit
├─ REQ-004: Validación con Zod
└─ REQ-005: Error Boundaries

ALTO IMPACTO, ALTO ESFUERZO (Hacer Después)
├─ REQ-003: Seguridad OAuth
├─ REQ-006: Tests E2E
├─ REQ-007: Code Splitting
└─ REQ-008: Optimización Real-time

MEDIO IMPACTO, BAJO ESFUERZO (Hacer en Paralelo)
├─ REQ-009: Auditoría Dependencias
├─ REQ-010: Consolidación i18n
└─ REQ-011: CI/CD

BAJO IMPACTO, ALTO ESFUERZO (Evitar)
└─ (Ninguno identificado)
```

---

## Criterios de Éxito por Requisito

| REQ | Criterio Primario | Criterio Secundario | Verificable |
|-----|------------------|-------------------|------------|
| 001 | 0 imports circulares | Estructura documentada | ESLint |
| 002 | Redux funciona | DevTools activo | Browser DevTools |
| 003 | PKCE implementado | Tokens NO en URLs | Code review |
| 004 | Schemas creados | Validación funciona | Tests |
| 005 | ErrorBoundary funciona | Errores se loguean | Tests |
| 006 | POM implementado | Tests pasan | `npm run test:e2e` |
| 007 | Overlays <100KB | Cargan <2s | Bundle analysis |
| 008 | Debouncing funciona | CPU <20% en OBS | Performance test |
| 009 | DEPENDENCIES.md | Vulnerabilidades parcheadas | `npm audit` |
| 010 | Strings en JSON | Cambio de idioma funciona | Manual test |
| 011 | GitHub Actions ejecuta | Branch protection activo | GitHub |

---

## Riesgos Identificados y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|--------|-----------|
| Refactorización rompe features | Media | Alto | Code reviews exhaustivos, tests antes |
| Timeline se extiende | Media | Medio | Paralelizar, daily standups |
| Conflictos de merge | Media | Medio | Feature branches, merge strategy |
| Falta de documentación | Baja | Medio | Documentar mientras se desarrolla |
| Developers no entienden arquitectura | Baja | Medio | Capacitación, documentación clara |
| Backend no soporta PKCE | Baja | Alto | Coordinación temprana |
| Tests E2E siguen siendo flaky | Baja | Medio | Investigación profunda, retry logic |

---

## Dependencias Externas

| Dependencia | Tipo | Impacto | Mitigación |
|------------|------|--------|-----------|
| Backend para PKCE | Técnica | Alto | Coordinación con backend team |
| Firebase emulator | Herramienta | Bajo | Instalación local |
| Node.js 18+ | Herramienta | Bajo | Documentar versión requerida |
| GitHub Actions | Servicio | Bajo | Usar plan gratuito |

---

## Decisiones Reversibles vs Irreversibles

### Reversibles (Bajo Riesgo)
- ✅ Redux Toolkit (puede cambiar a Zustand después)
- ✅ Zod (puede cambiar a Yup después)
- ✅ GitHub Actions (puede cambiar a Jenkins después)
- ✅ react-i18next (puede cambiar a Lingui después)

### Irreversibles (Alto Riesgo)
- ⚠️ Reorganización de carpetas (requiere actualizar todos los imports)
- ⚠️ Cambios en firebase-rules.json (afecta a usuarios existentes)
- ⚠️ Cambios en OAuth flow (requiere coordinación con backend)

**Mitigación:** Hacer cambios irreversibles primero, con máxima documentación

---

## Opciones Consideradas y Rechazadas

### Arquitectura
- ❌ Monolito sin estructura (actual) - Imposible mantener
- ❌ Micro-frontends - Overkill para este proyecto
- ✅ Hexagonal + Feature-Based - Elegido

### State Management
- ❌ Context API (actual) - Fragmentado, sin DevTools
- ❌ Zustand - Menos maduro
- ❌ MobX - Más complejo
- ✅ Redux Toolkit - Elegido

### Testing
- ❌ Cypress - Menos flexible
- ❌ Puppeteer - Más bajo nivel
- ✅ Playwright - Elegido

### Performance
- ❌ Webpack - Más complejo
- ❌ Rollup - Más bajo nivel
- ✅ Vite - Elegido (ya en uso)

---

## Próximas Decisiones Requeridas

1. **Backend:** ¿Soporta PKCE en OAuth2?
2. **DevOps:** ¿Dónde deployar? (Vercel, AWS, etc.)
3. **Equipo:** ¿Cuántos developers disponibles?
4. **Timeline:** ¿Deadline para completar?
5. **Prioridades:** ¿Qué es más importante: seguridad o performance?

---

**Última actualización:** Enero 14, 2026
