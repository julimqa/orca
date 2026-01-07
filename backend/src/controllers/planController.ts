import { NextFunction, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger';

// 플랜 생성
export async function createPlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, testCaseIds, assignee } = req.body;

    if (!name || !testCaseIds || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
      res.status(400).json({ success: false, message: '플랜 이름과 테스트케이스 선택은 필수입니다.' });
      return;
    }

    const createdBy = req.user?.email || 'Unknown';

    const plan = await prisma.$transaction(async (tx) => {
      const newPlan = await tx.plan.create({
        data: {
          name,
          description,
          createdBy,
          status: 'ACTIVE',
        },
      });

      const planItemsData = testCaseIds.map((tcId: string, index: number) => ({
        planId: newPlan.id,
        testCaseId: tcId,
        assignee: assignee || null,
        result: 'NOT_RUN',
        order: index + 1,
      }));

      await tx.planItem.createMany({
        data: planItemsData,
      });

      return newPlan;
    });

    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'plan_create_error');
    return next(new AppError(500, { success: false, message: '플랜 생성 처리 중 오류가 발생했습니다.' }));
  }
}

// 플랜 목록 조회
export async function getPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.query;

    // status가 'ALL'이면 전체, 없으면 기본 ACTIVE 필터
    let where = {};
    if (status && status !== 'ALL') {
      where = { status: String(status) };
    } else if (!status) {
      where = { status: 'ACTIVE' };
    }

    const plans = await prisma.plan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          select: { result: true },
        },
      },
    });

    const data = plans.map((plan) => {
      const { items, ...planInfo } = plan;
      const total = items.length;
      const pass = items.filter((i) => i.result === 'PASS').length;
      const fail = items.filter((i) => i.result === 'FAIL').length;
      const block = items.filter((i) => i.result === 'BLOCK').length;
      const notRun = items.filter((i) => i.result === 'NOT_RUN').length;

      // 진행률 계산 (전체 - 미실행 / 전체)
      const runCount = total - notRun;
      const progress = total > 0 ? Math.round((runCount / total) * 100) : 0;

      return {
        ...planInfo,
        stats: { total, pass, fail, block, notRun, progress },
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'plan_get_list_error');
    return next(new AppError(500, { success: false, message: '플랜 목록을 불러오는 중 오류가 발생했습니다.' }));
  }
}

// 플랜 상세 조회
export async function getPlanDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { planId } = req.params;

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
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
          // 정렬: PlanItem.order 우선, 없으면 testCase.sequence
          orderBy: [{ order: 'asc' }, { testCase: { sequence: 'asc' } }],
        },
      },
    });

    if (!plan) {
      res.status(404).json({ success: false, message: '플랜을 찾을 수 없습니다.' });
      return;
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'plan_get_detail_error');
    return next(new AppError(500, { success: false, message: '플랜 상세 조회 중 오류가 발생했습니다.' }));
  }
}

// PlanItem 개별 업데이트
export async function updatePlanItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { planId, itemId } = req.params;
    const { result, comment, assignee, defects } = req.body;

    const item = await prisma.planItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      res.status(404).json({ success: false, message: 'PlanItem을 찾을 수 없습니다.' });
      return;
    }

    // Update data preparation
    const updateData: any = {};
    if (result !== undefined) {
      updateData.result = result;
      // If result is not NOT_RUN, update executedAt
      if (result !== 'NOT_RUN') {
        updateData.executedAt = new Date();
      }
    }
    if (defects !== undefined) {
      updateData.defects = defects || null;
    }
    if (comment !== undefined) {
      updateData.comment = comment;
    }
    if (assignee !== undefined) {
      updateData.assignee = assignee || null;
    }

    const updatedItem = await prisma.planItem.update({
      where: { id: itemId },
      data: updateData
    });

    res.json({ success: true, data: updatedItem });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'plan_update_item_error');
    return next(new AppError(500, { success: false, message: '테스트 결과 업데이트 중 오류가 발생했습니다.' }));
  }
}

