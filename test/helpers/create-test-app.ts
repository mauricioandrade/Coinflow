import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';

/**
 * Applies the exact same security configuration that main.ts applies
 * to a NestJS test application:
 *   - Helmet (security headers)
 *   - Restrictive CORS (from .env.test)
 *   - Global ValidationPipe (whitelist + transform)
 *   - Global ClassSerializerInterceptor (@Exclude() support)
 *   - Global JwtAuthGuard (all routes private by default)
 *   - Global prefix api/v1
 *
 * Usage:
 *   const app = await applySecuritySetup(moduleFixture.createNestApplication());
 *   await app.init();
 */
export async function applySecuritySetup(app: INestApplication): Promise<INestApplication> {
  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
  const rawOrigins = config.get<string>('CORS_ALLOWED_ORIGINS') ?? '';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // ── Helmet ──────────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      hidePoweredBy: true,
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin && nodeEnv !== 'production') {
        return callback(null, true);
      }
      if (origin && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin '${origin}' not allowed`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });

  // ── Global prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validation ───────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── Serialization (ClassSerializerInterceptor) ──────────────────────────
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ── JWT Auth Guard (all routes private by default) ─────────────────────
  app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector)));

  return app;
}

/**
 * Convenience wrapper: apply setup + init + return the TestingModule ref.
 */
export async function initTestApp(
  moduleFixture: TestingModule,
): Promise<INestApplication> {
  const app = moduleFixture.createNestApplication();
  await applySecuritySetup(app);
  await app.init();
  return app;
}
