import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ImageKit from 'imagekit';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private imagekit: ImageKit | null = null;

  constructor(private readonly configService: ConfigService) {
    const publicKey = this.configService.get<string>('IMAGEKIT_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('IMAGEKIT_PRIVATE_KEY');
    const urlEndpoint = this.configService.get<string>('IMAGEKIT_URL_ENDPOINT');

    if (publicKey && privateKey && urlEndpoint) {
      this.imagekit = new ImageKit({
        publicKey,
        privateKey,
        urlEndpoint,
      });
      this.logger.log('ImageKit initialized');
    } else {
      this.logger.warn('ImageKit credentials missing in .env. Mocking auth parameters in dev mode.');
    }
  }

  getAuthParameters() {
    if (this.imagekit) {
      return this.imagekit.getAuthenticationParameters();
    }

    return {
      token: 'mock-imagekit-token-' + Date.now(),
      expire: Math.floor(Date.now() / 1000) + 1800,
      signature: 'mock-imagekit-signature',
    };
  }
}
