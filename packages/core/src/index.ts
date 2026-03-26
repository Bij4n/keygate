export { Vault, VaultError, type VaultStore } from './vault.js';
export { EncryptionService } from './encryption.js';
export {
  ScopeValidator,
  type ValidationResult,
} from './scope-validator.js';
export {
  PROVIDERS,
  getProvider,
  listProviders,
  type ProviderConfig,
  type ProviderScope,
} from './providers.js';
export {
  AnomalyEngine,
  DEFAULT_RULES,
  type AnomalyRule,
  type AnomalyDetection,
  type Alert,
  type AnomalyEngineConfig,
} from './anomaly.js';
export {
  PolicyEngine,
  type Policy,
  type PolicyCondition,
  type PolicyEvalContext,
  type PolicyEvalResult,
} from './policy.js';
export {
  ApprovalManager,
  type ApprovalRequest,
  type ApprovalDecision,
} from './approvals.js';
export {
  AgentRegistry,
  DEFAULT_PERMISSION_BOUNDARY,
  type RegisteredAgent,
  type AgentPermissionBoundary,
  type AgentStats,
} from './agents.js';
export {
  WebhookDispatcher,
  type WebhookConfig,
  type WebhookEvent,
  type WebhookPayload,
} from './webhooks.js';
export type {
  Connection,
  ScopedToken,
  AuditEntry,
  VaultConfig,
  TokenRequest,
  TokenResponse,
  TokenScope,
  Provider,
  ConnectionStatus,
  User,
  Team,
  ApiKey,
} from './types.js';
