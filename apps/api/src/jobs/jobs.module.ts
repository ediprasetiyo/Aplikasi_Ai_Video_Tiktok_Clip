import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { QueueModule } from '../queue/queue.module';
import { JobsController } from './jobs.controller';

@Module({
  imports: [AuthModule, AuditModule, QueueModule],
  controllers: [JobsController],
})
export class JobsModule {}
