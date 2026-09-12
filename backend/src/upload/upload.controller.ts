import { Controller, Get, UseGuards } from '@nestjs/common';
import { UploadService } from './upload.service.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';

@Controller('upload')
@UseGuards(FirebaseAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('auth')
  getAuth() {
    return this.uploadService.getAuthParameters();
  }
}
