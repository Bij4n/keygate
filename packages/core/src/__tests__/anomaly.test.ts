import { describe, it, expect, beforeEach } from 'vitest';
import { AnomalyEngine } from '../anomaly.js';
import type { AuditEntry } from '../types.js';

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'aud_1',
    timestamp: new Date(),
    connectionId: 'conn_1',
    tokenId: 'tok_1',
    agentId: 'agent_1',
    action: 'token.issued',
    resource: 'repos',
    provider: 'github',
    metadata: {},
    success: true,
    ...overrides,
  };
}

describe('AnomalyEngine', () => {
  let engine: AnomalyEngine;

  beforeEach(() => {
    engine = new AnomalyEngine({
      velocityThreshold: 3,
      velocityWindow: 60,
      resolveThreshold: 5,
      businessHoursStart: 9,
      businessHoursEnd: 18,
      businessDays: [1, 2, 3, 4, 5],
    });
  });

  describe('velocity spike detection', () => {
    it('does not trigger below threshold', () => {
      // First two should not trigger velocity (threshold is 3)
      const d1 = engine.analyze(entry());
      const d2 = engine.analyze(entry());
      const spike1 = d1.find((d) => d.ruleId === 'velocity_spike');
      const spike2 = d2.find((d) => d.ruleId === 'velocity_spike');
      expect(spike1).toBeUndefined();
      expect(spike2).toBeUndefined();
    });

    it('triggers when threshold exceeded', () => {
      engine.analyze(entry());
      engine.analyze(entry());
      engine.analyze(entry());
      const detections = engine.analyze(entry());
      const spike = detections.find((d) => d.ruleId === 'velocity_spike');
      expect(spike).toBeDefined();
      expect(spike!.severity).toBe('high');
    });

    it('does not trigger for non-issue actions', () => {
      for (let i = 0; i < 10; i++) {
        const d = engine.analyze(entry({ action: 'token.resolved' }));
        const spike = d.find((x) => x.ruleId === 'velocity_spike');
        expect(spike).toBeUndefined();
      }
    });
  });

  describe('unknown agent detection', () => {
    it('does not trigger when no agents registered', () => {
      const detections = engine.analyze(entry({ agentId: 'random-bot' }));
      const unknown = detections.find((d) => d.ruleId === 'unknown_agent');
      expect(unknown).toBeUndefined();
    });

    it('triggers for unregistered agent when registry has entries', () => {
      engine.registerAgent('agent_1');
      const detections = engine.analyze(entry({ agentId: 'unknown-bot' }));
      const unknown = detections.find((d) => d.ruleId === 'unknown_agent');
      expect(unknown).toBeDefined();
      expect(unknown!.message).toContain('unknown-bot');
    });

    it('does not trigger for registered agent', () => {
      engine.registerAgent('agent_1');
      const detections = engine.analyze(entry({ agentId: 'agent_1' }));
      const unknown = detections.find((d) => d.ruleId === 'unknown_agent');
      expect(unknown).toBeUndefined();
    });

    it('does not trigger for system agent', () => {
      engine.registerAgent('agent_1');
      const detections = engine.analyze(entry({ agentId: 'system' }));
      const unknown = detections.find((d) => d.ruleId === 'unknown_agent');
      expect(unknown).toBeUndefined();
    });

    it('stops triggering after agent is registered', () => {
      engine.registerAgent('agent_1');
      const d1 = engine.analyze(entry({ agentId: 'new-bot' }));
      expect(d1.find((d) => d.ruleId === 'unknown_agent')).toBeDefined();

      engine.registerAgent('new-bot');
      const d2 = engine.analyze(entry({ agentId: 'new-bot' }));
      expect(d2.find((d) => d.ruleId === 'unknown_agent')).toBeUndefined();
    });
  });

  describe('bulk data access detection', () => {
    it('triggers on excessive resolves', () => {
      let detected = false;
      for (let i = 0; i < 8; i++) {
        const d = engine.analyze(entry({ action: 'token.resolved' }));
        if (d.find((x) => x.ruleId === 'bulk_data_access')) detected = true;
      }
      expect(detected).toBe(true);
    });
  });

  describe('rule management', () => {
    it('lists all rules', () => {
      const rules = engine.getRules();
      expect(rules.length).toBeGreaterThanOrEqual(5);
    });

    it('can disable a rule', () => {
      engine.registerAgent('a');
      engine.updateRule('unknown_agent', false);
      const d = engine.analyze(entry({ agentId: 'stranger' }));
      expect(d.find((x) => x.ruleId === 'unknown_agent')).toBeUndefined();
    });

    it('can re-enable a rule', () => {
      engine.registerAgent('a');
      engine.updateRule('unknown_agent', false);
      engine.updateRule('unknown_agent', true);
      const d = engine.analyze(entry({ agentId: 'stranger' }));
      expect(d.find((x) => x.ruleId === 'unknown_agent')).toBeDefined();
    });
  });
});
