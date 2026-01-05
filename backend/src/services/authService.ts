import prisma from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';

type ServiceResult = { status: number; body: any };

export class AuthService {
  static async register(input: { email?: string; password?: string; name?: string }): Promise<ServiceResult> {
    const { email, password, name } = input;

    if (!email || !password || !name) {
      return {
        status: 400,
        body: {
          success: false,
          message: '이메일, 비밀번호, 이름은 필수입니다.',
        },
      };
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return {
        status: 400,
        body: {
          success: false,
          message: '이미 등록된 이메일입니다.',
        },
      };
    }

    const hashedPassword = await hashPassword(password);

    // 첫 번째 사용자는 자동으로 ADMIN & ACTIVE
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: isFirstUser ? 'ADMIN' : 'USER',
        status: isFirstUser ? 'ACTIVE' : 'PENDING',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      status: 201,
      body: {
        success: true,
        message: isFirstUser
          ? '관리자 계정이 생성되었습니다.'
          : '회원가입이 완료되었습니다. 관리자 승인을 기다려주세요.',
        user,
      },
    };
  }

  static async login(input: { email?: string; password?: string }): Promise<ServiceResult> {
    const { email, password } = input;

    if (!email || !password) {
      return {
        status: 400,
        body: {
          success: false,
          message: '이메일과 비밀번호를 입력하세요.',
        },
      };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return {
        status: 401,
        body: {
          success: false,
          message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        },
      };
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return {
        status: 401,
        body: {
          success: false,
          message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        },
      };
    }

    if (user.status !== 'ACTIVE') {
      return {
        status: 403,
        body: {
          success: false,
          message: user.status === 'PENDING' ? '관리자 승인 후 로그인할 수 있습니다.' : '계정이 비활성화되었습니다.',
        },
      };
    }

    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    });

    return {
      status: 200,
      body: {
        success: true,
        message: '로그인 성공',
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      },
    };
  }

  static async getMe(userId: string | undefined): Promise<ServiceResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return {
        status: 404,
        body: {
          success: false,
          message: '사용자를 찾을 수 없습니다.',
        },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        user,
      },
    };
  }

  static async updateProfile(userId: string | undefined, input: { name?: string }): Promise<ServiceResult> {
    const { name } = input;

    if (!name) {
      return {
        status: 400,
        body: {
          success: false,
          message: '이름은 필수입니다.',
        },
      };
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      return {
        status: 404,
        body: { success: false, message: '사용자를 찾을 수 없습니다.' },
      };
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { name },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (currentUser.name !== name) {
        await tx.planItem.updateMany({
          where: { assignee: currentUser.name },
          data: { assignee: name },
        });
      }

      return user;
    });

    return {
      status: 200,
      body: {
        success: true,
        message: '프로필이 업데이트되었습니다.',
        user: updatedUser,
      },
    };
  }

  static async changePassword(
    userId: string | undefined,
    input: { currentPassword?: string; newPassword?: string }
  ): Promise<ServiceResult> {
    const { currentPassword, newPassword } = input;

    if (!currentPassword || !newPassword) {
      return {
        status: 400,
        body: {
          success: false,
          message: '현재 비밀번호와 새 비밀번호는 필수입니다.',
        },
      };
    }

    if (newPassword.length < 6) {
      return {
        status: 400,
        body: {
          success: false,
          message: '새 비밀번호는 최소 6자 이상이어야 합니다.',
        },
      };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return {
        status: 404,
        body: {
          success: false,
          message: '사용자를 찾을 수 없습니다.',
        },
      };
    }

    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return {
        status: 401,
        body: {
          success: false,
          message: '현재 비밀번호가 올바르지 않습니다.',
        },
      };
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

    return {
      status: 200,
      body: {
        success: true,
        message: '비밀번호가 변경되었습니다.',
      },
    };
  }
}
