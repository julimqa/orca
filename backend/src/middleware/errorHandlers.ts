import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: '요청한 리소스를 찾을 수 없습니다.',
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  // Express error handler signature requires `next`, even if unused.
  void next;

  if (res.headersSent) {
    return;
  }

  // CORS rejection (normalize to 403)
  if (err instanceof Error && err.message === 'Not allowed by CORS') {
    logger.warn({ requestId: req.requestId }, 'cors_rejected');
    res.status(403).json({
      success: false,
      message: '허용되지 않은 Origin입니다.',
    });
    return;
  }

  if (err instanceof AppError) {
    // Keep client responses identical; log only.
    logger.warn(
      {
        requestId: req.requestId,
        status: err.status,
        body: err.body,
      },
      'app_error'
    );
    res.status(err.status).json(err.body);
    return;
  }

  logger.error({ requestId: req.requestId, err }, 'unhandled_error');

  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';

  res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'development' ? message : undefined,
  });
}
