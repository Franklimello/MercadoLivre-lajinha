import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: App | null = null;
  private readonly allowInsecureDevAuth: boolean;

  constructor(private readonly configService: ConfigService) {
    this.allowInsecureDevAuth =
      this.configService.get<boolean>('ALLOW_INSECURE_DEV_AUTH') === true &&
      this.configService.get<string>('NODE_ENV') !== 'production';
  }

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      if (this.allowInsecureDevAuth) {
        this.logger.warn('Autenticação simulada habilitada explicitamente para desenvolvimento.');
        return;
      }
      throw new Error('Credenciais do Firebase Admin não foram configuradas.');
    }

    try {
      const formattedKey = privateKey.replace(/\\n/g, '\n');
      this.app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey: formattedKey }),
      });
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      if (this.allowInsecureDevAuth) {
        this.logger.warn('Firebase indisponível; usando autenticação simulada explicitamente habilitada.');
        return;
      }
      throw error;
    }
  }

  isReady() {
    return this.app !== null;
  }

  async verifyIdToken(token: string): Promise<DecodedIdToken> {
    if (this.app) {
      return getAuth(this.app).verifyIdToken(token);
    }

    if (!this.allowInsecureDevAuth) {
      throw new Error('Firebase Admin não está disponível.');
    }

    this.logger.warn('Mocking token verification for development mode');
    const now = Math.floor(Date.now() / 1000);
    return {
      uid: 'dev-user-123',
      email: 'dev@mercadolajinha.local',
      name: 'Usuario Teste Lajinha',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      aud: 'mock-aud',
      auth_time: now,
      exp: now + 3600,
      firebase: { identities: {}, sign_in_provider: 'google.com' },
      iat: now,
      iss: 'mock-iss',
      sub: 'dev-user-123',
    } as DecodedIdToken;
  }

  async sendPushNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string[]> {
    if (tokens.length === 0) {
      return [];
    }

    if (!this.app) {
      throw new Error('Firebase Admin não está disponível para enviar notificações.');
    }

    try {
      const response = await getMessaging(this.app).sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: data || {},
      });
      this.logger.log(`FCM sent: ${response.successCount} success, ${response.failureCount} failed`);
      return response.responses.flatMap((result, index) => {
        const code = result.error?.code;
        return !result.success &&
          (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-argument')
          ? [tokens[index]]
          : [];
      });
    } catch (error) {
      this.logger.error('Error sending FCM multicast notification', error);
      throw error;
    }
  }
}
