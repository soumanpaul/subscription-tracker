import mongoose from "mongoose";
import { HttpError } from "../errors/http-error";
import {
  isDuplicateKeyError,
  isMongooseValidationError,
  isMongooseCastError,
} from "./mongoose-errors";

export function toHttpError(err: unknown): HttpError {
  // Already an HttpError? keep it
  if (err instanceof HttpError) return err;

  // Duplicate key (E11000)
  if (isDuplicateKeyError(err)) {
    const keyValue = err.keyValue ?? {};
    const fields = Object.keys(keyValue);
    const fieldMsg =
      fields.length > 0
        ? `${fields.join(", ")} already exists`
        : "Duplicate key";
    return new HttpError(fieldMsg, 409, { keyValue });
  }

  // Mongoose validation error
  if (isMongooseValidationError(err)) {
    const details = Object.values(err.errors).map((e) => ({
      path: (e as any).path,
      message: e.message,
      kind: (e as any).kind,
    }));

    return new HttpError("Validation failed", 400, { errors: details });
  }

  // Bad ObjectId / cast error
  if (isMongooseCastError(err)) {
    // Commonly: Cast to ObjectId failed for value "..." at path "_id"
    const path = err.path;
    const value = err.value;

    const msg =
      path === "_id"
        ? "Invalid id"
        : `Invalid value for ${path}`;

    return new HttpError(msg, 400, { path, value });
  }

  // Fallback
  const message = err instanceof Error ? err.message : "Internal Server Error";
  return new HttpError(message, 500);
}
