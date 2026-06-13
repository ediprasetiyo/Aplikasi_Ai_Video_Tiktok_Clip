import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { UploadController } from './upload.controller';

@Module({
  imports: [AuthModule, AuditModule, StorageModule],
  controllers: [UploadController],
})
export class UploadModule {}
