import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { FirebaseAuthGuard } from './firebase-auth.guard.js';
import type { FirebaseAdminService } from '../firebase/firebase-admin.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function contextFor(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('FirebaseAuthGuard', () => {
  it('recusa requisições sem Bearer token', async () => {
    const guard = new FirebaseAuthGuard(
      { verifyIdToken: vi.fn() } as unknown as FirebaseAdminService,
      { user: { upsert: vi.fn() } } as unknown as PrismaService,
    );

    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('anexa o usuário quando o token é válido', async () => {
    const user = { id: 'user-1' };
    const request = { headers: { authorization: 'Bearer valid-token' } };
    const verifyIdToken = vi.fn().mockResolvedValue({
      uid: 'firebase-1',
      email: 'USER@example.com',
      name: 'Usuário',
    });
    const upsert = vi.fn().mockResolvedValue(user);
    const guard = new FirebaseAuthGuard(
      { verifyIdToken } as unknown as FirebaseAdminService,
      { user: { upsert } } as unknown as PrismaService,
    );

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ email: 'user@example.com' }) }),
    );
    expect((request as { user?: unknown }).user).toBe(user);
  });

  it('não converte falha do banco em erro de autenticação', async () => {
    const databaseError = new Error('database unavailable');
    const guard = new FirebaseAuthGuard(
      {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'firebase-1', email: 'user@example.com' }),
      } as unknown as FirebaseAdminService,
      { user: { upsert: vi.fn().mockRejectedValue(databaseError) } } as unknown as PrismaService,
    );

    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Bearer token' } })),
    ).rejects.toBe(databaseError);
  });
});
