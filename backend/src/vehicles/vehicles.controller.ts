import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CreateVehicleDto } from './dto/vehicle.dto.js';
import { VehicleType, type User } from '@prisma/client';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get('brands')
  getBrands(@Query('vehicleType') vehicleType?: VehicleType) {
    return this.vehiclesService.getBrands(vehicleType);
  }

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('vehicleType') vehicleType?: VehicleType,
    @Query('brand') brand?: string,
    @Query('model') model?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('minYear') minYear?: number,
    @Query('maxYear') maxYear?: number,
    @Query('maxMileage') maxMileage?: number,
    @Query('fuel') fuel?: string,
    @Query('transmission') transmission?: string,
    @Query('sort') sort?: 'newest' | 'price_asc' | 'price_desc',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.vehiclesService.findAll({
      q,
      vehicleType,
      brand,
      model,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minYear: minYear ? Number(minYear) : undefined,
      maxYear: maxYear ? Number(maxYear) : undefined,
      maxMileage: maxMileage ? Number(maxMileage) : undefined,
      fuel,
      transmission,
      sort,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  @UseGuards(FirebaseAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(user.id, dto);
  }
}
