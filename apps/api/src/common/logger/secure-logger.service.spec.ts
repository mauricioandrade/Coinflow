import { ConsoleLogger } from "@nestjs/common";
import { SecureLogger } from "./secure-logger.service";

// ── Helpers ────────────────────────────────────────────────────────────────

const REDACTED = "[REDACTED]";

/**
 * Captures what SecureLogger passes to ConsoleLogger.prototype.<method>.
 * Returns the first argument received by the parent method.
 */
function spyOnParentMethod(
  methodName: "log" | "warn" | "error" | "debug" | "verbose",
): jest.SpyInstance {
  return jest
    .spyOn(ConsoleLogger.prototype, methodName)
    .mockImplementation(() => {});
}

// ── Test Suite ─────────────────────────────────────────────────────────────

describe("SecureLogger", () => {
  let logger: SecureLogger;

  beforeEach(() => {
    logger = new SecureLogger("Test");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Sensitive key redaction ────────────────────────────────────────────

  describe("sensitive key masking", () => {
    it('should redact the "password" key', () => {
      const spy = spyOnParentMethod("log");
      logger.log({ password: "super_secret_123", name: "Alice" });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ password: REDACTED, name: "Alice" }),
      );
    });

    it('should redact the "cpf" key (Brazilian personal identifier)', () => {
      const spy = spyOnParentMethod("log");
      logger.log({ cpf: "123.456.789-00", action: "login" });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ cpf: REDACTED, action: "login" }),
      );
    });

    it('should redact the "cardNumber" key (credit card)', () => {
      const spy = spyOnParentMethod("log");
      logger.log({ cardNumber: "4111111111111111", amount: 100 });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ cardNumber: REDACTED }),
      );
    });

    it('should redact the "token" key', () => {
      const spy = spyOnParentMethod("log");
      logger.log({ token: "raw-refresh-token-value", userId: "abc" });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ token: REDACTED, userId: "abc" }),
      );
    });

    it('should redact the "accessToken" key', () => {
      const spy = spyOnParentMethod("log");
      logger.log({ accessToken: "bearer.token.here", userId: "abc" });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: REDACTED }),
      );
    });

    it('should redact the "encryptedCredentials" key', () => {
      const spy = spyOnParentMethod("log");
      logger.log({
        encryptedCredentials: "aabbcc:ddeeff:001122",
        institutionId: "itau",
      });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ encryptedCredentials: REDACTED }),
      );
    });

    it('should redact keys case-insensitively (e.g., "PASSWORD", "Token")', () => {
      const spy = spyOnParentMethod("log");
      // Keys are lowercased before set lookup — test mixed case
      logger.log({ PASSWORD: "secret1", Token: "secret2" });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ PASSWORD: REDACTED, Token: REDACTED }),
      );
    });
  });

  // ── Value-pattern masking ──────────────────────────────────────────────

  describe("value-pattern masking", () => {
    it("should redact JWT-shaped string values (three base64url segments)", () => {
      const spy = spyOnParentMethod("log");
      const jwt =
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMSJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      logger.log({ authHeader: jwt });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ authHeader: REDACTED }),
      );
    });

    it("should redact long hex strings (>= 32 chars) — likely keys or ciphertext", () => {
      const spy = spyOnParentMethod("log");
      const hexKey =
        "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9";
      logger.log({ rawKey: hexKey });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ rawKey: REDACTED }),
      );
    });

    it("should NOT redact short hex strings (< 32 chars) — e.g., a CUID prefix", () => {
      const spy = spyOnParentMethod("log");
      logger.log({ shortHex: "deadbeef1234" }); // 12 chars — safe
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ shortHex: "deadbeef1234" }),
      );
    });

    it("should redact AES-GCM formatted strings (<hex>:<hex>:<hex>)", () => {
      const spy = spyOnParentMethod("log");
      const aesCiphertext = "aabbccdd:eeff0011:22334455667788";
      logger.log({ blob: aesCiphertext });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ blob: REDACTED }),
      );
    });

    it("should pass through ordinary string values", () => {
      const spy = spyOnParentMethod("log");
      logger.log({ message: "User created successfully", userId: "cldx1234" });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ message: "User created successfully" }),
      );
    });
  });

  // ── Deep object/array sanitization ────────────────────────────────────

  describe("deep sanitization", () => {
    it("should recursively sanitize nested objects", () => {
      const spy = spyOnParentMethod("log");
      logger.log({
        user: {
          name: "Bob",
          credentials: {
            password: "p@ssw0rd",
            cpf: "000.000.000-00",
          },
        },
      });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          user: expect.objectContaining({
            name: "Bob",
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            credentials: expect.objectContaining({
              password: REDACTED,
              cpf: REDACTED,
            }),
          }),
        }),
      );
    });

    it("should sanitize objects inside arrays", () => {
      const spy = spyOnParentMethod("log");
      logger.log({
        users: [
          { name: "Alice", password: "abc" },
          { name: "Bob", password: "xyz" },
        ],
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const received = spy.mock.calls[0][0] as {
        users: Array<{ name: string; password: string }>;
      };
      expect(received.users[0].password).toBe(REDACTED);
      expect(received.users[1].password).toBe(REDACTED);
      expect(received.users[0].name).toBe("Alice");
    });
  });

  // ── Plain string messages ──────────────────────────────────────────────

  describe("plain string messages", () => {
    it("should pass through plain string messages untouched", () => {
      const spy = spyOnParentMethod("log");
      logger.log("Server started on port 3000");
      expect(spy).toHaveBeenCalledWith("Server started on port 3000");
    });

    it("should pass through numeric messages untouched", () => {
      const spy = spyOnParentMethod("log");
      logger.log(42);
      expect(spy).toHaveBeenCalledWith(42);
    });
  });

  // ── All log-level methods sanitize ────────────────────────────────────

  describe("all log levels sanitize sensitive data", () => {
    const sensitivePayload = { password: "should-be-redacted", action: "test" };

    it("warn() should sanitize", () => {
      const spy = spyOnParentMethod("warn");
      logger.warn(sensitivePayload);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ password: REDACTED }),
      );
    });

    it("error() should sanitize", () => {
      const spy = spyOnParentMethod("error");
      logger.error(sensitivePayload);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ password: REDACTED }),
      );
    });

    it("debug() should sanitize", () => {
      const spy = spyOnParentMethod("debug");
      logger.debug(sensitivePayload);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ password: REDACTED }),
      );
    });

    it("verbose() should sanitize", () => {
      const spy = spyOnParentMethod("verbose");
      logger.verbose(sensitivePayload);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ password: REDACTED }),
      );
    });
  });
});
