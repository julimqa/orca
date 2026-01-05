import { NextFunction, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger';

// 폴더 트리 조회 (전체 폴더를 가져와서 메모리에서 트리 구성)
export async function getFolderTree(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const folders = await prisma.folder.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    const folderMap = new Map();
    const rootFolders: any[] = [];

    // 1. 모든 폴더를 Map에 저장하고 children 배열 초기화
    folders.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // 2. 부모-자식 관계 연결
    folders.forEach((folder) => {
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children.push(folderMap.get(folder.id));
        }
      } else {
        rootFolders.push(folderMap.get(folder.id));
      }
    });

    // 3. 각 레벨에서 order 순으로 정렬
    const sortChildren = (folders: any[]) => {
      folders.sort((a, b) => (a.order || 0) - (b.order || 0));
      folders.forEach((folder) => {
        if (folder.children && folder.children.length > 0) {
          sortChildren(folder.children);
        }
      });
    };
    sortChildren(rootFolders);

    res.json({ success: true, data: rootFolders });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'folder_get_tree_error');
    return next(new AppError(500, { success: false, message: '폴더 트리를 불러오는데 실패했습니다.' }));
  }
}

// 폴더 생성
export async function createFolder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, parentId } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: '폴더 이름은 필수입니다.' });
      return;
    }

    // 같은 레벨의 폴더들 중 가장 큰 order 값 찾기
    const maxOrderFolder = await prisma.folder.findFirst({
      where: { parentId: parentId || null },
      orderBy: { order: 'desc' },
    });
    const newOrder = (maxOrderFolder?.order || 0) + 1;

    const folder = await prisma.folder.create({
      data: {
        name,
        parentId: parentId || null,
        order: newOrder,
      },
    });

    res.status(201).json({ success: true, data: folder });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'folder_create_error');
    return next(new AppError(500, { success: false, message: '폴더 생성 중 오류가 발생했습니다.' }));
  }
}

// 폴더별 테스트케이스 조회
export async function getTestCasesByFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { folderId } = req.params;

    const testCases = await prisma.testCase.findMany({
      where: { folderId },
      orderBy: { sequence: 'asc' },
    });

    res.json({ success: true, data: testCases });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'folder_get_testcases_error');
    return next(new AppError(500, { success: false, message: '테스트케이스 목록을 불러오는데 실패했습니다.' }));
  }
}

// 폴더의 깊이 계산 헬퍼 함수
async function getFolderDepth(folderId: string | null): Promise<number> {
  if (!folderId) return 0;

  let depth = 0;
  let currentId: string | null = folderId;

  while (currentId) {
    const folderData: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!folderData) break;
    depth++;
    currentId = folderData.parentId;
  }

  return depth;
}

// 폴더의 모든 자손 ID 가져오기 (순환 구조 방지용)
async function getAllDescendantIds(folderId: string): Promise<Set<string>> {
  const descendants = new Set<string>();
  const queue = [folderId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = await prisma.folder.findMany({
      where: { parentId: currentId },
      select: { id: true },
    });

    for (const child of children) {
      descendants.add(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
}

// 폴더 이동 (부모 변경 및 순서 변경)
export async function moveFolder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { newParentId, newOrder } = req.body;

    // 폴더 존재 확인
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      res.status(404).json({ success: false, message: '폴더를 찾을 수 없습니다.' });
      return;
    }

    // 자기 자신을 부모로 설정하는 것 방지
    if (newParentId === id) {
      res.status(400).json({ success: false, message: '폴더를 자기 자신의 하위로 이동할 수 없습니다.' });
      return;
    }

    // 순환 구조 방지: 자손 폴더를 부모로 설정하는 것 방지
    if (newParentId) {
      const descendants = await getAllDescendantIds(id);
      if (descendants.has(newParentId)) {
        res.status(400).json({ success: false, message: '폴더를 자신의 하위 폴더로 이동할 수 없습니다.' });
        return;
      }
    }

    // 최대 깊이 제한 (5단계)
    const MAX_DEPTH = 5;
    const targetParentDepth = await getFolderDepth(newParentId || null);

    // 이동하려는 폴더의 최대 자손 깊이 계산
    const getMaxDescendantDepth = async (folderId: string): Promise<number> => {
      const children = await prisma.folder.findMany({
        where: { parentId: folderId },
        select: { id: true },
      });

      if (children.length === 0) return 0;

      let maxDepth = 0;
      for (const child of children) {
        const childDepth = await getMaxDescendantDepth(child.id);
        maxDepth = Math.max(maxDepth, childDepth + 1);
      }
      return maxDepth;
    };

    const folderSubtreeDepth = await getMaxDescendantDepth(id);
    const totalDepthAfterMove = targetParentDepth + 1 + folderSubtreeDepth;

    if (totalDepthAfterMove > MAX_DEPTH) {
      res.status(400).json({
        success: false,
        message: `최대 ${MAX_DEPTH}단계 깊이까지만 허용됩니다.`,
      });
      return;
    }

    // 새 부모가 유효한지 확인
    if (newParentId) {
      const newParent = await prisma.folder.findUnique({ where: { id: newParentId } });
      if (!newParent) {
        res.status(404).json({ success: false, message: '대상 부모 폴더를 찾을 수 없습니다.' });
        return;
      }
    }

    // 부모가 변경되는 경우
    const isParentChanging = folder.parentId !== (newParentId || null);

    if (isParentChanging) {
      // 새 부모 아래에서 가장 큰 order 값 찾기
      const maxOrderFolder = await prisma.folder.findFirst({
        where: { parentId: newParentId || null },
        orderBy: { order: 'desc' },
      });
      const finalOrder = newOrder !== undefined ? newOrder : (maxOrderFolder?.order || 0) + 1;

      // 폴더 업데이트
      const updatedFolder = await prisma.folder.update({
        where: { id },
        data: {
          parentId: newParentId || null,
          order: finalOrder,
        },
      });

      res.json({ success: true, data: updatedFolder });
    } else {
      // 같은 레벨 내에서 순서만 변경
      if (newOrder === undefined) {
        res.status(400).json({ success: false, message: '순서 값이 필요합니다.' });
        return;
      }

      const updatedFolder = await prisma.folder.update({
        where: { id },
        data: { order: newOrder },
      });

      res.json({ success: true, data: updatedFolder });
    }
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'folder_move_error');
    return next(new AppError(500, { success: false, message: '폴더 이동 중 오류가 발생했습니다.' }));
  }
}

