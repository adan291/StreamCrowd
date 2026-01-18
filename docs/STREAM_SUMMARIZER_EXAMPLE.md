# 📊 Stream Summarizer Hook - Ejemplo de Funcionamiento

## Prompt del Agent Hook

```
Crea un resumen del stream basado en estas estadísticas y devuelve JSON: 
{ 
  "summary": "resumen del stream", 
  "tweet": "tweet sugerido", 
  "highlights": ["momento1", "momento2"], 
  "stats": { "followers": número, "engagement": porcentaje } 
}. 
Estadísticas: {input}
```

## Ejemplo de Input (Estadísticas del Stream)

```json
{
  "duration": "3h 45m",
  "viewers": {
    "peak": 1247,
    "average": 892,
    "unique": 2156
  },
  "chat": {
    "messages": 8934,
    "commands": 456,
    "emotes": 2341,
    "top_emotes": ["Kappa", "PogChamp", "LUL"]
  },
  "followers": {
    "start": 15420,
    "end": 15498,
    "gained": 78
  },
  "subscribers": {
    "new": 12,
    "gifted": 8,
    "total_subs": 234
  },
  "donations": {
    "count": 15,
    "total": 127.50,
    "top_donation": 25.00
  },
  "games_played": [
    {
      "name": "Pium Game",
      "duration": "45m",
      "participants": 156,
      "winner": "StreamerPro123"
    },
    {
      "name": "Casino Roulette",
      "duration": "30m",
      "bets": 89,
      "biggest_win": "RedBull_Fan"
    }
  ],
  "polls": [
    {
      "question": "¿Qué juego jugamos después?",
      "votes": 234,
      "winner": "Valorant"
    }
  ],
  "mood_analysis": {
    "hype_moments": 23,
    "calm_periods": 8,
    "toxic_filtered": 12,
    "overall_sentiment": "positive"
  },
  "technical": {
    "obs_scenes_changed": 45,
    "overlays_updated": 12,
    "connection_issues": 0
  }
}
```

## Ejemplo de Output Esperado

```json
{
  "summary": "¡Stream épico de 3h 45m! Alcanzamos 1,247 viewers en el pico con una comunidad súper activa. Ganamos 78 nuevos followers y 12 subs nuevos. Los juegos fueron un éxito total - el Pium Game tuvo 156 participantes y la ruleta del casino mantuvo a todos en tensión. El chat estuvo increíble con 8,934 mensajes y mucho hype. ¡Gracias por el apoyo increíble!",
  
  "tweet": "🔥 ¡Qué stream más épico! 1,247 viewers pico, +78 followers, +12 subs y juegos increíbles con la comunidad. El Pium Game y la Casino Roulette fueron 🔥🔥 ¡Gracias por tanto amor! #StreamCrowd #Twitch #Gaming",
  
  "highlights": [
    "Pico de 1,247 viewers durante el Pium Game épico",
    "StreamerPro123 ganó el duelo más intenso del Pium",
    "RedBull_Fan se llevó la mayor ganancia en la ruleta",
    "Donación de $25 con mensaje emotivo de la comunidad",
    "Poll masiva con 234 votos eligiendo Valorant",
    "23 momentos de hype puro detectados por la IA"
  ],
  
  "stats": {
    "followers": 78,
    "engagement": 87.3,
    "chat_activity": 94.2,
    "retention": 71.5,
    "sentiment_score": 8.4
  }
}
```

## Cómo Usar en el Código

### 1. Activar el Hook al Final del Stream

```typescript
import { useKiroBridge } from '@/hooks';

function StreamEndHandler() {
  const { sendToKiro } = useKiroBridge();

  const generateStreamSummary = async (streamStats: StreamStats) => {
    try {
      const response = await sendToKiro({
        hook: 'stream-summarizer',
        input: JSON.stringify(streamStats),
        metadata: {
          streamId: 'stream_123',
          streamerName: 'MiCanal',
          platform: 'twitch'
        }
      });

      if (response.success) {
        const summary = response.data;
        
        // Mostrar resumen en UI
        showStreamSummary(summary);
        
        // Auto-generar tweet
        if (summary.tweet) {
          copyToClipboard(summary.tweet);
          showNotification('Tweet copiado al portapapeles!');
        }
        
        // Guardar highlights
        saveHighlights(summary.highlights);
      }
    } catch (error) {
      console.error('Error generando resumen:', error);
    }
  };

  return (
    <button onClick={() => generateStreamSummary(currentStreamStats)}>
      Generar Resumen del Stream
    </button>
  );
}
```

### 2. Componente de Resumen

