import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { EncryptionService } from './encryption.service';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Valid 64-hex-char test key (32 bytes) */
const TEST_KEY = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

/**
 * Directly instantiates EncryptionService with a mocked ConfigService.
 * Avoids the NestJS DI container for pure unit-test isolation.
 */
function makeService(key: string | undefined = TEST_KEY): EncryptionService {
  const configService = {
    get: jest.fn((k: string) => (k === 'ENCRYPTION_KEY' ? key : undefined)),
  } as unknown as ConfigService;
  return new EncryptionService(configService);
}

/**
 * Splits the opaque ciphertext into its three hex-encoded parts.
 * Format: <iv_hex>:<authtag_hex>:<ciphertext_hex>
 */
function parseCiphertext(raw: string) {
  const [ivHex, authtagHex, encryptedHex] = raw.split(':');
  return { ivHex, authtagHex, encryptedHex };
}

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = makeService();
  });

  // ── Construction ──────────────────────────────────────────────────────

  describe('constructor', () => {
    it('should boot successfully with a valid 64-char hex key', () => {
      expect(makeService(TEST_KEY)).toBeDefined();
    });

    it('should throw InternalServerErrorException when key is too short', () => {
      expect(() => makeService('deadbeef')).toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when key is too long', () => {
      expect(() => makeService(TEST_KEY + 'aa')).toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when key is undefined', () => {
      // JS default params apply when undefined is passed — mock directly instead
      const configWithNoKey = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;
      expect(() => new EncryptionService(configWithNoKey)).toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when key is empty string', () => {
      expect(() => makeService('')).toThrow(InternalServerErrorException);
    });
  });

  // ── encrypt() ─────────────────────────────────────────────────────────

  describe('encrypt()', () => {
    it('should return a string with three colon-separated hex segments', () => {
      const result = service.encrypt('hello world');
      const parts = result.split(':');
      expect(parts).toHaveLength(3);
      parts.forEach((part) => expect(part).toMatch(/^[0-9a-f]+$/i));
    });

    it('should produce a different ciphertext on each call (unique IV per call)', () => {
      const plaintext = 'same plaintext every time';
      const first = service.encrypt(plaintext);
      const second = service.encrypt(plaintext);
      expect(first).not.toBe(second);
    });

    it('should produce an IV of exactly 12 bytes (24 hex chars)', () => {
      const { ivHex } = parseCiphertext(service.encrypt('test'));
      expect(ivHex).toHaveLength(24); // 12 bytes × 2 hex chars/byte
    });

    it('should produce an AuthTag of exactly 16 bytes (32 hex chars)', () => {
      const { authtagHex } = parseCiphertext(service.encrypt('test'));
      expect(authtagHex).toHaveLength(32); // 16 bytes × 2 hex chars/byte
    });
  });

  // ── decrypt() ─────────────────────────────────────────────────────────

  describe('decrypt()', () => {
    it('should decrypt a ciphertext back to the original plaintext', () => {
      const plaintext = 'super sensitive bank token';
      expect(service.decrypt(service.encrypt(plaintext))).toBe(plaintext);
    });

    it('should correctly round-trip unicode and special characters', () => {
      const plaintext = '{"token":"ação & <script>","id":"çüñ£€"}';
      expect(service.decrypt(service.encrypt(plaintext))).toBe(plaintext);
    });

    it('should round-trip an empty string', () => {
      expect(service.decrypt(service.encrypt(''))).toBe('');
    });

    it('should throw InternalServerErrorException when format has fewer than 3 parts', () => {
      expect(() => service.decrypt('onlyone')).toThrow(InternalServerErrorException);
      expect(() => service.decrypt('two:parts')).toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when format has more than 3 parts', () => {
      expect(() => service.decrypt('a:b:c:d')).toThrow(InternalServerErrorException);
    });

    it('should throw when the AuthTag is tampered (GCM integrity check fails)', () => {
      const ciphertext = service.encrypt('sensitive payload');
      const { ivHex, authtagHex, encryptedHex } = parseCiphertext(ciphertext);

      const tamperedTag = Buffer.from(authtagHex, 'hex').map((b) => b ^ 0xff);
      const tampered = [ivHex, tamperedTag.toString('hex'), encryptedHex].join(':');

      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('should throw when the IV is replaced with a different random IV', () => {
      const ciphertext = service.encrypt('sensitive payload');
      const { authtagHex, encryptedHex } = parseCiphertext(ciphertext);

      const wrongIv = randomBytes(12).toString('hex');
      const tampered = [wrongIv, authtagHex, encryptedHex].join(':');

      // GCM authentication will fail — wrong IV changes the GHASH computation
      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('should throw when the ciphertext body is bit-flipped', () => {
      const ciphertext = service.encrypt('sensitive payload');
      const { ivHex, authtagHex, encryptedHex } = parseCiphertext(ciphertext);

      const tamperedBody = Buffer.from(encryptedHex, 'hex').map((b) => b ^ 0x01);
      const tampered = [ivHex, authtagHex, tamperedBody.toString('hex')].join(':');

      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('should throw when decrypting with a different key', () => {
      const plaintext = 'owned by key-A';
      const ciphertext = service.encrypt(plaintext);

      // Different valid 64-char key
      const otherKey = 'f9e8d7c6b5a4039281706150e4f3d2c1f9e8d7c6b5a4039281706150e4f3d2c1';
      const otherService = makeService(otherKey);

      expect(() => otherService.decrypt(ciphertext)).toThrow();
    });
  });

  // ── hashToken() ───────────────────────────────────────────────────────

  describe('hashToken()', () => {
    it('should return a 64-character lowercase hex string (SHA-256 output)', () => {
      const hash = service.hashToken('myRefreshToken');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic — same input always produces the same hash', () => {
      const token = 'stable-token-value';
      expect(service.hashToken(token)).toBe(service.hashToken(token));
    });

    it('should produce different hashes for different inputs (collision-resistant)', () => {
      expect(service.hashToken('tokenA')).not.toBe(service.hashToken('tokenB'));
    });

    it('should be one-way — the hash must not equal the raw input', () => {
      const token = 'myPlainToken';
      expect(service.hashToken(token)).not.toBe(token);
    });
  });
});
