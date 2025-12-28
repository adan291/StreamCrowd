# Arquitectura Hexagonal - src/

Este directorio contiene la implementación de la arquitectura hexagonal (puertos y adaptadores) de TwitchVote Live.

## Estructura

```
src/
├── domain/           # Lógica de negocio pura (sin dependencias externas)
├── application/      # Servicios de aplicación, hooks y juegos
├── infrastructure/   # Implementaciones concretas (adapters, factories)
└── index.ts          # Exports principales
```

## Capas

### Domain (`domain/`)

Contiene la lógica de negocio pura. **NO debe importar nada de otras capas ni dependencias externas**.

- `entities/` - Modelos de datos (Poll, Vote, StreamEvent, etc.)
- `ports/` - Interfaces que definen contratos (IChatProvider, IOBSController, etc.)

### Application (`application/`)

Orquesta la lógica de negocio y proporciona APIs para la capa de presentación.

- `services/` - Servicios de aplicación (ModerationService, AnalyticsService, etc.)
- `hooks/` - Hooks de React que exponen los servicios
- `games/` - Servicios específicos para cada juego

### Infrastructure (`infrastructure/`)

Implementaciones concretas de los puertos definidos en domain.

- `adapters/` - Implementaciones de interfaces (TwitchAdapter, OBSWebSocketAdapter, etc.)
- `factories/` - Factory y DI container
- `sync/` - Sincronización con Firebase
- `auth/` - Autenticación OAuth

## Cómo añadir un nuevo servicio

1. **Definir la interfaz** en `domain/ports/`:
```typescript
// domain/ports/IMyProvider.ts
export interface IMyProvider {
  doSomething(): Promise<void>;
}
```

2. **Crear el servicio** en `application/services/`:
```typescript
// application/services/MyService.ts
export class MyService {
  constructor(private provider: IMyProvider) {}
  
  async execute() {
    await this.provider.doSomething();
  }
}
```

3. **Implementar el adapter** en `infrastructure/adapters/`:
```typescript
// infrastructure/adapters/MyAdapter.ts
import type { IMyProvider } from '../../domain/ports/IMyProvider';

export class MyAdapter implements IMyProvider {
  async doSomething() {
    // Implementación concreta
  }
}
```

4. **Crear el hook** en `application/hooks/`:
```typescript
// application/hooks/useMyService.ts
export function useMyService() {
  const service = useMemo(() => new MyService(new MyAdapter()), []);
  return service;
}
```

## Convenciones de naming

- **Entidades**: PascalCase, singular (`Poll.ts`, `Vote.ts`)
- **Interfaces/Ports**: Prefijo `I` (`IChatProvider.ts`, `IOBSController.ts`)
- **Servicios**: Sufijo `Service` (`ModerationService.ts`, `AnalyticsService.ts`)
- **Adapters**: Sufijo `Adapter` (`TwitchAdapter.ts`, `OBSWebSocketAdapter.ts`)
- **Hooks**: Prefijo `use` (`usePollService.ts`, `useOBS.ts`)

## Reglas de dependencias

```
Presentation → Application → Domain ← Infrastructure
                    ↓
              Infrastructure
```

- **Domain** no importa de ninguna otra capa
- **Application** importa de Domain e Infrastructure (via interfaces)
- **Infrastructure** importa de Domain (para implementar interfaces)
- **Presentation** (components/) importa de Application (hooks)

## Tests

Los tests de servicios están en `tests/services/`:

- `*.test.ts` - Tests unitarios
- `*.property.test.ts` - Tests de propiedades (fast-check)

Ejecutar tests:
```bash
npm test                    # Todos los tests
npm test -- --run services  # Solo tests de servicios
```
