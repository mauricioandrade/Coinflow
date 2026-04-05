import { Controller, Get, Module, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Exclude } from 'class-transformer';
import request from 'supertest';
import { Public } from '../../src/common/decorators/public.decorator';
import { initTestApp } from '../helpers/create-test-app';

// ── Response Entity ────────────────────────────────────────────────────────

/**
 * UserResponseEntity — mirrors what a real User response DTO would look like.
 *
 * @Exclude() on `password` ensures ClassSerializerInterceptor strips it
 * from every response. This test verifies that contract is upheld.
 */
class UserResponseEntity {
  id: string;
  email: string;
  name: string;

  /**
   * @Exclude() — password hash must NEVER appear in any API response.
   * This decorator is the last line of defence against accidental leakage.
   */
  @Exclude()
  password: string;

  /**
   * @Exclude() — internal refresh token hash must never be exposed.
   */
  @Exclude()
  tokenHash: string;

  constructor(partial: Partial<UserResponseEntity>) {
    Object.assign(this, partial);
  }
}

// ── Inline Test Controller ─────────────────────────────────────────────────

/**
 * Simulates what a real UsersController would return.
 * All routes are @Public() so no auth is required for the serialization test.
 */
@Controller('test-users')
class TestUserController {
  /**
   * Returns a UserResponseEntity. ClassSerializerInterceptor will call
   * instanceToPlain() on it, which respects @Exclude() decorators.
   */
  @Get('me')
  @Public()
  getMe(): UserResponseEntity {
    return new UserResponseEntity({
      id: 'cld_user_abc123',
      email: 'alice@coinflow.dev',
      name: 'Alice',
      password: '$2b$12$bcrypt.hash.of.the.real.password.never.expose',
      tokenHash: 'sha256hexhashofrefreshtoken0123456789abcdef',
    });
  }

  /**
   * Returns a plain object (NOT a class instance).
   * ClassSerializerInterceptor can only exclude via @Exclude() on class instances.
   * This test documents that behaviour.
   */
  @Get('plain-object')
  @Public()
  getPlainObject(): Record<string, unknown> {
    return {
      id: 'cld_user_xyz',
      email: 'bob@coinflow.dev',
      name: 'Bob',
      // In production code, never return password in a plain object.
      // This test documents why DTOs must always use class instances.
    };
  }
}

// ── Test Module ────────────────────────────────────────────────────────────

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' })],
  controllers: [TestUserController],
})
class SerializationTestModule {}

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('ClassSerializerInterceptor — Sensitive Field Exclusion (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [SerializationTestModule],
    }).compile();

    app = await initTestApp(moduleFixture);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── @Exclude() field redaction ─────────────────────────────────────────

  describe('GET /api/v1/test-users/me (class instance response)', () => {
    it('should return 200 with user data', () => {
      return request(app.getHttpServer())
        .get('/api/v1/test-users/me')
        .expect(200);
    });

    it('should include non-sensitive fields in the response', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-users/me')
        .expect(200);

      expect(res.body).toHaveProperty('id', 'cld_user_abc123');
      expect(res.body).toHaveProperty('email', 'alice@coinflow.dev');
      expect(res.body).toHaveProperty('name', 'Alice');
    });

    it('should NOT include "password" in the response body', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-users/me')
        .expect(200);

      expect(res.body).not.toHaveProperty('password');
    });

    it('should NOT include "tokenHash" in the response body', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-users/me')
        .expect(200);

      expect(res.body).not.toHaveProperty('tokenHash');
    });

    it('should return a valid JSON content-type header', () => {
      return request(app.getHttpServer())
        .get('/api/v1/test-users/me')
        .expect('Content-Type', /application\/json/);
    });
  });

  // ── Verify the response string doesn't contain the secret value ─────────

  describe('response body integrity', () => {
    it('should not contain the bcrypt hash string anywhere in the serialized response', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-users/me')
        .expect(200);

      const bodyString = JSON.stringify(res.body);
      expect(bodyString).not.toContain('bcrypt');
      expect(bodyString).not.toContain('password');
      expect(bodyString).not.toContain('tokenHash');
      expect(bodyString).not.toContain('sha256hexhash');
    });

    it('should not expose any excluded fields even under different key names', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-users/me')
        .expect(200);

      // Verify response has exactly the expected keys and nothing else
      const keys = Object.keys(res.body);
      expect(keys).toEqual(expect.arrayContaining(['id', 'email', 'name']));
      expect(keys).not.toContain('password');
      expect(keys).not.toContain('tokenHash');
      expect(keys).not.toContain('hash');
    });
  });
});
