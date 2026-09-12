import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service.js';
import { FirebaseAdminService } from '../firebase/firebase-admin.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: No token provided.`);
        client.disconnect();
        return;
      }

      const decoded = await this.firebaseAdmin.verifyIdToken(token);
      const user = await this.prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
      });

      if (!user) {
        this.logger.warn(`Client ${client.id} disconnected: User not found.`);
        client.disconnect();
        return;
      }

      client.data.user = user;
      this.logger.log(`Client connected: ${user.name} (${client.id})`);
    } catch (error) {
      this.logger.error(`Auth error on socket connection: ${client.id}`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinNegotiation')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { negotiationId: string },
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
      client.join(room);
      this.logger.log(`User ${user.name} joined room ${room}`);
      return { status: 'joined', room };
    } else {
      return { status: 'forbidden' };
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { negotiationId: string; content: string },
  ) {
    const user = client.data.user;
    if (!user || !data.negotiationId || !data.content?.trim()) return;

    try {
      // 1. Salva no banco e notifica push se necessário
      const message = await this.chatService.saveAndNotifyMessage(
        user.id,
        data.negotiationId,
        data.content.trim(),
      );

      // 2. Transmite via WebSocket em tempo real para todos na sala
      const room = `negotiation_${data.negotiationId}`;
      this.server.to(room).emit('newMessage', message);

      return { status: 'sent', messageId: message.id };
    } catch (error: any) {
      this.logger.error('Error saving/broadcasting message', error);
      return { status: 'error', message: error.message };
    }
  }
}
