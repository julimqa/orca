import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Request correlation id.
 * - Accept incoming X-Request-Id if present
 * - Otherwise generate a UUID
 *
 * NOTE: This is log-only (no response headers / no payload changes).
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const requestId = incoming && incoming.trim().length > 0 ? incoming.trim() : randomUUID();
  req.requestId = requestId;
  res.locals.requestId = requestId;
  next();
}
