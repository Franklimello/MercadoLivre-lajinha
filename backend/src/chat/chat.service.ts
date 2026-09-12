import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FirebaseAdminService } from '../firebase/firebase-admin.service.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) {}

  async getMessages(userId: string, negotiationId: string) {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id: negotiationId },
    });

    if (!negotiation) {
      throw new NotFoundException('Negociação não encontrada.');
    }

    if (negotiation.buyerId !== userId && negotiation.sellerId !== userId) {
      throw new ForbiddenException('Você não participa desta negociação.');
    }

    // Marca mensagens não lidas como lidas
    await this.prisma.message.updateMany({
      where: {
        negotiationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return this.prisma.message.findMany({
      where: { negotiationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });
  }

  async saveAndNotifyMessage(
    senderId: string,
    negotiationId: string,
    content: string,
  ) {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id: negotiationId },
      include: {
        product: { select: { title: true } },
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    });

    if (!negotiation) {
      throw new NotFoundException('Negociação não encontrada.');
    }

    if (negotiation.buyerId !== senderId && negotiation.sellerId !== senderId) {
      throw new ForbiddenException('Apenas participantes podem enviar mensagens.');
    }

    // Salva mensagem no PostgreSQL
    const message = await this.prisma.message.create({
      data: {
        negotiationId,
        senderId,
        content,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Atualiza updatedAt da negociação
    await this.prisma.negotiation.update({
      where: { id: negotiationId },
      data: { updatedAt: new Date() },
    });

    // Identifica o destinatário para push notification
    const recipientId =
      negotiation.buyerId === senderId
        ? negotiation.sellerId
        : negotiation.buyerId;

    const senderName =
      negotiation.buyerId === senderId
        ? negotiation.buyer.name
        : negotiation.seller.name;

    // Dispara notificação push em segundo plano se houver tokens FCM
    this.sendPushToRecipient(recipientId, senderName, content, negotiationId, negotiation.product.title);

    return message;
  }

  private async sendPushToRecipient(
    recipientId: string,
    senderName: string,
    content: string,
    negotiationId: string,
    productTitle: string,
  ) {
    try {
      const tokens = await this.prisma.fcmToken.findMany({
        where: { userId: recipientId },
        select: { token: true },
      });

      if (tokens.length > 0) {
        const tokenList = tokens.map((t) => t.token);
        await this.firebaseAdmin.sendPushNotification(
          tokenList,
          `Nova mensagem de ${senderName}`,
          `${productTitle}: ${content.slice(0, 80)}`,
          { negotiationId, type: 'CHAT_MESSAGE' },
        );
      }
    } catch (e) {
      console.error('Erro ao enviar push notification:', e);
    }
  }
}
