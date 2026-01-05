import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { Button } from './Button';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, title, message, buttonText = '확인' }) => {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // 3초 후 자동 닫기
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* 모달 카드 */}
      <div
        className="bg-white rounded-xl shadow-2xl max-w-sm w-full transform transition-all animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-modal-title"
        aria-describedby="success-modal-description"
      >
        {/* 헤더 */}
        <div className="flex items-start gap-4 p-6 pb-4">
          {/* 아이콘 */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle size={24} className="text-emerald-600" />
          </div>

          {/* 제목 & 닫기 버튼 */}
          <div className="flex-1 min-w-0">
            <h3 id="success-modal-title" className="text-lg font-semibold text-slate-900">
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
        <div className="px-6 pb-4">
          <p id="success-modal-description" className="text-sm text-slate-600 leading-relaxed">
            {message}
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-100">
          <Button onClick={onClose} variant="primary" size="md" className="bg-emerald-600 hover:bg-emerald-700">
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
};
