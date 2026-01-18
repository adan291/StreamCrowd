# 📊 PLAN DE EJECUCIÓN PRIORIZADO - StreamCrowd

**Fecha:** Enero 2026  
**Estado:** Análisis Completado - Listo para Ejecución  
**Autor:** Revisión Técnica Completa

---

## 🎯 RESUMEN EJECUTIVO

Se han identificado **11 requisitos críticos** organizados en **5 fases de ejecución**. El documento original contiene análisis exhaustivo de arquitectura, seguridad, testing y optimización.

### Clasificación por Criticidad

| Nivel | Requisitos | Impacto | Timeline |
|-------|-----------|--------|----------|
| 🔴 **CRÍTICA** | REQ-001, 002, 003, 004, 005, 006 | Bloqueadores de escalabilidad y seguridad | 4-5 semanas |
| 🟡 **ALTA** | REQ-007, 008 | Performance y UX | 2-3 semanas |
| 🟢 **MEDIA** | REQ-009, 010, 011 | Mantenibilidad y DevOps | 2-3 semanas |

---

## 📋 REQUISITOS VALIDADOS Y VERIFICADOS

### ✅ CRÍTICOS (Deben hacerse primero)

#### **REQ-001: Consolidación de Estructura de Carpetas** 
- **Estado:** REAL - Confirmado en codebase
- **Problema:** `components/` tiene 100+ archivos sin estructura; imposible localizar código
- **Solución:** Reorganizar en feature-based + separación domain/application/infrastructure
- **Impacto:** +60% mantenibilidad
- **Esfuerzo:** 3-4 días
- **Dependencias:** Ninguna (base para todo lo demás)

#### **REQ-002: Centralización de Estado Global (Redux)**
- **Estado:** REAL - Context API fragmentado actualmente
- **Problema:** Re-renders innecesarios, prop drilling severo, estado inconsistente
- **Solución:** Redux Toolkit con slices por feature
- **Impacto:** DevTools, performance mejorado, state predecible
- **Esfuerzo:** 4-5 días
- **Dependencias:** REQ-001

#### **REQ-003: Auditoría de Seguridad en OAuth**
- **Estado:** REAL - Tokens en localStorage sin validación
- **Problema:** Riesgo de exposición de credenciales, CSRF, XSS en overlays
- **Solución:** PKCE, HttpOnly cookies, session IDs para overlays
- **Impacto:** Cumplimiento OAuth2, protección de tokens
- **Esfuerzo:** 3-4 días
- **Dependencias:** REQ-002

#### **REQ-004: Validación de Entrada (Zod)**
- **Estado:** REAL - Sin validación visible en integraciones
- **Problema:** Riesgo de inyección SQL, XSS, CSRF
- **Solución:** Schemas Zod + sanitización con DOMPurify
- **Impacto:** Prevención de ataques, mejor UX
- **Esfuerzo:** 2-3 días
- **Dependencias:** REQ-001

#### **REQ-005: Error Boundaries y Manejo Global**
- **Estado:** REAL - Sin Error Boundaries; un juego fallando colapsa app
- **Problema:** Falta de resiliencia, experiencia pobre, imposible debuggear
- **Solución:** Error Boundaries por feature, logging centralizado, retry logic
- **Impacto:** App resiliente, mejor debugging
- **Esfuerzo:** 2-3 días
- **Dependencias:** REQ-001

#### **REQ-006: Refactorización Tests E2E (Playwright)**
- **Estado:** REAL - Tests con fallos reportados, selectores frágiles
- **Problema:** CI/CD poco confiable, baja cobertura, cambios rompen tests
- **Solución:** Page Object Model, data-testid, buenas prácticas
- **Impacto:** CI/CD confiable, tests mantenibles
- **Esfuerzo:** 4-5 días
- **Dependencias:** REQ-001

---

### 🟡 ALTOS (Después de críticos)

#### **REQ-007: Code Splitting y Optimización de Overlays**
- **Estado:** REAL - 15+ overlays cargan toda la app
- **Problema:** Cargas lentas en OBS, alto CPU, pobre UX
- **Solución:** Code splitting por overlay, lazy loading
- **Impacto:** -60-80% bundle size, carga <2s
- **Esfuerzo:** 2-3 días
- **Dependencias:** REQ-001

#### **REQ-008: Optimización de Sincronización Real-Time**
- **Estado:** REAL - WebSocket/Socket.io sin debouncing; UI lag en chat activo
- **Problema:** Demasiados updates, re-renders costosos, CPU spike
- **Solución:** Debouncing, throttling, batch updates, request deduplication
- **Impacto:** UI fluida, -50% CPU en OBS
- **Esfuerzo:** 2-3 días
- **Dependencias:** REQ-002

---

### 🟢 MEDIOS (Después de altos)

