import { createHash } from 'node:crypto';
import type { VaultStore } from '@keygate/core';
import type {
  Connection,
  ScopedToken,
  AuditEntry,
  Provider,
  ConnectionStatus,
  TokenScope,
} from '@keygate/core';
import { EncryptionService } from '@keygate/core';
import { query } from './pool.js';

export class PostgresVaultStore implements VaultStore {
  private encryption: EncryptionService;

  constructor(encryptionKey: string) {
    this.encryption = new EncryptionService(encryptionKey);
  }

  async getConnection(id: string): Promise<Connection | null> {
    const { rows } = await query(
      'SELECT * FROM connections WHERE id = $1',
      [id],
    );
    if (rows.length === 0) return null;
    return this.mapConnection(rows[0]);
  }

  async getConnectionsByUser(userId: string): Promise<Connection[]> {
    const { rows } = await query(
      'SELECT * FROM connections WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return rows.map(this.mapConnection);
  }

  async createConnection(connection: Omit<Connection, 'createdAt' | 'updatedAt'>): Promise<Connection> {
    const { rows } = await query(
      `INSERT INTO connections (id, user_id, team_id, provider, status, scopes, encrypted_credentials, connection_key_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        connection.id,
        connection.userId,
        connection.teamId ?? null,
        connection.provider,
        connection.status,
        connection.scopes,
        connection.encryptedCredentials,
        connection.connectionKeyId,
        JSON.stringify(connection.metadata),
      ],
    );
    return this.mapConnection(rows[0]);
  }

  async updateConnectionStatus(id: string, status: ConnectionStatus): Promise<void> {
    await query(
      'UPDATE connections SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id],
    );
  }

  async updateConnectionCredentials(
    id: string,
    encryptedCredentials: Buffer,
    scopes: string[],
  ): Promise<void> {
    await query(
      'UPDATE connections SET encrypted_credentials = $1, scopes = $2, status = $3, updated_at = NOW() WHERE id = $4',
      [encryptedCredentials, scopes, 'active', id],
    );
  }

  async deleteConnection(id: string): Promise<void> {
    await query(
      'UPDATE connections SET status = $1, updated_at = NOW() WHERE id = $2',
      ['revoked', id],
    );
  }

  async createToken(token: ScopedToken): Promise<void> {
    const tokenHash = hashToken(token.accessToken);
    const encryptedToken = this.encryption.encrypt(
      Buffer.from(token.accessToken),
      this.deriveTokenKey(token.id),
    );

    await query(
      `INSERT INTO scoped_tokens (id, connection_id, reference, agent_id, scopes, access_token_hash, encrypted_access_token, issued_at, expires_at, usage_count, max_usage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        token.id,
        token.connectionId,
        token.reference,
        token.agentId,
        JSON.stringify(token.scopes),
        tokenHash,
        encryptedToken,
        token.issuedAt,
        token.expiresAt,
        token.usageCount,
        token.maxUsage ?? null,
      ],
    );
  }

  async getToken(id: string): Promise<ScopedToken | null> {
    const { rows } = await query(
      'SELECT * FROM scoped_tokens WHERE id = $1',
      [id],
    );
    if (rows.length === 0) return null;
    return this.mapToken(rows[0]);
  }

  async getTokenByReference(reference: string): Promise<ScopedToken | null> {
    const { rows } = await query(
      'SELECT * FROM scoped_tokens WHERE reference = $1',
      [reference],
    );
    if (rows.length === 0) return null;
    return this.mapToken(rows[0]);
  }

  async listTokensByConnection(connectionId: string): Promise<ScopedToken[]> {
    const { rows } = await query(
      'SELECT * FROM scoped_tokens WHERE connection_id = $1 AND revoked_at IS NULL AND expires_at > NOW() ORDER BY issued_at DESC',
      [connectionId],
    );
    return rows.map((row: any) => this.mapToken(row));
  }

  async revokeToken(id: string): Promise<void> {
    await query(
      'UPDATE scoped_tokens SET revoked_at = NOW() WHERE id = $1',
      [id],
    );
  }

  async revokeConnectionTokens(connectionId: string): Promise<void> {
    await query(
      'UPDATE scoped_tokens SET revoked_at = NOW() WHERE connection_id = $1 AND revoked_at IS NULL',
      [connectionId],
    );
  }

  async incrementTokenUsage(id: string): Promise<number> {
    const { rows } = await query(
      'UPDATE scoped_tokens SET usage_count = usage_count + 1 WHERE id = $1 RETURNING usage_count',
      [id],
    );
    return rows[0].usage_count;
  }

  async appendAuditLog(entry: AuditEntry): Promise<void> {
    await query(
      `INSERT INTO audit_log (id, timestamp, connection_id, token_id, agent_id, action, resource, provider, metadata, ip, success, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        entry.id,
        entry.timestamp,
        entry.connectionId,
        entry.tokenId,
        entry.agentId,
        entry.action,
        entry.resource,
        entry.provider,
        JSON.stringify(entry.metadata),
        entry.ip ?? null,
        entry.success,
        entry.error ?? null,
      ],
    );
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
    const conditions = ['c.user_id = $1'];
    const params: any[] = [userId];
    let idx = 2;

    if (filters.connectionId) {
      conditions.push(`a.connection_id = $${idx++}`);
      params.push(filters.connectionId);
    }
    if (filters.agentId) {
      conditions.push(`a.agent_id = $${idx++}`);
      params.push(filters.agentId);
    }
    if (filters.action) {
      conditions.push(`a.action = $${idx++}`);
      params.push(filters.action);
    }
    if (filters.from) {
      conditions.push(`a.timestamp >= $${idx++}`);
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`a.timestamp <= $${idx++}`);
      params.push(filters.to);
    }

    const where = conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) FROM audit_log a JOIN connections c ON a.connection_id = c.id WHERE ${where}`,
      params,
    );

    const dataResult = await query(
      `SELECT a.* FROM audit_log a JOIN connections c ON a.connection_id = c.id
       WHERE ${where} ORDER BY a.timestamp DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, filters.limit, filters.offset],
    );

    return {
      entries: dataResult.rows.map(this.mapAuditEntry),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async getAuditSummary(userId: string): Promise<Record<string, number>> {
    const base = `FROM audit_log a JOIN connections c ON a.connection_id = c.id WHERE c.user_id = $1`;
    const since24h = `AND a.timestamp > NOW() - INTERVAL '24 hours'`;

    const [total, agents, connections, issued, revoked, recent, recentAgents] =
      await Promise.all([
        query(`SELECT COUNT(*) ${base}`, [userId]),
        query(`SELECT COUNT(DISTINCT a.agent_id) ${base}`, [userId]),
        query(
          `SELECT COUNT(*) FROM connections WHERE user_id = $1 AND status = 'active'`,
          [userId],
        ),
        query(`SELECT COUNT(*) ${base} AND a.action = 'token.issued'`, [userId]),
        query(`SELECT COUNT(*) ${base} AND a.action = 'token.revoked'`, [userId]),
        query(`SELECT COUNT(*) ${base} ${since24h}`, [userId]),
        query(`SELECT COUNT(DISTINCT a.agent_id) ${base} ${since24h}`, [userId]),
      ]);

    return {
      totalRequests: parseInt(total.rows[0].count, 10),
      uniqueAgents: parseInt(agents.rows[0].count, 10),
      activeConnections: parseInt(connections.rows[0].count, 10),
      tokensIssued: parseInt(issued.rows[0].count, 10),
      tokensRevoked: parseInt(revoked.rows[0].count, 10),
      last24hRequests: parseInt(recent.rows[0].count, 10),
      last24hAgents: parseInt(recentAgents.rows[0].count, 10),
    };
  }

  private deriveTokenKey(tokenId: string): Buffer {
    return createHash('sha256')
      .update(`token-key:${tokenId}`)
      .digest();
  }

  private mapConnection(row: any): Connection {
    return {
      id: row.id,
      userId: row.user_id,
      teamId: row.team_id,
      provider: row.provider as Provider,
      status: row.status as ConnectionStatus,
      scopes: row.scopes ?? [],
      encryptedCredentials: row.encrypted_credentials,
      connectionKeyId: row.connection_key_id,
      metadata: row.metadata ?? {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
    };
  }

  private mapToken(row: any): ScopedToken {
    const decryptedToken = this.encryption.decrypt(
      row.encrypted_access_token,
      this.deriveTokenKey(row.id),
    );

    return {
      id: row.id,
      connectionId: row.connection_id,
      reference: row.reference,
      agentId: row.agent_id,
      scopes: row.scopes as TokenScope[],
      accessToken: decryptedToken.toString(),
      issuedAt: new Date(row.issued_at),
      expiresAt: new Date(row.expires_at),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined,
      usageCount: row.usage_count,
      maxUsage: row.max_usage ?? undefined,
    };
  }

  private mapAuditEntry(row: any): AuditEntry {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      connectionId: row.connection_id,
      tokenId: row.token_id,
      agentId: row.agent_id,
      action: row.action,
      resource: row.resource,
      provider: row.provider as Provider,
      metadata: row.metadata ?? {},
      ip: row.ip,
      success: row.success,
      error: row.error,
    };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
