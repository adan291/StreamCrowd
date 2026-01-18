/**
 * ErrorMonitoringDashboard Component Tests
 * 
 * Tests for error monitoring dashboard including log viewer,
 * frequency chart, filtering, and export functionality.
 * 
 * **Feature: error-handling**
 * **Validates: Requirements 8.3, 8.4**
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorMonitoringDashboard } from '../../src/presentation/components/shared/ErrorMonitoringDashboard';
import { logService } from '../../src/infrastructure/logging/LogService';

// ============================================
// SETUP
// ============================================

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  // Clear logs before each test
  logService.clearLogs();
  
  // Mock URL methods
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
  
  // Mock clipboard API
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn(() => Promise.resolve()),
    },
  });
  
  // Mock window.confirm
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper to add test logs
function addTestLogs() {
  logService.debug('Debug message', { component: 'TestComponent' });
  logService.info('Info message', { action: 'test' });
  logService.warn('Warning message', { severity: 'medium' });
  logService.error({ message: 'Error message', feature: 'polls', stack: 'Error stack trace' });
}

// ============================================
// TESTS
// ============================================

describe('ErrorMonitoringDashboard Component', () => {
  describe('Rendering (Requirement 8.3)', () => {
    it('should render dashboard title', () => {
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByText('Error Monitoring Dashboard')).toBeInTheDocument();
    });

    it('should render statistics cards', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByText('Total Logs')).toBeInTheDocument();
      expect(screen.getByText('Errors')).toBeInTheDocument();
      expect(screen.getByText('Warnings')).toBeInTheDocument();
      expect(screen.getByText('Features Affected')).toBeInTheDocument();
    });

    it('should display correct log counts', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      // Total logs should be 4
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should render empty state when no logs', () => {
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByText('No logs found')).toBeInTheDocument();
    });

    it('should render view mode toggle buttons', () => {
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /chart/i })).toBeInTheDocument();
    });

    it('should render filter buttons', () => {
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^error$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^warn$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^info$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^debug$/i })).toBeInTheDocument();
    });
  });

  describe('Log List View (Requirement 8.3)', () => {
    it('should display log entries', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByText('Debug message')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should display log level badges', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      // Use getAllByText since filter buttons and log badges both have these texts
      expect(screen.getAllByText('debug').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('info').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('warn').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('error').length).toBeGreaterThanOrEqual(1);
    });

    it('should display feature badge for logs with feature', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByText('polls')).toBeInTheDocument();
    });

    it('should expand log entry on click', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      // Click on error log entry
      const errorEntry = screen.getByText('Error message').closest('div[class*="cursor-pointer"]');
      fireEvent.click(errorEntry!);
      
      // Should show stack trace
      expect(screen.getByText('Stack Trace')).toBeInTheDocument();
      expect(screen.getByText('Error stack trace')).toBeInTheDocument();
    });

    it('should collapse log entry on second click', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      const errorEntry = screen.getByText('Error message').closest('div[class*="cursor-pointer"]');
      
      // Click to expand
      fireEvent.click(errorEntry!);
      expect(screen.getByText('Stack Trace')).toBeInTheDocument();
      
      // Click to collapse
      fireEvent.click(errorEntry!);
      expect(screen.queryByText('Stack Trace')).not.toBeInTheDocument();
    });
  });

  describe('Filtering (Requirement 8.3)', () => {
    it('should filter logs by level', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      // Click error filter
      const errorFilter = screen.getByRole('button', { name: /^error$/i });
      fireEvent.click(errorFilter);
      
      // Should only show error logs
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Debug message')).not.toBeInTheDocument();
      expect(screen.queryByText('Info message')).not.toBeInTheDocument();
      expect(screen.queryByText('Warning message')).not.toBeInTheDocument();
    });

    it('should filter logs by search query', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'Error' } });
      
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Debug message')).not.toBeInTheDocument();
    });

    it('should search in feature names', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'polls' } });
      
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Debug message')).not.toBeInTheDocument();
    });

    it('should show empty state when filter returns no results', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      expect(screen.getByText('No logs found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });

    it('should combine level and search filters', () => {
      logService.error({ message: 'Error in polls', feature: 'polls' });
      logService.error({ message: 'Error in games', feature: 'games' });
      logService.warn('Warning in polls', { feature: 'polls' });
      
      render(<ErrorMonitoringDashboard />);
      
      // Filter by error level
      const errorFilter = screen.getByRole('button', { name: /^error$/i });
      fireEvent.click(errorFilter);
      
      // Search for polls
      const searchInput = screen.getByPlaceholderText('Search logs...');
      fireEvent.change(searchInput, { target: { value: 'polls' } });
      
      expect(screen.getByText('Error in polls')).toBeInTheDocument();
      expect(screen.queryByText('Error in games')).not.toBeInTheDocument();
      expect(screen.queryByText('Warning in polls')).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should have sort button with default newest order', () => {
      logService.info('First message');
      logService.info('Second message');
      
      render(<ErrorMonitoringDashboard />);
      
      // Check that sort button shows "Newest" by default
      expect(screen.getByRole('button', { name: /newest/i })).toBeInTheDocument();
    });

    it('should toggle sort order when clicking sort button', () => {
      logService.info('First message');
      logService.info('Second message');
      
      render(<ErrorMonitoringDashboard />);
      
      const sortButton = screen.getByRole('button', { name: /newest/i });
      fireEvent.click(sortButton);
      
      expect(screen.getByRole('button', { name: /oldest/i })).toBeInTheDocument();
    });
  });

  describe('Chart View (Requirement 8.3)', () => {
    it('should switch to chart view', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      const chartButton = screen.getByRole('button', { name: /chart/i });
      fireEvent.click(chartButton);
      
      expect(screen.getByText('Error Frequency (Last 24 Hours)')).toBeInTheDocument();
    });

    it('should display chart legend', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      const chartButton = screen.getByRole('button', { name: /chart/i });
      fireEvent.click(chartButton);
      
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Debug')).toBeInTheDocument();
    });

    it('should switch back to list view', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      // Switch to chart
      const chartButton = screen.getByRole('button', { name: /chart/i });
      fireEvent.click(chartButton);
      
      // Switch back to list
      const listButton = screen.getByRole('button', { name: /list/i });
      fireEvent.click(listButton);
      
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Export Functionality (Requirement 8.4)', () => {
    it('should render export button', () => {
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('should export logs as JSON file', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      // Mock document.createElement and appendChild
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);
      
      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toMatch(/error-logs-.*\.json/);
    });
  });

  describe('Clear Functionality', () => {
    it('should render clear button', () => {
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('should clear logs when confirmed', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByText('Error message')).toBeInTheDocument();
      
      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);
      
      expect(window.confirm).toHaveBeenCalled();
      expect(screen.getByText('No logs found')).toBeInTheDocument();
    });

    it('should not clear logs when cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);
      
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should render refresh button', () => {
      render(<ErrorMonitoringDashboard />);
      
      // Find refresh button by its title
      const refreshButton = screen.getByTitle('Refresh logs');
      expect(refreshButton).toBeInTheDocument();
    });

    it('should refresh logs when clicked', () => {
      render(<ErrorMonitoringDashboard />);
      
      // Add logs after initial render
      logService.info('New log after render');
      
      const refreshButton = screen.getByTitle('Refresh logs');
      fireEvent.click(refreshButton);
      
      expect(screen.getByText('New log after render')).toBeInTheDocument();
    });
  });

  describe('Copy Log Entry', () => {
    it('should copy log entry to clipboard', async () => {
      const clipboardWriteText = vi.fn(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardWriteText,
        },
      });
      
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      // Find and click copy button (first one in the list)
      const copyButtons = screen.getAllByTitle('Copy log entry');
      fireEvent.click(copyButtons[0]);
      
      expect(clipboardWriteText).toHaveBeenCalled();
    });
  });

  describe('Footer Information', () => {
    it('should display log count in footer', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByText(/Showing 4 of 4 logs/)).toBeInTheDocument();
    });

    it('should display max capacity', () => {
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByText(/Max capacity: 1000 logs/)).toBeInTheDocument();
    });

    it('should update count when filtering', () => {
      addTestLogs();
      render(<ErrorMonitoringDashboard />);
      
      const errorFilter = screen.getByRole('button', { name: /^error$/i });
      fireEvent.click(errorFilter);
      
      expect(screen.getByText(/Showing 1 of 4 logs/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button titles', () => {
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByTitle('Refresh logs')).toBeInTheDocument();
      expect(screen.getByTitle('Export logs')).toBeInTheDocument();
      expect(screen.getByTitle('Clear all logs')).toBeInTheDocument();
    });

    it('should have search input with placeholder', () => {
      render(<ErrorMonitoringDashboard />);
      
      expect(screen.getByPlaceholderText('Search logs...')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<ErrorMonitoringDashboard className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
