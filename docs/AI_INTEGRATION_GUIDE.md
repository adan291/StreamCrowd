# 🤖 AI Integration Guide - StreamCrowd

Esta guía explica cómo usar los hooks de integración con IA para crear experiencias interactivas avanzadas en StreamCrowd.

## 📋 Resumen de Hooks

### PARTE 1: Agent Hooks (Kiro Platform)

Estos hooks procesan información pesada y devuelven "intenciones" o texto procesado:

| Hook | Descripción | Output JSON |
|------|-------------|-------------|
| `chat-brain` | Analiza chat buscando picos de emoción, preguntas, toxicidad | `{ "action": "alert", "mood": "hype", "response": "..." }` |
| `game-narrator` | Genera frases épicas para eventos de juegos | `{ "speech": "¡El forastero @user ha desenfundado!", "tone": "western" }` |
| `highlight-editor` | Sugiere títulos para clips basándose en chat | `{ "title": "¡Épico fail en el boss!", "confidence": 0.95 }` |
| `stream-summarizer` | Crea resúmenes del stream al final de sesión | `{ "summary": "Hoy ganaste 50 followers...", "tweet": "..." }` |

### PARTE 2: React Hooks (Tu Código)

Estos hooks conectan con Firebase y ejecutan las órdenes de Kiro:

| Hook | Propósito | Funcionalidad |
|------|-----------|---------------|
| `useOverlaySync` | Sincronización Real-time | Escucha Firebase, actualiza overlays |
| `useVoiceSynthesis` | Narrador Local | Text-to-speech sin servidor |
| `useKiroBridge` | Enlace con API | Fetch a Kiro/Vercel APIs |
| `useLocalModerator` | Filtro Rápido | Pre-filtro antes de IA |
| `useThemeOrchestrator` | UI Dinámico | Cambia tema según mood |

---

## 🚀 Guía de Implementación

### 1. useOverlaySync - Sincronización Real-time

**El hook más importante para Vercel.** Escucha cambios en Firebase y actualiza los Overlays.

```typescript
import { useOverlaySync } from '@/hooks';

function MyOverlay() {
  const { state, updateState, isConnected } = useOverlaySync('mi-canal');
  
  // Escuchar cambios
  useEffect(() => {
    if (state.currentPoll) {
      // Actualizar UI del overlay
      console.log('Nueva encuesta:', state.currentPoll);
    }
  }, [state.currentPoll]);
  
  // Actualizar estado
  const startPoll = async () => {
    await updateState({
      currentPoll: { id: '123', question: '¿Qué prefieres?' }
    });
  };
  
  return (
    <div>
      {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
      {state.currentPoll && <PollDisplay poll={state.currentPoll} />}
    </div>
  );
}
```

### 2. useVoiceSynthesis - Narrador Local

**Para evitar latencia y costes de servidores de audio.**

```typescript
import { useVoiceSynthesis } from '@/hooks';

function GameNarrator() {
  const { speak, isSpeaking, voices } = useVoiceSynthesis();
  
  const narrateEvent = async (event: string) => {
    await speak(event, {
      rate: 1.2,        // Velocidad
      pitch: 1.1,       // Tono
      volume: 0.8,      // Volumen
      lang: 'es-ES'     // Idioma
    });
  };
  
  return (
    <div>
      <button 
        onClick={() => narrateEvent('¡Duelo épico comenzando!')}
        disabled={isSpeaking}
      >
        {isSpeaking ? 'Narrando...' : 'Narrar Evento'}
      </button>
      
      <select>
        {voices.map(voice => (
          <option key={voice.name} value={voice.name}>
            {voice.name} ({voice.lang})
          </option>
        ))}
      </select>
    </div>
  );
}
```

### 3. useKiroBridge - Enlace con API

**Envía eventos a tus Agent Hooks de Kiro.**

```typescript
import { useKiroBridge } from '@/hooks';

function ChatAnalyzer() {
  const { sendToKiro, isLoading, error } = useKiroBridge();
  
  const analyzeMessage = async (message: string) => {
    try {
      const response = await sendToKiro({
        hook: 'chat-brain',
        input: message,
        metadata: { timestamp: Date.now() }
      });
      
      if (response.success) {
        console.log('Análisis:', response.data);
        // { action: "hype", mood: "excited", response: "¡El chat está emocionado!" }
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  return (
    <div>
      {isLoading && <div>Analizando...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}
    </div>
  );
}
```

### 4. useLocalModerator - Filtro Rápido

**Pre-filtro antes de enviar nada a la IA.**

```typescript
import { useLocalModerator } from '@/hooks';

function ChatModerator() {
  const { moderateMessage, isSpam, extractCommand } = useLocalModerator();
  
  const handleChatMessage = async (message: ChatMessage) => {
    const result = await moderateMessage(message);
    
    switch (result.action) {
      case 'process_local':
        if (result.command) {
          // Procesar comando localmente
          handleCommand(result.command, result.args);
        }
        break;
        
      case 'send_to_ai':
        // Ya se envió a la IA automáticamente
        break;
        
      case 'block_spam':
        console.log('Spam bloqueado:', result.reason);
        break;
        
      case 'block_toxic':
        console.log('Contenido tóxico bloqueado:', result.reason);
        break;
    }
  };
  
  return <div>Moderación automática activa</div>;
}
```

