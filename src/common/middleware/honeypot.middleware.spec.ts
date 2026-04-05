import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import { HoneypotMiddleware } from "./honeypot.middleware";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeMiddleware(blockDurationMs = 3_600_000): HoneypotMiddleware {
  const configService = {
    get: jest.fn((key: string) =>
      key === "HONEYPOT_BLOCK_DURATION_MS" ? blockDurationMs : undefined,
    ),
  } as unknown as ConfigService;
  return new HoneypotMiddleware(configService);
}

/**
 * Creates a minimal mock Request.
 * Uses req.ip (set by Express trust proxy) — NOT raw X-Forwarded-For.
 * Defaults to IP '1.2.3.4'.
 */
function mockReq(path: string, options: { ip?: string } = {}): Request {
  const resolvedIp = options.ip ?? "1.2.3.4";
  return {
    path,
    headers: {},
    // Express populates req.ip from X-Forwarded-For based on trust proxy config.
    // In tests we set it directly, simulating what Express would compute.
    ip: resolvedIp,
    socket: { remoteAddress: resolvedIp },
  } as unknown as Request;
}

/**
 * Creates a mock Response that records status() and json() calls.
 * Returns the mock functions so tests can assert on them directly.
 */
function mockRes() {
  const jsonFn = jest.fn();
  const statusFn = jest.fn().mockReturnValue({ json: jsonFn });
  const res = { status: statusFn } as unknown as Response;
  return { res, statusFn, jsonFn };
}

// ── Test Suite ─────────────────────────────────────────────────────────────

describe("HoneypotMiddleware", () => {
  let middleware: HoneypotMiddleware;
  let next: jest.Mock;

  beforeEach(() => {
    middleware = makeMiddleware();
    next = jest.fn();
    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  // ── Legitimate paths ──────────────────────────────────────────────────

  describe("legitimate paths", () => {
    it("should call next() for a normal API path", () => {
      middleware.use(mockReq("/api/v1/accounts"), mockRes().res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should call next() for the root path", () => {
      middleware.use(mockReq("/"), mockRes().res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should NOT set a response status for legitimate paths", () => {
      const { res, statusFn } = mockRes();
      middleware.use(mockReq("/api/v1/users/me"), res, next);
      expect(statusFn).not.toHaveBeenCalled();
    });
  });

  // ── Honeypot path detection ────────────────────────────────────────────

  describe("honeypot path detection", () => {
    it("should return 404 for /api/v1/wp-admin and NOT call next()", () => {
      const { res, statusFn } = mockRes();
      middleware.use(mockReq("/api/v1/wp-admin"), res, next);
      expect(statusFn).toHaveBeenCalledWith(404);
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 404 for /.env", () => {
      const { res, statusFn } = mockRes();
      middleware.use(mockReq("/.env"), res, next);
      expect(statusFn).toHaveBeenCalledWith(404);
    });

    it("should return 404 for /phpmyadmin", () => {
      const { res, statusFn } = mockRes();
      middleware.use(mockReq("/phpmyadmin"), res, next);
      expect(statusFn).toHaveBeenCalledWith(404);
    });

    it("should return 404 for /.git/config", () => {
      const { res, statusFn } = mockRes();
      middleware.use(mockReq("/.git/config"), res, next);
      expect(statusFn).toHaveBeenCalledWith(404);
    });

    it("should return 404 for /wp-login.php", () => {
      const { res, statusFn } = mockRes();
      middleware.use(mockReq("/wp-login.php"), res, next);
      expect(statusFn).toHaveBeenCalledWith(404);
    });

    it("should respond with a generic body that does NOT reveal the honeypot", () => {
      const { res, jsonFn } = mockRes();
      middleware.use(mockReq("/api/v1/wp-admin"), res, next);
      expect(jsonFn).toHaveBeenCalledWith({
        statusCode: 404,
        message: "Not Found",
      });
    });
  });

  // ── IP blocking ───────────────────────────────────────────────────────

  describe("IP blocking after honeypot trigger", () => {
    const ATTACKER_IP = "10.0.0.99";

    it("should return 403 on subsequent requests from the blocked IP (any path)", () => {
      // First request: triggers the trap
      middleware.use(
        mockReq("/wp-admin", { ip: ATTACKER_IP }),
        mockRes().res,
        jest.fn(),
      );

      // Second request: same IP, legitimate path
      const { res, statusFn } = mockRes();
      middleware.use(
        mockReq("/api/v1/accounts", { ip: ATTACKER_IP }),
        res,
        next,
      );

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("should NOT block a different IP that never touched a honeypot path", () => {
      // Attacker
      middleware.use(
        mockReq("/wp-admin", { ip: "5.5.5.5" }),
        mockRes().res,
        jest.fn(),
      );

      // Innocent user on a different IP
      const { res, statusFn } = mockRes();
      middleware.use(
        mockReq("/api/v1/transactions", { ip: "9.9.9.9" }),
        res,
        next,
      );

      expect(statusFn).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should unblock an IP after the block duration expires", () => {
      jest.useFakeTimers();

      const SHORT_BLOCK = 1_000; // 1 second
      const shortMiddleware = makeMiddleware(SHORT_BLOCK);
      jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});

      const ip = "77.77.77.77";

      // Trigger the honeypot
      shortMiddleware.use(
        mockReq("/wp-admin", { ip }),
        mockRes().res,
        jest.fn(),
      );

      // Advance past the block window
      jest.advanceTimersByTime(SHORT_BLOCK + 1);

      // Should now be allowed through
      const { res, statusFn } = mockRes();
      shortMiddleware.use(mockReq("/api/v1/health", { ip }), res, next);

      expect(statusFn).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ── IP resolution ─────────────────────────────────────────────────────
  // NOTE: X-Forwarded-For parsing is now delegated to Express via the
  // `trust proxy` setting in main.ts. The middleware reads req.ip which
  // Express populates correctly — no manual header parsing.

  describe("IP resolution", () => {
    it("should use req.ip (set by Express trust proxy) as the canonical client IP", () => {
      const clientIp = "203.0.113.5";

      // Trigger honeypot — middleware reads req.ip directly
      middleware.use(
        mockReq("/wp-admin", { ip: clientIp }),
        mockRes().res,
        jest.fn(),
      );

      // Same IP on a follow-up request must be blocked
      const { res, statusFn } = mockRes();
      middleware.use(mockReq("/api/v1/accounts", { ip: clientIp }), res, next);

      expect(statusFn).toHaveBeenCalledWith(403);
    });

    it("should fall back to socket.remoteAddress when req.ip is absent", () => {
      const ip = "192.168.1.100";
      // Simulate a request where Express didn't populate req.ip
      const reqWithoutIp = {
        path: "/wp-admin",
        headers: {},
        socket: { remoteAddress: ip },
      } as unknown as Request;
      middleware.use(reqWithoutIp, mockRes().res, jest.fn());

      const followUp = {
        path: "/api/v1/health",
        headers: {},
        socket: { remoteAddress: ip },
      } as unknown as Request;
      const { res, statusFn } = mockRes();
      middleware.use(followUp, res, next);

      expect(statusFn).toHaveBeenCalledWith(403);
    });
  });
});
