# Revisión técnica y roadmap hasta "100 % funcional"

Fecha: 25 de octubre de 2026. Alcance: todo el repositorio (776 ficheros .ts/.tsx).

## 1. Estado real medido

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores, **pero solo porque faltan `@types/react` y `@types/react-dom`**: todo JSX y todos los hooks se tipan como `any`. Con los tipos instalados aparecen **75 errores en 36 ficheros** (89 antes de esta revisión). |
| `npm test` (Vitest) | 2153 / 2157 pasan. Fallan 4 de `ComponentLineCount.test.ts` (límites de líneas de GiveawayHub, RaffleTab, useThreads). En la primera ejecución fallaron además 3 tests de propiedades (`useFavoriteScenes`, `OBSService`, `ViewerService`) que en la segunda pasaron: son **intermitentes**. |
| `npm run build` | Compila. El chunk principal `index-*.js` pesa **1,41 MB (353 kB gzip)** y cada overlay de OBS lo descarga entero. |
| CI (`.github/workflows/e2e.yml`) | Solo ejecuta E2E. No ejecuta `tsc` ni los tests unitarios. |
| `npm run electron:*` | **Roto**: `electron/main.cjs` no existe y la carpeta `electron/` está en `.gitignore`. |
| Repositorio | 186 ficheros de artefactos versionados (`playwright-report/`, `test-results/`, JSON de informes). `CODE_AUDIT_REPORT.md` está versionado y contiene client IDs y la API key de Firebase. |
| Logging | `LoggerService` existe pero nadie lo importa; hay ~510 llamadas `console.*`. |

Los documentos existentes (`ROADMAP.md`, `HEXAGONAL_MIGRATION_PLAN.md`) marcan todo como completado. Varias funciones listadas como terminadas son stubs o no pueden funcionar sin servidor (sección 4).

## Avance (quinta tanda)

- El procesador de chat (lista de mensajes, macros, analítica, comandos `!poll`/`!endpoll`/`!resetpoll`/`!pollsync`/`!pollend` y votos) sale de `App.tsx` a `hooks/useChatMessageProcessor.ts`. El análisis de comandos y la detección de votos son funciones puras en `src/application/utils/chatPollCommands.ts`, con tests (antes no tenían ninguno). `App.tsx` pasa de 1916 a 1689 líneas.
- `TwitchPredictionService` ya no escribe en la consola los 10 primeros caracteres del token.
- `CODE_AUDIT_REPORT.md`: credenciales redactadas. Siguen en el historial de git, así que la API key de Firebase hay que rotarla igualmente.
- Vitest 1875/1875, E2E 165/165, `tsc` 0 errores, build correcto.

## Avance (cuarta tanda): reglas en CI y robustez en directo

Estado: `tsc` 0 errores; Vitest 1868/1868; E2E Chromium 165/165; reglas 43/43 (`npm run test:rules`); build correcto.

| Área | Cambio |
|---|---|
| Reglas en CI | `tests/firebase-rules/run-rules-tests.mjs` + `firebase.json` + job `firebase-rules` en `ci.yml` (Java 21 + emulador). Comprueba 43 casos de acceso. Las reglas anteriores fallan 17 de ellos, así que el test detecta una regresión de seguridad. |
| Helix 429/401 | `src/infrastructure/http/helixFetch.ts` sustituye a `fetch` en las 66 llamadas a Helix (TwitchAdapter, servicios de API, encuestas, predicciones, recompensas, moderación, canales moderados, sorteos). Ante 429 espera hasta `Ratelimit-Reset` (máx. 2 reintentos, 10 s). Ante 401 con el token del usuario confirma con `/oauth2/validate` (Twitch también usa 401 para scopes que faltan) y muestra un aviso con botón "Iniciar sesión". Los 401 del token del broadcaster no cierran la sesión del moderador. Las encuestas, predicciones y recompensas ya no repiten los 429 por su cuenta. |
| Overlays | Los 13 overlays de juegos ya no leen `localStorage` cada 100–300 ms: escuchan el evento `storage`. Antes podían reaplicar un estado antiguo sobre uno más reciente. |
| PartyCo | El dibujo ya no se guarda en `localStorage`: un PNG en base64 agotaba la cuota de ~5 MB y hacía fallar el resto de guardados. |
| Historial de eventos | Si se llena la cuota, se descartan las sesiones más antiguas y se reintenta, en lugar de dejar de guardar en silencio. |
| Copias de seguridad | Una clave corrupta en `localStorage` ya no aborta la copia entera. |
| Macros | Importar macros exportadas renombraba las que solo se diferenciaban en mayúsculas ("J" / "j"). Lo detectó un test intermitente. |

