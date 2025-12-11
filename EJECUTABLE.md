# Guía para Convertir TwitchVote en Ejecutable

Esta guía explica cómo convertir la aplicación TwitchVote en un ejecutable de escritorio usando **Electron** o **Tauri**.

## Opción 1: Electron (Recomendado para principiantes)

### Requisitos
- Node.js 18+
- npm o yarn

### Pasos

#### 1. Instalar dependencias de Electron

```bash
npm install --save-dev electron electron-builder concurrently wait-on
```

#### 2. Crear archivo de configuración de Electron

Crear `electron/main.js`:

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    titleBarStyle: 'default',
  });

  // En desarrollo
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // En producción, cargar el build
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

#### 3. Actualizar package.json

Añadir estas configuraciones:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.twitchvote.app",
    "productName": "TwitchVote",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "public/icon.ico"
    },
    "mac": {
      "target": ["dmg"],
      "icon": "public/icon.icns"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "public/icon.png"
    }
  }
}
```

#### 4. Generar el ejecutable

```bash
# Desarrollo (para probar)
npm run electron:dev

# Producción (genera el .exe)
npm run electron:build
```

Los ejecutables se generarán en la carpeta `release/`.

---

## Opción 2: Tauri (Más ligero y rápido)

Tauri genera ejecutables mucho más pequeños (~10MB vs ~150MB de Electron).

### Requisitos
- Node.js 18+
- Rust (https://rustup.rs/)
- En Windows: Microsoft Visual Studio C++ Build Tools

### Pasos

#### 1. Instalar Tauri CLI

```bash
npm install --save-dev @tauri-apps/cli @tauri-apps/api
```

#### 2. Inicializar Tauri

```bash
npx tauri init
```

Responder a las preguntas:
- App name: `TwitchVote`
- Window title: `TwitchVote - Encuestas para Twitch`
- Dev server URL: `http://localhost:5173`
- Frontend dist: `../dist`
- Frontend dev command: `npm run dev`
- Frontend build command: `npm run build`

#### 3. Configurar tauri.conf.json

El archivo `src-tauri/tauri.conf.json` se genera automáticamente. Ajustar:

```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "TwitchVote",
    "version": "1.0.0"
  },
  "tauri": {
    "windows": [
      {
        "title": "TwitchVote",
        "width": 1400,
        "height": 900,
        "minWidth": 1024,
        "minHeight": 768,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.twitchvote.app",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/icon.ico"
      ]
    }
  }
}
```

#### 4. Generar el ejecutable

```bash
# Desarrollo
npm run tauri dev

# Producción
npm run tauri build
```

Los ejecutables se generarán en `src-tauri/target/release/bundle/`.

---

## Crear Iconos

Necesitas iconos en varios formatos:

### Windows (.ico)
- 256x256, 128x128, 64x64, 48x48, 32x32, 16x16 píxeles

### macOS (.icns)
- 1024x1024, 512x512, 256x256, 128x128, 64x64, 32x32, 16x16 píxeles

### Linux (.png)
- 512x512 píxeles mínimo

Herramientas recomendadas:
- https://www.icoconverter.com/ (para .ico)
- https://cloudconvert.com/png-to-icns (para .icns)

---

## Comparativa

| Característica | Electron | Tauri |
|---------------|----------|-------|
| Tamaño ejecutable | ~150MB | ~10MB |
| Uso de RAM | Alto | Bajo |
| Tiempo de inicio | Lento | Rápido |
| Facilidad | Fácil | Media |
| Lenguaje backend | JavaScript | Rust |

---

## Distribución

### Windows
- **NSIS Installer**: Instalador clásico de Windows
- **Portable**: Ejecutable sin instalación

### macOS
- **DMG**: Imagen de disco para arrastrar a Aplicaciones
- Requiere firmar la app para distribución (Apple Developer Account)

### Linux
- **AppImage**: Ejecutable universal
- **DEB**: Para Debian/Ubuntu
- **RPM**: Para Fedora/RHEL

---

## Notas Importantes

1. **Twitch OAuth**: La conexión a Twitch funciona igual que en web
2. **Almacenamiento**: Los datos se guardan en localStorage del navegador embebido
3. **Actualizaciones**: Considera usar `electron-updater` o Tauri's updater para auto-actualizaciones
4. **Firma de código**: Para distribución profesional, firma tus ejecutables

---

## Comandos Rápidos

```bash
# Con Electron
npm run electron:dev    # Desarrollo
npm run electron:build  # Generar .exe

# Con Tauri
npm run tauri dev       # Desarrollo
npm run tauri build     # Generar ejecutable
```
