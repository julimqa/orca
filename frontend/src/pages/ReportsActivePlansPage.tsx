import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';
import { getPlans, Plan } from '../api/plan';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const ReportsActivePlansPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusView, setStatusView] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  useEffect(() => {
    const load = async () => {
      const isMock = new URLSearchParams(window.location.search).get('mock') === '1';
      try {
        setIsLoading(true);
        setErrorMessage(null);

        if (isMock) {
          setPlans(buildMockPlans());
          return;
        }

        const res = await getPlans('ALL');
        if (!res.success) throw new Error('Failed to load plans');
        setPlans(res.data || []);
      } catch {
        setErrorMessage('활성 플랜을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const visiblePlans = useMemo(() => plans.filter((p) => p.status === statusView), [plans, statusView]);

  return (
    <div className="p-8 w-full mx-auto max-w-[1600px] space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">플랜을 선택해 리포트를 확인하세요.</p>
        </div>
        <Badge variant="primary" size="sm">
          {visiblePlans.length}
        </Badge>
      </div>

      {/* Status filter (label + toggle on same row) */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">상태</span>
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setStatusView('ACTIVE')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              statusView === 'ACTIVE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusView('ARCHIVED')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              statusView === 'ARCHIVED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : errorMessage ? (
        <Card className="p-0" title="오류">
          <p className="text-sm text-rose-600">{errorMessage}</p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              새로고침
            </Button>
          </div>
        </Card>
      ) : visiblePlans.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-900">
            {statusView === 'ACTIVE' ? 'No active plans' : 'No archived plans'}
          </h3>
          <p className="text-slate-500 mt-2">
            {statusView === 'ACTIVE' ? 'Create a plan to start a test run.' : 'Archived plans will appear here.'}
          </p>
          <div className="mt-6">
            {statusView === 'ACTIVE' ? <Button onClick={() => navigate('/plans/create')}>플랜 생성</Button> : null}
          </div>
        </Card>
      ) : (
        <Card noPadding>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-2/5">
                  이름
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-64">
                  진행률
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-80">
                  통계
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {visiblePlans.map((plan) => (
                <tr
                  key={plan.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/reports/plans/${plan.id}`)}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-start">
                      <FileText className="mt-0.5 mr-3 flex-shrink-0 h-5 w-5 text-indigo-600" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 min-w-0">
                          <span className="text-sm font-medium group-hover:text-indigo-600 text-slate-900 truncate">
                            {plan.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-1">{plan.description || '설명 없음'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="w-full max-w-xs">
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-lg font-bold text-slate-900 tabular-nums">
                          {plan.stats?.progress ?? 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            (plan.stats?.progress ?? 0) === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${plan.stats?.progress ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {(() => {
                      const pass = plan.stats?.pass ?? 0;
                      const fail = plan.stats?.fail ?? 0;
                      const block = plan.stats?.block ?? 0;
                      const notRun = plan.stats?.notRun ?? 0;
                      const total = plan.stats?.total ?? pass + fail + block + notRun;
                      const inProgress = Math.max(0, total - (pass + fail + block + notRun));

                      return (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-700">
                          <div className="flex items-center gap-2" title="통과">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className="text-slate-500">PASS</span>
                            <span className="font-semibold tabular-nums text-slate-900">{pass}</span>
                          </div>
                          <div className="flex items-center gap-2" title="실패">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            <span className="text-slate-500">FAIL</span>
                            <span className="font-semibold tabular-nums text-slate-900">{fail}</span>
                          </div>
                          <div className="flex items-center gap-2" title="차단">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                            <span className="text-slate-500">BLOCK</span>
                            <span className="font-semibold tabular-nums text-slate-900">{block}</span>
                          </div>
                          <div className="flex items-center gap-2" title="진행 중">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <span className="text-slate-500">IN PROGRESS</span>
                            <span className="font-semibold tabular-nums text-slate-900">{inProgress}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div className="flex flex-col">
                      <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                      <span className="text-xs text-slate-400">{plan.createdBy}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap align-middle">
                    <Badge variant={plan.status === 'ACTIVE' ? 'success' : 'secondary'} size="lg">
                      {plan.status === 'ACTIVE' ? 'Active' : 'Archived'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default ReportsActivePlansPage;

function buildMockPlans(): Plan[] {
  const now = Date.now();
  const make = (
    i: number,
    name: string,
    stats: { total: number; pass: number; fail: number; block: number; notRun: number }
  ) => {
    const completed = stats.pass + stats.fail + stats.block;
    const progress = stats.total > 0 ? Math.round((completed / stats.total) * 100) : 0;
    return {
      id: `mock-plan-${i}`,
      name,
      description: '서버환경: qa\n스터디버전: 1.28.0-master.1953.85ae730\n웹버전: 1.28.0-master.10198.688aca9',
      status: i === 4 ? 'ARCHIVED' : 'ACTIVE',
      createdBy: 'qa',
      createdAt: new Date(now - i * 24 * 60 * 60 * 1000).toISOString(),
      stats: { ...stats, progress },
    } as Plan;
  };

  return [
    make(1, 'OVDRSTUDIO_BVT_1.28.0-master.1953.85ae730_0106', { total: 64, pass: 64, fail: 0, block: 0, notRun: 0 }),
    make(2, 'ORCA_WEB_SMOKE_1.28.0-master.10198.688aca9_0105', { total: 40, pass: 30, fail: 2, block: 1, notRun: 7 }),
    make(3, 'MOBILE_IOS_REGRESSION_1.28.0-master.6833.27042cd_0104', {
      total: 25,
      pass: 10,
      fail: 0,
      block: 2,
      notRun: 13,
    }),
    make(4, 'ARCHIVED_SAMPLE_PLAN_0103', { total: 20, pass: 5, fail: 1, block: 0, notRun: 14 }),
  ];
}
