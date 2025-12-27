/**
 * Tests for useOBS hook
 * Tests connection state, scene updates, and callbacks
 * 
 * @requirements 2.2
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MockOBSController } from '../mocks/MockOBSController';

// Mock the OBSService module
let mockController: MockOBSController;
let mockService: {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  getScenes: ReturnType<typeof vi.fn>;
  getCurrentScene: ReturnType<typeof vi.fn>;
  switchScene: ReturnType<typeof vi.fn>;
  getVersion: ReturnType<typeof vi.fn>;
  getTransitions: ReturnType<typeof vi.fn>;
  getStreamStatus: ReturnType<typeof vi.fn>;
  getConnectionConfig: ReturnType<typeof vi.fn>;
  getAutomations: ReturnType<typeof vi.fn>;
  setAutoConnect: ReturnType<typeof vi.fn>;
  getSceneSources: ReturnType<typeof vi.fn>;
  setSourceVisible: ReturnType<typeof vi.fn>;
  refreshBrowserSource: ReturnType<typeof vi.fn>;
  startStream: ReturnType<typeof vi.fn>;
  stopStream: ReturnType<typeof vi.fn>;
  toggleStream: ReturnType<typeof vi.fn>;
  startRecording: ReturnType<typeof vi.fn>;
  stopRecording: ReturnType<typeof vi.fn>;
  toggleRecording: ReturnType<typeof vi.fn>;
  setTransition: ReturnType<typeof vi.fn>;
  addAutomation: ReturnType<typeof vi.fn>;
  updateAutomation: ReturnType<typeof vi.fn>;
  removeAutomation: ReturnType<typeof vi.fn>;
  toggleAutomation: ReturnType<typeof vi.fn>;
  executeAutomation: ReturnType<typeof vi.fn>;
  executeTrigger: ReturnType<typeof vi.fn>;
  onStatusChange: ReturnType<typeof vi.fn>;
  onSceneChange: ReturnType<typeof vi.fn>;
  onStreamStatusChange: ReturnType<typeof vi.fn>;
  controller: MockOBSController | null;
};

vi.mock('../../src/application/services/OBSService', () => ({
  getOBSService: () => mockService,
}));

// Import after mocking
import { useOBS } from '../../src/application/hooks/useOBS';

describe('useOBS', () => {
  let statusCallback: ((status: string, error?: string) => void) | null = null;
  let sceneCallback: ((scene: { name: string }) => void) | null = null;
  let streamCallback: ((status: { isStreaming: boolean; isRecording: boolean }) => void) | null = null;

  beforeEach(() => {
    mockController = new MockOBSController();
    statusCallback = null;
    sceneCallback = null;
    streamCallback = null;

    mockService = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getScenes: vi.fn().mockResolvedValue([
        { name: 'Main', index: 0 },
        { name: 'Game', index: 1 },
        { name: 'BRB', index: 2 },
      ]),
      getCurrentScene: vi.fn().mockResolvedValue('Main'),
      switchScene: vi.fn().mockResolvedValue(undefined),
      getVersion: vi.fn().mockResolvedValue({ obsVersion: '30.0.0', obsWebSocketVersion: '5.3.0' }),
      getTransitions: vi.fn().mockResolvedValue(['Cut', 'Fade']),
      getStreamStatus: vi.fn().mockResolvedValue({ isStreaming: false, isRecording: false }),
      getConnectionConfig: vi.fn().mockReturnValue(null),
      getAutomations: vi.fn().mockReturnValue([]),
      setAutoConnect: vi.fn(),
      getSceneSources: vi.fn().mockResolvedValue([]),
      setSourceVisible: vi.fn().mockResolvedValue(undefined),
      refreshBrowserSource: vi.fn().mockResolvedValue(undefined),
      startStream: vi.fn().mockResolvedValue(undefined),
      stopStream: vi.fn().mockResolvedValue(undefined),
      toggleStream: vi.fn().mockResolvedValue(undefined),
      startRecording: vi.fn().mockResolvedValue(undefined),
      stopRecording: vi.fn().mockResolvedValue(undefined),
      toggleRecording: vi.fn().mockResolvedValue(undefined),
      setTransition: vi.fn().mockResolvedValue(undefined),
      addAutomation: vi.fn().mockImplementation((auto) => ({ ...auto, id: 'test-id' })),
      updateAutomation: vi.fn().mockReturnValue(true),
      removeAutomation: vi.fn().mockReturnValue(true),
      toggleAutomation: vi.fn().mockReturnValue(true),
      executeAutomation: vi.fn().mockResolvedValue(true),
      executeTrigger: vi.fn().mockResolvedValue(true),
      onStatusChange: vi.fn().mockImplementation((cb) => {
        statusCallback = cb;
        cb('disconnected');
        return () => { statusCallback = null; };
      }),
      onSceneChange: vi.fn().mockImplementation((cb) => {
        sceneCallback = cb;
        return () => { sceneCallback = null; };
      }),
      onStreamStatusChange: vi.fn().mockImplementation((cb) => {
        streamCallback = cb;
        return () => { streamCallback = null; };
      }),
      controller: mockController,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start disconnected', () => {
      const { result } = renderHook(() => useOBS());

      expect(result.current.status).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
    });

    it('should have empty scenes initially', () => {
      const { result } = renderHook(() => useOBS());

      expect(result.current.scenes).toEqual([]);
      expect(result.current.currentScene).toBeNull();
    });

    it('should have null error initially', () => {
      const { result } = renderHook(() => useOBS());

      expect(result.current.error).toBeNull();
    });

    it('should load automations on mount', () => {
      renderHook(() => useOBS());

      expect(mockService.getAutomations).toHaveBeenCalled();
    });
  });

  describe('connection state', () => {
    it('should update status when connection changes', async () => {
      const { result } = renderHook(() => useOBS());

      expect(result.current.status).toBe('disconnected');

      // Simulate status change to connecting
      act(() => {
        if (statusCallback) statusCallback('connecting');
      });

      expect(result.current.status).toBe('connecting');
      expect(result.current.isConnecting).toBe(true);

      // Simulate status change to connected
      act(() => {
        if (statusCallback) statusCallback('connected');
      });

      expect(result.current.status).toBe('connected');
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
    });

    it('should set error when connection fails', async () => {
      const { result } = renderHook(() => useOBS());

      act(() => {
        if (statusCallback) statusCallback('error', 'Connection refused');
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Connection refused');
    });
  });

  describe('connect', () => {
    it('should call service connect with credentials', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.connect('password', 'localhost', 4455);
      });

      expect(mockService.connect).toHaveBeenCalledWith('password', 'localhost', 4455);
    });

    it('should load scenes after successful connection', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.connect();
      });

      expect(mockService.getScenes).toHaveBeenCalled();
      expect(result.current.scenes).toHaveLength(3);
      expect(result.current.scenes[0].name).toBe('Main');
    });

    it('should load current scene after connection', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.connect();
      });

      expect(mockService.getCurrentScene).toHaveBeenCalled();
      expect(result.current.currentScene).toBe('Main');
    });

    it('should load version after connection', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.connect();
      });

      expect(mockService.getVersion).toHaveBeenCalled();
      expect(result.current.version?.obsVersion).toBe('30.0.0');
    });

    it('should set error on connection failure', async () => {
      mockService.connect.mockRejectedValue(new Error('Auth failed'));

      const { result } = renderHook(() => useOBS());

      await act(async () => {
        try {
          await result.current.connect('wrong');
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBe('Auth failed');
    });
  });

  describe('disconnect', () => {
    it('should call service disconnect', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.disconnect();
      });

      expect(mockService.disconnect).toHaveBeenCalled();
    });

    it('should clear scenes on disconnect', async () => {
      const { result } = renderHook(() => useOBS());

      // First connect
      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.scenes).toHaveLength(3);

      // Then disconnect
      await act(async () => {
        await result.current.disconnect();
      });

      expect(result.current.scenes).toEqual([]);
      expect(result.current.currentScene).toBeNull();
    });
  });

  describe('scene updates', () => {
    it('should update current scene when scene changes', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.connect();
      });

      // Simulate scene change callback
      act(() => {
        if (sceneCallback) sceneCallback({ name: 'Game' });
      });

      expect(result.current.currentScene).toBe('Game');
    });

    it('should call switchScene on service', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.switchScene('Game');
      });

      expect(mockService.switchScene).toHaveBeenCalledWith('Game');
    });

    it('should update currentScene after switchScene', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.switchScene('BRB');
      });

      expect(result.current.currentScene).toBe('BRB');
    });

    it('should refresh scenes', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.refreshScenes();
      });

      expect(mockService.getScenes).toHaveBeenCalled();
      expect(mockService.getCurrentScene).toHaveBeenCalled();
    });
  });

  describe('stream status', () => {
    it('should update stream status on callback', async () => {
      const { result } = renderHook(() => useOBS());

      act(() => {
        if (streamCallback) streamCallback({ isStreaming: true, isRecording: false });
      });

      expect(result.current.streamStatus?.isStreaming).toBe(true);
    });

    it('should call startStream on service', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.startStream();
      });

      expect(mockService.startStream).toHaveBeenCalled();
    });

    it('should call stopStream on service', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.stopStream();
      });

      expect(mockService.stopStream).toHaveBeenCalled();
    });

    it('should call toggleRecording on service', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.toggleRecording();
      });

      expect(mockService.toggleRecording).toHaveBeenCalled();
    });
  });

  describe('automations', () => {
    it('should add automation', async () => {
      const { result } = renderHook(() => useOBS());

      let newAuto;
      act(() => {
        newAuto = result.current.addAutomation({
          name: 'Test Auto',
          trigger: 'game_start',
          sceneName: 'Game',
          enabled: true,
        });
      });

      expect(mockService.addAutomation).toHaveBeenCalled();
      expect(newAuto).toHaveProperty('id');
    });

    it('should update automation', async () => {
      const { result } = renderHook(() => useOBS());

      let updated;
      act(() => {
        updated = result.current.updateAutomation('test-id', { name: 'Updated' });
      });

      expect(mockService.updateAutomation).toHaveBeenCalledWith('test-id', { name: 'Updated' });
      expect(updated).toBe(true);
    });

    it('should remove automation', async () => {
      const { result } = renderHook(() => useOBS());

      let removed;
      act(() => {
        removed = result.current.removeAutomation('test-id');
      });

      expect(mockService.removeAutomation).toHaveBeenCalledWith('test-id');
      expect(removed).toBe(true);
    });

    it('should toggle automation', async () => {
      const { result } = renderHook(() => useOBS());

      act(() => {
        result.current.toggleAutomation('test-id');
      });

      expect(mockService.toggleAutomation).toHaveBeenCalledWith('test-id');
    });
  });

  describe('trigger', () => {
    it('should call executeTrigger on service', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.trigger('game_start');
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('game_start', undefined);
    });

    it('should pass custom name for custom triggers', async () => {
      const { result } = renderHook(() => useOBS());

      await act(async () => {
        await result.current.trigger('custom', 'my_event');
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('custom', 'my_event');
    });
  });

  describe('callbacks cleanup', () => {
    it('should subscribe to status changes on mount', () => {
      renderHook(() => useOBS());

      expect(mockService.onStatusChange).toHaveBeenCalled();
    });

    it('should subscribe to scene changes on mount', () => {
      renderHook(() => useOBS());

      expect(mockService.onSceneChange).toHaveBeenCalled();
    });

    it('should subscribe to stream status changes on mount', () => {
      renderHook(() => useOBS());

      expect(mockService.onStreamStatusChange).toHaveBeenCalled();
    });
  });
});
