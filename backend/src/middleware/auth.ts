import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

// Request 객체 확장
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
    role: string;
    status: string;
  };
}

/**
 * JWT 검증 미들웨어
 * - Authorization: Bearer <token> 또는 httpOnly 쿠키(access_token)에서 토큰을 추출
 */
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = (req as any).cookies?.access_token as string | undefined;
  const token = bearerToken || cookieToken;

  if (!token) {
    res.status(401).json({
      success: false,
      message: '인증 토큰이 없습니다.',
    });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: '유효하지 않거나 만료된 토큰입니다.',
    });
  }
}
