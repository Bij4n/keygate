import { describe, it, expect, beforeEach } from 'vitest';
import { Vault, VaultError } from '../vault.js';
import type { VaultStore } from '../vault.js';
import type { Connection, ScopedToken, AuditEntry, VaultConfig } from '../types.js';

class MockVaultStore implements VaultStore {
  connections = new Map<string, Connection>();
  tokens = new Map<string, ScopedToken>();
  auditLog: AuditEntry[] = [];

  async getConnection(id: string) {
    return this.connections.get(id) ?? null;
  }

  async createToken(token: ScopedToken) {
    this.tokens.set(token.id, { ...token });
    this.tokens.set(`ref:${token.reference}`, { ...token });
  }

  async getToken(id: string) {
    return this.tokens.get(id) ?? null;
  }

  async getTokenByReference(reference: string) {
    return this.tokens.get(`ref:${reference}`) ?? null;
  }

  async revokeToken(id: string) {
    const token = this.tokens.get(id);
    if (token) {
      token.revokedAt = new Date();
      const refToken = this.tokens.get(`ref:${token.reference}`);
      if (refToken) refToken.revokedAt = new Date();
    }
  }

  async revokeConnectionTokens(connectionId: string) {
    for (const token of this.tokens.values()) {
      if (token.connectionId === connectionId && !token.revokedAt) {
        token.revokedAt = new Date();
      }
    }
  }

  async incrementTokenUsage(id: string) {
    const token = this.tokens.get(id);
    if (token) {
      token.usageCount++;
      return token.usageCount;
    }
    return 0;
  }

  async appendAuditLog(entry: AuditEntry) {
    this.auditLog.push(entry);
  }
}

