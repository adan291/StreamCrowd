# Requirements Document

## Introduction

Refactorización del componente StreamActivity para separar responsabilidades siguiendo arquitectura hexagonal, y mejoras de UI para reducir la complejidad visual y mejorar la experiencia de usuario. El componente actual tiene ~3700 líneas mezclando lógica de negocio, llamadas a API, y UI.

## Glossary

- **StreamActivity**: Componente React que muestra actividad del stream (eventos, viewers, moderación)
- **ViewerService**: Servicio para gestionar datos de viewers y chatters
- **TwitchAPIService**: Servicio para llamadas a la API de Twitch (followers, subs, bits, clips, etc.)
- **ModerationActionService**: Servicio para acciones de moderación (ban, timeout, VIP)
- **EventFeed**: Subcomponente para mostrar el feed de eventos en tiempo real
- **ViewerPanel**: Subcomponente para gestionar y mostrar viewers/chatters
- **APIDataPanel**: Subcomponente para fetch y visualización de datos de API
- **ActivityStats**: Subcomponente para mostrar estadísticas de actividad

## Requirements

### Requirement 1: Extraer lógica de API de Twitch a servicio

**User Story:** Como desarrollador, quiero que las llamadas a la API de Twitch estén en un servicio separado, para que el componente solo se encargue de la presentación.

#### Acceptance Criteria

1. WHEN el sistema necesita obtener followers THEN THE TwitchAPIService SHALL proporcionar un método `getFollowers(broadcasterId, limit)` que retorne la lista de followers
2. WHEN el sistema necesita obtener subscribers THEN THE TwitchAPIService SHALL proporcionar un método `getSubscribers(broadcasterId, limit)` que retorne la lista de suscriptores
3. WHEN el sistema necesita obtener bits leaderboard THEN THE TwitchAPIService SHALL proporcionar un método `getBitsLeaderboard(broadcasterId, period)` que retorne el ranking de bits
4. WHEN el sistema necesita obtener clips THEN THE TwitchAPIService SHALL proporcionar un método `getClips(broadcasterId, dateRange)` que retorne los clips del canal
5. WHEN el sistema necesita obtener videos/VODs THEN THE TwitchAPIService SHALL proporcionar un método `getVideos(broadcasterId, type)` que retorne los videos del canal
6. WHEN el sistema necesita obtener moderadores THEN THE TwitchAPIService SHALL proporcionar un método `getModerators(broadcasterId)` que retorne la lista de mods
7. WHEN el sistema necesita obtener VIPs THEN THE TwitchAPIService SHALL proporcionar un método `getVIPs(broadcasterId)` que retorne la lista de VIPs
8. WHEN el sistema necesita obtener chatters en vivo THEN THE TwitchAPIService SHALL proporcionar un método `getChatters(broadcasterId)` que retorne los usuarios en el chat
9. IF una llamada a la API falla THEN THE TwitchAPIService SHALL retornar un error estructurado con código, mensaje y solución sugerida

### Requirement 2: Extraer lógica de moderación a servicio

**User Story:** Como desarrollador, quiero que las acciones de moderación estén en un servicio separado, para reutilizarlas en diferentes componentes.

#### Acceptance Criteria

1. WHEN un moderador quiere hacer timeout a un usuario THEN THE ModerationActionService SHALL proporcionar un método `timeoutUser(broadcasterId, userId, duration, reason)` que ejecute el timeout
2. WHEN un moderador quiere banear a un usuario THEN THE ModerationActionService SHALL proporcionar un método `banUser(broadcasterId, userId, reason)` que ejecute el ban permanente
3. WHEN un moderador quiere desbanear a un usuario THEN THE ModerationActionService SHALL proporcionar un método `unbanUser(broadcasterId, userId)` que remueva el ban
4. WHEN un broadcaster quiere dar VIP a un usuario THEN THE ModerationActionService SHALL proporcionar un método `addVIP(broadcasterId, userId)` que otorgue el VIP
5. WHEN un broadcaster quiere quitar VIP a un usuario THEN THE ModerationActionService SHALL proporcionar un método `removeVIP(broadcasterId, userId)` que remueva el VIP
6. WHEN un broadcaster quiere enviar un anuncio THEN THE ModerationActionService SHALL proporcionar un método `sendAnnouncement(broadcasterId, message, color)` que envíe el anuncio al chat

### Requirement 3: Extraer gestión de viewers a servicio

