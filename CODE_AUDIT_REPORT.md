# 🔍 Auditoría de Código - StreamCrowd

**Fecha:** 10 de Enero de 2026  
**Versión:** 1.0.0

---

## 📊 Resumen Ejecutivo

| Categoría | Estado | Prioridad |
|-----------|--------|-----------|
| Código Muerto | ⚠️ Encontrado | Alta |
| Seguridad | ⚠️ Mejoras necesarias | Alta |
| Tipado | ⚠️ Uso de `any` | Media |
| Console.log | ⚠️ Muchos en producción | Media |
| TODOs pendientes | ⚠️ 8 encontrados | Baja |
| Duplicación | ⚠️ Patrones repetidos | Media |

---

## 🗑️ 1. CÓDIGO MUERTO - ELIMINAR

### 1.1 Archivo Huérfano (CRÍTICO)
```
📁 original_giveaway.tsx (1009 líneas)
```
- **Estado:** No importado en ningún lugar
- **Acción:** ELIMINAR completamente
- **Impacto:** ~1000 líneas de código muerto

### 1.2 Exports No Utilizados en StreamActivity.tsx
Las siguientes funciones se exportan pero solo se usan internamente:
```typescript
// components/StreamActivity.tsx - líneas 59-62
export const saveEvents = ...        // Solo uso interno
export const loadEventsByDate = ...  // Solo uso interno  
export const getAvailableDates = ... // Solo uso interno
export const clearEventsByDate = ... // Solo uso interno
export const voteToEvent = ...       // Solo uso interno (línea 40)
```
- **Acción:** Cambiar a funciones privadas (sin export)

### 1.3 TODOs No Implementados en ProviderFactory.ts
```typescript
// src/infrastructure/factories/ProviderFactory.ts
case 'youtube':     // TODO: línea 71
case 'obs':         // TODO: línea 75
case 'websocket':   // TODO: línea 98
case 'broadcast':   // TODO: línea 102
case 'indexedDB':   // TODO: línea 126
case 'supabase':    // TODO: línea 130
```
- **Acción:** Implementar o eliminar casos no soportados

---

## 🔐 2. SEGURIDAD

### 2.1 Credenciales en .env.local (CRÍTICO)
```env
# .env.local - EXPUESTAS EN REPOSITORIO
VITE_TWITCH_CLIENT_ID=3tz1yl90wzjq2syvrsf6zrefvzb3y4
VITE_GOOGLE_CLIENT_ID=979549084688-0v6bdb346uj19mrl99r68hmh6cklpsi6.apps.googleusercontent.com
VITE_FIREBASE_API_KEY=REDACTED_FIREBASE_API_KEY
# ... más credenciales Firebase
```

**Recomendaciones:**
1. ✅ Agregar `.env.local` a `.gitignore` (verificar que esté)
2. ⚠️ Rotar las API keys expuestas
3. ⚠️ Usar variables de entorno en CI/CD
4. ⚠️ Considerar Firebase App Check para restringir uso

### 2.2 Firebase Rules - Mejoras Necesarias
```json
// firebase-rules.json - líneas 6-10
"overlays": {
  "$overlayId": {
    ".read": "auth != null",   // ⚠️ Cualquier usuario autenticado puede leer TODOS los overlays
    ".write": "auth != null"   // ⚠️ Cualquier usuario puede escribir en CUALQUIER overlay
  }
}
```

**Recomendación:** Restringir acceso por usuario:
```json
"overlays": {
  "$overlayId": {
    ".read": "auth != null && ($overlayId.startsWith(auth.uid) || data.child('sharedWith').hasChild(auth.uid))",
    ".write": "auth != null && ($overlayId.startsWith(auth.uid) || !data.exists())"
  }
}
```

### 2.3 Tokens en localStorage
Los tokens OAuth se almacenan en localStorage, lo cual es vulnerable a XSS.

**Recomendación:** 
- Usar `httpOnly` cookies cuando sea posible
- Implementar token rotation
- El código actual en `TokenStorage.ts` usa encriptación, lo cual es bueno ✅

---

## 📝 3. TIPADO - USO DE `any`

### 3.1 Archivos con `any` que necesitan tipado:

