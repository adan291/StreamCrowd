import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logService, LogEntry, LogLevel } from '../../src/infrastructure/logging/LogService';

describe('LogService', () => {
  beforeEach(() => {
    logService.clearLogs();
  });

  describe('Log Levels', () => {
    it('should log debug messages', () => {
      logService.debug('Debug message', { key: 'value' });
      
      const logs = logService.getLogs('debug');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Debug message');
      expect(logs[0].level).toBe('debug');
      expect(logs[0].context).toEqual({ key: 'value' });
    });

    it('should log info messages', () => {
      logService.info('Info message', { userId: '123' });
      
      const logs = logService.getLogs('info');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Info message');
      expect(logs[0].level).toBe('info');
      expect(logs[0].context).toEqual({ userId: '123' });
    });

    it('should log warn messages', () => {
      logService.warn('Warning message', { duration: 5000 });
      
      const logs = logService.getLogs('warn');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Warning message');
      expect(logs[0].level).toBe('warn');
      expect(logs[0].context).toEqual({ duration: 5000 });
    });

    it('should log error messages with full details', () => {
      const errorData = {
        message: 'Error occurred',
        feature: 'polls',
        stack: 'Error: test\n  at test.ts:1',
        context: { endpoint: '/api/polls' },
      };
      
      logService.error(errorData);
      
      const logs = logService.getLogs('error');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Error occurred');
      expect(logs[0].level).toBe('error');
      expect(logs[0].feature).toBe('polls');
      expect(logs[0].stack).toBe('Error: test\n  at test.ts:1');
      expect(logs[0].context).toEqual({ endpoint: '/api/polls' });
    });

    it('should log without context', () => {
      logService.info('Message without context');
      
      const logs = logService.getLogs('info');
      expect(logs).toHaveLength(1);
      expect(logs[0].context).toBeUndefined();
    });
  });

  describe('Log Storage', () => {
    it('should store logs in memory', () => {
      logService.debug('Message 1');
      logService.info('Message 2');
      logService.warn('Message 3');
      
      const allLogs = logService.getLogs();
      expect(allLogs).toHaveLength(3);
    });

    it('should maintain log order', () => {
      logService.debug('First');
      logService.info('Second');
      logService.warn('Third');
      
      const allLogs = logService.getLogs();
      expect(allLogs[0].message).toBe('First');
      expect(allLogs[1].message).toBe('Second');
      expect(allLogs[2].message).toBe('Third');
    });

    it('should add timestamp to each log entry', () => {
      logService.info('Test message');
      
      const logs = logService.getLogs();
      expect(logs[0].timestamp).toBeDefined();
      expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should enforce maximum log limit', () => {
      const maxLogs = logService.getMaxLogs();
      
      // Add more logs than the limit
      for (let i = 0; i < maxLogs + 100; i++) {
        logService.info(`Message ${i}`);
      }
      
      const allLogs = logService.getLogs();
      expect(allLogs.length).toBe(maxLogs);
    });

    it('should remove oldest logs when limit is exceeded', () => {
      const maxLogs = logService.getMaxLogs();
      
      // Add logs beyond the limit
      for (let i = 0; i < maxLogs + 10; i++) {
        logService.info(`Message ${i}`);
      }
      
      const allLogs = logService.getLogs();
      // The first 10 messages should be removed
      expect(allLogs[0].message).toBe('Message 10');
      expect(allLogs[allLogs.length - 1].message).toBe(`Message ${maxLogs + 9}`);
    });
  });

  describe('Log Filtering', () => {
    beforeEach(() => {
      logService.debug('Debug 1');
      logService.info('Info 1');
      logService.warn('Warn 1');
      logService.error({ message: 'Error 1' });
      logService.debug('Debug 2');
      logService.info('Info 2');
    });

    it('should filter logs by level', () => {
      const debugLogs = logService.getLogs('debug');
      const infoLogs = logService.getLogs('info');
      const warnLogs = logService.getLogs('warn');
      const errorLogs = logService.getLogs('error');
      
      expect(debugLogs).toHaveLength(2);
      expect(infoLogs).toHaveLength(2);
      expect(warnLogs).toHaveLength(1);
      expect(errorLogs).toHaveLength(1);
    });

    it('should return all logs when no filter is provided', () => {
      const allLogs = logService.getLogs();
      expect(allLogs).toHaveLength(6);
    });

    it('should return empty array for non-existent level', () => {
      const logs = logService.getLogs('debug');
      logService.clearLogs();
      
      const emptyLogs = logService.getLogs('debug');
      expect(emptyLogs).toHaveLength(0);
    });
  });

  describe('Log Export', () => {
    it('should export logs as JSON string', () => {
      logService.info('Test message', { key: 'value' });
      logService.warn('Warning', { count: 5 });
      
      const exported = logService.exportLogs();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].message).toBe('Test message');
      expect(parsed[1].message).toBe('Warning');
    });

    it('should export with proper formatting', () => {
      logService.info('Test');
      
      const exported = logService.exportLogs();
      expect(exported).toContain('\n');
      expect(exported).toContain('  ');
    });

    it('should export empty array when no logs', () => {
      logService.clearLogs();
      
      const exported = logService.exportLogs();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(0);
    });

    it('should include all log properties in export', () => {
      logService.error({
        message: 'Error',
        feature: 'polls',
        stack: 'Stack trace',
        componentStack: 'Component stack',
        context: { data: 'test' },
      });
      
      const exported = logService.exportLogs();
      const parsed = JSON.parse(exported);
      const log = parsed[0];
      
      expect(log.level).toBe('error');
      expect(log.message).toBe('Error');
      expect(log.feature).toBe('polls');
      expect(log.stack).toBe('Stack trace');
      expect(log.componentStack).toBe('Component stack');
      expect(log.context).toEqual({ data: 'test' });
      expect(log.timestamp).toBeDefined();
    });
  });

  describe('Log Clearing', () => {
    it('should clear all logs', () => {
      logService.info('Message 1');
      logService.info('Message 2');
      logService.info('Message 3');
      
      expect(logService.getLogs()).toHaveLength(3);
      
      logService.clearLogs();
      
      expect(logService.getLogs()).toHaveLength(0);
    });

    it('should clear logs of all levels', () => {
      logService.debug('Debug');
      logService.info('Info');
      logService.warn('Warn');
      logService.error({ message: 'Error' });
      
      logService.clearLogs();
      
      expect(logService.getLogs('debug')).toHaveLength(0);
      expect(logService.getLogs('info')).toHaveLength(0);
      expect(logService.getLogs('warn')).toHaveLength(0);
      expect(logService.getLogs('error')).toHaveLength(0);
    });
  });

  describe('Log Count and Limits', () => {
    it('should return correct log count', () => {
      expect(logService.getLogCount()).toBe(0);
      
      logService.info('Message 1');
      expect(logService.getLogCount()).toBe(1);
      
      logService.info('Message 2');
      expect(logService.getLogCount()).toBe(2);
      
      logService.clearLogs();
      expect(logService.getLogCount()).toBe(0);
    });

    it('should return max logs limit', () => {
      const maxLogs = logService.getMaxLogs();
      expect(maxLogs).toBe(1000);
    });
  });

  describe('Error Logging with Details', () => {
    it('should log error with feature information', () => {
      logService.error({
        message: 'Poll creation failed',
        feature: 'polls',
        context: { pollId: '123' },
      });
      
      const logs = logService.getLogs('error');
      expect(logs[0].feature).toBe('polls');
      expect(logs[0].context).toEqual({ pollId: '123' });
    });

    it('should log error with stack trace', () => {
      const stackTrace = 'Error: test\n  at file.ts:10\n  at other.ts:20';
      
      logService.error({
        message: 'API error',
        stack: stackTrace,
      });
      
      const logs = logService.getLogs('error');
      expect(logs[0].stack).toBe(stackTrace);
    });

    it('should log error with component stack', () => {
      const componentStack = 'PollCreator > Form > Input';
      
      logService.error({
        message: 'Component error',
        componentStack,
      });
      
      const logs = logService.getLogs('error');
      expect(logs[0].componentStack).toBe(componentStack);
    });

    it('should log error with all details combined', () => {
      const errorData = {
        message: 'Complete error',
        feature: 'giveaway',
        stack: 'Stack trace',
        componentStack: 'Component stack',
        context: { userId: '456', action: 'draw' },
      };
      
      logService.error(errorData);
      
      const logs = logService.getLogs('error');
      const log = logs[0];
      
      expect(log.message).toBe('Complete error');
      expect(log.feature).toBe('giveaway');
      expect(log.stack).toBe('Stack trace');
      expect(log.componentStack).toBe('Component stack');
      expect(log.context).toEqual({ userId: '456', action: 'draw' });
    });
  });

  describe('Multiple Log Entries', () => {
    it('should handle multiple logs of different levels', () => {
      logService.debug('Debug 1');
      logService.info('Info 1');
      logService.warn('Warn 1');
      logService.error({ message: 'Error 1' });
      logService.debug('Debug 2');
      logService.info('Info 2');
      logService.warn('Warn 2');
      logService.error({ message: 'Error 2' });
      
      const allLogs = logService.getLogs();
      expect(allLogs).toHaveLength(8);
      
      expect(logService.getLogs('debug')).toHaveLength(2);
      expect(logService.getLogs('info')).toHaveLength(2);
      expect(logService.getLogs('warn')).toHaveLength(2);
      expect(logService.getLogs('error')).toHaveLength(2);
    });

    it('should maintain chronological order across levels', () => {
      logService.debug('First');
      logService.error({ message: 'Second' });
      logService.info('Third');
      logService.warn('Fourth');
      
      const allLogs = logService.getLogs();
      expect(allLogs[0].message).toBe('First');
      expect(allLogs[1].message).toBe('Second');
      expect(allLogs[2].message).toBe('Third');
      expect(allLogs[3].message).toBe('Fourth');
    });
  });

  describe('Singleton Pattern', () => {
    it('should maintain state across multiple accesses', () => {
      logService.info('Message 1');
      
      const count1 = logService.getLogCount();
      
      logService.info('Message 2');
      
      const count2 = logService.getLogCount();
      
      expect(count1).toBe(1);
      expect(count2).toBe(2);
    });

    it('should share logs across different method calls', () => {
      logService.info('Test');
      
      const allLogs = logService.getLogs();
      const infoLogs = logService.getLogs('info');
      
      expect(allLogs).toHaveLength(1);
      expect(infoLogs).toHaveLength(1);
      expect(allLogs[0]).toEqual(infoLogs[0]);
    });
  });

  describe('Context Handling', () => {
    it('should handle empty context object', () => {
      logService.info('Message', {});
      
      const logs = logService.getLogs();
      expect(logs[0].context).toEqual({});
    });

    it('should handle complex context objects', () => {
      const complexContext = {
        user: { id: '123', name: 'Test' },
        data: [1, 2, 3],
        nested: { deep: { value: 'test' } },
      };
      
      logService.info('Message', complexContext);
      
      const logs = logService.getLogs();
      expect(logs[0].context).toEqual(complexContext);
    });

    it('should preserve context in exported logs', () => {
      const context = { key: 'value', number: 42 };
      logService.info('Message', context);
      
      const exported = logService.exportLogs();
      const parsed = JSON.parse(exported);
      
      expect(parsed[0].context).toEqual(context);
    });
  });
});
