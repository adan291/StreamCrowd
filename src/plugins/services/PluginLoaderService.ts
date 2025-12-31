// Plugin Loader Service - Carga y valida plugins
import {
  PluginManifest,
  PluginPermission,
  PluginValidationResult,
  JSONSchema,
  PERMISSION_DESCRIPTIONS
} from '../../../types/plugins';

const APP_VERSION = '1.0.0';
const VALID_PERMISSIONS = Object.keys(PERMISSION_DESCRIPTIONS) as PluginPermission[];

export class PluginLoaderService {
  
  // ============================================
  // Load from File (ZIP)
  // ============================================

  async loadFromFile(file: File): Promise<{ manifest: PluginManifest; code: string }> {
    if (!file.name.endsWith('.zip')) {
      throw new Error('Plugin debe ser un archivo .zip');
    }

    const zip = await this.unzipFile(file);
    const manifest = await this.extractManifest(zip);
    const code = await this.extractCode(zip, manifest.main);

    const validation = this.validateManifest(manifest);
    if (!validation.valid) {
      throw new Error(`Manifest inválido: ${validation.errors.join(', ')}`);
    }

    return { manifest, code };
  }

  // ============================================
  // Load from URL
  // ============================================

  async loadFromURL(url: string): Promise<{ manifest: PluginManifest; code: string }> {
    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error('URL inválida');
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error descargando plugin: ${response.status}`);
    }

    const blob = await response.blob();
    const file = new File([blob], 'plugin.zip', { type: 'application/zip' });
    
    return this.loadFromFile(file);
  }

  // ============================================
  // Load from JSON (for development)
  // ============================================

  loadFromJSON(manifestJson: string, code: string): { manifest: PluginManifest; code: string } {
    let manifest: PluginManifest;
    
    try {
      manifest = JSON.parse(manifestJson);
    } catch {
      throw new Error('Manifest JSON inválido');
    }

    const validation = this.validateManifest(manifest);
    if (!validation.valid) {
      throw new Error(`Manifest inválido: ${validation.errors.join(', ')}`);
    }

    return { manifest, code };
  }

  // ============================================
  // Manifest Validation
  // ============================================

  validateManifest(manifest: unknown): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!manifest || typeof manifest !== 'object') {
      return { valid: false, errors: ['Manifest debe ser un objeto'], warnings: [] };
    }

    const m = manifest as Record<string, unknown>;

    // Required fields
    if (!m.id || typeof m.id !== 'string') {
      errors.push('Campo "id" requerido (string)');
    } else if (!/^[a-z0-9-]+$/.test(m.id)) {
      errors.push('Campo "id" solo puede contener letras minúsculas, números y guiones');
    }

    if (!m.name || typeof m.name !== 'string') {
      errors.push('Campo "name" requerido (string)');
    }

    if (!m.version || typeof m.version !== 'string') {
      errors.push('Campo "version" requerido (string)');
    } else if (!/^\d+\.\d+\.\d+/.test(m.version)) {
      errors.push('Campo "version" debe ser semver (ej: 1.0.0)');
    }

    if (!m.description || typeof m.description !== 'string') {
      errors.push('Campo "description" requerido (string)');
    }

    if (!m.author || typeof m.author !== 'string') {
      errors.push('Campo "author" requerido (string)');
    }

    if (!m.minAppVersion || typeof m.minAppVersion !== 'string') {
      errors.push('Campo "minAppVersion" requerido (string)');
    }

    if (!m.main || typeof m.main !== 'string') {
      errors.push('Campo "main" requerido (string)');
    }

    // Permissions
    if (!m.permissions || !Array.isArray(m.permissions)) {
      errors.push('Campo "permissions" requerido (array)');
    } else {
      const invalidPerms = (m.permissions as string[]).filter(
        p => !VALID_PERMISSIONS.includes(p as PluginPermission)
      );
      if (invalidPerms.length > 0) {
        errors.push(`Permisos inválidos: ${invalidPerms.join(', ')}`);
      }
    }

    // Optional fields validation
    if (m.homepage && typeof m.homepage !== 'string') {
      warnings.push('Campo "homepage" debe ser string');
    }

    if (m.repository && typeof m.repository !== 'string') {
      warnings.push('Campo "repository" debe ser string');
    }

    if (m.configSchema) {
      const schemaValidation = this.validateConfigSchema(m.configSchema);
      if (!schemaValidation.valid) {
        errors.push(...schemaValidation.errors.map(e => `configSchema: ${e}`));
      }
    }

    // Version compatibility check
    if (m.minAppVersion && typeof m.minAppVersion === 'string') {
      if (!this.isVersionCompatible(m.minAppVersion as string)) {
        errors.push(`Plugin requiere versión ${m.minAppVersion}, app actual es ${APP_VERSION}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ============================================
  // Config Schema Validation
  // ============================================

  validateConfigSchema(schema: unknown): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!schema || typeof schema !== 'object') {
      return { valid: false, errors: ['Schema debe ser un objeto'], warnings: [] };
    }

    const s = schema as Record<string, unknown>;

    if (s.type !== 'object') {
      errors.push('Schema type debe ser "object"');
    }