## Avance (tercera tanda): decisiones tomadas

Estado: `tsc` 0 errores; Vitest **1868/1868**; E2E Chromium **165/165**; build correcto; reglas de Firebase **42/42** casos en el emulador oficial (con las reglas anteriores fallaban 17 de esos casos).

| Decisión | Qué se hizo y por qué |
|---|---|
| **Backend mínimo: sí** | `api/firebase-token.ts` (función de Vercel). Valida el token de Twitch con `id.twitch.tv/oauth2/validate`, comprueba que se emitió para **nuestro** client id y devuelve un custom token de Firebase (`uid = twitch:<id>`, claim `twitchId`). Antes todos los clientes eran anónimos y las reglas no podían distinguir a un streamer de cualquier visitante. |
| **Reglas de Firebase reescritas** | Solo el streamer verificado escribe `broadcaster_tokens`, `streamers/<id>/profile` y `sorteos`. Leen el token él y los moderadores de `channel_moderators/<id>`, una lista que publica el propio streamer desde Helix ("Get Moderators"). Antes esa lista no existía, así que la función de moderadores nunca funcionó. Los tokens de YouTube/Kick quedan ligados a la cuenta de Twitch que los guardó. |
| **Overlays entre navegadores** | Las URLs de overlay llevan `&owner=<uid>`. Antes OBS (otro navegador) leía `overlays/<su propio uid anónimo>`, donde nadie escribe, y la sincronización por Firebase nunca funcionaba fuera del mismo navegador. Además, desuscribirse de un overlay quitaba también los listeners de los demás componentes en la misma ruta. |
| **Electron: retirado** | `electron/main.cjs` nunca estuvo en `main` (solo en una rama) y solo cargaba la web. La PWA instalable cubre ese uso. Se quitan 4 dependencias (287 paquetes), los scripts y `EJECUTABLE.md`. |
| **Código muerto: eliminado (297 ficheros)** | Colaboración por WebSocket (sin servidor), API REST de cliente (sin servidor), "servidor móvil" (un navegador no puede abrir un puerto), 13 servicios de juegos duplicados que ningún componente usaba y ~35 componentes nunca importados, con sus tests. Todo sigue en el historial de git. |
| **Límites de líneas: se cumplen, no se relajan** | Extraídos `GiveawayTabBar`, `GiveawayDialogs`, `RaffleStatus` y `hooks/threadHelpers` (GiveawayHub 1725 → 1544, RaffleTab 768 → 741, useThreads 516 → 482). |
| **Secreto en el bundle** | `vite.config.ts` inyectaba `GEMINI_API_KEY` en el JavaScript público (y nadie lo usaba). Eliminado. Nuevo `.env.example` con todas las variables, separando cliente y servidor. |

### Pasos que solo puedes hacer tú (despliegue)
1. Firebase Console → Authentication → activar **Anónimo**.
2. Firebase Console → Configuración → Cuentas de servicio → generar clave. En Vercel, definir `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` (y `TWITCH_CLIENT_ID` si no está `VITE_TWITCH_CLIENT_ID`).
3. Publicar `firebase-rules.json` (Realtime Database → Reglas).
4. Rotar la API key de Firebase que aparece en `CODE_AUDIT_REPORT.md`, restringirla por dominio y borrar ese bloque del documento.
5. Después de desplegar, cada streamer debe volver a autorizar la app una vez: su token anterior se guardó sin identidad verificada.

