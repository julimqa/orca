import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FolderPlus, X } from 'lucide-react';
import { Button } from './Button';

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  initialValue?: string;
  icon?: React.ReactNode;
}

export const InputModal: React.FC<InputModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  placeholder = '',
  confirmText = 'Create',
  cancelText = 'Cancel',
  initialValue = '',
  icon,
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleConfirm = useCallback(() => {
    if (value.trim()) {
      onConfirm(value.trim());
      setValue('');
      onClose();
    }
  }, [onClose, onConfirm, value]);

  // 모달이 열릴 때 초기화 및 포커스
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      // 약간의 딜레이 후 포커스 (애니메이션 고려)
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialValue]);

  // ESC 키로 모달 닫기, Enter로 확인
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && value.trim()) {
        handleConfirm();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [handleConfirm, isOpen, onClose, value]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      data-testid="input-modal"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="input-modal-title"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 p-5 pb-4 border-b border-slate-100">
          {/* 아이콘 */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            {icon || <FolderPlus size={20} className="text-indigo-600" />}
          </div>

          {/* 제목 */}
          <h3 id="input-modal-title" className="flex-1 text-lg font-semibold text-slate-900">
            {title}
          </h3>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* 입력 필드 */}
        <div className="p-5">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
            data-testid="input-modal-input"
          />
          <p className="mt-2 text-xs text-slate-500">Enter 키로 확인, ESC 키로 취소</p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 bg-slate-50 rounded-b-xl border-t border-slate-100">
          <Button onClick={onClose} variant="ghost" size="md">
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="primary"
            size="md"
            disabled={!value.trim()}
            data-testid="input-modal-confirm"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
