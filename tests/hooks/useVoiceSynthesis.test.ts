import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useVoiceSynthesis } from '@/hooks/useVoiceSynthesis';

// Mock SpeechSynthesis API
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockGetVoices = vi.fn();

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: mockSpeak,
    cancel: mockCancel,
    getVoices: mockGetVoices,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
});

// Mock SpeechSynthesisUtterance
global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: 'es-ES',
  voice: null,
  onstart: null,
  onend: null,
  onerror: null,
  onpause: null,
  onresume: null
}));

describe('useVoiceSynthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVoices.mockReturnValue([
      { name: 'Spanish Voice', lang: 'es-ES' },
      { name: 'English Voice', lang: 'en-US' }
    ]);
  });

  it('should be supported when speechSynthesis is available', () => {
    const { result } = renderHook(() => useVoiceSynthesis());
    expect(result.current.isSupported).toBe(true);
  });

  it('should speak text successfully', async () => {
    const { result } = renderHook(() => useVoiceSynthesis());

    let utterance: any;
    mockSpeak.mockImplementation((utt) => {
      utterance = utt;
      // Simulate successful speech
      setTimeout(() => {
        if (utt.onstart) utt.onstart();
        setTimeout(() => {
          if (utt.onend) utt.onend();
        }, 10);
      }, 5);
    });

    await act(async () => {
      await result.current.speak('Hola mundo');
    });

    expect(mockSpeak).toHaveBeenCalled();
    expect(utterance.text).toBe('Hola mundo');
    expect(result.current.isSpeaking).toBe(false); // Should be false after completion
  });

  it('should apply voice configuration', async () => {
    const { result } = renderHook(() => useVoiceSynthesis());

    let utterance: any;
    mockSpeak.mockImplementation((utt) => {
      utterance = utt;
      if (utt.onstart) utt.onstart();
      if (utt.onend) utt.onend();
    });

    await act(async () => {
      await result.current.speak('Test', {
        rate: 1.5,
        pitch: 1.2,
        volume: 0.8,
        lang: 'en-US'
      });
    });

    expect(utterance.rate).toBe(1.5);
    expect(utterance.pitch).toBe(1.2);
    expect(utterance.volume).toBe(0.8);
    expect(utterance.lang).toBe('en-US');
  });

  it('should handle speech errors', async () => {
    const { result } = renderHook(() => useVoiceSynthesis());

    mockSpeak.mockImplementation((utt) => {
      setTimeout(() => {
        if (utt.onerror) {
          utt.onerror({ error: 'synthesis-failed' });
        }
      }, 5);
    });

    await act(async () => {
      try {
        await result.current.speak('Test error');
      } catch (error) {
        expect(error.message).toBe('Speech error: synthesis-failed');
      }
    });

    expect(result.current.error).toBe('Speech error: synthesis-failed');
  });

  it('should stop speech', () => {
    const { result } = renderHook(() => useVoiceSynthesis());

    act(() => {
      result.current.stop();
    });

    expect(mockCancel).toHaveBeenCalled();
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('should reject empty text', async () => {
    const { result } = renderHook(() => useVoiceSynthesis());

    await act(async () => {
      try {
        await result.current.speak('');
      } catch (error) {
        expect(error.message).toBe('No text provided');
      }
    });

    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('should load available voices', () => {
    const { result } = renderHook(() => useVoiceSynthesis());

    expect(result.current.voices).toEqual([
      { name: 'Spanish Voice', lang: 'es-ES' },
      { name: 'English Voice', lang: 'en-US' }
    ]);
  });

  it('should select Spanish voice by default', async () => {
    const { result } = renderHook(() => useVoiceSynthesis());

    let utterance: any;
    mockSpeak.mockImplementation((utt) => {
      utterance = utt;
      if (utt.onstart) utt.onstart();
      if (utt.onend) utt.onend();
    });

    await act(async () => {
      await result.current.speak('Hola');
    });

    // Should select Spanish voice automatically
    expect(utterance.voice).toEqual({ name: 'Spanish Voice', lang: 'es-ES' });
  });

  it('should handle pause and resume', () => {
    const { result } = renderHook(() => useVoiceSynthesis());

    // Mock speechSynthesis pause/resume
    const mockPause = vi.fn();
    const mockResume = vi.fn();
    
    Object.defineProperty(window.speechSynthesis, 'pause', {
      value: mockPause
    });
    
    Object.defineProperty(window.speechSynthesis, 'resume', {
      value: mockResume
    });

    // Set speaking state
    act(() => {
      // Simulate speaking state
      (result.current as any).setIsSpeaking(true);
    });

    act(() => {
      result.current.pause();
    });

    expect(mockPause).toHaveBeenCalled();

    // Set paused state
    act(() => {
      (result.current as any).setIsPaused(true);
    });

    act(() => {
      result.current.resume();
    });

    expect(mockResume).toHaveBeenCalled();
  });
});