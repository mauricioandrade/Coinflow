import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface JwtPayload {
  /** User CUID — the subject of the token */
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * JwtStrategy — validates Bearer tokens on every protected route.
 *
 * Registered as the 'jwt' strategy used by JwtAuthGuard.
 * Without this provider registered in the module tree, the guard throws
 * "Unknown authentication strategy 'jwt'" → 500 on every protected route.
 *
 * Security contracts:
 * - Token is extracted from the Authorization: Bearer header only (no query params)
 * - Expiration is always enforced (ignoreExpiration: false)
 * - Secret is read from ConfigService — never hardcoded
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService) {
    const secret = config.get<string>("JWT_SECRET");

    if (!secret) {
      throw new Error(
        "JWT_SECRET is not configured. Set it in your .env file.",
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Called by Passport after the token signature and expiry are verified.
   * The return value is attached to req.user.
   *
   * Keep this lean — do NOT query the database here on every request.
   * Add a database lookup only if you need to verify the user is still active
   * (e.g., after account suspension). If you do, cache the result.
   */
  validate(payload: JwtPayload): { id: string; email: string } {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException("Malformed token payload.");
    }

    return { id: payload.sub, email: payload.email };
  }
}
