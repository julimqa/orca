export class AppError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(
      message ??
        (typeof body === 'object' && body !== null && 'message' in (body as any)
          ? String((body as any).message)
          : 'AppError')
    );
    this.name = 'AppError';
    this.status = status;
    this.body = body;
  }
}
