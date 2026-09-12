import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { UploadService } from './upload.service.js';

function service() {
  return new UploadService(
    new ConfigService({ IMAGEKIT_URL_ENDPOINT: 'https://ik.imagekit.io/mercado-lajinha' }),
  );
}

describe('UploadService.assertManagedImages', () => {
  it('aceita imagens do endpoint configurado', () => {
    expect(() =>
      service().assertManagedImages([
        {
          url: 'https://ik.imagekit.io/mercado-lajinha/anuncios/foto.webp',
          fileId: 'file-1',
        },
      ]),
    ).not.toThrow();
  });

  it('recusa referências hospedadas fora do ImageKit configurado', () => {
    expect(() =>
      service().assertManagedImages([
        { url: 'https://attacker.example/foto.webp', fileId: 'file-1' },
      ]),
    ).toThrow(BadRequestException);
  });
});
