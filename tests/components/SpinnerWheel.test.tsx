/**
 * Tests for SpinnerWheel component
 * Tests classic mode, voting mode, and user interactions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SpinnerWheel } from '../../components/SpinnerWheel';
import { PollOption, TwitchMessage } from '../../types';

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
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      expect(screen.getByText('🎰 Ruleta de la Suerte')).toBeInTheDocument();
    });

    it('should render mode selector buttons', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      expect(screen.getByText('Clásica')).toBeInTheDocument();
      expect(screen.getByText('Por Votos')).toBeInTheDocument();
    });

    it('should render spin and reset buttons', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      expect(screen.getByText('Girar')).toBeInTheDocument();
    });

    it('should show message when no options', () => {
      render(<SpinnerWheel options={[]} onClose={mockOnClose} />);
      
      expect(screen.getByText('Crea una encuesta primero para usar la ruleta')).toBeInTheDocument();
    });
  });

  describe('close functionality', () => {
    it('should call onClose when close button clicked', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      // Find the X button (first button in the modal)
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons[0]; // First button is close
      
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('classic mode', () => {
    it('should start in classic mode by default', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      const classicButton = screen.getByText('Clásica').closest('button');
      expect(classicButton?.className).toContain('bg-twitch-brand');
    });

    it('should disable spin button when spinning', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      const spinButton = screen.getByText('Girar');
      fireEvent.click(spinButton);
      
      expect(screen.getByText('Girando...')).toBeInTheDocument();
    });

    it('should show winner after spin completes', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
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
      render(<SpinnerWheel options={[]} onClose={mockOnClose} />);
      
      const spinButton = screen.getByText('Girar').closest('button');
      expect(spinButton).toHaveAttribute('disabled');
    });
  });

  describe('voting mode', () => {
    it('should switch to voting mode when button clicked', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      const votingButton = screen.getByText('Por Votos');
      fireEvent.click(votingButton);
      
      expect(votingButton.closest('button')?.className).toContain('bg-twitch-brand');
    });

    it('should show voting controls in voting mode', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      
      expect(screen.getByText('Duración de votación:')).toBeInTheDocument();
      expect(screen.getByText('Iniciar Votación')).toBeInTheDocument();
    });

    it('should show voting duration input', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      
      const durationInput = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(durationInput.value).toBe('30');
    });

    it('should allow changing voting duration', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      
      const durationInput = screen.getByRole('spinbutton') as HTMLInputElement;
      fireEvent.change(durationInput, { target: { value: '60' } });
      
      expect(durationInput.value).toBe('60');
    });

    it('should start voting when button clicked', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      fireEvent.click(screen.getByText('Iniciar Votación'));
      
      expect(screen.getByText('Detener Votación')).toBeInTheDocument();
      expect(screen.getByText('30s')).toBeInTheDocument();
    });

    it('should show vote instructions when voting active', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      fireEvent.click(screen.getByText('Iniciar Votación'));
      
      expect(screen.getByText(/Vota en el chat:/)).toBeInTheDocument();
    });

    it('should countdown timer when voting active', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      fireEvent.click(screen.getByText('Iniciar Votación'));
      
      expect(screen.getByText('30s')).toBeInTheDocument();
      
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      expect(screen.getByText('29s')).toBeInTheDocument();
    });

    it('should stop voting when stop button clicked', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      fireEvent.click(screen.getByText('Iniciar Votación'));
      fireEvent.click(screen.getByText('Detener Votación'));
      
      expect(screen.getByText('Iniciar Votación')).toBeInTheDocument();
    });

    it('should disable spin while voting is active', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      fireEvent.click(screen.getByText('Iniciar Votación'));
      
      const spinButton = screen.getByText('Girar').closest('button');
      expect(spinButton).toHaveAttribute('disabled');
    });

    it('should disable mode switch while voting is active', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
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

    it('should count votes from chat messages', () => {
      vi.useRealTimers(); // Use real timers for this test
      
      const messages: TwitchMessage[] = [
        createMessage('user1', '+1', 'msg1'),
        createMessage('user2', '+2', 'msg2'),
        createMessage('user3', '+1', 'msg3'),
      ];

      const { rerender } = render(
        <SpinnerWheel 
          options={mockOptions} 
          onClose={mockOnClose} 
          chatMessages={[]}
        />
      );
      
      fireEvent.click(screen.getByText('Por Votos'));
      fireEvent.click(screen.getByText('Iniciar Votación'));
      
      // Add messages
      rerender(
        <SpinnerWheel 
          options={mockOptions} 
          onClose={mockOnClose} 
          chatMessages={messages}
        />
      );
      
      // Check that votes are counted
      expect(screen.getByText('3 votos')).toBeInTheDocument();
      
      vi.useFakeTimers(); // Restore fake timers
    });

    it('should prevent duplicate votes from same user', () => {
      vi.useRealTimers();
      
      const messages: TwitchMessage[] = [
        createMessage('user1', '+1', 'msg1'),
        createMessage('user1', '+1', 'msg2'), // Same user voting again
      ];

      const { rerender } = render(
        <SpinnerWheel 
          options={mockOptions} 
          onClose={mockOnClose} 
          chatMessages={[]}
        />
      );
      
      fireEvent.click(screen.getByText('Por Votos'));
      fireEvent.click(screen.getByText('Iniciar Votación'));
      
      rerender(
        <SpinnerWheel 
          options={mockOptions} 
          onClose={mockOnClose} 
          chatMessages={messages}
        />
      );
      
      // Only 1 vote should be counted (duplicate prevented)
      expect(screen.getByText('1 votos')).toBeInTheDocument();
      
      vi.useFakeTimers();
    });

    it('should accept votes with custom prefix', () => {
      vi.useRealTimers();
      
      const messages: TwitchMessage[] = [
        createMessage('user1', '!1', 'msg1'),
      ];

      const { rerender } = render(
        <SpinnerWheel 
          options={mockOptions} 
          onClose={mockOnClose} 
          chatMessages={[]}
          votePrefix="!"
        />
      );
      
      fireEvent.click(screen.getByText('Por Votos'));
      fireEvent.click(screen.getByText('Iniciar Votación'));
      
      rerender(
        <SpinnerWheel 
          options={mockOptions} 
          onClose={mockOnClose} 
          chatMessages={messages}
          votePrefix="!"
        />
      );
      
      expect(screen.getByText('1 votos')).toBeInTheDocument();
      
      vi.useFakeTimers();
    });
  });

  describe('canvas rendering', () => {
    it('should call canvas getContext', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    });

    it('should draw segments for each option', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      // Should draw 3 segments (arc called for each)
      expect(mockCanvasContext.arc).toHaveBeenCalled();
      expect(mockCanvasContext.fill).toHaveBeenCalled();
    });
  });

  describe('tip message', () => {
    it('should show tip in voting mode with no votes', () => {
      render(<SpinnerWheel options={mockOptions} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('Por Votos'));
      
      expect(screen.getByText(/Inicia una votación para que el chat decida las probabilidades/)).toBeInTheDocument();
    });
  });
});