// PlanItem 벌크 업데이트
export async function bulkUpdatePlanItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { planId } = req.params;
    const { items, result, comment, assignee, defects } = req.body; // items: array of planItemIds

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: '변경할 항목을 선택하세요.' });
      return;
    }

    if (!result && !assignee && comment === undefined && defects === undefined) {
      res.status(400).json({ success: false, message: '변경할 값을 지정하세요.' });
      return;
    }

    const updateData: any = {};

    if (result) {
      updateData.result = result;
      if (result !== 'NOT_RUN') {
        updateData.executedAt = new Date();
      }
    }

    if (comment !== undefined) {
      updateData.comment = comment;
    }

    if (assignee !== undefined) {
      updateData.assignee = assignee || null;
    }

    if (defects !== undefined) {
      updateData.defects = defects || null;
    }

    const updateResult = await prisma.planItem.updateMany({
      where: {
        id: { in: items },
        planId: planId, // Ensure items belong to this plan
      },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        count: updateResult.count,
        message: `${updateResult.count}개 항목이 업데이트되었습니다.`,
      },
    });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'plan_bulk_update_items_error');
    return next(new AppError(500, { success: false, message: '일괄 업데이트 중 오류가 발생했습니다.' }));
  }
}

// 플랜 업데이트 (이름, 설명, 테스트케이스 목록)
export async function updatePlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { planId } = req.params;
    const { name, description, testCaseIds } = req.body;

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: { items: true },
    });

    if (!plan) {
      res.status(404).json({ success: false, message: '플랜을 찾을 수 없습니다.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Plan 기본 정보 업데이트
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      const updated = await tx.plan.update({
        where: { id: planId },
        data: updateData,
      });

      // 2. 테스트케이스 목록 업데이트 (새로고침 경우)
      if (testCaseIds && Array.isArray(testCaseIds)) {
        const currentItems = plan.items;
        const currentTestCaseIds = currentItems.map((item) => item.testCaseId);

        // 추가할 테스트케이스 (새로 선택된 항목)
        const toAdd = testCaseIds.filter((id: string) => !currentTestCaseIds.includes(id));

        // 제거할 PlanItem (선택 해제된 항목)
        const toRemove = currentItems.filter((item) => !testCaseIds.includes(item.testCaseId));

        // 제거
        if (toRemove.length > 0) {
          await tx.planItem.deleteMany({
            where: {
              id: { in: toRemove.map((item) => item.id) },
            },
          });
        }

        // 추가
        if (toAdd.length > 0) {
          const maxOrder = currentItems.length > 0 ? Math.max(...currentItems.map((item) => item.order || 0)) : 0;

          const newItems = toAdd.map((tcId: string, index: number) => ({
            planId: planId,
            testCaseId: tcId,
            result: 'NOT_RUN',
            order: maxOrder + index + 1,
          }));

          await tx.planItem.createMany({
            data: newItems,
          });
        }
      }

      return updated;
    });

    // 업데이트된 플랜 상세 정보 반환
    const result = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        items: {
          include: { testCase: true },
          orderBy: [{ order: 'asc' }],
        },
      },
    });

    res.json({ success: true, data: result, message: '플랜이 업데이트되었습니다.' });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'plan_update_error');
    return next(new AppError(500, { success: false, message: '플랜 업데이트 중 오류가 발생했습니다.' }));
  }
}

// 플랜 아카이브
export async function archivePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { planId } = req.params;

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      res.status(404).json({ success: false, message: '플랜을 찾을 수 없습니다.' });
      return;
    }

    if (plan.status === 'ARCHIVED') {
      res.status(400).json({ success: false, message: '이미 아카이브된 플랜입니다.' });
      return;
    }

    const updatedPlan = await prisma.plan.update({
      where: { id: planId },
      data: { status: 'ARCHIVED' },
    });

    res.json({ success: true, data: updatedPlan, message: '플랜이 아카이브되었습니다.' });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'plan_archive_error');
    return next(new AppError(500, { success: false, message: '플랜 아카이브 중 오류가 발생했습니다.' }));
  }
}

