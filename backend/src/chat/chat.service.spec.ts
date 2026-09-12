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


describe('ChatService realtime and receipts', () => {
  const participants = { buyerId: 'buyer', sellerId: 'seller', product: { title: 'Bicicleta' } };
  it('fetches a bounded history without marking unseen messages read', async () => {
    const updateMany = vi.fn();
    const findMany = vi.fn().mockResolvedValue([{ id: 'new' }, { id: 'old' }]);
    const service = serviceWith({ negotiation: { findUnique: vi.fn().mockResolvedValue(participants) }, message: { findMany, updateMany } });
    expect(await service.getMessages('buyer', 'n1')).toEqual([{ id: 'old' }, { id: 'new' }]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 200, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }));
    expect(updateMany).not.toHaveBeenCalled();
  });
  it('marks only requested incoming unread IDs in an authorized conversation', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const service = serviceWith({ negotiation: { findUnique: vi.fn().mockResolvedValue(participants) }, message: { updateMany } });
    const receipt = await service.markMessagesRead('buyer', 'n1', ['m1']);
    expect(receipt.count).toBe(1);
    expect(updateMany).toHaveBeenCalledWith({ where: { negotiationId: 'n1', id: { in: ['m1'] }, senderId: { not: 'buyer' }, readAt: null }, data: { readAt: expect.any(Date) } });
    await expect(service.markMessagesRead('outsider', 'n1', ['m1'])).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateMany).toHaveBeenCalledOnce();
  });
  it('persists message and preview timestamp atomically without waiting for push', async () => {
    const message = { id: 'm1', sender: { name: 'Comprador' } };
    const transaction = vi.fn().mockImplementation(operations => Promise.all(operations));
    const push = vi.fn(() => new Promise(() => {}));
    const service = new ChatService({ negotiation: { findUnique: vi.fn().mockResolvedValue(participants), update: vi.fn().mockResolvedValue({}) }, message: { create: vi.fn().mockResolvedValue(message) }, fcmToken: { findMany: vi.fn().mockResolvedValue([{ token: 'test-token' }]) }, $transaction: transaction } as unknown as PrismaService, { sendPushNotification: push } as unknown as FirebaseAdminService);
    expect(await service.saveAndNotifyMessage('buyer', 'n1', ' Olá ')).toEqual({ message, recipientId: 'seller' });
    expect(transaction).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledOnce();
  });
});
