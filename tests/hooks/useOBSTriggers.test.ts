/**
 * Tests for useOBSTriggers hook
 * Tests each trigger function and disconnected state handling
 * 
 * @requirements 2.3
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the OBSService module
let mockService: {
  executeTrigger: ReturnType<typeof vi.fn>;
  isConnected: ReturnType<typeof vi.fn>;
};

vi.mock('../../src/application/services/OBSService', () => ({
  getOBSService: () => mockService,
}));

// Import after mocking
import { useOBSTriggers } from '../../src/application/hooks/useOBSTriggers';

describe('useOBSTriggers', () => {
  beforeEach(() => {
    mockService = {
      executeTrigger: vi.fn().mockResolvedValue(true),
      isConnected: vi.fn().mockReturnValue(true),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('game triggers', () => {
    it('should trigger game_start', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      let success;
      await act(async () => {
        success = await result.current.triggerGameStart();
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('game_start', undefined);
      expect(success).toBe(true);
    });

    it('should trigger game_end', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      let success;
      await act(async () => {
        success = await result.current.triggerGameEnd();
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('game_end', undefined);
      expect(success).toBe(true);
    });
  });

  describe('poll triggers', () => {
    it('should trigger poll_start', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.triggerPollStart();
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('poll_start', undefined);
    });

    it('should trigger poll_end', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.triggerPollEnd();
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('poll_end', undefined);
    });

    it('should trigger poll_results', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.triggerPollResults();
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('poll_results', undefined);
    });
  });

  describe('giveaway triggers', () => {
    it('should trigger giveaway_start', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.triggerGiveawayStart();
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('giveaway_start', undefined);
    });

    it('should trigger giveaway_winner', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.triggerGiveawayWinner();
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('giveaway_winner', undefined);
    });
  });

  describe('raid triggers', () => {
    it('should trigger raid_incoming', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.triggerRaidIncoming();
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('raid_incoming', undefined);
    });

    it('should trigger raid_outgoing', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.triggerRaidOutgoing();
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('raid_outgoing', undefined);
    });
  });

  describe('BRB triggers', () => {
    it('should trigger brb_start', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.triggerBRBStart();
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('brb_start', undefined);
    });

    it('should trigger brb_end', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.triggerBRBEnd();
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('brb_end', undefined);
    });
  });

  describe('stream triggers', () => {
    it('should trigger stream_start', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.triggerStreamStart();
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('stream_start', undefined);
    });

    it('should trigger stream_end', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.triggerStreamEnd();
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('stream_end', undefined);
    });
  });

  describe('custom triggers', () => {
    it('should trigger custom event with name', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.triggerCustom('my_custom_event');
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('custom', 'my_custom_event');
    });

    it('should trigger custom event with different name', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.triggerCustom('another_event');
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('custom', 'another_event');
    });
  });

  describe('generic trigger', () => {
    it('should call trigger with type', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.trigger('game_start');
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('game_start', undefined);
    });

    it('should call trigger with type and custom name', async () => {
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        await result.current.trigger('custom', 'special_event');
      });

      expect(mockService.executeTrigger).toHaveBeenCalledWith('custom', 'special_event');
    });
  });

  describe('connection state', () => {
    it('should return true when OBS is connected', () => {
      mockService.isConnected.mockReturnValue(true);
      const { result } = renderHook(() => useOBSTriggers());

      expect(result.current.isOBSConnected()).toBe(true);
    });

    it('should return false when OBS is disconnected', () => {
      mockService.isConnected.mockReturnValue(false);
      const { result } = renderHook(() => useOBSTriggers());

      expect(result.current.isOBSConnected()).toBe(false);
    });
  });

  describe('disconnected state handling', () => {
    it('should return false when trigger fails', async () => {
      mockService.executeTrigger.mockRejectedValue(new Error('Not connected'));
      const { result } = renderHook(() => useOBSTriggers());

      let success;
      await act(async () => {
        success = await result.current.triggerGameStart();
      });

      expect(success).toBe(false);
    });

    it('should not throw when trigger fails', async () => {
      mockService.executeTrigger.mockRejectedValue(new Error('Connection lost'));
      const { result } = renderHook(() => useOBSTriggers());

      await act(async () => {
        // Should not throw
        await result.current.triggerPollEnd();
      });

      // Test passes if no exception is thrown
      expect(true).toBe(true);
    });

    it('should handle multiple failed triggers gracefully', async () => {
      mockService.executeTrigger.mockRejectedValue(new Error('OBS not available'));
      const { result } = renderHook(() => useOBSTriggers());

      const results: boolean[] = [];
      await act(async () => {
        results.push(await result.current.triggerGameStart());
        results.push(await result.current.triggerGameEnd());
        results.push(await result.current.triggerBRBStart());
      });

      expect(results).toEqual([false, false, false]);
    });
  });

  describe('return value consistency', () => {
    it('should return true when trigger succeeds', async () => {
      mockService.executeTrigger.mockResolvedValue(true);
      const { result } = renderHook(() => useOBSTriggers());

      let success;
      await act(async () => {
        success = await result.current.triggerBRBEnd();
      });

      expect(success).toBe(true);
    });

    it('should return false when no automation matches', async () => {
      mockService.executeTrigger.mockResolvedValue(false);
      const { result } = renderHook(() => useOBSTriggers());

      let success;
      await act(async () => {
        success = await result.current.triggerRaidIncoming();
      });

      expect(success).toBe(false);
    });
  });
});
