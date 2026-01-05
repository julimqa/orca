import React from 'react';

interface DonutChartProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

/**
 * DonutChart - 단일 Progress Ring 도넛 차트
 * 완료율만 표시 (상태별 세그먼트 없음)
 * 완벽한 원형, 포인트/점 없음
 */
export const DonutChart: React.FC<DonutChartProps> = ({
  percentage,
  size = 140,
  strokeWidth = 14,
  color = '#10B981', // 기본 녹색 (emerald-500)
}) => {
  // 완벽한 1:1 비율을 위한 설정
  const viewBoxSize = 100;
  const center = viewBoxSize / 2;
  const radius = (viewBoxSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // 진행률에 따른 stroke-dashoffset 계산
  const progress = ((100 - percentage) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="transform -rotate-90">
        {/* 배경 링 (연한 그레이) */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />

        {/* 진행 링 (완료율) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="butt"
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* 중앙 텍스트 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-slate-900 leading-none">{percentage}%</div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Complete</div>
      </div>
    </div>
  );
};
