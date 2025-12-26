# Tareas: Migración a Arquitectura Hexagonal

## Estado: ✅ COMPLETADA (Fases 1-5)

## Resumen

La arquitectura hexagonal está implementada y lista para usar. El código legacy 
sigue funcionando en paralelo, permitiendo una migración gradual de componentes.

## Fase 1: Estructura Base ✅ COMPLETADA

- [x] Crear carpeta `src/domain/`
- [x] Crear `domain/entities/Poll.ts` - Entidad de encuesta
- [x] Crear `domain/entities/Vote.ts` - Entidad de voto y moderación
- [x] Crear `domain/ports/IChatProvider.ts` - Interfaz para chat
- [x] Crear `domain/ports/IOverlaySync.ts` - Interfaz para sync
- [x] Crear `domain/ports/IStorage.ts` - Interfaz para storage
- [x] Crear carpeta `src/infrastructure/`
- [x] Crear `infrastructure/adapters/TwitchAdapter.ts`
- [x] Crear `infrastructure/adapters/FirebaseSyncAdapter.ts`
- [x] Crear `infrastructure/adapters/LocalStorageAdapter.ts`
- [x] Crear `infrastructure/factories/ProviderFactory.ts`
- [x] Crear carpeta `src/application/`
- [x] Crear `application/services/ChatService.ts`
- [x] Crear documentación `ARCHITECTURE.md`

## Fase 2: Servicios de Aplicación ✅ COMPLETADA

- [x] Crear `application/services/PollService.ts` - Servicio de encuestas
- [x] Crear `application/services/GameService.ts` - Clase base para juegos
- [x] Crear `application/hooks/usePollService.ts` - Hook para encuestas
- [x] Crear `application/hooks/useGameService.ts` - Hook genérico para juegos

## Fase 3: Ejemplo de Migración de Juego ✅ COMPLETADA

- [x] Crear `application/games/HotPotatoService.ts` - Ejemplo de juego migrado
- [x] Documentar patrón de migración de juegos

## Fase 4: Migrar Juegos Restantes ✅ COMPLETADA

Todos los 13 servicios de juegos han sido creados:

- [x] TriviaBattle → TriviaBattleService ✅ (el más complejo: IA, categorías, streaks)
- [x] ChatFishing → ChatFishingService ✅
- [x] DuckHunt → DuckHuntService ✅
- [x] CasinoRoulette → CasinoRouletteService ✅
- [x] BattleshipGame → BattleshipService ✅
- [x] PiumGame → PiumService ✅
- [x] Ahorcado → AhorcadoService ✅
- [x] CarreraEmotes → CarreraService ✅
- [x] MemoriaIRL → MemoriaService ✅
- [x] PiedraPapelTijera → PPTService ✅
- [x] VeoVeo → VeoVeoService ✅
- [x] PartyCo → PartyCoService ✅
- [x] HotPotato → HotPotatoService ✅

**Servicios creados en `src/application/games/`:**
- HotPotatoService.ts
- CasinoRouletteService.ts
- AhorcadoService.ts
- PiumService.ts
- ChatFishingService.ts
- DuckHuntService.ts
- BattleshipService.ts
- CarreraService.ts
- MemoriaService.ts
- PPTService.ts
- VeoVeoService.ts
- PartyCoService.ts
- TriviaBattleService.ts

## Fase 5: Crear Hooks de Aplicación ✅ COMPLETADA

Hooks creados en `src/application/hooks/`:

- [x] `useChatService.ts` - Hook para ChatService (conexión multi-proveedor)
- [x] `usePollService.ts` - Hook para PollService (encuestas)
- [x] `useGameService.ts` - Hook genérico para cualquier servicio de juego
- [x] `index.ts` - Exporta todos los hooks

**Nota**: Los hooks legacy (`hooks/useTwitchConnection.ts`, `hooks/usePoll.ts`, etc.) 
siguen funcionando. Los nuevos hooks son una alternativa que usa la arquitectura hexagonal.
La migración de componentes a los nuevos hooks es opcional y puede hacerse gradualmente.

## Fase 6: Añadir Nuevos Proveedores (FUTURO)

- [ ] Crear `OBSWebSocketAdapter` (implements IOverlaySync)
- [ ] Crear `YouTubeAdapter` (implements IChatProvider)
- [ ] Crear `BroadcastChannelAdapter` (implements IOverlaySync)
- [ ] UI para seleccionar proveedores

## Notas de Migración

### Patrón para Migrar Juegos

1. Crear servicio en `src/application/games/[Nombre]Service.ts`
2. Extender `BaseGameService<TState>`
3. Definir estado específico del juego (interface que extiende BaseGameState)
4. Implementar `processGameMessage()` y `getOverlayData()`
5. Añadir métodos específicos del juego
6. Crear singleton getter

### Código Eliminado por Juego (~150 líneas)

Cada juego migrado elimina:
- Setup de BroadcastChannel (10 líneas)
- Sync con Firebase (15 líneas)
- Sync con localStorage (10 líneas)
- Gestión de jugadores (30 líneas)
- Procesamiento base de mensajes (20 líneas)
- Throttling de sync (15 líneas)
- Cleanup/dispose (10 líneas)

**Total estimado: ~150 líneas x 13 juegos = ~1950 líneas eliminadas**