### Lo que queda (roadmap restante)
- **App móvil (`mobile/`)**: la interfaz existe, pero dependía del servidor móvil eliminado. Para que funcione hay que reescribir el transporte sobre Firebase (`overlays/<owner>` + comandos), con los mismos permisos de moderador.
- **Colaboración multi-moderador**: igual que el móvil, se puede rehacer sobre Firebase con `channel_moderators`.
- **YouTube / Kick**: OAuth de YouTube necesita intercambio de código en servidor (ya hay patrón en `api/`). Kick sigue sin API oficial.
- **Fase 3 de robustez** (sondeo de `localStorage` en overlays, historial en IndexedDB, wrapper Helix 401/429) y la división de `App.tsx`.

## Avance (segunda tanda, 25/10/2026)

Estado tras esta tanda: `tsc` con los tipos de React **0 errores**; Vitest 2153/2157 (solo fallan los 4 tests de número de líneas); E2E en Chromium 165/165 (con la máquina cargada, 2 tests de `a11y.spec.ts` dieron timeout y pasaron al repetirlos solos); build correcto.

| Roadmap | Hecho |
|---|---|
| Fase 0 | `TokenStorage` v2: clave AES-GCM aleatoria, no extraíble, en IndexedDB; un IV por cifrado; error al fallar el descifrado; migración automática del formato v1. |
| Fase 0 | `new Function` sustituido por un parser aritmético propio (`src/application/utils/mathExpression.ts`). CSP sin `unsafe-eval`, con los orígenes de OBS (`ws:`), IA, Streamlabs, StreamElements, Discord, Telegram, emotes y MediaPipe; `object-src 'none'`, `base-uri`, `frame-ancestors`. Actualizada en `vercel.json` y en la etiqueta meta de `index.html`. |
| Fase 0 | `Permissions-Policy: camera=()` bloqueaba la cámara de PartyCo en producción; ahora `camera=(self)`. |
| Fase 0 | Sandbox de plugins: solo acepta mensajes cuyo `event.source` es el iframe del plugin. La API del host está conectada (antes siempre respondía "Host API not configured"), con espacios de nombres en lista blanca y los permisos del manifiesto. |
| Fase 1 | `@types/react` y `@types/react-dom` en `devDependencies`; corregidos los 75 errores. Varios eran bugs reales: tiers, bits y regalos perdidos en Actividad (eventos de dominio con otra forma), el panel de moderación mostraba "Usuario baneado" aunque Twitch rechazara la acción, la pantalla de emparejamiento móvil recibía props con otro nombre, el overlay de jueces perdía `isHost`, el CSV de analítica se llamaba `chat_export_undefined_…`, exportar comandos recibía el evento del clic como categorías. |
| Fase 1 | `npm run typecheck` y workflow `.github/workflows/ci.yml` (tipos, tests unitarios y build). |
| Fase 1 | Tests intermitentes corregidos: OBS (timeout por esperas reales), favoritos (generador con duplicados), pestañas (clave `__proto__` en el mock) y `ViewerService`. Este último era un bug real: una actualización perdida cuando el usuario regalaba a sí mismo. |
| Fase 1 | Dejan de versionarse `playwright-report/`, `test-results/` y los JSON de informes (siguen en disco, añadidos a `.gitignore`). |
| Fase 1 | Error Boundaries: raíz, uno por overlay (transparente y con reintento cada 5 s, para OBS) y uno por pestaña del dashboard. Recarga una sola vez ante errores de carga de chunk. |
| Fase 2 | Registro único de overlays (`config/overlayRegistry.ts`) usado por el router y por `useOverlay`. |
| Fase 2 | `OverlayRouter` en su propio módulo y `index.tsx` carga dinámicamente overlay o dashboard. React en su propio chunk (antes iba dentro de `vendor-charts`). JavaScript descargado medido en navegador: overlay de ruleta **565 KB** y countdown **600 KB**, frente a 2.118 KB antes (el dashboard entero). La encuesta descarga 944 KB porque usa recharts. |
| E2E | Fixture base que espera a que la app perezosa termine de pintar. Etiquetas accesibles en los campos de sorteo; arreglado el test de palabra clave, que ya fallaba antes. |

