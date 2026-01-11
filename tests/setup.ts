import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock AudioContext for sound tests
const mockAudioContext = {
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    type: 'sine',
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  })),
  destination: {},
  currentTime: 0,
  close: vi.fn(),
};

// @ts-ignore - Mock global AudioContext
global.AudioContext = vi.fn(() => mockAudioContext);
// @ts-ignore - Mock webkit prefix
(global as any).webkitAudioContext = vi.fn(() => mockAudioContext);

// Also mock on window for browser-like environment
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.AudioContext = vi.fn(() => mockAudioContext);
  // @ts-ignore
  (window as any).webkitAudioContext = vi.fn(() => mockAudioContext);
}
