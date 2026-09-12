import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

interface RateWindow {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, RateWindow>();
  private readonly max: number;
  private readonly windowMs: number;

  constructor(config: ConfigService) {
    this.max = config.get<number>('RATE_LIMIT_MAX') || 120;
    this.windowMs = config.get<number>('RATE_LIMIT_WINDOW_MS') || 60_000;
  }

  canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    if (request.path === '/health' || request.path === '/health/live') return true;

    const now = Date.now();
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + this.windowMs };
      this.windows.set(key, window);
    }

    window.count += 1;
    const remaining = Math.max(0, this.max - window.count);
    response.setHeader('RateLimit-Limit', this.max);
    response.setHeader('RateLimit-Remaining', remaining);
    response.setHeader('RateLimit-Reset', Math.ceil(window.resetAt / 1000));

    if (window.count > this.max) {
      response.setHeader('Retry-After', Math.ceil((window.resetAt - now) / 1000));
      throw new HttpException(
        'Muitas requisições. Tente novamente em instantes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (this.windows.size > 10_000) {
      for (const [storedKey, storedWindow] of this.windows) {
        if (storedWindow.resetAt <= now) this.windows.delete(storedKey);
      }
    }

    return true;
  }
}
