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
import { VehiclesService } from './vehicles.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CreateVehicleDto, ListVehiclesQueryDto, UpdateVehicleDto } from './dto/vehicle.dto.js';
import { VehicleType, type User } from '@prisma/client';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get('brands')
  getBrands(@Query('vehicleType') vehicleType?: VehicleType) {
    return this.vehiclesService.getBrands(vehicleType);
  }

  @Get()
  findAll(@Query() query: ListVehiclesQueryDto) {
    return this.vehiclesService.findAll(query);
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

  @Patch(':id')
  @UseGuards(FirebaseAuthGuard)
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.vehiclesService.delete(user.id, id);
  }
}
