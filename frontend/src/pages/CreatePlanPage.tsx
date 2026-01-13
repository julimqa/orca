import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPlan } from '../api/plan';
import { getTestCases, TestCase } from '../api/testcase';
import { getFolderTree, FolderTreeItem } from '../api/folder';
import {
  ArrowLeft,
  Search,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  FolderOpen,
  Folder,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

// 정렬 상태 타입
type SortField = 'id' | 'title' | 'priority';
type SortDirection = 'asc' | 'desc';
interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

// 섹션별 정렬 상태
type SectionSortState = Record<string, SortState>;

// 섹션 타입
interface Section {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  testCases: TestCase[];
}

// 특정 섹션과 모든 하위 섹션의 테스트케이스 ID를 수집하는 헬퍼 함수
const getAllTestCaseIdsInSectionAndDescendants = (sectionId: string, sections: Section[]): string[] => {
  const ids: string[] = [];

  // 현재 섹션의 테스트케이스 추가
  const currentSection = sections.find((s) => s.id === sectionId);
  if (currentSection) {
    ids.push(...currentSection.testCases.map((tc) => tc.id));
  }

  // 하위 섹션들 찾기 (parentId가 현재 sectionId인 섹션들)
  const childSections = sections.filter((s) => s.parentId === sectionId);
  for (const child of childSections) {
    // 재귀적으로 하위 섹션의 테스트케이스도 수집
    ids.push(...getAllTestCaseIdsInSectionAndDescendants(child.id, sections));
  }

  return ids;
};

// 폴더 구조를 섹션으로 변환하는 함수
const buildSections = (
  folders: FolderTreeItem[],
  testCases: TestCase[],
  parentId: string | null = null,
  depth: number = 0
): Section[] => {
  const sections: Section[] = [];

  // Root level test cases (no folder)
  if (parentId === null) {
    const rootTestCases = testCases.filter((tc) => !tc.folderId);
    if (rootTestCases.length > 0) {
      sections.push({
        id: 'root',
        name: '미분류',
        parentId: null,
        depth: 0,
        testCases: rootTestCases,
      });
    }
  }

  // Process folders
  folders.forEach((folder) => {
    const folderTestCases = testCases.filter((tc) => tc.folderId === folder.id);

    sections.push({
      id: folder.id,
      name: folder.name,
      parentId: parentId,
      depth: depth,
      testCases: folderTestCases,
    });

    // Recursively process children
    if (folder.children && folder.children.length > 0) {
      const childSections = buildSections(folder.children, testCases, folder.id, depth + 1);
      sections.push(...childSections);
    }
  });

  return sections;
};

// Top Level Folder Header Component (최상위 폴더 헤더 - Studio 스타일)
interface TopLevelFolderHeaderProps {
  name: string;
  count: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
}

const TopLevelFolderHeader: React.FC<TopLevelFolderHeaderProps> = ({ name, count, isAllSelected, onSelectAll }) => {
  return (
    <div className="flex items-center gap-2 py-3 px-4 bg-slate-100 border-b border-slate-200">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectAll();
        }}
        className="text-slate-500 hover:text-slate-700 focus:outline-none transition-colors"
      >
        {isAllSelected ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
      </button>
      <FolderOpen size={16} className="text-slate-600" />
      <span className="font-bold text-slate-800 text-sm">{name}</span>
      <span className="text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{count}</span>
    </div>
  );
};

// Section Header Component (하위 폴더 헤더)
interface SectionHeaderProps {
  section: { id: string; name: string; depth?: number };
  count: number;
  selectedCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onSelectAll: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  section,
  count,
  selectedCount,
  isExpanded,
  onToggle,
  isAllSelected,
  isSomeSelected,
  onSelectAll,
}) => {
  const depth = (section as { depth?: number }).depth || 0;
  const displayDepth = depth === 0 ? 1 : depth;

  return (
    <div
      className="flex items-center gap-2 py-2 px-4 bg-white border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
      onClick={onToggle}
      style={{ paddingLeft: `${16 + displayDepth * 20}px` }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectAll();
        }}
        className="text-slate-500 hover:text-slate-700 focus:outline-none transition-colors"
      >
        {isAllSelected ? (
          <CheckSquare size={16} className="text-indigo-600" />
        ) : isSomeSelected ? (
          <div className="relative">
            <Square size={16} className="text-indigo-400" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-indigo-400 rounded-sm"></div>
            </div>
          </div>
        ) : (
          <Square size={16} />
        )}
      </button>

      <button type="button" className="text-slate-500 hover:text-slate-700 transition-colors">
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      <Folder size={14} className="text-amber-500" />

      <span className="font-semibold text-slate-700 text-sm">{section.name}</span>

      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{count}</span>

      {selectedCount > 0 && (
        <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">{selectedCount}개 선택</span>
      )}
    </div>
  );
};

