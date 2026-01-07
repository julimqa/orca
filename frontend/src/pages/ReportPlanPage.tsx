import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Download,
  FileText,
  Link2,
  Loader2,
  Slash,
  XCircle,
  Folder as FolderIcon,
  Bug,
} from 'lucide-react';
import { getPlanDetail, PlanDetail, PlanItem } from '../api/plan';
import {
  createPlanReportShareLink,
  listPlanReportShareLinks,
  revokeReportShareLink,
  ReportShareLink,
} from '../api/report';
import { exportToPDF } from '../utils/export';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DonutChart } from '../components/DonutChart';
import { TestCaseDetailColumn } from '../components/TestCaseDetailColumn';

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

// 폴더 트리 노드 타입
interface FolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  items: PlanItem[];
  children: FolderTreeNode[];
  depth: number;
}

// 아이템들을 루트 기준 단일 트리 구조로 그룹화
const buildFolderTree = (items: PlanItem[]): FolderTreeNode[] => {
  // 1. 모든 폴더 정보 수집 (folderPath에서)
  const folderInfoMap = new Map<string, { name: string; parentId: string | null }>();
  const itemsByFolderId = new Map<string | null, PlanItem[]>();

  items.forEach((item) => {
    const folderId = item.testCase.folderId || null;
    const folderPath = item.testCase.folderPath || [];

    // folderPath에서 폴더 정보 추출
    folderPath.forEach((folder, index) => {
      if (!folderInfoMap.has(folder.id)) {
        const parentId = index > 0 ? folderPath[index - 1].id : null;
        folderInfoMap.set(folder.id, { name: folder.name, parentId });
      }
    });

    // 아이템을 폴더별로 그룹화
    if (!itemsByFolderId.has(folderId)) {
      itemsByFolderId.set(folderId, []);
    }
    itemsByFolderId.get(folderId)!.push(item);
  });

  // 2. 트리 노드 생성
  const nodeMap = new Map<string, FolderTreeNode>();

  // 루트 노드들 (parentId가 null인 폴더들)
  const rootNodes: FolderTreeNode[] = [];

  // 미분류 아이템 처리
  const uncategorizedItems = itemsByFolderId.get(null) || [];
  if (uncategorizedItems.length > 0) {
    rootNodes.push({
      id: 'uncategorized',
      name: 'Uncategorized',
      parentId: null,
      items: uncategorizedItems,
      children: [],
      depth: 0,
    });
  }

  // 폴더 노드 생성
  folderInfoMap.forEach((info, folderId) => {
    nodeMap.set(folderId, {
      id: folderId,
      name: info.name,
      parentId: info.parentId,
      items: itemsByFolderId.get(folderId) || [],
      children: [],
      depth: 0,
    });
  });

  // 3. 트리 구조 구축
  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  // 4. depth 계산 및 정렬
  const setDepth = (nodes: FolderTreeNode[], depth: number) => {
    nodes.forEach((node) => {
      node.depth = depth;
      node.children.sort((a, b) => a.name.localeCompare(b.name));
      setDepth(node.children, depth + 1);
    });
  };

  rootNodes.sort((a, b) => {
    // Uncategorized를 맨 뒤로
    if (a.id === 'uncategorized') return 1;
    if (b.id === 'uncategorized') return -1;
    return a.name.localeCompare(b.name);
  });

  setDepth(rootNodes, 0);

  return rootNodes;
};

// 트리를 평탄화하여 렌더링 순서대로 반환
const flattenTree = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
  const result: FolderTreeNode[] = [];
  const traverse = (nodeList: FolderTreeNode[]) => {
    nodeList.forEach((node) => {
      result.push(node);
      traverse(node.children);
    });
  };
  traverse(nodes);
  return result;
};

// 폴더 헤더 컴포넌트
const FolderHeader: React.FC<{
  node: FolderTreeNode;
  itemCount: number;
}> = ({ node, itemCount }) => {
  const isUncategorized = node.id === 'uncategorized';
  const indent = node.depth * 20;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200"
      style={{ paddingLeft: `${16 + indent}px` }}
    >
      {node.depth > 0 && <span className="text-slate-300 mr-1">└</span>}
      <FolderIcon size={16} className={isUncategorized ? 'text-slate-400' : 'text-indigo-500'} />
      <span className={`font-medium ${isUncategorized ? 'text-slate-500' : 'text-slate-800'}`}>{node.name}</span>
      <Badge variant="neutral" size="sm">
        {itemCount}
      </Badge>
    </div>
  );
};

const ReportPlanPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const selectedItem: PlanItem | null = useMemo(() => {
    if (!plan || !selectedItemId) return null;
    return plan.items.find((i) => i.id === selectedItemId) || null;
  }, [plan, selectedItemId]);

  const [shareLinks, setShareLinks] = useState<ReportShareLink[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const isMock = new URLSearchParams(window.location.search).get('mock') === '1';
      if (isMock) {
        setErrorMessage(null);
        const mockPlan = buildMockPlanDetail();
        setPlan(mockPlan);
        setSelectedItemId(mockPlan.items[0]?.id || null);
        setIsLoading(false);
        return;
      }
      if (!planId) {
        setErrorMessage('planId가 없습니다.');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const res = await getPlanDetail(planId);
        if (!res.success || !res.data) {
          setErrorMessage('플랜 리포트를 불러오지 못했습니다.');
          return;
        }
        setPlan(res.data);
      } catch {
        setErrorMessage('플랜 리포트를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [planId]);

  useEffect(() => {
    const loadShareLinks = async () => {
      const isMock = new URLSearchParams(window.location.search).get('mock') === '1';
      if (isMock) {
        setShareLinks([]);
        setShareLoading(false);
        setShareError(null);
        return;
      }
      if (!planId) return;
      try {
        setShareLoading(true);
        setShareError(null);
        const res = await listPlanReportShareLinks(planId);
        if (!res.success || !res.data) {
          setShareError('공유 링크 목록을 불러오지 못했습니다.');
          return;
        }
        setShareLinks(res.data);
      } catch {
        setShareError('공유 링크 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setShareLoading(false);
      }
    };
    loadShareLinks();
  }, [planId]);

  const stats = useMemo(() => {
    const items = plan?.items || [];
    const total = items.length;
    const pass = items.filter((i) => i.result === 'PASS').length;
    const fail = items.filter((i) => i.result === 'FAIL').length;
    const block = items.filter((i) => i.result === 'BLOCK').length;
    const inProgress = items.filter((i) => i.result === 'IN_PROGRESS').length;
    const notRun = items.filter((i) => i.result === 'NOT_RUN').length;
    const passedPct = total > 0 ? Math.round((pass / total) * 100) : 0;
    return { total, pass, fail, block, inProgress, notRun, passedPct };
  }, [plan]);

  const handleExportPDF = async () => {
    if (!plan) return;
    await exportToPDF({ plan, items: plan.items });
  };
  const buildInfo = useMemo(() => parseBuildInfo(plan?.description), [plan?.description]);

  const buildShareUrl = (token: string) => `${window.location.origin}/share/${token}`;

  const handleCopy = async (id: string, token: string) => {
    const url = buildShareUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
    }
  };

  const refreshShareLinks = async () => {
    if (!planId) return;
    try {
      setShareLoading(true);
      setShareError(null);
      const res = await listPlanReportShareLinks(planId);
      if (!res.success || !res.data) {
        setShareError('공유 링크 목록을 불러오지 못했습니다.');
        return;
      }
      setShareLinks(res.data);
    } catch {
      setShareError('공유 링크 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCreateShareLink = async () => {
    if (!planId) return;
    try {
      setIsCreatingShareLink(true);
      const res = await createPlanReportShareLink(planId);
      if (!res.success) {
        setShareError('공유 링크 생성에 실패했습니다.');
        return;
      }
      await refreshShareLinks();
    } catch {
      setShareError('공유 링크 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      setRevokingId(id);
      const res = await revokeReportShareLink(id);
      if (!res.success) {
        setShareError('공유 링크 폐기에 실패했습니다.');
        return;
      }
      await refreshShareLinks();
    } catch {
      setShareError('공유 링크 폐기 중 오류가 발생했습니다.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="bg-slate-50 font-sans text-slate-900">
      <div className="w-full max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-6 py-10 space-y-4">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Link
                to="/reports"
                className="inline-flex items-center text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium"
              >
                <ArrowLeft size={16} className="mr-1.5" /> Active Plans
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">Plan Report</h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 text-sm">Plan:</span>
              <span className="text-sm font-medium text-slate-900 truncate">{plan?.name || planId}</span>
              {plan?.status ? (
                <Badge variant={plan.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                  {plan.status === 'ACTIVE' ? 'Active' : 'Archived'}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/plans/${planId || ''}`}>
              <Button variant="outline" icon={<FileText className="w-4 h-4" />}>
                플랜 상세
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={!plan || (plan.items?.length || 0) === 0}
              icon={<Download className="w-4 h-4" />}
            >
              PDF
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : errorMessage ? (
          <Card title="오류">
            <p className="text-sm text-rose-600">{errorMessage}</p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => window.location.reload()}>
                새로고침
              </Button>
            </div>
          </Card>
        ) : !plan ? (
          <Card title="Plan Report">
            <p className="text-sm text-slate-500">플랜을 찾을 수 없습니다.</p>
          </Card>
        ) : (
          <>
            {/* Summary + Build Information (match Public Share layout) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
              <Card title="Summary & Progress" noPadding className="xl:col-span-2 h-full">
                <div className="p-6 sm:p-8 h-full">
                  <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-10 xl:gap-12 h-full">
                    {/* Left cluster: donut + status list */}
                    <div className="flex-shrink-0 flex flex-col sm:flex-row items-center sm:items-center gap-8">
                      <div className="flex-shrink-0 flex items-center justify-center">
                        <DonutChart
                          percentage={stats.passedPct}
                          size={190}
                          strokeWidth={18}
                          color="#22C55E"
                          label="passed"
                        />
                      </div>

                      <div className="w-full sm:w-72">
                        <div className="space-y-4">
                          <StatusRow
                            colorClass="bg-emerald-500"
                            title="Passed"
                            count={stats.pass}
                            total={stats.total}
                            subtitle="set to Passed"
                          />
                          <StatusRow
                            colorClass="bg-slate-500"
                            title="Blocked"
                            count={stats.block}
                            total={stats.total}
                            subtitle="set to Blocked"
                          />
                          <StatusRow
                            colorClass="bg-amber-500"
                            title="IN PROGRESS"
                            count={stats.inProgress}
                            total={stats.total}
                            subtitle="set to IN PROGRESS"
                          />
                          <StatusRow
                            colorClass="bg-rose-500"
                            title="Failed"
                            count={stats.fail}
                            total={stats.total}
                            subtitle="set to Failed"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="hidden lg:block w-px bg-slate-200" />

                    {/* Right cluster: overall percentage */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center lg:pl-6 xl:pl-10">
                      <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-none tabular-nums">
                        {stats.passedPct}%
                      </div>
                      <div className="text-base sm:text-lg text-slate-500 mt-1 leading-snug">passed</div>
                      <div className="text-sm sm:text-base text-slate-400 mt-4 tabular-nums leading-snug">
                        {stats.notRun}/{stats.total} untested
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card
                title={<span className="text-base font-semibold text-slate-700">Build Information</span>}
                noPadding
                className="shadow-sm h-full"
              >
                <div className="p-4 sm:p-5">
                  {buildInfo.length > 0 ? (
                    <div className="space-y-3">
                      {buildInfo.map((kv) => (
                        <div key={kv.key} className="flex items-start gap-3">
                          <div className="text-[11px] sm:text-xs text-slate-500 w-28 flex-shrink-0 leading-snug pt-1">
                            {kv.key}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="inline-flex max-w-full items-center rounded-md bg-slate-50 border border-slate-200 px-2 py-1 text-xs sm:text-sm text-slate-700 break-words">
                              {kv.value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">표시할 빌드 정보가 없습니다.</div>
                  )}
                </div>
              </Card>
            </div>

            {/* Share Links (Phase 4) */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-slate-500" />
                  <span>Share Links</span>
                </div>
              }
              action={
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={isCreatingShareLink}
                  onClick={handleCreateShareLink}
                  icon={<Link2 className="w-4 h-4" />}
                >
                  Create link
                </Button>
              }
            >
              {shareLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  불러오는 중...
                </div>
              ) : shareError ? (
                <div className="text-sm text-rose-600">{shareError}</div>
              ) : shareLinks.length === 0 ? (
                <div className="text-sm text-slate-500">공유 링크가 없습니다. "Create link"로 생성하세요.</div>
              ) : (
                <div className="space-y-3">
                  {shareLinks.map((l) => (
                    <div
                      key={l.id}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-3 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">URL</div>
                          <div className="mt-1 text-sm font-mono text-slate-800 truncate" title={buildShareUrl(l.token)}>
                            {buildShareUrl(l.token)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(l.id, l.token)}
                            icon={<Copy className="w-4 h-4" />}
                          >
                            {copiedId === l.id ? 'Copied' : 'Copy'}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            isLoading={revokingId === l.id}
                            onClick={() => handleRevoke(l.id)}
                            icon={<XCircle className="w-4 h-4" />}
                            disabled={!!l.revokedAt}
                          >
                            Revoke
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge link={l} />
                          <span className="inline-flex items-center gap-1">
                            <Slash className="w-3 h-3 text-slate-300" />
                            expires {new Date(l.expiresAt).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-slate-400">created {new Date(l.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Case list */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <span>Cases</span>
                  <Badge variant="primary" size="sm">
                    {plan.items.length}
                  </Badge>
                </div>
              }
              noPadding
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-col xl:flex-row gap-6 items-start">
                  <div className="flex-1 min-w-0">
                    {/* horizontal scroll only (keep page vertical scroll so sticky works) */}
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      {flattenTree(buildFolderTree(plan.items)).map((node) => {
                        if (node.items.length === 0) return null;
                        return (
                          <div key={node.id}>
                            {/* Folder Header */}
                            <FolderHeader node={node} itemCount={node.items.length} />

                            {/* Cases Table */}
                            <table className="min-w-full divide-y divide-slate-200">
                              <thead className="bg-slate-50/50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">
                                    ID
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Title
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">
                                    Assignee
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">
                                    Result
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">
                                    Defects
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">
                                    Executed
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-slate-100">
                                {node.items.map((item) => {
                                  const selected = item.id === selectedItemId;
                                  return (
                                    <tr
                                      key={item.id}
                                      className={`transition-colors cursor-pointer ${selected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                      onClick={() => setSelectedItemId(item.id)}
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          setSelectedItemId(item.id);
                                        }
                                      }}
                                      aria-selected={selected}
                                    >
                                      <td className="px-4 py-2.5 text-xs font-mono text-slate-600">
                                        {item.testCase.caseNumber
                                          ? `C${item.testCase.caseNumber}`
                                          : item.testCaseId.substring(0, 6).toUpperCase()}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <div className="text-sm font-medium text-slate-900">{item.testCase.title}</div>
                                        {item.comment ? (
                                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                            {item.comment}
                                          </div>
                                        ) : null}
                                      </td>
                                      <td className="px-4 py-2.5 text-sm text-slate-700">{item.assignee || '-'}</td>
                                      <td className="px-4 py-2.5">
                                        <ResultBadge result={item.result} />
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <DefectsCell defects={item.defects} />
                                      </td>
                                      <td className="px-4 py-2.5 text-sm text-slate-700">
                                        {item.executedAt ? new Date(item.executedAt).toLocaleString() : '-'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="w-full xl:w-[420px] xl:shrink-0 xl:sticky xl:top-6 self-start">
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white xl:h-[calc(100vh-140px)]">
                      {selectedItem ? (
                        <TestCaseDetailColumn
                          planItem={selectedItem}
                          users={[]}
                          onClose={() => setSelectedItemId(null)}
                          onUpdate={() => {}}
                          readOnly
                        />
                      ) : (
                        <div className="h-full min-h-[420px] flex items-center justify-center text-sm text-slate-400">
                          케이스를 선택하면 상세가 표시됩니다.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportPlanPage;

const StatusBadge: React.FC<{ link: ReportShareLink }> = ({ link }) => {
  const now = new Date();
  const expired = new Date(link.expiresAt) <= now;
  if (link.revokedAt) {
    return (
      <Badge variant="secondary" size="sm">
        Revoked
      </Badge>
    );
  }
  if (expired) {
    return (
      <Badge variant="secondary" size="sm">
        Expired
      </Badge>
    );
  }
  return (
    <Badge variant="primary" size="sm">
      Active
    </Badge>
  );
};

const StatusRow: React.FC<{
  colorClass: string;
  title: string;
  count: number;
  total: number;
  subtitle: string;
}> = ({ colorClass, title, count, total, subtitle }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-start gap-3">
      <div className={`w-3 h-3 rounded-full mt-1 ${colorClass}`} />
      <div className="min-w-0">
        <div className="text-base font-semibold text-slate-900 tabular-nums">
          {count} {title}
        </div>
        <div className="text-sm text-slate-400 tabular-nums">
          {pct}% {subtitle}
        </div>
      </div>
    </div>
  );
};

function parseBuildInfo(description?: string): Array<{ key: string; value: string }> {
  const text = (description || '').trim();
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const pairs: Array<{ key: string; value: string }> = [];
  for (const line of lines) {
    const match = line.match(/^(.+?)\s*[:：]\s*(.+)$/);
    if (!match) continue;

    const key = match[1].trim();
    const value = match[2].trim();
    if (!key || !value) continue;

    pairs.push({ key, value });
  }

  return pairs;
}

function buildMockPlanDetail(): PlanDetail {
  const now = new Date();
  const createdAt = new Date(now.getTime() - 25 * 60 * 1000).toISOString();
  const samplePrecondition = [
    '<p><strong>사전 조건</strong></p>',
    '<ul>',
    '<li>스테이징 환경(qa) 접속 가능</li>',
    '<li>테스트 계정 생성 완료</li>',
    '</ul>',
  ].join('');
  const sampleSteps = [
    '<ol>',
    '<li>플랜 리포트 페이지에서 케이스 리스트를 확인합니다.</li>',
    '<li>케이스를 클릭합니다.</li>',
    '<li>우측 디테일 패널에서 Precondition/Steps/Expected Result를 확인합니다.</li>',
    '</ol>',
  ].join('');
  const sampleExpected = [
    '<p>선택한 케이스의 상세가 우측 패널에 표시되고, 스크롤로 내용을 확인할 수 있습니다.</p>',
  ].join('');

  const description = [
    '서버환경: qa',
    '스터디버전: 1.28.0-master.1953.85ae730',
    '어리길버전: 1.28.0-master.27185.498b334',
    '웹버전: 1.28.0-master.10198.688aca9',
    'iOS 네비버전: 1.28.0-master.6833.27042cd',
    '',
    '설명 예시:',
    '- 플랜 생성 시 입력한 설명이 우측 영역에 표시됩니다.',
    '- 여러 줄/긴 텍스트도 줄바꿈 유지 + 스크롤로 표시됩니다.',
  ].join('\n');

  const totalItems = 50;
  const results: Array<'PASS' | 'FAIL' | 'BLOCK' | 'IN_PROGRESS' | 'NOT_RUN'> = [
    'PASS',
    'PASS',
    'PASS',
    'PASS',
    'IN_PROGRESS',
    'NOT_RUN',
    'FAIL',
    'BLOCK',
    'NOT_RUN',
    'PASS',
  ];

  const items = Array.from({ length: totalItems }).map((_, idx) => {
    const caseNumber = 200 + idx;
    const result = results[idx % results.length];
    const hasExecutedAt = result !== 'NOT_RUN';
    return {
      id: `mock-item-${idx + 1}`,
      planId: 'mock-plan',
      testCaseId: `mock-tc-${idx + 1}`,
      assignee: idx % 2 === 0 ? 'qa' : 'dev',
      result: result,
      comment:
        idx % 13 === 3
          ? '실패 원인: 목업 데이터'
          : idx % 11 === 2
            ? '참고: 긴 코멘트/링크/줄임말 테스트용 (mock)'
            : undefined,
      executedAt: hasExecutedAt ? new Date(now.getTime() - (idx + 2) * 60 * 1000).toISOString() : undefined,
      testCase: {
        id: `mock-tc-${idx + 1}`,
        caseNumber,
        title: `샘플 테스트 케이스 ${caseNumber} - 스크롤/레이아웃 확인용`,
        description: null,
        precondition: idx === 0 ? samplePrecondition : null,
        steps: idx === 0 ? sampleSteps : null,
        expectedResult: idx === 0 ? sampleExpected : null,
        priority: 'MEDIUM',
        automationType: 'MANUAL',
        category: null,
        sequence: idx,
        folderId: null,
        folder: null,
        createdAt,
        updatedAt: createdAt,
      },
      createdAt,
      updatedAt: createdAt,
    };
  });

  return {
    id: 'mock-plan',
    name: 'OVDRSTUDIO_BVT_1.28.0-master.1953.85ae730_0106',
    description,
    status: 'ACTIVE',
    createdBy: 'qa',
    createdAt,
    items: items as PlanItem[],
  };
}

const ResultBadge: React.FC<{ result: string }> = ({ result }) => {
  // Align with TestCaseDetailColumn getStatusColor
  const map: Record<string, { label: string; className: string }> = {
    NOT_RUN: { label: 'NOT RUN', className: 'bg-gray-400 text-white' },
    IN_PROGRESS: { label: 'IN PROGRESS', className: 'bg-amber-500 text-white' },
    PASS: { label: 'PASS', className: 'bg-emerald-500 text-white' },
    FAIL: { label: 'FAIL', className: 'bg-red-500 text-white' },
    BLOCK: { label: 'BLOCK', className: 'bg-gray-600 text-white' },
  };
  const v = map[result] || { label: result, className: 'bg-gray-400 text-white' };
  return (
    <span className={`inline-flex items-center rounded-full font-medium px-2 py-0.5 text-xs ${v.className}`}>
      {v.label}
    </span>
  );
};
