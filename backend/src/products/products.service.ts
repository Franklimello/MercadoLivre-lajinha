import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { ProductStatus, ProductType, Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
      where: { sellerId: userId },
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
    });

    if (!user.whatsapp) {
      throw new BadRequestException(
        'É obrigatório cadastrar o seu número de WhatsApp antes de publicar anúncios.',
      );
    }

    if (!user.notificationsEnabled) {
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
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: 'newest' | 'price_asc' | 'price_desc';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));
    const skip = (page - 1) * limit;

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
      where.condition = params.condition as any;
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
          category: true,
          seller: {
            select: { id: true, name: true, avatarUrl: true, city: undefined as any },
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

    if (!product) {
      throw new NotFoundException('Anúncio não encontrado.');
    }

    return product;
  }

  async update(userId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });

    if (product.sellerId !== userId) {
      throw new ForbiddenException('Você não tem permissão para alterar este anúncio.');
    }

    if (dto.images && dto.images.length > 5) {
      throw new BadRequestException('Cada anúncio pode ter no máximo 5 imagens.');
    }

    return this.prisma.$transaction(async (tx) => {
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
  }

  async updateStatus(userId: string, productId: string, status: ProductStatus) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });

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

    if (product.sellerId !== userId) {
      throw new ForbiddenException('Você não tem permissão para excluir este anúncio.');
    }

    await this.prisma.product.delete({ where: { id: productId } });
    return { success: true };
  }
}
