import { describe, expect, it, vi } from 'vitest';
import type { Server, Socket } from 'socket.io';
import { ChatGateway } from './chat.gateway.js';
import type { ChatService } from './chat.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { FirebaseAdminService } from '../firebase/firebase-admin.service.js';

function setup() {
  const message = { id: 'm1', negotiationId: 'n1', senderId: 'buyer', content: 'Olá' };
  const save = vi.fn().mockResolvedValue({ message, recipientId: 'seller' });
  const verify = vi.fn().mockResolvedValue({ uid: 'firebase-buyer' });
  const prisma = { user: { findUnique: vi.fn().mockResolvedValue({ id: 'buyer', name: 'Comprador' }) }, negotiation: { findUnique: vi.fn().mockResolvedValue({ buyerId: 'buyer', sellerId: 'seller' }) } };
  const gateway = new ChatGateway({ saveAndNotifyMessage: save } as unknown as ChatService, { verifyIdToken: verify } as unknown as FirebaseAdminService, prisma as unknown as PrismaService);
  const emit = vi.fn();
  const to = vi.fn().mockReturnValue({ emit });
  gateway.server = { to } as unknown as Server;
  const client = { id: 'socket1', handshake: { auth: { token: 'test-token' } }, data: {}, join: vi.fn().mockResolvedValue(undefined), leave: vi.fn().mockResolvedValue(undefined), disconnect: vi.fn() } as unknown as Socket;
  return { gateway, client, verify, save, emit, to, prisma, message };
}

describe('ChatGateway', () => {
  it('authenticates before connect and makes the first room join succeed', async () => {
    const { gateway, client } = setup();
    let middleware!: (socket: Socket, next: (error?: Error) => void) => void;
    gateway.afterInit({ use: (fn: typeof middleware) => { middleware = fn; } } as unknown as Server);
    await new Promise<void>((resolve, reject) => middleware(client, error => error ? reject(error) : resolve()));
    gateway.handleConnection(client);
    expect(client.join).toHaveBeenCalledWith('user_buyer');
    expect(await gateway.handleJoin(client, { negotiationId: 'n1' })).toEqual({ status: 'joined', room: 'negotiation_n1' });
  });
  it('refuses invalid auth before allowing a connection', async () => {
    const { gateway, client, verify } = setup();
    verify.mockRejectedValue(new Error('invalid'));
    let middleware!: (socket: Socket, next: (error?: Error) => void) => void;
    gateway.afterInit({ use: (fn: typeof middleware) => { middleware = fn; } } as unknown as Server);
    const error = await new Promise<Error | undefined>(resolve => middleware(client, resolve));
    expect(error?.message).toBe('Não autorizado.');
    expect(client.join).not.toHaveBeenCalled();
  });
  it('blocks outsiders and stops subscribing when leaving the conversation', async () => {
    const { gateway, client } = setup();
    client.data.user = { id: 'outsider' };
    expect(await gateway.handleJoin(client, { negotiationId: 'n1' })).toEqual({ status: 'forbidden' });
    expect(client.join).not.toHaveBeenCalled();
    await gateway.handleLeave(client, { negotiationId: 'n1' });
    expect(client.leave).toHaveBeenCalledWith('negotiation_n1');
  });
  it('delivers inbox updates only to the two participants and acknowledges the persisted message', async () => {
    const { gateway, client, to, emit, message } = setup();
    client.data.user = { id: 'buyer' };
    expect(await gateway.handleMessage(client, { negotiationId: 'n1', content: 'Olá' })).toEqual({ status: 'sent', messageId: 'm1', message });
    expect(to).toHaveBeenCalledWith('negotiation_n1');
    expect(to).toHaveBeenCalledWith(['user_buyer', 'user_seller']);
    expect(emit).toHaveBeenCalledWith('inboxMessage', message);
    gateway.notifyMessagesRead('buyer', 'n1', { messageIds: ['m1'], readAt: new Date() });
    expect(to).toHaveBeenLastCalledWith('user_buyer');
  });
});
