import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'node:crypto';

/**
 * EncryptionService — AES-256-GCM symmetric encryption for sensitive data
 * at rest (e.g., Open Finance bank tokens).
 *
 * Storage format (colon-separated hex strings):
 *   <iv_hex>:<authtag_hex>:<ciphertext_hex>
 *
 * - IV:      12 bytes (96-bit) — randomly generated per encryption call
 * - AuthTag: 16 bytes (128-bit) — GCM authentication tag
 * - Key:     32 bytes derived from ENCRYPTION_KEY env var (must be 64 hex chars)
 *
 * NEVER log the output of encrypt() or the input of decrypt().
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm' as const;
  private readonly IV_BYTES = 12;
  private readonly AUTH_TAG_BYTES = 16;

  constructor(private readonly config: ConfigService) {
    const hexKey = this.config.get<string>('ENCRYPTION_KEY');

    if (!hexKey || hexKey.length !== 64) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).',
      );
    }

    this.key = Buffer.from(hexKey, 'hex');
  }

  /**
   * Encrypts a plaintext string.
   * @returns Opaque string: `<iv_hex>:<authtag_hex>:<ciphertext_hex>`
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(this.IV_BYTES);
    const cipher = createCipheriv(this.ALGORITHM, this.key, iv, {
      authTagLength: this.AUTH_TAG_BYTES,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authtag = cipher.getAuthTag();

    return [iv.toString('hex'), authtag.toString('hex'), encrypted.toString('hex')].join(':');
  }

  /**
   * Decrypts a ciphertext produced by `encrypt()`.
   * Throws if the ciphertext is tampered (GCM auth tag mismatch).
   */
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');

    if (parts.length !== 3) {
      throw new InternalServerErrorException('Invalid ciphertext format.');
    }

    const [ivHex, authtagHex, encryptedHex] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authtag = Buffer.from(authtagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = createDecipheriv(this.ALGORITHM, this.key, iv, {
      authTagLength: this.AUTH_TAG_BYTES,
    });
    decipher.setAuthTag(authtag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Hashes a token with SHA-256 for safe storage (e.g., refresh tokens).
   * The hash is one-way — use this for lookup, never for decryption.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
