import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('env config', () => {
  test('loads valid env vars', async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3030';
    process.env.DB_URI = 'mongodb://dummy/db';
    process.env.JWT_SECRET = 'this-is-a-secret';
    process.env.JWT_EXPIRES_IN = '1h';

    const mod = await import('../config/env.ts');
    expect(mod.env.PORT).toBe(3030);
    expect(mod.env.NODE_ENV).toBe('test');
  });

  test('throws when required env missing', async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'test';
    delete process.env.DB_URI;
    delete process.env.JWT_SECRET;

    await expect(import('../config/env.ts')).rejects.toThrow('Invalid environment variables');
  });

  test('throws in production when JWT secret is too short', async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.DB_URI = 'mongodb://dummy/db';
    process.env.JWT_SECRET = 'short-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.PORT = '3000';

    await expect(import('../config/env.ts')).rejects.toThrow('at least 32 characters in production');
  });
});

describe('mongoose models', () => {
  test('user model validates required fields and email format', async () => {
    const { default: UserModel } = await import('../models/user.model.ts');

    const invalid = new UserModel({ name: 'A', email: 'bad-email', password: '123' });
    await expect(invalid.validate()).rejects.toBeTruthy();

    const valid = new UserModel({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });
    await expect(valid.validate()).resolves.toBeUndefined();
  });

  test('subscription model computes renewalDate on validate', async () => {
    const { default: SubscriptionModel } = await import('../models/subscription.model.ts');

    const doc: any = new SubscriptionModel({
      name: 'Netflix',
      price: 9.99,
      currency: 'USD',
      frequency: 'monthly',
      category: 'entertainment',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      user: '507f1f77bcf86cd799439011',
    });

    await doc.validate();
    expect(doc.renewalDate).toBeTruthy();
  });
});
