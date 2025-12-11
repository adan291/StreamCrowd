# Guía de Despliegue Web - TwitchVote

Esta guía explica cómo convertir TwitchVote de una aplicación local a una aplicación web multi-usuario con autenticación, base de datos y hosting.

## Resumen de Cambios Necesarios

| Componente | Estado Actual | Necesario para Web |
|------------|---------------|-------------------|
| Almacenamiento | localStorage | Base de datos (Supabase) |
| Autenticación | Token manual | OAuth con Twitch |
| Hosting | Local/Electron | Vercel/Netlify |
| API Keys | .env local | Variables de entorno servidor |
| Sesiones | Por navegador | Por usuario en BD |

---

## Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                    (Vercel/Netlify)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   React     │  │   Twitch    │  │   Overlay   │         │
│  │   App       │  │   Chat      │  │   Mode      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       SUPABASE                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Auth      │  │  Database   │  │  Storage    │         │
│  │  (Twitch)   │  │ (PostgreSQL)│  │  (Assets)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Paso 1: Configurar Supabase

### 1.1 Crear Proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) y crear cuenta
2. Crear nuevo proyecto
3. Guardar las credenciales:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY` (para operaciones admin)

### 1.2 Configurar Autenticación con Twitch

1. En Supabase Dashboard → Authentication → Providers
2. Habilitar "Twitch"
3. Crear app en [dev.twitch.tv](https://dev.twitch.tv/console/apps):
   - Redirect URL: `https://[tu-proyecto].supabase.co/auth/v1/callback`
4. Copiar Client ID y Client Secret a Supabase

### 1.3 Crear Tablas en la Base de Datos

```sql
-- Tabla de usuarios (extendida de auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  twitch_username TEXT,
  twitch_id TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de encuestas
CREATE TABLE public.polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- [{id, label, color, votes}]
  is_active BOOLEAN DEFAULT true,
  total_votes INTEGER DEFAULT 0,
  max_votes INTEGER,
  duration INTEGER, -- segundos
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de votos
CREATE TABLE public.votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  twitch_user_id TEXT NOT NULL,
  twitch_username TEXT NOT NULL,
  option_id INTEGER NOT NULL,
  weight DECIMAL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, twitch_user_id) -- Un voto por usuario por encuesta
);

-- Tabla de sesiones de stream
CREATE TABLE public.stream_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  channel_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  messages_count INTEGER DEFAULT 0,
  analysis JSONB, -- Análisis de IA
  poll_results JSONB[] -- Resultados de encuestas
);

-- Tabla de configuración de moderación
CREATE TABLE public.moderation_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de assets/media
CREATE TABLE public.media_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL, -- URL de Supabase Storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX idx_polls_user_id ON public.polls(user_id);
CREATE INDEX idx_polls_is_active ON public.polls(is_active);
CREATE INDEX idx_votes_poll_id ON public.votes(poll_id);
CREATE INDEX idx_stream_sessions_user_id ON public.stream_sessions(user_id);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
-- Profiles: usuarios solo ven/editan su perfil
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Polls: usuarios ven sus encuestas, público ve encuestas activas
CREATE POLICY "Users can manage own polls" ON public.polls
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can view active polls" ON public.polls
  FOR SELECT USING (is_active = true);

-- Votes: cualquiera puede votar en encuestas activas
CREATE POLICY "Anyone can vote on active polls" ON public.votes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.polls WHERE id = poll_id AND is_active = true)
  );
CREATE POLICY "Poll owners can view votes" ON public.votes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.polls WHERE id = poll_id AND user_id = auth.uid())
  );
```

### 1.4 Configurar Storage para Assets

```sql
-- Crear bucket para imágenes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media-assets', 'media-assets', true);

-- Política: usuarios suben a su carpeta
CREATE POLICY "Users can upload own assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política: assets públicos
CREATE POLICY "Public assets are viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-assets');
```

---

## Paso 2: Instalar Dependencias

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-react
```

---

## Paso 3: Crear Cliente de Supabase

Crear archivo `services/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para TypeScript
export interface Profile {
  id: string;
  twitch_username: string;
  twitch_id: string;
  avatar_url: string;
}

export interface DBPoll {
  id: string;
  user_id: string;
  title: string;
  question: string;
  options: { id: number; label: string; color: string; votes: number }[];
  is_active: boolean;
  total_votes: number;
  max_votes?: number;
  duration?: number;
  start_time: string;
  end_time?: string;
}
```

---

## Paso 4: Crear Servicio de Autenticación

Crear archivo `services/authService.ts`:

```typescript
import { supabase } from './supabaseClient';

export const authService = {
  // Login con Twitch
  async signInWithTwitch() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        scopes: 'user:read:email chat:read chat:edit',
        redirectTo: window.location.origin,
      },
    });
    return { data, error };
  },

  // Logout
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Obtener sesión actual
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  // Obtener usuario actual
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Listener de cambios de auth
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
```

---

## Paso 5: Crear Servicio de Base de Datos

Crear archivo `services/dbService.ts`:

```typescript
import { supabase, DBPoll } from './supabaseClient';

