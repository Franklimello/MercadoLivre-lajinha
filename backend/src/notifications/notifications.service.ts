import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FirebaseAdminService } from '../firebase/firebase-admin.service.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) {}

  async notifyUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    try {
      const tokens = await this.prisma.fcmToken.findMany({
        where: { userId },
        select: { token: true },
      });

      if (tokens.length === 0) {
        this.logger.debug(`User ${userId} has no registered FCM tokens`);
        return;
      }

      const tokenList = tokens.map((t) => t.token);
      const invalidTokens = await this.firebaseAdmin.sendPushNotification(
        tokenList,
        title,
        body,
        data,
      );
      if (invalidTokens.length > 0) {
        await this.prisma.fcmToken.deleteMany({
          where: { token: { in: invalidTokens } },
        });
        const remaining = await this.prisma.fcmToken.count({ where: { userId } });
        if (remaining === 0) {
          await this.prisma.user.update({
            where: { id: userId },
            data: { notificationsEnabled: false },
          });
        }
      }
      this.logger.log(`Push sent to user ${userId} (${tokenList.length} devices)`);
    } catch (error) {
      this.logger.error(`Error notifying user ${userId}`, error);
    }
  }

  async notifyNewNegotiation(
    sellerId: string,
    buyerName: string,
    productTitle: string,
    negotiationId: string,
  ) {
    await this.notifyUser(
      sellerId,
      'Novo interessado no seu anúncio!',
      `${buyerName} iniciou uma negociação em "${productTitle}".`,
      { negotiationId, type: 'NEW_NEGOTIATION' },
    );
  }

  async notifyStatusChange(
    recipientId: string,
    statusLabel: string,
    productTitle: string,
    negotiationId: string,
  ) {
    await this.notifyUser(
      recipientId,
      'Atualização de Negociação',
      `Sua negociação em "${productTitle}" foi atualizada para: ${statusLabel}.`,
      { negotiationId, type: 'STATUS_CHANGE' },
    );
  }
}
