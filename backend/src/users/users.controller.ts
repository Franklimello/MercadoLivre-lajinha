import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UpdateProfileDto, RegisterFcmTokenDto } from './dto/update-profile.dto.js';
import type { User } from '@prisma/client';

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('fcm-token')
  async registerToken(@CurrentUser() user: User, @Body() dto: RegisterFcmTokenDto) {
    return this.usersService.registerFcmToken(user.id, dto);
  }
}
