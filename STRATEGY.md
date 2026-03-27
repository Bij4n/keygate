# Keygate — Product Strategy & Proprietary Moat Roadmap

**Prepared:** March 2026
**Classification:** Internal Strategy Document

---

## Product Positioning

**One-liner:** Keygate is the credential governance layer for AI agents.

**Positioning:** Other tools authenticate agents. Keygate governs what happens after — scoped tokens, anomaly detection, trust scoring, and policy enforcement.

**Key stat:** 46% of teams still use shared API keys for agent auth. Even those using OAuth hand over broad, persistent tokens with zero post-auth governance.

---

## Top Pain Points in the Market

| # | Pain Point | Severity | Who Has It |
|---|---|---|---|
| 1 | MCP has zero credential governance | Critical | Every MCP developer |
| 2 | "God Token" anti-pattern — agents get full personal tokens | High | LangChain, CrewAI, AutoGen users |
| 3 | No audit trail for agent credential usage | High | Production teams, compliance |
| 4 | Token expiry during long-running agent tasks | Medium-High | Enterprise agent deployments |
| 5 | Multi-agent credential bleed — all agents share tokens | Medium-High | Multi-agent system builders |
| 6 | Secret sprawl across agents x services x environments | Medium | Scaling teams |
| 7 | No trust framework for third-party MCP servers | High | Everyone using community MCP servers |

---

## Proprietary Moat Hierarchy

The moat strategy follows the Cloudflare playbook: open-source core (distribution) → telemetry collection → proprietary intelligence layer (monetization).

**Moats ranked by defensibility:**

1. **Data moats** (hardest to replicate) — cross-customer baselines, ML models
2. **Curated knowledge moats** — MCP reputation database, agent fingerprints
3. **Operational moats** — OAuth rotation at scale, compliance certifications
4. **Product moats** (easiest to replicate) — NL policies, UI features

---

## Proprietary Features Roadmap

### Tier 1: Build First (Months 1-3)

#### 1. MCP Server Reputation Database ("Keygate Registry")

**What:** Community-sourced and algorithmically-scored trust database for MCP servers. Static analysis of code, credential access patterns, behavioral monitoring, community ratings.

**Why it's defensible:** First credible reputation DB becomes the standard reference. Community network effects — more contributors = more coverage = more users. Think VirusTotal meets npm audit for MCP.

**Why it's high priority:** Solves an acute pain point (zero vetting for MCP servers), creates a natural distribution channel (developers discover Keygate through the registry), and generates data for downstream moats.

| Defensibility | Customer Value | Feasibility (6mo) | Network Effects |
|---|---|---|---|
| 4/5 | 5/5 | 4/5 | 5/5 |

#### 2. Telemetry Pipeline + Cross-Customer Anomaly Baselines

**What:** Aggregate anonymized telemetry from all Keygate deployments to learn what "normal" agent credential usage looks like. Flag deviations.

**Why it's defensible:** The data can only be accumulated by having deployments in production. A competitor starting later has a years-long data gap. The 1,000th customer makes the product better for the other 999.

**Action:** Enrich `AuditEntry` with: source IP, user-agent, agent framework identifier, session context, request latency, whether issued tokens were actually used.

| Defensibility | Customer Value | Feasibility (6mo) | Network Effects |
|---|---|---|---|
| 5/5 | 4/5 | 3/5 | 5/5 |

#### 3. Agent Behavioral Fingerprinting

**What:** Build a behavioral fingerprint per agent (request patterns, scope usage, timing, error rates). Detect deviations from established patterns — the agent equivalent of "this doesn't look like your usual login."

**Why it's defensible:** The algorithm can be open-sourced; the accumulated per-agent history and cross-customer training data cannot.

| Defensibility | Customer Value | Feasibility (6mo) | Network Effects |
|---|---|---|---|
| 4/5 | 4/5 | 4/5 | 4/5 |

### Tier 2: Build Next (Months 3-6)

#### 4. Managed OAuth Rotation for Top Providers

**What:** Pre-built, maintained OAuth connectors with automatic token rotation, scope management, and agent-specific credential provisioning for 20+ providers.

**Why:** High customer value, creates switching costs through integration breadth. Start with: GitHub, Slack, Google Workspace, Stripe, Jira, Notion, Salesforce, HubSpot, AWS, Linear.

#### 5. Natural Language Policy Creation

**What:** "Block write access to GitHub after 6pm" → executable policy. Translate natural language rules into the policy engine's condition format.

**Why:** Lower barrier to entry for non-technical security teams. Defensibility comes from curated template library trained on real customer policies.

#### 6. Zero-Knowledge Credential Storage

**What:** All encryption happens client-side. Keygate never sees plaintext credentials. We store ciphertext only.

**Why:** Privacy differentiator for security-conscious enterprises. "We literally cannot see your credentials, even if subpoenaed."

### Tier 3: Build at Scale (Months 6-12)

#### 7. Predictive ML Abuse Detection

**What:** Supervised ML models trained on confirmed credential abuse incidents. Predicts compromise before damage occurs.

**Requires:** 6+ months of production telemetry data for training.

#### 8. Cross-Organization Agent Reputation

**What:** Agent trust scores that follow an agent across organizations. A "credit bureau" for AI agents.

#### 9. Compliance Certifications

**What:** SOC2 Type II, ISO 27001, HIPAA. Table stakes for enterprise but expensive barriers for competitors.

---

## Security & Privacy Integrations

| Integration | Category | Value |
|---|---|---|
| Splunk / Datadog / Elastic | SIEM | Export audit events for security team visibility |
| PagerDuty / OpsGenie | SOAR | Auto-trigger incident response on anomalies |
| Okta / Azure AD | Identity | Federated agent identity tied to enterprise SSO |
| AWS STS / GCP Workload Identity | Cloud IAM | Issue cloud-native short-lived credentials |
| HashiCorp Vault / AWS Secrets Manager | Secrets Backend | Use existing enterprise infra as credential store |
| Slack / Discord / Teams | Alerts | Webhook notifications for anomalies (built) |

---

## 6-Month Execution Plan

| Month | Focus |
|---|---|
| 1-2 | Enrich telemetry pipeline. Launch MCP Registry MVP (top 100 servers). Ship top 10 OAuth connectors. |
| 3-4 | Open community contributions to registry. Ship agent behavioral fingerprinting. Begin SOC2 Type I. Expand to 20 OAuth connectors. |
| 5-6 | Launch Keygate Cloud (managed offering). Aggregate cross-customer baselines. Publish "State of Agent Security" report. Ship NL policy creation. |

---

## Key Strategic Insight

> Every design decision should optimize for getting deployed in as many agent systems as possible, as quickly as possible, because the data generated by those deployments IS the moat. The open-source core is the distribution mechanism. The intelligence layer is the monetization mechanism.

The companies that win in security infrastructure are the ones that see the most traffic and learn the fastest from it.
