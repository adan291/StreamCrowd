# Requisitos: Corrección de Bugs Batch 1

## Contexto
Se han identificado 5 bugs/mejoras que necesitan ser corregidos en la aplicación.

## Requisitos Funcionales

### REQ-1: Notificaciones que no desaparecen
**Problema**: Las notificaciones deberían desaparecer automáticamente después de 3 segundos, pero se quedan infinitamente.
**Causa raíz**: La función `removeNotification` en App.tsx no está memoizada con `useCallback`, lo que causa que el timer en `NotificationToast` se resetee en cada render porque `onRemove` cambia de referencia.
**Solución**: Memoizar `removeNotification` con `useCallback` en App.tsx.

### REQ-2: OAuth scopes aparecen en gris
**Problema**: El `AuthCapabilitiesIndicator` muestra capacidades como deshabilitadas (gris) incluso cuando se está conectado con OAuth.
**Causa raíz**: En `TwitchOAuth.ts`, la función `validateToken` obtiene los datos del usuario pero no extrae los scopes de la respuesta de validación de Twitch. Los scopes están disponibles en `data.scopes` de la respuesta.
**Solución**: Extraer y retornar los scopes desde `validateToken` y pasarlos a `AuthService.setOAuthAuth()`.

### REQ-3: API Panel sin botones de fetch/download
**Problema**: El `APIDataPanel` tiene botones de refresh pero no hay forma de hacer el fetch inicial de datos ni descargar los datos.
**Solución**: 
- Añadir un botón "Cargar todos" que haga fetch de todos los endpoints disponibles
- Añadir botones de descarga (JSON/CSV) para cada tipo de datos
- Opcionalmente, auto-fetch al montar el componente

### REQ-4: Filtros del EventFeed no funcionan
**Problema**: El botón de toggle de filtros en `EventFeed.tsx` no muestra nada cuando se hace click.
**Análisis**: El componente `FilterChips` tiene lógica para collapsed/expanded pero hay un problema con la condición de renderizado. Cuando `allSelected` es true Y `isCollapsed` es false, no se muestran los chips individuales.
**Solución**: Revisar la lógica de renderizado condicional en `FilterChips` para asegurar que los filtros se muestren correctamente.

### REQ-5: Scopes clickables para re-autenticar
**Problema**: El usuario quiere poder hacer click en los scopes deshabilitados para disparar una re-autenticación con esos scopes específicos.
**Solución**: 
- Hacer los `CapabilityItem` clickables cuando están deshabilitados
- Al hacer click, mostrar un tooltip o modal explicando que se necesita re-autenticar
- Añadir un botón/link para iniciar el flujo OAuth de nuevo

## Requisitos No Funcionales

### NFR-1: Sin regresiones
- Los cambios no deben romper funcionalidad existente
- Mantener compatibilidad con el sistema de autenticación actual

### NFR-2: UX consistente
- Los nuevos botones deben seguir el estilo visual existente
- Las animaciones deben ser suaves y no intrusivas

## Archivos Afectados
- `App.tsx` - REQ-1
- `src/infrastructure/auth/TwitchOAuth.ts` - REQ-2
- `components/activity/APIDataPanel.tsx` - REQ-3
- `components/activity/EventFeed.tsx` - REQ-4
- `components/AuthCapabilitiesIndicator.tsx` - REQ-5
