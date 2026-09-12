import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNegotiationDto, UpdateNegotiationStatusDto } from './dto/negotiation.dto.js';
import { NegotiationStatus, ProductStatus } from '@prisma/client';

@Injectable()
export class NegotiationsService {
  constructor(private readonly prisma: PrismaService) {}

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
      negotiation = await this.prisma.negotiation.create({
        data: {
          productId: dto.productId,
          buyerId,
          sellerId: product.sellerId,
          status: NegotiationStatus.OPEN,
        },
      });
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
            images: { take: 1, orderBy: { position: 'asc' } },
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
            images: { orderBy: { position: 'asc' } },
            vehicle: true,
          },
        },
        buyer: {
          select: { id: true, name: true, avatarUrl: true, email: true },
        },
        seller: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            email: true,
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
    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id },
    });

    if (negotiation.buyerId !== userId && negotiation.sellerId !== userId) {
      throw new ForbiddenException('Você não tem permissão para alterar esta negociação.');
    }

    const updated = await this.prisma.negotiation.update({
      where: { id },
      data: { status: dto.status },
    });

    // Se a negociação for marcada como COMPLETED pelo vendedor, pode marcar produto como vendido
    if (dto.status === NegotiationStatus.COMPLETED && negotiation.sellerId === userId) {
      await this.prisma.product.update({
        where: { id: negotiation.productId },
        data: { status: ProductStatus.SOLD, stock: 0 },
      });
    }

    return updated;
  }
}