    if (!s.properties || typeof s.properties !== 'object') {
      errors.push('Schema debe tener "properties"');
    } else {
      const props = s.properties as Record<string, unknown>;
      for (const [key, prop] of Object.entries(props)) {
        if (!prop || typeof prop !== 'object') {
          errors.push(`Propiedad "${key}" debe ser un objeto`);
          continue;
        }

        const p = prop as Record<string, unknown>;
        const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
        if (!p.type || !validTypes.includes(p.type as string)) {
          errors.push(`Propiedad "${key}" tiene tipo inválido`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ============================================
  // Permission Validation
  // ============================================

  validatePermissions(permissions: PluginPermission[]): boolean {
    return permissions.every(p => VALID_PERMISSIONS.includes(p));
  }

  getPermissionDescription(permission: PluginPermission): string {
    return PERMISSION_DESCRIPTIONS[permission] || 'Permiso desconocido';
  }

  categorizePermissions(permissions: PluginPermission[]): Record<string, PluginPermission[]> {
    const categories: Record<string, PluginPermission[]> = {};
    
    for (const perm of permissions) {
      const [category] = perm.split(':');
      const categoryName = this.getCategoryName(category);
      
      if (!categories[categoryName]) {
        categories[categoryName] = [];
      }
      categories[categoryName].push(perm);
    }

    return categories;
  }

  private getCategoryName(prefix: string): string {
    const names: Record<string, string> = {
      polls: 'Encuestas',
      predictions: 'Predicciones',
      giveaways: 'Sorteos',
      timers: 'Temporizadores',
      obs: 'OBS',
      chat: 'Chat',
      ui: 'Interfaz',
      storage: 'Almacenamiento',
      notifications: 'Notificaciones',
      commands: 'Comandos'
    };
    return names[prefix] || 'Otros';
  }

  // ============================================
  // Version Compatibility
  // ============================================

  isVersionCompatible(requiredVersion: string): boolean {
    const required = this.parseVersion(requiredVersion);
    const current = this.parseVersion(APP_VERSION);

    if (!required || !current) return false;

    // Major version must match
    if (required.major !== current.major) {
      return current.major > required.major;
    }

    // Minor version must be >= required
    if (current.minor < required.minor) {
      return false;
    }

    // If minor is same, patch must be >= required
    if (current.minor === required.minor && current.patch < required.patch) {
      return false;
    }

    return true;
  }

  private parseVersion(version: string): { major: number; minor: number; patch: number } | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10)
    };
  }

  // ============================================
  // ZIP Handling
  // ============================================

  private async unzipFile(file: File): Promise<Map<string, string>> {
    // Simplified ZIP extraction using JSZip-like approach
    // In production, use a proper ZIP library
    const files = new Map<string, string>();
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check ZIP signature
    if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
      throw new Error('Archivo no es un ZIP válido');
    }

    // For now, we'll use a simple approach assuming the ZIP contains
    // manifest.json and main.js at the root level
    // In production, integrate with JSZip or similar library
    
    try {
      // Try to use native decompression if available
      const ds = new DecompressionStream('deflate-raw');
      // This is a placeholder - real implementation needs proper ZIP parsing
      throw new Error('ZIP parsing requires JSZip library');
    } catch {
      // Fallback: assume it's a simple structure
      // This is for development/testing only
      throw new Error('Para cargar plugins ZIP, instala la dependencia jszip');
    }
  }

  private async extractManifest(zip: Map<string, string>): Promise<PluginManifest> {
    const manifestContent = zip.get('manifest.json');
    if (!manifestContent) {
      throw new Error('Plugin no contiene manifest.json');
    }

    try {
      return JSON.parse(manifestContent);
    } catch {
      throw new Error('manifest.json no es JSON válido');
    }
  }

  private async extractCode(zip: Map<string, string>, mainFile: string): Promise<string> {
    const code = zip.get(mainFile);
    if (!code) {
      throw new Error(`Plugin no contiene el archivo principal: ${mainFile}`);
    }
    return code;
  }

  // ============================================
  // Development Helpers
  // ============================================

  createManifestTemplate(): PluginManifest {
    return {
      id: 'my-plugin',
      name: 'Mi Plugin',
      version: '1.0.0',
      description: 'Descripción del plugin',
      author: 'Tu Nombre',
      minAppVersion: '1.0.0',
      permissions: ['storage'],
      main: 'index.js',
      configSchema: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            title: 'Habilitado',
            default: true
          }
        }
      },
      defaultConfig: {
        enabled: true
      }
    };
  }

  createCodeTemplate(): string {
    return `// Plugin: Mi Plugin
// Versión: 1.0.0

(function(api) {
  'use strict';

  // Inicialización
  api.log('info', 'Plugin inicializado');

  // Obtener configuración
  const config = api.getConfig();
  
  // Suscribirse a eventos
  api.events.on('app:ready', () => {
    api.log('info', 'App lista');
  });

  // Registrar comando (si tiene permiso 'commands')
  // api.commands.register({
  //   name: 'micomando',
  //   description: 'Mi comando personalizado',
  //   handler: (ctx) => {
  //     ctx.reply('¡Hola desde mi plugin!');
  //   }
  // });

  // Retornar API pública del plugin (opcional)
  return {
    // Métodos que otros plugins pueden llamar
  };
})(pluginAPI);
`;
  }
}

// Singleton
let instance: PluginLoaderService | null = null;

export function getPluginLoaderService(): PluginLoaderService {
  if (!instance) {
    instance = new PluginLoaderService();
  }
  return instance;
}
