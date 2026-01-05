import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger';

const isProd = process.env.NODE_ENV === 'production';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 회원가입
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await AuthService.register(req.body);
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'auth_register_error');
    return next(
      new AppError(500, {
        success: false,
        message: '회원가입 처리 중 오류가 발생했습니다.',
      })
    );
  }
}

/**
 * 로그인
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await AuthService.login(req.body);

    if (result.body?.accessToken) {
      res.cookie('access_token', result.body.accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * ONE_DAY_MS,
        path: '/',
      });
    }

    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'auth_login_error');
    return next(
      new AppError(500, {
        success: false,
        message: '로그인 처리 중 오류가 발생했습니다.',
      })
    );
  }
}

/**
 * 내 정보 조회
 * GET /api/auth/me
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    const result = await AuthService.getMe(userId);
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'auth_get_me_error');
    return next(
      new AppError(500, {
        success: false,
        message: '사용자 정보 조회 중 오류가 발생했습니다.',
      })
    );
  }
}

/**
 * 프로필 업데이트
 * PATCH /api/auth/profile
 */
export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    const result = await AuthService.updateProfile(userId, req.body);
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'auth_update_profile_error');
    return next(
      new AppError(500, {
        success: false,
        message: '프로필 업데이트 중 오류가 발생했습니다.',
      })
    );
  }
}

/**
 * 비밀번호 변경
 * POST /api/auth/change-password
 */
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    const result = await AuthService.changePassword(userId, req.body);
    res.status(result.status).json(result.body);
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'auth_change_password_error');
    return next(
      new AppError(500, {
        success: false,
        message: '비밀번호 변경 중 오류가 발생했습니다.',
      })
    );
  }
}
