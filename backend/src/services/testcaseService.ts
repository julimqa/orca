import prisma from '../lib/prisma';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { Prisma } from '@prisma/client';

type ServiceResult = { status: number; body: any };

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

// 폴더와 모든 하위 폴더 ID 조회
async function getAllDescendantFolderIds(folderId: string): Promise<string[]> {
  const folderIds: string[] = [folderId];

  async function getChildFolderIds(parentId: string): Promise<void> {
    const children = await prisma.folder.findMany({
      where: { parentId },
      select: { id: true },
    });

    for (const child of children) {
      folderIds.push(child.id);
      await getChildFolderIds(child.id);
    }
  }

  await getChildFolderIds(folderId);
  return folderIds;
}

// 다음 caseNumber 가져오기 (OVDR 형식 ID용)
async function getNextCaseNumber(): Promise<number> {
  const lastCase = await prisma.testCase.findFirst({
    orderBy: { caseNumber: 'desc' },
  });
  return (lastCase?.caseNumber || 0) + 1;
}

export class TestCaseService {
  static async getTestCases(folderId?: string): Promise<ServiceResult> {
    let where: any = {};

    if (folderId) {
      const allFolderIds = await getAllDescendantFolderIds(String(folderId));
      where = { folderId: { in: allFolderIds } };
    }

    const testCases = await prisma.testCase.findMany({
      where,
      include: {
        folder: {
          select: { id: true, name: true, parentId: true },
        },
      },
      orderBy: { sequence: 'asc' },
    });

    const testCasesWithPath = await Promise.all(
      testCases.map(async (tc) => {
        const folderPath = await getFolderPath(tc.folderId);
        return { ...tc, folderPath };
      })
    );

    return { status: 200, body: { success: true, data: testCasesWithPath } };
  }

