import React from 'react';
import { RunStatusCounts } from './StackedProgressBar';

interface MultiColorDonutChartProps {
  statusCounts: RunStatusCounts;
  size?: number;
  strokeWidth?: number;
}

/**
 * MultiColorDonutChart - 상태별 다색 도넛 차트
 * 각 상태의 비율에 따라 다른 색상의 세그먼트로 표시
 * 중앙에는 Passed 비율(완료율) 표시
 */
export const MultiColorDonutChart: React.FC<MultiColorDonutChartProps> = ({
  statusCounts,
  size = 140,
  strokeWidth = 14,
}) => {
  // 완벽한 1:1 비율을 위한 설정
  const viewBoxSize = 100;
  const center = viewBoxSize / 2;
  const radius = (viewBoxSize - strokeWidth) / 2;
  // const circumference = 2 * Math.PI * radius; // 미래 사용 예정

  // 전체 케이스 수
  const totalCases =
    statusCounts.passed + statusCounts.inProgress + statusCounts.failed + statusCounts.blocked + statusCounts.notRun;

  // 완료율 (Passed 기준)
  const completionRate = totalCases > 0 ? Math.round((statusCounts.passed / totalCases) * 100) : 0;

  // 상태별 세그먼트 정의 (순서 고정)
  const segments = [
    {
      key: 'passed',
      count: statusCounts.passed,
      color: '#10B981', // emerald-500
      label: 'Passed',
    },
    {
      key: 'inProgress',
      count: statusCounts.inProgress,
      color: '#F59E0B', // amber-500
      label: 'In Progress',
    },
    {
      key: 'failed',
      count: statusCounts.failed,
      color: '#EF4444', // red-500
      label: 'Failed',
    },
    {
      key: 'blocked',
      count: statusCounts.blocked,
      color: '#4B5563', // gray-600
      label: 'Blocked',
    },
    {
      key: 'notRun',
      count: statusCounts.notRun,
      color: '#CBD5E1', // slate-300
      label: 'Not Run',
    },
  ];

  // 각 세그먼트의 시작 각도 계산
  let currentAngle = 0;
  const segmentsWithAngles = segments
    .filter((seg) => seg.count > 0) // 0인 세그먼트는 제외
    .map((segment) => {
      const percentage = (segment.count / totalCases) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      // SVG path를 위한 각도를 라디안으로 변환
      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (startAngle + angle - 90) * (Math.PI / 180);

      // 호의 시작점과 끝점 계산
      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      // 큰 호 플래그 (180도 이상인 경우)
      const largeArcFlag = angle > 180 ? 1 : 0;

      return {
        ...segment,
        percentage,
        angle,
        startAngle,
        x1,
        y1,
        x2,
        y2,
        largeArcFlag,
      };
    });

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
        {/* 배경 링 (연한 그레이) */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />

        {/* 상태별 세그먼트 */}
        {segmentsWithAngles.map((segment) => {
          // 전체 원인 경우 (100%)
          if (segment.percentage >= 99.9) {
            return (
              <circle
                key={segment.key}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                className="transition-all duration-500"
              />
            );
          }

          // 일반 호 (arc)
          const innerRadius = radius - strokeWidth / 2;
          const outerRadius = radius + strokeWidth / 2;

          // 시작점과 끝점 (외부 원)
          const startRadOuter = (segment.startAngle - 90) * (Math.PI / 180);
          const endRadOuter = (segment.startAngle + segment.angle - 90) * (Math.PI / 180);
          const x1Outer = center + outerRadius * Math.cos(startRadOuter);
          const y1Outer = center + outerRadius * Math.sin(startRadOuter);
          const x2Outer = center + outerRadius * Math.cos(endRadOuter);
          const y2Outer = center + outerRadius * Math.sin(endRadOuter);

          // 시작점과 끝점 (내부 원)
          const startRadInner = (segment.startAngle - 90) * (Math.PI / 180);
          const endRadInner = (segment.startAngle + segment.angle - 90) * (Math.PI / 180);
          const x1Inner = center + innerRadius * Math.cos(startRadInner);
          const y1Inner = center + innerRadius * Math.sin(startRadInner);
          const x2Inner = center + innerRadius * Math.cos(endRadInner);
          const y2Inner = center + innerRadius * Math.sin(endRadInner);

          // SVG path 생성
          const pathData = [
            `M ${x1Outer} ${y1Outer}`, // 외부 시작점으로 이동
            `A ${outerRadius} ${outerRadius} 0 ${segment.largeArcFlag} 1 ${x2Outer} ${y2Outer}`, // 외부 호
            `L ${x2Inner} ${y2Inner}`, // 내부 끝점으로 선
            `A ${innerRadius} ${innerRadius} 0 ${segment.largeArcFlag} 0 ${x1Inner} ${y1Inner}`, // 내부 호 (역방향)
            'Z', // 닫기
          ].join(' ');

          return <path key={segment.key} d={pathData} fill={segment.color} className="transition-all duration-500" />;
        })}
      </svg>

      {/* 중앙 텍스트 (Passed 비율) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-slate-900 leading-none">{completionRate}%</div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Complete</div>
      </div>
    </div>
  );
};
