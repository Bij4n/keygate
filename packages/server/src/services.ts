import { Vault, EncryptionService } from '@keygate/core';
import type { VaultConfig } from '@keygate/core';
import { PostgresVaultStore } from './db/vault-store.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'dev-encryption-key-change-me';

const config: VaultConfig = {
  encryptionKey: ENCRYPTION_KEY,
  tokenTTL: 3600,        // 1 hour default
  maxTokenTTL: 86400,    // 24 hours max
  auditRetention: 90,    // 90 days
};

export const encryption = new EncryptionService(ENCRYPTION_KEY);
export const vaultStore = new PostgresVaultStore(ENCRYPTION_KEY);
export const vault = new Vault(vaultStore, config);