// 플랜 아카이브 해제 (복원)
export async function unarchivePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { planId } = req.params;

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      res.status(404).json({ success: false, message: '플랜을 찾을 수 없습니다.' });
      return;
    }

    if (plan.status === 'ACTIVE') {
      res.status(400).json({ success: false, message: '이미 활성 상태입니다.' });
      return;
    }

    const updatedPlan = await prisma.plan.update({
      where: { id: planId },
      data: { status: 'ACTIVE' },
    });

    res.json({ success: true, data: updatedPlan, message: '플랜이 복원되었습니다.' });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'plan_unarchive_error');
    return next(new AppError(500, { success: false, message: '플랜 복원 중 오류가 발생했습니다.' }));
  }
}

// 플랜 삭제
export async function deletePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { planId } = req.params;

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      res.status(404).json({ success: false, message: '플랜을 찾을 수 없습니다.' });
      return;
    }

    // 트랜잭션으로 PlanItem과 Plan을 함께 삭제
    await prisma.$transaction(async (tx) => {
      await tx.planItem.deleteMany({
        where: { planId },
      });
      await tx.plan.delete({
        where: { id: planId },
      });
    });

    res.json({ success: true, message: '플랜이 삭제되었습니다.' });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'plan_delete_error');
    return next(new AppError(500, { success: false, message: '플랜 삭제 중 오류가 발생했습니다.' }));
  }
}

// 플랜 일괄 아카이브
export async function bulkArchivePlans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { planIds } = req.body;

    if (!planIds || !Array.isArray(planIds) || planIds.length === 0) {
      res.status(400).json({ success: false, message: '아카이브할 플랜을 선택하세요.' });
      return;
    }

    const result = await prisma.plan.updateMany({
      where: {
        id: { in: planIds },
        status: 'ACTIVE',
      },
      data: { status: 'ARCHIVED' },
    });

    res.json({
      success: true,
      data: { count: result.count },
      message: `${result.count}개 플랜이 아카이브되었습니다.`,
    });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'plan_bulk_archive_error');
    return next(new AppError(500, { success: false, message: '일괄 아카이브 중 오류가 발생했습니다.' }));
  }
}

// 플랜 일괄 복원
export async function bulkUnarchivePlans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { planIds } = req.body;

    if (!planIds || !Array.isArray(planIds) || planIds.length === 0) {
      res.status(400).json({ success: false, message: '복원할 플랜을 선택하세요.' });
      return;
    }

    const result = await prisma.plan.updateMany({
      where: {
        id: { in: planIds },
        status: 'ARCHIVED',
      },
      data: { status: 'ACTIVE' },
    });

    res.json({
      success: true,
      data: { count: result.count },
      message: `${result.count}개 플랜이 복원되었습니다.`,
    });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'plan_bulk_unarchive_error');
    return next(new AppError(500, { success: false, message: '일괄 복원 중 오류가 발생했습니다.' }));
  }
}

// 플랜 일괄 삭제
export async function bulkDeletePlans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { planIds } = req.body;

    if (!planIds || !Array.isArray(planIds) || planIds.length === 0) {
      res.status(400).json({ success: false, message: '삭제할 플랜을 선택하세요.' });
      return;
    }

    // 트랜잭션으로 PlanItem과 Plan을 함께 삭제
    await prisma.$transaction(async (tx) => {
      await tx.planItem.deleteMany({
        where: { planId: { in: planIds } },
      });
      await tx.plan.deleteMany({
        where: { id: { in: planIds } },
      });
    });

    res.json({
      success: true,
      data: { count: planIds.length },
      message: `${planIds.length}개 플랜이 삭제되었습니다.`,
    });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'plan_bulk_delete_error');
    return next(new AppError(500, { success: false, message: '일괄 삭제 중 오류가 발생했습니다.' }));
  }
}
