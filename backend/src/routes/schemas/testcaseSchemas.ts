import { z } from 'zod';

const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const automationEnum = z.enum(['MANUAL', 'AUTOMATED']);

export const createTestCaseSchema = z.object({
  title: z.string().min(1, { message: '제목은 필수입니다.' }),
  description: z.string().optional(),
  precondition: z.string().optional(),
  steps: z.string().optional(),
  expectedResult: z.string().optional(),
  priority: priorityEnum.optional(),
  automationType: automationEnum.optional(),
  category: z.string().optional().nullable(),
  folderId: z.string().optional().nullable(),
});

export const updateTestCaseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  precondition: z.string().optional(),
  steps: z.string().optional(),
  expectedResult: z.string().optional(),
  priority: priorityEnum.optional(),
  automationType: automationEnum.optional(),
  category: z.string().optional().nullable(),
});

export const reorderTestCasesSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1, { message: '정렬할 테스트케이스 ID 목록이 필요합니다.' }),
});

export const bulkUpdateTestCasesSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1, { message: '선택된 테스트케이스 ID가 필요합니다.' }),
    priority: priorityEnum.optional(),
    automationType: automationEnum.optional(),
    category: z.string().optional().nullable(),
    folderId: z.string().optional().nullable(),
  })
  .refine(
    (data) => data.priority || data.automationType || data.category !== undefined || data.folderId !== undefined,
    { message: '변경할 필드를 하나 이상 지정해야 합니다.' }
  );

export const bulkDeleteTestCasesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, { message: '삭제할 테스트케이스 ID가 필요합니다.' }),
});

export const moveTestCasesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, { message: '이동할 테스트케이스 ID 목록이 필요합니다.' }),
  targetFolderId: z.string().optional().nullable(),
});
