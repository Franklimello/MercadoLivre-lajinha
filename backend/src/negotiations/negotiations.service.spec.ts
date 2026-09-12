import { BadRequestException, ConflictException } from '@nestjs/common';
import { NegotiationStatus, ProductStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { NegotiationsService } from './negotiations.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';

function setup(status = NegotiationStatus.OPEN, soldCount = 1) {
  const negotiation = {
    id: 'neg-1',
    productId: 'product-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    status,
    product: { title: 'Bicicleta' },
  };
  const tx = {
    negotiation: {
      findUnique: vi.fn().mockResolvedValue(negotiation),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...negotiation, ...data })),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    product: { updateMany: vi.fn().mockResolvedValue({ count: soldCount }) },
  };
  const prisma = {
    $transaction: vi.fn().mockImplementation((callback) => callback(tx)),
  } as unknown as PrismaService;
  const notifications = {
    notifyStatusChange: vi.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;

  return { service: new NegotiationsService(prisma, notifications), tx, notifications };
}

describe('NegotiationsService.updateStatus', () => {
  it('impede o comprador de concluir a venda', async () => {
    const { service, tx } = setup();

    await expect(
      service.updateStatus('buyer-1', 'neg-1', { status: NegotiationStatus.COMPLETED }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it('conclui a venda e cancela as demais negociações na mesma transação', async () => {
    const { service, tx, notifications } = setup();

    const result = await service.updateStatus('seller-1', 'neg-1', {
      status: NegotiationStatus.COMPLETED,
    });

    expect(result.status).toBe(NegotiationStatus.COMPLETED);
    expect(tx.product.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: ProductStatus.ACTIVE }),
        data: { status: ProductStatus.SOLD, stock: 0 },
      }),
    );
    expect(tx.negotiation.updateMany).toHaveBeenCalledOnce();
    expect(notifications.notifyStatusChange).toHaveBeenCalledOnce();
  });

  it('recusa concluir um anúncio que já não está disponível', async () => {
    const { service, notifications } = setup(NegotiationStatus.OPEN, 0);

    await expect(
      service.updateStatus('seller-1', 'neg-1', { status: NegotiationStatus.COMPLETED }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(notifications.notifyStatusChange).not.toHaveBeenCalled();
  });
});


describe('Unread summary', () => {
  it('counts only incoming unread messages in conversations belonging to the user', async () => {
    const groupBy = vi.fn().mockResolvedValue([{ negotiationId: 'n1', _count: { _all: 2 } }, { negotiationId: 'n2', _count: { _all: 3 } }]);
    const service = new NegotiationsService({ message: { groupBy } } as unknown as PrismaService, {} as NotificationsService);
    expect(await service.getUnreadSummary('buyer')).toEqual({ total: 5, conversations: [{ id: 'n1', count: 2 }, { id: 'n2', count: 3 }] });
    expect(groupBy).toHaveBeenCalledWith({ by: ['negotiationId'], where: { readAt: null, senderId: { not: 'buyer' }, negotiation: { OR: [{ buyerId: 'buyer' }, { sellerId: 'buyer' }] } }, _count: { _all: true } });
  });
});