| Archivo | Líneas | Prioridad |
|---------|--------|-----------|
| `src/plugins/services/PluginHostService.ts` | 48-52 | Alta |
| `src/plugins/services/PluginManagerService.ts` | 287, 330-334 | Alta |
| `src/infrastructure/sync/FirebaseSync.ts` | 131, 146, 191, 310 | Media |
| `src/infrastructure/adapters/TwitchAdapter.ts` | 1152, 1184, 1229, etc. | Media |
| `src/collaboration/services/CollaborationService.ts` | 519-581 | Media |
| `types/mobile.ts` | 187 | Baja |

**Ejemplo de fix para PluginHostService.ts:**
```typescript
// Antes
private pollService: any = null;

// Después
import type { IPollService } from '../domain/ports/IPollService';
private pollService: IPollService | null = null;
```

---

## 🖨️ 4. CONSOLE.LOG EN PRODUCCIÓN

### 4.1 Archivos con console.log que deben limpiarse:

| Archivo | Cantidad | Acción |
|---------|----------|--------|
| `TwitchPredictionService.ts` | 12 | Reemplazar con logger |
| `TwitchPollService.ts` | 4 | Reemplazar con logger |
| `PlatformManagerService.ts` | 11 | Reemplazar con logger |
| `FirebaseAuthService.ts` | 5 | Reemplazar con logger |
| `TokenStorage.ts` | 6 | Reemplazar con logger |
| `TwitchAdapter.ts` | 3 | Reemplazar con logger |
| `PlatformAuthService.ts` | 4 | Reemplazar con logger |

**Recomendación:** Crear un servicio de logging centralizado:
```typescript
// src/application/services/LoggerService.ts
const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => isDev && console.log('[DEBUG]', ...args),
  info: (...args: unknown[]) => isDev && console.info('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};
```

---

## 🔄 5. CÓDIGO DUPLICADO

### 5.1 Patrón Repetido en Juegos (13 archivos)
```typescript
// Patrón repetido en: PiumGame, DuckHunt, BattleshipGame, etc.
const [gameState, setGameState] = useState(...);
const [players, setPlayers] = useState(...);

useEffect(() => {
  const channel = new BroadcastChannel('game_sync');
  // ... mismo código
}, []);
```

**Solución:** Ya existe `useGameService.ts` - verificar que todos los juegos lo usen.

### 5.2 Patrón Repetido en Overlays (13 archivos)
```typescript
// Patrón repetido en overlays
const { bgColor } = useOverlayMode();
useEffect(() => {
  const channel = new BroadcastChannel('...');
  // ... mismo código de sincronización
}, []);
```

**Solución:** Crear hook `useOverlaySync`:
```typescript
export function useOverlaySync<T>(channelName: string, initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const { bgColor } = useOverlayMode();
  
  useEffect(() => {
    const channel = new BroadcastChannel(channelName);
    channel.onmessage = (e) => setState(e.data);
    channel.postMessage({ type: 'request_sync' });
    return () => channel.close();
  }, [channelName]);
  
  return { state, bgColor };
}
```

---

## 📦 6. DEPENDENCIAS

### 6.1 Dependencias Actuales (Verificadas)
```json
{
  "dependencies": {
    "@mediapipe/camera_utils": "^0.3.1675466862",  // ✅ Usado en juegos
    "@mediapipe/hands": "^0.4.1675469240",         // ✅ Usado en juegos
    "firebase": "^12.7.0",                          // ✅ Core
    "lucide-react": "^0.556.0",                     // ✅ Iconos
    "obs-websocket-js": "^5.0.7",                   // ✅ OBS integration
    "react": "^19.2.1",                             // ✅ Core
    "react-dom": "^19.2.1",                         // ✅ Core
    "recharts": "^3.5.1",                           // ✅ Gráficos
    "socket.io-client": "^4.8.3",                   // ✅ Colaboración
    "tailwindcss": "^4.1.17",                       // ✅ Estilos
    "tmi.js": "^1.8.5"                              // ✅ Twitch chat
  }
}
```

**Nota:** Todas las dependencias parecen estar en uso.

---

## 🏗️ 7. ARQUITECTURA

### 7.1 App.tsx Monolítico (CRÍTICO)
- **Líneas:** ~2000
- **Estados:** 20+ useState
- **Problema:** Demasiada responsabilidad en un solo archivo

**Recomendación:** Dividir en:
1. `AppRouter.tsx` - Manejo de rutas/vistas
2. `AppProviders.tsx` - Context providers
3. `AppLayout.tsx` - Layout principal
4. Mover lógica a hooks específicos

