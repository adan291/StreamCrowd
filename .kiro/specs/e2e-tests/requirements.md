# Requirements: Tests E2E con Playwright

## Overview
Implementar suite completa de tests end-to-end usando Playwright para validar flujos críticos de la aplicación.

## Functional Requirements

### 1. Configuración de Playwright
- 1.1 Setup de Playwright con TypeScript
- 1.2 Configuración de browsers (Chromium, Firefox, WebKit)
- 1.3 Configuración de viewports (desktop, tablet, mobile)
- 1.4 Setup de reporters (HTML, JSON, JUnit)
- 1.5 Integración con CI/CD

### 2. Tests de Autenticación
- 2.1 Test: Login con Twitch OAuth (mock)
- 2.2 Test: Logout y limpieza de sesión
- 2.3 Test: Persistencia de sesión
- 2.4 Test: Manejo de token expirado

### 3. Tests de Polls
- 3.1 Test: Crear poll con opciones
- 3.2 Test: Votar en poll activo
- 3.3 Test: Cerrar poll y ver resultados
- 3.4 Test: Editar poll antes de iniciar
- 3.5 Test: Historial de polls

### 4. Tests de Predictions
- 4.1 Test: Crear prediction con outcomes
- 4.2 Test: Apostar en prediction
- 4.3 Test: Resolver prediction
- 4.4 Test: Cancelar y reembolsar
- 4.5 Test: Historial de predictions

### 5. Tests de Giveaways
- 5.1 Test: Crear giveaway
- 5.2 Test: Participantes se registran
- 5.3 Test: Seleccionar ganador aleatorio
- 5.4 Test: Re-roll de ganador
- 5.5 Test: Múltiples ganadores

### 6. Tests de Timers
- 6.1 Test: Crear y iniciar timer
- 6.2 Test: Pausar y reanudar
- 6.3 Test: Timer llega a cero
- 6.4 Test: Countdown con alertas

### 7. Tests de OBS Integration
- 7.1 Test: Conexión con OBS (mock WebSocket)
- 7.2 Test: Cambio de escenas
- 7.3 Test: Overlay URLs funcionan
- 7.4 Test: Reconexión automática

### 8. Tests de Colaboración
- 8.1 Test: Crear sesión colaborativa
- 8.2 Test: Unirse con código
- 8.3 Test: Sincronización de acciones
- 8.4 Test: Chat entre moderadores
- 8.5 Test: Permisos por rol

### 9. Tests de Macros
- 9.1 Test: Crear macro con trigger
- 9.2 Test: Ejecutar macro manualmente
- 9.3 Test: Trigger automático funciona
- 9.4 Test: Condiciones se evalúan

### 10. Tests de Responsive
- 10.1 Test: Layout en desktop (1920x1080)
- 10.2 Test: Layout en tablet (768x1024)
- 10.3 Test: Layout en móvil (375x667)
- 10.4 Test: Navegación táctil

### 11. Tests de Accesibilidad
- 11.1 Test: Navegación por teclado
- 11.2 Test: Contraste de colores
- 11.3 Test: Aria labels presentes
- 11.4 Test: Focus management

### 12. Tests de Performance
- 12.1 Test: Tiempo de carga inicial
- 12.2 Test: Tiempo de respuesta de acciones
- 12.3 Test: Memory leaks en navegación
- 12.4 Test: Bundle size

## Non-Functional Requirements

### Cobertura
- Flujos críticos: 100%
- Flujos secundarios: 80%
- Edge cases documentados

### Ejecución
- Tests paralelos para velocidad
- Retries automáticos (2 intentos)
- Screenshots en fallos
- Videos de tests fallidos

### CI/CD
- Ejecutar en cada PR
- Bloquear merge si fallan tests críticos
- Reportes automáticos

### Mantenibilidad
- Page Object Model
- Fixtures reutilizables
- Data factories para test data
- Documentación de tests

## Out of Scope
- Tests de carga/stress
- Tests de seguridad/penetración
- Tests de APIs externas reales (usar mocks)
