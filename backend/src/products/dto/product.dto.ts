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
import { ProductCondition, ProductStatus } from '@prisma/client';

export class ProductImageDto {
  @IsString()
  url!: string;

  @IsString()
  fileId!: string;
}

export class CreateProductDto {
  @IsString()
  @MinLength(3, { message: 'O título deve ter pelo menos 3 caracteres.' })
  @MaxLength(120, { message: 'O título deve ter no máximo 120 caracteres.' })
  title!: string;

  @IsString()
  @MinLength(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' })
  description!: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Preço inválido.' })
  @IsPositive({ message: 'O preço deve ser maior que zero.' })
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stock?: number = 1;

  @IsEnum(ProductCondition, { message: 'Condição do produto inválida.' })
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
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];
}

export class UpdateProductStatusDto {
  @IsEnum(ProductStatus)
  status!: ProductStatus;
}
