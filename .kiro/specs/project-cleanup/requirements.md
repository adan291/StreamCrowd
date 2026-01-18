# Requirements: Project Cleanup

## Overview

Realizar una limpieza profunda del proyecto StreamCrowd para eliminar código duplicado, archivos obsoletos, dependencias innecesarias y mejorar la organización general del código.

**Priority:** HIGH  
**Estimated Effort:** 2-3 días  
**Dependencies:** Ninguna (puede ejecutarse en paralelo)

---

## Requirements

### REQ-1: Eliminar Context API Obsoleto

**User Story:**  
Como desarrollador, quiero eliminar todos los archivos de Context API que ya no se usan después de la migración a Redux, para reducir confusión y mantener el código limpio.

**Acceptance Criteria:**
- [x] 1.1 ThemeContext, I18nContext y CollaborationContext se mantienen (son válidos)
- [ ] 1.2 Verificar que no existan otros Context files obsoletos
- [ ] 1.3 Eliminar imports de Context obsoletos
- [ ] 1.4 Actualizar documentación si es necesario

**Validation:**
- Búsqueda de "createContext" no encuentra Context obsoletos
- Todos los tests pasan después de la limpieza

---

### REQ-2: Consolidar Estructura de Componentes

**User Story:**  
Como desarrollador, quiero tener una única ubicación para componentes, para evitar confusión sobre dónde crear nuevos componentes.

**Acceptance Criteria:**
- [ ] 2.1 Decidir estructura final: `components/` vs `src/presentation/components/`
- [ ] 2.2 Mover todos los componentes a la ubicación elegida
- [ ] 2.3 Actualizar todos los imports en el proyecto
- [ ] 2.4 Eliminar carpeta vacía
- [ ] 2.5 Actualizar tsconfig.json si es necesario

**Validation:**
- Solo existe una carpeta de componentes
- Todos los imports funcionan correctamente
- Build pasa sin errores

---

### REQ-3: Limpiar Dependencias Innecesarias

**User Story:**  
Como desarrollador, quiero eliminar dependencias que no se usan, para reducir el tamaño del bundle y mejorar los tiempos de instalación.

**Acceptance Criteria:**
- [ ] 3.1 Ejecutar análisis de dependencias no usadas
- [ ] 3.2 Identificar dependencias candidatas a eliminar
- [ ] 3.3 Verificar que no se usan en el código
- [ ] 3.4 Eliminar dependencias confirmadas como innecesarias
- [ ] 3.5 Actualizar package.json
- [ ] 3.6 Ejecutar npm audit y resolver vulnerabilidades

**Validation:**
- npm audit no muestra vulnerabilidades críticas
- Bundle size reducido
- Todos los tests pasan

---

### REQ-4: Limpiar Archivos de Documentación Temporales

**User Story:**  
Como desarrollador, quiero organizar la documentación y eliminar archivos temporales, para tener una documentación clara y accesible.

**Acceptance Criteria:**
- [ ] 4.1 Identificar archivos de documentación duplicados
- [ ] 4.2 Consolidar documentación en `docs/`
- [ ] 4.3 Eliminar archivos TASK_* obsoletos (mantener solo los relevantes)
- [ ] 4.4 Crear índice de documentación actualizado
- [ ] 4.5 Mover archivos de análisis a carpeta `docs/archive/`

**Validation:**
- Documentación organizada en `docs/`
- Índice actualizado y funcional
- Archivos temporales eliminados

---

### REQ-5: Eliminar Código Duplicado

**User Story:**  
Como desarrollador, quiero eliminar código duplicado, para mejorar la mantenibilidad y reducir bugs.

**Acceptance Criteria:**
- [ ] 5.1 Ejecutar análisis de código duplicado
- [ ] 5.2 Identificar funciones/componentes duplicados
- [ ] 5.3 Extraer código común a utilidades compartidas
- [ ] 5.4 Actualizar referencias al código duplicado
- [ ] 5.5 Eliminar código duplicado

**Validation:**
- Análisis de código duplicado muestra <5% duplicación
- Todos los tests pasan

---

### REQ-6: Limpiar Archivos de Build y Temporales

