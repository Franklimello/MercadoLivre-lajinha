import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ChatService } from './chat.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { FirebaseAdminService } from '../firebase/firebase-admin.service.js';

function serviceWith(prisma: Record<string, unknown>) {
  return new ChatService(
    prisma as unknown as PrismaService,
    { sendPushNotification: vi.fn() } as unknown as FirebaseAdminService,
  );
}

describe('ChatService', () => {
  it('recusa leitura por quem não participa da negociação', async () => {
    const service = serviceWith({
      negotiation: {
        findUnique: vi.fn().mockResolvedValue({ buyerId: 'buyer', sellerId: 'seller' }),
      },
    });

    await expect(service.getMessages('outsider', 'neg-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('recusa mensagens vazias ou acima do limite antes do banco', async () => {
    const findUnique = vi.fn();
    const service = serviceWith({ negotiation: { findUnique } });

    await expect(service.saveAndNotifyMessage('user', 'neg-1', '   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.saveAndNotifyMessage('user', 'neg-1', 'a'.repeat(2001)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