### 7.2 Duplicación de GiveawayHub
```
components/GiveawayHub.tsx          → Re-exporta desde giveaway/
components/giveaway/GiveawayHub.tsx → Implementación real
original_giveaway.tsx               → CÓDIGO MUERTO (eliminar)
```

**Acción:** Eliminar `original_giveaway.tsx`

---

## ✅ 8. ACCIONES RECOMENDADAS

### Prioridad ALTA (hacer ahora):
1. [ ] Eliminar `original_giveaway.tsx`
2. [ ] Rotar API keys expuestas en `.env.local`
3. [ ] Mejorar Firebase rules para restringir acceso
4. [ ] Verificar `.gitignore` incluye `.env.local`

### Prioridad MEDIA (próxima semana):
5. [ ] Crear `LoggerService` y reemplazar console.log
6. [ ] Tipar los `any` en PluginHostService y PluginManagerService
7. [ ] Crear hook `useOverlaySync` para reducir duplicación
8. [ ] Cambiar exports innecesarios en StreamActivity.tsx

### Prioridad BAJA (backlog):
9. [ ] Implementar o eliminar TODOs en ProviderFactory.ts
10. [ ] Refactorizar App.tsx en componentes más pequeños
11. [ ] Tipar respuestas de API en TwitchAdapter.ts
12. [ ] Documentar arquitectura hexagonal actualizada

---

## 📈 Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Líneas de código muerto | ~1000 |
| Archivos con `any` | 8 |
| Console.log en producción | 45+ |
| TODOs pendientes | 8 |
| Servicios en src/application | 60+ |
| Hooks personalizados | 70+ |
| Componentes | 100+ |

---

*Generado automáticamente por Kiro - 10/01/2026*


---

## 🔴 9. ERRORES DE TYPESCRIPT EXISTENTES

Los siguientes errores de compilación fueron detectados y deben corregirse:

### 9.1 Dependencia Faltante
```
components/integrations/*.tsx
Error: Cannot find module 'react-i18next'
```
**Acción:** Instalar `react-i18next` o cambiar a usar `useI18n` del proyecto

### 9.2 Tipos Incompletos en Juegos
```typescript
// components/games/BattleshipGame.tsx:156
Property 'hits' does not exist on type 'unknown'

// components/games/PiedraPapelTijera.tsx:88-202
Property 'eliminated', 'choice' does not exist on type 'unknown'

// components/games/VeoVeo.tsx:92-93
Property 'score', 'guesses' does not exist on type 'unknown'
```
**Acción:** Agregar tipos explícitos a los estados de jugadores

### 9.3 Tipos Incompletos en Macros/Plugins
```typescript
// components/macros/MacroCard.tsx:91
Missing properties: send_announcement, update_chat_settings, send_shoutout, start_raid, create_clip

// components/plugins/PluginCard.tsx:13,20
Property 'updating' is missing in type
```
**Acción:** Actualizar los tipos Record con las propiedades faltantes

### 9.4 Propiedad Faltante en i18n
```typescript
// components/PlatformSelector.tsx:254
Property 'platformsDescriptionMulti' does not exist
```
**Acción:** Agregar traducción faltante en i18n

### 9.5 Tipo Incorrecto en PrizeImagePicker
```typescript
// components/giveaway/PrizeImagePicker.tsx:47-83
Property 'type', 'size' does not exist on type 'unknown'
```
**Acción:** Tipar correctamente el evento de archivo

---

## 📋 10. CAMBIOS REALIZADOS EN ESTA AUDITORÍA

### Archivos Eliminados:
- ✅ `original_giveaway.tsx` - Código muerto (1009 líneas eliminadas)

### Archivos Creados:
- ✅ `src/application/services/LoggerService.ts` - Servicio de logging centralizado
- ✅ `hooks/useOverlaySync.ts` - Hook reutilizable para sincronización de overlays
- ✅ `CODE_AUDIT_REPORT.md` - Este reporte

### Archivos Modificados:
- ✅ `firebase-rules.json` - Reglas de seguridad mejoradas
- ✅ `hooks/index.ts` - Exportación del nuevo hook useOverlaySync
- ✅ `src/application/services/index.ts` - Exportación del LoggerService
- ✅ `components/StreamActivity.tsx` - Documentación de exports legacy

---

*Actualizado: 10/01/2026*
