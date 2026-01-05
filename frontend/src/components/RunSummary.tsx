import React, { useState } from 'react';
import { MultiColorDonutChart } from './MultiColorDonutChart';
import { RunStatusLegend } from './RunStatusLegend';
import { RunStatusCounts } from './StackedProgressBar';
import { Users, FileText } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  assignedCount: number;
}

interface RunSummaryProps {
  planName: string;
  description: string;
  createdBy: string;
  createdAt: string;
  totalCases: number;
  statusCounts: RunStatusCounts;
  teamMembers: TeamMember[];
}

/**
 * RunSummary - 테스트 런의 전체 요약 섹션
 * 도넛 차트 + 상태 리스트 + Team/Details 탭
 */
export const RunSummary: React.FC<RunSummaryProps> = ({
  planName,
  description,
  createdBy,
  createdAt,
  totalCases,
  statusCounts,
  teamMembers,
}) => {
  const [activeTab, setActiveTab] = useState<'team' | 'details'>('team');

  // 완료된 케이스 수 (NOT_RUN 제외한 모든 상태)
  const completedCases = statusCounts.passed + statusCounts.failed + statusCounts.blocked + statusCounts.inProgress;
  // const progress = totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0; // 미래 사용 예정

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Summary</h3>
      </div>

      <div className="p-6">
        <div className="flex gap-8">
          {/* 좌측: 도넛 차트 + 상태 리스트 */}
          <div className="flex gap-6">
            {/* 도넛 차트 */}
            <div className="flex flex-col items-center">
              <MultiColorDonutChart statusCounts={statusCounts} size={140} strokeWidth={14} />
              <div className="mt-4 text-center">
                <p className="text-xs font-medium text-slate-600">
                  {completedCases} of {totalCases} test cases done
                </p>
              </div>
            </div>

            {/* 상태 리스트 */}
            <RunStatusLegend statusCounts={statusCounts} totalCases={totalCases} />
          </div>

          {/* 구분선 */}
          <div className="w-px bg-slate-200"></div>

          {/* 우측: Team / Details 탭 */}
          <div className="flex-1 min-w-0">
            {/* 탭 헤더 */}
            <div className="flex border-b border-slate-200 mb-4">
              <button
                onClick={() => setActiveTab('team')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'team'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users size={16} />
                Team
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'details'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileText size={16} />
                Details
              </button>
            </div>

            {/* 탭 콘텐츠 */}
            <div className="space-y-3">
              {activeTab === 'team' ? (
                // Team 탭
                <>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-medium">{teamMembers.length} users</span>
                  </div>
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-xs font-semibold text-indigo-700">
                            {member.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-900">{member.name}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {member.assignedCount} test case{member.assignedCount !== 1 ? 's' : ''} assigned
                      </span>
                    </div>
                  ))}
                  {teamMembers.length === 0 && (
                    <div className="text-center py-6 text-sm text-slate-400">No team members assigned</div>
                  )}
                </>
              ) : (
                // Details 탭
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Test Plan
                    </label>
                    <p className="text-sm font-medium text-slate-900">{planName}</p>
                  </div>
                  {description && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Description
                      </label>
                      <p className="text-sm text-slate-700 leading-relaxed">{description}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Created By
                    </label>
                    <p className="text-sm text-slate-700">{createdBy}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Created Date
                    </label>
                    <p className="text-sm text-slate-700">{new Date(createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Total Test Cases
                    </label>
                    <p className="text-sm font-semibold text-slate-900">{totalCases}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
