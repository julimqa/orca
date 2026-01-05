import type { AutomationType, PlanStatus, Priority, TestResult, UserRole, UserStatus } from './common';

/**
 * Phase 2.1: Prisma/응답 JSON 형태를 기준으로 한 엔티티 타입.
 * - 날짜는 JSON 직렬화 결과(ISO string)를 주로 사용하므로 `string`으로 둡니다.
 * - nullable/optional은 현행 프론트 타입 및 백엔드 응답을 기준으로 그대로 둡니다.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FolderTreeItem extends Folder {
  children: FolderTreeItem[];
}

export interface FolderPathItem {
  id: string;
  name: string;
}

export interface TestCaseFolderRef {
  id: string;
  name: string;
  parentId?: string | null;
}

export interface TestCase {
  id: string;
  caseNumber?: number;
  title: string;
  description?: string;
  precondition?: string;
  steps?: string;
  expectedResult?: string;
  priority: Priority;
  automationType: AutomationType;
  category?: string | null;
  sequence: number;
  folderId?: string | null;
  folder?: TestCaseFolderRef;
  folderPath?: FolderPathItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface PlanStats {
  total: number;
  pass: number;
  fail: number;
  block: number;
  notRun: number;
  progress: number;
}

export interface Plan {
  id: string;
  name: string;
  description?: string | null;
  status: PlanStatus;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  stats?: PlanStats;
}

export interface PlanItem {
  id: string;
  planId: string;
  testCaseId: string;
  testCase: TestCase;
  assignee?: string | null;
  result: TestResult;
  comment?: string | null;
  order?: number;
  executedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanDetail extends Plan {
  items: PlanItem[];
}