Pendiente de decisión: los 4 tests de `ComponentLineCount` (GiveawayHub 1726 líneas frente a un límite de 1600, RaffleTab 766/750, useThreads 516/500). O se trocean esos ficheros o se ajustan los límites. Hasta entonces el job de CI saldrá en rojo.

## 2. Correcciones aplicadas en la primera revisión

| Área | Fichero(s) | Bug | Corrección |
|---|---|---|---|
| Seguridad | `src/infrastructure/auth/TwitchOAuth.ts` | La verificación `state` del OAuth (CSRF) nunca se ejecutaba: se borraba de `sessionStorage` antes de leerlo. | Se lee antes de limpiar y se rechaza si falta o no coincide. |
| Tokens | `BroadcasterTokenService.ts`, `PlatformBroadcasterTokenService.ts` | Cualquier respuesta no-OK (429, 5xx) borraba el token del broadcaster de Firebase. | Solo se borra con 401 (o 400 de Google tokeninfo). |
| Chat | `App.tsx` | El listener de chat se suscribe una vez (`[]`) y usaba los callbacks del primer render: **los macros por chat nunca se disparaban** y `!poll` usaba la configuración de moderación inicial. | Ref `chatHandlersRef` con las APIs más recientes de `poll`, `moderation` y `macroTriggers`. |
| Chat (14 componentes) | Countdown, SpinnerWheel y 12 juegos | Seguían el progreso con `chatMessages.slice(index)` + `index = length`. App limita el chat a 200 mensajes, así que **al llegar a 200 mensajes los juegos dejaban de ver mensajes nuevos**; tras limpiar el chat se perdían mensajes. | Nuevo helper `src/application/utils/chatCursor.ts` que guarda el último mensaje procesado en vez del índice. |
| Juego | `HotPotato.tsx` | El intervalo de la bomba se recreaba en cada pase: con pases frecuentes la bomba no explotaba nunca. Los efectos de la explosión estaban dentro de un updater (doble conteo en StrictMode). Rango de tiempo con error off-by-one. | Timer dependiente solo de `gameState`, explosión en un efecto aparte, rango `[10, bombTime]` inclusivo. |
| Juego | `CasinoRoulette.tsx` | Vueltas fraccionarias: la rueda se paraba en una casilla distinta del número anunciado. `requestAnimationFrame` sin cancelar al desmontar. | Vueltas enteras y ángulo final calculado para centrar la casilla ganadora bajo el puntero (también en giros sucesivos). rAF cancelado al desmontar. |
| Juego | `PartyCo.tsx` | Cambiar color o grosor del pincel reiniciaba la cámara y recargaba MediaPipe. | Color y grosor se leen por ref; el efecto depende de `[mode, selectedCameraId]`. |
| Aleatoriedad | Trivia, Ahorcado, PartyCo | `sort(() => Math.random() - 0.5)` no es una mezcla uniforme; en Trivia la respuesta correcta (guardada la última) quedaba sesgada. | Nuevo `src/application/utils/shuffle.ts` (Fisher-Yates). La respuesta correcta se sigue por índice. |
| UI | `DynamicsPanel.tsx` | `<SpinnerWheel />` sin `options` ni `onClose`: abrir la ruleta desde Dinámicas lanzaba `options.forEach` sobre `undefined`. | Se pasan opciones por defecto y las props de chat. |
| UI | `PlatformsPanel.tsx` | Usaba `selectedChannel.id/login/displayName`, campos que no existen en `ChannelContext`: con un canal moderado seleccionado se consultaba el token del canal propio. | `channelId/channelLogin/channelName`. |
| UI | `RaffleTab.tsx`, `ThreadCard.tsx` | Mostraban `tier1Entries` (inexistente): salía "T1: undefined". | `tier1Value/tier2Value/tier3Value`. |
| Reconexión | `OBSWebSocketAdapter.ts` | Tras un reintento fallido el estado pasaba a `error` y no se reintentaba más. | El reintento fallido programa el siguiente (máx. 3, backoff). |
| Reconexión | `StreamlabsAdapter.ts`, `StreamElementsAdapter.ts` | Desconectar manualmente provocaba reconexión automática. | Se desenganchan los handlers antes de cerrar. |
| Reconexión | `CollaborationWebSocketService.ts` | `connect()` no cerraba el socket anterior (sockets duplicados); cola de mensajes sin límite. | Se cierra el anterior; cola limitada a 200 y sin pings. |
| Fugas | `YouTubeAdapter.ts` | Un `setInterval` por conexión sin limpiar. | Guardado y limpiado en `stopQueueProcessor`. |
| Tipos/tests | `GiveawayHub.tsx`, `tests/e2e/fixtures/auth.fixture.ts` | 3 errores de `tsc` (campo `timestamp`, función duplicada en el mock de WebSocket que además no despachaba eventos). | Corregidos. |
| Arranque | `index.tsx` | El popup de OAuth lanzaba un error a propósito para no montar React. | Rama `else`, sin excepción. |

