import type { ExecutionContext } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { RateLimitGuard } from './rate-limit.guard.js';

function context(path = '/products') {
  const response = { setHeader: vi.fn() };
  const request = { ip: '127.0.0.1', path, socket: {} };
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  it('bloqueia o endereço que excede a janela configurada', () => {
    const config = new ConfigService({ RATE_LIMIT_MAX: 2, RATE_LIMIT_WINDOW_MS: 60_000 });
    const guard = new RateLimitGuard(config);
    const requestContext = context();

    expect(guard.canActivate(requestContext)).toBe(true);
    expect(guard.canActivate(requestContext)).toBe(true);
    expect(() => guard.canActivate(requestContext)).toThrow(HttpException);
  });

  it('não limita probes nem consome a quota dos clientes', () => {
    const guard = new RateLimitGuard(new ConfigService({ RATE_LIMIT_MAX: 1 }));
    for (const path of ['/health', '/health/live']) {
      expect(guard.canActivate(context(path))).toBe(true);
      expect(guard.canActivate(context(path))).toBe(true);
    }
    expect(guard.canActivate(context())).toBe(true);
    expect(() => guard.canActivate(context())).toThrow(HttpException);
  });
});
