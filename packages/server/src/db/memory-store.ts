import { createHash } from 'node:crypto';
import type { VaultStore } from '@keygate/core';
import { EncryptionService } from '@keygate/core';
import type {
  Connection,
  ScopedToken,
  AuditEntry,
  Provider,
  ConnectionStatus,
  TokenScope,
} from '@keygate/core';

/**
 * In-memory implementation of VaultStore for development and demos.
 * No external dependencies required.
 */
export class MemoryVaultStore implements VaultStore {
  private connections = new Map<string, Connection>();
  private tokens = new Map<string, ScopedToken>();
  private tokensByRef = new Map<string, string>();
  private auditLog: AuditEntry[] = [];
  private users = new Map<string, any>();
  private apiKeys = new Map<string, any>();
  private teams = new Map<string, any>();
  private encryption: EncryptionService;

  constructor(encryptionKey: string) {
    this.encryption = new EncryptionService(encryptionKey);
  }

  // === User management ===

  async findUserByEmail(email: string): Promise<any | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async createUser(user: any): Promise<void> {
    this.users.set(user.id, user);
  }

  async createTeam(team: any): Promise<void> {
    this.teams.set(team.id, team);
  }

  async findApiKeyByHash(keyHash: string): Promise<any | null> {
    for (const key of this.apiKeys.values()) {
      if (key.keyHash === keyHash) return key;
    }
    return null;
  }

  async createApiKey(key: any): Promise<void> {
    this.apiKeys.set(key.id, key);
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    const key = this.apiKeys.get(id);
    if (key) key.lastUsedAt = new Date();
  }

  // === VaultStore interface ===

  async getConnection(id: string): Promise<Connection | null> {
    return this.connections.get(id) ?? null;
  }

  async getConnectionsByUser(userId: string): Promise<Connection[]> {
    const result: Connection[] = [];
    for (const conn of this.connections.values()) {
      if (conn.userId === userId) result.push(conn);
    }
    return result.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async createConnection(
    connection: Omit<Connection, 'createdAt' | 'updatedAt'>,
  ): Promise<Connection> {
    const now = new Date();
    const full: Connection = {
      ...connection,
      createdAt: now,
      updatedAt: now,
    };
    this.connections.set(connection.id, full);
    return full;
  }

  async updateConnectionStatus(
    id: string,
    status: ConnectionStatus,
  ): Promise<void> {
    const conn = this.connections.get(id);
    if (conn) {
      conn.status = status;
      conn.updatedAt = new Date();
    }
  }

  async updateConnectionCredentials(
    id: string,
    encryptedCredentials: Buffer,
    scopes: string[],
  ): Promise<void> {
    const conn = this.connections.get(id);
    if (conn) {
      conn.encryptedCredentials = encryptedCredentials;
      conn.scopes = scopes;
      conn.status = 'active';
      conn.updatedAt = new Date();
    }
  }

  async deleteConnection(id: string): Promise<void> {
    const conn = this.connections.get(id);
    if (conn) {
      conn.status = 'revoked';
      conn.updatedAt = new Date();
    }
  }

  async createToken(token: ScopedToken): Promise<void> {
    this.tokens.set(token.id, { ...token });
    this.tokensByRef.set(token.reference, token.id);
  }

  async getToken(id: string): Promise<ScopedToken | null> {
    return this.tokens.get(id) ?? null;
  }

  async getTokenByReference(reference: string): Promise<ScopedToken | null> {
    const id = this.tokensByRef.get(reference);
    if (!id) return null;
    return this.tokens.get(id) ?? null;
  }

  async listTokensByConnection(connectionId: string): Promise<ScopedToken[]> {
    const now = new Date();
    const result: ScopedToken[] = [];
    for (const token of this.tokens.values()) {
      if (
        token.connectionId === connectionId &&
        !token.revokedAt &&
        token.expiresAt > now
      ) {
        result.push(token);
      }
    }
    return result.sort(
      (a, b) => b.issuedAt.getTime() - a.issuedAt.getTime(),
    );
  }

  async revokeToken(id: string): Promise<void> {
    const token = this.tokens.get(id);
    if (token) token.revokedAt = new Date();
  }

  async revokeConnectionTokens(connectionId: string): Promise<void> {
    for (const token of this.tokens.values()) {
      if (token.connectionId === connectionId && !token.revokedAt) {
        token.revokedAt = new Date();
      }
    }
  }

  async incrementTokenUsage(id: string): Promise<number> {
    const token = this.tokens.get(id);
    if (token) {
      token.usageCount++;
      return token.usageCount;
    }
    return 0;
  }

  async appendAuditLog(entry: AuditEntry): Promise<void> {
    this.auditLog.push(entry);
  }

  async queryAuditLog(
    userId: string,
    filters: {
      connectionId?: string;
      agentId?: string;
      action?: string;
      from?: string;
      to?: string;
      limit: number;
      offset: number;
    },
  ): Promise<{ entries: AuditEntry[]; total: number }> {
    const userConnIds = new Set<string>();
    for (const conn of this.connections.values()) {
      if (conn.userId === userId) userConnIds.add(conn.id);
    }

    let entries = this.auditLog.filter((e) => userConnIds.has(e.connectionId));

    if (filters.connectionId)
      entries = entries.filter((e) => e.connectionId === filters.connectionId);
    if (filters.agentId)
      entries = entries.filter((e) => e.agentId === filters.agentId);
    if (filters.action)
      entries = entries.filter((e) => e.action === filters.action);
    if (filters.from)
      entries = entries.filter(
        (e) => e.timestamp >= new Date(filters.from!),
      );
    if (filters.to)
      entries = entries.filter((e) => e.timestamp <= new Date(filters.to!));

    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const total = entries.length;
    entries = entries.slice(filters.offset, filters.offset + filters.limit);

    return { entries, total };
  }

  async getAuditSummary(userId: string): Promise<Record<string, number>> {
    const userConnIds = new Set<string>();
    for (const conn of this.connections.values()) {
      if (conn.userId === userId) userConnIds.add(conn.id);
    }

    const entries = this.auditLog.filter((e) => userConnIds.has(e.connectionId));
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const recent = entries.filter(
      (e) => now - e.timestamp.getTime() < day,
    );

    let activeConnections = 0;
    for (const conn of this.connections.values()) {
      if (conn.userId === userId && conn.status === 'active')
        activeConnections++;
    }

    return {
      totalRequests: entries.length,
      uniqueAgents: new Set(entries.map((e) => e.agentId)).size,
      activeConnections,
      tokensIssued: entries.filter((e) => e.action === 'token.issued').length,
      tokensRevoked: entries.filter((e) => e.action === 'token.revoked').length,
      last24hRequests: recent.length,
      last24hAgents: new Set(recent.map((e) => e.agentId)).size,
    };
  }
}
