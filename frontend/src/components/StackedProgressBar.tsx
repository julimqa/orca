import React from 'react';

export type RunStatusCounts = {
  passed: number;
  inProgress: number;
  failed: number;
  blocked: number;
  notRun: number;
};

interface StackedProgressBarProps {
  statusCounts: RunStatusCounts;
  height?: string;
  showTooltip?: boolean;
}

/**
 * StackedProgressBar - 상태별 누적 진행 막대
 * Passed > In Progress > Failed > Blocked > Not Run 순서로 표시
 */
export const StackedProgressBar: React.FC<StackedProgressBarProps> = ({
  statusCounts,
  height = 'h-2',
  showTooltip = false,
}) => {
  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return <div className={`w-full bg-slate-200 rounded-full ${height}`}></div>;
  }

  // 각 상태별 퍼센트 계산
  const passedPercent = (statusCounts.passed / total) * 100;
  const inProgressPercent = (statusCounts.inProgress / total) * 100;
  const failedPercent = (statusCounts.failed / total) * 100;
  const blockedPercent = (statusCounts.blocked / total) * 100;
  const notRunPercent = (statusCounts.notRun / total) * 100;

  return (
    <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${height} flex`}>
      {/* Passed - 녹색 */}
      {passedPercent > 0 && (
        <div
          className="bg-emerald-500 transition-all duration-300"
          style={{ width: `${passedPercent}%` }}
          title={showTooltip ? `Passed: ${statusCounts.passed}` : undefined}
        />
      )}

      {/* In Progress - 노랑 */}
      {inProgressPercent > 0 && (
        <div
          className="bg-amber-500 transition-all duration-300"
          style={{ width: `${inProgressPercent}%` }}
          title={showTooltip ? `In Progress: ${statusCounts.inProgress}` : undefined}
        />
      )}

      {/* Failed - 빨강 */}
      {failedPercent > 0 && (
        <div
          className="bg-red-500 transition-all duration-300"
          style={{ width: `${failedPercent}%` }}
          title={showTooltip ? `Failed: ${statusCounts.failed}` : undefined}
        />
      )}

      {/* Blocked - 진한 회색 */}
      {blockedPercent > 0 && (
        <div
          className="bg-gray-600 transition-all duration-300"
          style={{ width: `${blockedPercent}%` }}
          title={showTooltip ? `Blocked: ${statusCounts.blocked}` : undefined}
        />
      )}

      {/* Not Run - 연한 회색 */}
      {notRunPercent > 0 && (
        <div
          className="bg-slate-300 transition-all duration-300"
          style={{ width: `${notRunPercent}%` }}
          title={showTooltip ? `Not Run: ${statusCounts.notRun}` : undefined}
        />
      )}
    </div>
  );
};
