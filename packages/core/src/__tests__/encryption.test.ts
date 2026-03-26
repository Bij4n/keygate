import { describe, it, expect } from 'vitest';
import { EncryptionService } from '../encryption.js';

describe('EncryptionService', () => {
  const masterKey = 'test-master-key-for-encryption-tests';
  const service = new EncryptionService(masterKey);

  describe('encrypt/decrypt', () => {
    it('round-trips plaintext correctly', () => {
      const key = service.deriveConnectionKey('conn_1', 'salt_1');
      const plaintext = Buffer.from('hello world');
      const encrypted = service.encrypt(plaintext, key);
      const decrypted = service.decrypt(encrypted, key);
      expect(decrypted.toString()).toBe('hello world');
    });

    it('produces different ciphertexts for same plaintext (random IV)', () => {
      const key = service.deriveConnectionKey('conn_1', 'salt_1');
      const plaintext = Buffer.from('same data');
      const a = service.encrypt(plaintext, key);
      const b = service.encrypt(plaintext, key);
      expect(a.equals(b)).toBe(false);
    });

    it('fails to decrypt with wrong key', () => {
      const key1 = service.deriveConnectionKey('conn_1', 'salt_1');
      const key2 = service.deriveConnectionKey('conn_2', 'salt_2');
      const encrypted = service.encrypt(Buffer.from('secret'), key1);
      expect(() => service.decrypt(encrypted, key2)).toThrow();
    });

    it('handles empty plaintext', () => {
      const key = service.deriveConnectionKey('conn_1', 'salt_1');
      const encrypted = service.encrypt(Buffer.alloc(0), key);
      const decrypted = service.decrypt(encrypted, key);
      expect(decrypted.length).toBe(0);
    });

    it('handles large plaintext', () => {
      const key = service.deriveConnectionKey('conn_1', 'salt_1');
      const plaintext = Buffer.alloc(100_000, 0xab);
      const encrypted = service.encrypt(plaintext, key);
      const decrypted = service.decrypt(encrypted, key);
      expect(decrypted.equals(plaintext)).toBe(true);
    });
  });

  describe('deriveConnectionKey', () => {
    it('produces deterministic keys', () => {
      const key1 = service.deriveConnectionKey('conn_1', 'salt_1');
      const key2 = service.deriveConnectionKey('conn_1', 'salt_1');
      expect(key1.equals(key2)).toBe(true);
    });

    it('produces different keys for different connections', () => {
      const key1 = service.deriveConnectionKey('conn_1', 'salt_1');
      const key2 = service.deriveConnectionKey('conn_2', 'salt_1');
      expect(key1.equals(key2)).toBe(false);
    });

    it('produces different keys for different salts', () => {
      const key1 = service.deriveConnectionKey('conn_1', 'salt_a');
      const key2 = service.deriveConnectionKey('conn_1', 'salt_b');
      expect(key1.equals(key2)).toBe(false);
    });

    it('returns a 32-byte key', () => {
      const key = service.deriveConnectionKey('conn_1', 'salt_1');
      expect(key.length).toBe(32);
    });
  });

  describe('encryptCredentials/decryptCredentials', () => {
    it('round-trips credential objects', () => {
      const creds = { access_token: 'abc123', refresh_token: 'xyz789' };
      const encrypted = service.encryptCredentials(creds, 'conn_1', 'salt_1');
      const decrypted = service.decryptCredentials(encrypted, 'conn_1', 'salt_1');
      expect(decrypted).toEqual(creds);
    });
  });

  describe('static methods', () => {
    it('generateSalt returns a hex string', () => {
      const salt = EncryptionService.generateSalt();
      expect(salt).toMatch(/^[0-9a-f]{64}$/);
    });

    it('generateTokenValue starts with kg_ prefix', () => {
      const token = EncryptionService.generateTokenValue();
      expect(token.startsWith('kg_')).toBe(true);
      expect(token.length).toBeGreaterThan(10);
    });

    it('generateTokenValue produces unique values', () => {
      const a = EncryptionService.generateTokenValue();
      const b = EncryptionService.generateTokenValue();
      expect(a).not.toBe(b);
    });
  });
});
