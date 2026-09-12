import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto, RegisterFcmTokenDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        _count: {
          select: {
            products: true,
            negotiationsAsBuyer: true,
            negotiationsAsSeller: true,
          },
        },
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: { whatsapp?: string; whatsappVerified?: boolean } = {};
    if (dto.whatsapp !== undefined) {
      // Limpa caracteres especiais mantendo apenas dígitos e o sinal de + inicial se houver
      const cleaned = dto.whatsapp.replace(/[^0-9+]/g, '');
      if (cleaned.length < 10) {
        throw new BadRequestException('WhatsApp deve conter DDD + número.');
      }
      data.whatsapp = cleaned;
      // O número só pode ser marcado como verificado após um desafio real.
      data.whatsappVerified = false;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async registerFcmToken(userId: string, dto: RegisterFcmTokenDto) {
    await this.prisma.fcmToken.upsert({
      where: { token: dto.token },
      update: { userId },
      create: {
        userId,
        token: dto.token,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationsEnabled: true },
    });

    return { success: true };
  }
}