```typescript
interface StreamSummaryProps {
  summary: {
    summary: string;
    tweet: string;
    highlights: string[];
    stats: {
      followers: number;
      engagement: number;
      chat_activity: number;
      retention: number;
      sentiment_score: number;
    };
  };
}

function StreamSummaryModal({ summary }: StreamSummaryProps) {
  const copyTweet = () => {
    navigator.clipboard.writeText(summary.tweet);
  };

  return (
    <div className="bg-white rounded-lg p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">📊 Resumen del Stream</h2>
      
      {/* Resumen Principal */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Resumen</h3>
        <p className="text-gray-700">{summary.summary}</p>
      </div>

      {/* Tweet Sugerido */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Tweet Sugerido</h3>
        <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
          <p className="text-sm">{summary.tweet}</p>
          <button 
            onClick={copyTweet}
            className="mt-2 text-blue-600 text-sm hover:underline"
          >
            📋 Copiar Tweet
          </button>
        </div>
      </div>

      {/* Highlights */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">🌟 Momentos Destacados</h3>
        <ul className="space-y-1">
          {summary.highlights.map((highlight, index) => (
            <li key={index} className="text-sm text-gray-600">
              • {highlight}
            </li>
          ))}
        </ul>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            +{summary.stats.followers}
          </div>
          <div className="text-sm text-gray-500">Nuevos Followers</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {summary.stats.engagement}%
          </div>
          <div className="text-sm text-gray-500">Engagement</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {summary.stats.chat_activity}%
          </div>
          <div className="text-sm text-gray-500">Actividad Chat</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {summary.stats.sentiment_score}/10
          </div>
          <div className="text-sm text-gray-500">Sentimiento</div>
        </div>
      </div>
    </div>
  );
}
```

### 3. Integración Automática

```typescript
// En el hook principal del stream
function useStreamSession() {
  const { sendToKiro } = useKiroBridge();
  const [streamStats, setStreamStats] = useState<StreamStats>();

  // Recopilar estadísticas durante el stream
  useEffect(() => {
    const interval = setInterval(() => {
      updateStreamStats();
    }, 30000); // Cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  // Auto-generar resumen al terminar
  const endStream = async () => {
    if (streamStats) {
      const summary = await sendToKiro({
        hook: 'stream-summarizer',
        input: JSON.stringify(streamStats)
      });

      // Mostrar modal con resumen
      showStreamSummary(summary.data);
    }
  };

  return { streamStats, endStream };
}
```

## Casos de Uso Adicionales

### 1. Resúmenes Programados
```typescript
// Generar mini-resúmenes cada hora
setInterval(async () => {
  const hourlyStats = getLastHourStats();
  const miniSummary = await sendToKiro({
    hook: 'stream-summarizer',
    input: JSON.stringify(hourlyStats),
    metadata: { type: 'hourly' }
  });
  
  showNotification(miniSummary.data.summary);
}, 3600000); // 1 hora
```

### 2. Comparación con Streams Anteriores
```typescript
const compareWithPreviousStreams = (currentSummary: StreamSummary) => {
  const previousStreams = getRecentStreamSummaries(7); // Últimos 7 streams
  
  return {
    ...currentSummary,
    comparison: {
      followers_growth: calculateGrowthRate(currentSummary.stats.followers),
      engagement_trend: calculateTrend(currentSummary.stats.engagement),
      performance: currentSummary.stats.engagement > getAverageEngagement() ? 'above_average' : 'below_average'
    }
  };
};
```

### 3. Exportación Automática
```typescript
const exportSummary = (summary: StreamSummary) => {
  // Guardar en base de datos
  saveToDatabase(summary);
  
  // Exportar a CSV para análisis
  exportToCSV(summary.stats);
  
  // Enviar a Discord/Slack
  sendToDiscord(summary.tweet);
  
  // Actualizar métricas del dashboard
  updateDashboardMetrics(summary.stats);
};
```

## Personalización del Prompt

Puedes personalizar el prompt según tu estilo:

```typescript
const customPrompts = {
  casual: "Crea un resumen relajado y divertido del stream...",
  professional: "Genera un análisis profesional de la sesión de streaming...",
  hype: "¡Crea un resumen súper emocionante y lleno de energía...!",
  analytical: "Proporciona un resumen detallado con métricas específicas..."
};
```

Este hook es especialmente útil para streamers que quieren:
- **Automatizar** la creación de contenido post-stream
- **Analizar** el rendimiento de cada sesión
- **Compartir** highlights en redes sociales
- **Mantener** un registro histórico de sus streams
- **Mejorar** continuamente basándose en datos