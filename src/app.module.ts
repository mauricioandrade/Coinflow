import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Feature modules will be added here as they are implemented:
    // AuthModule, UsersModule, AccountsModule, TransactionsModule,
    // CategoriesModule, BudgetsModule, GoalsModule, BankConnectionsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
