import { NestFactory, Reflector } from "@nestjs/core";
import { ValidationPipe, ClassSerializerInterceptor } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { SecureLogger } from "./common/logger/secure-logger.service";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";

async function bootstrap(): Promise<void> {
  // Boot with the secure logger — replaces NestJS default before any output
  const logger = new SecureLogger("Bootstrap");

  const app = await NestFactory.create(AppModule, {
    logger,
    // Suppress default NestJS banner to avoid leaking version info
    bufferLogs: true,
  });
  app.useLogger(logger);

  const config = app.get(ConfigService);
  const port = config.get<number>("PORT") ?? 3000;
  const nodeEnv = config.get<string>("NODE_ENV") ?? "development";

  // ── Trust Proxy ────────────────────────────────────────────────────────
  // Tells Express to trust the X-Forwarded-For header from exactly ONE
  // upstream proxy (e.g., Cloudflare → server). With this set, req.ip
  // is populated correctly and header forgery from clients is prevented:
  // Express only trusts the rightmost N IPs in the X-Forwarded-For chain.
  //
  // IMPORTANT: Adjust the number to match your actual proxy depth.
  // Behind Cloudflare only: set to 1 (or use 'cloudflare' with a package).
  // Without a proxy (direct): set to 0 or false.
  (
    app.getHttpAdapter().getInstance() as {
      set: (key: string, value: unknown) => void;
    }
  ).set("trust proxy", 1);

  // ── Security Headers (Helmet) ──────────────────────────────────────────
  // Sets X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security,
  // X-XSS-Protection, Referrer-Policy, and more.
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
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-origin" },
      // Hide the technology stack
      hidePoweredBy: true,
    }),
  );

  // ── CORS ───────────────────────────────────────────────────────────────
  // Origins are read exclusively from the environment — never hardcoded.
  const rawOrigins = config.get<string>("CORS_ALLOWED_ORIGINS") ?? "";
  const allowedOrigins = rawOrigins
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // No Origin header = not a browser cross-origin request.
      // Legitimate sources: mobile apps, server-to-server calls, CLI tools.
      // These cannot be CSRF'd (no automatic cookie forwarding), so CORS
      // protection is irrelevant. Behaviour is identical in all environments.
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin '${origin}' not allowed`), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400, // Pre-flight cache: 24h
  });

  // ── Global API Prefix ──────────────────────────────────────────────────
  app.setGlobalPrefix("api/v1");

  // ── Global Validation Pipe ─────────────────────────────────────────────
  // Strips unknown properties and validates/transforms incoming DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties silently
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true, // Auto-transform payloads to DTO classes
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global Serializer Interceptor ─────────────────────────────────────
  // Works with @Exclude() decorators on DTO/entity classes to prevent
  // sensitive fields (password, tokenHash, encryptedCredentials) from
  // leaking into API responses.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ── Global JWT Auth Guard ─────────────────────────────────────────────
  // All routes are PRIVATE by default. Use @Public() to opt out.
  app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector)));

  await app.listen(port);

  logger.log(`Coinflow API running on port ${port} [${nodeEnv}]`, "Bootstrap");
}

void bootstrap();
