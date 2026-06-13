import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { JobsModule } from './jobs/jobs.module';
import { MeController } from './me/me.controller';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AuditModule,
    StorageModule,
    QueueModule,
    UploadModule,
    JobsModule,
  ],
  controllers: [HealthController, MeController],
})
export class AppModule {}
