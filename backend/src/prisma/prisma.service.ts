import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conectado com sucesso ao PostgreSQL (Neon)');
    } catch (error) {
      this.logger.warn(
        'Não foi possível conectar ao banco de dados PostgreSQL. Configure sua DATABASE_URL no arquivo backend/.env para persistir dados.',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
