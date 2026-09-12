import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: App | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (projectId && clientEmail && privateKey) {
      try {
        const formattedKey = privateKey.replace(/\\n/g, '\n');
        this.app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: formattedKey,
          }),
        });
        this.logger.log('Firebase Admin SDK initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin SDK', error);
      }
    } else {
      this.logger.warn(
        'Firebase credentials not provided in .env. Running in development mock auth mode.',
      );
    }
  }

  async verifyIdToken(token: string): Promise<DecodedIdToken> {
    if (this.app) {
      return getAuth(this.app).verifyIdToken(token);
    }

    // Development fallback if Firebase credentials are not yet configured
    this.logger.warn('Mocking token verification for development mode');
    return {
      uid: 'dev-user-123',
      email: 'dev@mercadolajinha.local',
      name: 'Usuario Teste Lajinha',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      aud: 'mock-aud',
      auth_time: Date.now(),
      exp: Date.now() + 3600000,
      firebase: { identities: {}, sign_in_provider: 'google.com' },
      iat: Date.now(),
      iss: 'mock-iss',
      sub: 'dev-user-123',
    } as DecodedIdToken;
  }

  async sendPushNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    if (!this.app || !tokens || tokens.length === 0) {
      this.logger.debug(`Push simulated: [${title}] ${body} to ${tokens?.length || 0} tokens`);
      return;
    }

    try {
      const response = await getMessaging(this.app).sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: data || {},
      });
      this.logger.log(`FCM sent: ${response.successCount} success, ${response.failureCount} failed`);
    } catch (error) {
      this.logger.error('Error sending FCM multicast notification', error);
    }
  }
}
