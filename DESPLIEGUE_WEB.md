# 🚀 Guía de Despliegue Web - TwitchVote

Esta guía explica cómo desplegar TwitchVote como una aplicación web (PWA) en Vercel.

## 📋 Resumen

| Característica | Descripción |
|----------------|-------------|
| **Hosting** | Vercel (gratis) |
| **PWA** | Instalable desde el navegador |
| **Base de datos** | No necesaria (localStorage) |
| **Autenticación** | No necesaria (conexión pública a canales) |
| **Costo** | $0/mes |

---

## 🎯 Opción 1: Despliegue Rápido (5 minutos)

### Paso 1: Instalar dependencias

```bash
npm install
```

### Paso 2: Desplegar en Vercel

**Opción A - Con Vercel CLI:**
```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Desplegar
vercel

# Seguir las instrucciones:
# - Seleccionar tu cuenta
# - Confirmar el proyecto
# - Aceptar la configuración detectada
```

**Opción B - Desde GitHub:**
1. Sube tu código a GitHub
2. Ve a [vercel.com](https://vercel.com)
3. Click en "New Project"
4. Importa tu repositorio
5. Vercel detectará automáticamente que es Vite
6. Click en "Deploy"

### Paso 3: Configurar Variables de Entorno (Opcional)

Si usas la API de Gemini para análisis de IA:

1. En Vercel Dashboard → Tu proyecto → Settings → Environment Variables
2. Añadir:
   - `GEMINI_API_KEY` = tu-api-key

### ¡Listo! 🎉

Tu app estará disponible en `https://tu-proyecto.vercel.app`

---

## 📱 PWA (Progressive Web App)

Tu app ya está configurada como PWA. Los usuarios pueden:

### Instalar en Desktop (Chrome/Edge):
1. Abrir la URL de tu app
2. Click en el icono de instalación en la barra de direcciones (⊕)
3. Click en "Instalar"

### Instalar en Móvil:
1. Abrir la URL en Chrome/Safari
2. Menú → "Añadir a pantalla de inicio"

### Características PWA:
- ✅ Funciona offline (parcialmente)
- ✅ Se abre como app nativa
- ✅ Icono en el escritorio/home
- ✅ Sin barra de navegador
- ✅ Actualizaciones automáticas

---

## 🔧 Configuración Avanzada

### Variables de Entorno

Crear archivo `.env.local` para desarrollo local:

```env
# API de Gemini (opcional, para análisis de IA)
GEMINI_API_KEY=tu-api-key-de-gemini
```

### Estructura del Build

```
dist/
├── index.html          # App principal
├── assets/             # JS, CSS compilados
├── sw.js               # Service Worker (PWA)
├── manifest.webmanifest # Manifest PWA
└── ai-vision-icon.png  # Iconos
```

### Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Build para Electron (escritorio)
npm run electron:build
```

---

## 🌐 Dominio Personalizado

### En Vercel:
1. Dashboard → Tu proyecto → Settings → Domains
2. Añadir tu dominio (ej: `twitchvote.tudominio.com`)
3. Configurar DNS según las instrucciones

### DNS (en tu proveedor):
```
Tipo: CNAME
Nombre: twitchvote (o @)
Valor: cname.vercel-dns.com
```

---

## 📊 Monitoreo

Vercel incluye analytics básicos gratis:
- Visitas
- Países
- Dispositivos
- Rendimiento

Para analytics avanzados, puedes añadir:
- Google Analytics
- Plausible
- Umami (self-hosted)

---

## 🔒 Seguridad

La app ya incluye headers de seguridad en `vercel.json`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

---

## 🆙 Actualizaciones

### Automáticas (recomendado):
Si conectaste GitHub, cada push a `main` despliega automáticamente.

### Manuales:
```bash
vercel --prod
```

---

## ❓ FAQ

### ¿Necesito base de datos?
**No.** Todo se guarda en localStorage del navegador del usuario. Cada usuario tiene sus propias plantillas, historial, etc.

### ¿Necesito autenticación?
**No.** La conexión a Twitch es pública (solo lectura del chat). Si quieres enviar mensajes al chat, necesitarías OAuth de Twitch.

### ¿Cuánto cuesta?
**$0/mes** con el plan gratuito de Vercel (100GB bandwidth/mes).

### ¿Funciona en móvil?
**Sí.** La app es responsive y funciona en cualquier dispositivo.

### ¿Puedo usar otro hosting?
**Sí.** Cualquier hosting de sitios estáticos funciona:
- Netlify
- GitHub Pages
- Cloudflare Pages
- Firebase Hosting

---

## 🚀 Próximos Pasos (Opcionales)

Si quieres añadir más funcionalidades en el futuro:

### Con Supabase (Base de datos + Auth):
- Sincronizar plantillas entre dispositivos
- Login con Twitch OAuth
- Enviar mensajes al chat
- Analytics de uso

Ver la sección "Migración a Supabase" más abajo.

---

## 📦 Migración a Supabase (Avanzado)

Si decides añadir base de datos y autenticación:

### 1. Crear proyecto en Supabase
1. Ir a [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Guardar credenciales

### 2. Instalar dependencias
```bash
npm install @supabase/supabase-js
```

### 3. Configurar Auth con Twitch
1. Supabase Dashboard → Authentication → Providers → Twitch
2. Crear app en [dev.twitch.tv](https://dev.twitch.tv/console/apps)
3. Configurar redirect URL

### 4. Crear tablas
Ver el archivo `SUPABASE_SCHEMA.md` para el esquema completo de base de datos.

---

## 🎨 Personalización

### Cambiar colores de marca:
Editar `index.css` - variables CSS de Tailwind

### Cambiar iconos:
Reemplazar archivos en `public/`:
- `ai-vision-icon.png` (192x192 y 512x512)
- `ai-vision-icon.svg`
- `ai-vision-icon.ico`

### Cambiar nombre de la app:
Editar `vite.config.ts` → sección PWA → manifest

---

## 🐛 Troubleshooting

### "Service Worker registration failed"
- Asegúrate de estar en HTTPS (Vercel lo hace automático)
- Limpia caché del navegador

### "Build failed"
- Revisa que no haya errores de TypeScript: `npx tsc --noEmit`
- Revisa los logs en Vercel Dashboard

### "PWA no se instala"
- Necesitas HTTPS
- El manifest debe ser válido
- Los iconos deben existir

---

## 📞 Soporte

- Issues en GitHub
- Discord de la comunidad
- Email: soporte@twitchvote.app

---

¡Disfruta tu TwitchVote en la web! 🎉
