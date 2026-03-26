import type { AuditEntry } from './types.js';

export interface AnomalyRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface AnomalyDetection {
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  agentId: string;
  connectionId?: string;
  metadata: Record<string, unknown>;
  detectedAt: Date;
}

export interface Alert {
  id: string;
  type: 'anomaly' | 'policy_violation' | 'approval_required' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  agentId?: string;
  connectionId?: string;
  metadata: Record<string, unknown>;
  acknowledged: boolean;
  createdAt: Date;
  acknowledgedAt?: Date;
}

export const DEFAULT_RULES: AnomalyRule[] = [
  {
    id: 'velocity_spike',
    name: 'Velocity Spike',
    description: 'Agent makes unusually many token requests in a short period',
    severity: 'high',
    enabled: true,
  },
  {
    id: 'off_hours_access',
    name: 'Off-Hours Access',
    description: 'Agent accesses credentials outside of configured business hours',
    severity: 'medium',
    enabled: true,
  },
  {
    id: 'scope_escalation',
    name: 'Scope Escalation Attempt',
    description: 'Agent repeatedly requests higher scopes than permitted',
    severity: 'high',
    enabled: true,
  },
  {
    id: 'unknown_agent',
    name: 'Unknown Agent',
    description: 'Token request from an unregistered agent identity',
    severity: 'medium',
    enabled: true,
  },
  {
    id: 'bulk_data_access',
    name: 'Bulk Data Access',
    description: 'Unusually high number of token resolutions in a short window',
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'failed_auth_burst',
    name: 'Failed Auth Burst',
    description: 'Multiple failed authentication attempts from same source',
    severity: 'high',
    enabled: true,
  },
];

export interface AnomalyEngineConfig {
  velocityWindow: number;       // seconds — window for velocity checks
  velocityThreshold: number;    // max requests in window before alert
  businessHoursStart: number;   // 0-23, e.g. 9
  businessHoursEnd: number;     // 0-23, e.g. 18
  businessDays: number[];       // 0=Sun, 1=Mon, ..., 6=Sat
  resolveThreshold: number;     // max resolves in velocity window
}

const DEFAULT_CONFIG: AnomalyEngineConfig = {
  velocityWindow: 300,       // 5 minutes
  velocityThreshold: 50,     // 50 requests in 5 min
  businessHoursStart: 9,
  businessHoursEnd: 18,
  businessDays: [1, 2, 3, 4, 5],  // Mon-Fri
  resolveThreshold: 100,
};

export class AnomalyEngine {
  private config: AnomalyEngineConfig;
  private rules: Map<string, AnomalyRule>;
  private recentEvents: Map<string, { timestamps: number[]; actions: string[] }> = new Map();
  private registeredAgents: Set<string> = new Set();

  constructor(config?: Partial<AnomalyEngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rules = new Map(DEFAULT_RULES.map((r) => [r.id, r]));
  }

  registerAgent(agentId: string): void {
    this.registeredAgents.add(agentId);
  }

  unregisterAgent(agentId: string): void {
    this.registeredAgents.delete(agentId);
  }

  analyze(entry: AuditEntry): AnomalyDetection[] {
    const detections: AnomalyDetection[] = [];
    const now = Date.now();

    // Track recent events per agent
    const key = entry.agentId;
    if (!this.recentEvents.has(key)) {
      this.recentEvents.set(key, { timestamps: [], actions: [] });
    }
    const history = this.recentEvents.get(key)!;
    history.timestamps.push(now);
    history.actions.push(entry.action);

    // Prune old events outside the window
    const windowStart = now - this.config.velocityWindow * 1000;
    while (history.timestamps.length > 0 && history.timestamps[0] < windowStart) {
      history.timestamps.shift();
      history.actions.shift();
    }

    // Rule: Velocity Spike
    const velocityRule = this.rules.get('velocity_spike');
    if (velocityRule?.enabled) {
      const issueCount = history.actions.filter((a) => a === 'token.issued').length;
      if (issueCount > this.config.velocityThreshold) {
        detections.push({
          ruleId: 'velocity_spike',
          ruleName: velocityRule.name,
          severity: velocityRule.severity,
          message: `Agent "${entry.agentId}" issued ${issueCount} tokens in ${this.config.velocityWindow}s (threshold: ${this.config.velocityThreshold})`,
          agentId: entry.agentId,
          connectionId: entry.connectionId,
          metadata: { count: issueCount, window: this.config.velocityWindow },
          detectedAt: new Date(),
        });
      }
    }

    // Rule: Off-Hours Access
    const offHoursRule = this.rules.get('off_hours_access');
    if (offHoursRule?.enabled) {
      const hour = new Date().getHours();
      const day = new Date().getDay();
      const isBusinessHours =
        this.config.businessDays.includes(day) &&
        hour >= this.config.businessHoursStart &&
        hour < this.config.businessHoursEnd;

      if (!isBusinessHours && entry.action === 'token.issued') {
        detections.push({
          ruleId: 'off_hours_access',
          ruleName: offHoursRule.name,
          severity: offHoursRule.severity,
          message: `Agent "${entry.agentId}" requested credentials outside business hours`,
          agentId: entry.agentId,
          connectionId: entry.connectionId,
          metadata: { hour, day },
          detectedAt: new Date(),
        });
      }
    }

    // Rule: Unknown Agent
    const unknownRule = this.rules.get('unknown_agent');
    if (
      unknownRule?.enabled &&
      this.registeredAgents.size > 0 &&
      !this.registeredAgents.has(entry.agentId) &&
      entry.agentId !== 'system'
    ) {
      detections.push({
        ruleId: 'unknown_agent',
        ruleName: unknownRule.name,
        severity: unknownRule.severity,
        message: `Unregistered agent "${entry.agentId}" attempted credential access`,
        agentId: entry.agentId,
        connectionId: entry.connectionId,
        metadata: {},
        detectedAt: new Date(),
      });
    }

    // Rule: Bulk Data Access
    const bulkRule = this.rules.get('bulk_data_access');
    if (bulkRule?.enabled) {
      const resolveCount = history.actions.filter((a) => a === 'token.resolved').length;
      if (resolveCount > this.config.resolveThreshold) {
        detections.push({
          ruleId: 'bulk_data_access',
          ruleName: bulkRule.name,
          severity: bulkRule.severity,
          message: `Agent "${entry.agentId}" resolved ${resolveCount} tokens in ${this.config.velocityWindow}s — possible data exfiltration`,
          agentId: entry.agentId,
          connectionId: entry.connectionId,
          metadata: { count: resolveCount },
          detectedAt: new Date(),
        });
      }
    }

    return detections;
  }

  getRules(): AnomalyRule[] {
    return Array.from(this.rules.values());
  }

  updateRule(id: string, enabled: boolean): void {
    const rule = this.rules.get(id);
    if (rule) rule.enabled = enabled;
  }
}
