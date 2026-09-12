import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import {
  CreateProductDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto/product.dto.js';
import type { User } from '@prisma/client';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('categories')
  getCategories() {
    return this.productsService.getCategories();
  }

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('category') categorySlug?: string,
    @Query('condition') condition?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sort') sort?: 'newest' | 'price_asc' | 'price_desc',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findAll({
      q,
      categorySlug,
      condition,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(FirebaseAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(FirebaseAuthGuard)
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user.id, id, dto);
  }

  @Patch(':id/status')
  @UseGuards(FirebaseAuthGuard)
  updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.productsService.updateStatus(user.id, id, dto.status);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.productsService.delete(user.id, id);
  }
}
