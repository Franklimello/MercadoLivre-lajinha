import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class JoinNegotiationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  negotiationId!: string;
}

export class SendMessageDto extends JoinNegotiationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}