Verificación: `tsc` sin errores nuevos, 2153/2157 tests (los 4 fallos son los de líneas, ya existentes), build correcto. Los helpers nuevos se validaron con un test temporal (cursor con lista llena y vaciada, uniformidad del shuffle, ángulo de la ruleta en 50 giros sucesivos). No se han añadido tests permanentes.

## 3. Hallazgos pendientes

### Críticos (seguridad)

1. **`firebase-rules.json`, `broadcaster_tokens` y `platform_broadcaster_tokens`**: la regla `.write` (`!data.exists() || data.child('broadcasterId').val() == $broadcasterId`) es siempre cierta para datos válidos. Cualquier usuario autenticado puede sobrescribir el token de cualquier broadcaster, añadirse en `moderators` y después leer `accessToken`.
2. **`streamers/$twitchId/profile` y `sorteos`**: `.write: "auth != null"`; cualquiera modifica o borra perfiles y sorteos ajenos.
3. Las reglas usan `auth.uid == $broadcasterId`, que solo funciona si el uid de Firebase es el id de Twitch (custom tokens). Hay que confirmar cómo se autentica `FirebaseAuthService`.
4. **Los tokens de acceso de broadcaster se guardan legibles en la base de datos** para compartirlos con moderadores. Debe hacerlo un backend (función serverless) que use el token sin exponerlo.

### Altos

5. `TokenStorage.ts`: la clave AES se deriva de una constante del código (es ofuscación, no cifrado), el mismo IV se reutiliza para access y refresh token (rompe AES-GCM) y un fallo al descifrar devuelve basura en vez de error.
6. `vercel.json` CSP: `script-src 'unsafe-inline' 'unsafe-eval'`, y `connect-src` no incluye `ws://localhost:*` (OBS), OpenAI/Anthropic, Streamlabs, StreamElements, Discord ni Telegram. En producción en Vercel esas integraciones quedan bloqueadas por el navegador.
7. `VariableResolverService.ts`: `new Function(...)` en la ventana principal (donde están los tokens). Sustituir por un parser aritmético.
8. `PluginSandboxService.ts`: no comprueba `event.source`; cualquier frame puede suplantar mensajes de un plugin.
9. `client_secret` en el navegador (YouTube, Streamlabs). No puede ser secreto en una app web.
10. No hay **Error Boundaries** en ningún sitio: un error en un overlay deja la fuente de OBS en blanco.

### Medios (robustez)

11. Overlays que sondean `localStorage` cada 100–300 ms además de BroadcastChannel/Firebase (PartyCoOverlay, RouletteOverlay, PiumOverlay y otros): coste de CPU y parpadeo al reaplicar estados antiguos.
12. PartyCo guarda el dibujo completo (PNG dataURL) en `localStorage`; agota la cuota de ~5 MB y hace fallar otras escrituras.
13. `StreamEventService` guarda 30 sesiones × 2000 eventos en una sola clave de `localStorage`; al superar la cuota deja de persistir en silencio.
14. Llamadas a Helix sin gestión central de 401 (re-login) ni 429 (`Ratelimit-Reset`). El flujo implícito no da refresh token.
15. Dos detectores de overlay distintos (`getOverlayType` en App y `detectOverlayMode` en `useOverlay`): `?overlayGiveaway=true` y `?overlayJudge=true` montan la app completa.
16. `useBackupService`: siete `JSON.parse` sin `try/catch`; una clave corrupta aborta la copia.
17. Listeners de arrastre (mini barra y divisor) que se quedan colgados si se desmonta durante el arrastre.
18. `TwitchAdapter`: confirmar que al reconectar se eliminan los handlers del cliente tmi anterior.
19. `CollaborationWebSocketService`: reintentos infinitos y token en la URL.

