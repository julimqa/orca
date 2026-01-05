import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
let runtimeDevSecret: string | null = null;

function loadOrCreateDevSecret(): string {
  if (runtimeDevSecret) return runtimeDevSecret;

  const cacheDir = path.join(process.cwd(), '.cache');
  const cacheFile = path.join(cacheDir, 'jwt_dev_secret');

  if (fs.existsSync(cacheFile)) {
    runtimeDevSecret = fs.readFileSync(cacheFile, 'utf-8').trim();
    if (runtimeDevSecret) return runtimeDevSecret;
  }

  const generated = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cacheFile, generated, 'utf-8');
  runtimeDevSecret = generated;
  return runtimeDevSecret;
}

interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

function resolveJwtSecret(): string {
  if (JWT_SECRET && JWT_SECRET.trim().length > 0) return JWT_SECRET;

  // 프로덕션에서는 환경 변수 미설정 시 즉시 중단
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  // 개발/테스트: 한 번 생성해 .cache에 보관하여 재시작 시 세션 지속
  return loadOrCreateDevSecret();
}

/** JWT 액세스 토큰 생성 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, resolveJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/** JWT 액세스 토큰 검증 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, resolveJwtSecret()) as JwtPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
}
