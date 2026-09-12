import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { FirebaseAdminService } from './firebase-admin.service.js';

describe('FirebaseAdminService', () => {
  it('falha de forma fechada sem credenciais', () => {
    const service = new FirebaseAdminService(new ConfigService({ NODE_ENV: 'development' }));

    expect(() => service.onModuleInit()).toThrow(/não foram configuradas/);
  });

  it('só usa identidade simulada após opção explícita em desenvolvimento', async () => {
    const service = new FirebaseAdminService(
      new ConfigService({ NODE_ENV: 'development', ALLOW_INSECURE_DEV_AUTH: true }),
    );

    expect(() => service.onModuleInit()).not.toThrow();
    await expect(service.verifyIdToken('local-token')).resolves.toEqual(
      expect.objectContaining({ uid: 'dev-user-123' }),
    );
  });

  it('ignora a opção insegura em produção', () => {
    const service = new FirebaseAdminService(
      new ConfigService({ NODE_ENV: 'production', ALLOW_INSECURE_DEV_AUTH: true }),
    );

    expect(() => service.onModuleInit()).toThrow(/não foram configuradas/);
  });
});
