// Test Cases Page - Updated 2025-12-07
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FolderTree } from '../components/FolderTree';
import { CsvImportModal } from '../components/CsvImportModal';
import { TestCaseFormModal } from '../components/TestCaseFormModal';
import { RichTextEditor } from '../components/RichTextEditor';
import {
  getFolderTree,
  createFolder,
  renameFolder,
  deleteFolder,
  bulkDeleteFolders,
  FolderTreeItem,
} from '../api/folder';
import {
  getTestCases,
  TestCase,
  deleteTestCase,
  updateTestCase,
  bulkUpdateTestCases,
  bulkDeleteTestCases,
  moveTestCasesToFolder,
  AutomationType,
} from '../api/testcase';
import {
  Plus,
  Upload,
  FileText,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  X,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Tag,
  Bot,
  FolderInput,
} from 'lucide-react';
import { exportTestCasesToCSV, exportTestCasesToExcel } from '../utils/export';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { InputModal } from '../components/ui/InputModal';
import { ImageLightbox } from '../components/ui/ImageLightbox';
import DOMPurify from 'dompurify';

// HTML 태그를 제거하고 텍스트만 추출하는 헬퍼 함수 (미래 사용 예정)
// const stripHtmlTags = (html: string | null | undefined): string => {
//   if (!html) return '';
//   const doc = new DOMParser().parseFromString(html, 'text/html');
//   return doc.body.textContent || '';
// };

// 정렬 상태 타입
type SortField = 'id' | 'title' | 'priority';
type SortDirection = 'asc' | 'desc';
interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

// 섹션별 정렬 상태
type SectionSortState = Record<string, SortState>;

