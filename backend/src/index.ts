import app from './app';
import { logger } from './lib/logger';
const PORT = process.env.PORT || 3001;

// 서버 시작
app.listen(PORT, () => {
  logger.info(
    {
      env: process.env.NODE_ENV || 'development',
      port: PORT,
      health: `http://localhost:${PORT}/health`,
    },
    'backend_server_started'
  );
});

export default app;