  static async createTestCase(input: any): Promise<ServiceResult> {
    const { title, description, precondition, steps, expectedResult, priority, automationType, category, folderId } =
      input;

    if (!title) {
      return { status: 400, body: { success: false, message: '제목은 필수입니다.' } };
    }

    // NOTE: Playwright/E2E 등에서 동시에 다수 생성 시 caseNumber/sequence 경쟁 조건이 발생할 수 있어
    // unique 충돌(P2002) 시 재시도한다.
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const lastCase = await prisma.testCase.findFirst({
          where: { folderId: folderId || null },
          orderBy: { sequence: 'desc' },
        });
        const nextSequence = (lastCase?.sequence || 0) + 1;

        const nextCaseNumber = await getNextCaseNumber();

        const testCase = await prisma.testCase.create({
          data: {
            caseNumber: nextCaseNumber,
            title,
            description,
            precondition,
            steps,
            expectedResult,
            priority: priority || 'MEDIUM',
            automationType: automationType || 'MANUAL',
            category: category || null,
            folderId: folderId || null,
            sequence: nextSequence,
          },
        });

        return { status: 201, body: { success: true, data: testCase } };
      } catch (err) {
        lastErr = err;
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          continue;
        }
        throw err;
      }
    }

    throw lastErr;
  }

  static async importTestCases(input: {
    filePath: string;
    folderId?: string | null;
    mapping?: string;
  }): Promise<ServiceResult> {
    const { filePath, folderId, mapping } = input;
    const rawHeaderMapping = mapping ? JSON.parse(mapping) : {};

    // 매핑 키도 trim 처리 (CSV 헤더에 공백이 있을 수 있음)
    const headerMapping: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawHeaderMapping)) {
      headerMapping[key.trim()] = value as string;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: false, // 줄바꿈 보존을 위해 trim 비활성화
      relax_quotes: true, // 따옴표 처리 완화
      relax_column_count: true, // 컬럼 수 불일치 허용
    }) as any[];

    // 각 필드의 앞뒤 공백만 제거 (줄바꿈은 보존)
    const trimmedRecords = records.map((row) => {
      const trimmedRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string') {
          trimmedRow[key.trim()] = value.replace(/^[\t ]+|[\t ]+$/g, '');
        } else {
          trimmedRow[key.trim()] = value;
        }
      }
      return trimmedRow;
    });

    let successCount = 0;
    let failureCount = 0;
    const failures: any[] = [];

    // 폴더 이름 -> ID 매핑 캐시 생성
    const allFolders = await prisma.folder.findMany({
      select: { id: true, name: true },
    });
    const folderNameToId: Record<string, string> = {};
    for (const folder of allFolders) {
      folderNameToId[folder.name.toLowerCase()] = folder.id;
    }

    // 폴더 순서를 추적하기 위한 캐시 (parentId별로 현재 최대 order 저장)
    const folderOrderCache: Record<string, number> = {};

    // 폴더 생성 함수 (없으면 생성, 있으면 기존 ID 반환)
    const getOrCreateFolder = async (folderName: string, parentFolderId: string | null): Promise<string> => {
      const normalizedName = folderName.trim().toLowerCase();

      // 이미 캐시에 있으면 반환
      if (folderNameToId[normalizedName]) {
        return folderNameToId[normalizedName];
      }

      // 부모별 order 캐시 키
      const orderCacheKey = parentFolderId || '__root__';

      // 캐시에 order가 없으면 DB에서 최대값 조회
      if (folderOrderCache[orderCacheKey] === undefined) {
        const maxOrderFolder = await prisma.folder.findFirst({
          where: { parentId: parentFolderId },
          orderBy: { order: 'desc' },
        });
        folderOrderCache[orderCacheKey] = maxOrderFolder?.order || 0;
      }

      // 다음 order 값 계산
      folderOrderCache[orderCacheKey] += 1;
      const newOrder = folderOrderCache[orderCacheKey];

      // 폴더 생성 (order 포함)
      const newFolder = await prisma.folder.create({
        data: {
          name: folderName.trim(),
          parentId: parentFolderId,
          order: newOrder,
        },
      });

      // 캐시에 추가
      folderNameToId[normalizedName] = newFolder.id;

      return newFolder.id;
    };

    let currentCaseNumber = (await getNextCaseNumber()) - 1;

    // 폴더별로 sequence를 관리하기 위한 캐시
    const folderSequenceCache: Record<string, number> = {};

    const getNextSequence = async (targetFolderId: string | null): Promise<number> => {
      const cacheKey = targetFolderId || '__root__';
      if (folderSequenceCache[cacheKey] === undefined) {
        const lastCase = await prisma.testCase.findFirst({
          where: { folderId: targetFolderId },
          orderBy: { sequence: 'desc' },
        });
        folderSequenceCache[cacheKey] = lastCase?.sequence || 0;
      }
      folderSequenceCache[cacheKey] += 1;
      return folderSequenceCache[cacheKey];
    };

    const testCasesToCreate: any[] = [];

    // 줄바꿈을 <br> 태그로 변환하는 헬퍼 함수
    const convertNewlinesToBr = (text: string): string => {
      if (!text) return text;
      // 이미 HTML 태그가 있으면 변환하지 않음
      if (/<[^>]+>/.test(text)) return text;
      // \r\n 또는 \n을 <br>로 변환
      return text.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
    };

    // 이전 행의 값을 저장하기 위한 캐시 (빈 값일 때 이전 값으로 채우기 위함)
    const previousRowValues: Record<string, string> = {};

    const dbFields = [
      'title',
      'description',
      'precondition',
      'steps',
      'expectedResult',
      'priority',
      'automationType',
      'category',
      'folderName',
    ];
    // 줄바꿈을 <br> 태그로 변환해야 하는 필드들 (RichTextEditor로 표시되는 필드)
    const richTextFields = ['precondition', 'steps', 'expectedResult', 'description'];

    for (const [index, row] of trimmedRecords.entries()) {
      try {
        const testCaseData: any = {
          folderId: folderId || null, // 기본값: 현재 선택된 폴더
          priority: 'MEDIUM',
          automationType: 'MANUAL',
          category: null,
        };

        if (Object.keys(headerMapping).length > 0) {
          for (const [csvHeader, dbField] of Object.entries(headerMapping)) {
            let value = row[csvHeader];

            // 값이 비어있으면 이전 행의 값 사용
            if (!value && previousRowValues[csvHeader]) {
              value = previousRowValues[csvHeader];
            }

            // 현재 값을 캐시에 저장 (비어있지 않은 경우에만)
            if (value) {
              previousRowValues[csvHeader] = value;
            }

            if (value) {
              // folderName 필드 처리: 폴더 이름을 ID로 변환 (없으면 생성)
              if (dbField === 'folderName') {
                const trimmedName = value.trim();
                if (trimmedName) {
                  testCaseData.folderId = await getOrCreateFolder(trimmedName, folderId || null);
                }
                continue; // folderName은 testCaseData에 직접 저장하지 않음
              }

              // RichText 필드는 줄바꿈을 <br>로 변환
              if (richTextFields.includes(dbField as string)) {
                value = convertNewlinesToBr(value);
              }
              testCaseData[dbField as string] = value;
            }
          }
        } else {
          for (const field of dbFields) {
            let value = row[field];

            // 값이 비어있으면 이전 행의 값 사용
            if (!value && previousRowValues[field]) {
              value = previousRowValues[field];
            }

            // 현재 값을 캐시에 저장 (비어있지 않은 경우에만)
            if (value) {
              previousRowValues[field] = value;
            }

            if (value) {
              // folderName 필드 처리 (없으면 생성)
              if (field === 'folderName') {
                const trimmedName = value.trim();
                if (trimmedName) {
                  testCaseData.folderId = await getOrCreateFolder(trimmedName, folderId || null);
                }
                continue;
              }

              // RichText 필드는 줄바꿈을 <br>로 변환
              if (richTextFields.includes(field)) {
                value = convertNewlinesToBr(value);
              }
              testCaseData[field] = value;
            }
          }
        }

        if (!testCaseData.title) {
          throw new Error('제목(title)이 누락되었습니다.');
        }

        // 해당 폴더의 다음 sequence 가져오기
        const nextSequence = await getNextSequence(testCaseData.folderId);
        currentCaseNumber += 1;
        testCaseData.sequence = nextSequence;
        testCaseData.caseNumber = currentCaseNumber;

        testCasesToCreate.push(testCaseData);
        successCount++;
      } catch (err: any) {
        failureCount++;
        failures.push({ row: index + 2, message: err.message, data: row });
      }
    }

    if (testCasesToCreate.length > 0) {
      await prisma.testCase.createMany({ data: testCasesToCreate });
    }

    // 현행과 동일하게: 성공 경로에서만 업로드 파일 삭제
    fs.unlinkSync(filePath);

    return {
      status: 200,
      body: {
        success: true,
        data: { successCount, failureCount, failures },
      },
    };
  }

  static async updateTestCase(id: string, input: any): Promise<ServiceResult> {
    const { title, description, precondition, steps, expectedResult, priority, automationType, category } = input;

    const existingCase = await prisma.testCase.findUnique({ where: { id } });
    if (!existingCase) {
      return { status: 404, body: { success: false, message: '테스트케이스를 찾을 수 없습니다.' } };
    }

    const updatedCase = await prisma.testCase.update({
      where: { id },
      data: {
        title,
        description,
        precondition,
        steps,
        expectedResult,
        priority,
        automationType,
        category,
      },
    });

    return { status: 200, body: { success: true, data: updatedCase } };
  }

  static async deleteTestCase(id: string): Promise<ServiceResult> {
    const existingCase = await prisma.testCase.findUnique({ where: { id } });
    if (!existingCase) {
      return { status: 404, body: { success: false, message: '테스트케이스를 찾을 수 없습니다.' } };
    }

    await prisma.$transaction([
      prisma.planItem.deleteMany({ where: { testCaseId: id } }),
      prisma.testCase.delete({ where: { id } }),
    ]);

    return { status: 200, body: { success: true, message: '테스트케이스가 삭제되었습니다.' } };
  }

  static async reorderTestCases(input: { orderedIds?: any; folderId?: any }): Promise<ServiceResult> {
    const { orderedIds, folderId } = input;

    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return { status: 400, body: { success: false, message: '순서 변경할 테스트케이스 ID 목록이 필요합니다.' } };
    }

    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.testCase.update({
          where: { id },
          data: { sequence: index + 1 },
        })
      )
    );

    const where = folderId ? { folderId: String(folderId) } : {};
    const testCases = await prisma.testCase.findMany({
      where,
      orderBy: { sequence: 'asc' },
    });

    return { status: 200, body: { success: true, data: testCases } };
  }

  static async bulkUpdateTestCases(input: any): Promise<ServiceResult> {
    const { ids, priority, automationType, category, folderId } = input;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { status: 400, body: { success: false, message: '수정할 테스트케이스 ID 목록이 필요합니다.' } };
    }

    if (!priority && !automationType && category === undefined && folderId === undefined) {
      return { status: 400, body: { success: false, message: '변경할 내용을 선택해주세요.' } };
    }

    const updateData: {
      priority?: string;
      automationType?: string;
      category?: string | null;
      folderId?: string | null;
    } = {};
    if (priority) updateData.priority = priority;
    if (automationType) updateData.automationType = automationType;
    if (category !== undefined) updateData.category = category || null;
    if (folderId !== undefined) updateData.folderId = folderId || null;

    const updateResult = await prisma.testCase.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return {
      status: 200,
      body: {
        success: true,
        data: {
          count: updateResult.count,
          message: `${updateResult.count}개 테스트케이스가 수정되었습니다.`,
        },
      },
    };
  }

  static async bulkDeleteTestCases(input: any): Promise<ServiceResult> {
    const { ids } = input;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { status: 400, body: { success: false, message: '삭제할 테스트케이스 ID 목록이 필요합니다.' } };
    }

    await prisma.$transaction([
      prisma.planItem.deleteMany({ where: { testCaseId: { in: ids } } }),
      prisma.testCase.deleteMany({ where: { id: { in: ids } } }),
    ]);

    return {
      status: 200,
      body: {
        success: true,
        data: {
          count: ids.length,
          message: `${ids.length}개 테스트케이스가 삭제되었습니다.`,
        },
      },
    };
  }

  static async moveTestCasesToFolder(input: any): Promise<ServiceResult> {
    const { ids, targetFolderId } = input;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { status: 400, body: { success: false, message: '이동할 테스트케이스 ID 목록이 필요합니다.' } };
    }

    const folderId = targetFolderId || null;

    if (folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder) {
        return { status: 404, body: { success: false, message: '대상 폴더를 찾을 수 없습니다.' } };
      }
    }

    const lastCase = await prisma.testCase.findFirst({
      where: { folderId },
      orderBy: { sequence: 'desc' },
    });
    const nextSequence = lastCase?.sequence || 0;

    await prisma.$transaction(
      ids.map((id: string, index: number) =>
        prisma.testCase.update({
          where: { id },
          data: {
            folderId,
            sequence: nextSequence + index + 1,
          },
        })
      )
    );

    return {
      status: 200,
      body: {
        success: true,
        data: {
          count: ids.length,
          message: `${ids.length}개 테스트케이스가 이동되었습니다.`,
        },
      },
    };
  }
}
