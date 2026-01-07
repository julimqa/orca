import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import folderRoutes from './routes/folders';
import testCaseRoutes from './routes/testcases';
import planRoutes from './routes/plans';
import dashboardRoutes from './routes/dashboard';
import uploadRoutes from './routes/upload';
import reportRoutes from './routes/reports';
import publicRoutes from './routes/public';
import { errorHandler, notFoundHandler } from './middleware/errorHandlers';
import { requestContext } from './middleware/requestContext';
import { requestLogger } from './middleware/requestLogger';
import { csrfProtection } from './middleware/csrf';

// 환경 변수 로드
dotenv.config();

export function createApp(): Application {
  const app: Application = express();

  // ========================================
  // 1. CORS (preflight 요청 처리를 위해 가장 먼저)
  // ========================================
  const allowedOrigins = [
    'http://localhost:5173',
    'https://tmsv2-production.up.railway.app',
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ALLOWED_ORIGINS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? []),
  ]
    .filter(Boolean)
    .map((o) => String(o).replace(/\/+$/, ''));

  const allowVercelPreview = String(process.env.CORS_ALLOW_VERCEL_PREVIEW ?? '').toLowerCase() === 'true';
  const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';

  function isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return true;
    try {
      const u = new URL(origin);
      if (isDev && u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]')) {
        return true;
      }
      origin = u.origin;
    } catch {
      // ignore
    }
    if (allowedOrigins.some((allowed) => origin === allowed || origin.startsWith(allowed))) return true;
    if (allowVercelPreview && origin.endsWith('.vercel.app')) return true;
    return false;
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // ========================================
  // 2. Body 파싱 (다른 미들웨어보다 먼저!)
  // ========================================
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ========================================
  // 3. Cookie 파싱
  // ========================================
  app.use(cookieParser());

  // ========================================
  // 4. Request context & logging (body 파싱 후)
  // ========================================
  app.use(requestContext);
  app.use(requestLogger);

  // ========================================
  // 5. CSRF 보호
  // ========================================
  app.use(csrfProtection);

  // ========================================
  // 6. 기타 설정
  // ========================================
  
  // API 응답 캐시 비활성화
  app.use('/api', (req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Health check 엔드포인트
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'TMS Backend Server is running',
      timestamp: new Date().toISOString(),
    });
  });

  // 정적 파일 서빙 (업로드된 이미지)
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // ========================================
  // 7. API 라우트
  // ========================================
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/folders', folderRoutes);
  app.use('/api/testcases', testCaseRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/public', publicRoutes);

  // 404 핸들러
  app.use(notFoundHandler);

  // 에러 핸들러
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
