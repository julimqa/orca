import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱 시드 데이터 생성을 시작합니다...');

  // 기존 사용자 삭제 (개발 환경에서만)
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'admin@tms.com',
          'test1@tms.com',
          'test2@tms.com',
          'test3@tms.com',
          'test4@tms.com',
          'test5@tms.com'
        ]
      }
    }
  });

  // 관리자 계정
  const adminPassword = await bcrypt.hash('admin123!', SALT_ROUNDS);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@tms.com',
      password: adminPassword,
      name: '관리자',
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  });
  console.log('✅ 관리자 계정 생성:', admin.email);

  // 테스트 계정 5개 생성
  const testPassword = await bcrypt.hash('test123!', SALT_ROUNDS);
  
  const testUser1 = await prisma.user.create({
    data: {
      email: 'test1@tms.com',
      password: testPassword,
      name: '테스트유저1',
      role: 'USER',
      status: 'ACTIVE'
    }
  });
  console.log('✅ 테스트 계정 1 생성:', testUser1.email);

  const testUser2 = await prisma.user.create({
    data: {
      email: 'test2@tms.com',
      password: testPassword,
      name: '테스트유저2',
      role: 'USER',
      status: 'ACTIVE'
    }
  });
  console.log('✅ 테스트 계정 2 생성:', testUser2.email);

  const testUser3 = await prisma.user.create({
    data: {
      email: 'test3@tms.com',
      password: testPassword,
      name: '테스트유저3',
      role: 'USER',
      status: 'ACTIVE'
    }
  });
  console.log('✅ 테스트 계정 3 생성:', testUser3.email);

  const testUser4 = await prisma.user.create({
    data: {
      email: 'test4@tms.com',
      password: testPassword,
      name: '테스트유저4',
      role: 'USER',
      status: 'ACTIVE'
    }
  });
  console.log('✅ 테스트 계정 4 생성:', testUser4.email);

  const testUser5 = await prisma.user.create({
    data: {
      email: 'test5@tms.com',
      password: testPassword,
      name: '테스트유저5',
      role: 'USER',
      status: 'ACTIVE'
    }
  });
  console.log('✅ 테스트 계정 5 생성:', testUser5.email);

  console.log('');
  console.log('🎉 시드 데이터 생성이 완료되었습니다!');
  console.log('');
  console.log('📋 생성된 계정 정보:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. 관리자 계정');
  console.log('   이메일: admin@tms.com');
  console.log('   비밀번호: admin123!');
  console.log('   역할: ADMIN');
  console.log('');
  console.log('2. 테스트 계정 1');
  console.log('   이메일: test1@tms.com');
  console.log('   비밀번호: test123!');
  console.log('   역할: USER');
  console.log('');
  console.log('3. 테스트 계정 2');
  console.log('   이메일: test2@tms.com');
  console.log('   비밀번호: test123!');
  console.log('   역할: USER');
  console.log('');
  console.log('4. 테스트 계정 3');
  console.log('   이메일: test3@tms.com');
  console.log('   비밀번호: test123!');
  console.log('   역할: USER');
  console.log('');
  console.log('5. 테스트 계정 4');
  console.log('   이메일: test4@tms.com');
  console.log('   비밀번호: test123!');
  console.log('   역할: USER');
  console.log('');
  console.log('6. 테스트 계정 5');
  console.log('   이메일: test5@tms.com');
  console.log('   비밀번호: test123!');
  console.log('   역할: USER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ 시드 데이터 생성 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

