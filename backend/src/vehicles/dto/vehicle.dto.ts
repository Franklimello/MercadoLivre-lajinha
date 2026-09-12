import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCondition, VehicleType } from '@prisma/client';
import { ProductImageDto } from '../../products/dto/product.dto.js';

export class CreateVehicleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price!: number;

  @IsEnum(ProductCondition)
  condition!: ProductCondition;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsString()
  city?: string = 'Lajinha';

  @IsOptional()
  @IsString()
  state?: string = 'MG';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images!: ProductImageDto[];

  // Campos específicos de veículo
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsString()
  brand!: string;

  @IsString()
  model!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1950)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  mileage!: number;

  @IsString()
  color!: string;

  @IsString()
  fuel!: string;

  @IsString()
  transmission!: string;

  @IsString()
  engine!: string;

  @IsOptional()
  @IsString()
  bodyType?: string;

  @IsOptional()
  @IsString()
  plateEnd?: string;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mileage?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  fuel?: string;

  @IsOptional()
  @IsString()
  transmission?: string;

  @IsOptional()
  @IsString()
  engine?: string;

  @IsOptional()
  @IsString()
  bodyType?: string;

  @IsOptional()
  @IsString()
  plateEnd?: string;
}
