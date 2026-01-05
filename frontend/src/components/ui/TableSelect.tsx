import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface TableSelectOption {
  value: string;
  label: string;
}

interface TableSelectProps {
  value: string;
  options: TableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: 'default' | 'status';
  statusColors?: Record<string, string>;
  className?: string;
}

/**
 * TableSelect - 테이블 셀용 커스텀 드롭다운 컴포넌트
 * - 옵션 텍스트 가운데 정렬
 * - 균일한 border/radius/shadow
 * - 선택된 항목 강조
 */
export const TableSelect: React.FC<TableSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = '-',
  variant = 'default',
  statusColors,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 키보드 네비게이션
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = options.findIndex((opt) => opt.value === value);
        let newIndex: number;
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        }
        onChange(options[newIndex].value);
      } else if (e.key === 'Enter') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, value, options, onChange]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  // 트리거 버튼 스타일
  const getTriggerStyle = () => {
    if (variant === 'status' && statusColors && value) {
      return statusColors[value] || 'bg-slate-300 text-slate-700';
    }
    if (variant === 'default') {
      return value ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-400';
    }
    return 'border-slate-200 bg-slate-50 text-slate-400';
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full h-6 px-2 
          flex items-center justify-center gap-1
          text-[9px] font-medium 
          ${variant === 'status' ? 'rounded-full border-0' : 'rounded border'}
          cursor-pointer transition-colors
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
          ${getTriggerStyle()}
          ${variant === 'status' ? 'uppercase font-semibold' : ''}
        `}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={10} className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 드롭다운 리스트 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[100px] bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full h-8 px-3
                    flex items-center justify-center
                    text-[10px] font-medium text-center
                    transition-colors
                    ${isSelected ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}
                    ${variant === 'status' ? 'uppercase' : ''}
                  `}
                >
                  {isSelected && <Check size={10} className="absolute left-2 text-indigo-500" />}
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