### 5. useThemeOrchestrator - UI Dinámico

**Cambia tema según el mood detectado por chat-brain.**

```typescript
import { useThemeOrchestrator } from '@/hooks';

function DynamicUI() {
  const { currentMood, setMood, currentTheme } = useThemeOrchestrator();
  
  // Cambiar mood automáticamente basado en IA
  useEffect(() => {
    // Cuando chat-brain detecta "hype"
    if (aiResponse?.mood === 'hype') {
      setMood('hype', 10000); // 10 segundos
    }
  }, [aiResponse]);
  
  return (
    <div 
      style={{
        backgroundColor: currentTheme.colors.background,
        borderColor: currentTheme.colors.border,
        filter: `brightness(${currentTheme.filters.brightness})`
      }}
      className={`transition-all duration-500 ${
        currentMood === 'hype' ? 'animate-pulse' : ''
      }`}
    >
      <h2 style={{ color: currentTheme.colors.primary }}>
        Mood: {currentMood.toUpperCase()}
      </h2>
      
      {/* Overlay con efectos dinámicos */}
      <div 
        data-overlay 
        className="overlay-element"
        style={{
          borderColor: currentTheme.colors.border,
          boxShadow: currentMood === 'toxic' ? '0 0 20px red' : 'none'
        }}
      >
        Contenido del overlay
      </div>
    </div>
  );
}
```

---

## 🔄 Flujo de Integración Completo

### Ejemplo: Procesamiento de Mensaje de Chat

```typescript
function CompleteIntegration() {
  const { moderateMessage } = useLocalModerator();
  const { sendToKiro } = useKiroBridge();
  const { speak } = useVoiceSynthesis();
  const { setMood } = useThemeOrchestrator();
  const { updateState } = useOverlaySync();
  
  const processChatMessage = async (message: ChatMessage) => {
    // 1. Moderación local
    const modResult = await moderateMessage(message);
    
    if (modResult.action === 'send_to_ai') {
      // 2. Análisis con IA
      const aiResponse = await sendToKiro({
        hook: 'chat-brain',
        input: message.message
      });
      
      if (aiResponse.success) {
        // 3. Aplicar mood
        if (aiResponse.data.mood) {
          setMood(aiResponse.data.mood, 8000);
        }
        
        // 4. Narrar respuesta
        if (aiResponse.data.response) {
          await speak(aiResponse.data.response);
        }
        
        // 5. Actualizar overlay
        await updateState({
          mood: aiResponse.data.mood,
          lastActivity: Date.now()
        });
      }
    }
  };
  
  return <div>Integración completa activa</div>;
}
```

---

## ⚙️ Configuración

### Variables de Entorno

```env
# .env.local
VITE_KIRO_API_URL=https://tu-kiro-api.vercel.app
VITE_KIRO_API_KEY=tu-api-key-secreta
```

### Firebase Rules

```javascript
// firebase-rules.json
{
  "rules": {
    "overlayState": {
      "$channelId": {
        ".read": true,
        ".write": "auth != null"
      }
    }
  }
}
```

### CSS Variables para Temas

```css
/* index.css */
:root {
  --color-primary: #6c757d;
  --color-secondary: #495057;
  --color-accent: #adb5bd;
  --color-background: rgba(108, 117, 125, 0.03);
  --color-border: #6c757d;
  --animation-name: none;
  --animation-duration: 500ms;
  --animation-intensity: 1;
}

.overlay-element {
  border: 2px solid var(--color-border);
  background: var(--color-background);
  transition: all var(--animation-duration) ease;
}

.animate-pulse {
  animation: pulse var(--animation-duration) infinite;
}

.animate-shake {
  animation: shake var(--animation-duration) ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
```

---

## 🧪 Testing

### Test de useVoiceSynthesis

```typescript
// tests/hooks/useVoiceSynthesis.test.ts
import { renderHook, act } from '@testing-library/react';
import { useVoiceSynthesis } from '@/hooks';

// Mock speechSynthesis
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: jest.fn(),
    cancel: jest.fn(),
    getVoices: jest.fn(() => [])
  }
});

describe('useVoiceSynthesis', () => {
  it('should speak text', async () => {
    const { result } = renderHook(() => useVoiceSynthesis());
    
    await act(async () => {
      await result.current.speak('Test message');
    });
    
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });
});
```

---

## 🚨 Troubleshooting

### Problemas Comunes

1. **Voice Synthesis no funciona**
   - Verificar que el navegador soporte `speechSynthesis`
   - Asegurar interacción del usuario antes de usar

2. **Kiro API no responde**
   - Verificar `VITE_KIRO_API_URL` y `VITE_KIRO_API_KEY`
   - Revisar CORS en el servidor

3. **Firebase no sincroniza**
   - Verificar reglas de Firebase
   - Comprobar autenticación

4. **Temas no se aplican**
   - Verificar que los elementos tengan `data-overlay`
   - Comprobar variables CSS

### Debug Mode

```typescript
// Activar logs detallados
localStorage.setItem('ai-debug', 'true');

// En los hooks
if (localStorage.getItem('ai-debug')) {
  console.log('AI Debug:', data);
}
```

---

## 📚 Recursos Adicionales

- [Kiro Platform Documentation](https://kiro.ai/docs)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)

---

**Última actualización:** Enero 17, 2026  
**Versión:** 1.0.0