import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment.js';

const validEnvironment = {
  NODE_ENV: 'development',
  PORT: '3001',
  FRONTEND_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/marketplace',
  DIRECT_URL: 'postgresql://user:password@localhost:5432/marketplace',
  FIREBASE_PROJECT_ID: 'mercado-livre-lajinha',
  FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@mercado-livre-lajinha.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nabc123\n-----END PRIVATE KEY-----\n',
  IMAGEKIT_PUBLIC_KEY: 'public_abc123',
  IMAGEKIT_PRIVATE_KEY: 'private_abc123',
  IMAGEKIT_URL_ENDPOINT: 'https://ik.imagekit.io/mercadolivre',
};

describe('validateEnvironment', () => {
  it('normaliza uma configuração completa', () => {
    const result = validateEnvironment(validEnvironment);

    expect(result.PORT).toBe(3001);
    expect(result.ALLOW_INSECURE_DEV_AUTH).toBe(false);
  });

  it('usa 8080 quando PORT não é informada e preserva uma porta explícita', () => {
    expect(validateEnvironment({ ...validEnvironment, PORT: undefined }).PORT).toBe(8080);
    expect(validateEnvironment({ ...validEnvironment, PORT: '9090' }).PORT).toBe(9090);
  });

  it('recusa placeholders de serviços externos', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, DATABASE_URL: 'postgresql://user:pass@ep-xyz/db' }),
    ).toThrow(/DATABASE_URL/);
  });

  it('nunca permite autenticação simulada em produção', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        ALLOW_INSECURE_DEV_AUTH: 'true',
      }),
    ).toThrow(/nunca pode ser true em produção/);
  });
});
