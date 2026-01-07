import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE = 'csrf_token';
const ACCESS_COOKIE = 'access_token';
const isProd = process.env.NODE_ENV === 'production';
const maxAgeMs = 7 * 24 * 60 * 60 * 1000;

function issueToken(res: Response): string {
  const token = crypto.randomBytes(16).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // double submit cookie 패턴 (클라이언트가 읽어 헤더로 보냄)
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax', // cross-origin 쿠키는 'none' 필요
    maxAge: maxAgeMs,
    path: '/',
  });
  return token;
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  const path = req.path || '';

  const existingToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const token = existingToken ?? issueToken(res);

  // access_token 쿠키 기반 인증일 때만 CSRF 검증 강제
  const hasSessionCookie = Boolean(req.cookies?.[ACCESS_COOKIE]);
  const hasBearerAuth =
    typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ');

  // 로그인/회원가입은 CSRF 검사 생략 (세션 쿠키 존재 시에도 허용)
  if (path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register')) {
    return next();
  }

  if (!isSafe && hasSessionCookie && !hasBearerAuth) {
    const headerToken = (req.headers['x-csrf-token'] as string | undefined)?.trim();
    if (!headerToken || headerToken !== token) {
      res.status(403).json({ success: false, message: 'Invalid CSRF token' });
      return;
    }
  }

  return next();
}
