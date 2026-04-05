import { Controller, Get, Module, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { Public } from "../../src/common/decorators/public.decorator";
import { initTestApp } from "../helpers/create-test-app";
import { TestJwtModule, TEST_USER_PAYLOAD } from "../helpers/test-jwt.helper";

// ── Inline Test Controllers ────────────────────────────────────────────────

/** Protected: no @Public() → JwtAuthGuard returns 401 without a valid token */
@Controller("auth-test")
class ProtectedController {
  @Get("protected")
  getProtected() {
    return { data: "private data — you are authenticated" };
  }
}

/** Public: @Public() → JwtAuthGuard short-circuits, no token required */
@Controller("auth-test")
class PublicController {
  @Get("public")
  @Public()
  getPublic() {
    return { data: "public data — no authentication needed" };
  }
}

// ── Test Module ────────────────────────────────────────────────────────────

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env.test" }),
    TestJwtModule,
  ],
  controllers: [ProtectedController, PublicController],
})
class AuthTestModule {}

// ── Test Suite ─────────────────────────────────────────────────────────────

describe("JwtAuthGuard (E2E)", () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let validToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AuthTestModule],
    }).compile();

    app = await initTestApp(moduleFixture);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    validToken = jwtService.sign(TEST_USER_PAYLOAD);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Protected route — no token ─────────────────────────────────────────

  describe("Protected route without JWT", () => {
    it("should return 401 when no Authorization header is provided", () => {
      return request(app.getHttpServer())
        .get("/api/v1/auth-test/protected")
        .expect(401);
    });

    it("should return 401 when Authorization header is malformed", () => {
      return request(app.getHttpServer())
        .get("/api/v1/auth-test/protected")
        .set("Authorization", "NotBearer definitely-not-a-token")
        .expect(401);
    });

    it("should return 401 when token is signed with a wrong secret", () => {
      const fakeToken = jwtService.sign(TEST_USER_PAYLOAD, {
        secret: "wrong-secret-entirely",
      });
      return request(app.getHttpServer())
        .get("/api/v1/auth-test/protected")
        .set("Authorization", `Bearer ${fakeToken}`)
        .expect(401);
    });

    it("should return 401 when token has expired", () => {
      const expiredToken = jwtService.sign(TEST_USER_PAYLOAD, {
        expiresIn: "-1s",
      });
      return request(app.getHttpServer())
        .get("/api/v1/auth-test/protected")
        .set("Authorization", `Bearer ${expiredToken}`)
        .expect(401);
    });

    it("should return 401 when token is a random string", () => {
      return request(app.getHttpServer())
        .get("/api/v1/auth-test/protected")
        .set("Authorization", "Bearer this.is.garbage")
        .expect(401);
    });
  });

  // ── Protected route — valid token ─────────────────────────────────────

  describe("Protected route with valid JWT", () => {
    it("should return 200 when a valid signed JWT is provided", () => {
      return request(app.getHttpServer())
        .get("/api/v1/auth-test/protected")
        .set("Authorization", `Bearer ${validToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("data");
        });
    });
  });

  // ── @Public() bypass ──────────────────────────────────────────────────

  describe("@Public() route", () => {
    it("should return 200 without any Authorization header", () => {
      return request(app.getHttpServer())
        .get("/api/v1/auth-test/public")
        .expect(200);
    });

    it("should return 200 even when an invalid token is provided (@Public bypasses guard)", () => {
      return request(app.getHttpServer())
        .get("/api/v1/auth-test/public")
        .set("Authorization", "Bearer invalid.token.here")
        .expect(200);
    });

    it("should return 200 when a valid token is also provided", () => {
      return request(app.getHttpServer())
        .get("/api/v1/auth-test/public")
        .set("Authorization", `Bearer ${validToken}`)
        .expect(200);
    });
  });
});
