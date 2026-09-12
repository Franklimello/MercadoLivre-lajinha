import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Número de WhatsApp inválido. Utilize formato com DDD, ex: 33999998888 ou +5533999998888',
  })
  whatsapp?: string;

}

export class RegisterFcmTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token!: string;
}
