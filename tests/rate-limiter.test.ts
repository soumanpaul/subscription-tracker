import { describe, expect, test } from 'vitest';
import type { Request } from 'express';

import { InMemoryFixedWindowStore } from '../rate-limiter/memory-store.ts';
import { ApiKeyHeaderStrategy, IpKeyStrategy } from '../rate-limiter/key-strategies.ts';
import { createRateLimiter } from '../middleware/middleware.ts';

describe('InMemoryFixedWindowStore', () => {
  test('allows up to max within same window and blocks afterward', async () => {
    const store = new InMemoryFixedWindowStore({ cleanupIntervalMs: 1000 });
    const params = { key: 'k1', windowMs: 60_000, max: 2, nowMs: 1000 };

    const d1 = await store.consume(params);
    const d2 = await store.consume(params);
    const d3 = await store.consume(params);

    expect(d1.allowed).toBe(true);
    expect(d2.allowed).toBe(true);
    expect(d3.allowed).toBe(false);
    expect(d3.retryAfterSeconds).toBeTypeOf('number');
  });

  test('resets count in new window and handles maxKeys guardrail', async () => {
    const store = new InMemoryFixedWindowStore({ maxKeys: 1 });

    await store.consume({ key: 'a', windowMs: 10, max: 1, nowMs: 0 });
    await store.consume({ key: 'b', windowMs: 10, max: 1, nowMs: 0 });

    const decision = await store.consume({ key: 'a', windowMs: 10, max: 1, nowMs: 20 });
    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(0);
  });
});

describe('Key strategies', () => {
  test('IpKeyStrategy uses req.ip and fallback', () => {
    const strategy = new IpKeyStrategy();
    expect(strategy.getKey({ ip: '1.2.3.4' } as Request)).toBe('1.2.3.4');
    expect(strategy.getKey({ ip: '' } as Request)).toBe('unknown-ip');
  });

  test('ApiKeyHeaderStrategy uses api key and falls back to ip', () => {
    const strategy = new ApiKeyHeaderStrategy('x-api-key');

    const withKey = {
      ip: '9.9.9.9',
      header: (name: string) => (name === 'x-api-key' ? 'abc' : undefined),
    } as unknown as Request;

    const noKey = {
      ip: '8.8.8.8',
      header: () => undefined,
    } as unknown as Request;

    expect(strategy.getKey(withKey)).toBe('apiKey:abc');
    expect(strategy.getKey(noKey)).toBe('ip:8.8.8.8');
    expect(strategy.getKey({ ip: '', header: () => undefined } as unknown as Request)).toBe('ip:unknown-ip');
  });
});

describe('createRateLimiter', () => {
  test('throws for invalid config', () => {
    const store = new InMemoryFixedWindowStore();
    const keyStrategy = new IpKeyStrategy();

    expect(() => createRateLimiter({ windowMs: 0, max: 1, store, keyStrategy })).toThrow();
    expect(() => createRateLimiter({ windowMs: 1, max: 0, store, keyStrategy })).toThrow();
  });

  test('sets headers, allows request, and blocks when limit exceeded', async () => {
    const store = new InMemoryFixedWindowStore();
    const keyStrategy = new IpKeyStrategy();
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 1,
      store,
      keyStrategy,
      legacyHeaders: true,
    });

    const req = { ip: '1.1.1.1', path: '/x' } as Request;
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (k: string, v: string) => {
        headers[k] = String(v);
      },
      status(code: number) {
        return {
          json: (payload: unknown) => ({ code, payload }),
        };
      },
    };

    let nextCalled = 0;
    const next = () => {
      nextCalled += 1;
    };

    await limiter(req, res as never, next);
    expect(nextCalled).toBe(1);
    expect(headers['RateLimit-Limit']).toBe('1');

    const blocked = await limiter(req, res as never, next);
    expect(blocked).toBeTruthy();
  });

  test('skip option bypasses limiting and error in store fails open', async () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 1,
      skip: (req) => req.path === '/health',
      store: {
        consume: async () => {
          throw new Error('store down');
        },
      },
      keyStrategy: new IpKeyStrategy(),
    });

    let nextCalled = 0;
    const next = () => {
      nextCalled += 1;
    };

    const res = { setHeader: () => undefined, status: () => ({ json: () => undefined }) };
    await limiter({ path: '/health', ip: '1.1.1.1' } as Request, res as never, next);
    await limiter({ path: '/any', ip: '1.1.1.1' } as Request, res as never, next);

    expect(nextCalled).toBe(2);
  });
});