**User Story:** Como desarrollador, quiero que la lógica de agregación de datos de viewers esté en un servicio, para separar la lógica de negocio de la presentación.

#### Acceptance Criteria

1. WHEN el sistema procesa eventos de stream THEN THE ViewerService SHALL agregar datos por usuario (follows, subs, bits, bans, etc.)
2. WHEN se solicitan datos de un viewer THEN THE ViewerService SHALL retornar el historial completo de actividad del usuario
3. WHEN se solicita la lista de viewers THEN THE ViewerService SHALL permitir ordenar por actividad, bits, subs o sanciones
4. WHEN se solicita buscar viewers THEN THE ViewerService SHALL filtrar por nombre de usuario
5. WHEN se añade un evento THEN THE ViewerService SHALL actualizar las estadísticas del viewer correspondiente

### Requirement 4: Dividir componente en subcomponentes

**User Story:** Como desarrollador, quiero que StreamActivity esté dividido en subcomponentes más pequeños, para mejorar la mantenibilidad y legibilidad.

#### Acceptance Criteria

1. THE StreamActivity component SHALL delegar la visualización del feed de eventos a un subcomponente EventFeed
2. THE StreamActivity component SHALL delegar la gestión de viewers a un subcomponente ViewerPanel
3. THE StreamActivity component SHALL delegar el fetch de datos de API a un subcomponente APIDataPanel
4. THE StreamActivity component SHALL delegar las estadísticas a un subcomponente ActivityStats
5. WHEN se cambia de tab THEN THE StreamActivity component SHALL mostrar solo el subcomponente correspondiente
6. THE StreamActivity component SHALL mantener menos de 500 líneas de código después del refactor

### Requirement 5: Mejorar UI del feed de eventos

**User Story:** Como streamer, quiero que el feed de eventos sea más limpio y fácil de leer, para poder seguir la actividad sin sentirme abrumado.

#### Acceptance Criteria

1. WHEN hay múltiples eventos del mismo tipo en un corto período THEN THE EventFeed SHALL agruparlos visualmente (ej: "5 follows en los últimos 2 min")
2. WHEN se muestra un evento THEN THE EventFeed SHALL usar animaciones suaves de entrada
3. THE EventFeed SHALL mostrar filtros como chips horizontales scrolleables en lugar de botones pequeños
4. WHEN no hay eventos THEN THE EventFeed SHALL mostrar un estado vacío amigable con ilustración
5. THE EventFeed SHALL permitir pausar el auto-scroll con un botón flotante visible

### Requirement 6: Mejorar UI de estadísticas

**User Story:** Como streamer, quiero ver las estadísticas de forma más visual y clara, para entender rápidamente el estado de mi stream.

#### Acceptance Criteria

1. THE ActivityStats component SHALL mostrar las estadísticas principales en cards grandes con iconos
2. THE ActivityStats component SHALL usar barras de progreso o mini-gráficos para comparar valores
3. WHEN hay muchas estadísticas THEN THE ActivityStats component SHALL colapsar las secundarias en un acordeón
4. THE ActivityStats component SHALL usar colores consistentes por tipo de evento (follows=verde, subs=morado, bits=ámbar, etc.)

### Requirement 7: Mejorar UI del panel de viewers

**User Story:** Como streamer, quiero gestionar viewers de forma más intuitiva, con acciones de moderación accesibles pero no intrusivas.

#### Acceptance Criteria

1. THE ViewerPanel SHALL separar claramente las tabs de "En vivo" y "Historial"
2. WHEN se muestran acciones de moderación THEN THE ViewerPanel SHALL mostrarlas en un drawer/modal en lugar de inline
3. THE ViewerPanel SHALL mostrar badges visuales para indicar estado del viewer (sub, VIP, mod, baneado)
4. WHEN se selecciona un viewer THEN THE ViewerPanel SHALL mostrar su perfil en un panel lateral o modal
5. THE ViewerPanel SHALL permitir búsqueda con debounce para evitar lag

### Requirement 8: Mejorar navegación entre secciones

**User Story:** Como streamer, quiero navegar entre las diferentes secciones de actividad de forma clara e intuitiva.

#### Acceptance Criteria

1. THE StreamActivity component SHALL usar tabs con iconos y labels claros
2. WHEN se cambia de tab THEN THE StreamActivity component SHALL mantener el estado de cada sección
3. THE StreamActivity component SHALL indicar visualmente qué tab tiene actividad nueva
4. THE StreamActivity component SHALL recordar el último tab seleccionado entre sesiones

