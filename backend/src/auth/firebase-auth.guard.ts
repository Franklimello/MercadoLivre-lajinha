import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseAdminService } from '../firebase/firebase-admin.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido.');
    }

    const token = authHeader.split('Bearer ')[1].trim();

    try {
      const decodedToken = await this.firebaseAdmin.verifyIdToken(token);
      
      // Upsert user in Postgres DB
      const user = await this.prisma.user.upsert({
        where: { firebaseUid: decodedToken.uid },
        update: {
          name: decodedToken.name || 'Usuário',
          email: decodedToken.email || `${decodedToken.uid}@mercadolajinha.local`,
          avatarUrl: decodedToken.picture || null,
        },
        create: {
          firebaseUid: decodedToken.uid,
          name: decodedToken.name || 'Usuário',
          email: decodedToken.email || `${decodedToken.uid}@mercadolajinha.local`,
          avatarUrl: decodedToken.picture || null,
        },
      });

      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }
}
