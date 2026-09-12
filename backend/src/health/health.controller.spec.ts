import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { FirebaseAdminService } from '../firebase/firebase-admin.service.js';
import type { UploadService } from '../upload/upload.service.js';

function controller(databaseReady = true, firebaseReady = true, imagekitReady = true) {
  return new HealthController(
    {
      $queryRaw: databaseReady
        ? vi.fn().mockResolvedValue([{ '?column?': 1 }])
        : vi.fn().mockRejectedValue(new Error('offline')),
    } as unknown as PrismaService,
    { isReady: () => firebaseReady } as unknown as FirebaseAdminService,
    { isReady: () => imagekitReady } as unknown as UploadService,
  );
}

describe('HealthController', () => {
  it('informa prontidão apenas com todos os serviços disponíveis', async () => {
    await expect(controller().ready()).resolves.toEqual({
      status: 'ready',
      checks: { database: true, firebase: true, imagekit: true },
    });
  });

  it('retorna indisponível quando uma dependência falha', async () => {
    await expect(controller(false).ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
