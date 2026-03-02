import { describe, expect, test } from 'vitest';
import mongoose from 'mongoose';

import { HttpError } from '../errors/http-error.ts';
import { isDuplicateKeyError, isMongooseCastError, isMongooseValidationError } from '../utils/mongoose-errors.ts';
import { toHttpError } from '../utils/to-http-error.ts';

describe('HttpError', () => {
  test('creates error with status and details', () => {
    const err = new HttpError('bad request', 400, { field: 'email' });
    expect(err.message).toBe('bad request');
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('mongoose error guards', () => {
  test('duplicate key detection works', () => {
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
    expect(isDuplicateKeyError({ code: 999 })).toBe(false);
  });

  test('validation and cast detection works', () => {
    const validationError = new mongoose.Error.ValidationError();
    const castError = new mongoose.Error.CastError('ObjectId', 'x', '_id');

    expect(isMongooseValidationError(validationError)).toBe(true);
    expect(isMongooseValidationError(new Error('x'))).toBe(false);

    expect(isMongooseCastError(castError)).toBe(true);
    expect(isMongooseCastError(new Error('x'))).toBe(false);
  });
});

describe('toHttpError', () => {
  test('returns existing HttpError unchanged', () => {
    const original = new HttpError('already handled', 401);
    expect(toHttpError(original)).toBe(original);
  });

  test('maps duplicate key error to 409', () => {
    const err = toHttpError({ code: 11000, keyValue: { email: 'a@a.com' } });
    expect(err.statusCode).toBe(409);
    expect(err.message).toContain('email');
  });

  test('maps duplicate key error without keyValue to generic message', () => {
    const err = toHttpError({ code: 11000 });
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Duplicate key');
  });

  test('maps validation error to 400', () => {
    const validationError = new mongoose.Error.ValidationError();
    (validationError as any).errors = {
      name: { path: 'name', message: 'name required', kind: 'required' },
    };

    const err = toHttpError(validationError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Validation failed');
  });

  test('maps cast _id to invalid id and other cast paths', () => {
    const idErr = toHttpError(new mongoose.Error.CastError('ObjectId', 'bad', '_id'));
    expect(idErr.statusCode).toBe(400);
    expect(idErr.message).toBe('Invalid id');

    const pathErr = toHttpError(new mongoose.Error.CastError('string', 1, 'price'));
    expect(pathErr.message).toBe('Invalid value for price');
  });

  test('fallback keeps error message or uses internal server error', () => {
    expect(toHttpError(new Error('boom')).message).toBe('boom');
    expect(toHttpError('x' as unknown as Error).message).toBe('Internal Server Error');
  });
});
