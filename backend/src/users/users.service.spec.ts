import { describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('UsersService', () => {
  it('não declara o WhatsApp como verificado sem desafio', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'user-1' });
    const service = new UsersService({ user: { update } } as unknown as PrismaService);

    await service.updateProfile('user-1', { whatsapp: '5533999998888' });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { whatsapp: '5533999998888', whatsappVerified: false },
    });
  });

  it('habilita notificações somente ao registrar um token FCM', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockResolvedValue({});
    const service = new UsersService({
      fcmToken: { upsert },
      user: { update },
    } as unknown as PrismaService);

    await service.registerFcmToken('user-1', { token: 'fcm-token' });

    expect(upsert).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { notificationsEnabled: true },
    });
  });
});
