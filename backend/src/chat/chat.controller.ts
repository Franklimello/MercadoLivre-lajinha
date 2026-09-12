import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { User } from '@prisma/client';
import { ReadMessagesDto } from './dto/chat-message.dto.js';
import { ChatGateway } from './chat.gateway.js';

@Controller('negotiations/:id/messages')
@UseGuards(FirebaseAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly gateway: ChatGateway,
  ) {}

  @Patch('read')
  async markRead(
    @CurrentUser() user: User,
    @Param('id') negotiationId: string,
    @Body() dto: ReadMessagesDto,
  ) {
    const result = await this.chatService.markMessagesRead(
      user.id,
      negotiationId,
      dto.messageIds,
    );
    if (result.count > 0)
      this.gateway.notifyMessagesRead(user.id, negotiationId, result);
    return result;
  }

  @Get()
  getMessages(@CurrentUser() user: User, @Param('id') negotiationId: string) {
    return this.chatService.getMessages(user.id, negotiationId);
  }
}
