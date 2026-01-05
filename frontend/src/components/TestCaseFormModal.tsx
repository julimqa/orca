import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { RichTextEditor } from './RichTextEditor';
import { createTestCase, updateTestCase, TestCase, AutomationType } from '../api/testcase';
import { getFolderTree, FolderTreeItem } from '../api/folder';

interface TestCaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string | null;
  onSuccess: () => void;
  initialData?: TestCase | null;
}

export const TestCaseFormModal: React.FC<TestCaseFormModalProps> = ({
  isOpen,
  onClose,
  folderId,
  onSuccess,
  initialData,
}) => {
  const [title, setTitle] = useState('');
  const [precondition, setPrecondition] = useState('');
  const [steps, setSteps] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [automationType, setAutomationType] = useState<AutomationType>('MANUAL');
  const [category, setCategory] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderTreeItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!initialData;

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  // 폴더 트리 로드
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const response = await getFolderTree();
        if (response.success) {
          setFolders(response.data);
        }
      } catch (error) {
        console.error('Failed to load folders', error);
      }
    };
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setPrecondition(initialData.precondition || '');
        setSteps(initialData.steps || '');
        setExpectedResult(initialData.expectedResult || '');
        setPriority(initialData.priority || 'MEDIUM');
        setAutomationType(initialData.automationType || 'MANUAL');
        setCategory(initialData.category || '');
        setSelectedFolderId(initialData.folderId || null);
      } else {
        setTitle('');
        setPrecondition('');
        setSteps('');
        setExpectedResult('');
        setPriority('MEDIUM');
        setAutomationType('MANUAL');
        setCategory('');
        setSelectedFolderId(folderId);
      }
      setError('');
    }
  }, [isOpen, initialData, folderId]);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleClose]);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const testCaseData: Partial<TestCase> = {
        title: title.trim(),
        precondition,
        steps,
        expectedResult,
        priority,
        automationType,
        category: category.trim() || null,
        folderId: selectedFolderId || undefined,
      };

      if (isEditMode && initialData) {
        await updateTestCase(initialData.id, testCaseData);
      } else {
        await createTestCase(testCaseData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save test case:', err);
      setError(err.response?.data?.message || 'Failed to save test case');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // 폴더 트리를 플랫 리스트로 변환 (depth 포함)
  const flattenFolders = (items: FolderTreeItem[], depth = 0): Array<{ id: string; name: string; depth: number }> => {
    const result: Array<{ id: string; name: string; depth: number }> = [];
    items.forEach((item) => {
      result.push({ id: item.id, name: item.name, depth });
      if (item.children && item.children.length > 0) {
        result.push(...flattenFolders(item.children, depth + 1));
      }
    });
    return result;
  };

  const flatFolders = flattenFolders(folders);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white rounded-t-lg">
          <h2 className="text-xl font-semibold text-slate-900">{isEditMode ? 'Edit Test Case' : 'Create Test Case'}</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter test case title"
              disabled={isSubmitting}
              autoFocus
              data-testid="testcase-form-title"
            />
          </div>

          {/* Folder Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Folder</label>
            <select
              value={selectedFolderId || ''}
              onChange={(e) => setSelectedFolderId(e.target.value || null)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
              data-testid="testcase-form-folder"
            >
              <option value="">Root (Uncategorized)</option>
              {flatFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {'\u00A0\u00A0'.repeat(folder.depth)}└─ {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority, Automation Type & Category */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                data-testid="testcase-form-priority"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Automation Type</label>
              <select
                value={automationType}
                onChange={(e) => setAutomationType(e.target.value as AutomationType)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
              >
                <option value="MANUAL">Manual</option>
                <option value="AUTOMATED">Automated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Smoke, Regression"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Preconditions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Preconditions</label>
            <RichTextEditor content={precondition} onChange={setPrecondition} placeholder="Enter preconditions..." />
          </div>

          {/* Steps */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Steps</label>
            <RichTextEditor content={steps} onChange={setSteps} placeholder="Enter test steps..." />
          </div>

          {/* Expected Result */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Expected Result</label>
            <RichTextEditor
              content={expectedResult}
              onChange={setExpectedResult}
              placeholder="Enter expected result..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-lg">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="primary" disabled={isSubmitting} data-testid="testcase-form-submit">
            {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};
