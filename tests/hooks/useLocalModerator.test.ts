import { renderHook, act } from '@testing-library/react';
import { useLocalModerator } from '@/hooks/useLocalModerator';
import type { ChatMessage } from '@/hooks/useLocalModerator';

// Mock useKiroBridge
vi.mock('@/hooks/useKiroBridge', () => ({
  useKiroBridge: () => ({
    sendToKiro: vi.fn().mockResolvedValue({
      success: true,
      data: { mood: 'neutral' }
    })
  })
}));

describe('useLocalModerator', () => {
  const createMockMessage = (message: string, username = 'testuser'): ChatMessage => ({
    id: Date.now().toString(),
    username,
    message,
    timestamp: Date.now(),
    isSubscriber: false,
    isModerator: false
  });

  it('should detect spam messages', () => {
    const { result } = renderHook(() => useLocalModerator());

    // Test repeated characters
    expect(result.current.isSpam('aaaaaaaaa', 'user')).toBe(true);
    
    // Test all caps
    expect(result.current.isSpam('THIS IS ALL CAPS MESSAGE', 'user')).toBe(true);
    
    // Test only numbers
    expect(result.current.isSpam('123456789', 'user')).toBe(true);
    
    // Test normal message
    expect(result.current.isSpam('Hola, ¿cómo están?', 'user')).toBe(false);
  });

  it('should extract commands correctly', () => {
    const { result } = renderHook(() => useLocalModerator());

    // Test pium command
    expect(result.current.extractCommand('!pium @target')).toEqual({
      command: '!pium',
      args: ['@target']
    });

    // Test vote command
    expect(result.current.extractCommand('!vote pizza')).toEqual({
      command: '!vote',
      args: ['pizza']
    });

    // Test bet command
    expect(result.current.extractCommand('!bet 100 red')).toEqual({
      command: '!bet',
      args: ['100', 'red']
    });

    // Test non-command
    expect(result.current.extractCommand('Hola mundo')).toBeNull();
  });

  it('should determine when to send to AI', () => {
    const { result } = renderHook(() => useLocalModerator());

    // Should NOT send commands
    expect(result.current.shouldSendToAI('!pium @user')).toBe(false);
    
    // Should NOT send very short messages
    expect(result.current.shouldSendToAI('hi')).toBe(false);
    
    // Should NOT send only numbers
    expect(result.current.shouldSendToAI('123')).toBe(false);
    
    // Should send normal messages
    expect(result.current.shouldSendToAI('¿Qué opinas del juego?')).toBe(true);
    
    // Should send longer messages
    expect(result.current.shouldSendToAI('Este stream está increíble')).toBe(true);
  });

  it('should moderate spam messages', async () => {
    const { result } = renderHook(() => useLocalModerator());

    const spamMessage = createMockMessage('aaaaaaaaa');

    await act(async () => {
      const modResult = await result.current.moderateMessage(spamMessage);
      
      expect(modResult).toEqual({
        action: 'block_spam',
        confidence: 0.9,
        reason: 'Detected spam pattern'
      });
    });
  });

  it('should moderate toxic messages', async () => {
    const { result } = renderHook(() => useLocalModerator());

    const toxicMessage = createMockMessage('eres un idiota');

    await act(async () => {
      const modResult = await result.current.moderateMessage(toxicMessage);
      
      expect(modResult).toEqual({
        action: 'block_toxic',
        confidence: 0.8,
        reason: 'Detected toxic language'
      });
    });
  });

  it('should process commands locally', async () => {
    const { result } = renderHook(() => useLocalModerator());

    const commandMessage = createMockMessage('!pium @target');

    await act(async () => {
      const modResult = await result.current.moderateMessage(commandMessage);
      
      expect(modResult).toEqual({
        action: 'process_local',
        command: '!pium',
        args: ['@target'],
        confidence: 1.0,
        reason: 'Valid command detected'
      });
    });
  });

  it('should send natural language to AI', async () => {
    const { result } = renderHook(() => useLocalModerator());

    const naturalMessage = createMockMessage('¿Qué opinas del nuevo juego?');

    await act(async () => {
      const modResult = await result.current.moderateMessage(naturalMessage);
      
      expect(modResult).toEqual({
        action: 'send_to_ai',
        confidence: 0.7,
        reason: 'Sent to AI for analysis'
      });
    });
  });

  it('should handle AI failures gracefully', async () => {
    // Mock failed AI response
    const mockSendToKiro = vi.fn().mockRejectedValue(new Error('AI unavailable'));
    
    vi.doMock('@/hooks/useKiroBridge', () => ({
      useKiroBridge: () => ({
        sendToKiro: mockSendToKiro
      })
    }));

    const { result } = renderHook(() => useLocalModerator());

    const message = createMockMessage('¿Cómo están todos?');

    await act(async () => {
      const modResult = await result.current.moderateMessage(message);
      
      expect(modResult).toEqual({
        action: 'process_local',
        confidence: 0.5,
        reason: 'AI unavailable, processed locally'
      });
    });
  });

  it('should detect various command patterns', () => {
    const { result } = renderHook(() => useLocalModerator());

    const commands = [
      '!fish',
      '!shoot',
      '!fire A1',
      '!pass @user',
      '!flip 5',
      '!piedra',
      '!papel',
      '!tijera',
      '!spin',
      '!cast'
    ];

    commands.forEach(cmd => {
      expect(result.current.extractCommand(cmd)).not.toBeNull();
    });
  });

  it('should handle edge cases', async () => {
    const { result } = renderHook(() => useLocalModerator());

    // Very long message
    const longMessage = createMockMessage('a'.repeat(600));
    let modResult = await result.current.moderateMessage(longMessage);
    expect(modResult.action).toBe('block_spam');

    // Very short message
    const shortMessage = createMockMessage('a');
    modResult = await result.current.moderateMessage(shortMessage);
    expect(modResult.action).toBe('block_spam');

    // Empty message
    const emptyMessage = createMockMessage('');
    modResult = await result.current.moderateMessage(emptyMessage);
    expect(modResult.action).toBe('block_spam');
  });

  it('should handle subscriber and moderator messages appropriately', async () => {
    const { result } = renderHook(() => useLocalModerator());

    const subMessage: ChatMessage = {
      ...createMockMessage('¿Qué tal el stream?'),
      isSubscriber: true
    };

    const modMessage: ChatMessage = {
      ...createMockMessage('Moderando el chat'),
      isModerator: true
    };

    // Both should be processed normally (no special treatment in basic version)
    await act(async () => {
      const subResult = await result.current.moderateMessage(subMessage);
      const modResult = await result.current.moderateMessage(modMessage);
      
      expect(subResult.action).toBe('send_to_ai');
      expect(modResult.action).toBe('send_to_ai');
    });
  });
});