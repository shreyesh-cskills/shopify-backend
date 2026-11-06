import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HelloController } from './hello.controller';
import { TestRecordsController } from './test-records.controller';

// Database (TypeORM/Postgres) and the products/orders modules are disabled for now.
// To re-enable, restore TypeOrmModule.forRootAsync(...) plus ProductsModule and OrdersModule
// in `imports` (see git history).
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // NODE_ENV=production loads .env.production first; .env fills any gaps
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
    }),
  ],
  controllers: [HelloController, TestRecordsController],
})
export class AppModule {}
