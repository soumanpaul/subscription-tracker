import { describe, expect, test, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  findById: vi.fn(),
}));

vi.mock('../config/env.ts', () => ({ env: { JWT_SECRET: 'test-secret' } }));
vi.mock('../config/env', () => ({ env: { JWT_SECRET: 'test-secret' } }));
vi.mock('jsonwebtoken', () => ({ default: { verify: mocks.verify } }));
vi.mock('../models/user.model.js', () => ({ default: { findById: mocks.findById } }));
vi.mock('../models/user.model', () => ({ default: { findById: mocks.findById } }));

import authorizeJs from '../middleware/auth.middleware.js';
import authorizeTsDuplicate from '../controllers/user.controller.ts';

describe('authorize middleware (both files)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verify.mockReturnValue({ userId: 'u1' });
    mocks.findById.mockResolvedValue({ _id: 'u1' });
  });

  const runAuth = async (fn: typeof authorizeJs, authorization?: string) => {
    const req: any = { headers: {} };
    if (authorization) req.headers.authorization = authorization;

    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn();
    const res: any = { status: statusMock, json: jsonMock };
    const next = vi.fn();

    await fn(req, res, next);
    return { req, res, next, statusMock, jsonMock };
  };

  test('returns 401 when token missing', async () => {
    const result = await runAuth(authorizeJs);
    expect(result.statusMock).toHaveBeenCalledWith(401);
    expect(result.next).not.toHaveBeenCalled();
  });

  test('returns 401 for invalid user', async () => {
    mocks.findById.mockResolvedValue(null);
    const result = await runAuth(authorizeJs, 'Bearer token');

    expect(result.statusMock).toHaveBeenCalledWith(401);
    expect(result.next).not.toHaveBeenCalled();
  });

  test('sets req.user and calls next on success', async () => {
    const result = await runAuth(authorizeJs, 'Bearer token');
    expect(result.req.user).toEqual({ _id: 'u1' });
    expect(result.next).toHaveBeenCalled();
  });

  test('returns 401 on verify exception', async () => {
    mocks.verify.mockImplementation(() => {
      throw new Error('bad token');
    });

    const result = await runAuth(authorizeJs, 'Bearer token');
    expect(result.statusMock).toHaveBeenCalledWith(401);
    expect(result.jsonMock).toHaveBeenCalled();
  });

  test('duplicate authorize implementation also works', async () => {
    const result = await runAuth(authorizeTsDuplicate as any, 'Bearer token');
    expect(result.next).toHaveBeenCalled();
  });

  test('duplicate authorize returns 401 when token missing', async () => {
    const result = await runAuth(authorizeTsDuplicate as any);
    expect(result.statusMock).toHaveBeenCalledWith(401);
  });

  test('duplicate authorize returns 401 on verify error', async () => {
    mocks.verify.mockImplementation(() => {
      throw new Error('bad token');
    });

    const result = await runAuth(authorizeTsDuplicate as any, 'Bearer token');
    expect(result.statusMock).toHaveBeenCalledWith(401);
  });
});
