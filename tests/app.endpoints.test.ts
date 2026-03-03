import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
  userCreate: vi.fn(),
  userFindById: vi.fn(),
  subscriptionCreate: vi.fn(),
  subscriptionFind: vi.fn(),
  scheduleReminders: vi.fn(),
  jwtSign: vi.fn(),
  jwtVerify: vi.fn(),
  genSalt: vi.fn(),
  hash: vi.fn(),
  compare: vi.fn(),
  queueAdd: vi.fn(),
  session: {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    abortTransaction: vi.fn(),
    endSession: vi.fn(),
  },
}));

vi.mock('../config/env.ts', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    DB_URI: 'mongodb://dummy-host:27017/test-db',
    JWT_SECRET: 'unit-test-secret-key',
    JWT_EXPIRES_IN: '15m',
  },
}));

vi.mock('../middleware/middleware.ts', () => ({
  createRateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('ioredis', () => ({
  default: class MockRedis {},
}));

vi.mock('bullmq', () => ({
  Queue: class MockQueue {
    add = mocks.queueAdd;
  },
}));

vi.mock('mongoose', () => ({
  default: {
    startSession: vi.fn(async () => mocks.session),
  },
  startSession: vi.fn(async () => mocks.session),
}));

vi.mock('bcryptjs', () => ({
  default: {
    genSalt: mocks.genSalt,
    hash: mocks.hash,
    compare: mocks.compare,
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: mocks.jwtSign,
    verify: mocks.jwtVerify,
  },
}));

vi.mock('../models/user.model.js', () => ({
  default: {
    findOne: mocks.userFindOne,
    create: mocks.userCreate,
    findById: mocks.userFindById,
  },
}));

vi.mock('../models/subscription.model.js', () => ({
  default: {
    create: mocks.subscriptionCreate,
    find: mocks.subscriptionFind,
  },
}));

vi.mock('../workflows/subscriptionReminder.workflow.js', () => ({
  scheduleSubscriptionReminders: mocks.scheduleReminders,
}));

import { app } from '../app.ts';

describe('Endpoint UTs', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.queueAdd.mockResolvedValue({ id: 'job-1' });

    mocks.genSalt.mockResolvedValue('salt-10');
    mocks.hash.mockResolvedValue('hashed-password');
    mocks.compare.mockResolvedValue(true);

    mocks.jwtSign.mockReturnValue('dummy.jwt.token');
    mocks.jwtVerify.mockReturnValue({ userId: 'user-123' });

    mocks.userFindOne.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue([
      { _id: 'user-123', name: 'Alice', email: 'alice@example.com', password: 'hashed-password' },
    ]);
    mocks.userFindById.mockResolvedValue({ _id: 'user-123', id: 'user-123', email: 'alice@example.com' });

    mocks.subscriptionCreate.mockResolvedValue({
      _id: 'sub-1',
      name: 'Netflix',
      price: 9.99,
      frequency: 'monthly',
      category: 'entertainment',
      user: 'user-123',
    });
    mocks.subscriptionFind.mockResolvedValue([
      { _id: 'sub-1', name: 'Netflix', user: 'user-123' },
    ]);
    mocks.scheduleReminders.mockResolvedValue(undefined);
  });

  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('GET / returns hello world', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Hello World');
  });

  test('POST /api/auth/sign-up creates user and returns token', async () => {
    const payload = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
    };

    const res = await request(app).post('/api/auth/sign-up').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('dummy.jwt.token');
    expect(mocks.userFindOne).toHaveBeenCalledWith({ email: 'alice@example.com' });
    expect(mocks.userCreate).toHaveBeenCalled();
  });

  test('POST /api/auth/signup creates user and returns token', async () => {
    const payload = {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
    };

    const res = await request(app).post('/api/auth/signup').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('dummy.jwt.token');
  });

  test('POST /api/auth/login authenticates user and returns token', async () => {
    mocks.userFindOne.mockResolvedValue({
      _id: 'user-123',
      name: 'Alice',
      email: 'alice@example.com',
      password: 'hashed-password',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('dummy.jwt.token');
  });

  test('POST /api/auth/logout logs out user', async () => {
    const res = await request(app).post('/api/auth/logout').send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('User logged out successfully');
  });

  test('POST /api/auth/sign-up duplicate user returns error payload', async () => {
    mocks.userFindOne.mockResolvedValue({ _id: 'existing-user', email: 'alice@example.com' });

    const res = await request(app)
      .post('/api/auth/sign-up')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
    expect(res.body.message).toBe('User already exists');
  });

  test('POST /api/v1/subscription requires auth token', async () => {
    const res = await request(app).post('/api/v1/subscription').send({ name: 'Netflix' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  test('POST /api/v1/subscription creates subscription with dummy data', async () => {
    const payload = {
      name: 'Netflix',
      price: 9.99,
      currency: 'USD',
      frequency: 'monthly',
      category: 'entertainment',
      startDate: '2026-03-01T00:00:00.000Z',
    };

    const res = await request(app)
      .post('/api/v1/subscription')
      .set('Authorization', 'Bearer valid-token')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe('sub-1');
    expect(mocks.subscriptionCreate).toHaveBeenCalled();
    expect(mocks.scheduleReminders).toHaveBeenCalledWith('sub-1');
  });

  test('GET /api/v1/subscription/user/:id returns subscriptions for owner', async () => {
    const res = await request(app)
      .get('/api/v1/subscription/user/user-123')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(mocks.subscriptionFind).toHaveBeenCalledWith({ user: 'user-123' });
  });

  test('POST /start enqueues first workflow step', async () => {
    const res = await request(app).post('/start').send({ seed: 'x' });

    expect(res.status).toBe(200);
    expect(res.body.jobId).toBe('job-1');
    expect(mocks.queueAdd).toHaveBeenCalledWith('step1', { initialData: { seed: 'x' } }, { removeOnComplete: true });
  });

  test('unknown route returns not_found payload', async () => {
    const res = await request(app).get('/missing-route');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });
});
