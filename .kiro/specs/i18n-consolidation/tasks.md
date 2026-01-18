# Tareas: Consolidación del Sistema i18n

## Fase 1: Preparación de Estructura

### 1. Crear estructura base
- [x] 1.1 Crear carpetas `i18n/locales/es/` y `i18n/locales/en/`
- [x] 1.2 Crear `i18n/types.ts` con tipos centralizados para todos los dominios
- [x] 1.3 Crear `i18n/utils.ts` con helpers mejorados (interpolate, formatters)

## Fase 2: División de Traducciones Español

### 2. Extraer módulos core (ES)
- [x] 2.1 Crear `i18n/locales/es/common.ts` - traducciones comunes (~100 claves)
- [x] 2.2 Crear `i18n/locales/es/errors.ts` - mensajes de error
- [x] 2.3 Crear `i18n/locales/es/navigation.ts` - navegación y menús

### 3. Extraer módulos de features (ES)
- [x] 3.1 Crear `i18n/locales/es/poll.ts` - encuestas y votaciones
- [x] 3.2 Crear `i18n/locales/es/games.ts` - juegos interactivos
- [x] 3.3 Crear `i18n/locales/es/giveaway.ts` - sorteos y rifas
- [x] 3.4 Crear `i18n/locales/es/macros.ts` - sistema de macros
- [x] 3.5 Crear `i18n/locales/es/commands.ts` - comandos (integrar commandEnhancementLocales)
- [x] 3.6 Crear `i18n/locales/es/predictions.ts` - predicciones Twitch
- [x] 3.7 Crear `i18n/locales/es/rewards.ts` - recompensas de canal
- [x] 3.8 Crear `i18n/locales/es/moderation.ts` - moderación
- [x] 3.9 Crear `i18n/locales/es/analytics.ts` - analíticas y métricas
- [x] 3.10 Crear `i18n/locales/es/overlay.ts` - overlays OBS
- [x] 3.11 Crear `i18n/locales/es/platforms.ts` - plataformas (Twitch, YouTube, Kick)
- [x] 3.12 Crear `i18n/locales/es/misc.ts` - mascota, chat, colaboración, etc.
- [x] 3.13 Crear `i18n/locales/es/index.ts` - índice que combina todos los módulos

## Fase 3: División de Traducciones Inglés

### 4. Extraer módulos (EN)
- [x] 4.1 Crear `i18n/locales/en/common.ts`
- [x] 4.2 Crear `i18n/locales/en/errors.ts`
- [x] 4.3 Crear `i18n/locales/en/navigation.ts`
- [x] 4.4 Crear `i18n/locales/en/poll.ts`
- [x] 4.5 Crear `i18n/locales/en/games.ts`
- [x] 4.6 Crear `i18n/locales/en/giveaway.ts`
- [x] 4.7 Crear `i18n/locales/en/macros.ts`
- [x] 4.8 Crear `i18n/locales/en/commands.ts`
- [x] 4.9 Crear `i18n/locales/en/predictions.ts`
- [x] 4.10 Crear `i18n/locales/en/rewards.ts`
- [x] 4.11 Crear `i18n/locales/en/moderation.ts`
- [x] 4.12 Crear `i18n/locales/en/analytics.ts`
- [x] 4.13 Crear `i18n/locales/en/overlay.ts`
- [x] 4.14 Crear `i18n/locales/en/platforms.ts`
- [x] 4.15 Crear `i18n/locales/en/misc.ts`
- [x] 4.16 Crear `i18n/locales/en/index.ts`

## Fase 4: Integración del Sistema

### 5. Actualizar sistema central
- [x] 5.1 Crear `i18n/locales/index.ts` - índice principal que combina ES y EN
- [x] 5.2 Actualizar `i18n/context.tsx` - implementar lazy loading de módulos
- [x] 5.3 Crear hook `useTranslationModule` para carga bajo demanda
- [x] 5.4 Actualizar `i18n/index.ts` - exports públicos actualizados

### 6. Eliminar archivos obsoletos
- [x] 6.1 Eliminar `i18n/locales.ts` (archivo monolítico original)
- [x] 6.2 Eliminar `i18n/commandEnhancementLocales.ts` (integrado en commands.ts)

## Fase 5: Validación y Testing

### 7. Implementar validación
- [x] 7.1 Crear `i18n/validation.ts` - script de validación de traducciones
- [x] 7.2 Crear `tests/i18n/validation.test.ts` - tests de completitud

### 8. Tests de propiedad (PBT)
- [x] 8.1 Test P1: Completitud - toda clave ES existe en EN
  - **Validates: Design P1**
- [x] 8.2 Test P3: Interpolación - variables se reemplazan correctamente
  - **Validates: Design P3**

## Fase 6: Documentación y Limpieza

### 9. Documentación
- [x] 9.1 Crear `i18n/README.md` con convenciones de naming y guía de uso
- [x] 9.2 Actualizar componentes que usan traducciones para usar lazy loading

### 10. Verificación final
- [x] 10.1 Ejecutar build y verificar que no hay errores de tipos
- [x] 10.2 Verificar que todos los tests pasan
- [x] 10.3 Verificar reducción del bundle inicial

## Notas de Implementación

### Convenciones de Naming
- Claves en camelCase: `buttonSave`, `errorNetwork`
- Namespaces con punto: `errors.network.timeout`
- Plurales con sufijo: `item`, `items`

### Estado Actual (Enero 17, 2026)
- ✅ **Arquitectura Core Completada**: Chat translations movidas de `misc` a `common` para acceso inmediato
- ⚠️ **Refactoring Pendiente**: Algunos componentes acceden directamente a traducciones (ej: `t.timers.title`) en lugar de usar el módulo misc (`t.misc.timers.title`)
- ✅ **Validación**: Todos los tests de completitud y property-based tests pasan correctamente
- ✅ **TypeScript**: Interfaces actualizadas para reflejar la nueva estructura

### Orden de Ejecución
1. Fases 1-3 pueden ejecutarse en paralelo parcialmente
2. Fase 4 requiere que Fases 2-3 estén completas
3. Fase 5 requiere Fase 4 completa
4. Fase 6 es la última

### Dependencias entre Tareas
- 5.1 depende de 3.13 y 4.16
- 5.2 depende de 5.1
- 6.1 y 6.2 dependen de 5.4
- 7.x depende de 5.4
- 8.x depende de 7.1
