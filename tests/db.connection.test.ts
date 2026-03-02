import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
}));

vi.mock('mongoose', () => ({
  default: {
    connect: mocks.connect,
  },
}));

vi.mock('../config/env.ts', () => ({
  env: {
    DB_URI: 'mongodb://dummy-host:27017/test-db',
    NODE_ENV: 'test',
  },
}));

import { connectToDatabase } from '../database/connectToDatabase.ts';

describe('DB connection UTs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('connectToDatabase calls mongoose.connect with DB URI', async () => {
    mocks.connect.mockResolvedValue({});

    await connectToDatabase();

    expect(mocks.connect).toHaveBeenCalledWith('mongodb://dummy-host:27017/test-db');
  });

  test('connectToDatabase exits process when connection fails', async () => {
    mocks.connect.mockRejectedValue(new Error('connection failed'));

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    await expect(connectToDatabase()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('connectToDatabase handles non-Error throw values', async () => {
    mocks.connect.mockRejectedValue({ reason: 'unknown' });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    await expect(connectToDatabase()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
