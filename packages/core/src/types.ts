import { z } from 'zod';

export const ConnectionStatus = z.enum(['active', 'expired', 'revoked']);
export type ConnectionStatus = z.infer<typeof ConnectionStatus>;

export const TokenScope = z.object({
  resource: z.string(),
  actions: z.array(z.enum(['read', 'write', 'delete', 'admin'])),
  constraints: z.record(z.string(), z.unknown()).optional(),
});
export type TokenScope = z.infer<typeof TokenScope>;

export const Provider = z.enum([
  'github', 'gmail', 'google_drive', 'slack', 'notion',
  'jira', 'salesforce', 'hubspot', 'stripe', 'calendar',
  'custom',
]);
export type Provider = z.infer<typeof Provider>;

export interface Connection {
  id: string;
  userId: string;
  teamId?: string;
  provider: Provider;
  status: ConnectionStatus;
  scopes: string[];
  encryptedCredentials: Buffer;
  connectionKeyId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
}

export interface ScopedToken {
  id: string;
  connectionId: string;
  reference: string;
  agentId: string;
  scopes: TokenScope[];
  accessToken: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  usageCount: number;
  maxUsage?: number;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  connectionId: string;
  tokenId: string;
  agentId: string;
  action: string;
  resource: string;
  provider: Provider;
  metadata: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  frameworkId?: string;
  sessionId?: string;
  requestLatencyMs?: number;
  tokenResolved?: boolean;
  scopesRequested?: string[];
  success: boolean;
  error?: string;
}

export interface VaultConfig {
  encryptionKey: string;
  tokenTTL: number;
  maxTokenTTL: number;
  auditRetention: number;
}

export interface TokenRequest {
  connectionId: string;
  agentId: string;
  scopes: TokenScope[];
  ttl?: number;
  maxUsage?: number;
  metadata?: Record<string, unknown>;
}

export interface TokenResponse {
  tokenId: string;
  reference: string;
  expiresAt: Date;
  scopes: TokenScope[];
}

export interface User {
  id: string;
  email: string;
  teamId?: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: Date;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface ApiKey {
  id: string;
  userId: string;
  teamId?: string;
  name: string;
  keyHash: string;
  prefix: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}