// Section Table Header Component
interface SectionTableHeaderProps {
  sectionId: string;
  sortState: SortState;
  onSort: (sectionId: string, field: SortField) => void;
}

const SectionTableHeader: React.FC<SectionTableHeaderProps> = ({ sectionId, sortState, onSort }) => {
  const getSortIcon = (field: SortField) => {
    if (sortState.field !== field) {
      return <ArrowUpDown size={14} className="text-slate-400" />;
    }
    return sortState.direction === 'asc' ? (
      <ArrowUp size={14} className="text-indigo-600" />
    ) : (
      <ArrowDown size={14} className="text-indigo-600" />
    );
  };

  return (
    <tr className="bg-slate-50 border-b border-slate-200">
      <th className="px-3 py-2 w-10"></th>
      <th
        className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => onSort(sectionId, 'id')}
      >
        <div className="flex items-center gap-1">
          ID
          {getSortIcon('id')}
        </div>
      </th>
      <th
        className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => onSort(sectionId, 'title')}
      >
        <div className="flex items-center gap-1">
          Title
          {getSortIcon('title')}
        </div>
      </th>
      <th
        className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-28 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => onSort(sectionId, 'priority')}
      >
        <div className="flex items-center gap-1">
          Priority
          {getSortIcon('priority')}
        </div>
      </th>
    </tr>
  );
};

