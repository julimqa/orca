import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlans, bulkArchivePlans, bulkUnarchivePlans, bulkDeletePlans, Plan, PlanStatusFilter } from '../api/plan';
import { Plus, PlayCircle, FileText, ChevronLeft, ChevronRight, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ConfirmModal } from '../components/ui/ConfirmModal';

type FilterOption = { value: PlanStatusFilter; label: string };

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: '전체' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'ARCHIVED', label: '아카이브' },
];

const ITEMS_PER_PAGE = 10;

const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PlanStatusFilter>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 페이지네이션 상태
  const [activePage, setActivePage] = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);

  // Bulk 액션 모달 상태
  const [bulkArchiveModal, setBulkArchiveModal] = useState(false);
  const [bulkUnarchiveModal, setBulkUnarchiveModal] = useState(false);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);

  const navigate = useNavigate();

  const loadPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getPlans(statusFilter);
      if (response.success) {
        setPlans(response.data);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load plans', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // 필터 변경 시 선택 및 페이지 초기화
  useEffect(() => {
    setSelectedIds(new Set());
    setActivePage(1);
    setArchivedPage(1);
  }, [statusFilter]);

  // 플랜 분류
  const activePlans = useMemo(() => plans.filter((p) => p.status === 'ACTIVE'), [plans]);
  const archivedPlans = useMemo(() => plans.filter((p) => p.status === 'ARCHIVED'), [plans]);

  // 페이지네이션 계산
  const paginatedActivePlans = useMemo(() => {
    const start = (activePage - 1) * ITEMS_PER_PAGE;
    return activePlans.slice(start, start + ITEMS_PER_PAGE);
  }, [activePlans, activePage]);

  const paginatedArchivedPlans = useMemo(() => {
    const start = (archivedPage - 1) * ITEMS_PER_PAGE;
    return archivedPlans.slice(start, start + ITEMS_PER_PAGE);
  }, [archivedPlans, archivedPage]);

  const totalActivePages = Math.ceil(activePlans.length / ITEMS_PER_PAGE);
  const totalArchivedPages = Math.ceil(archivedPlans.length / ITEMS_PER_PAGE);

  // 선택된 플랜들의 상태 분석
  const selectedPlans = plans.filter((p) => selectedIds.has(p.id));
  const hasActiveSelected = selectedPlans.some((p) => p.status === 'ACTIVE');
  const hasArchivedSelected = selectedPlans.some((p) => p.status === 'ARCHIVED');

  // 체크박스 핸들러
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>, sectionPlans: Plan[]) => {
    e.stopPropagation();
    const sectionIds = sectionPlans.map((p) => p.id);
    if (e.target.checked) {
      setSelectedIds((prev) => new Set([...prev, ...sectionIds]));
    } else {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        sectionIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }
  };

  const handleSelectOne = (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(planId)) {
      newSelected.delete(planId);
    } else {
      newSelected.add(planId);
    }
    setSelectedIds(newSelected);
  };

  // Bulk 액션 핸들러
  const handleBulkArchive = async () => {
    const activeIds = selectedPlans.filter((p) => p.status === 'ACTIVE').map((p) => p.id);
    if (activeIds.length === 0) return;

    try {
      const response = await bulkArchivePlans(activeIds);
      if (response.success) {
        setSelectedIds(new Set());
        loadPlans();
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to bulk archive plans', error);
      }
    }
    setBulkArchiveModal(false);
  };

  const handleBulkUnarchive = async () => {
    const archivedIds = selectedPlans.filter((p) => p.status === 'ARCHIVED').map((p) => p.id);
    if (archivedIds.length === 0) return;

    try {
      const response = await bulkUnarchivePlans(archivedIds);
      if (response.success) {
        setSelectedIds(new Set());
        loadPlans();
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to bulk unarchive plans', error);
      }
    }
    setBulkUnarchiveModal(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      const response = await bulkDeletePlans(Array.from(selectedIds));
      if (response.success) {
        setSelectedIds(new Set());
        loadPlans();
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to bulk delete plans', error);
      }
    }
    setBulkDeleteModal(false);
  };

  const getEmptyMessage = () => {
    switch (statusFilter) {
      case 'ARCHIVED':
        return { title: '아카이브된 플랜이 없습니다', description: '아카이브된 플랜이 여기에 표시됩니다.' };
      case 'ALL':
        return { title: '테스트 플랜이 없습니다', description: '테스트 플랜을 생성하여 테스트 실행을 시작하세요.' };
      default:
        return { title: '활성 플랜이 없습니다', description: '테스트 플랜을 생성하여 테스트 실행을 시작하세요.' };
    }
  };

  // 페이지네이션 컴포넌트
  const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 py-3 px-4 border-t border-slate-200 bg-slate-50">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                currentPage === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} className="text-slate-600" />
        </button>
      </div>
    );
  };

  // 플랜 테이블 렌더링
  const renderPlanTable = (sectionPlans: Plan[], _allSectionPlans: Plan[]) => {
    const allSelected = sectionPlans.length > 0 && sectionPlans.every((p) => selectedIds.has(p.id));
    const someSelected = sectionPlans.some((p) => selectedIds.has(p.id));

    return (
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left w-10">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = someSelected && !allSelected;
                  }
                }}
                onChange={(e) => handleSelectAll(e, sectionPlans)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-2/5">
              이름
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              진행률
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">통계</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              생성일
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">
              상태
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {sectionPlans.map((plan) => (
            <tr
              key={plan.id}
              className={`hover:bg-slate-50 transition-colors cursor-pointer group ${selectedIds.has(plan.id) ? 'bg-indigo-50' : ''}`}
              onClick={() => navigate(`/plans/${plan.id}`)}
            >
              <td className="px-4 py-4" onClick={(e) => handleSelectOne(e, plan.id)}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(plan.id)}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </td>
              <td className="px-4 py-4">
                <div className="flex items-start">
                  <FileText
                    className={`mt-0.5 mr-3 flex-shrink-0 h-5 w-5 ${plan.status === 'ARCHIVED' ? 'text-slate-400' : 'text-indigo-600'}`}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-sm font-medium group-hover:text-indigo-600 ${plan.status === 'ARCHIVED' ? 'text-slate-500' : 'text-slate-900'}`}
                      >
                        {plan.name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-1">{plan.description || '설명 없음'}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 align-middle">
                <div className="w-full max-w-xs">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{plan.stats?.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        (plan.stats?.progress || 0) === 100
                          ? 'bg-emerald-500'
                          : plan.status === 'ARCHIVED'
                            ? 'bg-slate-400'
                            : 'bg-indigo-600'
                      }`}
                      style={{ width: `${plan.stats?.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1" title="통과">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="font-medium">{plan.stats?.pass}</span>
                  </div>
                  <div className="flex items-center gap-1" title="실패">
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                    <span className="font-medium">{plan.stats?.fail}</span>
                  </div>
                  <div className="flex items-center gap-1" title="미실행">
                    <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                    <span className="font-medium">{plan.stats?.notRun}</span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                <div className="flex flex-col">
                  <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                  <span className="text-xs text-slate-400">{plan.createdBy}</span>
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <Badge variant={plan.status === 'ACTIVE' ? 'success' : 'secondary'} size="sm">
                  {plan.status === 'ACTIVE' ? '활성' : '아카이브'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // All Plans 뷰 - 섹션 분리
  const renderAllPlansView = () => {
    if (plans.length === 0) {
      return (
        <Card className="p-12 text-center">
          <PlayCircle size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-900">{getEmptyMessage().title}</h3>
          <p className="text-slate-500 mt-2">{getEmptyMessage().description}</p>
          <div className="mt-6">
            <Button onClick={() => navigate('/plans/create')} icon={<Plus size={16} />}>
              플랜 생성
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Active Plans Section */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-lg font-semibold text-slate-900">활성 플랜</h2>
            <Badge variant="primary" size="sm">
              {activePlans.length}
            </Badge>
          </div>
          {activePlans.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-500">활성 플랜이 없습니다</p>
            </Card>
          ) : (
            <Card noPadding>
              {renderPlanTable(paginatedActivePlans, activePlans)}
              <Pagination currentPage={activePage} totalPages={totalActivePages} onPageChange={setActivePage} />
            </Card>
          )}
        </div>

        {/* Archived Plans Section */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-lg font-semibold text-slate-500">아카이브된 플랜</h2>
            <Badge variant="secondary" size="sm">
              {archivedPlans.length}
            </Badge>
          </div>
          {archivedPlans.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-500">아카이브된 플랜이 없습니다</p>
            </Card>
          ) : (
            <Card noPadding>
              {renderPlanTable(paginatedArchivedPlans, archivedPlans)}
              <Pagination currentPage={archivedPage} totalPages={totalArchivedPages} onPageChange={setArchivedPage} />
            </Card>
          )}
        </div>
      </div>
    );
  };

  // Single Section 뷰 (Active Only 또는 Archived Only)
  const renderSingleSectionView = () => {
    const currentPlans = statusFilter === 'ACTIVE' ? activePlans : archivedPlans;
    const currentPage = statusFilter === 'ACTIVE' ? activePage : archivedPage;
    const setCurrentPage = statusFilter === 'ACTIVE' ? setActivePage : setArchivedPage;
    const totalPages = Math.ceil(currentPlans.length / ITEMS_PER_PAGE);
    const paginatedPlans = currentPlans.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    if (currentPlans.length === 0) {
      return (
        <Card className="p-12 text-center">
          <PlayCircle size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-900">{getEmptyMessage().title}</h3>
          <p className="text-slate-500 mt-2">{getEmptyMessage().description}</p>
          {statusFilter !== 'ARCHIVED' && (
            <div className="mt-6">
              <Button onClick={() => navigate('/plans/create')} icon={<Plus size={16} />}>
                플랜 생성
              </Button>
            </div>
          )}
        </Card>
      );
    }

    return (
      <Card noPadding>
        {renderPlanTable(paginatedPlans, currentPlans)}
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </Card>
    );
  };

  return (
    <div className="p-8 w-full mx-auto max-w-[1800px]">
      {/* Header Section */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">테스트 플랜</h1>
          <p className="text-slate-500 mt-1">테스트 실행 주기를 관리하세요.</p>
        </div>
        <Button onClick={() => navigate('/plans/create')} icon={<Plus size={16} />}>
          플랜 생성
        </Button>
      </div>

      {/* Filter & Bulk Actions Section */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-sm text-slate-600 mr-2">필터:</span>
          <div className="flex bg-slate-100 rounded-lg p-1">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  statusFilter === option.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Action Buttons */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 mr-2">{selectedIds.size}개 선택됨</span>
            {hasActiveSelected && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Archive size={14} />}
                onClick={() => setBulkArchiveModal(true)}
              >
                아카이브
              </Button>
            )}
            {hasArchivedSelected && (
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw size={14} />}
                onClick={() => setBulkUnarchiveModal(true)}
              >
                복원
              </Button>
            )}
            <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setBulkDeleteModal(true)}>
              삭제
            </Button>
          </div>
        )}
      </div>

      {/* Content Section */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64 text-slate-500">로딩 중...</div>
      ) : statusFilter === 'ALL' ? (
        renderAllPlansView()
      ) : (
        renderSingleSectionView()
      )}

      {/* Bulk Archive Confirm Modal */}
      <ConfirmModal
        isOpen={bulkArchiveModal}
        onClose={() => setBulkArchiveModal(false)}
        onConfirm={handleBulkArchive}
        title="테스트 플랜 일괄 아카이브"
        message={`선택한 ${selectedPlans.filter((p) => p.status === 'ACTIVE').length}개의 활성 플랜을 아카이브 하시겠습니까?`}
        confirmText="아카이브"
        cancelText="취소"
        variant="warning"
      />

      {/* Bulk Unarchive Confirm Modal */}
      <ConfirmModal
        isOpen={bulkUnarchiveModal}
        onClose={() => setBulkUnarchiveModal(false)}
        onConfirm={handleBulkUnarchive}
        title="테스트 플랜 일괄 복원"
        message={`선택한 ${selectedPlans.filter((p) => p.status === 'ARCHIVED').length}개의 아카이브된 플랜을 복원하시겠습니까?`}
        confirmText="복원"
        cancelText="취소"
        variant="info"
      />

      {/* Bulk Delete Confirm Modal */}
      <ConfirmModal
        isOpen={bulkDeleteModal}
        onClose={() => setBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="테스트 플랜 일괄 삭제"
        message={`선택한 ${selectedIds.size}개의 플랜을 삭제하시겠습니까? 모든 테스트 실행 기록이 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </div>
  );
};

export default PlansPage;
