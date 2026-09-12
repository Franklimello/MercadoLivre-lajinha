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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    FirebaseAdminModule,
    UsersModule,
    UploadModule,
    ProductsModule,
    VehiclesModule,
    NegotiationsModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
