import type { TokenScope, Provider } from './types.js';

export interface ApprovalRequest {
  id: string;
  agentId: string;
  connectionId: string;
  provider: Provider;
  scopes: TokenScope[];
  ttl: number;
  reason?: string;
  policyId: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: Date;
  decidedAt?: Date;
  decidedBy?: string;
  expiresAt: Date;
}

export interface ApprovalDecision {
  requestId: string;
  decision: 'approved' | 'denied';
  decidedBy: string;
  reason?: string;
}

export class ApprovalManager {
  private requests: Map<string, ApprovalRequest> = new Map();
  private onDecision?: (request: ApprovalRequest) => void;

  setDecisionHandler(handler: (request: ApprovalRequest) => void): void {
    this.onDecision = handler;
  }

  createRequest(request: ApprovalRequest): ApprovalRequest {
    this.requests.set(request.id, request);
    return request;
  }

  getRequest(id: string): ApprovalRequest | undefined {
    return this.requests.get(id);
  }

  getPendingRequests(userId?: string): ApprovalRequest[] {
    const now = new Date();
    return Array.from(this.requests.values())
      .filter(
        (r) =>
          r.status === 'pending' &&
          r.expiresAt > now,
      )
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  decide(decision: ApprovalDecision): ApprovalRequest | null {
    const request = this.requests.get(decision.requestId);
    if (!request || request.status !== 'pending') return null;

    request.status = decision.decision;
    request.decidedAt = new Date();
    request.decidedBy = decision.decidedBy;

    this.onDecision?.(request);
    return request;
  }

  getStats(): { pending: number; approved: number; denied: number; expired: number } {
    const now = new Date();
    let pending = 0, approved = 0, denied = 0, expired = 0;
    for (const r of this.requests.values()) {
      if (r.status === 'pending' && r.expiresAt <= now) expired++;
      else if (r.status === 'pending') pending++;
      else if (r.status === 'approved') approved++;
      else if (r.status === 'denied') denied++;
    }
    return { pending, approved, denied, expired };
  }
}
