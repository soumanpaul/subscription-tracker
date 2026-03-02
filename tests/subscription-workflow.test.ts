import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  subscriptionCreate: vi.fn(),
  subscriptionFind: vi.fn(),
  scheduleReminders: vi.fn(),
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

import { createSubscription, getUserSubscriptions } from '../controllers/subscription.controller.ts';

describe('subscription.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscriptionCreate.mockResolvedValue({ _id: 's1', user: 'u1' });
    mocks.scheduleReminders.mockResolvedValue(undefined);
    mocks.subscriptionFind.mockResolvedValue([{ _id: 's1' }]);
  });

  test('createSubscription success', async () => {
    const req: any = { body: { name: 'Netflix' }, user: { _id: 'u1' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await createSubscription(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mocks.scheduleReminders).toHaveBeenCalledWith('s1');
  });

  test('createSubscription error calls next', async () => {
    mocks.subscriptionCreate.mockRejectedValue(new Error('db fail'));
    const req: any = { body: {}, user: { _id: 'u1' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await createSubscription(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('getUserSubscriptions owner success', async () => {
    const req: any = { user: { id: 'u1' }, params: { id: 'u1' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await getUserSubscriptions(req, res, next);

    expect(mocks.subscriptionFind).toHaveBeenCalledWith({ user: 'u1' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getUserSubscriptions non-owner falls into catch and calls next()', async () => {
    const req: any = { user: { id: 'u2' }, params: { id: 'u1' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await getUserSubscriptions(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
