import { NextFunction, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { hashPassword } from '../utils/password';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger';

/**
 * 가입 대기 사용자 목록 조회
 * GET /api/admin/pending-users
 */
export async function getPendingUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: {
        status: 'PENDING',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      users: pendingUsers,
    });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'admin_get_pending_users_error');
    return next(
      new AppError(500, {
        success: false,
        message: '사용자 목록 조회 중 오류가 발생했습니다.',
      })
    );
  }
}

/**
 * 모든 사용자 목록 조회 (관리자용)
 * GET /api/admin/users
 */
export async function getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'admin_get_all_users_error');
    return next(
      new AppError(500, {
        success: false,
        message: '사용자 목록 조회 중 오류가 발생했습니다.',
      })
    );
  }
}

/**
 * 사용자 승인/거절
 * PATCH /api/admin/users/approve
 */
export async function approveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, action } = req.body;

    // 필수 필드 검증
    if (!email || !action) {
      res.status(400).json({
        success: false,
        message: '이메일과 액션(approve/reject)은 필수 항목입니다.',
      });
      return;
    }

    // 액션 타입 검증
    if (action !== 'approve' && action !== 'reject') {
      res.status(400).json({
        success: false,
        message: '액션은 "approve" 또는 "reject"만 가능합니다.',
      });
      return;
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
      return;
    }

    // 상태 업데이트
    const newStatus = action === 'approve' ? 'ACTIVE' : 'REJECTED';

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { status: newStatus },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: action === 'approve' ? '사용자가 승인되었습니다.' : '사용자가 거절되었습니다.',
      user: updatedUser,
    });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'admin_approve_user_error');
    return next(
      new AppError(500, {
        success: false,
        message: '사용자 상태 업데이트 중 오류가 발생했습니다.',
      })
    );
  }
}

/**
 * 사용자 역할 변경
 * PATCH /api/admin/users/role
 */
export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, role } = req.body;

    // 필수 필드 검증
    if (!email || !role) {
      res.status(400).json({
        success: false,
        message: '이메일과 역할(USER/ADMIN)은 필수 항목입니다.',
      });
      return;
    }

    // 역할 타입 검증
    if (role !== 'USER' && role !== 'ADMIN') {
      res.status(400).json({
        success: false,
        message: '역할은 "USER" 또는 "ADMIN"만 가능합니다.',
      });
      return;
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
      return;
    }

    // 역할 업데이트
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: '사용자 역할이 변경되었습니다.',
      user: updatedUser,
    });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'admin_update_user_role_error');
    return next(
      new AppError(500, {
        success: false,
        message: '사용자 역할 업데이트 중 오류가 발생했습니다.',
      })
    );
  }
}

/**
 * 사용자 상태 변경
 * PATCH /api/admin/users/status
 */
export async function updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, status } = req.body;

    // 필수 필드 검증
    if (!email || !status) {
      res.status(400).json({
        success: false,
        message: '이메일과 상태(ACTIVE/REJECTED)는 필수 항목입니다.',
      });
      return;
    }

    // 상태 타입 검증
    if (status !== 'ACTIVE' && status !== 'REJECTED' && status !== 'PENDING') {
      res.status(400).json({
        success: false,
        message: '상태는 "ACTIVE", "REJECTED", "PENDING"만 가능합니다.',
      });
      return;
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
      return;
    }

    // 상태 업데이트
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { status },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: '사용자 상태가 변경되었습니다.',
      user: updatedUser,
    });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'admin_update_user_status_error');
    return next(
      new AppError(500, {
        success: false,
        message: '사용자 상태 업데이트 중 오류가 발생했습니다.',
      })
    );
  }
}

/**
 * 비밀번호 초기화
 * POST /api/admin/users/reset-password
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, newPassword } = req.body;

    // 필수 필드 검증
    if (!email || !newPassword) {
      res.status(400).json({
        success: false,
        message: '이메일과 새 비밀번호는 필수 항목입니다.',
      });
      return;
    }

    // 비밀번호 길이 검증
    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: '비밀번호는 최소 6자 이상이어야 합니다.',
      });
      return;
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
      return;
    }

    // 비밀번호 해시화
    const hashedPassword = await hashPassword(newPassword);

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    res.status(200).json({
      success: true,
      message: '비밀번호가 초기화되었습니다.',
    });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'admin_reset_password_error');
    return next(
      new AppError(500, {
        success: false,
        message: '비밀번호 초기화 중 오류가 발생했습니다.',
      })
    );
  }
}