**User Story:**  
Como desarrollador, quiero eliminar archivos de build y temporales del repositorio, para mantener el repo limpio.

**Acceptance Criteria:**
- [ ] 6.1 Verificar .gitignore incluye todos los archivos temporales
- [ ] 6.2 Eliminar archivos de build del repositorio
- [ ] 6.3 Eliminar node_modules si está en el repo
- [ ] 6.4 Limpiar carpetas dist/, build/, .cache/
- [ ] 6.5 Actualizar .gitignore si es necesario

**Validation:**
- git status no muestra archivos temporales
- .gitignore actualizado

---

### REQ-7: Organizar Archivos de Configuración

**User Story:**  
Como desarrollador, quiero tener todos los archivos de configuración organizados, para encontrarlos fácilmente.

**Acceptance Criteria:**
- [ ] 7.1 Mover archivos de configuración a raíz o carpeta config/
- [ ] 7.2 Consolidar archivos de configuración similares
- [ ] 7.3 Documentar propósito de cada archivo de configuración
- [ ] 7.4 Eliminar configuraciones duplicadas

**Validation:**
- Archivos de configuración organizados
- Documentación actualizada

---

### REQ-8: Limpiar Imports No Usados

**User Story:**  
Como desarrollador, quiero eliminar imports no usados, para mejorar la legibilidad del código.

**Acceptance Criteria:**
- [ ] 8.1 Ejecutar ESLint con regla de imports no usados
- [ ] 8.2 Eliminar imports no usados automáticamente
- [ ] 8.3 Verificar que el código sigue funcionando
- [ ] 8.4 Configurar ESLint para prevenir imports no usados

**Validation:**
- ESLint no reporta imports no usados
- Todos los tests pasan

---

### REQ-9: Consolidar Tipos y Interfaces

**User Story:**  
Como desarrollador, quiero tener tipos e interfaces organizados en un solo lugar, para evitar duplicación y mejorar reutilización.

**Acceptance Criteria:**
- [ ] 9.1 Identificar tipos duplicados
- [ ] 9.2 Consolidar tipos en `types/` o `src/domain/`
- [ ] 9.3 Eliminar tipos duplicados
- [ ] 9.4 Actualizar imports de tipos
- [ ] 9.5 Documentar convención de tipos

**Validation:**
- No hay tipos duplicados
- TypeScript compila sin errores

---

### REQ-10: Actualizar README y Documentación Principal

**User Story:**  
Como desarrollador nuevo, quiero tener un README claro y actualizado, para entender rápidamente el proyecto.

**Acceptance Criteria:**
- [ ] 10.1 Actualizar README.md con estructura actual
- [ ] 10.2 Documentar scripts de npm disponibles
- [ ] 10.3 Actualizar guía de instalación
- [ ] 10.4 Documentar arquitectura actual (Redux, hexagonal)
- [ ] 10.5 Añadir badges de estado (tests, build, etc.)

**Validation:**
- README actualizado y claro
- Nuevo desarrollador puede seguir las instrucciones

---

## Success Criteria

- ✅ Código duplicado reducido a <5%
- ✅ Dependencias innecesarias eliminadas
- ✅ Bundle size reducido en 10-15%
- ✅ Documentación organizada y actualizada
- ✅ Estructura de carpetas clara y consistente
- ✅ Todos los tests pasan
- ✅ Build exitoso sin warnings
- ✅ ESLint sin errores

---

## Out of Scope

- Refactorización de lógica de negocio
- Cambios en la arquitectura
- Nuevas features
- Optimizaciones de performance (eso es otro spec)

---

## Dependencies

- Ninguna - puede ejecutarse en paralelo con otros specs

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Romper imports al mover archivos | Alto | Tests exhaustivos después de cada cambio |
| Eliminar código que sí se usa | Alto | Análisis cuidadoso antes de eliminar |
| Conflictos con otros developers | Medio | Comunicar cambios, hacer en branch separado |

---

## Notes

- Hacer commits frecuentes para poder revertir si algo falla
- Ejecutar tests después de cada cambio significativo
- Documentar decisiones importantes en este archivo
