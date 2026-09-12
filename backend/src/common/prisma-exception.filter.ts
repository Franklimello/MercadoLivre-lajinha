import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    const mapped =
      exception.code === 'P2025'
        ? new NotFoundException('Registro não encontrado.')
        : exception.code === 'P2002'
          ? new ConflictException('Já existe um registro com estes dados.')
          : exception.code === 'P2003'
            ? new BadRequestException('O registro relacionado é inválido.')
            : new InternalServerErrorException('Não foi possível concluir a operação.');

    response.status(mapped.getStatus()).json(mapped.getResponse());
  }
}
