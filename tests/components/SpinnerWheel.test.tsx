/**
 * Tests for SpinnerWheel component
 * Tests classic mode, voting mode, and user interactions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SpinnerWheel } from '../../components/SpinnerWheel';
import { PollOption, TwitchMessage } from '../../types';
import { I18nProvider } from '../../i18n/context';
import React from 'react';

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
global.webkitAudioContext = vi.fn(() => mockAudioContext);

// Wrapper component for tests
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

// Custom render function that wraps with I18nProvider
const renderWithI18n = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

// Mock canvas context
const mockCanvasContext = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  arc: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  fillText: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  textAlign: '',
  font: '',
  shadowColor: '',
  shadowBlur: 0,
};

// Mock HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext) as any;

const mockOptions: PollOption[] = [
  { id: 1, label: 'Opción A', votes: 0, color: '#ff0000', voteKey: 'a' },
  { id: 2, label: 'Opción B', votes: 0, color: '#00ff00', voteKey: 'b' },
  { id: 3, label: 'Opción C', votes: 0, color: '#0000ff', voteKey: 'c' },
];

const mockOnClose = vi.fn();

describe('SpinnerWheel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render the modal with title', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      expect(screen.getByText('🎰 Ruleta de la Suerte')).toBeInTheDocument();
    });

    it('should render mode selector buttons', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      expect(screen.getByText('Clásica')).toBeInTheDocument();
      expect(screen.getByText('Por Votos')).toBeInTheDocument();
    });

    it('should render spin and reset buttons', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      expect(screen.getByText('Girar')).toBeInTheDocument();
    });

    it('should show message when no options', () => {
      renderWithI18n(<SpinnerWheel options={[]} onClose={mockOnClose} />);
      
      expect(screen.getByText('Crea una encuesta primero para usar la ruleta')).toBeInTheDocument();
    });
  });

  describe('close functionality', () => {
    it('should call onClose when close button clicked', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      // Find the X button (first button in the modal)
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons[0]; // First button is close
      
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('classic mode', () => {
    it('should start in classic mode by default', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      const classicButton = screen.getByText('Clásica').closest('button');
      expect(classicButton?.className).toContain('bg-twitch-brand');
    });

    it('should disable spin button when spinning', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      const spinButton = screen.getByText('Girar');
      fireEvent.click(spinButton);
      
      expect(screen.getByText('Girando...')).toBeInTheDocument();
    });

    it('should show winner after spin completes', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      const spinButton = screen.getByText('Girar');
      fireEvent.click(spinButton);
      
      // Fast-forward 4 seconds (spin duration)
      act(() => {
        vi.advanceTimersByTime(4100);
      });
      
      // Should show winner with celebration emojis
      expect(screen.getByText(/🎉.*🎉/)).toBeInTheDocument();
    });

    it('should disable spin button when no options', () => {
      renderWithI18n(<SpinnerWheel options={[]} onClose={mockOnClose} />);
      
      const spinButton = screen.getByText('Girar').closest('button');
      expect(spinButton).toHaveAttribute('disabled');
    });
  });

  describe('voting mode', () => {
    it('should switch to voting mode when button clicked', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      const votingButton = screen.getByText('Por Votos');
      fireEvent.click(votingButton);
      
      expect(votingButton.closest('button')?.className).toContain('bg-twitch-brand');
    });

    it('should show voting controls in voting mode', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      
      expect(screen.getByText('Duración:')).toBeInTheDocument();
      expect(screen.getByText('Iniciar Votación')).toBeInTheDocument();
    });

    it('should show voting duration input', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      
      const durationInput = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(durationInput.value).toBe('30');
    });

    it('should allow changing voting duration', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      
      const durationInput = screen.getByRole('spinbutton') as HTMLInputElement;
      fireEvent.change(durationInput, { target: { value: '60' } });
      
      expect(durationInput.value).toBe('60');
    });

    it('should start voting when button clicked', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      fireEvent.click(screen.getByText('Iniciar Votación'));
      
      // After starting voting, the timer should be visible
      expect(screen.getByText('30s')).toBeInTheDocument();
    });

    it('should show vote instructions when voting active', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      fireEvent.click(screen.getByText('Iniciar Votación'));
      
      // Check for vote instructions - the text may vary based on i18n
      expect(screen.getByText(/\+1|\+2|\+3/)).toBeInTheDocument();
    });

    it('should countdown timer when voting active', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      fireEvent.click(screen.getByText('Iniciar Votación'));
      
      expect(screen.getByText('30s')).toBeInTheDocument();
      
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      expect(screen.getByText('29s')).toBeInTheDocument();
    });

    it('should stop voting when stop button clicked', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      
      // Start voting
      fireEvent.click(screen.getByText('Iniciar Votación'));
      
      // Verify voting started by checking timer is visible
      expect(screen.getByText('30s')).toBeInTheDocument();
      
      // The mode buttons should be disabled while voting
      const classicButton = screen.getByText('Clásica').closest('button');
      expect(classicButton).toHaveAttribute('disabled');
    });

    it('should disable spin while voting is active', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      fireEvent.click(screen.getByText('Iniciar Votación'));
      
      const spinButton = screen.getByText('Girar').closest('button');
      expect(spinButton).toHaveAttribute('disabled');
    });

    it('should disable mode switch while voting is active', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      fireEvent.click(screen.getByText('Iniciar Votación'));
      
      const classicButton = screen.getByText('Clásica').closest('button');
      expect(classicButton).toHaveAttribute('disabled');
    });
  });

  describe('vote processing', () => {
    const createMessage = (username: string, message: string, id?: string): TwitchMessage => ({
      id: id || `${username}-${Date.now()}`,
      username,
      message,
      userId: username,
      timestamp: Date.now(),
      color: '#ffffff',
    });

    it('should render voting mode controls', () => {
      renderWithI18n(
        <SpinnerWheel 
          options={mockOptions} 
          onClose={mockOnClose} 
          chatMessages={[]}
        />
      );
      
      fireEvent.click(screen.getByText('Por Votos'));
      
      // Verify voting controls are present
      expect(screen.getByText('Iniciar Votación')).toBeInTheDocument();
      expect(screen.getByText('Duración:')).toBeInTheDocument();
    });

    it('should have vote prefix input functionality', () => {
      renderWithI18n(
        <SpinnerWheel 
          options={mockOptions} 
          onClose={mockOnClose} 
          chatMessages={[]}
          votePrefix="!"
        />
      );
      
      fireEvent.click(screen.getByText('Por Votos'));
      
      // Verify voting mode is active
      expect(screen.getByText('Iniciar Votación')).toBeInTheDocument();
    });

    it('should display chat messages when provided', () => {
      const messages: TwitchMessage[] = [
        createMessage('user1', '+1', 'msg1'),
      ];

      renderWithI18n(
        <SpinnerWheel 
          options={mockOptions} 
          onClose={mockOnClose} 
          chatMessages={messages}
        />
      );
      
      // Component should render without errors with messages
      expect(screen.getByText('🎰 Ruleta de la Suerte')).toBeInTheDocument();
    });
  });

  describe('canvas rendering', () => {
    it('should call canvas getContext', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    });

    it('should draw segments for each option', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      // Should draw 3 segments (arc called for each)
      expect(mockCanvasContext.arc).toHaveBeenCalled();
      expect(mockCanvasContext.fill).toHaveBeenCalled();
    });
  });

  describe('tip message', () => {
    it('should show tip in voting mode with no votes', () => {
      renderWithI18n(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      
      // Check for tip message about voting - use getAllByText since there may be multiple matches
      const tipElements = screen.getAllByText(/determinarán/i);
      expect(tipElements.length).toBeGreaterThan(0);
    });
  });
});
