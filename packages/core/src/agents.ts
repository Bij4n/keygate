export interface RegisteredAgent {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  teamId?: string;
  apiKeyId?: string;
  status: 'active' | 'suspended' | 'revoked';
  trustScore: number;              // 0-100
  permissionBoundary: AgentPermissionBoundary;
  stats: AgentStats;
  registeredAt: Date;
  lastActiveAt?: Date;
}

export interface AgentPermissionBoundary {
  allowedProviders: string[];      // empty = all allowed
  maxTokenTTL: number;             // seconds
  maxConcurrentTokens: number;
  allowedActions: ('read' | 'write' | 'delete' | 'admin')[];
  requireApproval: boolean;        // always require HITL for this agent
}

export interface AgentStats {
  totalTokensIssued: number;
  totalTokensRevoked: number;
  totalRequests: number;
  failedRequests: number;
  anomaliesDetected: number;
  lastTokenIssuedAt?: Date;
}

export const DEFAULT_PERMISSION_BOUNDARY: AgentPermissionBoundary = {
  allowedProviders: [],
  maxTokenTTL: 3600,
  maxConcurrentTokens: 10,
  allowedActions: ['read'],
  requireApproval: false,
};

export class AgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();

  register(agent: RegisteredAgent): RegisteredAgent {
    this.agents.set(agent.id, agent);
    return agent;
  }

  get(id: string): RegisteredAgent | undefined {
    return this.agents.get(id);
  }

  getByOwner(ownerId: string): RegisteredAgent[] {
    return Array.from(this.agents.values())
      .filter((a) => a.ownerId === ownerId)
      .sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());
  }

  update(id: string, updates: Partial<RegisteredAgent>): RegisteredAgent | null {
    const agent = this.agents.get(id);
    if (!agent) return null;
    Object.assign(agent, updates);
    return agent;
  }

  suspend(id: string): void {
    const agent = this.agents.get(id);
    if (agent) agent.status = 'suspended';
  }

  revoke(id: string): void {
    const agent = this.agents.get(id);
    if (agent) agent.status = 'revoked';
  }

  activate(id: string): void {
    const agent = this.agents.get(id);
    if (agent) agent.status = 'active';
  }

  recordActivity(agentId: string, action: string, success: boolean): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.stats.totalRequests++;
    agent.lastActiveAt = new Date();

    if (action === 'token.issued') {
      agent.stats.totalTokensIssued++;
      agent.stats.lastTokenIssuedAt = new Date();
    } else if (action === 'token.revoked') {
      agent.stats.totalTokensRevoked++;
    }

    if (!success) {
      agent.stats.failedRequests++;
      // Lower trust score on failures
      agent.trustScore = Math.max(0, agent.trustScore - 2);
    } else {
      // Slowly build trust on successful operations
      agent.trustScore = Math.min(100, agent.trustScore + 0.1);
    }
  }

  recordAnomaly(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    agent.stats.anomaliesDetected++;
    agent.trustScore = Math.max(0, agent.trustScore - 10);

    // Auto-suspend on critical trust loss
    if (agent.trustScore < 20) {
      agent.status = 'suspended';
    }
  }

  isAllowed(
    agentId: string,
    provider: string,
    actions: string[],
  ): { allowed: boolean; reason?: string } {
    const agent = this.agents.get(agentId);

    // If no agents are registered, allow all (backwards compatible)
    if (this.agents.size === 0) return { allowed: true };

    if (!agent) {
      return { allowed: false, reason: 'Agent not registered' };
    }

    if (agent.status !== 'active') {
      return { allowed: false, reason: `Agent is ${agent.status}` };
    }

    const boundary = agent.permissionBoundary;

    if (
      boundary.allowedProviders.length > 0 &&
      !boundary.allowedProviders.includes(provider)
    ) {
      return {
        allowed: false,
        reason: `Provider "${provider}" not in agent's permission boundary`,
      };
    }

    const disallowedActions = actions.filter(
      (a) => !boundary.allowedActions.includes(a as any),
    );
    if (disallowedActions.length > 0) {
      return {
        allowed: false,
        reason: `Actions [${disallowedActions.join(', ')}] not permitted for this agent`,
      };
    }

    return { allowed: true };
  }

  list(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }
}
