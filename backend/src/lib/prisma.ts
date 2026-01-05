import { PrismaClient } from '@prisma/client';

// Prisma Client 인스턴스 생성 (싱글톤 패턴)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
