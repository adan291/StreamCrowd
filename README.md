<div align="center">
  <img src="public/ai-vision-icon.png" alt="TwitchVote Logo" width="120" />
  
  # TwitchVote Live
  
  **Suite completa de herramientas interactivas para streamers de Twitch**
  
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
  [![Electron](https://img.shields.io/badge/Electron-39-47848F?logo=electron)](https://www.electronjs.org/)
  
  [Demo](#demo) • [Características](#-características) • [Instalación](#-instalación) • [Juegos](#-juegos-interactivos) • [Documentación](#-documentación)
</div>

---

## 🎯 ¿Qué es TwitchVote?

TwitchVote es una aplicación todo-en-uno para streamers que quieren aumentar la interacción con su audiencia. Incluye encuestas en tiempo real, **+13 juegos interactivos** controlados por chat, sorteos, panel de jueces, analytics avanzados, y herramientas de moderación.

Disponible como **aplicación web** (PWA) y **aplicación de escritorio** (Electron).

---

## ✨ Características

### 📊 Encuestas en Vivo
- Creación de encuestas con opciones personalizables
- Votación por chat con prefijos configurables (`+1`, `#opcion`, etc.)
- Modo de coincidencia exacta o parcial para votos
- Límite de votos y duración opcional
- Historial de encuestas con exportación a Excel
- Modo overlay transparente para OBS/Streamlabs
- Ruleta/Spinner para selección aleatoria de opciones

### 🎮 Juegos Interactivos (+13 minijuegos)

| Juego | Descripción | Comando Chat |
|-------|-------------|--------------|
| � ***Casino Roulette** | Ruleta de casino con apuestas del chat | `!bet`, `!spin` |
| 🎣 **Chat Fishing** | Pesca competitiva con ranking | `!fish`, `!cast` |
| 🔫 **Pium Game** | Duelos rápidos estilo western | `!pium @user` |
| 🦆 **Duck Hunt** | Caza de patos clásica | `!shoot` |
| 🚢 **Battleship** | Hundir la flota colaborativo | `!fire A1` |
| 🥔 **Hot Potato** | Patata caliente entre usuarios | `!pass @user` |
| ❓ **Trivia Battle** | Preguntas y respuestas con puntos | respuesta directa |
| 👁️ **Veo Veo** | Adivina el objeto oculto | respuesta directa |
| ✂️ **Piedra Papel Tijera** | Torneos de PPT | `!piedra`, `!papel`, `!tijera` |
| 📝 **Ahorcado** | El clásico juego de palabras | letra directa |
| 🏎️ **Carrera de Emotes** | Carreras con emotes del canal | emote para votar |
| 🧠 **Memoria IRL** | Memory con imágenes personalizadas | `!flip 1`, `!flip 2` |
| 🎉 **Party & Co** | Minijuegos variados estilo party | varios comandos |

### 🎁 Sorteos y Giveaways
- Sorteos por palabra clave
- Filtros: solo subs, followers, antigüedad de cuenta
- Ruleta visual con animación
- Selección de ganador aleatorio con overlay
- Historial de ganadores exportable

### ⚖️ Panel de Jueces
- Sistema de puntuación multi-criterio personalizable
- Múltiples jueces (streamers colaboradores)
- Votación pública del chat combinada
- Revelación dramática de resultados
- Overlay dedicado para OBS

### 📈 Analytics Avanzados
- Análisis de sentimiento del chat en tiempo real
- Métricas: msgs/min, engagement, retención de usuarios
- Gráficos de actividad y tendencia emocional
- Top usuarios, palabras frecuentes y emotes populares
- Mapa de calor de actividad
- Índice de salud del chat
- Detección de idioma dominante
- Exportación de datos a CSV
- Historial de sesiones guardadas

### 🎬 Stream Events
- Captura de subs, resubs, gifts, bits, raids
- Notificaciones visuales personalizables
- Historial de eventos del stream

### 🛡️ Moderación Avanzada
- Filtros de antigüedad de cuenta
- Cooldown entre votos
- Peso de votos (subs valen más)
- Detección de spam
- Logs exportables
- Presets de configuración

### 🤖 Mascota AI Interactiva
- Asistente visual con expresiones dinámicas
- Detecta dificultades del usuario y ofrece ayuda
- Arrastrable por la pantalla
- Integración opcional con Gemini API
- Animaciones y estados emocionales

### 🎨 Personalización
- Temas claro/oscuro
- Colores personalizables para encuestas
- Overlays transparentes para OBS
- Soporte multi-idioma (ES/EN)
- Atajos de teclado configurables
- SoundBoard integrado

### 🔗 Colaboración Multi-Canal
- Conecta múltiples canales de Twitch
- Votos combinados de diferentes chats
- Ideal para colaboraciones entre streamers

---

## 🚀 Instalación

### Requisitos
- Node.js 18+
- npm o yarn

### Desarrollo Local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/twitchvote-live.git
cd twitchvote-live

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales

# Iniciar en modo desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### Aplicación de Escritorio (Electron)

```bash
# Desarrollo con Electron
npm run electron:dev

# Compilar ejecutable
npm run electron:build
```

### Despliegue Web

```bash
# Compilar para producción
npm run build

# Preview local
npm run preview
```

Compatible con Vercel, Netlify, o cualquier hosting estático.

---

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env.local` en la raíz:

```env
# Twitch OAuth (opcional - para funciones avanzadas)
VITE_TWITCH_CLIENT_ID=tu_client_id
VITE_TWITCH_REDIRECT_URI=http://localhost:5173/auth/callback

# Gemini API (opcional - para mascota AI)
GEMINI_API_KEY=tu_api_key
```

### Conexión a Twitch

1. Abre la aplicación
2. Ingresa el nombre de tu canal
3. (Opcional) Conecta con OAuth para funciones avanzadas:
   - Enviar mensajes al chat
   - Acceder a lista de subs
   - Emotes personalizados del canal

---

## 🎬 Uso con OBS

### Overlay de Encuestas

1. En TwitchVote, crea una encuesta
2. Click en "Abrir Overlay"
3. En OBS: Agregar → Fuente de navegador
4. URL: `http://localhost:5173/?overlay=true&channel=TU_CANAL`
5. Ancho: 400px, Alto: 600px
6. Marcar "Fondo transparente"

### Overlays Disponibles

Cada componente tiene su propio overlay para OBS:

```
# Encuestas y Herramientas
?overlay=true              # Encuesta principal
?overlayCountdown=true     # Cuenta regresiva
?overlaySpinner=true       # Ruleta/Spinner
?overlayRandomWinner=true  # Ganador aleatorio
?overlayJudgePanel=true    # Panel de jueces

# Juegos
?overlayPium=true          # Pium Game
?overlayRoulette=true      # Casino Roulette
?overlayFishing=true       # Chat Fishing
?overlayPotato=true        # Hot Potato
?overlayTrivia=true        # Trivia Battle
?overlayBattleship=true    # Battleship
?overlayDuckHunt=true      # Duck Hunt
?overlayVeoVeo=true        # Veo Veo
?overlayPPT=true           # Piedra Papel Tijera
?overlayAhorcado=true      # Ahorcado
?overlayCarrera=true       # Carrera de Emotes
?overlayMemoria=true       # Memoria IRL
?overlayPartyCo=true       # Party & Co
```

Añade `&channel=TU_CANAL` a cualquier URL para conectar automáticamente.

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl + ,` | Abrir herramientas |
| `Ctrl + H` | Ver historial |
| `Ctrl + B` | Ocultar/mostrar sidebar |
| `Ctrl + D` | Cambiar tema claro/oscuro |
| `Escape` | Cerrar modal activo |

---

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests E2E con Playwright
npm run test:e2e

# Tests E2E con UI
npm run test:e2e:ui

# Todos los tests
npm run test:all
```

---

## 📁 Estructura del Proyecto

```
├── components/           # Componentes React
│   ├── games/           # 13+ juegos interactivos
│   └── mascot/          # Mascota AI
├── hooks/               # Custom hooks (polls, moderation, analytics...)
├── services/            # Servicios (Twitch, AI, chat analysis...)
├── context/             # React Context providers
├── i18n/                # Traducciones ES/EN
├── constants/           # Constantes y storage keys
├── electron/            # Código Electron para desktop
├── tests/               # Tests unitarios y E2E
└── public/              # Assets estáticos
```

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! 

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añade nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

<div align="center">
  <p>Hecho con 💜 para la comunidad de Twitch</p>
</div>