function createMockConnection(overrides: Partial<Connection> = {}): Connection {
  return {
    id: 'conn_test',
    userId: 'usr_test',
    provider: 'github',
    status: 'active',
    scopes: ['repo:read'],
    encryptedCredentials: Buffer.alloc(0),
    connectionKeyId: 'ck_test',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('Vault', () => {
  let store: MockVaultStore;
  let vault: Vault;
  const config: VaultConfig = {
    encryptionKey: 'test-key',
    tokenTTL: 3600,
    maxTokenTTL: 86400,
    auditRetention: 90,
  };

  beforeEach(() => {
    store = new MockVaultStore();
    vault = new Vault(store, config);
  });

  describe('issueToken', () => {
    it('issues a token for an active connection', async () => {
      store.connections.set('conn_test', createMockConnection());

      const result = await vault.issueToken({
        connectionId: 'conn_test',
        agentId: 'agent_1',
        scopes: [{ resource: 'repos', actions: ['read'] }],
      });

      expect(result.tokenId).toMatch(/^tok_/);
      expect(result.reference).toMatch(/^ref_/);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.scopes).toHaveLength(1);
    });

    it('throws for non-existent connection', async () => {
      await expect(
        vault.issueToken({
          connectionId: 'conn_missing',
          agentId: 'agent_1',
          scopes: [{ resource: 'repos', actions: ['read'] }],
        }),
      ).rejects.toThrow(VaultError);
    });

    it('throws for inactive connection', async () => {
      store.connections.set(
        'conn_test',
        createMockConnection({ status: 'revoked' }),
      );

      await expect(
        vault.issueToken({
          connectionId: 'conn_test',
          agentId: 'agent_1',
          scopes: [{ resource: 'repos', actions: ['read'] }],
        }),
      ).rejects.toThrow('is revoked');
    });

    it('respects maxTokenTTL', async () => {
      store.connections.set('conn_test', createMockConnection());

      const result = await vault.issueToken({
        connectionId: 'conn_test',
        agentId: 'agent_1',
        scopes: [{ resource: 'repos', actions: ['read'] }],
        ttl: 999999,
      });

      const ttl = (result.expiresAt.getTime() - Date.now()) / 1000;
      expect(ttl).toBeLessThanOrEqual(config.maxTokenTTL + 1);
    });

    it('creates audit log entry', async () => {
      store.connections.set('conn_test', createMockConnection());

      await vault.issueToken({
        connectionId: 'conn_test',
        agentId: 'agent_1',
        scopes: [{ resource: 'repos', actions: ['read'] }],
      });

      expect(store.auditLog).toHaveLength(1);
      expect(store.auditLog[0].action).toBe('token.issued');
    });
  });

  describe('resolveToken', () => {
    it('resolves a valid token', async () => {
      store.connections.set('conn_test', createMockConnection());
      const { reference } = await vault.issueToken({
        connectionId: 'conn_test',
        agentId: 'agent_1',
        scopes: [{ resource: 'repos', actions: ['read'] }],
      });

      const result = await vault.resolveToken(reference);
      expect(result.accessToken).toMatch(/^kg_/);
      expect(result.scopes).toHaveLength(1);
    });

    it('throws for expired token', async () => {
      store.connections.set('conn_test', createMockConnection());
      const { reference } = await vault.issueToken({
        connectionId: 'conn_test',
        agentId: 'agent_1',
        scopes: [{ resource: 'repos', actions: ['read'] }],
        ttl: 60,
      });

      // Manually expire the token
      for (const token of store.tokens.values()) {
        if (token.reference === reference) {
          token.expiresAt = new Date(Date.now() - 1000);
        }
      }

      await expect(vault.resolveToken(reference)).rejects.toThrow('expired');
    });

    it('throws for revoked token', async () => {
      store.connections.set('conn_test', createMockConnection());
      const { tokenId, reference } = await vault.issueToken({
        connectionId: 'conn_test',
        agentId: 'agent_1',
        scopes: [{ resource: 'repos', actions: ['read'] }],
      });

      await vault.revokeToken(tokenId);
      await expect(vault.resolveToken(reference)).rejects.toThrow('revoked');
    });

    it('enforces maxUsage limit', async () => {
      store.connections.set('conn_test', createMockConnection());
      const { reference } = await vault.issueToken({
        connectionId: 'conn_test',
        agentId: 'agent_1',
        scopes: [{ resource: 'repos', actions: ['read'] }],
        maxUsage: 2,
      });

      await vault.resolveToken(reference);
      await vault.resolveToken(reference);
      await expect(vault.resolveToken(reference)).rejects.toThrow('usage limit');
    });
  });

  describe('revokeToken', () => {
    it('revokes a token and logs audit entry', async () => {
      store.connections.set('conn_test', createMockConnection());
      const { tokenId } = await vault.issueToken({
        connectionId: 'conn_test',
        agentId: 'agent_1',
        scopes: [{ resource: 'repos', actions: ['read'] }],
      });

      await vault.revokeToken(tokenId);

      const token = await store.getToken(tokenId);
      expect(token?.revokedAt).toBeInstanceOf(Date);
      expect(store.auditLog.some((e) => e.action === 'token.revoked')).toBe(true);
    });

    it('throws for non-existent token', async () => {
      await expect(vault.revokeToken('tok_missing')).rejects.toThrow(
        VaultError,
      );
    });
  });

  describe('revokeAllTokens', () => {
    it('revokes all tokens for a connection', async () => {
      store.connections.set('conn_test', createMockConnection());

      await vault.issueToken({
        connectionId: 'conn_test',
        agentId: 'agent_1',
        scopes: [{ resource: 'repos', actions: ['read'] }],
      });
      await vault.issueToken({
        connectionId: 'conn_test',
        agentId: 'agent_2',
        scopes: [{ resource: 'repos', actions: ['read'] }],
      });

      await vault.revokeAllTokens('conn_test');

      for (const token of store.tokens.values()) {
        if (token.connectionId === 'conn_test') {
          expect(token.revokedAt).toBeInstanceOf(Date);
        }
      }
    });
  });
});