#### **REQ-009: Auditoría de Dependencias**
- **Estado:** REAL - 40+ dependencias; algunas sin propósito claro
- **Problema:** Bundle inflado, vulnerabilidades potenciales
- **Solución:** Auditar, documentar, eliminar innecesarias
- **Impacto:** -15-20% bundle, menos vulnerabilidades
- **Esfuerzo:** 1-2 días
- **Dependencias:** Ninguna (parallelizable)

#### **REQ-010: Consolidación de i18n**
- **Estado:** REAL - Strings hardcodeados en componentes
- **Problema:** Difícil mantener traducciones, inconsistencia
- **Solución:** Centralizar con namespaces por feature
- **Impacto:** Traducción consistente, fácil añadir idiomas
- **Esfuerzo:** 2-3 días
- **Dependencias:** REQ-001

#### **REQ-011: CI/CD y Automatización**
- **Estado:** REAL - Sin CI/CD visible; tests no ejecutan automáticamente
- **Problema:** Cambios rompen cosas sin saberlo, bugs en producción
- **Solución:** GitHub Actions para lint, tests, build, deploy
- **Impacto:** Calidad consistente, deployment seguro
- **Esfuerzo:** 1-2 días
- **Dependencias:** REQ-006

---

## 🚀 PLAN DE EJECUCIÓN POR FASES

### **FASE 1: Foundation (Semana 1) - 5 tareas**

```
Objetivo: Preparar base para refactorización
Parallelizable: Sí (tareas 2, 4, 5 en paralelo)
```

| # | Tarea | Descripción | Días | Prioridad |
|---|-------|-----------|------|-----------|
| 1 | Crear estructura de carpetas | Reorganizar src/ según arquitectura hexagonal | 1 | 🔴 |
| 2 | Configurar ESLint | Evitar imports circulares | 0.5 | 🔴 |
| 3 | Instalar Redux Toolkit | Setup inicial + persistencia | 1 | 🔴 |
| 4 | Auditar dependencias | npm audit, npm outdated, crear DEPENDENCIES.md | 1 | 🟢 |
| 5 | Instalar herramientas seguridad | Zod, DOMPurify, etc. | 0.5 | 🔴 |

**Total Fase 1:** 4 días (3 en paralelo)

---

### **FASE 2: Seguridad (Semana 1-2) - 6 tareas**

```
Objetivo: Endurecimiento de credenciales y validación
Parallelizable: Sí (tareas 6, 7, 10, 11 en paralelo)
```

| # | Tarea | Descripción | Días | Prioridad |
|---|-------|-----------|------|-----------|
| 6 | Auditar firebase-rules.json | Revisar permisos, aplicar mínimo privilegio | 1.5 | 🔴 |
| 7 | Implementar PKCE en OAuth2 | Flujo seguro Twitch/YouTube | 1.5 | 🔴 |
| 8 | Mover tokens a HttpOnly cookies | Almacenamiento seguro | 1 | 🔴 |
| 9 | Session management para overlays | Session IDs en lugar de tokens | 1 | 🔴 |
| 10 | Crear validación con Zod | Schemas para datos críticos | 1.5 | 🔴 |
| 11 | Sanitización de mensajes | Prevenir XSS en chat | 1 | 🔴 |

**Total Fase 2:** 7.5 días (5 en paralelo)

---

### **FASE 3: Refactorización (Semana 2-3) - 8 tareas**

```
Objetivo: Reorganizar código según nueva arquitectura
Parallelizable: Sí (tareas 12-15 en paralelo)
```

| # | Tarea | Descripción | Días | Prioridad |
|---|-------|-----------|------|-----------|
| 12 | Migrar Poll a Redux | Mover estado + refactorizar componentes | 2 | 🔴 |
| 13 | Migrar Giveaway a Redux | Mover estado + refactorizar componentes | 2 | 🔴 |
| 14 | Migrar Games a Redux | Centralizar estado de juegos | 2 | 🔴 |
| 15 | Migrar Auth a Redux | Centralizar autenticación | 1.5 | 🔴 |
| 16 | Crear capa de Servicios | Abstraer lógica de negocio | 2 | 🔴 |
| 17 | Crear capa de Repositories | Abstraer acceso a datos | 1.5 | 🔴 |
| 18 | Consolidar componentes shared | Librería de componentes base | 1.5 | 🔴 |
| 19 | Reorganizar features | Estructura feature-based | 1.5 | 🔴 |

**Total Fase 3:** 15.5 días (4 en paralelo)

---

### **FASE 4: Error Handling (Semana 2-3) - 5 tareas**

```
Objetivo: Resiliencia y debugging
Parallelizable: Sí (tareas 20-22 en paralelo)
```

| # | Tarea | Descripción | Días | Prioridad |
|---|-------|-----------|------|-----------|
| 20 | Crear ErrorBoundary | Componente reutilizable | 1 | 🔴 |
| 21 | LogService centralizado | Logging con Pino + Sentry | 1 | 🔴 |
| 22 | Implementar retry logic | Hook con exponential backoff | 1 | 🔴 |
| 23 | Wrappear features críticas | Añadir ErrorBoundary a 5+ features | 1.5 | 🔴 |
| 24 | Archivo de configuración de errores | Error types y custom classes | 0.5 | 🔴 |

