import mongoose from "mongoose";

// Duplicate key error shape (MongoServerError)
type MongoDuplicateKeyError = {
  code: 11000;
  keyValue?: Record<string, unknown>;
  keyPattern?: Record<string, unknown>;
  message?: string;
};

export function isDuplicateKeyError(err: unknown): err is MongoDuplicateKeyError {
  return typeof err === "object" && err !== null && (err as any).code === 11000;
}

export function isMongooseValidationError(
  err: unknown
): err is mongoose.Error.ValidationError {
  return err instanceof mongoose.Error.ValidationError;
}

export function isMongooseCastError(err: unknown): err is mongoose.Error.CastError {
  return err instanceof mongoose.Error.CastError;
}
