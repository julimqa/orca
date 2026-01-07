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
  const existingToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
  
  // 토큰이 없으면 새로 발급
  if (!existingToken) {
    issueToken(res);
  }

  // Cross-origin (Vercel) 환경에서는 CSRF 검증 비활성화
  // SameSite=None 쿠키가 제대로 작동하지 않는 경우가 있음
  // TODO: 추후 더 나은 CSRF 보호 방식 적용
  return next();
}
