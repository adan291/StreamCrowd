// Hook para gestión de templates de escenas OBS
import { useState, useCallback, useEffect } from 'react';
import { TemplateService } from '../src/application/services/TemplateService';
import { OBSSceneService } from '../src/application/services/OBSSceneService';
import { OBSSourceService } from '../src/application/services/OBSSourceService';
import {
  SceneTemplate,
  TemplatePreview,
  ApplyOptions,
  ApplyResult,
  TemplateCustomization,
  OBSExportError
} from '../types/obs-export';

interface UseTemplatesState {
  builtInTemplates: SceneTemplate[];
  customTemplates: SceneTemplate[];
  selectedTemplate: SceneTemplate | null;
  preview: TemplatePreview | null;
  loading: boolean;
  applying: boolean;
  error: OBSExportError | null;
}

interface UseTemplatesReturn extends UseTemplatesState {
  selectTemplate: (template: SceneTemplate | null) => void;
  applyTemplate: (template: SceneTemplate, options?: ApplyOptions) => Promise<ApplyResult>;
  saveCustomTemplate: (template: SceneTemplate) => Promise<void>;
  deleteCustomTemplate: (id: string) => Promise<void>;
  exportTemplate: (id: string) => Promise<string>;
  importTemplate: (json: string) => Promise<SceneTemplate>;
  customizeTemplate: (template: SceneTemplate, customization: TemplateCustomization) => SceneTemplate;
  refresh: () => Promise<void>;
}

export function useTemplates(obsWebSocket: any): UseTemplatesReturn {
  const [state, setState] = useState<UseTemplatesState>({
    builtInTemplates: [],
    customTemplates: [],
    selectedTemplate: null,
    preview: null,
    loading: false,
    applying: false,
    error: null
  });

  const sceneService = new OBSSceneService(obsWebSocket);
  const sourceService = new OBSSourceService(obsWebSocket);
  const service = new TemplateService(sceneService, sourceService);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const builtInTemplates = service.getBuiltInTemplates();
      const customTemplates = await service.getCustomTemplates();
      
      setState(prev => ({
        ...prev,
        builtInTemplates,
        customTemplates,
        loading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof OBSExportError ? error : new OBSExportError(
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR'
        )
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectTemplate = useCallback((template: SceneTemplate | null) => {
    if (template) {
      const preview = service.previewTemplate(template);
      setState(prev => ({ ...prev, selectedTemplate: template, preview }));
    } else {
      setState(prev => ({ ...prev, selectedTemplate: null, preview: null }));
    }
  }, [service]);

  const applyTemplate = useCallback(async (
    template: SceneTemplate,
    options: ApplyOptions = {}
  ): Promise<ApplyResult> => {
    setState(prev => ({ ...prev, applying: true, error: null }));
    try {
      const result = await service.applyTemplate(template, options);
      setState(prev => ({ ...prev, applying: false }));
      return result;
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      setState(prev => ({ ...prev, applying: false, error: obsError }));
      throw obsError;
    }
  }, [service]);

  const saveCustomTemplate = useCallback(async (template: SceneTemplate): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await service.saveCustomTemplate(template);
      await refresh();
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      setState(prev => ({ ...prev, loading: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const deleteCustomTemplate = useCallback(async (id: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await service.deleteCustomTemplate(id);
      await refresh();
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      setState(prev => ({ ...prev, loading: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const exportTemplate = useCallback(async (id: string): Promise<string> => {
    return service.exportTemplate(id);
  }, [service]);

  const importTemplate = useCallback(async (json: string): Promise<SceneTemplate> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const template = await service.importTemplate(json);
      await refresh();
      return template;
    } catch (error) {
      const obsError = error instanceof OBSExportError ? error : new OBSExportError(
        error instanceof Error ? error.message : 'Unknown error',
        'INVALID_TEMPLATE'
      );
      setState(prev => ({ ...prev, loading: false, error: obsError }));
      throw obsError;
    }
  }, [service, refresh]);

  const customizeTemplate = useCallback((
    template: SceneTemplate,
    customization: TemplateCustomization
  ): SceneTemplate => {
    return service.customizeTemplate(template, customization);
  }, [service]);

  return {
    ...state,
    selectTemplate,
    applyTemplate,
    saveCustomTemplate,
    deleteCustomTemplate,
    exportTemplate,
    importTemplate,
    customizeTemplate,
    refresh
  };
}
