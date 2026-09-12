import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway.js';
import { ChatService } from './chat.service.js';
import { ChatController } from './chat.controller.js';

@Module({
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
