import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FirebaseAdminService } from '../firebase/firebase-admin.service.js';
import { UploadService } from '../upload/upload.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseAdminService,
    private readonly upload: UploadService,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    const checks = {
      database: false,
      firebase: this.firebase.isReady(),
      imagekit: this.upload.isReady(),
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      // The response deliberately omits infrastructure details.
    }

    if (!Object.values(checks).every(Boolean)) {
      throw new ServiceUnavailableException({ status: 'not_ready', checks });
    }

    return { status: 'ready', checks };
  }
}
