import { describe, it, expect, beforeEach } from 'vitest';
import { McpRegistry } from '../registry.js';
import type { McpServerEntry } from '../registry.js';

function makeServer(overrides: Partial<McpServerEntry> = {}): McpServerEntry {
  return {
    id: 'mcp_1',
    name: 'Test Server',
    description: 'A test MCP server',
    packageName: '@test/server',
    version: '1.0.0',
    author: 'Test',
    verified: false,
    reputationScore: 0,
    signals: {
      codeAuditScore: 80,
      communityTrustScore: 70,
      behavioralScore: 75,
      provenanceScore: 60,
      securityScore: 90,
    },
    tools: [],
    credentialAccess: {
      requestsOAuth: false,
      requestsApiKeys: false,
      scopesRequested: [],
      dataExfiltrationRisk: 'low',
      crossServerAccess: false,
    },
    communityRatings: { totalRatings: 0, averageScore: 0, trustVotes: 0, flagCount: 0 },
    vulnerabilities: [],
    lastScannedAt: new Date(),
    registeredAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('McpRegistry', () => {
  let registry: McpRegistry;

  beforeEach(() => {
    registry = new McpRegistry();
  });

  describe('registration', () => {
    it('registers a server and calculates score', () => {
      const server = registry.register(makeServer());
      expect(server.reputationScore).toBeGreaterThan(0);
      expect(registry.get('mcp_1')).toBeDefined();
    });

    it('calculates weighted score correctly', () => {
      const server = registry.register(makeServer({
        signals: {
          codeAuditScore: 100,
          communityTrustScore: 100,
          behavioralScore: 100,
          provenanceScore: 100,
          securityScore: 100,
        },
      }));
      expect(server.reputationScore).toBe(100);
    });

    it('finds by package name', () => {
      registry.register(makeServer({ packageName: '@my/server' }));
      expect(registry.getByPackage('@my/server')).toBeDefined();
      expect(registry.getByPackage('@other/server')).toBeUndefined();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      registry.register(makeServer({ id: 's1', name: 'GitHub Server', reputationScore: 90, verified: true }));
      registry.register(makeServer({ id: 's2', name: 'Slack Server', reputationScore: 70, verified: true }));
      registry.register(makeServer({ id: 's3', name: 'Sketchy Tool', verified: false, signals: { codeAuditScore: 10, communityTrustScore: 10, behavioralScore: 10, provenanceScore: 10, securityScore: 10 } }));
    });

    it('searches by query', () => {
      const result = registry.search({ query: 'github' });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].name).toBe('GitHub Server');
    });

    it('filters by minimum score', () => {
      const result = registry.search({ minScore: 50 });
      expect(result.entries).toHaveLength(2);
    });

    it('filters by verified status', () => {
      const result = registry.search({ verified: true });
      expect(result.entries).toHaveLength(2);
    });

    it('sorts by reputation by default', () => {
      const result = registry.search();
      expect(result.entries[0].name).toBe('GitHub Server');
    });

    it('paginates results', () => {
      const result = registry.search({ limit: 1, offset: 1 });
      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(3);
    });
  });

  describe('ratings', () => {
    it('adds a rating and updates community score', () => {
      registry.register(makeServer());
      registry.addRating('mcp_1', 5, true);
      const server = registry.get('mcp_1')!;
      expect(server.communityRatings.totalRatings).toBe(1);
      expect(server.communityRatings.averageScore).toBe(5);
      expect(server.communityRatings.trustVotes).toBe(1);
    });

    it('averages multiple ratings', () => {
      registry.register(makeServer());
      registry.addRating('mcp_1', 5, false);
      registry.addRating('mcp_1', 3, false);
      const server = registry.get('mcp_1')!;
      expect(server.communityRatings.averageScore).toBe(4);
    });
  });

  describe('flagging', () => {
    it('increments flag count', () => {
      registry.register(makeServer());
      registry.flag('mcp_1');
      registry.flag('mcp_1');
      expect(registry.get('mcp_1')!.communityRatings.flagCount).toBe(2);
    });

    it('decreases trust score after 5 flags', () => {
      registry.register(makeServer());
      const scoreBefore = registry.get('mcp_1')!.reputationScore;
      for (let i = 0; i < 6; i++) registry.flag('mcp_1');
      expect(registry.get('mcp_1')!.reputationScore).toBeLessThan(scoreBefore);
    });
  });

  describe('vulnerabilities', () => {
    it('adds a vulnerability and lowers security score', () => {
      registry.register(makeServer());
      const scoreBefore = registry.get('mcp_1')!.reputationScore;
      registry.reportVulnerability('mcp_1', {
        id: 'v1',
        severity: 'critical',
        title: 'RCE',
        description: 'Remote code execution',
        reportedAt: new Date(),
      });
      expect(registry.get('mcp_1')!.vulnerabilities).toHaveLength(1);
      expect(registry.get('mcp_1')!.reputationScore).toBeLessThan(scoreBefore);
    });
  });

  describe('isAllowed', () => {
    it('blocks unknown servers', () => {
      const result = registry.isAllowed('unknown');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('blocks servers below threshold', () => {
      registry.register(makeServer({ signals: { codeAuditScore: 10, communityTrustScore: 10, behavioralScore: 10, provenanceScore: 10, securityScore: 10 } }));
      const result = registry.isAllowed('mcp_1', 50);
      expect(result.allowed).toBe(false);
    });

    it('blocks servers with critical vulnerabilities', () => {
      registry.register(makeServer());
      registry.reportVulnerability('mcp_1', {
        id: 'v1', severity: 'critical', title: 'Bad', description: 'Very bad', reportedAt: new Date(),
      });
      const result = registry.isAllowed('mcp_1', 0);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('critical');
    });

    it('allows healthy servers above threshold', () => {
      registry.register(makeServer());
      const result = registry.isAllowed('mcp_1', 50);
      expect(result.allowed).toBe(true);
    });
  });

  describe('stats', () => {
    it('returns aggregate stats', () => {
      registry.register(makeServer({ id: 's1', verified: true }));
      registry.register(makeServer({ id: 's2', verified: false }));
      const stats = registry.getStats();
      expect(stats.total).toBe(2);
      expect(stats.verified).toBe(1);
      expect(stats.averageScore).toBeGreaterThan(0);
    });
  });
});
