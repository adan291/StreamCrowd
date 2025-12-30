# Custom Commands Enhancement - Requirements

## Overview
Mejorar el sistema de comandos personalizados con plantillas predefinidas, un editor visual drag-and-drop, integración con IA para análisis y generación de comandos.

## User Stories

### US-1: Comandos Predefinidos
**Como** streamer  
**Quiero** tener acceso a una biblioteca de comandos predefinidos  
**Para** configurar rápidamente comandos comunes sin tener que crearlos desde cero

**Acceptance Criteria:**
- AC1.1: Existe una sección "Plantillas" con comandos predefinidos organizados por categoría
- AC1.2: Las categorías incluyen: Información, Redes Sociales, Entretenimiento, Moderación, Utilidades
- AC1.3: Cada plantilla muestra nombre, descripción, trigger sugerido y preview de respuesta
- AC1.4: El usuario puede agregar una plantilla con un clic, personalizando solo los valores necesarios
- AC1.5: Las plantillas incluyen variables predefinidas que el usuario puede modificar
- AC1.6: Mínimo 20 plantillas predefinidas disponibles

### US-2: Editor Visual Drag-and-Drop
**Como** streamer sin conocimientos técnicos  
**Quiero** crear comandos arrastrando bloques visuales  
**Para** construir respuestas complejas sin escribir código

**Acceptance Criteria:**
- AC2.1: Existe un modo "Editor Visual" alternativo al editor de texto
- AC2.2: Los bloques disponibles incluyen: Texto, Variable, Condicional, API
- AC2.3: Los bloques se pueden arrastrar desde un panel lateral al área de construcción
- AC2.4: Los bloques se pueden reordenar arrastrándolos
- AC2.5: Cada bloque tiene configuración inline (ej: seleccionar variable, escribir texto)
- AC2.6: Preview en tiempo real del resultado del comando
- AC2.7: Conversión bidireccional entre modo visual y modo texto
- AC2.8: Los bloques de variable muestran descripción al hacer hover

### US-3: Análisis de Comandos con IA
**Como** streamer  
**Quiero** que la IA analice mis comandos existentes  
**Para** obtener sugerencias de mejora y detectar problemas

**Acceptance Criteria:**
- AC3.1: Botón "Analizar con IA" disponible en la sección de comandos
- AC3.2: La IA analiza todos los comandos activos del usuario
- AC3.3: El análisis incluye: comandos duplicados, triggers similares, respuestas muy largas
- AC3.4: Sugerencias de optimización (ej: combinar comandos similares)
- AC3.5: Detección de comandos poco usados o redundantes
- AC3.6: Recomendaciones de nuevos comandos basados en el contenido del canal
- AC3.7: El análisis se muestra en la sección "Datos" junto con otras métricas de IA

### US-4: Generación de Comandos con IA
**Como** streamer  
**Quiero** describir un comando en lenguaje natural  
**Para** que la IA genere el comando automáticamente

**Acceptance Criteria:**
- AC4.1: Campo de texto "Describe tu comando" en el formulario de creación
- AC4.2: Botón "Generar con IA" que procesa la descripción
- AC4.3: La IA genera: trigger sugerido, respuesta con variables apropiadas, configuración recomendada
- AC4.4: El usuario puede editar el resultado antes de guardar
- AC4.5: Historial de comandos generados por IA para referencia
- AC4.6: Ejemplos de prompts sugeridos para guiar al usuario
- AC4.7: La IA considera el contexto del canal (juegos, estilo, audiencia)

### US-5: Categorización y Organización
**Como** streamer con muchos comandos  
**Quiero** organizar mis comandos en carpetas/categorías  
**Para** encontrarlos y gestionarlos más fácilmente

**Acceptance Criteria:**
- AC5.1: Los comandos se pueden asignar a categorías personalizadas
- AC5.2: Vista de lista con filtro por categoría
- AC5.3: Categorías predefinidas: General, Información, Social, Juegos, Moderación, Otros
- AC5.4: El usuario puede crear categorías personalizadas
- AC5.5: Drag-and-drop para mover comandos entre categorías
- AC5.6: Contador de comandos por categoría
- AC5.7: Búsqueda global que incluye trigger, respuesta y descripción

### US-6: Testing y Preview de Comandos
**Como** streamer  
**Quiero** probar mis comandos antes de activarlos  
**Para** asegurarme de que funcionan correctamente

**Acceptance Criteria:**
- AC6.1: Botón "Probar" en cada comando que simula su ejecución
- AC6.2: El test muestra el resultado con variables reemplazadas por valores de ejemplo
- AC6.3: Simulación de diferentes usuarios (viewer, sub, mod, broadcaster)
- AC6.4: Simulación con diferentes argumentos
- AC6.5: Validación de sintaxis de variables antes de guardar
- AC6.6: Advertencias para comandos con APIs externas no accesibles

## Technical Requirements

### TR-1: Persistencia
- Los comandos se guardan en localStorage con backup automático
- Exportación/importación en formato JSON compatible con el sistema actual
- Sincronización opcional con la nube (futuro)

### TR-2: Performance
- El editor visual debe ser fluido con hasta 50 bloques
- La búsqueda debe ser instantánea con hasta 500 comandos
- Las llamadas a IA deben mostrar estado de carga

### TR-3: Accesibilidad
- El editor drag-and-drop debe ser usable con teclado
- Todos los elementos deben tener labels apropiados
- Soporte para lectores de pantalla

### TR-4: Integración IA
- Usar el servicio de IA existente (AIAnalyticsService)
- Rate limiting para evitar abuso de la API
- Fallback graceful si la IA no está disponible

## Out of Scope
- Ejecución real de comandos (solo preview/test)
- Integración con bots externos (Nightbot, StreamElements)
- Comandos con lógica de programación compleja (loops, funciones)
- Marketplace de comandos compartidos
