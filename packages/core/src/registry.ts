/**
 * MCP Server Reputation Registry
 *
 * A trust-scoring system for MCP servers. Combines static analysis signals,
 * community ratings, behavioral monitoring data, and vulnerability reports
 * into a single reputation score (0-100).
 */

export interface McpServerEntry {
  id: string;
  name: string;
  description: string;
  packageName: string;
  version: string;
  repository?: string;
  author: string;
  license?: string;
  verified: boolean;
  reputationScore: number;
  signals: ReputationSignals;
  tools: McpToolSummary[];
  credentialAccess: CredentialAccessProfile;
  communityRatings: CommunityRating;
  vulnerabilities: Vulnerability[];
  lastScannedAt: Date;
  registeredAt: Date;
  updatedAt: Date;
}

export interface ReputationSignals {
  codeAuditScore: number;           // 0-100: static analysis results
  communityTrustScore: number;      // 0-100: from ratings
  behavioralScore: number;          // 0-100: runtime behavior monitoring
  provenanceScore: number;          // 0-100: author reputation, repo activity
  securityScore: number;            // 0-100: vulnerability history, response time
}

export interface McpToolSummary {
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  credentialsRequired: boolean;
  networkAccess: boolean;
  fileSystemAccess: boolean;
}

export interface CredentialAccessProfile {
  requestsOAuth: boolean;
  requestsApiKeys: boolean;
  scopesRequested: string[];
  dataExfiltrationRisk: 'none' | 'low' | 'medium' | 'high';
  crossServerAccess: boolean;
}

export interface CommunityRating {
  totalRatings: number;
  averageScore: number;
  trustVotes: number;
  flagCount: number;
  lastReviewedAt?: Date;
}

export interface Vulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reportedAt: Date;
  resolvedAt?: Date;
  cveId?: string;
}

export interface RegistrySearchOptions {
  query?: string;
  minScore?: number;
  verified?: boolean;
  category?: string;
  sortBy?: 'reputation' | 'name' | 'recent' | 'ratings';
  limit?: number;
  offset?: number;
}

const SIGNAL_WEIGHTS = {
  codeAudit: 0.25,
  communityTrust: 0.20,
  behavioral: 0.25,
  provenance: 0.15,
  security: 0.15,
};

export class McpRegistry {
  private entries: Map<string, McpServerEntry> = new Map();

  register(entry: McpServerEntry): McpServerEntry {
    entry.reputationScore = this.calculateScore(entry.signals);
    this.entries.set(entry.id, entry);
    return entry;
  }

  get(id: string): McpServerEntry | undefined {
    return this.entries.get(id);
  }

  getByPackage(packageName: string): McpServerEntry | undefined {
    for (const entry of this.entries.values()) {
      if (entry.packageName === packageName) return entry;
    }
    return undefined;
  }

  search(options: RegistrySearchOptions = {}): { entries: McpServerEntry[]; total: number } {
    let results = Array.from(this.entries.values());

    if (options.query) {
      const q = options.query.toLowerCase();
      results = results.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.packageName.toLowerCase().includes(q),
      );
    }

    if (options.minScore !== undefined) {
      results = results.filter((e) => e.reputationScore >= options.minScore!);
    }

    if (options.verified !== undefined) {
      results = results.filter((e) => e.verified === options.verified);
    }

    const total = results.length;

    switch (options.sortBy) {
      case 'name':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
        results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        break;
      case 'ratings':
        results.sort((a, b) => b.communityRatings.totalRatings - a.communityRatings.totalRatings);
        break;
      case 'reputation':
      default:
        results.sort((a, b) => b.reputationScore - a.reputationScore);
    }

    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;
    results = results.slice(offset, offset + limit);

