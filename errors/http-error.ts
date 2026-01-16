export class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;

    // Required for extending built-in classes
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