// Bulk Edit Modal Component
interface BulkEditModalProps {
  isOpen: boolean;
  selectedCount: number;
  availableCategories: string[];
  folders: FolderTreeItem[];
  onClose: () => void;
  onApply: (updates: {
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    automationType?: AutomationType;
    category?: string | null;
    folderId?: string | null;
  }) => void;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  selectedCount,
  availableCategories,
  folders,
  onClose,
  onApply,
}) => {
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | ''>('');
  const [automationType, setAutomationType] = useState<AutomationType | ''>('');
  const [category, setCategory] = useState<string>('');
  const [categoryAction, setCategoryAction] = useState<'keep' | 'set' | 'clear'>('keep');
  const [folderAction, setFolderAction] = useState<'keep' | 'move'>('keep');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // 모달이 열릴 때 선택 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setPriority('');
      setAutomationType('');
      setCategory('');
      setCategoryAction('keep');
      setFolderAction('keep');
      setSelectedFolderId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 폴더 트리를 플랫 리스트로 변환 (depth 포함)
  const flattenFolders = (items: FolderTreeItem[], depth = 0): Array<{ id: string; name: string; depth: number }> => {
    const result: Array<{ id: string; name: string; depth: number }> = [];
    items.forEach((item) => {
      result.push({ id: item.id, name: item.name, depth });
      if (item.children && item.children.length > 0) {
        result.push(...flattenFolders(item.children, depth + 1));
      }
    });
    return result;
  };

  const flatFolders = flattenFolders(folders);

  const handleApply = () => {
    const updates: {
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      automationType?: AutomationType;
      category?: string | null;
      folderId?: string | null;
    } = {};
    if (priority) updates.priority = priority;
    if (automationType) updates.automationType = automationType;
    if (categoryAction === 'set' && category) updates.category = category;
    if (categoryAction === 'clear') updates.category = null;
    if (folderAction === 'move') updates.folderId = selectedFolderId || undefined;
    onApply(updates);
  };

  const hasChanges = priority !== '' || automationType !== '' || categoryAction !== 'keep' || folderAction !== 'keep';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900">일괄 수정</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          선택된 <span className="font-semibold text-indigo-600">{selectedCount}개</span> 테스트케이스를 수정합니다.
          <br />
          <span className="text-xs text-slate-500">변경할 항목만 선택하세요. 선택하지 않은 항목은 유지됩니다.</span>
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | '')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">-- 변경 안함 --</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Automation Type</label>
            <select
              value={automationType}
              onChange={(e) => setAutomationType(e.target.value as AutomationType | '')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">-- 변경 안함 --</option>
              <option value="MANUAL">Manual</option>
              <option value="AUTOMATED">Automated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="categoryAction"
                  value="keep"
                  checked={categoryAction === 'keep'}
                  onChange={() => setCategoryAction('keep')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-600">변경 안함</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="categoryAction"
                  value="set"
                  checked={categoryAction === 'set'}
                  onChange={() => setCategoryAction('set')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-600">카테고리 설정</span>
              </label>
              {categoryAction === 'set' && (
                <div className="ml-6">
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="카테고리 입력 (예: Smoke, Regression)"
                    list="category-suggestions"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <datalist id="category-suggestions">
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="categoryAction"
                  value="clear"
                  checked={categoryAction === 'clear'}
                  onChange={() => setCategoryAction('clear')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-600">카테고리 제거</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Folder</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="folderAction"
                  value="keep"
                  checked={folderAction === 'keep'}
                  onChange={() => setFolderAction('keep')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-600">변경 안함</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="folderAction"
                  value="move"
                  checked={folderAction === 'move'}
                  onChange={() => setFolderAction('move')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-600">폴더 이동</span>
              </label>
              {folderAction === 'move' && (
                <div className="ml-6">
                  <select
                    value={selectedFolderId || ''}
                    onChange={(e) => setSelectedFolderId(e.target.value || null)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="">Root (Uncategorized)</option>
                    {flatFolders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {'\u00A0\u00A0'.repeat(folder.depth)}└─ {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" onClick={handleApply} disabled={!hasChanges}>
            적용
          </Button>
        </div>
      </div>
    </div>
  );
};

// Bulk Move Modal Component
interface BulkMoveModalProps {
  isOpen: boolean;
  selectedCount: number;
  folders: FolderTreeItem[];
  onClose: () => void;
  onMove: (targetFolderId: string | null) => void;
}

// 폴더 트리를 평탄화하여 옵션 목록 생성
const flattenFoldersForSelect = (
  folders: FolderTreeItem[],
  depth = 0
): { id: string; name: string; depth: number }[] => {
  const result: { id: string; name: string; depth: number }[] = [];
  for (const folder of folders) {
    result.push({ id: folder.id, name: folder.name, depth });
    if (folder.children && folder.children.length > 0) {
      result.push(...flattenFoldersForSelect(folder.children, depth + 1));
    }
  }
  return result;
};

const BulkMoveModal: React.FC<BulkMoveModalProps> = ({ isOpen, selectedCount, folders, onClose, onMove }) => {
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const flatFolders = flattenFoldersForSelect(folders);

  // 모달이 열릴 때 선택 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setTargetFolderId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMove = () => {
    onMove(targetFolderId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            <FolderInput size={20} className="inline mr-2 text-indigo-600" />
            폴더로 이동
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          선택된 <span className="font-semibold text-indigo-600">{selectedCount}개</span> 테스트케이스를 이동합니다.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">대상 폴더</label>
          <select
            value={targetFolderId || ''}
            onChange={(e) => setTargetFolderId(e.target.value || null)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">— Root (최상위) —</option>
            {flatFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {'　'.repeat(folder.depth)}
                {folder.depth > 0 ? '└ ' : ''}
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" onClick={handleMove}>
            이동
          </Button>
        </div>
      </div>
    </div>
  );
};

// Export Dropdown Component
type ExportTarget = 'all' | 'selected' | 'folder';
type ExportFormat = 'csv' | 'excel';

interface ExportDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (target: ExportTarget, format: ExportFormat) => void;
  selectedCount: number;
  hasFolder: boolean;
  folderName?: string;
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({
  isOpen,
  onClose,
  onExport,
  selectedCount,
  hasFolder,
  folderName,
}) => {
  const [target, setTarget] = useState<ExportTarget>('all');
  const [isExporting, setIsExporting] = useState(false);

  // 드롭다운이 열릴 때 기본값 설정
  useEffect(() => {
    if (isOpen) {
      if (selectedCount > 0) {
        setTarget('selected');
      } else if (hasFolder) {
        setTarget('folder');
      } else {
        setTarget('all');
      }
    }
  }, [isOpen, selectedCount, hasFolder]);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      await onExport(target, format);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h4 className="font-semibold text-slate-900 text-sm mb-3">엑스포트 대상</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportTarget"
                value="all"
                checked={target === 'all'}
                onChange={() => setTarget('all')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">모든 케이스</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="exportTarget"
                value="selected"
                checked={target === 'selected'}
                onChange={() => setTarget('selected')}
                disabled={selectedCount === 0}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">
                선택된 케이스만
                {selectedCount > 0 && <span className="ml-1 text-indigo-600 font-medium">({selectedCount}개)</span>}
              </span>
            </label>
            {hasFolder && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportTarget"
                  value="folder"
                  checked={target === 'folder'}
                  onChange={() => setTarget('folder')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">
                  현재 폴더만
                  {folderName && <span className="ml-1 text-slate-500">({folderName})</span>}
                </span>
              </label>
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-50">
          <p className="text-xs text-slate-500 mb-2">파일 형식 선택</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              data-testid="testcases-export-csv"
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isExporting ? <span className="animate-spin">...</span> : <Download size={14} />}
              CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={isExporting}
              data-testid="testcases-export-excel"
              className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isExporting ? <span className="animate-spin">...</span> : <Download size={14} />}
              Excel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Section Header Component
interface SectionHeaderProps {
  section: { id: string; name: string };
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  isAllSelected: boolean;
  onSelectAll: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  section,
  count,
  isExpanded,
  onToggle,
  isAllSelected,
  onSelectAll,
}) => {
  return (
    <div
      className="flex items-center gap-3 py-3 px-4 bg-slate-100 border-b border-slate-200 cursor-pointer hover:bg-slate-150 transition-colors"
      onClick={onToggle}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelectAll();
        }}
        className="text-slate-500 hover:text-slate-700 focus:outline-none transition-colors"
      >
        {isAllSelected ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
      </button>

      <button className="text-slate-500 hover:text-slate-700 transition-colors">
        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>

      <span className="font-semibold text-slate-800 text-sm">{section.name}</span>

      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-medium rounded-full">{count}</span>
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
        className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => onSort(sectionId, 'priority')}
      >
        <div className="flex items-center gap-1">
          Priority
          {getSortIcon('priority')}
        </div>
      </th>
      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Type</th>
      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">
        Category
      </th>
      <th className="px-4 py-2 w-12"></th>
    </tr>
  );
};

// Test Case Row Component
interface TestCaseRowProps {
  testCase: TestCase;
  isSelected: boolean;
  isDetailOpen: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (tc: TestCase) => void;
}

const TestCaseRow: React.FC<TestCaseRowProps> = ({
  testCase,
  isSelected,
  isDetailOpen,
  onToggleSelect,
  onOpenDetail,
}) => {
  const caseId = testCase.caseNumber ? `C${testCase.caseNumber}` : testCase.id.substring(0, 6).toUpperCase();

  return (
    <tr
      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
        isSelected ? 'bg-indigo-50/50' : ''
      } ${isDetailOpen ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}
      onClick={() => onOpenDetail(testCase)}
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
      <td className="px-4 py-3 w-24">
        <Badge
          variant={testCase.priority === 'HIGH' ? 'error' : testCase.priority === 'MEDIUM' ? 'warning' : 'success'}
        >
          {testCase.priority}
        </Badge>
      </td>
      <td className="px-4 py-3 w-28">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            testCase.automationType === 'AUTOMATED' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {testCase.automationType === 'AUTOMATED' ? 'Automated' : 'Manual'}
        </span>
      </td>
      <td className="px-4 py-3 w-32">
        {testCase.category ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            {testCase.category}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 w-12">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(testCase);
          }}
          className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-indigo-600 transition-colors"
          title="View Details"
        >
          <ChevronRight size={18} />
        </button>
      </td>
    </tr>
  );
};

// Test Case Detail Panel Component
interface TestCaseDetailPanelProps {
  testCase: TestCase | null;
  isOpen: boolean;
  folders: FolderTreeItem[];
  onClose: () => void;
  onEdit: (tc: TestCase) => void;
  onDelete: (tc: TestCase) => void;
  onUpdate: (tc: TestCase) => void;
}

const TestCaseDetailPanel: React.FC<TestCaseDetailPanelProps> = ({
  testCase,
  isOpen,
  folders,
  onClose,
  onEdit: _onEdit,
  onDelete,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<TestCase>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Reset edit state when test case changes
  useEffect(() => {
    if (testCase) {
      setEditData({
        title: testCase.title,
        precondition: testCase.precondition || '',
        steps: testCase.steps || '',
        expectedResult: testCase.expectedResult || '',
        priority: testCase.priority,
        automationType: testCase.automationType || 'MANUAL',
        category: testCase.category || '',
        folderId: testCase.folderId || undefined,
      });
      setIsEditing(false);
    }
  }, [testCase]);

  // ESC 키로 패널 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (lightboxImage) {
          setLightboxImage(null);
        } else if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isEditing, lightboxImage, onClose]);

  // 이미지 클릭 이벤트 핸들러
  useEffect(() => {
    if (!isOpen) return;

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' && target.closest('.prose')) {
        e.preventDefault();
        const src = (target as HTMLImageElement).src;
        setLightboxImage(src);
      }
    };

    document.addEventListener('click', handleImageClick);
    return () => document.removeEventListener('click', handleImageClick);
  }, [isOpen]);

  const handleSave = async () => {
    if (!testCase) return;

    try {
      await updateTestCase(testCase.id, editData);
      onUpdate({ ...testCase, ...editData } as TestCase);
      setIsEditing(false);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to update test case:', error);
      }
      alert('수정에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    if (testCase) {
      setEditData({
        title: testCase.title,
        precondition: testCase.precondition || '',
        steps: testCase.steps || '',
        expectedResult: testCase.expectedResult || '',
        priority: testCase.priority,
        automationType: testCase.automationType || 'MANUAL',
        category: testCase.category || '',
        folderId: testCase.folderId || undefined,
      });
    }
    setIsEditing(false);
  };

  // 폴더 트리를 플랫 리스트로 변환 (depth 포함)
  const flattenFolders = (items: FolderTreeItem[], depth = 0): Array<{ id: string; name: string; depth: number }> => {
    const result: Array<{ id: string; name: string; depth: number }> = [];
    items.forEach((item) => {
      result.push({ id: item.id, name: item.name, depth });
      if (item.children && item.children.length > 0) {
        result.push(...flattenFolders(item.children, depth + 1));
      }
    });
    return result;
  };

  const flatFolders = flattenFolders(folders);

  if (!isOpen || !testCase) return null;

  const caseId = testCase.caseNumber ? `C${testCase.caseNumber}` : testCase.id.substring(0, 6).toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity lg:hidden" onClick={onClose} />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] lg:w-[520px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-10 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{caseId}</span>
              <Badge
                variant={
                  testCase.priority === 'HIGH' ? 'error' : testCase.priority === 'MEDIUM' ? 'warning' : 'success'
                }
                className="text-[10px] font-semibold uppercase"
              >
                {testCase.priority}
              </Badge>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  testCase.automationType === 'AUTOMATED'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {testCase.automationType === 'AUTOMATED' ? 'Automated' : 'Manual'}
              </span>
              {testCase.category && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-blue-100 text-blue-800">
                  {testCase.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Edit size={14} />}
                    onClick={() => setIsEditing(true)}
                    data-testid="testcase-panel-edit"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={() => onDelete(testCase)}
                    data-testid="testcase-panel-delete"
                  >
                    Delete
                  </Button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close (ESC)"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-900 truncate">{isEditing ? editData.title : testCase.title}</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {isEditing ? (
            // Edit Mode
            <>
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editData.title || ''}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  data-testid="testcase-panel-title"
                />
              </div>

              {/* Folder Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Folder
                </label>
                <select
                  value={editData.folderId || ''}
                  onChange={(e) => setEditData({ ...editData, folderId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  data-testid="testcase-panel-folder"
                >
                  <option value="">Root (Uncategorized)</option>
                  {flatFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {'\u00A0\u00A0'.repeat(folder.depth)}└─ {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority, Automation Type & Category */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Priority
                  </label>
                  <select
                    value={editData.priority || 'MEDIUM'}
                    onChange={(e) =>
                      setEditData({ ...editData, priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Type
                  </label>
                  <select
                    value={editData.automationType || 'MANUAL'}
                    onChange={(e) => setEditData({ ...editData, automationType: e.target.value as AutomationType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="MANUAL">Manual</option>
                    <option value="AUTOMATED">Automated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editData.category || ''}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    placeholder="e.g. Smoke"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Preconditions */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Preconditions
                </label>
                <RichTextEditor
                  content={editData.precondition || ''}
                  onChange={(html) => setEditData({ ...editData, precondition: html })}
                  placeholder="Enter preconditions..."
                />
              </div>

              {/* Steps */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Steps
                </label>
                <RichTextEditor
                  content={editData.steps || ''}
                  onChange={(html) => setEditData({ ...editData, steps: html })}
                  placeholder="Enter test steps..."
                />
              </div>

              {/* Expected Result */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Expected Result
                </label>
                <RichTextEditor
                  content={editData.expectedResult || ''}
                  onChange={(html) => setEditData({ ...editData, expectedResult: html })}
                  placeholder="Enter expected result..."
                />
              </div>
            </>
          ) : (
            // View Mode
            <>
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Title
                </label>
                <p className="text-sm text-slate-900">{testCase.title}</p>
              </div>

              {/* Priority, Automation Type & Category */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Priority
                  </label>
                  <Badge
                    variant={
                      testCase.priority === 'HIGH' ? 'error' : testCase.priority === 'MEDIUM' ? 'warning' : 'success'
                    }
                  >
                    {testCase.priority}
                  </Badge>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Type
                  </label>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                      testCase.automationType === 'AUTOMATED'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {testCase.automationType === 'AUTOMATED' ? 'Automated' : 'Manual'}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Category
                  </label>
                  {testCase.category ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {testCase.category}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>
              </div>

              {/* Preconditions */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Preconditions
                </label>
                {testCase.precondition ? (
                  <div
                    className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 border border-slate-200 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-4 prose-ol:pl-4 prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(testCase.precondition, { ADD_ATTR: ['target', 'rel'] }),
                    }}
                  />
                ) : (
                  <p className="text-sm text-slate-400 italic">No preconditions specified</p>
                )}
              </div>

              {/* Steps */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Steps
                </label>
                {testCase.steps ? (
                  <div
                    className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 border border-slate-200 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-4 prose-ol:pl-4 prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(testCase.steps, { ADD_ATTR: ['target', 'rel'] }),
                    }}
                  />
                ) : (
                  <p className="text-sm text-slate-400 italic">No steps specified</p>
                )}
              </div>

              {/* Expected Result */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Expected Result
                </label>
                {testCase.expectedResult ? (
                  <div
                    className="bg-emerald-50 rounded-lg p-4 text-sm text-emerald-900 border border-emerald-200 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-4 prose-ol:pl-4 prose-a:text-emerald-700 prose-a:no-underline hover:prose-a:underline"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(testCase.expectedResult, { ADD_ATTR: ['target', 'rel'] }),
                    }}
                  />
                ) : (
                  <p className="text-sm text-slate-400 italic">No expected result specified</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions - 편집 모드일 때만 표시 */}
        {isEditing && (
          <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex-shrink-0">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} data-testid="testcase-panel-save">
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox src={lightboxImage || ''} isOpen={!!lightboxImage} onClose={() => setLightboxImage(null)} />
    </>
  );
};

// 폴더 구조를 섹션으로 변환하는 함수
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
        name: 'Uncategorized',
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

// 특정 폴더와 그 하위 폴더의 섹션만 가져오는 함수
const getSectionsForFolder = (
  folders: FolderTreeItem[],
  testCases: TestCase[],
  selectedFolderId: string | null
): Section[] => {
  if (selectedFolderId === null) {
    // All Cases - 전체 폴더 구조 표시
    return buildSections(folders, testCases);
  }

  // 선택된 폴더 찾기
  const findFolder = (items: FolderTreeItem[], id: string): FolderTreeItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findFolder(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedFolder = findFolder(folders, selectedFolderId);
  if (!selectedFolder) return [];

  // 선택된 폴더와 하위 폴더의 섹션 빌드
  const folderTestCases = testCases.filter((tc) => tc.folderId === selectedFolder.id);
  const sections: Section[] = [
    {
      id: selectedFolder.id,
      name: selectedFolder.name,
      parentId: null,
      depth: 0,
      testCases: folderTestCases,
    },
  ];

  if (selectedFolder.children && selectedFolder.children.length > 0) {
    const childSections = buildSections(selectedFolder.children, testCases, selectedFolder.id, 1);
    sections.push(...childSections);
  }

  return sections;
};

const TestCasesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [folders, setFolders] = useState<FolderTreeItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Edit/Create Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);

  // Delete Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [testCaseToDelete, setTestCaseToDelete] = useState<TestCase | null>(null);

  // Folder Create Modal State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderParentId, setFolderParentId] = useState<string | null>(null);

  // Folder Rename Modal State
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingFolderName, setRenamingFolderName] = useState('');

  // Detail Panel State
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

  // Section Expand State
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Section Sort State
  const [sectionSortState, setSectionSortState] = useState<SectionSortState>({});

  // Bulk Selection State (Test Cases)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);

  // Export State
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Filter State
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<AutomationType | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isTypeFilterDropdownOpen, setIsTypeFilterDropdownOpen] = useState(false);

  // URL 쿼리 파라미터에서 필터 초기화
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'MANUAL' || typeParam === 'AUTOMATED') {
      setTypeFilter(typeParam as AutomationType);
    }
  }, [searchParams]);

  // Folder Delete Modal State
  const [isFolderDeleteModalOpen, setIsFolderDeleteModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);

  // Folder Bulk Selection State
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [isFolderBulkMode, setIsFolderBulkMode] = useState(false);
  const [isFolderBulkDeleteModalOpen, setIsFolderBulkDeleteModalOpen] = useState(false);

  // 폴더 변경 시 선택 초기화
  useEffect(() => {
    setSelectedIds(new Set());
    setExpandedSections(new Set());
    setSectionSortState({});
  }, [selectedFolderId]);

  // 폴더 트리 로드
  const loadFolderTree = useCallback(async () => {
    try {
      const response = await getFolderTree();
      if (response.success) {
        setFolders(response.data);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load folders', error);
      }
    }
  }, []);

  // 테스트케이스 로드
  const loadTestCases = useCallback(
    async (folderId: string | null) => {
      try {
        setIsLoading(true);
        const response = await getTestCases(folderId || undefined);
        if (response.success) {
          setTestCases(response.data);
          // 섹션 기본 확장
          const sections = getSectionsForFolder(folders, response.data, folderId);
          setExpandedSections(new Set(sections.map((s) => s.id)));
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load test cases', error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [folders]
  );

  useEffect(() => {
    loadFolderTree();
  }, [loadFolderTree]);

  useEffect(() => {
    loadTestCases(selectedFolderId);
  }, [loadTestCases, selectedFolderId]);

  // 섹션 빌드
  const sections = useMemo(() => {
    const baseSections = getSectionsForFolder(folders, testCases, selectedFolderId);

    // 필터 적용
    let filteredSections = baseSections;

    // 카테고리 필터 적용
    if (categoryFilter) {
      filteredSections = filteredSections
        .map((section) => ({
          ...section,
          testCases: section.testCases.filter((tc) => tc.category === categoryFilter),
        }))
        .filter((section) => section.testCases.length > 0);
    }

    // Automation Type 필터 적용
    if (typeFilter) {
      filteredSections = filteredSections
        .map((section) => ({
          ...section,
          testCases: section.testCases.filter((tc) => tc.automationType === typeFilter),
        }))
        .filter((section) => section.testCases.length > 0);
    }

    return filteredSections;
  }, [folders, testCases, selectedFolderId, categoryFilter, typeFilter]);

  // 사용 가능한 카테고리 목록 (중복 제거)
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    testCases.forEach((tc) => {
      if (tc.category) {
        categories.add(tc.category);
      }
    });
    return Array.from(categories).sort();
  }, [testCases]);

  // 섹션 확장 시 기본 확장
  useEffect(() => {
    if (sections.length > 0 && expandedSections.size === 0) {
      setExpandedSections(new Set(sections.map((s) => s.id)));
    }
  }, [sections, expandedSections.size]);

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    loadTestCases(folderId);
    setIsDetailPanelOpen(false);
    setSelectedTestCase(null);
  };

  const handleAddFolder = (parentId: string | null) => {
    setFolderParentId(parentId);
    setIsFolderModalOpen(true);
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await createFolder(name, folderParentId);
      loadFolderTree();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to create folder', error);
      }
    }
  };

  const handleRenameFolder = (folderId: string, currentName: string) => {
    setRenamingFolderId(folderId);
    setRenamingFolderName(currentName);
    setIsRenameModalOpen(true);
  };

  const handleConfirmRename = async (newName: string) => {
    if (!renamingFolderId) return;
    try {
      await renameFolder(renamingFolderId, newName);
      loadFolderTree();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to rename folder', error);
      }
    }
  };

  // 폴더 삭제 핸들러
  const handleDeleteFolder = (folderId: string, folderName: string) => {
    setFolderToDelete({ id: folderId, name: folderName });
    setIsFolderDeleteModalOpen(true);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      await deleteFolder(folderToDelete.id);
      loadFolderTree();
      // 삭제된 폴더가 선택된 상태였다면 선택 해제
      if (selectedFolderId === folderToDelete.id) {
        setSelectedFolderId(null);
        loadTestCases(null);
      }
      setFolderToDelete(null);
      setIsFolderDeleteModalOpen(false);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to delete folder', error);
      }
    }
  };

  // 폴더 Bulk 선택 토글
  const handleToggleFolderSelect = (folderId: string) => {
    setSelectedFolderIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // 폴더 Bulk 삭제 핸들러
  const handleConfirmBulkDeleteFolders = async () => {
    if (selectedFolderIds.size === 0) return;
    try {
      await bulkDeleteFolders(Array.from(selectedFolderIds));
      loadFolderTree();
      // 삭제된 폴더 중 선택된 폴더가 있었다면 선택 해제
      if (selectedFolderId && selectedFolderIds.has(selectedFolderId)) {
        setSelectedFolderId(null);
        loadTestCases(null);
      }
      setSelectedFolderIds(new Set());
      setIsFolderBulkDeleteModalOpen(false);
      setIsFolderBulkMode(false);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to bulk delete folders', error);
      }
    }
  };

  const handleSuccess = () => {
    loadTestCases(selectedFolderId);
    setSelectedIds(new Set());
  };

  // Create
  const handleCreateClick = () => {
    setEditingTestCase(null);
    setIsFormModalOpen(true);
  };

  // Open Detail Panel
  const handleOpenDetail = (tc: TestCase) => {
    setSelectedTestCase(tc);
    setIsDetailPanelOpen(true);
  };

  // Close Detail Panel
  const handleCloseDetail = () => {
    setIsDetailPanelOpen(false);
    setSelectedTestCase(null);
  };

  // Edit from Detail Panel
  const handleEditFromPanel = (tc: TestCase) => {
    setEditingTestCase(tc);
    setIsFormModalOpen(true);
    setIsDetailPanelOpen(false);
  };

  // Delete from Detail Panel
  const handleDeleteFromPanel = (tc: TestCase) => {
    setTestCaseToDelete(tc);
    setIsConfirmModalOpen(true);
  };

  // Update from Detail Panel
  const handleUpdateFromPanel = (updatedTc: TestCase) => {
    setTestCases((prev) => prev.map((tc) => (tc.id === updatedTc.id ? updatedTc : tc)));
    setSelectedTestCase(updatedTc);
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!testCaseToDelete) return;
    try {
      await deleteTestCase(testCaseToDelete.id);
      loadTestCases(selectedFolderId);
      setTestCaseToDelete(null);
      setIsConfirmModalOpen(false);
      setSelectedIds(new Set());
      if (selectedTestCase?.id === testCaseToDelete.id) {
        setIsDetailPanelOpen(false);
        setSelectedTestCase(null);
      }
    } catch {
      alert('Failed to delete test case');
    }
  };

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

  // Bulk Selection Handlers
  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 섹션과 하위 섹션의 모든 테스트케이스 선택/해제
  const handleSelectAllInSection = (sectionId: string) => {
    // 현재 섹션과 모든 하위 섹션의 테스트케이스 ID 수집
    const allIds = getAllTestCaseIdsInSectionAndDescendants(sectionId, sections);

    // 모두 선택되어 있는지 확인
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

    const newSelected = new Set(selectedIds);
    if (allSelected) {
      // 모두 선택 해제
      allIds.forEach((id) => newSelected.delete(id));
    } else {
      // 모두 선택
      allIds.forEach((id) => newSelected.add(id));
    }
    setSelectedIds(newSelected);
  };

  // 섹션과 하위 섹션의 모든 테스트케이스가 선택되어 있는지 확인
  const isSectionFullySelected = (sectionId: string): boolean => {
    const allIds = getAllTestCaseIdsInSectionAndDescendants(sectionId, sections);
    return allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk Edit
  const handleBulkEdit = () => {
    setIsBulkEditModalOpen(true);
  };

  const handleBulkEditApply = async (updates: {
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    automationType?: AutomationType;
    category?: string | null;
    folderId?: string | null;
  }) => {
    try {
      await bulkUpdateTestCases(Array.from(selectedIds), updates);
      setIsBulkEditModalOpen(false);
      setSelectedIds(new Set());
      loadTestCases(selectedFolderId);
    } catch {
      alert('일괄 수정에 실패했습니다.');
    }
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    setIsBulkDeleteModalOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      await bulkDeleteTestCases(Array.from(selectedIds));
      setIsBulkDeleteModalOpen(false);
      setSelectedIds(new Set());
      loadTestCases(selectedFolderId);
      if (selectedTestCase && selectedIds.has(selectedTestCase.id)) {
        setIsDetailPanelOpen(false);
        setSelectedTestCase(null);
      }
    } catch {
      alert('일괄 삭제에 실패했습니다.');
    }
  };

  // Bulk Move
  const handleBulkMove = () => {
    setIsBulkMoveModalOpen(true);
  };

  const handleBulkMoveConfirm = async (targetFolderId: string | null) => {
    try {
      await moveTestCasesToFolder(Array.from(selectedIds), targetFolderId);
      setIsBulkMoveModalOpen(false);
      setSelectedIds(new Set());
      loadTestCases(selectedFolderId);
    } catch {
      alert('폴더 이동에 실패했습니다.');
    }
  };

  // Export Handler
  const handleExport = (target: ExportTarget, format: ExportFormat) => {
    let casesToExport: TestCase[] = [];
    let filename = 'test_cases';

    switch (target) {
      case 'all':
        // 현재 화면에 보이는 모든 케이스 (sections 기반)
        casesToExport = sections.flatMap((s) => s.testCases);
        filename = selectedFolderId ? `test_cases_filtered` : 'test_cases_all';
        break;
      case 'selected':
        // 선택된 케이스만
        casesToExport = testCases.filter((tc) => selectedIds.has(tc.id));
        filename = `test_cases_selected_${selectedIds.size}`;
        break;
      case 'folder':
        // 현재 선택된 폴더의 케이스
        if (selectedFolderId) {
          casesToExport = sections.flatMap((s) => s.testCases);
          const folderName = sections[0]?.name || 'folder';
          filename = `test_cases_${folderName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}`;
        }
        break;
    }

    if (casesToExport.length === 0) {
      alert('내보낼 테스트 케이스가 없습니다.');
      return;
    }

    // 타임스탬프 추가
    const timestamp = new Date().toISOString().slice(0, 10);
    filename = `${filename}_${timestamp}`;

    if (format === 'csv') {
      exportTestCasesToCSV(casesToExport, filename);
    } else {
      exportTestCasesToExcel(casesToExport, filename);
    }
  };

  // 현재 선택된 폴더 이름 가져오기
  const getSelectedFolderName = (): string | undefined => {
    if (!selectedFolderId) return undefined;
    const findFolder = (items: FolderTreeItem[], id: string): string | undefined => {
      for (const item of items) {
        if (item.id === id) return item.name;
        if (item.children) {
          const found = findFolder(item.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };
    return findFolder(folders, selectedFolderId);
  };

  const selectedCount = selectedIds.size;
  const totalCases = testCases.length;

  return (
    <div className="flex h-full">
      {/* Inner Sidebar: Folder Tree */}
      <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Folders</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setIsFolderBulkMode(!isFolderBulkMode);
                if (isFolderBulkMode) {
                  setSelectedFolderIds(new Set());
                }
              }}
              className={`p-1 rounded transition-colors ${isFolderBulkMode ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
              title={isFolderBulkMode ? '선택 모드 종료' : '일괄 선택'}
            >
              <CheckSquare size={16} />
            </button>
            <button
              onClick={() => handleAddFolder(null)}
              className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors"
              title="New Folder"
              data-testid="folders-new-folder"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Folder Bulk Action Bar */}
        {isFolderBulkMode && selectedFolderIds.size > 0 && (
          <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-700">{selectedFolderIds.size}개 선택됨</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsFolderBulkDeleteModalOpen(true)}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} />
                삭제
              </button>
              <button
                onClick={() => {
                  setSelectedFolderIds(new Set());
                  setIsFolderBulkMode(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                title="취소"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <FolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
            onAddFolder={handleAddFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onFoldersChange={loadFolderTree}
            selectedFolderIds={selectedFolderIds}
            onToggleFolderSelect={handleToggleFolderSelect}
            isBulkMode={isFolderBulkMode}
          />
        </div>
      </div>

      {/* Main Content: Section-based Table */}
      <div
        className={`flex-1 flex flex-col bg-white min-w-0 transition-all duration-300 ${isDetailPanelOpen ? 'lg:mr-[520px]' : ''}`}
      >
        {/* Toolbar */}
        <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-end bg-white flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Test Cases</h1>
            <p className="text-sm text-slate-500 mt-1">
              {categoryFilter || typeFilter ? (
                <>
                  {sections.reduce((sum, s) => sum + s.testCases.length, 0)} of {totalCases} cases
                  <span className="ml-2 text-indigo-600">
                    (filtered by{' '}
                    {[
                      typeFilter && `Type: ${typeFilter === 'MANUAL' ? 'Manual' : 'Automated'}`,
                      categoryFilter && `Category: "${categoryFilter}"`,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                    )
                  </span>
                </>
              ) : (
                `${totalCases} cases found`
              )}
            </p>
          </div>
          <div className="flex gap-3">
            {/* Type Filter Dropdown */}
            <div className="relative">
              <Button
                variant={typeFilter ? 'primary' : 'outline'}
                icon={typeFilter === 'AUTOMATED' ? <Bot size={16} /> : <FileText size={16} />}
                onClick={() => setIsTypeFilterDropdownOpen(!isTypeFilterDropdownOpen)}
              >
                {typeFilter ? (typeFilter === 'MANUAL' ? 'Manual' : 'Automated') : 'Type'}
                <ChevronDown size={14} className="ml-1" />
              </Button>
              {isTypeFilterDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsTypeFilterDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setTypeFilter(null);
                          setSearchParams({});
                          setIsTypeFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          !typeFilter ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        All Types
                      </button>
                      <button
                        onClick={() => {
                          setTypeFilter('MANUAL');
                          setSearchParams({ type: 'MANUAL' });
                          setIsTypeFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                          typeFilter === 'MANUAL'
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <FileText size={14} />
                        Manual
                      </button>
                      <button
                        onClick={() => {
                          setTypeFilter('AUTOMATED');
                          setSearchParams({ type: 'AUTOMATED' });
                          setIsTypeFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                          typeFilter === 'AUTOMATED'
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Bot size={14} />
                        Automated
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Category Filter Dropdown */}
            {availableCategories.length > 0 && (
              <div className="relative">
                <Button
                  variant={categoryFilter ? 'primary' : 'outline'}
                  icon={<Tag size={16} />}
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                >
                  {categoryFilter || 'Category'}
                  <ChevronDown size={14} className="ml-1" />
                </Button>
                {isFilterDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setCategoryFilter(null);
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                            !categoryFilter
                              ? 'bg-indigo-50 text-indigo-700 font-medium'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          All Categories
                        </button>
                        {availableCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              setCategoryFilter(cat);
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                              categoryFilter === cat
                                ? 'bg-indigo-50 text-indigo-700 font-medium'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Tag size={14} />
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {/* Export Button with Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                icon={<Download size={16} />}
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                data-testid="testcases-export-button"
              >
                Export
                <ChevronDown size={14} className="ml-1" />
              </Button>
              <ExportDropdown
                isOpen={isExportDropdownOpen}
                onClose={() => setIsExportDropdownOpen(false)}
                onExport={handleExport}
                selectedCount={selectedCount}
                hasFolder={!!selectedFolderId}
                folderName={getSelectedFolderName()}
              />
            </div>
            <Button variant="outline" icon={<Upload size={16} />} onClick={() => setIsImportModalOpen(true)}>
              Import
            </Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={handleCreateClick}>
              Add Case
            </Button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedCount > 0 && (
          <div className="px-8 py-3 bg-indigo-50 border-b border-indigo-200 flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <CheckSquare size={18} className="text-indigo-600" />
              <span className="font-semibold text-indigo-900 text-sm">
                {selectedCount} test case{selectedCount > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="h-5 w-px bg-indigo-200"></div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" icon={<Edit size={14} />} onClick={handleBulkEdit}>
                Edit
              </Button>
              <Button size="sm" variant="outline" icon={<FolderInput size={14} />} onClick={handleBulkMove}>
                Move
              </Button>
              <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={handleBulkDelete}>
                Delete
              </Button>
            </div>
            <button
              onClick={handleClearSelection}
              className="ml-auto text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <X size={14} />
              Clear selection
            </button>
          </div>
        )}

        {/* Section-based Content */}
        <div className="flex-1 overflow-auto p-8 bg-slate-50/50">
          {isLoading ? (
            <div className="flex justify-center items-center h-64 text-slate-500">Loading...</div>
          ) : sections.length === 0 || totalCases === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-sm">
              <FileText size={48} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900">No test cases found</h3>
              <p className="text-slate-500 mt-2">Select a folder or create a new test case to get started.</p>
              <div className="mt-6">
                <Button onClick={handleCreateClick} icon={<Plus size={16} />}>
                  Create First Case
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section) => {
                const sectionTestCases = getSortedTestCases(section);
                if (sectionTestCases.length === 0) return null;

                const isExpanded = expandedSections.has(section.id);
                // 하위 폴더 포함하여 전체 선택 여부 확인
                const isAllSelected = isSectionFullySelected(section.id);
                const sortState = sectionSortState[section.id] || { field: null, direction: 'asc' };

                return (
                  <div
                    key={section.id}
                    className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
                    style={{ marginLeft: `${section.depth * 16}px` }}
                  >
                    {/* Section Header */}
                    <SectionHeader
                      section={section}
                      count={sectionTestCases.length}
                      isExpanded={isExpanded}
                      onToggle={() => handleToggleSection(section.id)}
                      isAllSelected={isAllSelected}
                      onSelectAll={() => handleSelectAllInSection(section.id)}
                    />

                    {/* Section Table */}
                    {isExpanded && (
                      <table className="min-w-full">
                        <thead>
                          <SectionTableHeader sectionId={section.id} sortState={sortState} onSort={handleSortSection} />
                        </thead>
                        <tbody>
                          {sectionTestCases.map((tc) => (
                            <TestCaseRow
                              key={tc.id}
                              testCase={tc}
                              isSelected={selectedIds.has(tc.id)}
                              isDetailOpen={selectedTestCase?.id === tc.id && isDetailPanelOpen}
                              onToggleSelect={handleToggleSelect}
                              onOpenDetail={handleOpenDetail}
                            />
                          ))}
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

      {/* Detail Panel */}
      <TestCaseDetailPanel
        testCase={selectedTestCase}
        isOpen={isDetailPanelOpen}
        folders={folders}
        onClose={handleCloseDetail}
        onEdit={handleEditFromPanel}
        onDelete={handleDeleteFromPanel}
        onUpdate={handleUpdateFromPanel}
      />

      {/* Modals */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentFolderId={selectedFolderId}
        onSuccess={handleSuccess}
      />

      <TestCaseFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        folderId={selectedFolderId}
        onSuccess={handleSuccess}
        initialData={editingTestCase}
      />

      {testCaseToDelete && (
        <ConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Test Case"
          message={`Are you sure you want to delete "${testCaseToDelete.title}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
        />
      )}

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        selectedCount={selectedCount}
        availableCategories={availableCategories}
        folders={folders}
        onClose={() => setIsBulkEditModalOpen(false)}
        onApply={handleBulkEditApply}
      />

      {/* Bulk Move Modal */}
      <BulkMoveModal
        isOpen={isBulkMoveModalOpen}
        selectedCount={selectedCount}
        folders={folders}
        onClose={() => setIsBulkMoveModalOpen(false)}
        onMove={handleBulkMoveConfirm}
      />

      {/* Bulk Delete Confirm Modal */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="일괄 삭제"
        message={`정말 ${selectedCount}개 테스트 케이스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        variant="danger"
      />

      <InputModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onConfirm={handleCreateFolder}
        title="새 폴더 만들기"
        placeholder="폴더 이름을 입력하세요"
        confirmText="만들기"
        cancelText="취소"
      />

      <InputModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        onConfirm={handleConfirmRename}
        title="폴더 이름 변경"
        placeholder="새 폴더 이름을 입력하세요"
        confirmText="변경"
        cancelText="취소"
        initialValue={renamingFolderName}
      />

      {/* Folder Delete Confirm Modal */}
      {folderToDelete && (
        <ConfirmModal
          isOpen={isFolderDeleteModalOpen}
          onClose={() => {
            setIsFolderDeleteModalOpen(false);
            setFolderToDelete(null);
          }}
          onConfirm={handleConfirmDeleteFolder}
          title="폴더 삭제"
          message={`"${folderToDelete.name}" 폴더를 삭제하시겠습니까? 하위 폴더와 모든 테스트 케이스가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmText="삭제"
          variant="danger"
        />
      )}

      {/* Folder Bulk Delete Confirm Modal */}
      <ConfirmModal
        isOpen={isFolderBulkDeleteModalOpen}
        onClose={() => setIsFolderBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDeleteFolders}
        title="폴더 일괄 삭제"
        message={`${selectedFolderIds.size}개의 폴더를 삭제하시겠습니까? 하위 폴더와 모든 테스트 케이스가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        variant="danger"
      />
    </div>
  );
};

export default TestCasesPage;
