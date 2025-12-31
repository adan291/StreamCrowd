# Custom Commands Enhancement - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CommandPanel                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ CommandList │  │CommandForm  │  │ TemplateLib │              │
│  │             │  │             │  │             │              │
│  │ - Search    │  │ - TextMode  │  │ - Categories│              │
│  │ - Filter    │  │ - VisualMode│  │ - Preview   │              │
│  │ - Categories│  │ - AIGenerate│  │ - QuickAdd  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    VisualCommandEditor                       ││
│  │  ┌──────────┐  ┌────────────────────────────────────────┐   ││
│  │  │BlockPanel│  │           DropZone                      │   ││
│  │  │          │  │  ┌──────┐ ┌──────┐ ┌──────┐            │   ││
│  │  │ - Text   │  │  │Block │→│Block │→│Block │            │   ││
│  │  │ - Var    │  │  └──────┘ └──────┘ └──────┘            │   ││
│  │  │ - Cond   │  │                                         │   ││
│  │  │ - API    │  │  Preview: "¡Hola @usuario! Bienvenido" │   ││
│  │  └──────────┘  └────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. CommandTemplateLibrary

```typescript
interface CommandTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  trigger: string;
  response: string;
  variables: TemplateVariable[];
  userLevel: CommandUserLevel;
  cooldown: number;
  icon: string;
  popularity: number;
}

type TemplateCategory = 
  | 'info'           // Información del canal/stream
  | 'social'         // Redes sociales
  | 'entertainment'  // Entretenimiento/diversión
  | 'moderation'     // Moderación
  | 'utility'        // Utilidades
  | 'games';         // Relacionados con juegos

interface TemplateVariable {
  key: string;       // ej: "TWITTER_USER"
  label: string;     // ej: "Tu usuario de Twitter"
  placeholder: string;
  required: boolean;
}
```

**Plantillas Predefinidas (20+):**

| Categoría | Comando | Trigger | Respuesta |
|-----------|---------|---------|----------|
| Info | Horario | !horario | "📅 Stream: {SCHEDULE}" |
| Info | Discord | !discord | "💬 Únete: {DISCORD_LINK}" |
| Info | Comandos | !comandos | "📋 Lista: {COMMANDS_URL}" |
| Social | Twitter | !twitter | "🐦 Sígueme: twitter.com/{TWITTER}" |
| Social | Instagram | !instagram | "📸 instagram.com/{INSTAGRAM}" |
| Social | YouTube | !youtube | "▶️ youtube.com/{YOUTUBE}" |
| Social | TikTok | !tiktok | "🎵 tiktok.com/@{TIKTOK}" |
| Entertainment | Abrazo | !abrazo | "🤗 $(user) abraza a $(touser)" |
| Entertainment | Dado | !dado | "🎲 $(user) sacó un $(random)" |
| Entertainment | 8ball | !8ball | "🎱 $(user): {RANDOM_RESPONSE}" |
| Entertainment | Love | !love | "💕 Compatibilidad: $(random)%" |
| Moderation | Reglas | !reglas | "📜 {RULES_TEXT}" |
| Moderation | Reportar | !reportar | "⚠️ {REPORT_INFO}" |
| Utility | Uptime | !uptime | "⏱️ En vivo: $(uptime)" |
| Utility | Juego | !juego | "🎮 Jugando: $(game)" |
| Utility | Título | !titulo | "📺 $(title)" |
| Utility | Seguidores | !seguidores | "❤️ $(followers) seguidores" |
| Games | Rank | !rank | "🏆 Mi rango: {RANK}" |
| Games | Stats | !stats | "📊 Stats: {STATS_URL}" |
| Games | Build | !build | "🔧 Build: {BUILD_INFO}" |

### 2. VisualCommandEditor

