import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NegotiationsService } from './negotiations.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import {
  CreateNegotiationDto,
  UpdateNegotiationStatusDto,
} from './dto/negotiation.dto.js';
import type { User } from '@prisma/client';

@Controller('negotiations')
@UseGuards(FirebaseAuthGuard)
export class NegotiationsController {
  constructor(private readonly negotiationsService: NegotiationsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateNegotiationDto) {
    return this.negotiationsService.findOrCreate(user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('role') role?: 'buying' | 'selling',
  ) {
    return this.negotiationsService.findAllForUser(user.id, role);
  }

  @Get('unread')
  unread(@CurrentUser() user: User) {
    return this.negotiationsService.getUnreadSummary(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.negotiationsService.findOne(user.id, id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateNegotiationStatusDto,
  ) {
    return this.negotiationsService.updateStatus(user.id, id, dto);
  }
}
