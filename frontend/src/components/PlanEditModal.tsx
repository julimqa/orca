import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Search,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Save,
  Loader2,
} from 'lucide-react';
import { updatePlan, PlanDetail } from '../api/plan';
import { getTestCases, TestCase } from '../api/testcase';
import { getFolderTree, FolderTreeItem } from '../api/folder';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';

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

interface PlanEditModalProps {
  isOpen: boolean;
  plan: PlanDetail;
  onClose: () => void;
  onSaved: () => void;
}

export const PlanEditModal: React.FC<PlanEditModalProps> = ({ isOpen, plan, onClose, onSaved }) => {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description || '');
  const [folders, setFolders] = useState<FolderTreeItem[]>([]);
  const [allTestCases, setAllTestCases] = useState<TestCase[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Section Expand State
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Section Sort State
  const [sectionSortState, setSectionSortState] = useState<SectionSortState>({});

  // 모달이 열릴 때 데이터 로드 및 초기화
  useEffect(() => {
    if (isOpen) {
      setName(plan.name);
      setDescription(plan.description || '');
      // 현재 플랜에 포함된 테스트케이스 ID들로 초기화
      const currentIds = new Set(plan.items.map((item) => item.testCaseId));
      setSelectedIds(currentIds);
      loadData();
    }
  }, [isOpen, plan]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [foldersResponse, testCasesResponse] = await Promise.all([getFolderTree(), getTestCases()]);

      if (foldersResponse.success) {
        setFolders(foldersResponse.data);
      }
      if (testCasesResponse.success) {
        setAllTestCases(testCasesResponse.data);
      }
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 검색 필터링된 테스트케이스
  const filteredTestCases = useMemo(() => {
    if (searchQuery.trim() === '') {
      return allTestCases;
    }
    const query = searchQuery.toLowerCase();
    return allTestCases.filter((tc) => {
      const caseId = tc.caseNumber ? `C${tc.caseNumber}` : tc.id.substring(0, 6).toUpperCase();
      return tc.title.toLowerCase().includes(query) || caseId.toLowerCase().includes(query);
    });
  }, [allTestCases, searchQuery]);

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
        let aValue: string | number = '';
        let bValue: string | number = '';

        switch (sortState.field) {
          case 'id':
            aValue = a.caseNumber || 0;
            bValue = b.caseNumber || 0;
            break;
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'priority':
            aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
            bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
            break;
        }

        if (aValue < bValue) return sortState.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortState.direction === 'asc' ? 1 : -1;
        return 0;
      });

      return sorted;
    },
    [sectionSortState]
  );

  // Toggle single selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select all in section
  const handleSelectAllInSection = (section: Section) => {
    const sectionIds = section.testCases.map((tc) => tc.id);
    const allSelected = sectionIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        sectionIds.forEach((id) => newSet.delete(id));
      } else {
        sectionIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('플랜 이름을 입력해주세요.');
      return;
    }

    if (selectedIds.size === 0) {
      alert('최소 1개 이상의 테스트케이스를 선택해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePlan(plan.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        testCaseIds: Array.from(selectedIds),
      });
      onSaved();
    } catch (error) {
      console.error('Failed to update plan', error);
      alert('플랜 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // 현재 플랜에 포함된 케이스 수 vs 선택된 케이스 수
  const originalCount = plan.items.length;
  const currentCount = selectedIds.size;
  const addedCount = Array.from(selectedIds).filter((id) => !plan.items.find((item) => item.testCaseId === id)).length;
  const removedCount = plan.items.filter((item) => !selectedIds.has(item.testCaseId)).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-5xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">플랜 수정</h2>
            <p className="text-sm text-slate-500 mt-0.5">플랜 정보와 포함된 테스트케이스를 수정합니다.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Plan Info */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">플랜 이름 *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 로그인 기능 테스트" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="플랜에 대한 설명 (선택사항)"
                />
              </div>
            </div>
          </div>

          {/* Test Case Selection */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search & Stats Bar */}
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-700">테스트케이스 선택</span>
                <div className="flex items-center gap-2">
                  <Badge variant="info">{currentCount}개 선택</Badge>
                  {addedCount > 0 && <Badge variant="success">+{addedCount} 추가</Badge>}
                  {removedCount > 0 && <Badge variant="error">-{removedCount} 제거</Badge>}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ID 또는 제목으로 검색..."
                  className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-64"
                />
              </div>
            </div>

            {/* Test Case List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : sections.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <p>테스트케이스가 없습니다.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {sections.map((section) => {
                    if (section.testCases.length === 0) return null;

                    const sortedTestCases = getSortedTestCases(section);
                    const sectionSelectedCount = section.testCases.filter((tc) => selectedIds.has(tc.id)).length;
                    const isAllSelected = sectionSelectedCount === section.testCases.length;
                    const isSomeSelected = sectionSelectedCount > 0 && !isAllSelected;
                    const isExpanded = expandedSections.has(section.id);
                    const sortState = sectionSortState[section.id] || { field: null, direction: 'asc' };

                    return (
                      <div key={section.id}>
                        {/* Section Header */}
                        <div
                          className="flex items-center gap-3 py-3 px-4 bg-slate-100 cursor-pointer hover:bg-slate-150 transition-colors"
                          onClick={() => handleToggleSection(section.id)}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAllInSection(section);
                            }}
                            className="text-slate-500 hover:text-slate-700 focus:outline-none transition-colors"
                          >
                            {isAllSelected ? (
                              <CheckSquare size={18} className="text-indigo-600" />
                            ) : isSomeSelected ? (
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

                          <button className="text-slate-500 hover:text-slate-700 transition-colors">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>

                          <span className="font-semibold text-slate-800 text-sm">{section.name}</span>

                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-medium rounded-full">
                            {section.testCases.length}
                          </span>

                          {sectionSelectedCount > 0 && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                              {sectionSelectedCount}개 선택
                            </span>
                          )}
                        </div>

                        {/* Section Content */}
                        {isExpanded && (
                          <table className="min-w-full">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-3 py-2 w-10"></th>
                                <th
                                  className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-slate-100 transition-colors"
                                  onClick={() => handleSortSection(section.id, 'id')}
                                >
                                  <div className="flex items-center gap-1">
                                    ID
                                    {sortState.field === 'id' ? (
                                      sortState.direction === 'asc' ? (
                                        <ArrowUp size={14} className="text-indigo-600" />
                                      ) : (
                                        <ArrowDown size={14} className="text-indigo-600" />
                                      )
                                    ) : (
                                      <ArrowUpDown size={14} className="text-slate-400" />
                                    )}
                                  </div>
                                </th>
                                <th
                                  className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                                  onClick={() => handleSortSection(section.id, 'title')}
                                >
                                  <div className="flex items-center gap-1">
                                    Title
                                    {sortState.field === 'title' ? (
                                      sortState.direction === 'asc' ? (
                                        <ArrowUp size={14} className="text-indigo-600" />
                                      ) : (
                                        <ArrowDown size={14} className="text-indigo-600" />
                                      )
                                    ) : (
                                      <ArrowUpDown size={14} className="text-slate-400" />
                                    )}
                                  </div>
                                </th>
                                <th
                                  className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-28 cursor-pointer hover:bg-slate-100 transition-colors"
                                  onClick={() => handleSortSection(section.id, 'priority')}
                                >
                                  <div className="flex items-center gap-1">
                                    Priority
                                    {sortState.field === 'priority' ? (
                                      sortState.direction === 'asc' ? (
                                        <ArrowUp size={14} className="text-indigo-600" />
                                      ) : (
                                        <ArrowDown size={14} className="text-indigo-600" />
                                      )
                                    ) : (
                                      <ArrowUpDown size={14} className="text-slate-400" />
                                    )}
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                              {sortedTestCases.map((tc) => {
                                const caseId = tc.caseNumber
                                  ? `C${tc.caseNumber}`
                                  : tc.id.substring(0, 6).toUpperCase();
                                const isSelected = selectedIds.has(tc.id);
                                const isInOriginalPlan = plan.items.some((item) => item.testCaseId === tc.id);

                                return (
                                  <tr
                                    key={tc.id}
                                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                                      isSelected ? 'bg-indigo-50/50' : ''
                                    }`}
                                    onClick={() => handleToggleSelect(tc.id)}
                                  >
                                    <td className="px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleSelect(tc.id)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-sm font-mono text-slate-500 w-24">
                                      <div className="flex items-center gap-1">
                                        {caseId}
                                        {isSelected && !isInOriginalPlan && (
                                          <span className="text-[10px] px-1 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                                            NEW
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="text-sm text-slate-900">{tc.title}</span>
                                    </td>
                                    <td className="px-4 py-3 w-28">
                                      <Badge
                                        variant={
                                          tc.priority === 'HIGH'
                                            ? 'error'
                                            : tc.priority === 'MEDIUM'
                                              ? 'warning'
                                              : 'success'
                                        }
                                      >
                                        {tc.priority}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-500">
            {originalCount !== currentCount && (
              <span>
                기존 {originalCount}개 → 변경 후 {currentCount}개
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim() || selectedIds.size === 0}
              icon={isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanEditModal;
