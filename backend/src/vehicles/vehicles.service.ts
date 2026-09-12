import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto.js';
import { ProductStatus, ProductType, VehicleType, Prisma } from '@prisma/client';
import { UploadService } from '../upload/upload.service.js';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly upload: UploadService,
  ) {}

  async create(userId: string, dto: CreateVehicleDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { _count: { select: { fcmTokens: true } } },
    });

    if (!user.whatsapp) {
      throw new BadRequestException('É obrigatório cadastrar o seu WhatsApp antes de publicar.');
    }

    if (!user.notificationsEnabled || user._count.fcmTokens === 0) {
      throw new BadRequestException('É obrigatório ativar as notificações push antes de publicar.');
    }

    if (!dto.images || dto.images.length === 0) {
      throw new BadRequestException('O anúncio deve conter pelo menos 1 imagem.');
    }

    if (dto.images.length > 5) {
      throw new BadRequestException('Cada anúncio pode ter no máximo 5 imagens.');
    }
    this.upload.assertManagedImages(dto.images);

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

    if (
      params.minPrice !== undefined &&
      params.maxPrice !== undefined &&
      params.minPrice > params.maxPrice
    ) {
      throw new BadRequestException('O preço mínimo não pode ser maior que o preço máximo.');
    }
    if (
      params.minYear !== undefined &&
      params.maxYear !== undefined &&
      params.minYear > params.maxYear
    ) {
      throw new BadRequestException('O ano mínimo não pode ser maior que o ano máximo.');
    }

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

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      where.price = {};
      if (params.minPrice !== undefined) where.price.gte = params.minPrice;
      if (params.maxPrice !== undefined) where.price.lte = params.maxPrice;
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
          images: {
            orderBy: { position: 'asc' },
            select: { id: true, url: true, position: true },
          },
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
        images: {
          orderBy: { position: 'asc' },
          select: { id: true, url: true, position: true },
        },
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
      where: {
        ...(vehicleType ? { vehicleType } : {}),
        product: { status: ProductStatus.ACTIVE, stock: { gt: 0 } },
      },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    return vehicles.map((v) => v.brand);
  }

  async update(userId: string, productId: string, dto: UpdateVehicleDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        sellerId: true,
        type: true,
        status: true,
        images: { select: { fileId: true } },
      },
    });

    if (!product || product.type !== ProductType.VEHICLE || product.status === ProductStatus.ARCHIVED) {
      throw new NotFoundException('Veículo não encontrado.');
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException('Você não tem permissão para alterar este veículo.');
    }
    if (dto.images) this.upload.assertManagedImages(dto.images);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.images) {
        await tx.productImage.deleteMany({ where: { productId } });
        await tx.productImage.createMany({
          data: dto.images.map((image, position) => ({
            productId,
            url: image.url,
            fileId: image.fileId,
            position,
          })),
        });
      }

      await tx.product.update({
        where: { id: productId },
        data: {
          title: dto.title,
          description: dto.description,
          price: dto.price,
          condition: dto.condition,
          categoryId: dto.categoryId,
          city: dto.city,
          state: dto.state,
        },
      });

      await tx.vehicle.update({
        where: { productId },
        data: {
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
      });

      return tx.product.findUnique({
        where: { id: productId },
        include: {
          images: { orderBy: { position: 'asc' } },
          category: true,
          vehicle: true,
        },
      });
    });

    if (dto.images) {
      const retained = new Set(dto.images.map((image) => image.fileId));
      await this.upload.deleteFiles(
        product.images.map((image) => image.fileId).filter((fileId) => !retained.has(fileId)),
      );
    }

    return updated;
  }

  async delete(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { sellerId: true, type: true, status: true },
    });

    if (!product || product.type !== ProductType.VEHICLE || product.status === ProductStatus.ARCHIVED) {
      throw new NotFoundException('Veículo não encontrado.');
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException('Você não tem permissão para excluir este veículo.');
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ARCHIVED, stock: 0 },
    });
    return { success: true };
  }
}
