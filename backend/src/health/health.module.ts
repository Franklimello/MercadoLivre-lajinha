import { Module } from '@nestjs/common';
import { UploadModule } from '../upload/upload.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [UploadModule],
  controllers: [HealthController],
})
export class HealthModule {}
