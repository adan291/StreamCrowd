# Diseño: Corrección de Bugs Batch 1

## Visión General
Este documento describe las soluciones técnicas para los 5 bugs identificados.

---

## FIX-1: Notificaciones que no desaparecen

### Problema
```tsx
// App.tsx - línea ~507
const removeNotification = (id: string) => {
  setNotifications(prev => prev.filter(n => n.id !== id));
};
```
Esta función se recrea en cada render, causando que el `useEffect` en `NotificationToast` se re-ejecute y resetee el timer.

### Solución
```tsx
const removeNotification = useCallback((id: string) => {
  setNotifications(prev => prev.filter(n => n.id !== id));
}, []);
```

### Impacto
- Archivo: `App.tsx`
- Cambio mínimo, solo añadir `useCallback`

---

## FIX-2: OAuth scopes en gris

### Problema
En `TwitchOAuth.ts`, la función `validateToken` no extrae los scopes:
```typescript
async function validateToken(accessToken: string): Promise<{ username: string; userId: string; expiresIn: number }> {
  // ...
  return {
    username: data.login,
    userId: data.user_id,
    expiresIn: data.expires_in,
    // FALTA: scopes: data.scopes
  };
}
```

### Solución
1. Modificar `validateToken` para retornar también los scopes:
```typescript
async function validateToken(accessToken: string): Promise<{ 
  username: string; 
  userId: string; 
  expiresIn: number;
  scopes: string[];
}> {
  // ...
  return {
    username: data.login,
    userId: data.user_id,
    expiresIn: data.expires_in,
    scopes: data.scopes || [],
  };
}
```

2. Actualizar `TwitchOAuthResult` para incluir scopes:
```typescript
export interface TwitchOAuthResult {
  accessToken: string;
  username: string;
  userId: string;
  expiresIn?: number;
  scopes: string[];  // NUEVO
}
```

3. Pasar los scopes en `openTwitchOAuthPopup`:
```typescript
resolve({
  accessToken,
  username: userInfo.username,
  userId: userInfo.userId,
  expiresIn: userInfo.expiresIn,
  scopes: userInfo.scopes,  // NUEVO
});
```

### Impacto
- Archivo: `src/infrastructure/auth/TwitchOAuth.ts`
- Necesita verificar dónde se llama `openTwitchOAuthPopup` para pasar los scopes a `AuthService`

---

## FIX-3: API Panel sin botones de fetch/download

### Diseño UI
Añadir en la parte superior del panel:
```
┌─────────────────────────────────────────────┐
│ [📥 Cargar todos]  [⬇️ Exportar ▼]          │
│                                             │
│ ┌─ Seguidores ─────────────────────────┐   │
│ │ [🔄] [⬇️]                             │   │
│ └───────────────────────────────────────┘   │
```

### Componentes nuevos
1. **FetchAllButton**: Botón que ejecuta todos los fetch en paralelo
2. **ExportDropdown**: Menú desplegable con opciones JSON/CSV
3. **DownloadButton**: Botón individual por cada DataCard

### Funciones de exportación
```typescript
const exportToJSON = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
};

const exportToCSV = (data: any[], filename: string, headers: string[]) => {
  const csv = [headers.join(','), ...data.map(row => headers.map(h => row[h]).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `${filename}.csv`);
};
```

### Impacto
- Archivo: `components/activity/APIDataPanel.tsx`
- Añadir ~100 líneas de código

---

## FIX-4: Filtros del EventFeed no funcionan

### Problema
La lógica de renderizado tiene un bug:
```tsx
{/* Collapsed state: Show "Todos" indicator when all filters active */}
{isCollapsed || allSelected ? (
  // Muestra solo el botón "Todos"
) : null}

{/* Expanded filter chips */}
{!isCollapsed && !allSelected && (
  // Muestra los chips individuales
)}
```

Cuando `allSelected` es true, siempre muestra solo "Todos" aunque `isCollapsed` sea false.

### Solución
Cambiar la lógica para que:
- Si `isCollapsed`: mostrar solo contador
- Si `!isCollapsed`: mostrar chips (incluyendo "Todos" como opción)

```tsx
{/* Collapsed state */}
{isCollapsed && (
  <button onClick={allSelected ? clearAll : selectAll}>
    {activeCount}/{FILTER_CHIPS.length}
  </button>
)}

{/* Expanded filter chips - SIEMPRE mostrar cuando no está collapsed */}
{!isCollapsed && (
  <div className="flex items-center gap-1.5">
    <button onClick={selectAll}>Todos</button>
    {FILTER_CHIPS.map(chip => (...))}
  </div>
)}
```

### Impacto
- Archivo: `components/activity/EventFeed.tsx`
- Modificar ~20 líneas en `FilterChips`

---

## FIX-5: Scopes clickables para re-autenticar

### Diseño UI
```
┌─ Capability Item (disabled) ─────────────┐
│ 🔒 Chatters                    ❌        │
│ [Click para activar]                     │
└──────────────────────────────────────────┘
```

Al hacer click:
1. Mostrar tooltip: "Necesitas re-autenticarte para activar este permiso"
2. Botón "Re-autenticar" que abre el popup OAuth

### Implementación
```tsx
interface CapabilityItemProps {
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
  description: string;
  scope?: string;  // NUEVO
  onRequestAuth?: () => void;  // NUEVO
}

const CapabilityItem: React.FC<CapabilityItemProps> = ({ 
  name, icon, enabled, description, scope, onRequestAuth 
}) => (
  <button
    onClick={!enabled && onRequestAuth ? onRequestAuth : undefined}
    disabled={enabled}
    className={`... ${!enabled && onRequestAuth ? 'cursor-pointer hover:bg-zinc-700' : ''}`}
  >
    {/* ... contenido existente ... */}
    {!enabled && onRequestAuth && (
      <span className="text-[10px] text-blue-400">Click para activar</span>
    )}
  </button>
);
```

### Impacto
- Archivo: `components/AuthCapabilitiesIndicator.tsx`
- Añadir prop `onRequestAuth` y lógica de click
- Importar y usar `openTwitchOAuthPopup`

---

## Orden de Implementación
1. FIX-1 (más simple, 1 línea)
2. FIX-2 (crítico para funcionalidad)
3. FIX-4 (afecta UX)
4. FIX-5 (mejora UX)
5. FIX-3 (más complejo, nuevas features)
