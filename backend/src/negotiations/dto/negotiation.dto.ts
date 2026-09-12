import { IsEnum, IsString } from 'class-validator';
import { NegotiationStatus } from '@prisma/client';

export class CreateNegotiationDto {
  @IsString()
  productId!: string;
}

export class UpdateNegotiationStatusDto {
  @IsEnum(NegotiationStatus)
  status!: NegotiationStatus;
}
