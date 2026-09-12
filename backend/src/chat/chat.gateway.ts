import 'dotenv/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service.js';
import { FirebaseAdminService } from '../firebase/firebase-admin.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JoinNegotiationDto, SendMessageDto } from './dto/chat-message.dto.js';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly messageWindows = new Map<string, number[]>();

  constructor(
    private readonly chatService: ChatService,
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    // Complete authentication before Socket.IO emits connect or accepts room joins.
    server.use((client, next) => {
      this.authenticate(client).then(
        () => next(),
        () => next(new Error('Não autorizado.')),
      );
    });
  }

  private async authenticate(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
    if (typeof token !== 'string' || !token) throw new Error('Missing token');
    const decoded = await this.firebaseAdmin.verifyIdToken(token);
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true, name: true, firebaseUid: true },
    });
    if (!user) throw new Error('User unavailable');
    client.data.user = user;
  }

  handleConnection(client: Socket) {
    if (!client.data.user) {
      client.disconnect();
      return;
    }
    void client.join(`user_${client.data.user.id}`);
  }

  notifyMessagesRead(
    userId: string,
    negotiationId: string,
    receipt: { readAt: Date; messageIds: string[] },
  ) {
    this.server
      .to(`user_${userId}`)
      .emit('messagesRead', { negotiationId, ...receipt });
  }

  handleDisconnect(client: Socket) {
    this.messageWindows.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinNegotiation')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinNegotiationDto,
  ) {
    const user = client.data.user;
    if (!user || !data.negotiationId) return;

    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id: data.negotiationId },
    });

    if (
      negotiation &&
      (negotiation.buyerId === user.id || negotiation.sellerId === user.id)
    ) {
      const room = `negotiation_${data.negotiationId}`;
      await client.join(room);
      this.logger.log(`User ${user.name} joined room ${room}`);
      return { status: 'joined', room };
    } else {
      return { status: 'forbidden' };
    }
  }

  @SubscribeMessage('leaveNegotiation')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinNegotiationDto,
  ) {
    if (!client.data.user) return;
    await client.leave(`negotiation_${data.negotiationId}`);
    return { status: 'left' };
  }

  @SubscribeMessage('sendMessage')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: () => new WsException('Mensagem inválida.'),
    }),
  )
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ) {
    const user = client.data.user;
    if (!user || !data.negotiationId || !data.content?.trim()) return;

    if (!this.consumeMessageQuota(client.id)) {
      return {
        status: 'error',
        message: 'Muitas mensagens. Aguarde alguns segundos.',
      };
    }

    try {
      const { message, recipientId } =
        await this.chatService.saveAndNotifyMessage(
          user.id,
          data.negotiationId,
          data.content.trim(),
        );
      const room = `negotiation_${data.negotiationId}`;
      this.server.to(room).emit('newMessage', message);
      // A private user room delivers updates outside the open conversation.
      this.server
        .to([`user_${user.id}`, `user_${recipientId}`])
        .emit('inboxMessage', message);
      return { status: 'sent', messageId: message.id, message };
    } catch (error) {
      this.logger.error('Error saving/broadcasting message', error);
      return {
        status: 'error',
        message: 'Não foi possível enviar a mensagem.',
      };
    }
  }

  private consumeMessageQuota(clientId: string) {
    const now = Date.now();
    const windowStart = now - 10_000;
    const recent = (this.messageWindows.get(clientId) || []).filter(
      (timestamp) => timestamp >= windowStart,
    );
    if (recent.length >= 20) return false;
    recent.push(now);
    this.messageWindows.set(clientId, recent);
    return true;
  }
}
