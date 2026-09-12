import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { FirebaseAdminModule } from './firebase/firebase-admin.module.js';
import { UsersModule } from './users/users.module.js';
import { UploadModule } from './upload/upload.module.js';
import { ProductsModule } from './products/products.module.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';
import { NegotiationsModule } from './negotiations/negotiations.module.js';
import { ChatModule } from './chat/chat.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { HealthModule } from './health/health.module.js';
import { validateEnvironment } from './config/environment.js';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitGuard } from './common/rate-limit.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    FirebaseAdminModule,
    NotificationsModule,
    UsersModule,
    UploadModule,
    ProductsModule,
    VehiclesModule,
    NegotiationsModule,
    ChatModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {}