### Deuda de arquitectura

20. `App.tsx`: 2000 líneas, 26 `useState`, 21 `useEffect`, router de overlays, procesador de chat de 200 líneas y todo el layout.
21. Código muerto: ~33 componentes nunca importados, toda `components/collaboration/` (usa un `CollaborationProvider` que nunca se monta y lanzaría error), los 13 servicios de `src/application/games/` y `useGameService` (los juegos reales tienen la lógica duplicada dentro del componente), dos `Tooltip`.
22. La arquitectura hexagonal solo se cumple en `src/domain`. Componentes y servicios importan adaptadores de infraestructura directamente (`gameSync`, `TwitchOAuth`, SDK de Firebase).

## 4. Funciones que figuran como terminadas pero no funcionan

| Función | Situación |
|---|---|
| API REST pública | No hay servidor. `handleAPIRequest` solo se usa en tests. Se pueden crear API keys que nada comprueba. |
| Servidor para app móvil | Un navegador no puede abrir un puerto. El QR apunta a `ws://localhost:9876`, que en el móvil es el propio móvil. |
| Colaboración multi-moderador | URL por defecto `ws://localhost:8080/collab` y no existe backend en el repo. La CSP la bloquea. |
| Plugins | El sandbox aísla bien, pero la API del host siempre responde `'Host API not configured'`. |
| YouTube | Adaptador escrito, pero no conectado en `ProviderFactory` y depende de un `client_secret`. |
| Kick | Lectura de chat por el WebSocket público (no oficial). |
| ProviderFactory | Lanza "not implemented" para youtube, obs, websocket, broadcast, indexedDB y supabase. |
| Comandos con IA | `AICommandService`: `TODO: Implement actual AI API call`. |
| Sorteos | Las respuestas de comandos de chat solo se escriben en consola; el programador de sorteos no lanza el sorteo. |
| Escritorio (Electron) | Falta `electron/main.cjs`. |

## 5. Decisiones que necesito de ti

1. **Backend sí o no.** Sin un backend no se pueden cerrar los puntos 1–4 y 9, ni la API REST, la colaboración, el móvil ni YouTube. Propuesta: funciones serverless en Vercel (ya se despliega allí) para intercambio de tokens OAuth, custom tokens de Firebase y proxy de llamadas de broadcaster; y un servicio WebSocket pequeño (o Firebase Realtime DB, que ya se usa) para colaboración y móvil.
2. **Electron**: recuperar `electron/` (¿lo tienes fuera del repo?) o retirar los scripts y la configuración.
3. **Código muerto**: borrar o integrar. Recomiendo borrar `src/application/games/` y `components/collaboration/` salvo que quieras esas versiones.
4. **Alcance de "100 %"**: ¿incluye YouTube, Kick, plugins y API pública, o el objetivo es Twitch + OBS + juegos + sorteos sólido, y lo demás se marca como beta?

## 6. Roadmap

Estimaciones para una persona a tiempo completo. Cada fase tiene criterios de salida comprobables.

### Fase 0: Seguridad (1 semana)
- Reescribir `firebase-rules.json` con propiedad real (uid ↔ id de Twitch mediante custom token emitido por backend) y moderadores en una ruta que solo escribe el dueño.
- Rotar/restringir por dominio la API key de Firebase, activar App Check y eliminar las claves de `CODE_AUDIT_REPORT.md` (y del historial si procede).
- `TokenStorage`: clave aleatoria no extraíble guardada en IndexedDB, IV por cifrado, error explícito al fallar.
- CSP: añadir los orígenes necesarios, quitar `unsafe-eval` (eliminar `new Function`), comprobar `event.source` en el sandbox de plugins.
- **Salida:** tests del emulador de reglas de Firebase que demuestren que un usuario no puede leer ni escribir datos ajenos.

