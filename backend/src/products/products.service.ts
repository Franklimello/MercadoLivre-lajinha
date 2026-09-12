import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { ProductCondition, ProductStatus, ProductType, Prisma } from '@prisma/client';
import { UploadService } from '../upload/upload.service.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly upload: UploadService,
  ) {}

  async getCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: { where: { status: ProductStatus.ACTIVE, stock: { gt: 0 } } } },
        },
      },
    });
  }

  async findMyProducts(userId: string) {
    return this.prisma.product.findMany({
      where: { sellerId: userId, status: { not: ProductStatus.ARCHIVED } },
      orderBy: { createdAt: 'desc' },
      include: {
        images: { orderBy: { position: 'asc' } },
        category: true,
        vehicle: true,
        _count: {
          select: { negotiations: true },
        },
      },
    });
  }

  async create(userId: string, dto: CreateProductDto) {
    // 1. Validar requisitos do vendedor (WhatsApp cadastrado e notificações habilitadas)
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { _count: { select: { fcmTokens: true } } },
    });

    if (!user.whatsapp) {
      throw new BadRequestException(
        'É obrigatório cadastrar o seu número de WhatsApp antes de publicar anúncios.',
      );
    }

    if (!user.notificationsEnabled || user._count.fcmTokens === 0) {
      throw new BadRequestException(
        'É obrigatório ativar as notificações push antes de publicar anúncios.',
      );
    }

    // 2. Validar limite estrito de no máximo 5 imagens
    if (!dto.images || dto.images.length === 0) {
      throw new BadRequestException('O anúncio deve conter pelo menos 1 imagem.');
    }

    if (dto.images.length > 5) {
      throw new BadRequestException('Cada anúncio pode ter no máximo 5 imagens.');
    }
    this.upload.assertManagedImages(dto.images);

    // 3. Criar produto e associar imagens
    return this.prisma.product.create({
      data: {
        sellerId: userId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        stock: dto.stock ?? 1,
        condition: dto.condition,
        categoryId: dto.categoryId,
        type: ProductType.PRODUCT,
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
      },
      include: {
        images: { orderBy: { position: 'asc' } },
        category: true,
      },
    });
  }

  async findAll(params: {
    q?: string;
    categorySlug?: string;
    condition?: ProductCondition;
    minPrice?: number;
    maxPrice?: number;
    sort?: 'newest' | 'price_asc' | 'price_desc';
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
    const where: Prisma.ProductWhereInput = {
      type: ProductType.PRODUCT,
      status: ProductStatus.ACTIVE,
      stock: { gt: 0 },
    };

    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    if (params.categorySlug) {
      where.category = { slug: params.categorySlug };
    }

    if (params.condition) {
      where.condition = params.condition;
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
          category: true,
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
        category: true,
        seller: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
            // ATENÇÃO: NUNCA expor whatsapp publicamente no anúncio!
          },
        },
        _count: { select: { negotiations: true } },
      },
    });

    if (!product || product.status === ProductStatus.ARCHIVED) {
      throw new NotFoundException('Anúncio não encontrado.');
    }

    return product;
  }

  async update(userId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
      include: { images: { select: { fileId: true } } },
    });

    if (product.status === ProductStatus.ARCHIVED) {
      throw new NotFoundException('Anúncio não encontrado.');
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException('Você não tem permissão para alterar este anúncio.');
    }

    if (dto.images && dto.images.length > 5) {
      throw new BadRequestException('Cada anúncio pode ter no máximo 5 imagens.');
    }
    if (dto.images) this.upload.assertManagedImages(dto.images);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.images) {
        await tx.productImage.deleteMany({ where: { productId } });
        await tx.productImage.createMany({
          data: dto.images.map((img, idx) => ({
            productId,
            url: img.url,
            fileId: img.fileId,
            position: idx,
          })),
        });
      }

      return tx.product.update({
        where: { id: productId },
        data: {
          title: dto.title,
          description: dto.description,
          price: dto.price,
          stock: dto.stock,
          condition: dto.condition,
          categoryId: dto.categoryId,
          city: dto.city,
          state: dto.state,
        },
        include: {
          images: { orderBy: { position: 'asc' } },
          category: true,
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

  async updateStatus(userId: string, productId: string, status: ProductStatus) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });

    if (product.status === ProductStatus.ARCHIVED) {
      throw new NotFoundException('Anúncio não encontrado.');
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException('Você não tem permissão para alterar este anúncio.');
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: { status },
    });
  }

  async delete(userId: string, productId: string) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });

    if (product.status === ProductStatus.ARCHIVED) {
      throw new NotFoundException('Anúncio não encontrado.');
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException('Você não tem permissão para excluir este anúncio.');
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ARCHIVED, stock: 0 },
    });
    return { success: true };
  }
}