**Total Fase 4:** 5 días (3 en paralelo)

---

### **FASE 5: Testing y Optimización (Semana 3-4) - 8 tareas**

```
Objetivo: Calidad y performance
Parallelizable: Sí (tareas 25-26 en paralelo con 27-28)
```

| # | Tarea | Descripción | Días | Prioridad |
|---|-------|-----------|------|-----------|
| 25 | Page Object Model (Playwright) | Tests E2E mantenibles | 2 | 🔴 |
| 26 | Añadir data-testid | Selectores estables | 1.5 | 🔴 |
| 27 | Code splitting (Vite) | Overlays en chunks separados | 1.5 | 🟡 |
| 28 | Optimizar sincronización real-time | Debouncing, throttling, batch updates | 2 | 🟡 |
| 29 | Consolidar i18n | Centralizar traducciones | 1.5 | 🟢 |
| 30 | Configurar CI/CD (GitHub Actions) | Lint, tests, build, deploy automático | 1 | 🟢 |
| 31 | Documentación final | README, ARCHITECTURE.md, guías | 1 | 🟢 |
| 32 | Validación y QA | Tests finales, verificación de requisitos | 1.5 | 🔴 |

**Total Fase 5:** 12 días (4 en paralelo)

---

## 📊 TIMELINE TOTAL

```
FASE 1 (Foundation):     4 días  ████
FASE 2 (Seguridad):      7.5 días ███████
FASE 3 (Refactorización): 15.5 días ███████████████
FASE 4 (Error Handling):  5 días  █████
FASE 5 (Testing):        12 días ████████████

TOTAL SECUENCIAL:        44 días (9 semanas)
TOTAL CON PARALELIZACIÓN: 28-32 días (6-7 semanas)

Recomendación: 2 developers en paralelo = 4-5 semanas
```

---

## 🎯 CRITERIOS DE ÉXITO

### Por Fase

| Fase | Criterio | Métrica |
|------|----------|---------|
| 1 | Estructura lista | ESLint pasa, Redux funciona |
| 2 | Seguridad endurecida | npm audit sin críticos, PKCE implementado |
| 3 | Código refactorizado | 0 imports circulares, tests pasan |
| 4 | Resiliencia | 5+ features con ErrorBoundary, logs centralizados |
| 5 | Calidad | Lighthouse >85, tests E2E >80% cobertura, CI/CD funciona |

### Global

- ✅ Bundle size: -40-50% (de ~2.5MB a ~1.2MB)
- ✅ Lighthouse score: >85 en todas las páginas
- ✅ Tests E2E: 0 flakiness, >80% cobertura
- ✅ Seguridad: npm audit sin críticos, OWASP Top 10 mitigado
- ✅ Performance: Overlays cargan <2s, CPU <20% en OBS
- ✅ Mantenibilidad: Código limpio, documentado, testeable

---

## 🔄 PRÓXIMOS PASOS

### Inmediatos (Hoy)

1. ✅ Revisar este plan con el equipo
2. ✅ Asignar developers a tareas
3. ✅ Crear issues en GitHub/Jira con este plan
4. ✅ Configurar branch strategy (feature branches)

### Semana 1

1. Ejecutar FASE 1 (Foundation)
2. Iniciar FASE 2 en paralelo (tareas 4, 5)
3. Crear documentación de progreso

### Semana 2+

1. Continuar según timeline
2. Daily standups para sincronización
3. Code reviews en cada PR
4. Actualizar este documento con progreso

---

## 📚 DOCUMENTACIÓN GENERADA

Este plan se basa en análisis exhaustivo documentado en:

- **ARCHITECTURE.md** - Arquitectura actual y propuesta
- **ARCHITECTURE_ANALYSIS.md** - Análisis detallado
- **CODE_AUDIT_REPORT.md** - Auditoría de código
- **SECURITY_AUDIT.md** - Auditoría de seguridad
- **DUPLICATE_CODE_ANALYSIS.md** - Análisis de duplicación

Todos estos documentos están disponibles en el repositorio.

---

## ⚠️ RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|--------|-----------|
| Refactorización rompe features | Media | Alto | Code reviews exhaustivos, tests antes de cambios |
| Timeline se extiende | Media | Medio | Paralelizar tareas, daily standups |
| Conflictos de merge | Media | Medio | Feature branches, merge strategy clara |
| Falta de documentación | Baja | Medio | Documentar mientras se desarrolla |

---

## 📞 CONTACTO Y SOPORTE

Para preguntas sobre este plan:
- Revisar documentación en `docs/`
- Consultar con tech lead
- Crear issue en GitHub con etiqueta `[PLAN]`

---

**Última actualización:** Enero 14, 2026  
**Estado:** ✅ Listo para Ejecución
