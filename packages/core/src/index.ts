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
