# Auditoría de Seguridad - StreamCrowd

**Última actualización:** 7 de Enero de 2026

## 🔴 Problemas Críticos

### 1. ✅ RESUELTO - Tokens OAuth almacenados sin encriptar en localStorage
**Ubicación:** `src/application/hooks/useTwitchService.ts`
**Estado:** Resuelto - Implementado `SecureStorage.ts` con AES-GCM encryption
**Solución aplicada:** 
- Creado `src/application/services/SecureStorage.ts` con Web Crypto API
- Clave de encriptación almacenada en IndexedDB (no exportable)
- Migración automática de tokens existentes

### 2. ✅ RESUELTO - Firebase API Key expuesta en código fuente
**Ubicación:** Múltiples archivos
**Estado:** Resuelto - Movido a variables de entorno con fallback
**Solución aplicada:**
- Todas las configuraciones de Firebase ahora usan `import.meta.env.VITE_FIREBASE_*`
- Valores por defecto mantenidos para desarrollo local
- Archivos actualizados:
  - `src/infrastructure/sync/FirebaseSync.ts`
  - `src/infrastructure/adapters/FirebaseSyncAdapter.ts`
  - `src/application/services/BroadcasterTokenService.ts`
  - `src/application/services/PlatformBroadcasterTokenService.ts`

### 3. ✅ RESUELTO - Tokens de broadcaster almacenados en Firebase sin encriptar
**Ubicación:** `src/application/services/BroadcasterTokenService.ts`
**Estado:** Resuelto - Implementado AES-GCM encryption para Firebase
**Solución aplicada:**
- Tokens encriptados con AES-GCM antes de guardar en Firebase
- Clave derivada con PBKDF2 (100,000 iteraciones)
- Fallback a encriptación legacy para datos existentes
- Implementado en ambos servicios:
  - `BroadcasterTokenService.ts`
  - `PlatformBroadcasterTokenService.ts`

## 🟡 Problemas Medios

### 4. Client IDs de OAuth en código
**Ubicación:** 
- `src/infrastructure/auth/TwitchOAuth.ts` - Client ID por defecto
- `.env.local` - Client IDs personalizados

**Riesgo:** Bajo - Client IDs son públicos por diseño de OAuth
**Nota:** Esto es aceptable, pero mejor documentar

### 5. sessionStorage para estado OAuth
**Ubicación:** `src/infrastructure/auth/TwitchOAuth.ts`
```typescript
sessionStorage.setItem('twitch_oauth_state', state);
```
**Riesgo:** Bajo - sessionStorage es más seguro que localStorage
**Estado:** Aceptable

## 🟢 Buenas Prácticas Existentes

1. ✅ Uso de OAuth Implicit Flow (no se manejan client secrets)
2. ✅ Verificación de state para prevenir CSRF
3. ✅ Validación de tokens con Twitch API
4. ✅ Encriptación disponible en `hooks/useBackupService.ts`
5. ✅ HTTPS requerido para OAuth callbacks

## 📋 Plan de Remediación

### Fase 1: Encriptación de Tokens Locales (Prioridad Alta) ✅ COMPLETADO
- [x] Crear servicio de encriptación centralizado (`TokenStorage.ts`)
- [x] Encriptar tokens de Twitch antes de guardar
- [x] Migración automática de tokens existentes (legacy → TokenStorage)
- [x] YouTube y Kick usan el mismo sistema centralizado via `PlatformAuthService`
- [x] Unificar `useTwitchService` para usar `TokenStorage` en lugar de `SecureStorage`

### Fase 2: Variables de Entorno (Prioridad Media) ✅ COMPLETADO
- [x] Mover Firebase config a variables de entorno
- [x] Actualizar FirebaseSync.ts
- [x] Actualizar FirebaseSyncAdapter.ts
- [x] Actualizar BroadcasterTokenService.ts
- [x] Actualizar PlatformBroadcasterTokenService.ts
- [x] Crear `.env.local` con variables de Firebase

### Fase 3: Firebase Security Rules (Prioridad Alta) ✅ COMPLETADO
- [x] Crear template de reglas de seguridad (`firebase-rules.json`)
- [x] Implementar Firebase Authentication (`FirebaseAuthService.ts`)
- [x] Integrar Auth en `BroadcasterTokenService.ts`
- [x] Integrar Auth en `PlatformBroadcasterTokenService.ts`
- [ ] Aplicar reglas en Firebase Console (manual)
- [ ] Verificar que solo usuarios autenticados pueden escribir (testing)

### Fase 4: Auditoría Adicional ✅ COMPLETADO
- [x] CSP headers implementados en vercel.json
- [x] Referrer-Policy y Permissions-Policy añadidos
- [x] Eliminada dependencia xlsx vulnerable (0 vulnerabilidades)
- [x] React actualizado a 19.2.3 (CVE-2025-55182 parcheado)
- [x] Corregido XSS en ModeratorChat.tsx (dangerouslySetInnerHTML → React elements)
- [x] Revisado uso de new Function (sanitizado, solo expresiones matemáticas)

## 🔧 Implementación Completada

### SecureStorage.ts → TokenStorage.ts - Encriptación Centralizada
```typescript
// Ubicación: src/application/services/TokenStorage.ts
// Sistema centralizado para TODAS las plataformas (Twitch, YouTube, Kick)
// Usa Web Crypto API con AES-GCM
// Clave derivada con PBKDF2 (100,000 iteraciones)

import { TokenStorage } from './TokenStorage';
import { PlatformAuthService } from './PlatformAuthService';

// Guardar credenciales (encriptadas automáticamente)
await TokenStorage.store('twitch', {
  platform: 'twitch',
  accessToken: 'token_here',
  username: 'user',
  userId: '12345',
  scopes: ['chat:read', 'chat:edit'],
});

// Recuperar credenciales (desencriptadas automáticamente)
const credentials = await TokenStorage.retrieve('twitch');
```

### Firebase Token Encryption
```typescript
// Implementado en BroadcasterTokenService.ts y PlatformBroadcasterTokenService.ts
// PBKDF2 key derivation + AES-GCM encryption
// Fallback a legacy XOR para datos existentes
```

### Variables de Entorno (.env.local)
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Firebase Security Rules (firebase-rules.json)
```json
{
  "rules": {
    "broadcaster_tokens": {
      "$broadcasterId": {
        ".read": "auth != null && auth.uid == $broadcasterId",
        ".write": "auth != null && auth.uid == $broadcasterId"
      }
    }
  }
}
```

## ⚠️ Próximos Pasos Opcionales

1. **Rate limiting client-side** - Limitar requests por minuto (las APIs ya lo hacen)
2. **Logging de seguridad** - Registrar intentos de acceso fallidos
3. **Subresource Integrity (SRI)** - Para CDN externos si se añaden

## 📁 Archivos de Seguridad Creados/Modificados

- `src/infrastructure/auth/FirebaseAuthService.ts` - Servicio de autenticación Firebase
- `src/application/services/TokenStorage.ts` - Almacenamiento encriptado centralizado
- `src/application/services/BroadcasterTokenService.ts` - Tokens de broadcaster con Auth
- `src/application/services/PlatformBroadcasterTokenService.ts` - Tokens multi-plataforma con Auth
- `firebase-rules.json` - Reglas de seguridad para Firebase
- `vercel.json` - CSP headers y security headers
- `.env.local` - Variables de entorno para Firebase
- `components/collaboration/ModeratorChat.tsx` - XSS fix