export const dbService = {
  // === POLLS ===
  async createPoll(poll: Omit<DBPoll, 'id' | 'user_id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('polls')
      .insert({ ...poll, user_id: user.id })
      .select()
      .single();
    
    return { data, error };
  },

  async updatePoll(pollId: string, updates: Partial<DBPoll>) {
    const { data, error } = await supabase
      .from('polls')
      .update(updates)
      .eq('id', pollId)
      .select()
      .single();
    
    return { data, error };
  },

  async getPoll(pollId: string) {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('id', pollId)
      .single();
    
    return { data, error };
  },

  async getUserPolls() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: null };

    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  // === VOTES ===
  async addVote(pollId: string, twitchUserId: string, twitchUsername: string, optionId: number, weight = 1) {
    const { data, error } = await supabase
      .from('votes')
      .upsert({
        poll_id: pollId,
        twitch_user_id: twitchUserId,
        twitch_username: twitchUsername,
        option_id: optionId,
        weight,
      }, {
        onConflict: 'poll_id,twitch_user_id',
      })
      .select()
      .single();
    
    return { data, error };
  },

  async getPollVotes(pollId: string) {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('poll_id', pollId);
    
    return { data, error };
  },

  // === STREAM SESSIONS ===
  async createSession(channelName: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('stream_sessions')
      .insert({ user_id: user.id, channel_name: channelName })
      .select()
      .single();
    
    return { data, error };
  },

  async updateSession(sessionId: string, updates: any) {
    const { data, error } = await supabase
      .from('stream_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();
    
    return { data, error };
  },

  async getUserSessions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: null };

    const { data, error } = await supabase
      .from('stream_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .limit(30);
    
    return { data, error };
  },

  // === MEDIA ASSETS ===
  async uploadAsset(file: File, name: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    
    // Subir archivo
    const { error: uploadError } = await supabase.storage
      .from('media-assets')
      .upload(filePath, file);
    
    if (uploadError) return { data: null, error: uploadError };

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('media-assets')
      .getPublicUrl(filePath);

    // Guardar referencia en BD
    const { data, error } = await supabase
      .from('media_assets')
      .insert({ user_id: user.id, name, url: publicUrl })
      .select()
      .single();
    
    return { data, error };
  },

  async getUserAssets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: null };

    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  async deleteAsset(assetId: string) {
    const { error } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', assetId);
    
    return { error };
  },
};
```

---

## Paso 6: Desplegar en Vercel

### 6.1 Preparar el Proyecto

1. Asegurarse de que `vite.config.ts` tiene `base: '/'` (no `'./'`)
2. Crear archivo `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### 6.2 Variables de Entorno en Vercel

En el dashboard de Vercel, agregar:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIza... (opcional, para IA)
```

### 6.3 Desplegar

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel

# O conectar repo de GitHub en vercel.com
```

---

## Paso 7: Actualizar Componentes

### 7.1 Modificar App.tsx para usar Auth

```typescript
import { useEffect, useState } from 'react';
import { authService } from './services/authService';
import { Session } from '@supabase/supabase-js';

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    authService.getSession().then(({ session }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuchar cambios de auth
    const { data: { subscription } } = authService.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  if (!session) {
    return <LoginScreen onLogin={() => authService.signInWithTwitch()} />;
  }

  return <MainApp user={session.user} />;
};
```

### 7.2 Crear Pantalla de Login

```typescript
const LoginScreen = ({ onLogin }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-black">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-white mb-8">TwitchVote</h1>
      <button
        onClick={onLogin}
        className="flex items-center gap-3 px-6 py-3 bg-twitch-brand hover:bg-twitch-light text-white font-bold rounded-lg transition-colors"
      >
        <TwitchIcon />
        Iniciar sesión con Twitch
      </button>
    </div>
  </div>
);
```

---

## Resumen de Costos

| Servicio | Plan Gratuito | Plan Pro |
|----------|---------------|----------|
| Vercel | 100GB bandwidth/mes | $20/mes |
| Supabase | 500MB DB, 1GB storage | $25/mes |
| Twitch API | Gratis | Gratis |
| Gemini API | 60 req/min gratis | Pay-as-you-go |

**Total mínimo para empezar: $0/mes** (con límites del plan gratuito)

---

## Checklist de Migración

- [ ] Crear proyecto en Supabase
- [ ] Configurar auth con Twitch
- [ ] Crear tablas y políticas RLS
- [ ] Instalar dependencias de Supabase
- [ ] Crear servicios (auth, db)
- [ ] Modificar hooks para usar Supabase en vez de localStorage
- [ ] Crear pantalla de login
- [ ] Configurar variables de entorno
- [ ] Desplegar en Vercel
- [ ] Probar flujo completo
- [ ] Configurar dominio personalizado (opcional)

---

## Notas Importantes

1. **Twitch OAuth**: El token de Twitch que obtienes con Supabase Auth incluye los scopes necesarios para leer/escribir en el chat.

2. **Real-time**: Supabase soporta subscripciones en tiempo real. Puedes usarlo para sincronizar votos entre el panel y el overlay sin usar el chat de Twitch.

3. **Rate Limits**: Twitch tiene límites de mensajes (20 msg/30s para usuarios normales). El sistema actual ya maneja esto.

4. **Backup**: Los datos en Supabase se pueden exportar fácilmente. Considera hacer backups periódicos.

5. **CORS**: Vercel y Supabase manejan CORS automáticamente, no deberías tener problemas.

---

## Próximos Pasos Opcionales

- **Webhooks de Twitch**: Recibir eventos de follows, subs, etc.
- **Dashboard de Analytics**: Gráficos históricos de engagement
- **Temas personalizados**: Guardar configuraciones de overlay por usuario
- **API pública**: Permitir integraciones de terceros
- **PWA**: Convertir en Progressive Web App para instalación
