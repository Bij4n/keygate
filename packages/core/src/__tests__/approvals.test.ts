import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalManager } from '../approvals.js';
import type { ApprovalRequest } from '../approvals.js';

function makeRequest(overrides: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    id: 'apr_1',
    agentId: 'agent_1',
    connectionId: 'conn_1',
    provider: 'github',
    scopes: [{ resource: 'repos', actions: ['write'] }],
    ttl: 3600,
    policyId: 'pol_1',
    status: 'pending',
    requestedAt: new Date(),
    expiresAt: new Date(Date.now() + 600_000),
    ...overrides,
  };
}

describe('ApprovalManager', () => {
  let manager: ApprovalManager;

  beforeEach(() => {
    manager = new ApprovalManager();
  });

  describe('request lifecycle', () => {
    it('creates and retrieves a request', () => {
      const req = manager.createRequest(makeRequest());
      expect(manager.getRequest('apr_1')).toEqual(req);
    });

    it('lists pending requests', () => {
      manager.createRequest(makeRequest({ id: 'a1' }));
      manager.createRequest(makeRequest({ id: 'a2' }));
      expect(manager.getPendingRequests()).toHaveLength(2);
    });

    it('excludes expired requests from pending', () => {
      manager.createRequest(makeRequest({
        id: 'expired',
        expiresAt: new Date(Date.now() - 1000),
      }));
      expect(manager.getPendingRequests()).toHaveLength(0);
    });
  });

  describe('decisions', () => {
    it('approves a request', () => {
      manager.createRequest(makeRequest());
      const result = manager.decide({
        requestId: 'apr_1',
        decision: 'approved',
        decidedBy: 'usr_1',
      });
      expect(result!.status).toBe('approved');
      expect(result!.decidedBy).toBe('usr_1');
      expect(result!.decidedAt).toBeInstanceOf(Date);
    });

    it('denies a request', () => {
      manager.createRequest(makeRequest());
      const result = manager.decide({
        requestId: 'apr_1',
        decision: 'denied',
        decidedBy: 'usr_1',
      });
      expect(result!.status).toBe('denied');
    });

    it('returns null for already-decided request', () => {
      manager.createRequest(makeRequest());
      manager.decide({ requestId: 'apr_1', decision: 'approved', decidedBy: 'usr_1' });
      const result = manager.decide({ requestId: 'apr_1', decision: 'denied', decidedBy: 'usr_2' });
      expect(result).toBeNull();
    });

    it('returns null for unknown request', () => {
      const result = manager.decide({ requestId: 'unknown', decision: 'approved', decidedBy: 'usr_1' });
      expect(result).toBeNull();
    });

    it('calls decision handler', () => {
      let called = false;
      manager.setDecisionHandler(() => { called = true; });
      manager.createRequest(makeRequest());
      manager.decide({ requestId: 'apr_1', decision: 'approved', decidedBy: 'usr_1' });
      expect(called).toBe(true);
    });
  });

  describe('stats', () => {
    it('counts by status', () => {
      manager.createRequest(makeRequest({ id: 'a1' }));
      manager.createRequest(makeRequest({ id: 'a2' }));
      manager.createRequest(makeRequest({ id: 'a3' }));
      manager.decide({ requestId: 'a1', decision: 'approved', decidedBy: 'u' });
      manager.decide({ requestId: 'a2', decision: 'denied', decidedBy: 'u' });

      const stats = manager.getStats();
      expect(stats.pending).toBe(1);
      expect(stats.approved).toBe(1);
      expect(stats.denied).toBe(1);
    });

    it('counts expired separately', () => {
      manager.createRequest(makeRequest({ id: 'a1', expiresAt: new Date(Date.now() - 1000) }));
      const stats = manager.getStats();
      expect(stats.expired).toBe(1);
      expect(stats.pending).toBe(0);
    });
  });
});
