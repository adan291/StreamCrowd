// Template Service - Gestión de templates de escenas para OBS

import {
  SceneTemplate,
  TemplateScene,
  TemplateSceneItem,
  TemplateVariable,
  TemplateCustomization,
  ApplyOptions,
  ApplyResult,
  TemplatePreview,
  TemplateCategory,
  Transform,
  DEFAULT_TRANSFORM,
  OBSExportError
} from '../../../types/obs-export';
import { OBSSceneService } from './OBSSceneService';
import { OBSSourceService } from './OBSSourceService';

// Storage key for custom templates
const CUSTOM_TEMPLATES_KEY = 'obs_custom_templates';

export class TemplateService {
  private sceneService: OBSSceneService;
  private sourceService: OBSSourceService;

  constructor(sceneService: OBSSceneService, sourceService: OBSSourceService) {
    this.sceneService = sceneService;
    this.sourceService = sourceService;
  }

  // ============================================================================
  // Built-in Templates
  // ============================================================================

  getBuiltInTemplates(): SceneTemplate[] {
    return [
      this.createGamingTemplate(),
      this.createJustChattingTemplate(),
      this.createIRLTemplate(),
      this.createCreativeTemplate()
    ];
  }

  private createGamingTemplate(): SceneTemplate {
    return {
      id: 'builtin-gaming',
      name: 'Gaming Setup',
      description: 'Complete gaming stream setup with gameplay, webcam, alerts and chat overlays',
      category: 'gaming',
      builtIn: true,
      scenes: [
        {
          name: 'Gameplay',
          items: [
            {
              sourceType: 'game_capture',
              sourceName: 'Game Capture',
              settings: { capture_mode: 'any_fullscreen' },
              transform: { ...DEFAULT_TRANSFORM }
            },
            {
              sourceType: 'browser_source',
              sourceName: 'Alerts Overlay',
              settings: { url: '{{alertsUrl}}', width: 800, height: 600 },
              transform: { ...DEFAULT_TRANSFORM, positionX: 560, positionY: 100 },
              variableBindings: { url: 'alertsUrl' }
            },
            {
              sourceType: 'browser_source',
              sourceName: 'Chat Overlay',
              settings: { url: '{{chatUrl}}', width: 400, height: 600 },
              transform: { ...DEFAULT_TRANSFORM, positionX: 1520, positionY: 400 },
              variableBindings: { url: 'chatUrl' }
            },
            {
              sourceType: 'dshow_input',
              sourceName: 'Webcam',
              settings: {},
              transform: { ...DEFAULT_TRANSFORM, positionX: 1520, positionY: 780, scaleX: 0.25, scaleY: 0.25 }
            }
          ]
        },
        {
          name: 'Starting Soon',
          items: [
            {
              sourceType: 'color_source',
              sourceName: 'Background',
              settings: { color: 0xFF1a1a2e, width: 1920, height: 1080 },
              transform: { ...DEFAULT_TRANSFORM }
            },
            {
              sourceType: 'text_gdi_plus',
              sourceName: 'Starting Text',
              settings: { text: 'Starting Soon...', font: { face: 'Arial', size: 72 } },
              transform: { ...DEFAULT_TRANSFORM, positionX: 700, positionY: 450 }
            },
            {
              sourceType: 'browser_source',
              sourceName: 'Countdown Timer',
              settings: { url: '{{timerUrl}}', width: 400, height: 200 },
              transform: { ...DEFAULT_TRANSFORM, positionX: 760, positionY: 550 },
              variableBindings: { url: 'timerUrl' }
            }
          ]
        },
        {
          name: 'BRB',
          items: [
            {
              sourceType: 'color_source',
              sourceName: 'BRB Background',
              settings: { color: 0xFF16213e, width: 1920, height: 1080 },
              transform: { ...DEFAULT_TRANSFORM }
            },
            {
              sourceType: 'text_gdi_plus',
              sourceName: 'BRB Text',
              settings: { text: 'Be Right Back', font: { face: 'Arial', size: 72 } },
              transform: { ...DEFAULT_TRANSFORM, positionX: 680, positionY: 480 }
            }
          ]
        },
        {
          name: 'Ending',
          items: [
            {
              sourceType: 'color_source',
              sourceName: 'End Background',
              settings: { color: 0xFF0f0f23, width: 1920, height: 1080 },
              transform: { ...DEFAULT_TRANSFORM }
            },
            {
              sourceType: 'text_gdi_plus',
              sourceName: 'Thanks Text',
              settings: { text: 'Thanks for watching!', font: { face: 'Arial', size: 64 } },
              transform: { ...DEFAULT_TRANSFORM, positionX: 600, positionY: 480 }
            }
          ]
        }
      ],
      variables: [
        { name: 'alertsUrl', type: 'url', label: 'Alerts Overlay URL', defaultValue: '' },
        { name: 'chatUrl', type: 'url', label: 'Chat Overlay URL', defaultValue: '' },
        { name: 'timerUrl', type: 'url', label: 'Timer Overlay URL', defaultValue: '' }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  private createJustChattingTemplate(): SceneTemplate {
    return {
      id: 'builtin-just-chatting',
      name: 'Just Chatting',
      description: 'Focused on webcam and chat interaction with clean overlays',
      category: 'just_chatting',
      builtIn: true,
      scenes: [
        {
          name: 'Main',
          items: [
            {
              sourceType: 'dshow_input',
              sourceName: 'Webcam Full',
              settings: {},
              transform: { ...DEFAULT_TRANSFORM }
            },
            {
              sourceType: 'browser_source',
              sourceName: 'Chat Overlay',
              settings: { url: '{{chatUrl}}', width: 400, height: 800 },
              transform: { ...DEFAULT_TRANSFORM, positionX: 1500, positionY: 140 },
              variableBindings: { url: 'chatUrl' }
            },
            {
              sourceType: 'browser_source',
              sourceName: 'Alerts',
              settings: { url: '{{alertsUrl}}', width: 600, height: 400 },
              transform: { ...DEFAULT_TRANSFORM, positionX: 660, positionY: 50 },
              variableBindings: { url: 'alertsUrl' }
            }
          ]
        },
        {
          name: 'Starting',
          items: [
            {
              sourceType: 'color_source',
              sourceName: 'Start BG',
              settings: { color: 0xFF2d2d44, width: 1920, height: 1080 },
              transform: { ...DEFAULT_TRANSFORM }
            },
            {
              sourceType: 'text_gdi_plus',
              sourceName: 'Starting Label',
              settings: { text: 'Stream Starting Soon', font: { face: 'Arial', size: 64 } },
              transform: { ...DEFAULT_TRANSFORM, positionX: 580, positionY: 480 }
            }
          ]
        },
        {
          name: 'Ending',
          items: [
            {
              sourceType: 'color_source',
              sourceName: 'End BG',
              settings: { color: 0xFF1a1a2e, width: 1920, height: 1080 },
              transform: { ...DEFAULT_TRANSFORM }
            },
            {
              sourceType: 'text_gdi_plus',
              sourceName: 'End Label',
              settings: { text: 'Thanks for hanging out!', font: { face: 'Arial', size: 56 } },
              transform: { ...DEFAULT_TRANSFORM, positionX: 560, positionY: 480 }
            }
          ]
        }
      ],
      variables: [
        { name: 'chatUrl', type: 'url', label: 'Chat Overlay URL', defaultValue: '' },
        { name: 'alertsUrl', type: 'url', label: 'Alerts Overlay URL', defaultValue: '' }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  private createIRLTemplate(): SceneTemplate {
    return {
      id: 'builtin-irl',
      name: 'IRL Streaming',
      description: 'Mobile-friendly setup for outdoor and IRL streams',
      category: 'irl',
      builtIn: true,
      scenes: [
        {
          name: 'IRL Main',
          items: [
            {
              sourceType: 'dshow_input',
              sourceName: 'Camera',
              settings: {},
              transform: { ...DEFAULT_TRANSFORM }
            },
            {
              sourceType: 'browser_source',
              sourceName: 'Chat',
              settings: { url: '{{chatUrl}}', width: 350, height: 500 },
              transform: { ...DEFAULT_TRANSFORM, positionX: 1550, positionY: 300 },
              variableBindings: { url: 'chatUrl' }
            },
            {
              sourceType: 'browser_source',
              sourceName: 'Alerts',
              settings: { url: '{{alertsUrl}}', width: 500, height: 300 },
              transform: { ...DEFAULT_TRANSFORM, positionX: 710, positionY: 50 },
              variableBindings: { url: 'alertsUrl' }
            }
          ]
        },
        {
          name: 'Technical Difficulties',
          items: [
            {
              sourceType: 'color_source',
              sourceName: 'Tech BG',
              settings: { color: 0xFF333333, width: 1920, height: 1080 },
              transform: { ...DEFAULT_TRANSFORM }
            },
            {
              sourceType: 'text_gdi_plus',
              sourceName: 'Tech Text',
              settings: { text: 'Technical Difficulties\nPlease Stand By', font: { face: 'Arial', size: 48 } },
              transform: { ...DEFAULT_TRANSFORM, positionX: 640, positionY: 450 }
            }
          ]
        },
        {
          name: 'Ending',
          items: [
            {
              sourceType: 'color_source',
              sourceName: 'End BG',
              settings: { color: 0xFF1a1a1a, width: 1920, height: 1080 },
              transform: { ...DEFAULT_TRANSFORM }
            },
            {
              sourceType: 'text_gdi_plus',
              sourceName: 'End Text',
              settings: { text: 'Stream Ended\nThanks for watching!', font: { face: 'Arial', size: 56 } },
              transform: { ...DEFAULT_TRANSFORM, positionX: 660, positionY: 450 }
            }
          ]
        }
      ],
      variables: [
        { name: 'chatUrl', type: 'url', label: 'Chat Overlay URL', defaultValue: '' },
        { name: 'alertsUrl', type: 'url', label: 'Alerts Overlay URL', defaultValue: '' }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  private createCreativeTemplate(): SceneTemplate {
    return {
      id: 'builtin-creative',
      name: 'Creative/Art',
      description: 'Setup for art streams, music production, or creative content',
      category: 'creative',
      builtIn: true,
      scenes: [
        {
          name: 'Canvas',
          items: [
            {
              sourceType: 'window_capture',
              sourceName: 'Art Program',
              settings: {},
              transform: { ...DEFAULT_TRANSFORM }
            },
            {
              sourceType: 'dshow_input',
              sourceName: 'Webcam Small',
              settings: {},
              transform: { ...DEFAULT_TRANSFORM, positionX: 1580, positionY: 820, scaleX: 0.2, scaleY: 0.2 }
            },
            {
              sourceType: 'browser_source',
              sourceName: 'Chat',
              settings: { url: '{{chatUrl}}', width: 350, height: 400 },
              transform: { ...DEFAULT_TRANSFORM, positionX: 1550, positionY: 400 },
              variableBindings: { url: 'chatUrl' }
            }
          ]
        },
        {
          name: 'Webcam Focus',
          items: [
            {
              sourceType: 'dshow_input',
              sourceName: 'Webcam Full',
              settings: {},
              transform: { ...DEFAULT_TRANSFORM }
            },
            {
              sourceType: 'browser_source',
              sourceName: 'Chat Full',
              settings: { url: '{{chatUrl}}', width: 400, height: 600 },
              transform: { ...DEFAULT_TRANSFORM, positionX: 1500, positionY: 240 },
              variableBindings: { url: 'chatUrl' }
            }
          ]
        },
        {
          name: 'Break',
          items: [
            {
              sourceType: 'color_source',
              sourceName: 'Break BG',
              settings: { color: 0xFF2a2a3a, width: 1920, height: 1080 },
              transform: { ...DEFAULT_TRANSFORM }
            },
            {
              sourceType: 'text_gdi_plus',
              sourceName: 'Break Text',
              settings: { text: 'Taking a short break', font: { face: 'Arial', size: 56 } },
              transform: { ...DEFAULT_TRANSFORM, positionX: 640, positionY: 480 }
            }
          ]
        }
      ],
      variables: [
        { name: 'chatUrl', type: 'url', label: 'Chat Overlay URL', defaultValue: '' }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  // ============================================================================
  // Custom Templates
  // ============================================================================

  async getCustomTemplates(): Promise<SceneTemplate[]> {
    try {
      const stored = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  async saveCustomTemplate(template: SceneTemplate): Promise<void> {
    const templates = await this.getCustomTemplates();
    const existingIndex = templates.findIndex(t => t.id === template.id);
    
    const updatedTemplate = {
      ...template,
      builtIn: false,
      updatedAt: Date.now()
    };

    if (existingIndex >= 0) {
      templates[existingIndex] = updatedTemplate;
    } else {
      templates.push(updatedTemplate);
    }

    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
  }

  async deleteCustomTemplate(id: string): Promise<void> {
    const templates = await this.getCustomTemplates();
    const filtered = templates.filter(t => t.id !== id);
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(filtered));
  }

  // ============================================================================
  // Import/Export
  // ============================================================================

  async exportTemplate(id: string): Promise<string> {
    const builtIn = this.getBuiltInTemplates().find(t => t.id === id);
    if (builtIn) {
      return JSON.stringify(builtIn, null, 2);
    }

    const custom = await this.getCustomTemplates();
    const template = custom.find(t => t.id === id);
    
    if (!template) {
      throw new OBSExportError(
        `Template "${id}" not found`,
        'INVALID_TEMPLATE',
        { templateId: id }
      );
    }

    return JSON.stringify(template, null, 2);
  }

  async importTemplate(json: string): Promise<SceneTemplate> {
    try {
      const template = JSON.parse(json) as SceneTemplate;
      
      // Validate required fields
      if (!template.name || !template.scenes || !Array.isArray(template.scenes)) {
        throw new Error('Invalid template structure');
      }

      // Generate new ID to avoid conflicts
      const importedTemplate: SceneTemplate = {
        ...template,
        id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        builtIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await this.saveCustomTemplate(importedTemplate);
      return importedTemplate;
    } catch (error) {
      throw new OBSExportError(
        'Failed to import template: invalid JSON or structure',
        'INVALID_TEMPLATE',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  // ============================================================================
  // Template Application
  // ============================================================================

  async applyTemplate(template: SceneTemplate, options: ApplyOptions = {}): Promise<ApplyResult> {
    const result: ApplyResult = {
      success: true,
      scenesCreated: [],
      sourcesCreated: [],
      errors: [],
      warnings: []
    };

    const prefix = options.prefix || '';
    const variableValues = options.variableValues || {};
    const selectedScenes = options.selectedScenes || template.scenes.map(s => s.name);

    // Dry run mode - just validate
    if (options.dryRun) {
      for (const scene of template.scenes) {
        if (!selectedScenes.includes(scene.name)) continue;
        result.scenesCreated.push(prefix + scene.name);
        for (const item of scene.items) {
          result.sourcesCreated.push(prefix + item.sourceName);
        }
      }
      return result;
    }

    // Apply each scene
    for (const scene of template.scenes) {
      if (!selectedScenes.includes(scene.name)) continue;

      const sceneName = prefix + scene.name;

      try {
        // Check if scene exists
        const exists = await this.sceneService.sceneExists(sceneName);
        
        if (exists) {
          if (options.replaceExisting) {
            await this.sceneService.deleteScene(sceneName);
          } else {
            result.warnings.push(`Scene "${sceneName}" already exists, skipping`);
            continue;
          }
        }

        // Create scene
        await this.sceneService.createScene(sceneName);
        result.scenesCreated.push(sceneName);

        // Add items to scene
        for (const item of scene.items) {
          try {
            const sourceName = prefix + item.sourceName;
            const settings = this.resolveVariables(item.settings, variableValues, template.variables);

            // Create source if it doesn't exist
            const sourceExists = await this.sourceService.sourceExists(sourceName);
            if (!sourceExists) {
              await this.sourceService.createSource(item.sourceType, {
                name: sourceName,
                ...settings
              } as any);
              result.sourcesCreated.push(sourceName);
            }

            // Add to scene
            await this.sceneService.addSourceToScene(sceneName, sourceName, {
              transform: item.transform,
              enabled: true
            });

            // Apply filters if any
            if (item.filters) {
              for (const filter of item.filters) {
                await this.sourceService.addFilter(sourceName, filter);
              }
            }
          } catch (itemError) {
            result.errors.push(`Failed to add "${item.sourceName}": ${itemError instanceof Error ? itemError.message : 'Unknown error'}`);
          }
        }
      } catch (sceneError) {
        result.errors.push(`Failed to create scene "${sceneName}": ${sceneError instanceof Error ? sceneError.message : 'Unknown error'}`);
        result.success = false;
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;
  }

  previewTemplate(template: SceneTemplate): TemplatePreview {
    const totalSources = template.scenes.reduce((sum, scene) => sum + scene.items.length, 0);
    
    return {
      scenes: template.scenes.map(s => ({
        name: s.name,
        itemCount: s.items.length
      })),
      totalSources,
      variables: template.variables,
      estimatedTime: Math.ceil((template.scenes.length * 2 + totalSources) * 0.5) // seconds
    };
  }

  // ============================================================================
  // Template Customization
  // ============================================================================

  customizeTemplate(template: SceneTemplate, customization: TemplateCustomization): SceneTemplate {
    const customized = JSON.parse(JSON.stringify(template)) as SceneTemplate;
    
    // Apply variable values to settings
    for (const scene of customized.scenes) {
      for (const item of scene.items) {
        item.settings = this.resolveVariables(
          item.settings,
          customization.variableValues,
          template.variables
        );
      }
    }

    // Filter scenes if specified
    if (customization.selectedScenes) {
      customized.scenes = customized.scenes.filter(s => 
        customization.selectedScenes!.includes(s.name)
      );
    }

    // Apply prefix to names
    if (customization.prefix) {
      for (const scene of customized.scenes) {
        scene.name = customization.prefix + scene.name;
        for (const item of scene.items) {
          item.sourceName = customization.prefix + item.sourceName;
        }
      }
    }

    customized.updatedAt = Date.now();
    return customized;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private resolveVariables(
    settings: Record<string, unknown>,
    values: Record<string, unknown>,
    variables: TemplateVariable[]
  ): Record<string, unknown> {
    const resolved = { ...settings };

    for (const [key, value] of Object.entries(resolved)) {
      if (typeof value === 'string') {
        // Replace {{variableName}} patterns
        resolved[key] = value.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
          if (values[varName] !== undefined) {
            return String(values[varName]);
          }
          const variable = variables.find(v => v.name === varName);
          return variable ? String(variable.defaultValue) : '';
        });
      }
    }

    return resolved;
  }
}
