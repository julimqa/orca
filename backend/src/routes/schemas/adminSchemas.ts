import { z } from 'zod';

export const approveUserSchema = z.object({
  email: z.string().email({ message: '유효한 이메일을 입력하세요.' }),
  action: z.enum(['approve', 'reject'], { message: 'action은 approve/reject 중 하나여야 합니다.' }),
});

export const updateUserRoleSchema = z.object({
  email: z.string().email({ message: '유효한 이메일을 입력하세요.' }),
  role: z.enum(['USER', 'ADMIN'], { message: 'role은 USER 또는 ADMIN 이어야 합니다.' }),
});

export const updateUserStatusSchema = z.object({
  email: z.string().email({ message: '유효한 이메일을 입력하세요.' }),
  status: z.enum(['ACTIVE', 'REJECTED', 'PENDING'], { message: 'status는 ACTIVE/REJECTED/PENDING 이어야 합니다.' }),
});

export const resetPasswordSchema = z.object({
  email: z.string().email({ message: '유효한 이메일을 입력하세요.' }),
  newPassword: z.string().min(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' }),
});
