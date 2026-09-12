import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ImageKit from 'imagekit';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private imagekit: ImageKit | null = null;
  private readonly urlEndpoint: string | null;

  constructor(private readonly configService: ConfigService) {
    const publicKey = this.configService.get<string>('IMAGEKIT_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('IMAGEKIT_PRIVATE_KEY');
    const urlEndpoint = this.configService.get<string>('IMAGEKIT_URL_ENDPOINT');
    this.urlEndpoint = urlEndpoint || null;

    if (publicKey && privateKey && urlEndpoint) {
      this.imagekit = new ImageKit({
        publicKey,
        privateKey,
        urlEndpoint,
      });
      this.logger.log('ImageKit initialized');
    }
  }

  isReady() {
    return this.imagekit !== null;
  }

  getAuthParameters() {
    if (this.imagekit) {
      return this.imagekit.getAuthenticationParameters();
    }

    throw new ServiceUnavailableException('Serviço de imagens indisponível.');
  }

  assertManagedImages(images: Array<{ url: string; fileId: string }>) {
    if (!this.urlEndpoint) {
      throw new ServiceUnavailableException('Serviço de imagens indisponível.');
    }

    const endpoint = new URL(this.urlEndpoint);
    const basePath = endpoint.pathname.replace(/\/$/, '');
    for (const image of images) {
      let url: URL;
      try {
        url = new URL(image.url);
      } catch {
        throw new BadRequestException('Uma das imagens possui URL inválida.');
      }

      if (
        url.protocol !== 'https:' ||
        url.origin !== endpoint.origin ||
        !url.pathname.startsWith(`${basePath}/`) ||
        !image.fileId.trim()
      ) {
        throw new BadRequestException('A imagem não pertence ao serviço configurado.');
      }
    }
  }

  async deleteFiles(fileIds: string[]) {
    if (!this.imagekit || fileIds.length === 0) return;

    const results = await Promise.allSettled(
      [...new Set(fileIds)].map((fileId) => this.imagekit!.deleteFile(fileId)),
    );
    const failed = results.filter((result) => result.status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn(`${failed} arquivo(s) antigo(s) não puderam ser removidos do ImageKit.`);
    }
  }
}
