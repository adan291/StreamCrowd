# Diseño: Consolidación del Sistema i18n

## Arquitectura Propuesta

### Estructura de Archivos

```
i18n/
├── index.ts                    # Exports públicos
├── context.tsx                 # Provider y hook (modificado)
├── types.ts                    # Tipos TypeScript centralizados
├── utils.ts                    # Helpers (interpolate, etc.)
├── validation.ts               # Script de validación
├── locales/
│   ├── index.ts               # Combina todos los módulos
│   ├── es/
│   │   ├── index.ts           # Índice español
│   │   ├── common.ts          # Traducciones comunes (~100 claves)
│   │   ├── errors.ts          # Mensajes de error
│   │   ├── navigation.ts      # Navegación y menús
│   │   ├── poll.ts            # Encuestas
│   │   ├── games.ts           # Juegos
│   │   ├── giveaway.ts        # Sorteos
│   │   ├── macros.ts          # Sistema de macros
│   │   ├── commands.ts        # Comandos (integrado)
│   │   ├── predictions.ts     # Predicciones
│   │   ├── rewards.ts         # Recompensas
│   │   ├── moderation.ts      # Moderación
│   │   ├── analytics.ts       # Analíticas
│   │   ├── overlay.ts         # Overlays
│   │   ├── platforms.ts       # Plataformas
│   │   └── misc.ts            # Otros (mascot, chat, etc.)
│   └── en/
│       └── ... (misma estructura)
```

### Componentes del Sistema

#### 1. Tipos Centralizados (`types.ts`)

```typescript
export type Locale = 'es' | 'en';

// Tipos base para cada dominio
export interface CommonTranslations {
  loading: string;
  save: string;
  cancel: string;
  // ...
}

export interface ErrorTranslations {
  componentError: string;
  // ...
}

// Tipo completo combinado
export interface Translations {
  common: CommonTranslations;
  errors: ErrorTranslations;
  nav: NavigationTranslations;
  poll: PollTranslations;
  games: GamesTranslations;
  // ... todos los dominios
}

// Tipo para traducciones lazy
export type LazyTranslationModule = keyof Omit<Translations, 'common' | 'errors'>;
```

#### 2. Context Mejorado (`context.tsx`)

```typescript
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
  loadModule: (module: LazyTranslationModule) => Promise<void>;
  isModuleLoaded: (module: LazyTranslationModule) => boolean;
}
```

#### 3. Lazy Loading Strategy

**Módulos Core (cargados siempre):**
- `common` - Botones, acciones básicas
- `errors` - Mensajes de error
- `nav` - Navegación

**Módulos Lazy (cargados bajo demanda):**
- `poll` - Cuando se accede a encuestas
- `games` - Cuando se accede a juegos
- `giveaway` - Cuando se accede a sorteos
- `macros` - Cuando se accede a macros
- `commands` - Cuando se accede a comandos
- `predictions` - Cuando se accede a predicciones
- `rewards` - Cuando se accede a recompensas
- `moderation` - Cuando se accede a moderación
- `analytics` - Cuando se accede a analíticas
- `overlay` - Cuando se accede a overlays
- `platforms` - Cuando se accede a plataformas
- `misc` - Mascota, chat, etc.

### Implementación del Lazy Loading

```typescript
// Hook para cargar módulos bajo demanda
export function useTranslationModule(module: LazyTranslationModule) {
  const { loadModule, isModuleLoaded } = useI18n();
  
  useEffect(() => {
    if (!isModuleLoaded(module)) {
      loadModule(module);
    }
  }, [module]);
}

// Uso en componentes
function GamesPanel() {
  useTranslationModule('games');
  const { t } = useI18n();
  // t.games ahora está disponible
}
```

### Validación de Traducciones

```typescript
// validation.ts
export function validateTranslations(): ValidationResult {
  const esKeys = getAllKeys(esTranslations);
  const enKeys = getAllKeys(enTranslations);
  
  return {
    missingInEn: esKeys.filter(k => !enKeys.includes(k)),
    missingInEs: enKeys.filter(k => !esKeys.includes(k)),
    totalKeys: esKeys.length,
    coverage: {
      es: 100,
      en: (enKeys.length / esKeys.length) * 100
    }
  };
}
```

## Plan de Migración

### Fase 1: Preparación
1. Crear estructura de carpetas
2. Definir tipos en `types.ts`
3. Crear archivo de utilidades

### Fase 2: División de Traducciones
1. Extraer traducciones comunes a `common.ts`
2. Extraer errores a `errors.ts`
3. Extraer navegación a `navigation.ts`
4. Continuar con cada dominio

### Fase 3: Integración
1. Actualizar `context.tsx` con lazy loading
2. Integrar `commandEnhancementLocales.ts`
3. Crear índices que combinan módulos

### Fase 4: Validación
1. Implementar script de validación
2. Crear tests de cobertura
3. Documentar convenciones

## Propiedades de Correctitud

### P1: Completitud de Traducciones
**Propiedad:** Para toda clave K en el idioma español, debe existir la misma clave K en inglés.
```
∀k ∈ keys(es) → k ∈ keys(en)
```

### P2: Consistencia de Tipos
**Propiedad:** El tipo de valor para una clave debe ser consistente entre idiomas.
```
∀k ∈ keys(translations) → typeof(es[k]) === typeof(en[k])
```

### P3: Interpolación Válida
**Propiedad:** Toda variable en un string de traducción debe tener un valor correspondiente.
```
∀var ∈ extractVars(translation) → var ∈ providedValues
```

### P4: Fallback Garantizado
**Propiedad:** Si una traducción no existe en el idioma actual, se usa el español.
```
t(key, locale) = translations[locale][key] ?? translations['es'][key]
```

## Consideraciones de Rendimiento

- **Bundle inicial:** Solo ~20% de traducciones (common, errors, nav)
- **Lazy chunks:** Cada módulo ~5-15KB
- **Caché:** Módulos cargados se mantienen en memoria
- **Preload:** Opción de precargar módulos probables

## Testing

### Tests Unitarios
- Validación de estructura de tipos
- Interpolación de variables
- Fallback a español

### Tests de Integración
- Lazy loading funciona correctamente
- Cambio de idioma actualiza todas las traducciones
- Módulos se cachean correctamente

### Tests de Propiedad (PBT)
- P1: Completitud verificada con generación de claves
- P3: Interpolación con valores aleatorios
