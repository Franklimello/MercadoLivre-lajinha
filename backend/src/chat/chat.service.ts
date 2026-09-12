import {
  BadRequestException,
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
      select: { buyerId: true, sellerId: true },
    });

    if (!negotiation) {
      throw new NotFoundException('Negociação não encontrada.');
    }

    if (negotiation.buyerId !== userId && negotiation.sellerId !== userId) {
      throw new ForbiddenException('Você não participa desta negociação.');
    }

    const messages = await this.prisma.message.findMany({
      where: { negotiationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return messages.reverse();
  }

  async saveAndNotifyMessage(
    senderId: string,
    negotiationId: string,
    content: string,
  ) {
    const normalizedContent = content.trim();
    if (!normalizedContent || normalizedContent.length > 2000) {
      throw new BadRequestException('Mensagem inválida.');
    }

    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id: negotiationId },
      select: {
        buyerId: true,
        sellerId: true,
        product: { select: { title: true } },
      },
    });

    if (!negotiation) {
      throw new NotFoundException('Negociação não encontrada.');
    }

    if (negotiation.buyerId !== senderId && negotiation.sellerId !== senderId) {
      throw new ForbiddenException(
        'Apenas participantes podem enviar mensagens.',
      );
    }

    // Keep the message and conversation timestamp consistent in one transaction.
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          negotiationId,
          senderId,
          content: normalizedContent,
        },
        include: {
          sender: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.negotiation.update({
        where: { id: negotiationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    // Identifica o destinatário para push notification
    const recipientId =
      negotiation.buyerId === senderId
        ? negotiation.sellerId
        : negotiation.buyerId;

    const senderName = message.sender.name;

    // Dispara notificação push em segundo plano se houver tokens FCM
    void this.sendPushToRecipient(
      recipientId,
      senderName,
      normalizedContent,
      negotiationId,
      negotiation.product.title,
    );

    return { message, recipientId };
  }

  async markMessagesRead(
    userId: string,
    negotiationId: string,
    messageIds: string[],
  ) {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id: negotiationId },
      select: { buyerId: true, sellerId: true },
    });
    if (!negotiation) throw new NotFoundException('Negociação não encontrada.');
    if (negotiation.buyerId !== userId && negotiation.sellerId !== userId) {
      throw new ForbiddenException('Você não participa desta negociação.');
    }
    const readAt = new Date();
    // Mark only the messages actually displayed, never newer unseen messages.
    const result = await this.prisma.message.updateMany({
      where: {
        negotiationId,
        id: { in: messageIds },
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt },
    });
    return { count: result.count, readAt, messageIds };
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
        const invalidTokens = await this.firebaseAdmin.sendPushNotification(
          tokenList,
          `Nova mensagem de ${senderName}`,
          `${productTitle}: ${content.slice(0, 80)}`,
          { negotiationId, type: 'CHAT_MESSAGE' },
        );
        if (invalidTokens.length > 0) {
          await this.prisma.fcmToken.deleteMany({
            where: { token: { in: invalidTokens } },
          });
          const remaining = await this.prisma.fcmToken.count({
            where: { userId: recipientId },
          });
          if (remaining === 0) {
            await this.prisma.user.update({
              where: { id: recipientId },
              data: { notificationsEnabled: false },
            });
          }
        }
      }
    } catch (e) {
      console.error('Erro ao enviar push notification:', e);
    }
  }
}
