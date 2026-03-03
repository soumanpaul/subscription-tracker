import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  startSession: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  genSalt: vi.fn(),
  hash: vi.fn(),
  compare: vi.fn(),
  sign: vi.fn(),
}));

vi.mock('../config/env.ts', () => ({ env: { JWT_SECRET: 'secret' } }));
vi.mock('mongoose', () => ({ default: { startSession: mocks.startSession } }));
vi.mock('../models/user.model.js', () => ({ default: { findOne: mocks.findOne, create: mocks.create } }));
vi.mock('bcryptjs', () => ({ default: { genSalt: mocks.genSalt, hash: mocks.hash, compare: mocks.compare } }));
vi.mock('jsonwebtoken', () => ({ default: { sign: mocks.sign } }));

import { signIn, signOut, signUp } from '../controllers/auth.controller.ts';

describe('auth.controller', () => {
  const session = {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    abortTransaction: vi.fn(),
    endSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.startSession.mockResolvedValue(session);
    mocks.findOne.mockResolvedValue(null);
    mocks.genSalt.mockResolvedValue('salt');
    mocks.hash.mockResolvedValue('hash');
    mocks.create.mockResolvedValue([{ _id: 'u1', email: 'a@a.com' }]);
    mocks.compare.mockResolvedValue(true);
    mocks.sign.mockReturnValue('jwt-token');
  });

  test('signUp success path', async () => {
    const req: any = { body: { name: 'A', email: 'a@a.com', password: 'pass123' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await signUp(req, res, next);

    expect(session.startTransaction).toHaveBeenCalled();
    expect(session.commitTransaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  test('signUp duplicate user triggers next(error) and aborts tx', async () => {
    mocks.findOne.mockResolvedValue({ _id: 'existing' });

    const req: any = { body: { name: 'A', email: 'a@a.com', password: 'pass123' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await signUp(req, res, next);

    expect(session.abortTransaction).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  test('signIn success path', async () => {
    mocks.findOne.mockResolvedValue({ _id: 'u1', email: 'a@a.com', password: 'hash' });

    const req: any = { body: { email: 'a@a.com', password: 'pass123' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await signIn(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  test('signIn user missing goes to next(error)', async () => {
    mocks.findOne.mockResolvedValue(null);

    const req: any = { body: { email: 'x@y.com', password: 'pass123' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await signIn(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('signIn invalid password goes to next(error)', async () => {
    mocks.findOne.mockResolvedValue({ _id: 'u1', email: 'a@a.com', password: 'hash' });
    mocks.compare.mockResolvedValue(false);

    const req: any = { body: { email: 'a@a.com', password: 'wrong' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await signIn(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('signOut is defined and callable', async () => {
    const req: any = {};
    const res: any = {
      clearCookie: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await signOut(req, res, next);

    expect(res.clearCookie).toHaveBeenCalledWith('token');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'User logged out successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
