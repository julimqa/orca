import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email({ message: '유효한 이메일을 입력하세요.' }),
  password: z.string().min(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' }),
  name: z.string().min(1, { message: '이름은 필수입니다.' }),
});

export const loginSchema = z.object({
  email: z.string().email({ message: '유효한 이메일을 입력하세요.' }),
  password: z.string().min(1, { message: '비밀번호는 필수입니다.' }),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, { message: '이름은 필수입니다.' }),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: '현재 비밀번호를 입력하세요.' }),
  newPassword: z.string().min(6, { message: '새 비밀번호는 최소 6자 이상이어야 합니다.' }),
});
