import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";

/**
 * JwtAuthModule — registers the 'jwt' Passport strategy globally.
 *
 * Must be imported by AppModule. Without it, JwtAuthGuard throws
 * "Unknown authentication strategy 'jwt'" → 500 on all protected routes.
 *
 * Exports JwtModule so other modules (e.g., AuthModule) can use JwtService
 * to sign tokens without re-importing JwtModule.
 */
@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: config.get<string>("JWT_EXPIRES_IN") ?? "15m",
        },
      }),
    }),
  ],
  providers: [JwtStrategy],
  exports: [JwtStrategy, JwtModule, PassportModule],
})
export class JwtAuthModule {}
