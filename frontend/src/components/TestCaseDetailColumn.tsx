import React, { useState, useEffect } from 'react';
import { X, User, AlertCircle, CheckCircle2, ListChecks } from 'lucide-react';
import DOMPurify from 'dompurify';
import { PlanItem, TestResult } from '../api/plan';
import { User as UserType } from '../api/types';
import { Badge } from './ui/Badge';
import { ImageLightbox } from './ui/ImageLightbox';

interface TestCaseDetailColumnProps {
  planItem: PlanItem | null;
  users: UserType[];
  onClose: () => void;
  onUpdate: (itemId: string, updates: { result?: TestResult; assignee?: string; comment?: string }) => void;
}

/**
 * TestCaseDetailColumn - 우측 디테일 컬럼
 * 슬라이드가 아닌 "새로운 컬럼"으로 나타나는 방식
 * 선택된 테스트 케이스의 상세 정보 표시 및 수정
 */
export const TestCaseDetailColumn: React.FC<TestCaseDetailColumnProps> = ({ planItem, users, onClose, onUpdate }) => {
  const [localResult, setLocalResult] = useState<TestResult>('NOT_RUN');
  const [localAssignee, setLocalAssignee] = useState<string>('');
  const [localComment, setLocalComment] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // 패널이 열릴 때마다 현재 아이템 데이터로 초기화
  useEffect(() => {
    if (planItem) {
      setLocalResult(planItem.result);
      setLocalAssignee(planItem.assignee || '');
      setLocalComment(planItem.comment || '');
    }
  }, [planItem]);

  // ESC 키로 패널 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && planItem) {
        if (lightboxImage) {
          setLightboxImage(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [planItem, lightboxImage, onClose]);

  // 이미지 클릭 이벤트 핸들러
  useEffect(() => {
    if (!planItem) return;

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' && target.closest('.prose')) {
        e.preventDefault();
        const src = (target as HTMLImageElement).src;
        setLightboxImage(src);
      }
    };

    document.addEventListener('click', handleImageClick);
    return () => document.removeEventListener('click', handleImageClick);
  }, [planItem]);

  // Result 변경 시 즉시 업데이트
  const handleResultChange = (newResult: TestResult) => {
    setLocalResult(newResult);
    if (planItem) {
      onUpdate(planItem.id, { result: newResult });
    }
  };

  // Assignee 변경 시 즉시 업데이트
  const handleAssigneeChange = (newAssignee: string) => {
    setLocalAssignee(newAssignee);
    if (planItem) {
      onUpdate(planItem.id, { assignee: newAssignee });
    }
  };

  // Comment 저장
  const handleCommentSave = () => {
    if (planItem) {
      onUpdate(planItem.id, { comment: localComment });
    }
  };

  if (!planItem) return null;

  // Status별 색상 매핑
  const getStatusColor = (status: TestResult) => {
    switch (status) {
      case 'PASS':
        return 'bg-emerald-500 text-white';
      case 'FAIL':
        return 'bg-red-500 text-white';
      case 'BLOCK':
        return 'bg-gray-600 text-white';
      case 'IN_PROGRESS':
        return 'bg-amber-500 text-white';
      case 'NOT_RUN':
      default:
        return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">케이스 상세</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded transition-colors" title="닫기 (ESC)">
          <X size={14} className="text-slate-400" />
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* ID & Priority & Category & Type */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {planItem.testCaseId.substring(0, 8).toUpperCase()}
            </span>
            <Badge
              variant={
                planItem.testCase.priority === 'HIGH'
                  ? 'error'
                  : planItem.testCase.priority === 'MEDIUM'
                    ? 'warning'
                    : 'info'
              }
              className="text-[10px] font-semibold uppercase"
            >
              {planItem.testCase.priority}
            </Badge>
            {planItem.testCase.category && (
              <Badge variant="info" className="text-[10px] font-semibold">
                {planItem.testCase.category}
              </Badge>
            )}
            <Badge
              variant={planItem.testCase.automationType === 'AUTOMATED' ? 'success' : 'secondary'}
              className="text-[10px] font-semibold uppercase"
            >
              {planItem.testCase.automationType === 'AUTOMATED' ? 'Auto' : 'Manual'}
            </Badge>
          </div>
          <h2 className="text-base font-bold text-slate-900 leading-snug">{planItem.testCase.title}</h2>
        </div>

        {/* Priority, Assigned To, Result - Single Row */}
        <div className="flex items-stretch gap-2">
          {/* Assigned To */}
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <User size={11} className="inline mr-1" />
              Assigned
            </label>
            <select
              value={localAssignee}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className={`w-full text-[10px] font-medium uppercase tracking-wide rounded-full px-2 py-1.5 border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 text-center h-7 appearance-none transition-colors
                ${localAssignee ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-slate-300 text-white hover:bg-slate-400'}
                [&>option]:bg-white [&>option]:text-slate-900 [&>option]:text-center [&>option]:py-2 [&>option]:text-[10px] [&>option]:font-medium [&>option]:normal-case`}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.name}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Result Status */}
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <AlertCircle size={11} className="inline mr-1" />
              Result
            </label>
            <select
              value={localResult}
              onChange={(e) => handleResultChange(e.target.value as TestResult)}
              className={`w-full text-[10px] font-medium uppercase tracking-wide rounded-full px-2 py-1.5 border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 text-center h-7 appearance-none transition-colors
                ${getStatusColor(localResult)}
                [&>option]:bg-white [&>option]:text-slate-900 [&>option]:text-center [&>option]:py-2 [&>option]:text-[10px] [&>option]:font-medium [&>option]:uppercase`}
            >
              <option value="NOT_RUN">NOT STARTED</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="PASS">PASS</option>
              <option value="FAIL">FAIL</option>
              <option value="BLOCK">BLOCKED</option>
            </select>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200"></div>

        {/* Precondition */}
        {planItem.testCase.precondition && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <CheckCircle2 size={13} className="inline mr-1" />
              Precondition
            </label>
            <div
              className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 border border-slate-200 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-4 prose-ol:pl-4"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(planItem.testCase.precondition, { ADD_ATTR: ['target', 'rel'] }),
              }}
            />
          </div>
        )}

        {/* Steps */}
        {planItem.testCase.steps && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <ListChecks size={13} className="inline mr-1" />
              Steps
            </label>
            <div
              className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 border border-slate-200 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-4 prose-ol:pl-4"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(planItem.testCase.steps, { ADD_ATTR: ['target', 'rel'] }),
              }}
            />
          </div>
        )}

        {/* Expected Result */}
        {planItem.testCase.expectedResult && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Expected Result
            </label>
            <div
              className="bg-emerald-50 rounded-lg p-3 text-sm text-emerald-900 border border-emerald-200 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:text-emerald-900 prose-a:text-emerald-700 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-4 prose-ol:pl-4"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(planItem.testCase.expectedResult, { ADD_ATTR: ['target', 'rel'] }),
              }}
            />
          </div>
        )}

        {/* Comment */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Comment</label>
          <textarea
            value={localComment}
            onChange={(e) => setLocalComment(e.target.value)}
            onBlur={handleCommentSave}
            placeholder="Add notes, observations, or links..."
            className="w-full min-h-[100px] px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
          <p className="text-[10px] text-slate-400 mt-1">Auto-saved on blur</p>
        </div>

        {/* Metadata */}
        {planItem.executedAt && (
          <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-400">
            Last executed: {new Date(planItem.executedAt).toLocaleString()}
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox src={lightboxImage || ''} isOpen={!!lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
};
