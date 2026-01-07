import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { generateShareToken } from '../utils/shareToken';

// 폴더 경로 조회 헬퍼 함수
async function getFolderPath(folderId: string | null): Promise<{ id: string; name: string }[]> {
  if (!folderId) return [];

  const path: { id: string; name: string }[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder: { id: string; name: string; parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, parentId: true },
    });
    if (!folder) break;
    path.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }

  return path;
}

const SHARE_EXPIRES_DAYS = 7;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * (Auth) Create a new share link for a plan report.
 * POST /api/reports/plans/:planId/share-links
 */
export async function createPlanReportShareLink(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { planId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true } });
    if (!plan) {
      res.status(404).json({ success: false, message: '플랜을 찾을 수 없습니다.' });
      return;
    }

    const now = new Date();
    const expiresAt = addDays(now, SHARE_EXPIRES_DAYS);

    // Retry token generation on rare unique collision
    for (let attempt = 0; attempt < 5; attempt++) {
      const token = generateShareToken(32);
      try {
        const link = await prisma.reportShareLink.create({
          data: {
            token,
            planId,
            createdByUserId: userId,
            expiresAt,
          },
          select: {
            id: true,
            token: true,
            planId: true,
            createdByUserId: true,
            createdAt: true,
            expiresAt: true,
            revokedAt: true,
          },
        });

        res.status(201).json({ success: true, data: link });
        return;
      } catch (e: unknown) {
        // Prisma unique constraint violation
        if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') continue;
        throw e;
      }
    }

    res.status(500).json({ success: false, message: '공유 링크 생성에 실패했습니다. 다시 시도해주세요.' });
  } catch (error) {
    console.error('Create report share link error:', error);
    res.status(500).json({ success: false, message: '공유 링크 생성 중 오류가 발생했습니다.' });
  }
}

/**
 * (Auth) List share links for a plan report.
 * GET /api/reports/plans/:planId/share-links
 */
export async function listPlanReportShareLinks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { planId } = req.params;

    const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true } });
    if (!plan) {
      res.status(404).json({ success: false, message: '플랜을 찾을 수 없습니다.' });
      return;
    }

    const links = await prisma.reportShareLink.findMany({
      where: { planId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        planId: true,
        createdByUserId: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    res.json({ success: true, data: links });
  } catch (error) {
    console.error('List report share links error:', error);
    res.status(500).json({ success: false, message: '공유 링크 목록 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * (Auth) Revoke a share link.
 * POST /api/reports/share-links/:id/revoke
 */
export async function revokeReportShareLink(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const link = await prisma.reportShareLink.findUnique({
      where: { id },
      select: { id: true, revokedAt: true },
    });

    if (!link) {
      res.status(404).json({ success: false, message: '공유 링크를 찾을 수 없습니다.' });
      return;
    }

    if (link.revokedAt) {
      res.json({ success: true, data: link, message: '이미 폐기된 링크입니다.' });
      return;
    }

    const updated = await prisma.reportShareLink.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: {
        id: true,
        token: true,
        planId: true,
        createdByUserId: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Revoke report share link error:', error);
    res.status(500).json({ success: false, message: '공유 링크 폐기 중 오류가 발생했습니다.' });
  }
}

/**
 * (Public) Fetch plan report data by share token.
 * GET /api/public/reports/share/:token
 *
 * Rules:
 * - invalid token -> 404
 * - expired/revoked -> 410
 * - includes plan items (case list)
 */
export async function getPublicPlanReportByToken(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    const link = await prisma.reportShareLink.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        planId: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!link) {
      res.status(404).json({ success: false, message: '공유 링크를 찾을 수 없습니다.' });
      return;
    }

    const now = new Date();
    if (link.revokedAt || link.expiresAt <= now) {
      res.status(410).json({ success: false, message: '만료되었거나 폐기된 공유 링크입니다.' });
      return;
    }

    const plan = await prisma.plan.findUnique({
      where: { id: link.planId },
      include: {
        items: {
          include: {
            testCase: {
              include: {
                folder: {
                  select: { id: true, name: true, parentId: true },
                },
              },
            },
          },
          orderBy: [{ order: 'asc' }, { testCase: { sequence: 'asc' } }],
        },
      },
    });

    if (!plan) {
      // Link exists but plan deleted (should be prevented by FK); treat as gone.
      res.status(410).json({ success: false, message: '공유 대상 플랜을 찾을 수 없습니다.' });
      return;
    }

    // 각 테스트케이스에 folderPath 추가
    const itemsWithFolderPath = await Promise.all(
      plan.items.map(async (item) => {
        const folderPath = await getFolderPath(item.testCase.folderId);
        return {
          ...item,
          testCase: {
            ...item.testCase,
            folderPath,
          },
        };
      })
    );

    res.json({
      success: true,
      data: {
        share: link,
        plan: { ...plan, items: itemsWithFolderPath },
      },
    });
  } catch (error) {
    console.error('Get public plan report by token error:', error);
    res.status(500).json({ success: false, message: '공유 리포트 조회 중 오류가 발생했습니다.' });
  }
}