```typescript
interface CommandBlock {
  id: string;
  type: BlockType;
  config: BlockConfig;
  position: number;
}

type BlockType = 'text' | 'variable' | 'conditional' | 'api';

interface TextBlockConfig {
  type: 'text';
  content: string;
}

interface VariableBlockConfig {
  type: 'variable';
  variable: string; // $(user), $(channel), etc.
}

interface ConditionalBlockConfig {
  type: 'conditional';
  condition: 'has_args' | 'is_sub' | 'is_mod' | 'is_vip' | 'random';
  trueContent: string;
  falseContent: string;
}

interface ApiBlockConfig {
  type: 'api';
  url: string;
  fallback: string;
}

type BlockConfig = TextBlockConfig | VariableBlockConfig | ConditionalBlockConfig | ApiBlockConfig;
```

### 3. AICommandService

```typescript
interface AICommandService {
  generateCommand(description: string, context: ChannelContext): Promise<GeneratedCommand>;
  analyzeCommands(commands: ExportedCommand[]): Promise<CommandAnalysis>;
  suggestImprovements(command: ExportedCommand): Promise<CommandSuggestion[]>;
}

interface GeneratedCommand {
  trigger: string;
  response: string;
  description: string;
  userLevel: CommandUserLevel;
  cooldown: number;
  confidence: number;
  alternatives: Array<{ trigger: string; response: string }>;
}

interface CommandAnalysis {
  totalCommands: number;
  duplicates: Array<{ commands: string[]; reason: string }>;
  similarTriggers: Array<{ triggers: string[]; suggestion: string }>;
  unusedCommands: string[];
  longResponses: Array<{ trigger: string; length: number }>;
  suggestions: CommandSuggestion[];
  newCommandIdeas: Array<{ trigger: string; description: string }>;
}

interface CommandSuggestion {
  type: 'optimize' | 'combine' | 'split' | 'rename' | 'add_variable';
  target: string;
  suggestion: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}
```

### 4. CommandCategory System

```typescript
interface CommandCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  order: number;
}

const DEFAULT_CATEGORIES: CommandCategory[] = [
  { id: 'general', name: 'General', icon: '📋', color: 'gray', isDefault: true, order: 0 },
  { id: 'info', name: 'Información', icon: 'ℹ️', color: 'blue', isDefault: true, order: 1 },
  { id: 'social', name: 'Redes Sociales', icon: '🌐', color: 'purple', isDefault: true, order: 2 },
  { id: 'games', name: 'Juegos', icon: '🎮', color: 'green', isDefault: true, order: 3 },
  { id: 'moderation', name: 'Moderación', icon: '🛡️', color: 'red', isDefault: true, order: 4 },
  { id: 'other', name: 'Otros', icon: '📁', color: 'gray', isDefault: true, order: 5 },
];

interface ExtendedCommand extends ExportedCommand {
  categoryId: string;
  usageCount: number;
  lastUsed?: string;
  createdBy: 'manual' | 'template' | 'ai';
}
```

### 5. CommandTester

```typescript
interface TestContext {
  user: { name: string; level: CommandUserLevel };
  args: string[];
  channel: {
    name: string;
    game: string;
    title: string;
    uptime: string;
    viewers: number;
    followers: number;
  };
}

interface TestResult {
  output: string;
  warnings: string[];
  errors: string[];
  variablesUsed: string[];
}
```

## New Files Structure

```
components/
├── commands/
│   ├── CommandTemplateLibrary.tsx
│   ├── VisualCommandEditor.tsx
│   ├── CommandBlockPanel.tsx
│   ├── CommandBlock.tsx
│   ├── CommandTester.tsx
│   ├── CommandCategoryManager.tsx
│   └── AICommandGenerator.tsx

src/application/
├── hooks/
│   ├── useCommandTemplates.ts
│   ├── useVisualEditor.ts
│   └── useCommandTester.ts
├── services/
│   └── AICommandService.ts

config/
├── commandTemplates.ts
└── commandCategories.ts

types/
└── commandEditor.ts
```

## Integration Points

### DataPanel Integration
El análisis de comandos con IA se mostrará en la sección "Datos":
- Nueva pestaña "Comandos" en el panel de IA
- Métricas de uso de comandos
- Sugerencias de optimización

### Export Format Compatibility
- Versión 1.x: formato actual (compatible)
- Versión 2.x: incluye categorías y metadata extendida
- Import detecta versión y migra automáticamente
