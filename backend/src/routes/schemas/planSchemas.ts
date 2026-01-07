import { z } from 'zod';

const planItemResultEnum = z.enum(['NOT_RUN', 'PASS', 'FAIL', 'BLOCK']);

export const createPlanSchema = z.object({
  name: z.string().min(1, { message: '플랜 이름은 필수입니다.' }),
  description: z.string().optional().nullable(),
  testCaseIds: z.array(z.string().min(1)).min(1, { message: '테스트케이스는 1개 이상 선택해야 합니다.' }),
  assignee: z.string().optional().nullable(),
});

export const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  testCaseIds: z.array(z.string().min(1)).optional(),
});

export const planIdListSchema = z.object({
  planIds: z.array(z.string().min(1)).min(1, { message: '플랜 ID 목록이 필요합니다.' }),
});

export const updatePlanItemSchema = z.object({
  result: planItemResultEnum.optional(),
  comment: z.string().optional().nullable(),
  assignee: z.string().optional().nullable(),
  defects: z.string().optional().nullable(),
});

export const bulkUpdatePlanItemsSchema = z
  .object({
    items: z.array(z.string().min(1)).min(1, { message: 'PlanItem ID 목록이 필요합니다.' }),
    result: planItemResultEnum.optional(),
    comment: z.string().optional().nullable(),
    assignee: z.string().optional().nullable(),
    defects: z.string().optional().nullable(),
  })
  .refine((data) => data.result || data.comment !== undefined || data.assignee !== undefined || data.defects !== undefined, {
    message: '변경할 필드를 하나 이상 지정해야 합니다.',
  });
