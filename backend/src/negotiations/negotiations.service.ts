import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateNegotiationDto, UpdateNegotiationStatusDto } from './dto/negotiation.dto.js';
import { NegotiationStatus, ProductStatus, Prisma } from '@prisma/client';

@Injectable()
export class NegotiationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findOrCreate(buyerId: string, dto: CreateNegotiationDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException('Anúncio não encontrado.');
    }

    if (product.sellerId === buyerId) {
      throw new BadRequestException('Você não pode iniciar uma negociação no seu próprio anúncio.');
    }

    if (product.status !== ProductStatus.ACTIVE || product.stock <= 0) {
      throw new BadRequestException('Este anúncio não está mais disponível para novas negociações.');
    }

    // Busca negociação existente entre este comprador e este produto
    let negotiation = await this.prisma.negotiation.findUnique({
      where: {
        productId_buyerId: {
          productId: dto.productId,
          buyerId,
        },
      },
    });

    if (!negotiation) {
      try {
        negotiation = await this.prisma.negotiation.create({
          data: {
            productId: dto.productId,
            buyerId,
            sellerId: product.sellerId,
            status: NegotiationStatus.OPEN,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          negotiation = await this.prisma.negotiation.findUniqueOrThrow({
            where: {
              productId_buyerId: { productId: dto.productId, buyerId },
            },
          });
        } else {
          throw error;
        }
      }

      const buyer = await this.prisma.user.findUnique({ where: { id: buyerId } });
      if (buyer) {
        await this.notificationsService.notifyNewNegotiation(
          product.sellerId,
          buyer.name,
          product.title,
          negotiation.id,
        );
      }
    }

    return negotiation;
  }

  async findAllForUser(userId: string, role?: 'buying' | 'selling') {
    const where: any = {};

    if (role === 'buying') {
      where.buyerId = userId;
    } else if (role === 'selling') {
      where.sellerId = userId;
    } else {
      where.OR = [{ buyerId: userId }, { sellerId: userId }];
    }

    return this.prisma.negotiation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            type: true,
            images: {
              take: 1,
              orderBy: { position: 'asc' },
              select: { id: true, url: true, position: true },
            },
          },
        },
        buyer: {
          select: { id: true, name: true, avatarUrl: true },
        },
        seller: {
          select: { id: true, name: true, avatarUrl: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true, senderId: true },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const negotiation = await this.prisma.negotiation.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            images: {
              orderBy: { position: 'asc' },
              select: { id: true, url: true, position: true },
            },
            vehicle: true,
          },
        },
        buyer: {
          select: { id: true, name: true, avatarUrl: true },
        },
        seller: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            whatsapp: true, // EXPOSTO APENAS DENTRO DA NEGOCIAÇÃO!
          },
        },
      },
    });

    if (!negotiation) {
      throw new NotFoundException('Negociação não encontrada.');
    }

    // Valida participação
    if (negotiation.buyerId !== userId && negotiation.sellerId !== userId) {
      throw new ForbiddenException('Você não tem permissão para acessar esta negociação.');
    }

    return negotiation;
  }

  async updateStatus(userId: string, id: string, dto: UpdateNegotiationStatusDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const negotiation = await tx.negotiation.findUnique({
        where: { id },
        include: { product: { select: { title: true } } },
      });

      if (!negotiation) {
        throw new NotFoundException('Negociação não encontrada.');
      }
      if (negotiation.buyerId !== userId && negotiation.sellerId !== userId) {
        throw new ForbiddenException('Você não tem permissão para alterar esta negociação.');
      }

      const sellerAction = negotiation.sellerId === userId;
      const allowed = sellerAction
        ? this.sellerTransitions(negotiation.status)
        : this.buyerTransitions(negotiation.status);

      if (dto.status !== negotiation.status && !allowed.includes(dto.status)) {
        throw new BadRequestException('Transição de status inválida para esta negociação.');
      }

      const updated =
        dto.status === negotiation.status
          ? negotiation
          : await tx.negotiation.update({
              where: { id },
              data: { status: dto.status },
            });

      if (dto.status === NegotiationStatus.COMPLETED && sellerAction) {
        const sold = await tx.product.updateMany({
          where: {
            id: negotiation.productId,
            status: ProductStatus.ACTIVE,
            stock: { gt: 0 },
          },
          data: { status: ProductStatus.SOLD, stock: 0 },
        });

        if (sold.count !== 1) {
          throw new ConflictException('Este anúncio já não está disponível para conclusão.');
        }

        await tx.negotiation.updateMany({
          where: {
            productId: negotiation.productId,
            id: { not: id },
            status: {
              in: [
                NegotiationStatus.OPEN,
                NegotiationStatus.NEGOTIATING,
                NegotiationStatus.AGREED,
              ],
            },
          },
          data: { status: NegotiationStatus.CANCELLED },
        });
      }

      return {
        updated,
        changed: dto.status !== negotiation.status,
        productTitle: negotiation.product.title,
        recipientId: sellerAction ? negotiation.buyerId : negotiation.sellerId,
      };
    });

    if (result.changed) {
      await this.notificationsService.notifyStatusChange(
        result.recipientId,
        dto.status,
        result.productTitle,
        id,
      );
    }

    return result.updated;
  }

  private sellerTransitions(status: NegotiationStatus): NegotiationStatus[] {
    switch (status) {
      case NegotiationStatus.OPEN:
        return [
          NegotiationStatus.NEGOTIATING,
          NegotiationStatus.CANCELLED,
          NegotiationStatus.COMPLETED,
        ];
      case NegotiationStatus.NEGOTIATING:
        return [
          NegotiationStatus.AGREED,
          NegotiationStatus.CANCELLED,
          NegotiationStatus.COMPLETED,
        ];
      case NegotiationStatus.AGREED:
        return [NegotiationStatus.CANCELLED, NegotiationStatus.COMPLETED];
      default:
        return [];
    }
  }

  private buyerTransitions(status: NegotiationStatus): NegotiationStatus[] {
    switch (status) {
      case NegotiationStatus.OPEN:
      case NegotiationStatus.NEGOTIATING:
      case NegotiationStatus.AGREED:
        return [NegotiationStatus.CANCELLED];
      default:
        return [];
    }
  }
}
