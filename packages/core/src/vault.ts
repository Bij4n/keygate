import { nanoid } from 'nanoid';
import { EncryptionService } from './encryption.js';
import type {
  Connection,
  ScopedToken,
  TokenRequest,
  TokenResponse,
  AuditEntry,
  VaultConfig,
  TokenScope,
} from './types.js';

export interface VaultStore {
  getConnection(id: string): Promise<Connection | null>;
  createToken(token: ScopedToken): Promise<void>;
  getToken(id: string): Promise<ScopedToken | null>;
  getTokenByReference(reference: string): Promise<ScopedToken | null>;
  revokeToken(id: string): Promise<void>;
  revokeConnectionTokens(connectionId: string): Promise<void>;
  incrementTokenUsage(id: string): Promise<number>;
  appendAuditLog(entry: AuditEntry): Promise<void>;
}

export class Vault {
  private encryption: EncryptionService;
  private store: VaultStore;
  private config: VaultConfig;

  constructor(store: VaultStore, config: VaultConfig) {
    this.encryption = new EncryptionService(config.encryptionKey);
    this.store = store;
    this.config = config;
  }

  async issueToken(request: TokenRequest): Promise<TokenResponse> {
    const connection = await this.store.getConnection(request.connectionId);
    if (!connection) {
      throw new VaultError(
        'CONNECTION_NOT_FOUND',
        `Connection ${request.connectionId} not found`,
      );
    }

    if (connection.status !== 'active') {
      throw new VaultError(
        'CONNECTION_INACTIVE',
        `Connection ${request.connectionId} is ${connection.status}`,
      );
    }

    const ttl = Math.min(
      request.ttl ?? this.config.tokenTTL,
      this.config.maxTokenTTL,
    );
    const now = new Date();

    const tokenId = `tok_${nanoid(24)}`;
    const reference = `ref_${nanoid(32)}`;
    const accessToken = EncryptionService.generateTokenValue();

    const token: ScopedToken = {
      id: tokenId,
      connectionId: request.connectionId,
      reference,
      agentId: request.agentId,
      scopes: request.scopes,
      accessToken,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + ttl * 1000),
      usageCount: 0,
      maxUsage: request.maxUsage,
    };

    await this.store.createToken(token);

    await this.audit({
      connectionId: request.connectionId,
      tokenId,
      agentId: request.agentId,
      action: 'token.issued',
      resource: connection.provider,
      provider: connection.provider,
      metadata: { scopes: request.scopes, ttl },
      success: true,
    });

    return {
      tokenId,
      reference,
      expiresAt: token.expiresAt,
      scopes: request.scopes,
    };
  }

  async resolveToken(
    reference: string,
  ): Promise<{ accessToken: string; scopes: TokenScope[] }> {
    const token = await this.store.getTokenByReference(reference);
    if (!token) {
      throw new VaultError('TOKEN_NOT_FOUND', 'Invalid token reference');
    }

    if (token.revokedAt) {
      throw new VaultError('TOKEN_REVOKED', 'Token has been revoked');
    }

    if (new Date() > token.expiresAt) {
      throw new VaultError('TOKEN_EXPIRED', 'Token has expired');
    }

    if (token.maxUsage !== undefined) {
      const usage = await this.store.incrementTokenUsage(token.id);
      if (usage > token.maxUsage) {
        throw new VaultError(
          'TOKEN_EXHAUSTED',
          'Token usage limit exceeded',
        );
      }
    } else {
      await this.store.incrementTokenUsage(token.id);
    }

    return {
      accessToken: token.accessToken,
      scopes: token.scopes,
    };
  }

  async revokeToken(tokenId: string, agentId?: string): Promise<void> {
    const token = await this.store.getToken(tokenId);
    if (!token) {
      throw new VaultError('TOKEN_NOT_FOUND', `Token ${tokenId} not found`);
    }

    await this.store.revokeToken(tokenId);

    await this.audit({
      connectionId: token.connectionId,
      tokenId,
      agentId: agentId ?? token.agentId,
      action: 'token.revoked',
      resource: '',
      provider: 'custom',
      metadata: {},
      success: true,
    });
  }

  async revokeAllTokens(connectionId: string): Promise<void> {
    await this.store.revokeConnectionTokens(connectionId);

    await this.audit({
      connectionId,
      tokenId: '*',
      agentId: 'system',
      action: 'tokens.revoked_all',
      resource: '',
      provider: 'custom',
      metadata: {},
      success: true,
    });
  }

  private async audit(
    entry: Omit<AuditEntry, 'id' | 'timestamp'>,
  ): Promise<void> {
    await this.store.appendAuditLog({
      id: `aud_${nanoid(24)}`,
      timestamp: new Date(),
      ...entry,
    });
  }
}

export class VaultError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'VaultError';
  }
}
