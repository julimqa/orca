import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getPlanDetail,
  getPlans,
  PlanDetail,
  Plan,
  PlanItem,
  updatePlanItem,
  bulkUpdatePlanItems,
  TestResult,
  archivePlan,
  unarchivePlan,
  deletePlan,
} from '../api/plan';
import { getAllUsers } from '../api/admin';
import { User } from '../api/types';
import {
  ArrowLeft,
  MessageSquare,
  CheckSquare,
  Square,
  Archive,
  ArchiveRestore,
  Trash2,
  ChevronDown,
  Search,
  ChevronRight,
  Folder,
  FolderOpen,
  X,
  PanelRightOpen,
  Edit,
  Bug,
} from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { TableSelect } from '../components/ui/TableSelect';
import { TestCaseDetailColumn } from '../components/TestCaseDetailColumn';
import { PlanEditModal } from '../components/PlanEditModal';

// Jira 링크 파싱 유틸리티
interface JiraLink {
  ticketId: string;
  url: string;
}

const parseJiraLinks = (defects: string | undefined): JiraLink[] => {
  if (!defects) return [];

  const links: JiraLink[] = [];
  const urlPattern = /https?:\/\/[^\s,]+/g;
  const matches = defects.match(urlPattern) || [];

  matches.forEach((url) => {
    const ticketMatch = url.match(/\/browse\/([A-Z]+-\d+)/i);
    if (ticketMatch) {
      links.push({
        ticketId: ticketMatch[1].toUpperCase(),
        url: url.trim(),
      });
    }
  });

  return links;
};

// Defects 링크 표시 컴포넌트 (테이블용 - 컴팩트)
const DefectsCell: React.FC<{ defects: string | undefined }> = ({ defects }) => {
  const links = parseJiraLinks(defects);

  if (links.length === 0) {
    return <span className="text-[9px] text-slate-400">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-0.5">
      {links.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 text-red-700 text-[9px] font-medium rounded hover:bg-red-100 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Bug size={10} />
          {link.ticketId}
        </a>
      ))}
    </div>
  );
};

// Pie Chart Component (TestRail style)
interface PieChartProps {
  data: { color: string; value: number; label: string }[];
  size?: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, size = 160 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div style={{ width: size, height: size }} className="rounded-full bg-slate-200 flex items-center justify-center">
        <span className="text-slate-400 text-xs">No Data</span>
      </div>
    );
  }

  let currentAngle = -90; // Start from top
  const segments = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    // Calculate path
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;
    const center = size / 2;
    const radius = size / 2 - 2;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    if (d.value === 0) return null;

    // For full circle (100%)
    if (angle >= 359.99) {
      return <circle key={i} cx={center} cy={center} r={radius} fill={d.color} />;
    }

    return (
      <path
        key={i}
        d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={d.color}
      />
    );
  });

  return (
    <svg width={size} height={size} className="transform">
      {segments}
    </svg>
  );
};

// Status Legend Item (TestRail style)
interface StatusLegendProps {
  color: string;
  label: string;
  count: number;
  percentage: string;
}

const StatusLegend: React.FC<StatusLegendProps> = ({ color, label, count, percentage }) => (
  <div className="flex items-center gap-2 py-1">
    <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color }}></div>
    <span className="text-sm font-semibold text-slate-800">
      {count} {label}
    </span>
    <span className="text-xs text-slate-400">
      {percentage} set to {label}
    </span>
  </div>
);

// Folder Tree Node
interface FolderNode {
  id: string;
  name: string;
  count: number;
  parentId: string | null;
  children: FolderNode[];
}

interface FolderTreeItemProps {
  node: FolderNode;
  level: number;
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onSelectFolder: (folderId: string | null) => void;
  onToggleExpand: (folderId: string) => void;
}

