import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

/**
 * HoneypotMiddleware — traps automated scanners and attackers.
 *
 * Routes listed in HONEYPOT_PATHS are intentionally invisible to legitimate
 * users. Any request hitting them is almost certainly an automated scanner,
 * brute-force tool, or attacker probing for known vulnerabilities.
 *
 * On detection:
 *  1. The offending IP is blocked for HONEYPOT_BLOCK_DURATION_MS (default 1h).
 *  2. A security warning is logged (IP + path only — no body/headers logged).
 *  3. The request receives a generic 404 to avoid revealing the trap.
 *
 * Additionally, every incoming request is checked against the blocked-IP set
 * and rejected with 403 until the block expires.
 *
 * NOTE: This is an in-memory block list. In production, back this with Redis
 * and integrate with a WAF (e.g., Cloudflare) for persistence across restarts.
 */
@Injectable()
export class HoneypotMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HoneypotMiddleware.name);
  private readonly blockedIps = new Map<string, number>(); // ip -> block expiry timestamp
  private readonly blockDurationMs: number;

  /**
   * Decoy paths — chosen to match common scanner probes.
   * Extend this list as needed.
   */
  private static readonly HONEYPOT_PATHS = new Set([
    '/api/v1/wp-admin',
    '/wp-admin',
    '/wp-login.php',
    '/admin',
    '/administrator',
    '/phpmyadmin',
    '/phpMyAdmin',
    '/xmlrpc.php',
    '/.env',
    '/.git/config',
    '/actuator',
    '/actuator/health',
    '/api/v1/config',
    '/api/v1/debug',
    '/api/v1/test',
    '/api/v1/users/admin',
    '/console',
    '/manager/html',
    '/server-status',
  ]);

  constructor(private readonly config: ConfigService) {
    this.blockDurationMs = this.config.get<number>('HONEYPOT_BLOCK_DURATION_MS') ?? 3_600_000;
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const ip = this.resolveIp(req);
    const path = req.path;

    // Check if this IP is already blocked
    const blockExpiry = this.blockedIps.get(ip);
    if (blockExpiry !== undefined) {
      if (Date.now() < blockExpiry) {
        this.logger.warn(`Blocked IP attempted access: ip=${ip} path=${path}`);
        res.status(403).json({ statusCode: 403, message: 'Forbidden' });
        return;
      }
      // Block expired — remove it
      this.blockedIps.delete(ip);
    }

    // Check if request hits a honeypot path
    if (HoneypotMiddleware.HONEYPOT_PATHS.has(path)) {
      const expiry = Date.now() + this.blockDurationMs;
      this.blockedIps.set(ip, expiry);

      this.logger.warn(
        `[HONEYPOT] Scanner detected and blocked: ip=${ip} path=${path} ` +
          `blocked_until=${new Date(expiry).toISOString()}`,
      );

      // Respond with 404 — do not reveal this is a honeypot
      res.status(404).json({ statusCode: 404, message: 'Not Found' });
      return;
    }

    next();
  }

  private resolveIp(req: Request): string {
    // Respect X-Forwarded-For only if behind a trusted proxy
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress ?? 'unknown';
  }
}