// Test Case Row Component
interface TestCaseRowProps {
  testCase: TestCase;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const TestCaseRow: React.FC<TestCaseRowProps> = ({ testCase, isSelected, onToggleSelect }) => {
  const caseId = testCase.caseNumber ? `C${testCase.caseNumber}` : testCase.id.substring(0, 6).toUpperCase();

  return (
    <tr
      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
        isSelected ? 'bg-indigo-50/50' : ''
      }`}
      onClick={() => onToggleSelect(testCase.id)}
    >
      <td className="px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(testCase.id)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
        />
      </td>
      <td className="px-4 py-3 text-sm font-mono text-slate-500 w-24">{caseId}</td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-900">{testCase.title}</span>
      </td>
      <td className="px-4 py-3 w-28">
        <Badge
          variant={testCase.priority === 'HIGH' ? 'error' : testCase.priority === 'MEDIUM' ? 'warning' : 'success'}
        >
          {testCase.priority}
        </Badge>
      </td>
    </tr>
  );
};

const CreatePlanPage: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folders, setFolders] = useState<FolderTreeItem[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Section Expand State
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Section Sort State
  const [sectionSortState, setSectionSortState] = useState<SectionSortState>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [foldersResponse, testCasesResponse] = await Promise.all([getFolderTree(), getTestCases()]);

      if (foldersResponse.success) {
        setFolders(foldersResponse.data);
      }
      if (testCasesResponse.success) {
        setTestCases(testCasesResponse.data);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load data', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 검색 필터링된 테스트케이스
  const filteredTestCases = useMemo(() => {
    if (searchQuery.trim() === '') {
      return testCases;
    }
    const query = searchQuery.toLowerCase();
    return testCases.filter((tc) => {
      const caseId = tc.caseNumber ? `C${tc.caseNumber}` : tc.id.substring(0, 6).toUpperCase();
      return tc.title.toLowerCase().includes(query) || caseId.toLowerCase().includes(query);
    });
  }, [testCases, searchQuery]);

  // 섹션 빌드
  const sections = useMemo(() => {
    return buildSections(folders, filteredTestCases);
  }, [folders, filteredTestCases]);

  // 섹션 확장 시 기본 확장
  useEffect(() => {
    if (sections.length > 0 && expandedSections.size === 0) {
      setExpandedSections(new Set(sections.map((s) => s.id)));
    }
  }, [sections, expandedSections.size]);

  // Toggle Section Expand
  const handleToggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Sort Section
  const handleSortSection = useCallback((sectionId: string, field: SortField) => {
    setSectionSortState((prev) => {
      const currentState = prev[sectionId] || { field: null, direction: 'asc' };
      let newDirection: SortDirection = 'asc';

      if (currentState.field === field) {
        newDirection = currentState.direction === 'asc' ? 'desc' : 'asc';
      }

      return {
        ...prev,
        [sectionId]: { field, direction: newDirection },
      };
    });
  }, []);

  // Get sorted test cases for a section
  const getSortedTestCases = useCallback(
    (section: Section): TestCase[] => {
      const sortState = sectionSortState[section.id];
      if (!sortState || !sortState.field) {
        return section.testCases;
      }

      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const sorted = [...section.testCases].sort((a, b) => {
        let comparison = 0;

        switch (sortState.field) {
          case 'id':
            comparison = (a.caseNumber || 0) - (b.caseNumber || 0);
            break;
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'priority':
            comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
            break;
        }

        return sortState.direction === 'asc' ? comparison : -comparison;
      });

      return sorted;
    },
    [sectionSortState]
  );

  // Selection Handlers
  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTestCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTestCases.map((tc) => tc.id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('플랜 이름을 입력해주세요.');
      return;
    }
    if (selectedIds.size === 0) {
      alert('최소 하나 이상의 테스트케이스를 선택해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 선택된 테스트케이스를 /cases 페이지 순서(sequence)대로 정렬
      const orderedTestCaseIds = testCases.filter((tc) => selectedIds.has(tc.id)).map((tc) => tc.id);

      const response = await createPlan({
        name,
        description,
        testCaseIds: orderedTestCaseIds,
      });
      if (response.success) {
        navigate('/plans');
      }
    } catch {
      alert('플랜 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = selectedIds.size;
  const totalCases = filteredTestCases.length;

  return (
    <div className="p-8 w-full mx-auto max-w-[1600px]">
      <div className="mb-6">
        <button
          onClick={() => navigate('/plans')}
          className="flex items-center text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" /> 플랜 목록으로 돌아가기
        </button>
        <h1 className="text-2xl font-bold text-slate-900">새 테스트 플랜 생성</h1>
        <p className="text-slate-500 mt-1">테스트케이스를 선택하고 실행 세부 정보를 설정하세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card title="기본 정보">
          <div className="space-y-4">
            <Input
              label="플랜 이름"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 2024년 1분기 릴리스 테스트"
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">설명 (선택사항)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                rows={3}
                placeholder="테스트 플랜에 대한 설명을 입력하세요..."
              />
            </div>
          </div>
        </Card>

        {/* Test Case Selection */}
        <Card
          title={`테스트케이스 선택`}
          action={
            <div className="flex items-center gap-4">
              {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full">
                    {selectedCount}개 선택됨
                  </span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    title="선택 해제"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ID 또는 제목으로 검색..."
                  className="pl-10 pr-4 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 w-64"
                  data-testid="plan-create-search"
                />
              </div>
            </div>
          }
          noPadding
        >
          {/* Global Select All */}
          <div className="border-b border-slate-200">
            <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-slate-500 hover:text-slate-700 focus:outline-none transition-colors"
                  data-testid="plan-create-select-all"
                >
                  {selectedIds.size === filteredTestCases.length && filteredTestCases.length > 0 ? (
                    <CheckSquare size={18} className="text-indigo-600" />
                  ) : selectedIds.size > 0 ? (
                    <div className="relative">
                      <Square size={18} className="text-indigo-400" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-indigo-400 rounded-sm"></div>
                      </div>
                    </div>
                  ) : (
                    <Square size={18} />
                  )}
                </button>
                <span className="text-sm font-semibold text-slate-700">전체 선택</span>
                <span className="text-sm text-slate-500">({totalCases}개 케이스)</span>
              </div>
            </div>
          </div>

          {/* Section-based Content */}
          <div className="max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-64 text-slate-500">로딩 중...</div>
            ) : sections.length === 0 || totalCases === 0 ? (
              <div className="p-12 text-center text-slate-500">
                {searchQuery ? '검색 결과가 없습니다.' : '테스트케이스가 없습니다.'}
              </div>
            ) : (
              <div>
                {(() => {
                  // 최상위 폴더별로 그룹화
                  const topLevelFolders = new Map<string, Section[]>();
                  let currentTopLevelId: string | null = null;

                  sections.forEach((section) => {
                    if (section.depth === 0) {
                      currentTopLevelId = section.id;
                      topLevelFolders.set(section.id, [section]);
                    } else if (currentTopLevelId) {
                      topLevelFolders.get(currentTopLevelId)?.push(section);
                    }
                  });

                  return Array.from(topLevelFolders.entries()).map(([topLevelId, folderSections]) => {
                    const topLevelSection = folderSections[0];
                    // 최상위 폴더와 모든 하위 폴더의 테스트케이스 ID 수집
                    const allTestCaseIdsInTopLevel = folderSections.flatMap((section) =>
                      section.testCases.map((tc) => tc.id)
                    );
                    const isTopLevelAllSelected =
                      allTestCaseIdsInTopLevel.length > 0 &&
                      allTestCaseIdsInTopLevel.every((id) => selectedIds.has(id));

                    // 최상위 폴더 전체 선택/해제 핸들러
                    const handleTopLevelSelectAll = () => {
                      const newSelected = new Set(selectedIds);
                      if (isTopLevelAllSelected) {
                        allTestCaseIdsInTopLevel.forEach((id) => newSelected.delete(id));
                      } else {
                        allTestCaseIdsInTopLevel.forEach((id) => newSelected.add(id));
                      }
                      setSelectedIds(newSelected);
                    };

                    return (
                      <div key={topLevelId} className="border-b border-slate-200 last:border-b-0">
                        {/* Top Level Folder Header (Studio 스타일) */}
                        <TopLevelFolderHeader
                          name={topLevelSection.name}
                          count={allTestCaseIdsInTopLevel.length}
                          isAllSelected={isTopLevelAllSelected}
                          onSelectAll={handleTopLevelSelectAll}
                        />

                        {/* 하위 폴더들 */}
                        {folderSections.map((section) => {
                          const sectionTestCases = getSortedTestCases(section);
                          // 최상위 폴더 자체의 테스트케이스가 없고 depth가 0이면 헤더만 표시했으므로 스킵
                          if (section.depth === 0 && sectionTestCases.length === 0) return null;
                          // 하위 폴더인데 테스트케이스가 없으면 스킵
                          if (section.depth > 0 && sectionTestCases.length === 0) return null;

                          const isExpanded = expandedSections.has(section.id);
                          // 하위 폴더 포함하여 전체 선택 여부 확인
                          const allIdsInSection = getAllTestCaseIdsInSectionAndDescendants(section.id, sections);
                          const sectionSelectedCount = allIdsInSection.filter((id) => selectedIds.has(id)).length;
                          const isAllSelected =
                            allIdsInSection.length > 0 && allIdsInSection.every((id) => selectedIds.has(id));
                          const isSomeSelected = sectionSelectedCount > 0 && !isAllSelected;
                          const sortState = sectionSortState[section.id] || { field: null, direction: 'asc' };

                          // 섹션과 하위 섹션의 모든 테스트케이스 선택/해제
                          const handleSectionSelectAll = () => {
                            const newSelected = new Set(selectedIds);
                            if (isAllSelected) {
                              allIdsInSection.forEach((id) => newSelected.delete(id));
                            } else {
                              allIdsInSection.forEach((id) => newSelected.add(id));
                            }
                            setSelectedIds(newSelected);
                          };

                          return (
                            <div key={section.id}>
                              {/* Section Header */}
                              <SectionHeader
                                section={section}
                                count={sectionTestCases.length}
                                selectedCount={sectionSelectedCount}
                                isExpanded={isExpanded}
                                onToggle={() => handleToggleSection(section.id)}
                                isAllSelected={isAllSelected}
                                isSomeSelected={isSomeSelected}
                                onSelectAll={handleSectionSelectAll}
                              />

                              {/* Section Table */}
                              {isExpanded && (
                                <table className="min-w-full">
                                  <thead>
                                    <SectionTableHeader
                                      sectionId={section.id}
                                      sortState={sortState}
                                      onSort={handleSortSection}
                                    />
                                  </thead>
                                  <tbody>
                                    {sectionTestCases.map((tc) => (
                                      <TestCaseRow
                                        key={tc.id}
                                        testCase={tc}
                                        isSelected={selectedIds.has(tc.id)}
                                        onToggleSelect={handleToggleSelect}
                                      />
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => navigate('/plans')}>
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || selectedIds.size === 0}
            isLoading={isSubmitting}
            data-testid="plan-create-submit"
          >
            {isSubmitting ? '생성 중...' : `플랜 생성 (${selectedCount}개 케이스)`}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreatePlanPage;
