# Tareas: Corrección de Bugs Batch 1

## Task 1: Fix notificaciones que no desaparecen
- [x] Memoizar `removeNotification` con `useCallback` en `App.tsx`
- [x] Verificar que las notificaciones desaparecen después de 3 segundos
- [x] Verificar build

**Archivo**: `App.tsx`
**Requisito**: REQ-1

---

## Task 2: Fix OAuth scopes no se pasan correctamente
- [x] Modificar interfaz `TwitchOAuthResult` para incluir `scopes: string[]`
- [x] Actualizar `validateToken` para extraer y retornar `data.scopes`
- [x] Actualizar `openTwitchOAuthPopup` para incluir scopes en el resultado
- [x] Verificar build

**Archivo**: `src/infrastructure/auth/TwitchOAuth.ts`
**Requisito**: REQ-2

---

## Task 3: Pasar scopes a AuthService al autenticar
- [x] Buscar dónde se llama `openTwitchOAuthPopup` en la app
- [x] Verificar que los scopes se pasan a `AuthService.setOAuthAuth()` (ya estaba implementado en useTwitchService)
- [x] Verificar que `AuthCapabilitiesIndicator` muestra los scopes correctamente
- [x] Verificar build

**Archivos**: `src/application/hooks/useTwitchService.ts` (ya tenía la lógica correcta)
**Requisito**: REQ-2

---

## Task 4: Fix filtros del EventFeed
- [x] Revisar lógica de renderizado en `FilterChips`
- [x] Corregir condición para mostrar chips cuando no está collapsed
- [x] Probar que los filtros se muestran y funcionan correctamente
- [x] Verificar build

**Archivo**: `components/activity/EventFeed.tsx`
**Requisito**: REQ-4

---

## Task 5: Añadir botón "Cargar todos" en APIDataPanel
- [x] Crear función `fetchAll` que ejecute todos los fetch en paralelo
- [x] Añadir botón "Cargar todos" en el header del panel
- [x] Añadir estado de loading global mientras se cargan todos
- [x] Verificar build

**Archivo**: `components/activity/APIDataPanel.tsx`
**Requisito**: REQ-3

---

## Task 6: Añadir botones de descarga en APIDataPanel
- [x] Crear funciones `exportToJSON` y `downloadBlob`
- [x] Añadir botón de descarga en cada `DataCard`
- [x] Añadir botón "Exportar" en el header para exportar todo
- [x] Verificar build

**Archivo**: `components/activity/APIDataPanel.tsx`
**Requisito**: REQ-3

---

## Task 7: Hacer scopes clickables para re-autenticar
- [x] Modificar `CapabilityItem` para aceptar `onRequestAuth` prop
- [x] Hacer el item clickable cuando está deshabilitado
- [x] Añadir indicador visual (icono RefreshCw y color azul)
- [x] Conectar con `openTwitchOAuthPopup` en `AuthCapabilitiesIndicator`
- [x] Añadir botón de re-autenticación cuando hay permisos faltantes
- [x] Verificar build

**Archivo**: `components/AuthCapabilitiesIndicator.tsx`
**Requisito**: REQ-5

---

## Task 8: Verificación final
- [x] Ejecutar `npm run build` - verificar sin errores ✅
- [x] Ejecutar `npm test -- --run` - verificar tests pasan ✅ (464 tests)
- [x] Revisar que todos los fixes funcionan correctamente

**Requisitos**: Todos
