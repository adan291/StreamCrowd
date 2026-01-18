# Requisitos: Consolidación del Sistema i18n

## Descripción General
Reorganizar y optimizar el sistema de internacionalización (i18n) del proyecto para mejorar la mantenibilidad, reducir el tamaño del bundle y facilitar la adición de nuevas traducciones.

## Problema Actual
- Archivo `locales.ts` monolítico con ~4600 líneas
- Traducciones de comandos separadas en `commandEnhancementLocales.ts` sin integración completa
- Carga de todas las traducciones al inicio (sin lazy loading)
- Difícil mantenimiento y búsqueda de claves específicas

## Requisitos

### REQ-1: Modularización de Traducciones
**Como** desarrollador  
**Quiero** que las traducciones estén organizadas por módulo/feature  
**Para** facilitar el mantenimiento y la búsqueda de claves

**Criterios de Aceptación:**
- [ ] 1.1 Traducciones divididas en archivos por dominio (common, errors, macros, games, etc.)
- [ ] 1.2 Cada archivo de traducción no debe exceder 500 líneas
- [ ] 1.3 Estructura de carpetas clara: `i18n/locales/{locale}/{domain}.ts`
- [ ] 1.4 Índice central que combina todos los módulos

### REQ-2: Integración de Traducciones de Comandos
**Como** desarrollador  
**Quiero** que `commandEnhancementLocales.ts` esté integrado en el sistema principal  
**Para** tener un único punto de acceso a todas las traducciones

**Criterios de Aceptación:**
- [ ] 2.1 Traducciones de comandos integradas en la estructura modular
- [ ] 2.2 Tipos TypeScript unificados para todas las traducciones
- [ ] 2.3 Hook `useI18n` retorna todas las traducciones incluyendo comandos

### REQ-3: Lazy Loading de Traducciones
**Como** usuario  
**Quiero** que solo se carguen las traducciones necesarias  
**Para** reducir el tiempo de carga inicial

**Criterios de Aceptación:**
- [ ] 3.1 Traducciones comunes cargadas al inicio (~20% del total)
- [ ] 3.2 Traducciones específicas de features cargadas bajo demanda
- [ ] 3.3 Caché de traducciones cargadas para evitar re-fetching
- [ ] 3.4 Fallback a español si una traducción no está disponible

### REQ-4: Validación de Traducciones
**Como** desarrollador  
**Quiero** detectar traducciones faltantes o inconsistentes  
**Para** asegurar cobertura completa en todos los idiomas

**Criterios de Aceptación:**
- [ ] 4.1 Script de validación que compara claves entre idiomas
- [ ] 4.2 Reporte de claves faltantes en cada idioma
- [ ] 4.3 Integración con tests para detectar regresiones

### REQ-5: Mejoras de DX (Developer Experience)
**Como** desarrollador  
**Quiero** herramientas que faciliten trabajar con traducciones  
**Para** ser más productivo

**Criterios de Aceptación:**
- [ ] 5.1 Tipos TypeScript estrictos con autocompletado de claves
- [ ] 5.2 Función helper para interpolación de variables mejorada
- [ ] 5.3 Documentación de convenciones de naming

## Fuera de Alcance
- Agregar nuevos idiomas (solo ES/EN)
- Cambiar el framework de i18n (mantener React Context)
- Traducciones del lado del servidor

## Dependencias
- React Context API (existente)
- TypeScript (existente)
- Vite para code splitting (existente)

## Métricas de Éxito
- Reducción del bundle inicial de i18n en 60%+
- Tiempo de búsqueda de claves < 5 segundos
- 100% de cobertura de traducciones validada
