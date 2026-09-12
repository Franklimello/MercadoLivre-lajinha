import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '@prisma/client';

@Controller('negotiations/:id/messages')
@UseGuards(FirebaseAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  getMessages(@CurrentUser() user: User, @Param('id') negotiationId: string) {
    return this.chatService.getMessages(user.id, negotiationId);
  }
}
