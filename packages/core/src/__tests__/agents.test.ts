import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry, DEFAULT_PERMISSION_BOUNDARY } from '../agents.js';
import type { RegisteredAgent } from '../agents.js';

function makeAgent(overrides: Partial<RegisteredAgent> = {}): RegisteredAgent {
  return {
    id: 'agent_1',
    name: 'test-agent',
    description: 'A test agent',
    ownerId: 'usr_1',
    status: 'active',
    trustScore: 50,
    permissionBoundary: { ...DEFAULT_PERMISSION_BOUNDARY },
    stats: {
      totalTokensIssued: 0,
      totalTokensRevoked: 0,
      totalRequests: 0,
      failedRequests: 0,
      anomaliesDetected: 0,
    },
    registeredAt: new Date(),
    ...overrides,
  };
}

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('registration', () => {
    it('registers and retrieves an agent', () => {
      const agent = registry.register(makeAgent());
      expect(registry.get('agent_1')).toEqual(agent);
    });

    it('lists agents by owner', () => {
      registry.register(makeAgent({ id: 'a1', ownerId: 'usr_1' }));
      registry.register(makeAgent({ id: 'a2', ownerId: 'usr_1' }));
      registry.register(makeAgent({ id: 'a3', ownerId: 'usr_2' }));
      expect(registry.getByOwner('usr_1')).toHaveLength(2);
      expect(registry.getByOwner('usr_2')).toHaveLength(1);
    });
  });

  describe('status management', () => {
    it('suspends an agent', () => {
      registry.register(makeAgent());
      registry.suspend('agent_1');
      expect(registry.get('agent_1')!.status).toBe('suspended');
    });

    it('activates a suspended agent', () => {
      registry.register(makeAgent({ status: 'suspended' }));
      registry.activate('agent_1');
      expect(registry.get('agent_1')!.status).toBe('active');
    });

    it('revokes an agent', () => {
      registry.register(makeAgent());
      registry.revoke('agent_1');
      expect(registry.get('agent_1')!.status).toBe('revoked');
    });
  });

  describe('trust scoring', () => {
    it('increases trust on successful activity', () => {
      registry.register(makeAgent({ trustScore: 50 }));
      registry.recordActivity('agent_1', 'token.issued', true);
      expect(registry.get('agent_1')!.trustScore).toBeGreaterThan(50);
    });

    it('decreases trust on failed activity', () => {
      registry.register(makeAgent({ trustScore: 50 }));
      registry.recordActivity('agent_1', 'token.issued', false);
      expect(registry.get('agent_1')!.trustScore).toBeLessThan(50);
    });

    it('decreases trust on anomaly', () => {
      registry.register(makeAgent({ trustScore: 50 }));
      registry.recordAnomaly('agent_1');
      expect(registry.get('agent_1')!.trustScore).toBe(40);
      expect(registry.get('agent_1')!.stats.anomaliesDetected).toBe(1);
    });

    it('auto-suspends on critical trust loss', () => {
      registry.register(makeAgent({ trustScore: 25 }));
      registry.recordAnomaly('agent_1');
      expect(registry.get('agent_1')!.trustScore).toBe(15);
      expect(registry.get('agent_1')!.status).toBe('suspended');
    });

    it('clamps trust score to 0-100 range', () => {
      registry.register(makeAgent({ trustScore: 5 }));
      registry.recordAnomaly('agent_1');
      expect(registry.get('agent_1')!.trustScore).toBeGreaterThanOrEqual(0);

      registry.register(makeAgent({ id: 'a2', trustScore: 99.5 }));
      for (let i = 0; i < 20; i++) registry.recordActivity('a2', 'ok', true);
      expect(registry.get('a2')!.trustScore).toBeLessThanOrEqual(100);
    });
  });

  describe('permission boundaries', () => {
    it('allows when no agents registered (backwards compatible)', () => {
      const result = registry.isAllowed('any', 'github', ['read']);
      expect(result.allowed).toBe(true);
    });

    it('denies unregistered agent when registry has entries', () => {
      registry.register(makeAgent());
      const result = registry.isAllowed('unknown', 'github', ['read']);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not registered');
    });

    it('denies suspended agent', () => {
      registry.register(makeAgent({ status: 'suspended' }));
      const result = registry.isAllowed('agent_1', 'github', ['read']);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('suspended');
    });

    it('denies provider outside boundary', () => {
      registry.register(makeAgent({
        permissionBoundary: { ...DEFAULT_PERMISSION_BOUNDARY, allowedProviders: ['github'] },
      }));
      const result = registry.isAllowed('agent_1', 'stripe', ['read']);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('stripe');
    });

    it('allows provider within boundary', () => {
      registry.register(makeAgent({
        permissionBoundary: { ...DEFAULT_PERMISSION_BOUNDARY, allowedProviders: ['github'] },
      }));
      expect(registry.isAllowed('agent_1', 'github', ['read']).allowed).toBe(true);
    });

    it('denies action outside boundary', () => {
      registry.register(makeAgent({
        permissionBoundary: { ...DEFAULT_PERMISSION_BOUNDARY, allowedActions: ['read'] },
      }));
      const result = registry.isAllowed('agent_1', 'github', ['write']);
      expect(result.allowed).toBe(false);
    });

    it('allows all providers when boundary is empty', () => {
      registry.register(makeAgent({
        permissionBoundary: { ...DEFAULT_PERMISSION_BOUNDARY, allowedProviders: [] },
      }));
      expect(registry.isAllowed('agent_1', 'anything', ['read']).allowed).toBe(true);
    });
  });

  describe('activity tracking', () => {
    it('increments request count', () => {
      registry.register(makeAgent());
      registry.recordActivity('agent_1', 'token.issued', true);
      registry.recordActivity('agent_1', 'token.resolved', true);
      expect(registry.get('agent_1')!.stats.totalRequests).toBe(2);
    });

    it('tracks token issuance', () => {
      registry.register(makeAgent());
      registry.recordActivity('agent_1', 'token.issued', true);
      expect(registry.get('agent_1')!.stats.totalTokensIssued).toBe(1);
    });

    it('tracks failures', () => {
      registry.register(makeAgent());
      registry.recordActivity('agent_1', 'token.issued', false);
      expect(registry.get('agent_1')!.stats.failedRequests).toBe(1);
    });

    it('updates lastActiveAt', () => {
      registry.register(makeAgent());
      registry.recordActivity('agent_1', 'x', true);
      expect(registry.get('agent_1')!.lastActiveAt).toBeInstanceOf(Date);
    });
  });
});
