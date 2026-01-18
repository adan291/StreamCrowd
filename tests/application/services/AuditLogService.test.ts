/**
 * AuditLogService Tests
 * 
 * Tests for the audit logging system functionality including state change logging,
 * filtering, statistics, and integration with the existing logging infrastructure.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuditLogService } from '../../../src/application/services/AuditLogService';
import { createOverlayState, PollOverlayState } from '../../../src/domain/entities/OverlayState';
import { AuditUserContext } from '../../../src/domain/entities/AuditLog';

describe('AuditLogService', () => {
  let auditLogService: AuditLogService;
  let mockPollState: PollOverlayState;
  let mockUserContext: AuditUserContext;

  beforeEach(() => {
    auditLogService = new AuditLogService({
      maxEntries: 100,
      enableExternalLogging: false, // Disable for testing
      logSensitiveData: false,
      retentionPeriod: 24 * 60 * 60 * 1000, // 1 day
      enablePerformanceTracking: true,
    });

    mockPollState = createOverlayState('poll', 'test-channel', {
      question: 'Test poll?',
      options: [
        { id: 1, label: 'Option 1', votes: 0, color: '#ff0000' },
        { id: 2, label: 'Option 2', votes: 0, color: '#00ff00' },
      ],
      totalVotes: 0,
      showResults: false,
      startTime: Date.now(),
    });

    mockUserContext = {
      userId: 'user123',
      username: 'testuser',
      role: 'streamer',
      sessionId: 'session123',
    };
  });

  afterEach(() => {
    auditLogService.dispose();
  });

  describe('State Change Logging', () => {
    it('should log a successful state creation', async () => {
      await auditLogService.logStateChange(
        'create',
        'user',
        mockPollState,
        {
          userContext: mockUserContext,
          reason: 'User created a new poll',
        }
      );

      const logs = auditLogService.getAuditLogs();
      expect(logs).toHaveLength(1);

      const log = logs[0];
      expect(log.operation).toBe('create');
      expect(log.source).toBe('user');
      expect(log.overlayType).toBe('poll');
      expect(log.overlayId).toBe(mockPollState.id);
      expect(log.channelId).toBe(mockPollState.channelId);
      expect(log.success).toBe(true);
      expect(log.userContext).toEqual(mockUserContext);
      expect(log.changeDetails?.reason).toBe('User created a new poll');
    });

    it('should log a failed state update', async () => {
      const updatedState = { ...mockPollState, data: { ...mockPollState.data, question: 'Updated question' } };

      await auditLogService.logStateChange(
        'update',
        'user',
        updatedState,
        {
          previousState: mockPollState,
          userContext: mockUserContext,
          success: false,
          error: 'Validation failed',
          reason: 'User attempted to update poll',
        }
      );

      const logs = auditLogService.getAuditLogs();
      expect(logs).toHaveLength(1);

      const log = logs[0];
      expect(log.operation).toBe('update');
      expect(log.success).toBe(false);
      expect(log.error).toBe('Validation failed');
      expect(log.changeDetails?.previousState).toBeDefined();
      expect(log.changeDetails?.newState).toBeDefined();
    });

    it('should track performance metrics when enabled', async () => {
      const startTime = Date.now();
      
      await auditLogService.logStateChange(
        'create',
        'system',
        mockPollState,
        {
          duration: 150,
          reason: 'System sync operation',
        }
      );

      const logs = auditLogService.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].duration).toBe(150);
    });
  });

  describe('Bulk Operations', () => {
    it('should log bulk operations correctly', async () => {
      const states = [
        mockPollState,
        createOverlayState('giveaway', 'test-channel', {
          winner: null,
          isSpinning: false,
          participants: ['user1', 'user2'],
          mode: 'viewers' as const,
        }),
      ];

      await auditLogService.logBulkOperation(
        'clear',
        'system',
        states,
        {
          userContext: mockUserContext,
          reason: 'Bulk clear operation',
        }
      );

      const logs = auditLogService.getAuditLogs();
      expect(logs).toHaveLength(2);
      
      logs.forEach(log => {
        expect(log.operation).toBe('clear');
        expect(log.source).toBe('system');
        expect(log.userContext).toEqual(mockUserContext);
      });
    });
  });

  describe('Filtering and Querying', () => {
    beforeEach(async () => {
      // Create test data
      await auditLogService.logStateChange('create', 'user', mockPollState, { userContext: mockUserContext });
      
      const giveawayState = createOverlayState('giveaway', 'test-channel', {
        winner: null,
        isSpinning: false,
        participants: [],
        mode: 'viewers' as const,
      });
      await auditLogService.logStateChange('update', 'system', giveawayState);
      
      await auditLogService.logStateChange('delete', 'user', mockPollState, { 
        userContext: mockUserContext,
        success: false,
        error: 'Permission denied'
      });
    });

    it('should filter logs by overlay type', () => {
      const pollLogs = auditLogService.getAuditLogs({ overlayType: 'poll' });
      expect(pollLogs).toHaveLength(2);
      pollLogs.forEach(log => expect(log.overlayType).toBe('poll'));
    });

    it('should filter logs by operation', () => {
      const createLogs = auditLogService.getAuditLogs({ operation: 'create' });
      expect(createLogs).toHaveLength(1);
      expect(createLogs[0].operation).toBe('create');
    });

    it('should filter logs by source', () => {
      const userLogs = auditLogService.getAuditLogs({ source: 'user' });
      expect(userLogs).toHaveLength(2);
      userLogs.forEach(log => expect(log.source).toBe('user'));
    });

    it('should filter logs by success status', () => {
      const failedLogs = auditLogService.getAuditLogs({ success: false });
      expect(failedLogs).toHaveLength(1);
      expect(failedLogs[0].success).toBe(false);
    });

    it('should filter logs by user ID', () => {
      const userLogs = auditLogService.getAuditLogs({ userId: 'user123' });
      expect(userLogs).toHaveLength(2);
      userLogs.forEach(log => expect(log.userContext?.userId).toBe('user123'));
    });

    it('should apply pagination', () => {
      const firstPage = auditLogService.getAuditLogs({ limit: 2 });
      expect(firstPage).toHaveLength(2);

      const secondPage = auditLogService.getAuditLogs({ limit: 2, offset: 2 });
      expect(secondPage).toHaveLength(1);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      // Create test data for statistics
      await auditLogService.logStateChange('create', 'user', mockPollState, { userContext: mockUserContext });
      await auditLogService.logStateChange('update', 'user', mockPollState, { userContext: mockUserContext });
      await auditLogService.logStateChange('delete', 'system', mockPollState, { success: false });
    });

    it('should generate correct statistics', () => {
      const stats = auditLogService.getAuditStats();
      
      expect(stats.totalEntries).toBe(3);
      expect(stats.byOperation.create).toBe(1);
      expect(stats.byOperation.update).toBe(1);
      expect(stats.byOperation.delete).toBe(1);
      expect(stats.bySource.user).toBe(2);
      expect(stats.bySource.system).toBe(1);
      expect(stats.byOverlayType.poll).toBe(3);
      expect(stats.successRate).toBe(2/3); // 2 successful out of 3
      expect(stats.topUsers).toHaveLength(1);
      expect(stats.topUsers[0].userId).toBe('user123');
      expect(stats.topUsers[0].count).toBe(2);
    });
  });

  describe('Export and Clear', () => {
    beforeEach(async () => {
      await auditLogService.logStateChange('create', 'user', mockPollState, { userContext: mockUserContext });
      await auditLogService.logStateChange('update', 'user', mockPollState, { userContext: mockUserContext });
    });

    it('should export logs as JSON', () => {
      const exported = auditLogService.exportAuditLogs();
      const parsed = JSON.parse(exported);
      
      expect(parsed.totalEntries).toBe(2);
      expect(parsed.entries).toHaveLength(2);
      expect(parsed.exportedAt).toBeDefined();
    });

    it('should clear logs', () => {
      const clearedCount = auditLogService.clearAuditLogs();
      expect(clearedCount).toBe(2);
      
      const remainingLogs = auditLogService.getAuditLogs();
      expect(remainingLogs).toHaveLength(0);
    });

    it('should clear logs with filters', () => {
      const clearedCount = auditLogService.clearAuditLogs({ operation: 'create' });
      expect(clearedCount).toBe(1);
      
      const remainingLogs = auditLogService.getAuditLogs();
      expect(remainingLogs).toHaveLength(1);
      expect(remainingLogs[0].operation).toBe('update');
    });
  });

  describe('Configuration', () => {
    it('should respect max entries limit', async () => {
      const smallService = new AuditLogService({ maxEntries: 2 });
      
      // Add 3 entries
      for (let i = 0; i < 3; i++) {
        const state = createOverlayState('poll', 'test-channel', {
          question: `Poll ${i}`,
          options: [],
          totalVotes: 0,
          showResults: false,
          startTime: Date.now(),
        });
        await smallService.logStateChange('create', 'user', state);
      }
      
      const logs = smallService.getAuditLogs();
      expect(logs).toHaveLength(2); // Should only keep the last 2
      
      smallService.dispose();
    });

    it('should update configuration', () => {
      const initialConfig = auditLogService.getConfig();
      expect(initialConfig.maxEntries).toBe(100);
      
      auditLogService.updateConfig({ maxEntries: 200 });
      
      const updatedConfig = auditLogService.getConfig();
      expect(updatedConfig.maxEntries).toBe(200);
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize sensitive data when logSensitiveData is false', async () => {
      await auditLogService.logStateChange(
        'create',
        'user',
        mockPollState,
        {
          userContext: {
            userId: 'sensitive-user-id',
            username: 'testuser',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0...',
          },
        }
      );

      const logs = auditLogService.getAuditLogs();
      const log = logs[0];
      
      // The audit log entry itself should contain the full channel ID
      expect(log.channelId).toBe('test-channel');
      
      // Change details should contain sanitized state data
      expect(log.changeDetails?.newState).toBeDefined();
      expect(log.changeDetails?.newState).toHaveProperty('dataKeys');
      expect(log.changeDetails?.newState).not.toHaveProperty('data');
    });
  });
});