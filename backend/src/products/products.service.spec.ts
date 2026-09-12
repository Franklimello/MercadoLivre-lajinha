import { BadRequestException } from '@nestjs/common';
import { ProductStatus, ProductType } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from './products.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { UploadService } from '../upload/upload.service.js';

describe('ProductsService.delete', () => {
  it('arquiva o anúncio sem apagar negociações e mensagens', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'product-1' });
    const hardDelete = vi.fn();
    const prisma = {
      product: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'product-1',
          sellerId: 'seller-1',
          type: ProductType.PRODUCT,
          status: ProductStatus.ACTIVE,
        }),
        update,
        delete: hardDelete,
      },
    } as unknown as PrismaService;
    const service = new ProductsService(
      prisma,
      { assertManagedImages: vi.fn() } as unknown as UploadService,
    );

    await expect(service.delete('seller-1', 'product-1')).resolves.toEqual({ success: true });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { status: ProductStatus.ARCHIVED, stock: 0 },
    });
    expect(hardDelete).not.toHaveBeenCalled();
  });
});

describe('ProductsService.findAll', () => {
  it('recusa um intervalo de preço invertido antes de consultar o banco', async () => {
    const count = vi.fn();
    const service = new ProductsService(
      { product: { count } } as unknown as PrismaService,
      { assertManagedImages: vi.fn() } as unknown as UploadService,
    );

    await expect(service.findAll({ minPrice: 500, maxPrice: 100 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(count).not.toHaveBeenCalled();
  });
});
