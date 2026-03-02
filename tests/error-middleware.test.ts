import { describe, expect, test, vi } from 'vitest';

import errorMiddleware from '../middleware/error.middleware.js';

describe('error.middleware', () => {
  test('handles cast error path', () => {
    const join = vi.fn();
    const res: any = { status: vi.fn().mockReturnValue({ join }) };
    const next = vi.fn();

    errorMiddleware({ name: 'CastError', message: 'bad cast' }, {} as any, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(join).toHaveBeenCalled();
  });

  test('handles duplicate and validation errors', () => {
    const join = vi.fn();
    const res: any = { status: vi.fn().mockReturnValue({ join }) };
    const next = vi.fn();

    errorMiddleware({ code: 11000, message: 'dup' }, {} as any, res, next);
    errorMiddleware({ name: 'ValidationError', errors: { f: { message: 'field required' } } }, {} as any, res, next);

    expect(res.status).toHaveBeenCalled();
  });

  test('falls to next when response handling throws', () => {
    const res: any = { status: vi.fn(() => { throw new Error('res fail'); }) };
    const next = vi.fn();

    errorMiddleware({ message: 'x' }, {} as any, res, next);

    expect(next).toHaveBeenCalled();
  });
});