// 폴더 순서 일괄 업데이트
export async function reorderFolders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { folders } = req.body; // [{ id: string, order: number }]

    if (!Array.isArray(folders)) {
      res.status(400).json({ success: false, message: '폴더 목록이 필요합니다.' });
      return;
    }

    // 트랜잭션으로 일괄 업데이트
    await prisma.$transaction(
      folders.map((f: { id: string; order: number }) =>
        prisma.folder.update({
          where: { id: f.id },
          data: { order: f.order },
        })
      )
    );

    res.json({ success: true, message: '폴더 순서가 업데이트되었습니다.' });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'folder_reorder_error');
    return next(new AppError(500, { success: false, message: '폴더 순서 업데이트 중 오류가 발생했습니다.' }));
  }
}

// 폴더 이름 변경
export async function renameFolder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: '폴더 이름은 필수입니다.' });
      return;
    }

    // 폴더 존재 확인
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      res.status(404).json({ success: false, message: '폴더를 찾을 수 없습니다.' });
      return;
    }

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: { name: name.trim() },
    });

    res.json({ success: true, data: updatedFolder });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'folder_rename_error');
    return next(new AppError(500, { success: false, message: '폴더 이름 변경 중 오류가 발생했습니다.' }));
  }
}

// 폴더 삭제 (하위 폴더 및 테스트케이스 포함)
export async function deleteFolder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    // 폴더 존재 확인
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      res.status(404).json({ success: false, message: '폴더를 찾을 수 없습니다.' });
      return;
    }

    // 모든 하위 폴더 ID 가져오기
    const allFolderIds = [id];
    const descendants = await getAllDescendantIds(id);
    allFolderIds.push(...Array.from(descendants));

    // 트랜잭션으로 관련 데이터 삭제
    await prisma.$transaction([
      // 1. 해당 폴더들에 속한 테스트케이스의 PlanItem 삭제
      prisma.planItem.deleteMany({
        where: {
          testCase: {
            folderId: { in: allFolderIds },
          },
        },
      }),
      // 2. 해당 폴더들에 속한 테스트케이스 삭제
      prisma.testCase.deleteMany({
        where: { folderId: { in: allFolderIds } },
      }),
      // 3. 하위 폴더들 삭제 (자식 먼저 삭제해야 함)
      ...allFolderIds.reverse().map((folderId) => prisma.folder.delete({ where: { id: folderId } })),
    ]);

    res.json({
      success: true,
      message: `폴더와 ${allFolderIds.length - 1}개의 하위 폴더가 삭제되었습니다.`,
    });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'folder_delete_error');
    return next(new AppError(500, { success: false, message: '폴더 삭제 중 오류가 발생했습니다.' }));
  }
}

// 폴더 일괄 삭제
export async function bulkDeleteFolders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: '삭제할 폴더 ID 목록이 필요합니다.' });
      return;
    }

    // 모든 폴더와 하위 폴더 ID 수집
    const allFolderIds = new Set<string>();
    for (const id of ids) {
      allFolderIds.add(id);
      const descendants = await getAllDescendantIds(id);
      descendants.forEach((d) => allFolderIds.add(d));
    }

    const folderIdArray = Array.from(allFolderIds);

    // 트랜잭션으로 관련 데이터 삭제
    await prisma.$transaction([
      // 1. 해당 폴더들에 속한 테스트케이스의 PlanItem 삭제
      prisma.planItem.deleteMany({
        where: {
          testCase: {
            folderId: { in: folderIdArray },
          },
        },
      }),
      // 2. 해당 폴더들에 속한 테스트케이스 삭제
      prisma.testCase.deleteMany({
        where: { folderId: { in: folderIdArray } },
      }),
      // 3. 폴더들 삭제
      prisma.folder.deleteMany({
        where: { id: { in: folderIdArray } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        count: ids.length,
        totalDeleted: folderIdArray.length,
        message: `${ids.length}개 폴더(하위 폴더 포함 ${folderIdArray.length}개)가 삭제되었습니다.`,
      },
    });
  } catch (error) {
    logger.error({ requestId: req.requestId, err: error }, 'folder_bulk_delete_error');
    return next(new AppError(500, { success: false, message: '폴더 일괄 삭제 중 오류가 발생했습니다.' }));
  }
}
