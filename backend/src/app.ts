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
import { errorHandler, notFoundHandler } from './middleware/errorHandlers';
import { requestContext } from './middleware/requestContext';
import { requestLogger } from './middleware/requestLogger';
import { csrfProtection } from './middleware/csrf';

// 환경 변수 로드
dotenv.config();

export function createApp(): Application {
  const app: Application = express();

  // Correlation id + request logging (log-only; no response/header changes)
  app.use(requestContext);
  app.use(requestLogger);
  app.use(cookieParser());
  app.use(csrfProtection);

  // CORS 설정 (deny-by-default)
  // - 기본: 명시 allowlist만 허용
  // - 개발 편의: Origin 없는 요청(curl/서버-서버)은 허용
  const allowedOrigins = [
    'http://localhost:5173',
    'https://tmsv2-production.up.railway.app',
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ALLOWED_ORIGINS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? []),
  ]
    .filter(Boolean)
    .map((o) => String(o).replace(/\/+$/, '')); // normalize trailing slash

  const allowVercelPreview = String(process.env.CORS_ALLOW_VERCEL_PREVIEW ?? '').toLowerCase() === 'true';
  const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';

  function isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return true;
    try {
      const u = new URL(origin);
      // Dev convenience: allow any localhost port (Vite may auto-increment if 5173 is taken)
      if (isDev && u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]')) {
        return true;
      }
      origin = u.origin;
    } catch {
      // ignore parse failures; fallback to string compare
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

  // JSON 파싱 미들웨어
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API 응답은 동적으로 변하므로 캐시를 비활성화 (ETag 기반 304로 인한 UI/테스트 stale 방지)
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

  // API 라우트
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/folders', folderRoutes);
  app.use('/api/testcases', testCaseRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/upload', uploadRoutes);

  // 404 핸들러
  app.use(notFoundHandler);

  // 에러 핸들러
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
