import { Controller, Get, Module, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import request from "supertest";
import { Public } from "../../src/common/decorators/public.decorator";
import { initTestApp } from "../helpers/create-test-app";
import { TestJwtModule } from "../helpers/test-jwt.helper";

// ── Inline Test Controller ─────────────────────────────────────────────────

/**
 * Minimal controller for testing headers.
 * - ping() is @Public() → always 200 for header inspection
 * - secret() has NO @Public() → JwtAuthGuard returns 401 (route EXISTS but is protected)
 */
@Controller("health")
class HealthController {
  @Get()
  @Public()
  ping() {
    return { status: "ok" };
  }

  @Get("secret")
  // deliberately no @Public() — guard will return 401
  getSecret() {
    return { data: "classified" };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env.test" }),
    TestJwtModule,
  ],
  controllers: [HealthController],
})
class HeadersTestModule {}

// ── Test Suite ─────────────────────────────────────────────────────────────

describe("Security Headers & CORS (E2E)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [HeadersTestModule],
    }).compile();

    app = await initTestApp(moduleFixture);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Helmet headers ────────────────────────────────────────────────────

  describe("Helmet security headers", () => {
    it("should set x-content-type-options: nosniff", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/health")
        .expect(200);

      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });

    it("should set content-security-policy header", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/health")
        .expect(200);

      expect(res.headers["content-security-policy"]).toBeDefined();
      // Our CSP must include default-src 'self'
      expect(res.headers["content-security-policy"]).toContain(
        "default-src 'self'",
      );
    });

    it("should NOT expose x-powered-by header (technology stack hidden)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/health")
        .expect(200);

      expect(res.headers["x-powered-by"]).toBeUndefined();
    });

    it("should set cross-origin-opener-policy: same-origin", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/health")
        .expect(200);

      expect(res.headers["cross-origin-opener-policy"]).toBe("same-origin");
    });

    it("should set cross-origin-resource-policy: same-origin", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/health")
        .expect(200);

      expect(res.headers["cross-origin-resource-policy"]).toBe("same-origin");
    });

    it("should set x-dns-prefetch-control header", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/health")
        .expect(200);

      // Helmet sets this to 'off' by default
      expect(res.headers["x-dns-prefetch-control"]).toBeDefined();
    });
  });

  // ── Helmet headers on 401 responses ───────────────────────────────────

  describe("Helmet headers on non-200 responses", () => {
    it("should include x-content-type-options even on 401 Unauthorized responses", async () => {
      // Access a protected route (exists, but no @Public()) without a token
      const res = await request(app.getHttpServer())
        .get("/api/v1/health/secret")
        .expect(401);

      // Helmet headers must be present regardless of response status
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });
  });

  // ── CORS ──────────────────────────────────────────────────────────────

  describe("CORS configuration", () => {
    it("should include access-control-allow-origin for an allowed origin", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/health")
        .set("Origin", "http://localhost:3000") // in CORS_ALLOWED_ORIGINS
        .expect(200);

      expect(res.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000",
      );
    });

    it("should allow credentials (access-control-allow-credentials: true)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/health")
        .set("Origin", "http://localhost:3000")
        .expect(200);

      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("should respond to CORS preflight with 204 and allow-methods header", async () => {
      const res = await request(app.getHttpServer())
        .options("/api/v1/health")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "GET")
        .expect(204);

      expect(res.headers["access-control-allow-methods"]).toBeDefined();
    });

    it("should NOT set access-control-allow-origin for a disallowed origin", async () => {
      // We expect either no CORS header or an error response
      const res = await request(app.getHttpServer())
        .get("/api/v1/health")
        .set("Origin", "http://evil.attacker.com");

      // The origin must NOT be reflected back
      expect(res.headers["access-control-allow-origin"]).not.toBe(
        "http://evil.attacker.com",
      );
    });

    it("should allow the Authorization and Content-Type request headers", async () => {
      const res = await request(app.getHttpServer())
        .options("/api/v1/health")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "Authorization, Content-Type");

      const allowedHeaders = res.headers["access-control-allow-headers"] ?? "";
      expect(allowedHeaders.toLowerCase()).toContain("authorization");
      expect(allowedHeaders.toLowerCase()).toContain("content-type");
    });
  });
});
