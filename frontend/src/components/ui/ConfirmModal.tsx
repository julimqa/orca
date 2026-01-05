import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  children?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  variant = 'info',
  children,
}) => {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      // 스크롤 방지
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
      confirmButton: 'danger' as const,
    },
    warning: {
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      confirmButton: 'primary' as const,
    },
    info: {
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      confirmButton: 'primary' as const,
    },
  };

  const currentVariant = variantStyles[variant];

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 백드롭 클릭 시에만 닫기 (모달 내부 클릭은 제외)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* 모달 카드 */}
      <div
        className="bg-white rounded-lg shadow-2xl max-w-md w-full transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        {/* 헤더 */}
        <div className="flex items-start gap-4 p-6 pb-4">
          {/* 아이콘 */}
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full ${currentVariant.iconBg} flex items-center justify-center`}
          >
            <AlertCircle size={24} className={currentVariant.iconColor} />
          </div>

          {/* 제목 & 닫기 버튼 */}
          <div className="flex-1 min-w-0">
            <h3 id="modal-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* 메시지 */}
        <div className="px-6 pb-6">
          <p id="modal-description" className="text-sm text-slate-600 leading-relaxed">
            {message}
          </p>
          {children && <div className="mt-4">{children}</div>}
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 rounded-b-lg border-t border-slate-200">
          <Button onClick={onClose} variant="ghost" size="md">
            {cancelText}
          </Button>
          <Button onClick={handleConfirm} variant={currentVariant.confirmButton} size="md">
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
