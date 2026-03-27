import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine } from '../policy.js';
import type { Policy, PolicyEvalContext } from '../policy.js';

function makeContext(overrides: Partial<PolicyEvalContext> = {}): PolicyEvalContext {
  return {
    agentId: 'agent_1',
    provider: 'github',
    scopes: [{ resource: 'repos', actions: ['read'] }],
    ttl: 3600,
    timestamp: new Date('2026-03-25T14:00:00Z'), // Tuesday 2pm
    ...overrides,
  };
}

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: 'pol_1',
    name: 'Test Policy',
    description: '',
    enabled: true,
    priority: 100,
    conditions: [],
    effect: 'deny',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine();
  });

  describe('evaluate', () => {
    it('allows when no policies exist', () => {
      const result = engine.evaluate(makeContext());
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('denies when a deny policy matches', () => {
      engine.addPolicy(makePolicy({
        conditions: [{ type: 'scope_action', actions: ['write'] }],
        effect: 'deny',
      }));
      const result = engine.evaluate(makeContext({
        scopes: [{ resource: 'repos', actions: ['write'] }],
      }));
      expect(result.allowed).toBe(false);
      expect(result.deniedBy).toBe('pol_1');
    });

    it('allows when deny policy does not match', () => {
      engine.addPolicy(makePolicy({
        conditions: [{ type: 'scope_action', actions: ['write'] }],
        effect: 'deny',
      }));
      const result = engine.evaluate(makeContext({
        scopes: [{ resource: 'repos', actions: ['read'] }],
      }));
      expect(result.allowed).toBe(true);
    });

    it('requires approval when require_approval policy matches', () => {
      engine.addPolicy(makePolicy({
        effect: 'require_approval',
        conditions: [{ type: 'provider', providers: ['slack'] }],
      }));
      const result = engine.evaluate(makeContext({ provider: 'slack' }));
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(true);
    });

    it('deny takes precedence over require_approval', () => {
      engine.addPolicy(makePolicy({
        id: 'pol_deny',
        priority: 1,
        effect: 'deny',
        conditions: [{ type: 'scope_action', actions: ['delete'] }],
      }));
      engine.addPolicy(makePolicy({
        id: 'pol_approval',
        priority: 2,
        effect: 'require_approval',
        conditions: [{ type: 'scope_action', actions: ['delete'] }],
      }));
      const result = engine.evaluate(makeContext({
        scopes: [{ resource: 'data', actions: ['delete'] }],
      }));
      expect(result.allowed).toBe(false);
    });
  });

  describe('condition matching', () => {
    it('matches agent condition', () => {
      engine.addPolicy(makePolicy({
        conditions: [{ type: 'agent', agentIds: ['bad-bot'] }],
      }));
      expect(engine.evaluate(makeContext({ agentId: 'bad-bot' })).allowed).toBe(false);
      expect(engine.evaluate(makeContext({ agentId: 'good-bot' })).allowed).toBe(true);
    });

    it('matches provider condition', () => {
      engine.addPolicy(makePolicy({
        conditions: [{ type: 'provider', providers: ['stripe'] }],
      }));
      expect(engine.evaluate(makeContext({ provider: 'stripe' })).allowed).toBe(false);
      expect(engine.evaluate(makeContext({ provider: 'github' })).allowed).toBe(true);
    });

    it('matches max_ttl condition', () => {
      engine.addPolicy(makePolicy({
        conditions: [{ type: 'max_ttl', maxSeconds: 1800 }],
      }));
      expect(engine.evaluate(makeContext({ ttl: 3600 })).allowed).toBe(false);
      expect(engine.evaluate(makeContext({ ttl: 900 })).allowed).toBe(true);
    });

    it('matches resource condition', () => {
      engine.addPolicy(makePolicy({
        conditions: [{ type: 'resource', resources: ['billing'] }],
      }));
      expect(engine.evaluate(makeContext({
        scopes: [{ resource: 'billing', actions: ['read'] }],
      })).allowed).toBe(false);
      expect(engine.evaluate(makeContext({
        scopes: [{ resource: 'repos', actions: ['read'] }],
      })).allowed).toBe(true);
    });

    it('requires all conditions to match', () => {
      engine.addPolicy(makePolicy({
        conditions: [
          { type: 'agent', agentIds: ['bad-bot'] },
          { type: 'provider', providers: ['stripe'] },
        ],
      }));
      // Only agent matches — should allow
      expect(engine.evaluate(makeContext({ agentId: 'bad-bot', provider: 'github' })).allowed).toBe(true);
      // Both match — should deny
      expect(engine.evaluate(makeContext({ agentId: 'bad-bot', provider: 'stripe' })).allowed).toBe(false);
    });
  });

  describe('policy management', () => {
    it('adds and lists policies', () => {
      engine.addPolicy(makePolicy({ id: 'p1' }));
      engine.addPolicy(makePolicy({ id: 'p2' }));
      expect(engine.getPolicies()).toHaveLength(2);
    });

    it('removes a policy', () => {
      engine.addPolicy(makePolicy({ id: 'p1' }));
      engine.removePolicy('p1');
      expect(engine.getPolicies()).toHaveLength(0);
    });

    it('ignores disabled policies', () => {
      engine.addPolicy(makePolicy({ enabled: false, conditions: [{ type: 'agent', agentIds: ['x'] }] }));
      expect(engine.evaluate(makeContext({ agentId: 'x' })).allowed).toBe(true);
    });
  });
});