### Fase 1: Base de calidad (1–2 semanas)
- Añadir `@types/react` y `@types/react-dom` a `devDependencies` y corregir los 75 errores (varios son bugs reales: props que faltan, tipos `StreamEvent`/`VoteRecord` duplicados entre `types.ts` y `src/domain`).
- ESLint con `eslint-plugin-react-hooks` (detecta los cierres obsoletos como el de los macros) y regla `no-console`.
- CI: `tsc`, `vitest` y build en cada PR, además de E2E.
- Estabilizar los 3 tests de propiedades intermitentes (fijar semilla de fast-check y revisar el contraejemplo de `ViewerService`, que puede ser un bug real) y decidir los límites de `ComponentLineCount`.
- Sacar del repo `playwright-report/`, `test-results/` y los JSON de informes.
- Error Boundary raíz, uno por overlay y uno por panel lazy (con recarga ante fallo de carga de chunk).
- **Salida:** CI verde con `tsc` estricto y 0 tests en rojo.

### Fase 2: Arquitectura y rendimiento (2–3 semanas)
- Separar `App.tsx` en `OverlayRouter`, `MainApp`, `useChatMessageProcessor`, `useAppBootstrap` y componentes de layout.
- Registro único de overlays (sustituye a los dos detectores) y entrada dinámica en `index.tsx` para que los overlays no carguen el dashboard.
- Lazy loading de pestañas (juegos, plataformas, galería, datos, dinámicas).
- Eliminar el código muerto acordado, unificar `Tooltip`, adoptar `LoggerService`.
- Raíz de composición única para adaptadores (los componentes dejan de importar infraestructura).
- **Salida:** un overlay de OBS carga < 300 kB gzip; `App.tsx` < 400 líneas; informe de `knip` sin ficheros huérfanos.

### Fase 3: Robustez en directo (2 semanas)
- Overlays: quitar el sondeo de `localStorage` (usar evento `storage` como respaldo). Dibujo de PartyCo solo por BroadcastChannel/Firebase.
- Historial de eventos y analíticas a IndexedDB con expulsión de sesiones antiguas.
- Wrapper común de Helix: 401 → re-login, 429 → espera hasta `Ratelimit-Reset`, aviso previo a la expiración del token.
- Revisar reconexión de tmi.js, límites de reintento en colaboración, `JSON.parse` seguro, listeners de arrastre en un hook con limpieza.
- **Salida:** prueba de 3 horas con chat simulado a 20 msg/s, sin fugas de memoria ni pérdida de mensajes y con overlays sincronizados.

### Fase 4: Completar funciones (3–6 semanas, depende de la decisión 1)
- Backend serverless: intercambio OAuth (Twitch, YouTube, Streamlabs), custom tokens de Firebase, proxy de acciones de broadcaster.
- Colaboración y app móvil sobre Firebase Realtime DB o un servicio WebSocket propio.
- API REST real en funciones serverless (o retirarla de la documentación).
- API del host de plugins (encuestas, OBS, almacenamiento) con permisos por plugin.
- YouTube conectado en `ProviderFactory`; Kick marcado como beta.
- Sorteos: enviar respuestas de comandos al chat y que el programador lance el sorteo. IA en `AICommandService`.
- Electron, si se mantiene.
- **Salida:** cada función del README tiene al menos un test E2E que la ejercita de extremo a extremo.

### Fase 5: Release (1 semana)
- README y documentación alineados con lo que funciona; sustituir `ROADMAP.md` por este documento.
- Checklist de release: build, E2E en Chromium y en OBS Browser Source, prueba en directo real.

## 7. Definición de "100 % funcional"

- Cada función del README funciona en producción (Vercel) o está marcada como beta.
- CI bloquea merges con errores de tipos, lint, tests unitarios o E2E.
- Las reglas de Firebase tienen tests que prueban el aislamiento entre usuarios.
- Ningún secreto en el cliente ni en el repositorio.
- Sesión de 3 horas en directo sin recargar la página ni los overlays.
