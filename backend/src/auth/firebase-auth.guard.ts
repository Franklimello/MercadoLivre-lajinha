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

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Token de autenticação não fornecido.');
    }

    let decodedToken;
    try {
      decodedToken = await this.firebaseAdmin.verifyIdToken(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    const email = decodedToken.email?.trim().toLowerCase();
    if (!email) {
      throw new UnauthorizedException('A conta autenticada não possui e-mail.');
    }

    // Erros de banco devem continuar como falhas de infraestrutura, não como 401.
    const user = await this.prisma.user.upsert({
      where: { firebaseUid: decodedToken.uid },
      update: {
        name: decodedToken.name || 'Usuário',
        email,
        avatarUrl: decodedToken.picture || null,
      },
      create: {
        firebaseUid: decodedToken.uid,
        name: decodedToken.name || 'Usuário',
        email,
        avatarUrl: decodedToken.picture || null,
      },
    });

    request.user = user;
    return true;
  }
}
