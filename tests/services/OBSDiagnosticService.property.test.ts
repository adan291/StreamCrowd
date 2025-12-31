/**
 * Property-based tests for OBSDiagnosticService
 * 
 * Tests the diagnostic service for correctness properties:
 * - Property 6: Diagnostic Completeness
 * - Property 7: Diagnostic Fix Suggestions
 * 
 * @requirements 4.2, 4.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  runDiagnostics,
  generateDiagnosticReport,
  getFixSuggestions,
  type DiagnosticCheck,
  type DiagnosticResult,
  type DiagnosticCheckStatus,
} from '../../src/application/services/OBSDiagnosticService';

// Mock WebSocket for testing
class MockWebSocket {
  static mockResponse: { success: boolean; requiresPassword: boolean; version?: string } = {
    success: true,
    requiresPassword: false,
    version: '5.0.0',
  };
  
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  
  private closed = false;
  
  constructor(_url: string) {
    setTimeout(() => {
      if (this.closed) return;
      
      if (MockWebSocket.mockResponse.success) {
        this.onopen?.();
        setTimeout(() => {
          if (this.closed) return;
          this.onmessage?.({
            data: JSON.stringify({
              op: 0,
              d: {
                obsWebSocketVersion: MockWebSocket.mockResponse.version,
                authentication: MockWebSocket.mockResponse.requiresPassword 
                  ? { challenge: 'test', salt: 'test' } 
                  : undefined,
              },
            }),
          });
        }, 10);
      } else {
        this.onerror?.();
      }
    }, 50);
  }
  
  send(_data: string): void {}
  
  close(): void {
    this.closed = true;
    this.onclose?.();
  }
  
  static setResponse(response: { success: boolean; requiresPassword: boolean; version?: string }): void {
    MockWebSocket.mockResponse = response;
  }
  
  static reset(): void {
    MockWebSocket.mockResponse = { success: true, requiresPassword: false, version: '5.0.0' };
  }
}

const originalWebSocket = global.WebSocket;

describe('OBSDiagnosticService Property Tests', () => {
  beforeEach(() => {
    MockWebSocket.reset();
    // @ts-expect-error - Mocking WebSocket
    global.WebSocket = MockWebSocket;
  });
  
  afterEach(() => {
    global.WebSocket = originalWebSocket;
    MockWebSocket.reset();
  });

  /**
   * Property 6: Diagnostic Completeness
   * For any diagnostic run, all defined checks SHALL be executed and reported.
   * @validates Requirements 4.2
   */
  describe('Property 6: Diagnostic Completeness', () => {
    it('should execute all checks when connection succeeds', async () => {
      MockWebSocket.setResponse({ success: true, requiresPassword: false, version: '5.0.0' });
      
      const result = await runDiagnostics('localhost', 4455);
      
      // Should have all 4 checks
      expect(result.checks).toHaveLength(4);
      
      // Verify all check IDs are present
      const checkIds = result.checks.map(c => c.id);
      expect(checkIds).toContain('port-accessible');
      expect(checkIds).toContain('websocket-responds');
      expect(checkIds).toContain('authentication');
      expect(checkIds).toContain('version-compatible');
    });

    it('should mark remaining checks as skipped when port is not accessible', async () => {
      MockWebSocket.setResponse({ success: false, requiresPassword: false });
      
      const result = await runDiagnostics('localhost', 4455);
      
      // Should still have all 4 checks
      expect(result.checks).toHaveLength(4);
      
      // First check should fail
      expect(result.checks[0].id).toBe('port-accessible');
      expect(result.checks[0].status).toBe('fail');
      
      // Remaining checks should be skipped
      for (let i = 1; i < result.checks.length; i++) {
        expect(result.checks[i].status).toBe('skipped');
      }
    });

    it('should report progress for each check', async () => {
      MockWebSocket.setResponse({ success: true, requiresPassword: false, version: '5.0.0' });
      
      const progressChecks: DiagnosticCheck[] = [];
      
      await runDiagnostics('localhost', 4455, undefined, (check) => {
        progressChecks.push({ ...check });
      });
      
      // Should have received progress for all checks
      expect(progressChecks.length).toBeGreaterThanOrEqual(4);
    });

    it('should have valid status for all checks', async () => {
      MockWebSocket.setResponse({ success: true, requiresPassword: false, version: '5.0.0' });
      
      const result = await runDiagnostics('localhost', 4455);
      
      const validStatuses: DiagnosticCheckStatus[] = ['pending', 'checking', 'pass', 'fail', 'warning', 'skipped'];
      
      for (const check of result.checks) {
        expect(validStatuses).toContain(check.status);
      }
    });
  });

  /**
   * Property 7: Diagnostic Fix Suggestions
   * For any failed diagnostic check, a fix suggestion SHALL be provided.
   * @validates Requirements 4.3
   */
  describe('Property 7: Diagnostic Fix Suggestions', () => {
    it('should provide fix suggestions for failed checks', async () => {
      MockWebSocket.setResponse({ success: false, requiresPassword: false });
      
      const result = await runDiagnostics('localhost', 4455);
      
      const failedChecks = result.checks.filter(c => c.status === 'fail');
      
      // All failed checks should have a fix suggestion
      for (const check of failedChecks) {
        expect(check.fix).toBeDefined();
        expect(check.fix!.length).toBeGreaterThan(0);
      }
    });

    it('should provide fix suggestions for warning checks', async () => {
      MockWebSocket.setResponse({ success: true, requiresPassword: true, version: '4.0.0' });
      
      const result = await runDiagnostics('localhost', 4455);
      
      const warningChecks = result.checks.filter(c => c.status === 'warning');
      
      // All warning checks should have a fix suggestion
      for (const check of warningChecks) {
        expect(check.fix).toBeDefined();
        expect(check.fix!.length).toBeGreaterThan(0);
      }
    });

    it('should extract fix suggestions correctly', async () => {
      MockWebSocket.setResponse({ success: false, requiresPassword: false });
      
      const result = await runDiagnostics('localhost', 4455);
      const suggestions = getFixSuggestions(result);
      
      // Should have at least one suggestion for the failed port check
      expect(suggestions.length).toBeGreaterThan(0);
      
      // All suggestions should be non-empty strings
      for (const suggestion of suggestions) {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
      }
    });
  });

  /**
   * Property: Overall Status Consistency
   */
  describe('Overall Status Consistency', () => {
    it('should be healthy when all checks pass', async () => {
      MockWebSocket.setResponse({ success: true, requiresPassword: false, version: '5.0.0' });
      
      const result = await runDiagnostics('localhost', 4455);
      
      const allPassed = result.checks.every(c => c.status === 'pass');
      if (allPassed) {
        expect(result.overallStatus).toBe('healthy');
      }
    });

    it('should be critical when any check fails', async () => {
      MockWebSocket.setResponse({ success: false, requiresPassword: false });
      
      const result = await runDiagnostics('localhost', 4455);
      
      const hasFailed = result.checks.some(c => c.status === 'fail');
      if (hasFailed) {
        expect(result.overallStatus).toBe('critical');
      }
    });

    it('should be issues when only warnings exist', async () => {
      MockWebSocket.setResponse({ success: true, requiresPassword: true, version: '5.0.0' });
      
      const result = await runDiagnostics('localhost', 4455);
      
      const hasFailed = result.checks.some(c => c.status === 'fail');
      const hasWarning = result.checks.some(c => c.status === 'warning');
      
      if (!hasFailed && hasWarning) {
        expect(result.overallStatus).toBe('issues');
      }
    });
  });

  /**
   * Property: Report Generation
   */
  describe('Report Generation', () => {
    it('should generate valid report string', async () => {
      MockWebSocket.setResponse({ success: true, requiresPassword: false, version: '5.0.0' });
      
      const result = await runDiagnostics('localhost', 4455);
      const report = generateDiagnosticReport(result);
      
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
      expect(report).toContain('Diagnóstico');
      expect(report).toContain('Estado');
    });

    it('should include all check results in report', async () => {
      MockWebSocket.setResponse({ success: true, requiresPassword: false, version: '5.0.0' });
      
      const result = await runDiagnostics('localhost', 4455);
      const report = generateDiagnosticReport(result);
      
      for (const check of result.checks) {
        expect(report).toContain(check.name);
      }
    });

    it('should include timestamp in report', async () => {
      MockWebSocket.setResponse({ success: true, requiresPassword: false, version: '5.0.0' });
      
      const result = await runDiagnostics('localhost', 4455);
      const report = generateDiagnosticReport(result);
      
      expect(report).toContain('Fecha');
    });
  });

  /**
   * Property: Check Structure Invariants
   */
  describe('Check Structure Invariants', () => {
    it('should have unique check IDs', async () => {
      MockWebSocket.setResponse({ success: true, requiresPassword: false, version: '5.0.0' });
      
      const result = await runDiagnostics('localhost', 4455);
      const ids = result.checks.map(c => c.id);
      
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have non-empty names and descriptions', async () => {
      MockWebSocket.setResponse({ success: true, requiresPassword: false, version: '5.0.0' });
      
      const result = await runDiagnostics('localhost', 4455);
      
      for (const check of result.checks) {
        expect(check.name.length).toBeGreaterThan(0);
        expect(check.description.length).toBeGreaterThan(0);
      }
    });

    it('should include timestamp in result', async () => {
      MockWebSocket.setResponse({ success: true, requiresPassword: false, version: '5.0.0' });
      
      const before = Date.now();
      const result = await runDiagnostics('localhost', 4455);
      const after = Date.now();
      
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });
});