const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  node,
  level,
  selectedFolderId,
  expandedFolders,
  onSelectFolder,
  onToggleExpand,
}) => {
  const isExpanded = expandedFolders.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedFolderId === node.id;

  return (
    <div>
      <button
        onClick={() => onSelectFolder(node.id)}
        className={`w-full text-left text-sm flex items-center gap-1.5 py-1.5 px-2 transition-colors rounded-md mx-1 ${
          isSelected ? 'bg-amber-100 text-amber-800' : 'hover:bg-slate-100 text-slate-700'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className="p-0.5 hover:bg-slate-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown size={12} className="text-slate-400" />
            ) : (
              <ChevronRight size={12} className="text-slate-400" />
            )}
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        <Folder size={14} className={isSelected ? 'text-amber-600' : 'text-amber-500'} />
        <span className="flex-1 truncate text-xs">{node.name}</span>
        <span className="text-[10px] text-slate-400">{node.count}</span>
      </button>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onSelectFolder={onSelectFolder}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Folder Tree Panel
interface FolderTreePanelProps {
  folderTree: FolderNode[];
  totalCount: number;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onClose: () => void;
}

const FolderTreePanel: React.FC<FolderTreePanelProps> = ({
  folderTree,
  totalCount,
  selectedFolderId,
  onSelectFolder,
  onClose,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Auto-expand all folders on mount
  useEffect(() => {
    const allIds = new Set<string>();
    const collectIds = (nodes: FolderNode[]) => {
      nodes.forEach((n) => {
        allIds.add(n.id);
        collectIds(n.children);
      });
    };
    collectIds(folderTree);
    setExpandedFolders(allIds);
  }, [folderTree]);

  const handleToggleExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  return (
    <div className="w-[280px] h-full bg-white border-r border-slate-200 flex-shrink-0 flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">📋</span>
          <span className="text-xs font-medium text-slate-600">All</span>
          <ChevronDown size={12} className="text-slate-400" />
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded transition-colors" title="닫기">
          <X size={14} className="text-slate-400" />
        </button>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* All */}
        <button
          onClick={() => onSelectFolder(null)}
          className={`w-full text-left text-sm flex items-center gap-1.5 py-1.5 px-3 transition-colors rounded-md mx-1 ${
            selectedFolderId === null ? 'bg-amber-100 text-amber-800' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <FolderOpen size={14} className={selectedFolderId === null ? 'text-amber-600' : 'text-amber-500'} />
          <span className="flex-1 text-xs font-medium">전체</span>
          <span className="text-[10px] text-slate-400">{totalCount}</span>
        </button>

        {/* Tree Items */}
        {folderTree.map((node) => (
          <FolderTreeItem
            key={node.id}
            node={node}
            level={0}
            selectedFolderId={selectedFolderId}
            expandedFolders={expandedFolders}
            onSelectFolder={onSelectFolder}
            onToggleExpand={handleToggleExpand}
          />
        ))}

        {folderTree.length === 0 && <div className="px-4 py-8 text-center text-xs text-slate-400">폴더가 없습니다</div>}
      </div>
    </div>
  );
};

const PlanDetailPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRunDropdownOpen, setIsRunDropdownOpen] = useState(false);

  // Selected Item for Detail Panel
  const [selectedItem, setSelectedItem] = useState<PlanItem | null>(null);

  // Folder Panel State
  const [showFolderPanel, setShowFolderPanel] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Bulk Update State
  const [bulkResult, setBulkResult] = useState<TestResult | ''>('');
  const [bulkAssignee, setBulkAssignee] = useState<string>('');

  // Archive/Delete Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (planId) {
      loadPlanDetail(planId);
    }
    loadUsers();
    loadAllPlans();
  }, [planId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (isRunDropdownOpen) {
        setIsRunDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isRunDropdownOpen]);

  const loadUsers = async () => {
    try {
      const response = await getAllUsers();
      if (response.success) {
        setUsers(response.users.filter((u) => u.status === 'ACTIVE'));
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load users', error);
      }
    }
  };

  const loadAllPlans = async () => {
    try {
      const response = await getPlans('ALL');
      if (response.success) {
        setAllPlans(response.data);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load plans', error);
      }
    }
  };

  const loadPlanDetail = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await getPlanDetail(id);
      if (response.success) {
        setPlan(response.data);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load plan detail', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (!plan) return;
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((i) => i.id)));
    }
  };

  // 행 클릭 핸들러: 디테일 패널 표시
  const handleRowClick = (item: PlanItem) => {
    setSelectedItem(item);
  };

  // 디테일 패널에서 업데이트 → API 호출 → 테이블 즉시 반영
  const handleDetailUpdate = async (
    itemId: string,
    updates: { result?: TestResult; assignee?: string; comment?: string; defects?: string }
  ) => {
    if (!planId) return;

    try {
      await updatePlanItem(planId, itemId, updates);
      // 로컬 상태 업데이트 (테이블 즉시 반영)
      setPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  ...updates,
                  executedAt: new Date().toISOString(),
                }
              : item
          ),
        };
      });
      // 선택된 아이템도 업데이트
      setSelectedItem((prev) => {
        if (!prev || prev.id !== itemId) return prev;
        return { ...prev, ...updates, executedAt: new Date().toISOString() };
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to update plan item', error);
      }
      alert('업데이트에 실패했습니다.');
    }
  };

  const handleResultChange = async (itemId: string, newResult: TestResult) => {
    await handleDetailUpdate(itemId, { result: newResult });
  };

  const handleAssigneeChange = async (itemId: string, newAssignee: string) => {
    await handleDetailUpdate(itemId, { assignee: newAssignee || undefined });
  };

  const handleBulkUpdate = async () => {
    if (!planId || selectedItems.size === 0) return;
    if (!bulkResult && !bulkAssignee) {
      alert('적용할 상태 또는 담당자를 선택해주세요.');
      return;
    }

    const updates: any = { items: Array.from(selectedItems) };
    if (bulkResult) updates.result = bulkResult;
    if (bulkAssignee) updates.assignee = bulkAssignee;

    try {
      await bulkUpdatePlanItems(planId, updates);
      setSelectedItems(new Set());
      setBulkResult('');
      setBulkAssignee('');
      loadPlanDetail(planId);
    } catch {
      alert('일괄 업데이트에 실패했습니다.');
    }
  };

  const handleArchive = async () => {
    if (!planId) return;
    try {
      setIsProcessing(true);
      await archivePlan(planId);
      setIsArchiveModalOpen(false);
      loadPlanDetail(planId);
    } catch {
      alert('아카이브에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (!planId) return;
    try {
      setIsProcessing(true);
      await unarchivePlan(planId);
      setIsRestoreModalOpen(false);
      loadPlanDetail(planId);
    } catch {
      alert('복원에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!planId) return;
    try {
      setIsProcessing(true);
      await deletePlan(planId);
      navigate('/plans');
    } catch {
      alert('삭제에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract folder information from plan items and build tree
  const { folderTree, totalFolderCount } = useMemo(() => {
    if (!plan) return { folderTree: [], totalFolderCount: 0 };

    const folderMap = new Map<
      string,
      {
        name: string;
        count: number;
        parentId: string | null;
      }
    >();

    plan.items.forEach((item) => {
      const folderId = item.testCase.folderId;
      const folder = item.testCase.folder;

      if (folderId && folder) {
        if (folderMap.has(folderId)) {
          folderMap.get(folderId)!.count++;
        } else {
          folderMap.set(folderId, {
            name: folder.name,
            count: 1,
            parentId: folder.parentId || null,
          });
        }
      } else {
        // 미분류 케이스
        if (folderMap.has('uncategorized')) {
          folderMap.get('uncategorized')!.count++;
        } else {
          folderMap.set('uncategorized', { name: '미분류', count: 1, parentId: null });
        }
      }
    });

    // Convert to array and build tree
    const folders = Array.from(folderMap.entries()).map(([id, info]) => ({
      id,
      name: info.name,
      count: info.count,
      parentId: info.parentId,
      children: [] as FolderNode[],
    }));

    // Build tree structure
    const folderById = new Map(folders.map((f) => [f.id, f]));
    const roots: FolderNode[] = [];

    folders.forEach((folder) => {
      if (folder.parentId && folderById.has(folder.parentId)) {
        folderById.get(folder.parentId)!.children.push(folder);
      } else {
        roots.push(folder);
      }
    });

    // Sort children
    const sortFolders = (nodes: FolderNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach((n) => sortFolders(n.children));
    };
    sortFolders(roots);

    return {
      folderTree: roots,
      totalFolderCount: plan.items.length,
    };
  }, [plan]);

  // Filter items by search query and folder
  const filteredItems = useMemo(() => {
    if (!plan) return [];

    let items = plan.items;

    // Filter by folder
    if (selectedFolderId !== null) {
      if (selectedFolderId === 'uncategorized') {
        items = items.filter((item) => !item.testCase.folderId);
      } else {
        items = items.filter((item) => item.testCase.folderId === selectedFolderId);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) => {
        const caseId = item.testCase.caseNumber
          ? `OVDR${String(item.testCase.caseNumber).padStart(4, '0')}`
          : item.testCaseId.substring(0, 8).toUpperCase();
        return item.testCase.title.toLowerCase().includes(query) || caseId.toLowerCase().includes(query);
      });
    }

    return items;
  }, [plan, searchQuery, selectedFolderId]);

  if (isLoading && !plan)
    return <div className="flex justify-center items-center h-screen text-slate-500">로딩 중...</div>;
  if (!plan)
    return <div className="flex justify-center items-center h-screen text-slate-500">플랜을 찾을 수 없습니다.</div>;

  const totalItems = plan.items.length;
  const selectedCount = selectedItems.size;
  const passCount = plan.items.filter((i) => i.result === 'PASS').length;
  const failCount = plan.items.filter((i) => i.result === 'FAIL').length;
  const blockCount = plan.items.filter((i) => i.result === 'BLOCK').length;
  const inProgressCount = plan.items.filter((i) => i.result === 'IN_PROGRESS').length;
  const notRunCount = plan.items.filter((i) => i.result === 'NOT_RUN').length;
  const completedCount = totalItems - notRunCount;
  const progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const getPercentage = (count: number) => (totalItems > 0 ? Math.round((count / totalItems) * 100) : 0);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Fixed Summary Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
        {/* Top Bar with Navigation */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/plans')}
              className="flex items-center text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium"
            >
              <ArrowLeft size={16} className="mr-1.5" /> 플랜 목록
            </button>

            {/* Run Selector Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRunDropdownOpen(!isRunDropdownOpen);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-medium text-slate-700 transition-colors"
              >
                다른 플랜 선택
                <ChevronDown size={14} className={`transition-transform ${isRunDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isRunDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 max-h-64 overflow-y-auto">
                  {allPlans.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        navigate(`/plans/${p.id}`);
                        setIsRunDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between ${
                        p.id === planId ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <Badge variant={p.status === 'ACTIVE' ? 'success' : 'neutral'}>{p.stats?.progress || 0}%</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - 3 Column Layout */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Folder Panel */}
        {showFolderPanel && (
          <FolderTreePanel
            folderTree={folderTree}
            totalCount={totalFolderCount}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onClose={() => setShowFolderPanel(false)}
          />
        )}

        {/* Center Column: Summary + Table */}
        <div className="flex-[0.7] min-w-[550px] flex flex-col overflow-hidden bg-white border-r border-slate-200">
          {/* Summary Section */}
          <div className="flex-shrink-0 border-b border-slate-200 p-4 bg-white">
            {/* Title Row with Action Buttons */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="info" className="text-xs px-2 py-0.5">
                  R{planId?.substring(0, 4).toUpperCase()}
                </Badge>
                <h1 className="text-base font-bold text-slate-900">{plan.name}</h1>
                <Badge variant={plan.status === 'ACTIVE' ? 'success' : 'neutral'}>
                  {plan.status === 'ACTIVE' ? '활성' : '아카이브'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" icon={<Edit size={14} />} onClick={() => setIsEditModalOpen(true)}>
                  수정
                </Button>
                {plan.status === 'ACTIVE' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Archive size={14} />}
                    onClick={() => setIsArchiveModalOpen(true)}
                  >
                    아카이브
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ArchiveRestore size={14} />}
                    onClick={() => setIsRestoreModalOpen(true)}
                  >
                    복원
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  삭제
                </Button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-4 items-start">
              {/* Pie Chart */}
              <div className="flex-shrink-0">
                <PieChart
                  size={100}
                  data={[
                    { color: '#10b981', value: passCount, label: 'Passed' },
                    { color: '#64748b', value: blockCount, label: 'Blocked' },
                    { color: '#f59e0b', value: inProgressCount, label: 'Retest' },
                    { color: '#ef4444', value: failCount, label: 'Failed' },
                    { color: '#e2e8f0', value: notRunCount, label: 'Untested' },
                  ]}
                />
              </div>

              {/* Status Legend */}
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  <StatusLegend
                    color="#10b981"
                    label="Passed"
                    count={passCount}
                    percentage={`${getPercentage(passCount)}%`}
                  />
                  <StatusLegend
                    color="#64748b"
                    label="Blocked"
                    count={blockCount}
                    percentage={`${getPercentage(blockCount)}%`}
                  />
                  <StatusLegend
                    color="#f59e0b"
                    label="Progress"
                    count={inProgressCount}
                    percentage={`${getPercentage(inProgressCount)}%`}
                  />
                  <StatusLegend
                    color="#ef4444"
                    label="Failed"
                    count={failCount}
                    percentage={`${getPercentage(failCount)}%`}
                  />
                </div>
              </div>

              {/* Progress & Meta */}
              <div className="flex-shrink-0 text-right border-l border-slate-200 pl-4">
                <div className="text-3xl font-bold text-indigo-600">{progress}%</div>
                <div className="text-xs text-slate-500">passed</div>
                <div className="text-xs text-slate-400 mt-1">
                  {notRunCount}/{totalItems} untested
                </div>
                <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-100 pt-1">
                  by <span className="text-indigo-500">{plan.createdBy}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table Header Bar */}
          <div className="flex-shrink-0 bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Folder Toggle Button */}
              {!showFolderPanel && (
                <button
                  onClick={() => setShowFolderPanel(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors text-amber-700"
                  title="폴더 패널 열기"
                >
                  <PanelRightOpen size={14} className="rotate-180" />
                  <span className="text-xs font-medium">폴더</span>
                </button>
              )}

              <span className="text-sm font-medium text-slate-700">
                {filteredItems.length} / {totalItems} 케이스
              </span>

              {/* Bulk Action Bar */}
              {selectedCount > 0 && (
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={16} className="text-indigo-600" />
                    <span className="text-sm font-medium text-indigo-700">{selectedCount}개 선택</span>
                  </div>
                  <select
                    value={bulkResult}
                    onChange={(e) => setBulkResult(e.target.value as TestResult)}
                    className="border-slate-300 rounded-md text-xs py-1 pl-2 pr-6 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    data-testid="plan-bulk-result"
                  >
                    <option value="">상태 변경...</option>
                    <option value="NOT_RUN">NOT STARTED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                    <option value="BLOCK">BLOCKED</option>
                  </select>
                  <select
                    value={bulkAssignee}
                    onChange={(e) => setBulkAssignee(e.target.value)}
                    className="border-slate-300 rounded-md text-xs py-1 pl-2 pr-6 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="">담당자 변경...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.name}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleBulkUpdate}
                    disabled={!bulkResult && !bulkAssignee}
                    size="sm"
                    data-testid="plan-bulk-apply"
                  >
                    적용
                  </Button>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색..."
                className="pl-9 pr-4 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 w-48"
              />
            </div>
          </div>

          {/* Table Content - No padding for full height */}
          <div className="flex-1 overflow-auto">
            <table className="table-fixed w-full bg-white">
              <colgroup>
                <col className="w-10" />
                <col className="w-16" />
                <col />
                <col className="w-[80px]" />
                <col className="w-[80px]" />
                <col className="w-[88px]" />
                <col className="w-[88px]" />
                <col className="w-[100px]" />
                <col className="w-[80px]" />
              </colgroup>
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-center align-middle">
                    <button
                      onClick={handleSelectAll}
                      className="text-slate-500 hover:text-slate-700 focus:outline-none transition-colors"
                      title={selectedItems.size === filteredItems.length ? '전체 해제' : '전체 선택'}
                    >
                      {selectedItems.size > 0 && selectedItems.size === filteredItems.length ? (
                        <CheckSquare size={16} className="text-indigo-600" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider align-middle">
                    ID
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider align-middle">
                    Title
                  </th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider align-middle">
                    Priority
                  </th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider align-middle">
                    Type
                  </th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider align-middle">
                    Category
                  </th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider align-middle">
                    Assignee
                  </th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider align-middle">
                    Result
                  </th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider align-middle">
                    Defects
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                      selectedItem?.id === item.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                    } ${selectedItems.has(item.id) ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="px-2 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => handleToggleSelect(item.id)}
                        className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-500 font-mono align-middle truncate">
                      {item.testCase.caseNumber
                        ? `C${item.testCase.caseNumber}`
                        : item.testCaseId.substring(0, 6).toUpperCase()}
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-slate-900 flex-1 truncate">
                          {item.testCase.title}
                        </span>
                        {item.comment && <MessageSquare size={12} className="text-indigo-500 flex-shrink-0" />}
                        <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center align-middle">
                      <div className="flex items-center justify-center">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                            item.testCase.priority === 'HIGH'
                              ? 'bg-red-100 text-red-700'
                              : item.testCase.priority === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {item.testCase.priority}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center align-middle">
                      <div className="flex items-center justify-center">
                        <span
                          className={`text-[9px] font-medium px-2 py-0.5 rounded ${
                            item.testCase.automationType === 'AUTOMATED'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.testCase.automationType === 'AUTOMATED' ? 'Auto' : 'Manual'}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center align-middle">
                      <div className="flex items-center justify-center">
                        {item.testCase.category ? (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 truncate max-w-full">
                            {item.testCase.category}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                      <TableSelect
                        value={item.assignee || ''}
                        onChange={(val) => handleAssigneeChange(item.id, val)}
                        placeholder="-"
                        options={[
                          { value: '', label: '-' },
                          ...users.map((user) => ({ value: user.name, label: user.name })),
                        ]}
                      />
                    </td>
                    <td className="px-2 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                      <TableSelect
                        value={item.result}
                        onChange={(val) => handleResultChange(item.id, val as TestResult)}
                        variant="status"
                        statusColors={{
                          NOT_RUN: 'bg-slate-300 text-slate-700',
                          IN_PROGRESS: 'bg-amber-500 text-white',
                          PASS: 'bg-emerald-500 text-white',
                          FAIL: 'bg-red-500 text-white',
                          BLOCK: 'bg-slate-600 text-white',
                        }}
                        options={[
                          { value: 'NOT_RUN', label: 'NOT RUN' },
                          { value: 'IN_PROGRESS', label: 'PROGRESS' },
                          { value: 'PASS', label: 'PASS' },
                          { value: 'FAIL', label: 'FAIL' },
                          { value: 'BLOCK', label: 'BLOCK' },
                        ]}
                      />
                    </td>
                    <td className="px-2 py-2 text-center align-middle">
                      <DefectsCell defects={item.defects} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredItems.length === 0 && (
              <div className="py-12 text-center text-slate-500 bg-white">
                {searchQuery || selectedFolderId ? '검색 결과가 없습니다.' : '테스트 케이스가 없습니다.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Panel - Full height, always visible */}
        <div className="flex-[0.3] min-w-[320px] h-full bg-white">
          {selectedItem ? (
            <TestCaseDetailColumn
              planItem={selectedItem}
              users={users}
              onClose={() => setSelectedItem(null)}
              onUpdate={handleDetailUpdate}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ChevronRight size={48} className="mb-2 opacity-30" />
              <p className="text-sm">테스트 케이스를 선택하세요</p>
              <p className="text-xs mt-1">좌측 목록에서 케이스를 클릭하면</p>
              <p className="text-xs">상세 정보가 여기에 표시됩니다</p>
            </div>
          )}
        </div>
      </div>

      {/* Archive Confirm Modal */}
      <ConfirmModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onConfirm={handleArchive}
        title="플랜 아카이브"
        message={`"${plan.name}" 플랜을 아카이브하시겠습니까? 아카이브된 플랜은 목록에서 숨겨지지만 언제든 복원할 수 있습니다.`}
        confirmText={isProcessing ? '처리 중...' : '아카이브'}
        variant="warning"
      />

      {/* Restore Confirm Modal */}
      <ConfirmModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        onConfirm={handleRestore}
        title="플랜 복원"
        message={`"${plan.name}" 플랜을 복원하시겠습니까? 복원된 플랜은 활성 목록에 다시 표시됩니다.`}
        confirmText={isProcessing ? '처리 중...' : '복원'}
        variant="info"
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="플랜 삭제"
        message={`"${plan.name}" 플랜을 삭제하시겠습니까? 모든 테스트 실행 기록이 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.`}
        confirmText={isProcessing ? '처리 중...' : '삭제'}
        variant="danger"
      />

      {/* Edit Plan Modal */}
      <PlanEditModal
        isOpen={isEditModalOpen}
        plan={plan}
        onClose={() => setIsEditModalOpen(false)}
        onSaved={() => {
          setIsEditModalOpen(false);
          if (planId) {
            loadPlanDetail(planId);
          }
        }}
      />
    </div>
  );
};

export default PlanDetailPage;
