import type { TokenScope, Provider } from './types.js';

export interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: PolicyCondition[];
  effect: 'allow' | 'deny' | 'require_approval';
  createdAt: Date;
}

export type PolicyCondition =
  | { type: 'agent'; agentIds: string[] }
  | { type: 'provider'; providers: Provider[] }
  | { type: 'scope_action'; actions: ('read' | 'write' | 'delete' | 'admin')[] }
  | { type: 'time_window'; startHour: number; endHour: number; days: number[] }
  | { type: 'max_ttl'; maxSeconds: number }
  | { type: 'max_usage'; maxUsage: number }
  | { type: 'resource'; resources: string[] };

export interface PolicyEvalContext {
  agentId: string;
  provider: Provider;
  scopes: TokenScope[];
  ttl: number;
  maxUsage?: number;
  timestamp: Date;
}

export interface PolicyEvalResult {
  allowed: boolean;
  requiresApproval: boolean;
  deniedBy?: string;
  approvalRequiredBy?: string;
  violations: string[];
}

export class PolicyEngine {
  private policies: Policy[] = [];

  setPolicies(policies: Policy[]): void {
    this.policies = policies
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  addPolicy(policy: Policy): void {
    this.policies.push(policy);
    this.policies = this.policies
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  removePolicy(id: string): void {
    this.policies = this.policies.filter((p) => p.id !== id);
  }

  evaluate(context: PolicyEvalContext): PolicyEvalResult {
    const violations: string[] = [];
    let requiresApproval = false;
    let approvalRequiredBy: string | undefined;

    for (const policy of this.policies) {
      if (!this.matchesConditions(policy, context)) continue;

      if (policy.effect === 'deny') {
        return {
          allowed: false,
          requiresApproval: false,
          deniedBy: policy.id,
          violations: [`Denied by policy: ${policy.name}`],
        };
      }

      if (policy.effect === 'require_approval') {
        requiresApproval = true;
        approvalRequiredBy = policy.id;
        violations.push(`Approval required by policy: ${policy.name}`);
      }
    }

    return {
      allowed: true,
      requiresApproval,
      approvalRequiredBy,
      violations,
    };
  }

  private matchesConditions(
    policy: Policy,
    context: PolicyEvalContext,
  ): boolean {
    return policy.conditions.every((cond) =>
      this.matchCondition(cond, context),
    );
  }

  private matchCondition(
    condition: PolicyCondition,
    context: PolicyEvalContext,
  ): boolean {
    switch (condition.type) {
      case 'agent':
        return condition.agentIds.includes(context.agentId);

      case 'provider':
        return condition.providers.includes(context.provider);

      case 'scope_action': {
        const requestedActions = context.scopes.flatMap((s) => s.actions);
        return condition.actions.some((a) => requestedActions.includes(a));
      }

      case 'time_window': {
        const hour = context.timestamp.getHours();
        const day = context.timestamp.getDay();
        const inWindow =
          condition.days.includes(day) &&
          hour >= condition.startHour &&
          hour < condition.endHour;
        return !inWindow; // Matches when OUTSIDE the allowed window (for deny/approval rules)
      }

      case 'max_ttl':
        return context.ttl > condition.maxSeconds;

      case 'max_usage':
        return (
          context.maxUsage === undefined ||
          context.maxUsage > condition.maxUsage
        );

      case 'resource': {
        const requestedResources = context.scopes.map((s) => s.resource);
        return condition.resources.some((r) => requestedResources.includes(r));
      }

      default:
        return false;
    }
  }

  getPolicies(): Policy[] {
    return [...this.policies];
  }
}
