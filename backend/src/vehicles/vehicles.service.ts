import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto.js';
import { ProductStatus, ProductType, VehicleType, Prisma } from '@prisma/client';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateVehicleDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.whatsapp) {
      throw new BadRequestException('É obrigatório cadastrar o seu WhatsApp antes de publicar.');
    }

    if (!user.notificationsEnabled) {
      throw new BadRequestException('É obrigatório ativar as notificações push antes de publicar.');
    }

    if (!dto.images || dto.images.length === 0) {
      throw new BadRequestException('O anúncio deve conter pelo menos 1 imagem.');
    }

    if (dto.images.length > 5) {
      throw new BadRequestException('Cada anúncio pode ter no máximo 5 imagens.');
    }

    return this.prisma.product.create({
      data: {
        sellerId: userId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        stock: 1,
        condition: dto.condition,
        categoryId: dto.categoryId,
        type: ProductType.VEHICLE,
        status: ProductStatus.ACTIVE,
        city: dto.city || 'Lajinha',
        state: dto.state || 'MG',
        images: {
          create: dto.images.map((img, idx) => ({
            url: img.url,
            fileId: img.fileId,
            position: idx,
          })),
        },
        vehicle: {
          create: {
            vehicleType: dto.vehicleType,
            brand: dto.brand,
            model: dto.model,
            year: dto.year,
            mileage: dto.mileage,
            color: dto.color,
            fuel: dto.fuel,
            transmission: dto.transmission,
            engine: dto.engine,
            bodyType: dto.bodyType,
            plateEnd: dto.plateEnd,
          },
        },
      },
      include: {
        images: { orderBy: { position: 'asc' } },
        vehicle: true,
      },
    });
  }

  async findAll(params: {
    q?: string;
    vehicleType?: VehicleType;
    brand?: string;
    model?: string;
    minPrice?: number;
    maxPrice?: number;
    minYear?: number;
    maxYear?: number;
    maxMileage?: number;
    fuel?: string;
    transmission?: string;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      type: ProductType.VEHICLE,
      status: ProductStatus.ACTIVE,
      stock: { gt: 0 },
      vehicle: {
        isNot: null,
      },
    };

    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
        { vehicle: { brand: { contains: params.q, mode: 'insensitive' } } },
        { vehicle: { model: { contains: params.q, mode: 'insensitive' } } },
      ];
    }

    const vehicleFilter: Prisma.VehicleWhereInput = {};

    if (params.vehicleType) {
      vehicleFilter.vehicleType = params.vehicleType;
    }
    if (params.brand) {
      vehicleFilter.brand = { contains: params.brand, mode: 'insensitive' };
    }
    if (params.model) {
      vehicleFilter.model = { contains: params.model, mode: 'insensitive' };
    }
    if (params.minYear || params.maxYear) {
      vehicleFilter.year = {};
      if (params.minYear) vehicleFilter.year.gte = Number(params.minYear);
      if (params.maxYear) vehicleFilter.year.lte = Number(params.maxYear);
    }
    if (params.maxMileage) {
      vehicleFilter.mileage = { lte: Number(params.maxMileage) };
    }
    if (params.fuel) {
      vehicleFilter.fuel = { equals: params.fuel, mode: 'insensitive' };
    }
    if (params.transmission) {
      vehicleFilter.transmission = { equals: params.transmission, mode: 'insensitive' };
    }

    if (Object.keys(vehicleFilter).length > 0) {
      where.vehicle = vehicleFilter;
    }

    if (params.minPrice || params.maxPrice) {
      where.price = {};
      if (params.minPrice) where.price.gte = params.minPrice;
      if (params.maxPrice) where.price.lte = params.maxPrice;
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (params.sort === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (params.sort === 'price_desc') {
      orderBy = { price: 'desc' };
    }

    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: { orderBy: { position: 'asc' } },
          vehicle: true,
          seller: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        vehicle: true,
        category: true,
        seller: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
        _count: { select: { negotiations: true } },
      },
    });

    if (!product || product.type !== ProductType.VEHICLE) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    return product;
  }

  async getBrands(vehicleType?: VehicleType) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: vehicleType ? { vehicleType } : {},
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    return vehicles.map((v) => v.brand);
  }
}