    return { entries: results, total };
  }

  updateSignals(id: string, signals: Partial<ReputationSignals>): McpServerEntry | null {
    const entry = this.entries.get(id);
    if (!entry) return null;

    Object.assign(entry.signals, signals);
    entry.reputationScore = this.calculateScore(entry.signals);
    entry.updatedAt = new Date();
    return entry;
  }

  addRating(id: string, score: number, trusted: boolean): McpServerEntry | null {
    const entry = this.entries.get(id);
    if (!entry) return null;

    const r = entry.communityRatings;
    const newTotal = r.totalRatings + 1;
    r.averageScore = (r.averageScore * r.totalRatings + score) / newTotal;
    r.totalRatings = newTotal;
    if (trusted) r.trustVotes++;
    r.lastReviewedAt = new Date();

    entry.signals.communityTrustScore = Math.round(r.averageScore * 20);
    entry.reputationScore = this.calculateScore(entry.signals);
    entry.updatedAt = new Date();
    return entry;
  }

  flag(id: string): McpServerEntry | null {
    const entry = this.entries.get(id);
    if (!entry) return null;

    entry.communityRatings.flagCount++;
    if (entry.communityRatings.flagCount >= 5) {
      entry.signals.communityTrustScore = Math.max(0, entry.signals.communityTrustScore - 20);
      entry.reputationScore = this.calculateScore(entry.signals);
    }
    entry.updatedAt = new Date();
    return entry;
  }

  reportVulnerability(id: string, vuln: Vulnerability): McpServerEntry | null {
    const entry = this.entries.get(id);
    if (!entry) return null;

    entry.vulnerabilities.push(vuln);

    const unresolvedCritical = entry.vulnerabilities.filter(
      (v) => !v.resolvedAt && (v.severity === 'critical' || v.severity === 'high'),
    ).length;
    entry.signals.securityScore = Math.max(0, 100 - unresolvedCritical * 30);
    entry.reputationScore = this.calculateScore(entry.signals);
    entry.updatedAt = new Date();
    return entry;
  }

  isAllowed(id: string, minScore: number = 50): { allowed: boolean; score: number; reason?: string } {
    const entry = this.entries.get(id);
    if (!entry) return { allowed: false, score: 0, reason: 'MCP server not found in registry' };

    if (entry.reputationScore < minScore) {
      return {
        allowed: false,
        score: entry.reputationScore,
        reason: `Reputation score ${entry.reputationScore} is below minimum threshold ${minScore}`,
      };
    }

    const criticalVulns = entry.vulnerabilities.filter(
      (v) => !v.resolvedAt && v.severity === 'critical',
    );
    if (criticalVulns.length > 0) {
      return {
        allowed: false,
        score: entry.reputationScore,
        reason: `${criticalVulns.length} unresolved critical vulnerability(ies)`,
      };
    }

    return { allowed: true, score: entry.reputationScore };
  }

  getStats(): {
    total: number;
    verified: number;
    averageScore: number;
    belowThreshold: number;
    withVulnerabilities: number;
  } {
    const entries = Array.from(this.entries.values());
    return {
      total: entries.length,
      verified: entries.filter((e) => e.verified).length,
      averageScore: entries.length > 0
        ? Math.round(entries.reduce((s, e) => s + e.reputationScore, 0) / entries.length)
        : 0,
      belowThreshold: entries.filter((e) => e.reputationScore < 50).length,
      withVulnerabilities: entries.filter(
        (e) => e.vulnerabilities.some((v) => !v.resolvedAt),
      ).length,
    };
  }

  list(): McpServerEntry[] {
    return Array.from(this.entries.values()).sort(
      (a, b) => b.reputationScore - a.reputationScore,
    );
  }

  private calculateScore(signals: ReputationSignals): number {
    return Math.round(
      signals.codeAuditScore * SIGNAL_WEIGHTS.codeAudit +
      signals.communityTrustScore * SIGNAL_WEIGHTS.communityTrust +
      signals.behavioralScore * SIGNAL_WEIGHTS.behavioral +
      signals.provenanceScore * SIGNAL_WEIGHTS.provenance +
      signals.securityScore * SIGNAL_WEIGHTS.security,
    );
  }
}
