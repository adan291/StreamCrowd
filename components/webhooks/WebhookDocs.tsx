// WebhookDocs - Inline documentation for webhook integration

import React, { useState } from 'react';
import { WebhookEventType, WEBHOOK_API_VERSION } from '../../types/webhooks';

type CodeLanguage = 'nodejs' | 'python' | 'php';

const EVENT_EXAMPLES: Record<WebhookEventType, { description: string; payload: object }> = {
  follower: {
    description: 'Se dispara cuando un usuario sigue el canal',
    payload: {
      user_id: '12345',
      user_name: 'nuevo_follower',
      followed_at: 1703894400000,
    },
  },
  raid: {
    description: 'Se dispara cuando otro streamer hace raid al canal',
    payload: {
      from_broadcaster_id: '67890',
      from_broadcaster_name: 'otro_streamer',
      viewers: 150,
    },
  },
  subscription: {
    description: 'Se dispara cuando un usuario se suscribe',
    payload: {
      user_id: '12345',
      user_name: 'subscriber',
      tier: '1000',
      is_gift: false,
      cumulative_months: 3,
    },
  },
  bits: {
    description: 'Se dispara cuando un usuario dona bits',
    payload: {
      user_id: '12345',
      user_name: 'donante',
      bits_used: 500,
      message: '¡Gracias por el stream!',
    },
  },
  poll_started: {
    description: 'Se dispara cuando se inicia una encuesta',
    payload: {
      poll_id: 'poll_123',
      title: '¿Qué juego jugamos?',
      options: [
        { id: 'opt_1', title: 'Minecraft' },
        { id: 'opt_2', title: 'Fortnite' },
      ],
      started_at: 1703894400000,
      status: 'active',
    },
  },
  poll_ended: {
    description: 'Se dispara cuando finaliza una encuesta',
    payload: {
      poll_id: 'poll_123',
      title: '¿Qué juego jugamos?',
      options: [
        { id: 'opt_1', title: 'Minecraft', votes: 45 },
        { id: 'opt_2', title: 'Fortnite', votes: 32 },
      ],
      ended_at: 1703894700000,
      status: 'completed',
    },
  },
  prediction_started: {
    description: 'Se dispara cuando se inicia una predicción',
    payload: {
      prediction_id: 'pred_123',
      title: '¿Ganaré esta partida?',
      outcomes: [
        { id: 'out_1', title: 'Sí' },
        { id: 'out_2', title: 'No' },
      ],
      started_at: 1703894400000,
      status: 'active',
    },
  },
  prediction_resolved: {
    description: 'Se dispara cuando se resuelve una predicción',
    payload: {
      prediction_id: 'pred_123',
      title: '¿Ganaré esta partida?',
      outcomes: [
        { id: 'out_1', title: 'Sí', users: 120, points: 50000 },
        { id: 'out_2', title: 'No', users: 80, points: 30000 },
      ],
      winning_outcome_id: 'out_1',
      ended_at: 1703895000000,
      status: 'resolved',
    },
  },
  giveaway_winner: {
    description: 'Se dispara cuando se selecciona un ganador de sorteo',
    payload: {
      giveaway_id: 'giveaway_123',
      title: 'Sorteo de suscripción',
      winner_id: '12345',
      winner_name: 'ganador_afortunado',
      total_participants: 250,
    },
  },
  macro_executed: {
    description: 'Se dispara cuando se ejecuta una macro',
    payload: {
      macro_id: 'macro_123',
      macro_name: 'Cambio de escena automático',
      trigger_type: 'chat_command',
      actions_executed: 3,
      success: true,
    },
  },
};

const SIGNATURE_CODE: Record<CodeLanguage, string> = {
  nodejs: `const crypto = require('crypto');

function verifySignature(payload, signature, secret, timestamp) {
  // Check timestamp (5 minute tolerance)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    return false;
  }

  // Calculate expected signature
  const message = \`\${timestamp}.\${payload}\`;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express middleware example
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = parseInt(req.headers['x-webhook-timestamp']);
  const payload = JSON.stringify(req.body);

  if (!verifySignature(payload, signature, SECRET, timestamp)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook...
  console.log('Event:', req.body.event_type);
  res.json({ success: true });
});`,

  python: `import hmac
import hashlib
import time
from flask import Flask, request, jsonify

app = Flask(__name__)
SECRET = 'your_webhook_secret'

def verify_signature(payload: str, signature: str, secret: str, timestamp: int) -> bool:
    # Check timestamp (5 minute tolerance)
    now = int(time.time())
    if abs(now - timestamp) > 300:
        return False

    # Calculate expected signature
    message = f"{timestamp}.{payload}"
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    # Timing-safe comparison
    return hmac.compare_digest(signature, expected)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    timestamp = int(request.headers.get('X-Webhook-Timestamp', 0))
    payload = request.get_data(as_text=True)

    if not verify_signature(payload, signature, SECRET, timestamp):
        return jsonify({'error': 'Invalid signature'}), 401

    # Process webhook...
    data = request.json
    print(f"Event: {data['event_type']}")
    return jsonify({'success': True})`,

  php: `<?php
$secret = 'your_webhook_secret';

function verifySignature($payload, $signature, $secret, $timestamp) {
    // Check timestamp (5 minute tolerance)
    $now = time();
    if (abs($now - $timestamp) > 300) {
        return false;
    }

    // Calculate expected signature
    $message = $timestamp . '.' . $payload;
    $expected = 'sha256=' . hash_hmac('sha256', $message, $secret);

    // Timing-safe comparison
    return hash_equals($signature, $expected);
}

// Handle webhook
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
$timestamp = intval($_SERVER['HTTP_X_WEBHOOK_TIMESTAMP'] ?? 0);

if (!verifySignature($payload, $signature, $secret, $timestamp)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Process webhook...
$data = json_decode($payload, true);
error_log('Event: ' . $data['event_type']);
echo json_encode(['success' => true]);`,
};

