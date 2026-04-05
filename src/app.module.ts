import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EncryptionModule } from './common/encryption/encryption.module';
import { HoneypotMiddleware } from './common/middleware/honeypot.middleware';

@Module({
  imports: [
    // Config is global — available via ConfigService everywhere
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting — applied globally as a guard
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 60 seconds window
        limit: 30,   // max 30 requests per window per IP
      },
    ]),

    // Encryption — global, injected wherever EncryptionService is needed
    EncryptionModule,

    // Feature modules will be added here:
    // AuthModule, UsersModule, AccountsModule, TransactionsModule,
    // CategoriesModule, BudgetsModule, GoalsModule, BankConnectionsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Honeypot runs on ALL routes — catches scanners before any route handler
    consumer
      .apply(HoneypotMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
