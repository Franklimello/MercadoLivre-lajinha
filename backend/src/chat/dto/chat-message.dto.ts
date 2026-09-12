import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

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

export class ReadMessagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  messageIds!: string[];
}
