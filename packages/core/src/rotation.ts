/**
 * Token Rotation Manager
 *
 * Automatically refreshes tokens before they expire, ensuring
 * long-running agents never lose access mid-task. Supports
 * configurable refresh windows and callback notifications.
 */

import type { TokenScope } from './types.js';

export interface RotatingToken {
  id: string;
  connectionId: string;
  agentId: string;
  scopes: TokenScope[];
  currentTokenId: string;
  currentReference: string;
  currentAccessToken: string;
  expiresAt: Date;
  ttl: number;
  refreshBeforeMs: number;
  autoRevokePrevious: boolean;
  rotationCount: number;
  createdAt: Date;
  lastRotatedAt?: Date;
  status: 'active' | 'paused' | 'expired' | 'revoked';
}

export interface TokenIssuer {
  issueToken(connectionId: string, agentId: string, scopes: TokenScope[], ttl: number): Promise<{
    tokenId: string;
    reference: string;
    expiresAt: Date;
  }>;
  resolveToken(reference: string): Promise<{ accessToken: string }>;
  revokeToken(tokenId: string): Promise<void>;
}

export interface RotationEvent {
  type: 'rotated' | 'failed' | 'expired' | 'revoked';
  rotatingTokenId: string;
  previousTokenId?: string;
  newTokenId?: string;
  error?: string;
  timestamp: Date;
}

export class TokenRotationManager {
  private tokens: Map<string, RotatingToken> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private issuer: TokenIssuer;
  private onEvent?: (event: RotationEvent) => void;

  constructor(issuer: TokenIssuer) {
    this.issuer = issuer;
  }

  setEventHandler(handler: (event: RotationEvent) => void): void {
    this.onEvent = handler;
  }

  async create(
    id: string,
    connectionId: string,
    agentId: string,
    scopes: TokenScope[],
    options: {
      ttl?: number;
      refreshBeforeMs?: number;
      autoRevokePrevious?: boolean;
    } = {},
  ): Promise<RotatingToken> {
    const ttl = options.ttl ?? 3600;
    const refreshBeforeMs = options.refreshBeforeMs ?? 300_000; // 5 min before expiry

    // Issue the initial token
    const issued = await this.issuer.issueToken(connectionId, agentId, scopes, ttl);
    const resolved = await this.issuer.resolveToken(issued.reference);

    const token: RotatingToken = {
      id,
      connectionId,
      agentId,
      scopes,
      currentTokenId: issued.tokenId,
      currentReference: issued.reference,
      currentAccessToken: resolved.accessToken,
      expiresAt: issued.expiresAt,
      ttl,
      refreshBeforeMs,
      autoRevokePrevious: options.autoRevokePrevious ?? true,
      rotationCount: 0,
      createdAt: new Date(),
      status: 'active',
    };

    this.tokens.set(id, token);
    this.scheduleRotation(token);

    return token;
  }

  get(id: string): RotatingToken | undefined {
    return this.tokens.get(id);
  }

  getAccessToken(id: string): string | null {
    const token = this.tokens.get(id);
    if (!token || token.status !== 'active') return null;
    if (new Date() > token.expiresAt) {
      token.status = 'expired';
      return null;
    }
    return token.currentAccessToken;
  }

  async rotate(id: string): Promise<RotatingToken | null> {
    const token = this.tokens.get(id);
    if (!token || token.status !== 'active') return null;

    const previousTokenId = token.currentTokenId;

    try {
      // Issue new token
      const issued = await this.issuer.issueToken(
        token.connectionId,
        token.agentId,
        token.scopes,
        token.ttl,
      );
      const resolved = await this.issuer.resolveToken(issued.reference);

      // Revoke previous if configured
      if (token.autoRevokePrevious) {
        await this.issuer.revokeToken(previousTokenId).catch(() => {});
      }

      // Update token
      token.currentTokenId = issued.tokenId;
      token.currentReference = issued.reference;
      token.currentAccessToken = resolved.accessToken;
      token.expiresAt = issued.expiresAt;
      token.rotationCount++;
      token.lastRotatedAt = new Date();

      // Schedule next rotation
      this.scheduleRotation(token);

      this.emit({
        type: 'rotated',
        rotatingTokenId: id,
        previousTokenId,
        newTokenId: issued.tokenId,
        timestamp: new Date(),
      });

      return token;
    } catch (err: any) {
      this.emit({
        type: 'failed',
        rotatingTokenId: id,
        previousTokenId,
        error: err.message,
        timestamp: new Date(),
      });
      return null;
    }
  }

  pause(id: string): void {
    const token = this.tokens.get(id);
    if (token) token.status = 'paused';
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  resume(id: string): void {
    const token = this.tokens.get(id);
    if (token && token.status === 'paused') {
      token.status = 'active';
      this.scheduleRotation(token);
    }
  }

  async revoke(id: string): Promise<void> {
    const token = this.tokens.get(id);
    if (!token) return;

    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    await this.issuer.revokeToken(token.currentTokenId).catch(() => {});
    token.status = 'revoked';

    this.emit({
      type: 'revoked',
      rotatingTokenId: id,
      previousTokenId: token.currentTokenId,
      timestamp: new Date(),
    });
  }

  list(): RotatingToken[] {
    return Array.from(this.tokens.values());
  }

  getActive(): RotatingToken[] {
    return this.list().filter((t) => t.status === 'active');
  }

  shutdown(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  private scheduleRotation(token: RotatingToken): void {
    // Clear existing timer
    const existing = this.timers.get(token.id);
    if (existing) clearTimeout(existing);

    const msUntilExpiry = token.expiresAt.getTime() - Date.now();
    const rotateIn = Math.max(0, msUntilExpiry - token.refreshBeforeMs);

    const timer = setTimeout(() => {
      this.rotate(token.id).catch(() => {});
    }, rotateIn);

    this.timers.set(token.id, timer);
  }

  private emit(event: RotationEvent): void {
    this.onEvent?.(event);
  }
}
