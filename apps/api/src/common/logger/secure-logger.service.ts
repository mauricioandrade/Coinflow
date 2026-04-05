import { ConsoleLogger, Injectable } from "@nestjs/common";

/**
 * SecureLogger — drops-in for NestJS's default ConsoleLogger.
 *
 * Before printing any message, it recursively masks values whose keys
 * match SENSITIVE_KEYS. This prevents accidental leakage of passwords,
 * tokens, or encryption material in log output.
 *
 * Usage:
 *   app.useLogger(new SecureLogger());
 */
@Injectable()
export class SecureLogger extends ConsoleLogger {
  /**
   * Keys (case-insensitive) whose values will be replaced with [REDACTED].
   * Add more patterns as needed.
   */
  private static readonly SENSITIVE_KEYS = new Set([
    "password",
    "passwordhash",
    "hash",
    "tokenhash",
    "accesstoken",
    "refreshtoken",
    "token",
    "secret",
    "encryptedcredentials",
    "encryptionkey",
    "authorization",
    "cookie",
    "cvv",
    "cardnumber",
    "ssn",
    "cpf",
    "apikey",
    "api_key",
    "privatekey",
    "private_key",
  ]);

  private static readonly REDACTED = "[REDACTED]";

  /**
   * Masks a single value: recurses into objects/arrays, sanitizes strings
   * that look like JWTs or hex keys, leaves everything else untouched.
   */
  private maskValue(value: unknown): unknown {
    if (value === null || value === undefined) return value;

    if (typeof value === "string") {
      // Mask JWT-shaped strings (three base64url segments)
      if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
        return SecureLogger.REDACTED;
      }
      // Mask long hex strings (likely keys or encrypted blobs ≥ 32 hex chars)
      if (/^[0-9a-f]{32,}$/i.test(value)) {
        return SecureLogger.REDACTED;
      }
      // Mask AES-GCM format: <hex>:<hex>:<hex>
      if (/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(value)) {
        return SecureLogger.REDACTED;
      }
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.maskValue(item));
    }

    if (typeof value === "object") {
      return this.sanitizeObject(value as Record<string, unknown>);
    }

    return value;
  }

  private sanitizeObject(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (SecureLogger.SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = SecureLogger.REDACTED;
      } else {
        sanitized[key] = this.maskValue(value);
      }
    }

    return sanitized;
  }

  private sanitizeMessages(messages: unknown[]): unknown[] {
    return messages.map((msg) => {
      if (typeof msg === "string") return msg;
      if (typeof msg === "object" && msg !== null) {
        return this.sanitizeObject(msg as Record<string, unknown>);
      }
      return msg;
    });
  }

  override log(message: unknown, ...optionalParams: unknown[]): void {
    super.log(
      ...(this.sanitizeMessages([message, ...optionalParams]) as [
        unknown,
        ...unknown[],
      ]),
    );
  }

  override warn(message: unknown, ...optionalParams: unknown[]): void {
    super.warn(
      ...(this.sanitizeMessages([message, ...optionalParams]) as [
        unknown,
        ...unknown[],
      ]),
    );
  }

  override error(message: unknown, ...optionalParams: unknown[]): void {
    super.error(
      ...(this.sanitizeMessages([message, ...optionalParams]) as [
        unknown,
        ...unknown[],
      ]),
    );
  }

  override debug(message: unknown, ...optionalParams: unknown[]): void {
    super.debug(
      ...(this.sanitizeMessages([message, ...optionalParams]) as [
        unknown,
        ...unknown[],
      ]),
    );
  }

  override verbose(message: unknown, ...optionalParams: unknown[]): void {
    super.verbose(
      ...(this.sanitizeMessages([message, ...optionalParams]) as [
        unknown,
        ...unknown[],
      ]),
    );
  }
}