export const WebhookDocs: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<WebhookEventType>('follower');
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>('nodejs');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(SIGNATURE_CODE[selectedLanguage]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const eventTypes = Object.keys(EVENT_EXAMPLES) as WebhookEventType[];

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold">Documentación de Webhooks</h2>

      {/* API Overview */}
      <section className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="font-semibold mb-3">Información General</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Versión API:</span>
            <span className="ml-2 font-mono">{WEBHOOK_API_VERSION}</span>
          </div>
          <div>
            <span className="text-gray-400">Método:</span>
            <span className="ml-2 font-mono">POST</span>
          </div>
          <div>
            <span className="text-gray-400">Content-Type:</span>
            <span className="ml-2 font-mono">application/json</span>
          </div>
          <div>
            <span className="text-gray-400">Timeout:</span>
            <span className="ml-2">10 segundos</span>
          </div>
        </div>
      </section>

      {/* Headers */}
      <section className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="font-semibold mb-3">Headers</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="pb-2">Header</th>
              <th className="pb-2">Descripción</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1 font-mono text-purple-400">X-Webhook-Signature</td>
              <td>Firma HMAC-SHA256 del payload</td>
            </tr>
            <tr>
              <td className="py-1 font-mono text-purple-400">X-Webhook-Timestamp</td>
              <td>Unix timestamp de cuando se envió</td>
            </tr>
            <tr>
              <td className="py-1 font-mono text-purple-400">X-API-Version</td>
              <td>Versión del API ({WEBHOOK_API_VERSION})</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Payload Structure */}
      <section className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="font-semibold mb-3">Estructura del Payload</h3>
        <pre className="p-3 bg-gray-900 rounded text-sm overflow-x-auto">
{`{
  "event_type": "follower",
  "event_id": "evt_1703894400_abc123",
  "timestamp": 1703894400000,
  "api_version": "${WEBHOOK_API_VERSION}",
  "stream": {
    "channel_name": "tu_canal",
    "platform": "twitch",
    "viewers": 150
  },
  "data": {
    // Datos específicos del evento
  }
}`}
        </pre>
      </section>

      {/* Event Examples */}
      <section className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="font-semibold mb-3">Ejemplos de Eventos</h3>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {eventTypes.map(event => (
            <button
              key={event}
              onClick={() => setSelectedEvent(event)}
              className={`px-3 py-1 text-sm rounded ${
                selectedEvent === event
                  ? 'bg-purple-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {event}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            {EVENT_EXAMPLES[selectedEvent].description}
          </p>
          <pre className="p-3 bg-gray-900 rounded text-sm overflow-x-auto">
            {JSON.stringify(EVENT_EXAMPLES[selectedEvent].payload, null, 2)}
          </pre>
        </div>
      </section>

      {/* Signature Verification */}
      <section className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Verificación de Firma</h3>
          <div className="flex gap-2">
            {(['nodejs', 'python', 'php'] as CodeLanguage[]).map(lang => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3 py-1 text-sm rounded ${
                  selectedLanguage === lang
                    ? 'bg-purple-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {lang === 'nodejs' ? 'Node.js' : lang === 'python' ? 'Python' : 'PHP'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <pre className="p-3 bg-gray-900 rounded text-xs overflow-x-auto max-h-96">
            {SIGNATURE_CODE[selectedLanguage]}
          </pre>
          <button
            onClick={handleCopyCode}
            className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
          >
            {copiedCode ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
      </section>

      {/* Zapier/IFTTT Integration */}
      <section className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="font-semibold mb-3">Integración con Zapier/IFTTT</h3>
        
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-purple-400 mb-2">Zapier</h4>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Crea un nuevo Zap con trigger "Webhooks by Zapier"</li>
              <li>Selecciona "Catch Hook"</li>
              <li>Copia la URL del webhook de Zapier</li>
              <li>Añádela como webhook outgoing en TwitchVote</li>
              <li>Envía un evento de prueba para configurar los campos</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium text-purple-400 mb-2">IFTTT</h4>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Crea un nuevo Applet con trigger "Webhooks"</li>
              <li>Selecciona "Receive a web request"</li>
              <li>Define un nombre de evento (ej: "twitchvote_follower")</li>
              <li>Usa la URL de IFTTT Webhooks como destino</li>
              <li>Configura la acción deseada (notificación, tweet, etc.)</li>
            </ol>
          </div>

          <div className="p-3 bg-yellow-900/30 rounded border border-yellow-700">
            <p className="text-yellow-400 text-xs">
              ⚠️ Nota: Zapier e IFTTT no soportan verificación de firma HMAC. 
              Considera usar un servicio intermedio si necesitas mayor seguridad.
            </p>
          </div>
        </div>
      </section>

      {/* Rate Limits */}
      <section className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="font-semibold mb-3">Límites y Reintentos</h3>
        <ul className="space-y-2 text-sm">
          <li>• <strong>Rate limit:</strong> 100 requests/minuto por webhook</li>
          <li>• <strong>Reintentos:</strong> Máximo 3 intentos con backoff exponencial</li>
          <li>• <strong>Delays:</strong> 1s, 2s, 4s entre reintentos</li>
          <li>• <strong>Timeout:</strong> 10 segundos por request</li>
          <li>• <strong>Retención de logs:</strong> 7 días</li>
        </ul>
      </section>
    </div>
  );
};

export default WebhookDocs;
