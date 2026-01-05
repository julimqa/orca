import React from 'react';
import { RunStatusCounts } from './StackedProgressBar';

interface RunStatusLegendProps {
  statusCounts: RunStatusCounts;
  totalCases: number;
}

/**
 * RunStatusLegend - 상태별 범례 리스트
 * 순서: Passed > In Progress > Failed > Blocked > Not Run
 */
export const RunStatusLegend: React.FC<RunStatusLegendProps> = ({ statusCounts, totalCases }) => {
  // 상태별 정보 (고정된 순서)
  const statusList = [
    {
      key: 'passed',
      label: 'Passed',
      count: statusCounts.passed,
      color: 'bg-emerald-500',
    },
    {
      key: 'inProgress',
      label: 'In Progress',
      count: statusCounts.inProgress,
      color: 'bg-amber-500',
    },
    {
      key: 'failed',
      label: 'Failed',
      count: statusCounts.failed,
      color: 'bg-red-500',
    },
    {
      key: 'blocked',
      label: 'Blocked',
      count: statusCounts.blocked,
      color: 'bg-gray-600',
    },
    {
      key: 'notRun',
      label: 'Not Run',
      count: statusCounts.notRun,
      color: 'bg-slate-400',
    },
  ];

  return (
    <div className="flex flex-col justify-center space-y-2.5">
      {statusList.map((status) => {
        const percentage = totalCases > 0 ? Math.round((status.count / totalCases) * 100) : 0;

        return (
          <div key={status.key} className="flex items-center gap-3">
            {/* 색상 점 */}
            <div className={`w-3 h-3 rounded-full ${status.color} flex-shrink-0`}></div>

            {/* 상태명 */}
            <div className="flex items-baseline gap-2 flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{status.label}</span>

              {/* 개수와 퍼센트 */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-slate-900">{status.count}</span>
                <span className="text-xs text-slate-500">({percentage}%)</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
