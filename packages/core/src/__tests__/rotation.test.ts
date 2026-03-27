import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenRotationManager } from '../rotation.js';
import type { TokenIssuer } from '../rotation.js';

function mockIssuer(): TokenIssuer {
  let counter = 0;
  return {
    async issueToken(_connId, _agentId, _scopes, ttl) {
      counter++;
      return {
        tokenId: `tok_${counter}`,
        reference: `ref_${counter}`,
        expiresAt: new Date(Date.now() + ttl * 1000),
      };
    },
    async resolveToken(reference) {
      return { accessToken: `access_${reference}` };
    },
    async revokeToken(_tokenId) {},
  };
}

describe('TokenRotationManager', () => {
  let manager: TokenRotationManager;
  let issuer: TokenIssuer;

  beforeEach(() => {
    issuer = mockIssuer();
    manager = new TokenRotationManager(issuer);
  });

  afterEach(() => {
    manager.shutdown();
  });

  describe('create', () => {
    it('creates a rotating token with initial credentials', async () => {
      const token = await manager.create('rt_1', 'conn_1', 'agent_1', [
        { resource: 'repos', actions: ['read'] },
      ]);

      expect(token.id).toBe('rt_1');
      expect(token.status).toBe('active');
      expect(token.currentTokenId).toBe('tok_1');
      expect(token.currentAccessToken).toMatch(/^access_/);
      expect(token.rotationCount).toBe(0);
    });

    it('retrieves the access token', async () => {
      await manager.create('rt_1', 'conn_1', 'agent_1', [
        { resource: 'repos', actions: ['read'] },
      ]);

      const token = manager.getAccessToken('rt_1');
      expect(token).toMatch(/^access_/);
    });

    it('returns null for unknown token', () => {
      expect(manager.getAccessToken('nonexistent')).toBeNull();
    });
  });

  describe('rotate', () => {
    it('rotates to a new token', async () => {
      await manager.create('rt_1', 'conn_1', 'agent_1', [
        { resource: 'repos', actions: ['read'] },
      ]);

      const before = manager.get('rt_1')!.currentTokenId;
      await manager.rotate('rt_1');
      const after = manager.get('rt_1')!;

      expect(after.currentTokenId).not.toBe(before);
      expect(after.rotationCount).toBe(1);
      expect(after.lastRotatedAt).toBeInstanceOf(Date);
    });

    it('emits rotation event', async () => {
      const events: any[] = [];
      manager.setEventHandler((e) => events.push(e));

      await manager.create('rt_1', 'conn_1', 'agent_1', [
        { resource: 'repos', actions: ['read'] },
      ]);
      await manager.rotate('rt_1');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('rotated');
      expect(events[0].previousTokenId).toBe('tok_1');
      expect(events[0].newTokenId).toBe('tok_2');
    });

    it('revokes previous token when autoRevokePrevious is true', async () => {
      const revoked: string[] = [];
      issuer.revokeToken = async (id) => { revoked.push(id); };

      await manager.create('rt_1', 'conn_1', 'agent_1', [
        { resource: 'repos', actions: ['read'] },
      ], { autoRevokePrevious: true });

      await manager.rotate('rt_1');
      expect(revoked).toContain('tok_1');
    });

    it('returns null for inactive token', async () => {
      await manager.create('rt_1', 'conn_1', 'agent_1', [
        { resource: 'repos', actions: ['read'] },
      ]);
      manager.pause('rt_1');
      const result = await manager.rotate('rt_1');
      expect(result).toBeNull();
    });

    it('emits failed event on issuer error', async () => {
      const events: any[] = [];
      manager.setEventHandler((e) => events.push(e));

      await manager.create('rt_1', 'conn_1', 'agent_1', [
        { resource: 'repos', actions: ['read'] },
      ]);

      // Make issuer fail for the rotation
      issuer.issueToken = async () => { throw new Error('Service down'); };
      await manager.rotate('rt_1');

      expect(events.some((e) => e.type === 'failed')).toBe(true);
    });
  });

  describe('lifecycle', () => {
    it('pauses and resumes', async () => {
      await manager.create('rt_1', 'conn_1', 'agent_1', [
        { resource: 'repos', actions: ['read'] },
      ]);

      manager.pause('rt_1');
      expect(manager.get('rt_1')!.status).toBe('paused');
      expect(manager.getAccessToken('rt_1')).toBeNull();

      manager.resume('rt_1');
      expect(manager.get('rt_1')!.status).toBe('active');
      expect(manager.getAccessToken('rt_1')).not.toBeNull();
    });

    it('revokes and cleans up', async () => {
      const events: any[] = [];
      manager.setEventHandler((e) => events.push(e));

      await manager.create('rt_1', 'conn_1', 'agent_1', [
        { resource: 'repos', actions: ['read'] },
      ]);
      await manager.revoke('rt_1');

      expect(manager.get('rt_1')!.status).toBe('revoked');
      expect(manager.getAccessToken('rt_1')).toBeNull();
      expect(events.some((e) => e.type === 'revoked')).toBe(true);
    });

    it('lists active tokens', async () => {
      await manager.create('rt_1', 'conn_1', 'agent_1', [{ resource: 'r', actions: ['read'] }]);
      await manager.create('rt_2', 'conn_1', 'agent_1', [{ resource: 'r', actions: ['read'] }]);
      manager.pause('rt_2');

      expect(manager.getActive()).toHaveLength(1);
      expect(manager.list()).toHaveLength(2);
    });
  });
});

function afterEach(fn: () => void) {
  // vitest handles this via the import
  return (globalThis as any).afterEach?.(fn);
}
