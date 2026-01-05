import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlayCircle,
  FileText,
  Bot,
  PieChart,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';
import { getOverviewStats, getActivePlans, OverviewStats, TestPlanCard } from '../api/dashboard';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [activePlans, setActivePlans] = useState<TestPlanCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [overviewRes, plansRes] = await Promise.all([getOverviewStats(), getActivePlans()]);

        if (overviewRes.success) setOverviewStats(overviewRes.data);
        if (plansRes.success) setActivePlans(plansRes.data);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load dashboard data', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const overviewCards = [
    {
      label: 'ACTIVE PLANS',
      value: overviewStats?.activePlans || 0,
      icon: PlayCircle,
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
      link: '/plans',
      clickable: true,
    },
    {
      label: 'MANUAL CASES',
      value: overviewStats?.manualCases || 0,
      icon: FileText,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      link: '/testcases?type=MANUAL',
      clickable: true,
    },
    {
      label: 'AUTOMATED CASES',
      value: overviewStats?.automatedCases || 0,
      icon: Bot,
      iconColor: 'text-violet-500',
      bgColor: 'bg-violet-50',
      link: '/testcases?type=AUTOMATED',
      clickable: true,
    },
    {
      label: 'RATIO',
      value: `${overviewStats?.ratio.manual || 0} / ${overviewStats?.ratio.automated || 0}`,
      subLabel: 'Manual / Automated',
      icon: PieChart,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50',
      clickable: false,
    },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10">
      {/* ============================================== */}
      {/* SECTION — Overview */}
      {/* ============================================== */}
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Overview</h2>
          <p className="text-sm text-slate-500 mt-1">프로젝트 현황 요약</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewCards.map((card, index) => (
            <div
              key={index}
              onClick={() => card.clickable && card.link && navigate(card.link)}
              className={`bg-white rounded-xl border border-slate-200 p-5 transition-all duration-200 ${
                card.clickable
                  ? 'cursor-pointer hover:shadow-md hover:border-indigo-200 hover:bg-indigo-50/30 group'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</span>
                <div
                  className={`p-2 rounded-lg ${card.bgColor} ${card.clickable ? 'group-hover:scale-110 transition-transform' : ''}`}
                >
                  <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>
              <div
                className={`text-3xl font-bold text-slate-900 tracking-tight ${card.clickable ? 'group-hover:text-indigo-600 transition-colors' : ''}`}
              >
                {card.value}
              </div>
              {card.subLabel && <p className="text-xs text-slate-400 mt-1">{card.subLabel}</p>}
              {card.clickable && (
                <p className="text-xs text-indigo-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  클릭하여 보기 <ArrowRight className="w-3 h-3" />
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ============================================== */}
      {/* SECTION — Active Test Plans */}
      {/* ============================================== */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Active Test Plans</h2>
            <p className="text-sm text-slate-500 mt-1">현재 진행 중인 테스트 플랜</p>
          </div>
          <Link
            to="/plans"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
          >
            모든 플랜 보기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {activePlans.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <PlayCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">활성 플랜이 없습니다</h3>
            <p className="text-sm text-slate-400 mb-6">새 테스트 플랜을 생성하여 테스트를 시작하세요.</p>
            <Link
              to="/plans/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <PlayCircle className="w-4 h-4" />새 플랜 만들기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activePlans.map((plan) => (
              <TestPlanCardComponent key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// Test Plan Card Component
interface TestPlanCardProps {
  plan: TestPlanCard;
}

const TestPlanCardComponent: React.FC<TestPlanCardProps> = ({ plan }) => {
  const { statusCounts, progress } = plan;
  const totalExecuted = statusCounts.pass + statusCounts.fail + statusCounts.block;

  // Progress bar 색상 계산
  const getProgressColor = () => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="text-base font-semibold text-slate-900 truncate">{plan.title}</h3>
          {plan.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{plan.description}</p>}
        </div>
        <div className="flex-shrink-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            Active
          </span>
        </div>
      </div>

      {/* Case Count */}
      <div className="mb-4">
        <span className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{plan.caseCount}</span> cases assigned
        </span>
      </div>

      {/* Status Summary */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <StatusBadge
          icon={CheckCircle2}
          label="Pass"
          count={statusCounts.pass}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatusBadge icon={XCircle} label="Fail" count={statusCounts.fail} color="text-red-600" bgColor="bg-red-50" />
        <StatusBadge
          icon={AlertTriangle}
          label="Block"
          count={statusCounts.block}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatusBadge
          icon={Clock}
          label="Untested"
          count={statusCounts.untested}
          color="text-slate-500"
          bgColor="bg-slate-100"
        />
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-500">Progress</span>
          <span className="font-semibold text-slate-900">{progress}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500 rounded-full`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
          <span>{totalExecuted} executed</span>
          <span>{plan.caseCount - totalExecuted} remaining</span>
        </div>
      </div>

      {/* Action Button */}
      <Link
        to={`/plans/${plan.id}`}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
      >
        View Plan
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
};

// Status Badge Component
interface StatusBadgeProps {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
  bgColor: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ icon: Icon, label, count, color, bgColor }) => (
  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${bgColor}`}>
    <Icon className={`w-3.5 h-3.5 ${color}`} />
    <span className={`text-xs font-medium ${color}`}>{count}</span>
    <span className="text-xs text-slate-400 hidden sm:inline">{label}</span>
  </div>
);

export default DashboardPage;
