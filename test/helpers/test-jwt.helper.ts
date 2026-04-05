/**
 * Shared JWT testing helpers — reused across all E2E test suites
 * that need to register the 'jwt' Passport strategy.
 *
 * Import `TestJwtModule` into any test module that applies JwtAuthGuard globally.
 * Without a registered strategy, the guard throws 500 instead of 401.
 */
import { Injectable, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export const TEST_JWT_SECRET =
  'test_jwt_secret_for_unit_tests_only_64chars_long_padding_padding';

export const TEST_USER_PAYLOAD = {
  sub: 'cld_test_user_id',
  email: 'test@coinflow.dev',
};

@Injectable()
export class TestJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: TEST_JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}

/**
 * Import this module in any test @Module that uses the JwtAuthGuard globally.
 * Registers the 'jwt' Passport strategy so the guard can resolve it.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: TEST_JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [TestJwtStrategy],
  exports: [TestJwtStrategy, JwtModule, PassportModule],
})
export class TestJwtModule {}
