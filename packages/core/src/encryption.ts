import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  createHash,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

export class EncryptionService {
  private rootKey: Buffer;

  constructor(masterKey: string) {
    this.rootKey = createHash('sha256').update(masterKey).digest();
  }

  deriveConnectionKey(connectionId: string, userSalt: string): Buffer {
    const salt = Buffer.from(`${connectionId}:${userSalt}`);
    return scryptSync(this.rootKey, salt, KEY_LENGTH);
  }

  encrypt(plaintext: Buffer, key: Buffer): Buffer {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]);
  }

  decrypt(ciphertext: Buffer, key: Buffer): Buffer {
    const iv = ciphertext.subarray(0, IV_LENGTH);
    const tag = ciphertext.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = ciphertext.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  encryptCredentials(
    credentials: Record<string, string>,
    connectionId: string,
    userSalt: string,
  ): Buffer {
    const key = this.deriveConnectionKey(connectionId, userSalt);
    const plaintext = Buffer.from(JSON.stringify(credentials));
    return this.encrypt(plaintext, key);
  }

  decryptCredentials(
    encrypted: Buffer,
    connectionId: string,
    userSalt: string,
  ): Record<string, string> {
    const key = this.deriveConnectionKey(connectionId, userSalt);
    const decrypted = this.decrypt(encrypted, key);
    return JSON.parse(decrypted.toString());
  }

  static generateSalt(): string {
    return randomBytes(SALT_LENGTH).toString('hex');
  }

  static generateTokenValue(): string {
    return `kg_${randomBytes(32).toString('base64url')}`;
  }
}
