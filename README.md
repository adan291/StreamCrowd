<div align="center">
  <img src="public/ai-vision-icon.png" alt="StreamCrowd Logo" width="120" />
  
  # StreamCrowd
  
  **La suite definitiva de herramientas interactivas para streamers**
  
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
  [![Electron](https://img.shields.io/badge/Electron-39-47848F?logo=electron)](https://www.electronjs.org/)
  
  [Características](#-características) • [Instalación](#-instalación) • [OBS](#-integración-obs) • [Documentación](#-documentación)
</div>

---

## 🎯 ¿Qué es StreamCrowd?

StreamCrowd es una aplicación todo-en-uno diseñada para streamers que quieren llevar la interacción con su audiencia al siguiente nivel. 

Combina **encuestas en tiempo real**, **sorteos avanzados**, **panel de jueces**, **+13 minijuegos**, **predicciones**, **recompensas de canal**, **analytics con IA**, y mucho más en una sola herramienta.

Compatible con **Twitch**, **YouTube** y **Kick**. Disponible como **app web** (PWA) y **escritorio** (Electron).

---

## ✨ Características

### 📊 Encuestas Interactivas
- Presets rápidos (Sí/No, Rating 1-5, ABC)
- Colores, iconos e imágenes personalizables
- Votación por chat con prefijos configurables (`+1`, `+pizza`, etc.)
- Gráficos animados en tiempo real
- Ruleta/Spinner integrada
- Modo wizard paso a paso
- Overlay transparente para OBS

### 🎁 Centro de Sorteos (GiveawayHub)
| Modo | Descripción |
|------|-------------|
| **Viewers** | Sorteo entre usuarios activos en el chat |
| **Keyword** | Participación con palabra clave específica |
| **Subs** | Entradas ponderadas por tier, bits, donaciones |

- Configuración de entradas por Tier 1/2/3, Prime, resubs
- Soporte para bits y donaciones
- Blacklist de usuarios
- Ruleta animada con ganador
- Historial exportable

### ⚖️ Panel de Jueces
- Múltiples criterios de evaluación ponderados
- Sistema multi-juez (streamers colaboradores)
- Votación pública del chat combinada con puntuaciones
- Presets: Talento, Cocina, Gaming, Arte, Cosplay
- Revelación dramática de resultados
- Overlay dedicado para OBS

### 🔮 Predicciones de Twitch
- Integración nativa con la API de Twitch
- Crear y gestionar predicciones desde la app
- Los viewers apuestan puntos de canal
- Resolución con un clic

### 🎖️ Recompensas de Canal
- Gestión completa de channel points
- Crear, editar y eliminar recompensas
- Ver canjes en tiempo real
- Marcar como completados

### 🎮 Juegos Interactivos (+13 minijuegos)

| Juego | Descripción | Comandos |
|-------|-------------|----------|
| 🎰 **Casino Roulette** | Ruleta con apuestas | `!bet`, `!spin` |
| 🎣 **Chat Fishing** | Pesca competitiva | `!fish`, `!cast` |
| 🔫 **Pium Game** | Duelos western | `!pium @user` |
| 🦆 **Duck Hunt** | Caza de patos | `!shoot` |
| 🚢 **Battleship** | Hundir la flota | `!fire A1` |
| 🥔 **Hot Potato** | Patata caliente | `!pass @user` |
| ❓ **Trivia Battle** | Preguntas y puntos | respuesta directa |
| 👁️ **Veo Veo** | Adivina el objeto | respuesta directa |
| ✂️ **Piedra Papel Tijera** | Torneos PPT | `!piedra/papel/tijera` |
| 📝 **Ahorcado** | Juego de palabras | letra directa |
| 🏎️ **Carrera de Emotes** | Carreras con emotes | emote para votar |
| 🧠 **Memoria IRL** | Memory personalizado | `!flip 1` |
| 🎉 **Party & Co** | Minijuegos variados | varios |

### 📈 Analytics con IA
- Análisis de sentimiento en tiempo real
- Métricas: msgs/min, engagement, retención
- Top usuarios, palabras y emotes
- Mapa de calor de actividad
- Integración opcional con OpenAI/Gemini
- Exportación a CSV/Excel

### 🔊 Panel de Sonidos
- Efectos 8-bit generados al instante
- Redobles, risas, buzzers, fanfarrias
- Sube tus propios audios
- Atajos de teclado

### 🎬 Integración OBS
- Conexión WebSocket automática
- Control de escenas y fuentes
- Overlays con Chroma Key
- URLs dedicadas para cada componente

### 🛡️ Moderación Avanzada
- Cooldown entre votos
- Peso de votos (subs valen más)
- Filtros de antigüedad de cuenta
- Detección de spam
- Logs detallados exportables

### ⚡ Macros y Automatización
- Presets de comandos para moderadores
- Acciones automáticas por eventos
- Temporizadores con mensajes al chat

### 🤖 Mascota AI Vision
- Asistente visual con expresiones dinámicas
- Tour guiado de la aplicación
- Detecta dificultades y ofrece ayuda
- Arrastrable por la pantalla

### 🌐 Multi-plataforma
- **Twitch** - Soporte completo con API
- **YouTube** - Chat en vivo (próximamente)
- **Kick** - Chat en vivo (próximamente)

---

## 🚀 Instalación

### Requisitos
- Node.js 18+
- npm o yarn

### Desarrollo Local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/streamcrowd.git
cd streamcrowd

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local

# Iniciar en modo desarrollo
npm run dev
```

Abre `http://localhost:5173`

### Aplicación de Escritorio

```bash
# Desarrollo con Electron
npm run electron:dev

# Compilar ejecutable
npm run electron:build
```

---

## 🎬 Integración OBS

### Configuración Rápida

1. En OBS: **Agregar → Fuente de navegador**
2. Pega la URL del overlay deseado
3. Tamaño recomendado: 400x600px
4. Marca **"Fondo transparente"**

### URLs de Overlays

```
# Herramientas principales
?overlay=true              # Encuesta
?overlayCountdown=true     # Cuenta regresiva
?overlaySpinner=true       # Ruleta
?overlayRandomWinner=true  # Ganador sorteo
?overlayJudgePanel=true    # Panel de jueces

# Juegos
?overlayPium=true          # Pium Game
?overlayRoulette=true      # Casino
?overlayFishing=true       # Pesca
?overlayTrivia=true        # Trivia
?overlayBattleship=true    # Battleship
?overlayDuckHunt=true      # Duck Hunt
# ... y más
```

Añade `&channel=TU_CANAL` para conexión automática.

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl + ,` | Abrir herramientas |
| `Ctrl + H` | Ver historial |
| `Ctrl + B` | Ocultar sidebar |
| `Ctrl + D` | Cambiar tema |
| `Escape` | Cerrar modal |

---

## 🔍 Linting

StreamCrowd uses ESLint with circular import detection to maintain code quality and prevent dependency cycles.

### Available Commands

```bash
npm run lint              # Run ESLint on all files
npm run lint:fix          # Auto-fix linting issues
npm run lint:check-cycles # Check specifically for circular imports
```

### Circular Import Detection

The project is configured with `eslint-plugin-import` to detect and prevent circular dependencies:

- **`import/no-cycle`**: Detects circular imports with unlimited depth
- **`import/no-self-import`**: Prevents files from importing themselves

These rules help maintain a clean dependency graph and prevent runtime issues caused by circular dependencies.

### Configuration

ESLint configuration is in `eslint.config.js` (ESLint 9 flat config format). Key settings:

```javascript
{
  plugins: {
    import: importPlugin,
  },
  rules: {
    // Circular import detection - CRITICAL for architecture
    'import/no-cycle': ['error', { maxDepth: Infinity, ignoreExternal: true }],
    'import/no-self-import': 'error',
  }
}
```

---

## 🧪 Testing

```bash
npm run test        # Tests unitarios
npm run test:e2e    # Tests E2E
npm run test:all    # Todos
```

---

## 📁 Estructura

```
├── components/        # Componentes React
│   ├── games/        # +13 minijuegos
│   ├── macros/       # Sistema de macros
│   └── mascot/       # Mascota AI
├── hooks/            # Custom hooks
├── src/
│   ├── application/  # Servicios y lógica
│   ├── domain/       # Entidades
│   └── infrastructure/ # Sync, storage
├── i18n/             # Traducciones ES/EN
└── electron/         # App de escritorio
```

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios
4. Push y abre un Pull Request

---

## 📄 Licencia

MIT License - Ver [LICENSE](LICENSE)

---

<div align="center">
  <p>Hecho con 💜 para la comunidad de streamers</p>
</div>
