import type {
  KeygateConfig,
  ConnectionInfo,
  TokenHandle,
  TokenResolution,
  AuditQuery,
  AuditResult,
  ProviderInfo,
  ScopeRequest,
} from './types.js';

const DEFAULT_BASE_URL = 'http://localhost:3100';
const DEFAULT_TTL = 3600;

export class KeygateClient {
  private baseUrl: string;
  private apiKey: string;
  private agentId: string;
  private defaultTTL: number;

  constructor(config: KeygateConfig) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.apiKey = config.apiKey;
    this.agentId = config.agentId;
    this.defaultTTL = config.defaultTTL ?? DEFAULT_TTL;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${this.apiKey}`,
        'X-Agent-Id': this.agentId,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response
        .json()
        .catch(() => ({ message: 'Request failed' }));
      throw new KeygateError(
        body.error ?? 'REQUEST_FAILED',
        body.message ?? `HTTP ${response.status}`,
        response.status,
      );
    }

    return response.json() as Promise<T>;
  }

  async listConnections(): Promise<ConnectionInfo[]> {
    const data = await this.request<{ connections: ConnectionInfo[] }>(
      '/api/connections',
    );
    return data.connections;
  }

  async getConnection(connectionId: string): Promise<ConnectionInfo> {
    return this.request<ConnectionInfo>(`/api/connections/${connectionId}`);
  }

  async requestToken(
    connectionId: string,
    scopes: ScopeRequest[],
    options?: { ttl?: number; maxUsage?: number; reason?: string },
  ): Promise<TokenHandle> {
    return this.request<TokenHandle>('/api/tokens/issue', {
      method: 'POST',
      body: JSON.stringify({
        connectionId,
        agentId: this.agentId,
        scopes,
        ttl: options?.ttl ?? this.defaultTTL,
        maxUsage: options?.maxUsage,
        metadata: options?.reason ? { reason: options.reason } : undefined,
      }),
    });
  }

  async resolveToken(reference: string): Promise<TokenResolution> {
    return this.request<TokenResolution>('/api/tokens/resolve', {
      method: 'POST',
      body: JSON.stringify({ reference }),
    });
  }

  async getToken(
    connectionId: string,
    scopes: ScopeRequest[],
    options?: { ttl?: number; maxUsage?: number; reason?: string },
  ): Promise<{ accessToken: string; tokenId: string; expiresAt: string }> {
    const handle = await this.requestToken(connectionId, scopes, options);
    const resolved = await this.resolveToken(handle.reference);
    return {
      accessToken: resolved.accessToken,
      tokenId: handle.tokenId,
      expiresAt: handle.expiresAt,
    };
  }

  async revokeToken(tokenId: string): Promise<void> {
    await this.request(`/api/tokens/${tokenId}`, { method: 'DELETE' });
  }

  async queryAudit(query?: AuditQuery): Promise<AuditResult> {
    const params = new URLSearchParams();
    if (query?.connectionId) params.set('connectionId', query.connectionId);
    if (query?.agentId) params.set('agentId', query.agentId);
    if (query?.action) params.set('action', query.action);
    if (query?.from) params.set('from', query.from);
    if (query?.to) params.set('to', query.to);
    if (query?.limit) params.set('limit', String(query.limit));

    return this.request<AuditResult>(`/api/audit?${params}`);
  }

  async listProviders(): Promise<ProviderInfo[]> {
    const data = await this.request<{ providers: ProviderInfo[] }>(
      '/api/providers',
    );
    return data.providers;
  }

  async withToken<T>(
    connectionId: string,
    scopes: ScopeRequest[],
    callback: (accessToken: string) => Promise<T>,
    options?: { ttl?: number; reason?: string },
  ): Promise<T> {
    const { accessToken, tokenId } = await this.getToken(
      connectionId,
      scopes,
      { ...options, maxUsage: 1 },
    );
    try {
      return await callback(accessToken);
    } finally {
      await this.revokeToken(tokenId).catch(() => {});
    }
  }
}

export class KeygateError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'KeygateError';
  }
}
