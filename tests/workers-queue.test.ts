import { describe, expect, test, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  queueCtor: vi.fn(),
  queueAdd: vi.fn(),
  queueRemove: vi.fn(),
  workerCtor: vi.fn(),
  findById: vi.fn(),
  sendMail: vi.fn(),
}));

let capturedProcessors: Array<(job: any) => Promise<any>> = [];

vi.mock('ioredis', () => ({
  default: class MockRedis {
    constructor(_url?: string) {}
  },
}));

vi.mock('bullmq', () => ({
  Queue: class MockQueue {
    constructor(name: string, opts: unknown) {
      mocks.queueCtor(name, opts);
    }
    add = mocks.queueAdd;
    remove = mocks.queueRemove;
  },
  Worker: class MockWorker {
    constructor(_name: string, processor: (job: any) => Promise<any>, _opts?: unknown) {
      capturedProcessors.push(processor);
      mocks.workerCtor();
    }
  },
}));

vi.mock('../models/subscription.model.js', () => ({
  default: {
    findById: mocks.findById,
  },
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: mocks.sendMail,
    }),
  },
}));

describe('queue and workers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    capturedProcessors = [];
    mocks.queueAdd.mockResolvedValue(undefined);
    mocks.queueRemove.mockResolvedValue(undefined);
    mocks.sendMail.mockResolvedValue(undefined);
  });

  test('reminderQueue module creates queue with redis connection', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    await import('../queues/reminderQueue.ts');

    expect(mocks.queueCtor).toHaveBeenCalled();
  });

  test('subscription reminder worker processor sends email and marks reminder sent', async () => {
    await import('../workers/reminder.worker.ts');

    const processor = capturedProcessors[0];
    expect(processor).toBeTypeOf('function');

    const sub: any = {
      status: 'active',
      customerEmail: 'alice@example.com',
      name: 'Netflix',
      renewalDate: new Date('2026-04-01'),
      reminders: [{ offsetDays: 7, status: 'SCHEDULED' }],
      save: vi.fn().mockResolvedValue(undefined),
    };
    mocks.findById.mockResolvedValue(sub);

    await processor({ data: { subscriptionId: 's1', offset: 7 } });

    expect(mocks.sendMail).toHaveBeenCalled();
    expect(sub.reminders[0].status).toBe('SENT');
    expect(sub.save).toHaveBeenCalled();
  });

  test('subscription reminder worker handles non-active/missing reminder safely', async () => {
    await import('../workers/reminder.worker.ts');
    const processor = capturedProcessors[capturedProcessors.length - 1];

    mocks.findById.mockResolvedValue(null);
    await processor({ data: { subscriptionId: 'x', offset: 1 } });

    mocks.findById.mockResolvedValue({ status: 'cancelled' });
    await processor({ data: { subscriptionId: 'x', offset: 1 } });

    mocks.findById.mockResolvedValue({ status: 'active', reminders: [] });
    await processor({ data: { subscriptionId: 'x', offset: 1 } });

    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  test('worker.ts workflow processor handles step1 and step2 branches', async () => {
    await import('../worker.ts');
    const processor = capturedProcessors[capturedProcessors.length - 1];

    const step1Result = await processor({ name: 'step1', data: { initialData: { a: 1 } } });
    expect(step1Result).toEqual({ x: 1 });
    expect(mocks.queueAdd).toHaveBeenCalledWith('step2', { step1Result: { x: 1 } }, { removeOnComplete: true });

    const step2Result = await processor({ name: 'step2', data: { step1Result: { x: 1 } } });
    expect(step2Result).toEqual({ x: 2 });
  });
});
