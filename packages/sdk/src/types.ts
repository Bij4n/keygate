export interface KeygateConfig {
  baseUrl?: string;
  apiKey: string;
  agentId: string;
  defaultTTL?: number;
}

export interface ConnectionInfo {
  id: string;
  provider: string;
  status: 'active' | 'expired' | 'revoked';
  scopes: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  lastUsedAt?: string;
}

export interface ScopeRequest {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'admin')[];
  constraints?: Record<string, unknown>;
}

export interface TokenHandle {
  tokenId: string;
  reference: string;
  expiresAt: string;
  scopes: ScopeRequest[];
}

export interface TokenResolution {
  accessToken: string;
  scopes: ScopeRequest[];
}

export interface AuditQuery {
  connectionId?: string;
  agentId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  connectionId: string;
  tokenId: string;
  agentId: string;
  action: string;
  resource: string;
  provider: string;
  success: boolean;
  error?: string;
}

export interface AuditResult {
  entries: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  icon: string;
  scopes: ProviderScopeInfo[];
}

export interface ProviderScopeInfo {
  value: string;
  label: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
}
