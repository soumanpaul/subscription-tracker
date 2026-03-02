import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  subscriptionFindById: vi.fn(),
  queueRemove: vi.fn(),
  queueAdd: vi.fn(),
}));

vi.mock('../models/subscription.model.js', () => ({
  default: {
    findById: mocks.subscriptionFindById,
  },
}));

vi.mock('../queues/reminderQueue.js', () => ({
  reminderQueue: {
    remove: mocks.queueRemove,
    add: mocks.queueAdd,
  },
}));

import { scheduleSubscriptionReminders } from '../workflows/subscriptionReminder.workflow.ts';

describe('scheduleSubscriptionReminders workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queueRemove.mockResolvedValue(undefined);
    mocks.queueAdd.mockResolvedValue(undefined);
  });

  test('returns when subscription missing or inactive or expired', async () => {
    mocks.subscriptionFindById.mockResolvedValueOnce(null);
    await scheduleSubscriptionReminders('id-1');

    mocks.subscriptionFindById.mockResolvedValueOnce({ status: 'cancelled' });
    await scheduleSubscriptionReminders('id-2');

    mocks.subscriptionFindById.mockResolvedValueOnce({ status: 'active', renewalDate: new Date(Date.now() - 1000) });
    await scheduleSubscriptionReminders('id-3');

    expect(mocks.queueAdd).not.toHaveBeenCalled();
  });

  test('cancels old reminders and schedules new ones', async () => {
    const sub: any = {
      _id: 'sub-1',
      status: 'active',
      renewalDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      reminderOffsets: [7, 1],
      reminders: [{ jobId: 'old-1', status: 'SCHEDULED' }, { jobId: 'old-2', status: 'SENT' }],
      save: vi.fn().mockResolvedValue(undefined),
    };

    mocks.subscriptionFindById.mockResolvedValue(sub);

    await scheduleSubscriptionReminders('sub-1');

    expect(mocks.queueRemove).toHaveBeenCalledWith('old-1');
    expect(mocks.queueAdd).toHaveBeenCalledTimes(2);
    expect(sub.save).toHaveBeenCalled();
    expect(sub.reminders.every((r: any) => r.status === 'SCHEDULED')).toBe(true);
  });

  test('ignores reminderQueue.remove errors by catch', async () => {
    const sub: any = {
      _id: 'sub-1',
      status: 'active',
      renewalDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      reminderOffsets: [1],
      reminders: [{ jobId: 'old-1', status: 'SCHEDULED' }],
      save: vi.fn().mockResolvedValue(undefined),
    };

    mocks.subscriptionFindById.mockResolvedValue(sub);
    mocks.queueRemove.mockRejectedValue(new Error('remove failed'));

    await scheduleSubscriptionReminders('sub-1');

    expect(mocks.queueAdd).toHaveBeenCalledTimes(1);
    expect(sub.save).toHaveBeenCalled();
  });
});
