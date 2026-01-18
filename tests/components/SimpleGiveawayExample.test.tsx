/**
 * Tests for SimpleGiveawayExample Component
 * 
 * Validates Redux-based giveaway management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import giveawayReducer from '../../src/application/state/slices/giveawaySlice';
import { SimpleGiveawayExample } from '../../components/giveaway/SimpleGiveawayExample';

// Create a fresh store for each test
const createTestStore = () => {
  return configureStore({
    reducer: {
      giveaway: giveawayReducer,
    },
  });
};

describe('SimpleGiveawayExample', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  const renderComponent = () => {
    return render(
      <Provider store={store}>
        <SimpleGiveawayExample />
      </Provider>
    );
  };

  describe('Initial State', () => {
    it('should render create giveaway form when no active giveaway', () => {
      renderComponent();
      expect(screen.getByPlaceholderText('Giveaway title...')).toBeInTheDocument();
      expect(screen.getByText('Create New Giveaway')).toBeInTheDocument();
    });

    it('should show cloud sync status', () => {
      renderComponent();
      expect(screen.getByText('Cloud Sync Off')).toBeInTheDocument();
    });
  });

  describe('Create Giveaway', () => {
    it('should create a giveaway with title', () => {
      renderComponent();
      
      const titleInput = screen.getByPlaceholderText('Giveaway title...');
      const createButton = screen.getByRole('button', { name: '' }); // Plus icon button
      
      fireEvent.change(titleInput, { target: { value: 'Test Giveaway' } });
      fireEvent.click(createButton);
      
      expect(screen.getByText('Test Giveaway')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should not create giveaway with empty title', () => {
      renderComponent();
      
      const createButton = screen.getByRole('button', { name: '' });
      expect(createButton).toBeDisabled();
    });

    it('should clear title input after creating giveaway', () => {
      renderComponent();
      
      const titleInput = screen.getByPlaceholderText('Giveaway title...') as HTMLInputElement;
      const createButton = screen.getByRole('button', { name: '' });
      
      fireEvent.change(titleInput, { target: { value: 'Test' } });
      fireEvent.click(createButton);
      
      // Title input should not be visible anymore (giveaway is active)
      expect(screen.queryByPlaceholderText('Giveaway title...')).not.toBeInTheDocument();
    });
  });

  describe('Add Participants', () => {
    beforeEach(() => {
      renderComponent();
      
      // Create a giveaway first
      const titleInput = screen.getByPlaceholderText('Giveaway title...');
      const createButton = screen.getByRole('button', { name: '' });
      fireEvent.change(titleInput, { target: { value: 'Test' } });
      fireEvent.click(createButton);
    });

    it('should add a participant', () => {
      const participantInput = screen.getByPlaceholderText('Participant username...');
      const addButton = screen.getAllByRole('button', { name: '' })[0]; // First plus button
      
      fireEvent.change(participantInput, { target: { value: 'user1' } });
      fireEvent.click(addButton);
      
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('1 participants')).toBeInTheDocument();
    });

    it('should add multiple participants', () => {
      const participantInput = screen.getByPlaceholderText('Participant username...');
      const addButton = screen.getAllByRole('button', { name: '' })[0];
      
      // Add first participant
      fireEvent.change(participantInput, { target: { value: 'user1' } });
      fireEvent.click(addButton);
      
      // Add second participant
      fireEvent.change(participantInput, { target: { value: 'user2' } });
      fireEvent.click(addButton);
      
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
      expect(screen.getByText('2 participants')).toBeInTheDocument();
    });

    it('should clear participant input after adding', () => {
      const participantInput = screen.getByPlaceholderText('Participant username...') as HTMLInputElement;
      const addButton = screen.getAllByRole('button', { name: '' })[0];
      
      fireEvent.change(participantInput, { target: { value: 'user1' } });
      fireEvent.click(addButton);
      
      expect(participantInput.value).toBe('');
    });

    it('should not add participant with empty username', () => {
      const addButton = screen.getAllByRole('button', { name: '' })[0];
      expect(addButton).toBeDisabled();
    });
  });

  describe('Remove Participants', () => {
    beforeEach(() => {
      renderComponent();
      
      // Create giveaway and add participants
      const titleInput = screen.getByPlaceholderText('Giveaway title...');
      fireEvent.change(titleInput, { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: '' }));
      
      const participantInput = screen.getByPlaceholderText('Participant username...');
      const addButton = screen.getAllByRole('button', { name: '' })[0];
      
      fireEvent.change(participantInput, { target: { value: 'user1' } });
      fireEvent.click(addButton);
      fireEvent.change(participantInput, { target: { value: 'user2' } });
      fireEvent.click(addButton);
    });

    it('should remove a participant', () => {
      const deleteButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );
      
      fireEvent.click(deleteButtons[0]);
      
      expect(screen.queryByText('user1')).not.toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
      expect(screen.getByText('1 participants')).toBeInTheDocument();
    });
  });

  describe('Select Winner', () => {
    beforeEach(() => {
      renderComponent();
      
      // Create giveaway and add participants
      const titleInput = screen.getByPlaceholderText('Giveaway title...');
      fireEvent.change(titleInput, { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: '' }));
      
      const participantInput = screen.getByPlaceholderText('Participant username...');
      const addButton = screen.getAllByRole('button', { name: '' })[0];
      
      fireEvent.change(participantInput, { target: { value: 'user1' } });
      fireEvent.click(addButton);
      fireEvent.change(participantInput, { target: { value: 'user2' } });
      fireEvent.click(addButton);
    });

    it('should select a winner', async () => {
      const selectWinnerButton = screen.getByText('Select Winner');
      fireEvent.click(selectWinnerButton);
      
      // Should show selecting state
      await waitFor(() => {
        expect(screen.getByText('Selecting winner...')).toBeInTheDocument();
      });
      
      // After timeout, should show winner (mocked to 2 seconds in component)
      await waitFor(() => {
        const winnerText = screen.queryByText(/user[12]/);
        expect(winnerText).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should disable select winner button when no participants', () => {
      // Clear all participants
      const deleteButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );
      
      deleteButtons.forEach(btn => fireEvent.click(btn));
      
      const selectWinnerButton = screen.getByText('Select Winner');
      expect(selectWinnerButton).toBeDisabled();
    });
  });

  describe('Cloud Sync', () => {
    it('should toggle cloud sync', () => {
      renderComponent();
      
      expect(screen.getByText('Cloud Sync Off')).toBeInTheDocument();
      
      const toggleButton = screen.getByText('Disabled');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('Cloud Sync On')).toBeInTheDocument();
      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });
  });

  describe('History', () => {
    it('should show history after ending giveaway', async () => {
      renderComponent();
      
      // Create giveaway
      const titleInput = screen.getByPlaceholderText('Giveaway title...');
      fireEvent.change(titleInput, { target: { value: 'Test Giveaway' } });
      fireEvent.click(screen.getByRole('button', { name: '' }));
      
      // Add participant
      const participantInput = screen.getByPlaceholderText('Participant username...');
      fireEvent.change(participantInput, { target: { value: 'user1' } });
      fireEvent.click(screen.getAllByRole('button', { name: '' })[0]);
      
      // Select winner
      fireEvent.click(screen.getByText('Select Winner'));
      
      // Wait for winner selection
      await waitFor(() => {
        expect(screen.getByText('Save to History')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Save to history
      fireEvent.click(screen.getByText('Save to History'));
      
      // Check history
      expect(screen.getByText(/History \(1\)/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display and clear errors', async () => {
      const { rerender } = renderComponent();
      
      // Manually trigger an error through Redux (wrapped in act)
      await waitFor(() => {
        store.dispatch({ type: 'giveaway/setError', payload: 'Test error' });
      });
      
      // Force re-render to pick up state change
      rerender(
        <Provider store={store}>
          <SimpleGiveawayExample />
        </Provider>
      );
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });
      
      // Dismiss error
      fireEvent.click(screen.getByText('Dismiss'));
      
      await waitFor(() => {
        expect(screen.queryByText('Test error')).not.toBeInTheDocument();
      });
    });
  });
});
