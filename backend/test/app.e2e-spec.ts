import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { vi } from 'vitest';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      PORT: '3001',
      FRONTEND_URL: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/test',
      DIRECT_URL: 'postgresql://user:password@localhost:5432/test',
      FIREBASE_PROJECT_ID: 'test-project',
      FIREBASE_CLIENT_EMAIL: 'firebase@test-project.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
      IMAGEKIT_PUBLIC_KEY: 'public_test',
      IMAGEKIT_PRIVATE_KEY: 'private_test',
      IMAGEKIT_URL_ENDPOINT: 'https://ik.imagekit.io/test-project',
    });

    const [{ AppModule }, { PrismaService }, { FirebaseAdminService }, { UploadService }] =
      await Promise.all([
        import('./../src/app.module.js'),
        import('./../src/prisma/prisma.service.js'),
        import('./../src/firebase/firebase-admin.service.js'),
        import('./../src/upload/upload.service.js'),
      ]);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: vi.fn(),
        $disconnect: vi.fn(),
        $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      })
      .overrideProvider(FirebaseAdminService)
      .useValue({ isReady: () => true, verifyIdToken: vi.fn() })
      .overrideProvider(UploadService)
      .useValue({ isReady: () => true, getAuthParameters: vi.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  it('/health/ready (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ready');
      });
  });

  it('/products rejects invalid filters before querying the database', () => {
    return request(app.getHttpServer()).get('/products?condition=INVALID').expect(400);
  });

  it('/users/me rejects anonymous requests', () => {
    return request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    if (app) await app.close();
  });
});
