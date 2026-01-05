// Folder Tree with Drag & Drop and Test Case Drop Target - Updated 2025-12-07
import React, { useState, useMemo, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
  UniqueIdentifier,
  rectIntersection,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FolderTreeItem, moveFolder } from '../api/folder';
import {
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  Plus,
  Layers,
  GripVertical,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';

const MAX_DEPTH = 5;

interface FolderTreeProps {
  folders: FolderTreeItem[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onAddFolder: (parentId: string | null) => void;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string, folderName: string) => void;
  onFoldersChange: () => void;
  // Bulk selection
  selectedFolderIds?: Set<string>;
  onToggleFolderSelect?: (folderId: string) => void;
  isBulkMode?: boolean;
  // External DndContext support
  useExternalDnd?: boolean;
  // Test case drag over highlighting
  testCaseDragOverId?: string | null;
}

// 폴더의 깊이 계산
const getFolderDepth = (folderId: string, folders: FolderTreeItem[]): number => {
  const findDepth = (items: FolderTreeItem[], targetId: string, currentDepth: number): number => {
    for (const item of items) {
      if (item.id === targetId) return currentDepth;
      if (item.children && item.children.length > 0) {
        const found = findDepth(item.children, targetId, currentDepth + 1);
        if (found !== -1) return found;
      }
    }
    return -1;
  };
  return findDepth(folders, folderId, 1);
};

// 폴더의 최대 자손 깊이 계산
const getMaxDescendantDepth = (folder: FolderTreeItem): number => {
  if (!folder.children || folder.children.length === 0) return 0;
  return 1 + Math.max(...folder.children.map(getMaxDescendantDepth));
};

// 특정 폴더가 다른 폴더의 자손인지 확인
const isDescendantOf = (folderId: string, ancestorId: string, folders: FolderTreeItem[]): boolean => {
  const findFolder = (items: FolderTreeItem[], targetId: string): FolderTreeItem | null => {
    for (const item of items) {
      if (item.id === targetId) return item;
      if (item.children) {
        const found = findFolder(item.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const checkDescendant = (folder: FolderTreeItem, targetId: string): boolean => {
    if (folder.id === targetId) return true;
    if (folder.children) {
      return folder.children.some((child) => checkDescendant(child, targetId));
    }
    return false;
  };

  const ancestor = findFolder(folders, ancestorId);
  if (!ancestor) return false;
  return checkDescendant(ancestor, folderId);
};

// 폴더 찾기 헬퍼
const findFolderById = (folders: FolderTreeItem[], id: string): FolderTreeItem | null => {
  for (const folder of folders) {
    if (folder.id === id) return folder;
    if (folder.children) {
      const found = findFolderById(folder.children, id);
      if (found) return found;
    }
  }
  return null;
};

// 형제 폴더들 가져오기 (parentId 기준)
const getSiblingsByParentId = (folders: FolderTreeItem[], parentId: string | null): FolderTreeItem[] => {
  if (parentId === null) {
    return folders;
  }
  const parent = findFolderById(folders, parentId);
  return parent?.children || [];
};

// 모든 폴더 ID를 평탄화하여 가져오기 (미래 사용 예정)
// const getAllFolderIds = (folders: FolderTreeItem[]): string[] => {
//   const ids: string[] = [];
//   const traverse = (items: FolderTreeItem[]) => {
//     for (const item of items) {
//       ids.push(item.id);
//       if (item.children) {
//         traverse(item.children);
//       }
//     }
//   };
//   traverse(folders);
//   return ids;
// };

// 드래그 가능한 폴더 아이템
const DraggableFolderItem: React.FC<{
  folder: FolderTreeItem;
  selectedFolderId: string | null;
  onSelectFolder: (id: string) => void;
  onAddFolder: (parentId: string | null) => void;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string, folderName: string) => void;
  depth: number;
  allFolders: FolderTreeItem[];
  dragOverId: UniqueIdentifier | null;
  activeId: UniqueIdentifier | null;
  dropPosition: 'before' | 'after' | 'inside' | null;
  onFoldersChange: () => void;
  registerRef: (id: string, element: HTMLDivElement | null) => void;
  // Bulk selection
  selectedFolderIds?: Set<string>;
  onToggleFolderSelect?: (folderId: string) => void;
  isBulkMode?: boolean;
  // Test case drag over
  isTestCaseDragOver?: boolean;
  testCaseDragOverId?: string | null;
  useExternalDnd?: boolean;
}> = ({
  folder,
  selectedFolderId,
  onSelectFolder,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  depth,
  allFolders,
  dragOverId,
  activeId,
  dropPosition,
  onFoldersChange,
  registerRef,
  selectedFolderIds,
  onToggleFolderSelect,
  isBulkMode,
  isTestCaseDragOver,
  testCaseDragOverId,
  useExternalDnd,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = folder.id === selectedFolderId;
  const isDragOver = dragOverId === folder.id;
  const isActive = activeId === folder.id;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: folder.id,
    data: {
      type: 'folder',
      folder,
      depth,
      parentId: folder.parentId,
    },
    // useExternalDnd일 때는 정렬 비활성화 (드롭 타겟으로만 사용)
    disabled: useExternalDnd || false,
  });

  const itemRef = useRef<HTMLDivElement>(null);

  // ref 등록
  React.useEffect(() => {
    registerRef(folder.id, itemRef.current);
    return () => registerRef(folder.id, null);
  }, [folder.id, registerRef]);

  const style = {
    transform: useExternalDnd ? undefined : CSS.Transform.toString(transform),
    transition: useExternalDnd ? undefined : transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // 드롭 위치에 따른 하이라이트 스타일
  const getDropIndicatorStyle = () => {
    if (!isDragOver || !dropPosition || isActive) return '';

    switch (dropPosition) {
      case 'before':
        return 'before:absolute before:left-0 before:right-0 before:top-0 before:h-0.5 before:bg-indigo-500 before:rounded';
      case 'after':
        return 'after:absolute after:left-0 after:right-0 after:bottom-0 after:h-0.5 after:bg-indigo-500 after:rounded';
      case 'inside':
        return 'ring-2 ring-indigo-500 ring-inset bg-indigo-50';
      default:
        return '';
    }
  };

  const isFolderSelected = selectedFolderIds?.has(folder.id) || false;

  return (
    <div ref={setNodeRef} style={style} className="mb-0.5">
      <div
        ref={itemRef}
        className={`relative flex items-center py-1.5 px-2 cursor-pointer rounded-md text-sm transition-all group ${
          isSelected
            ? 'bg-white border border-indigo-200 shadow-sm text-indigo-700 font-medium'
            : 'text-slate-600 hover:bg-slate-100 border border-transparent'
        } ${isFolderSelected ? 'bg-indigo-50/50' : ''} ${isTestCaseDragOver ? 'bg-emerald-50 border-emerald-400 shadow-md ring-2 ring-emerald-200' : ''} ${!useExternalDnd ? getDropIndicatorStyle() : ''} ${isDragging ? 'opacity-30 scale-95' : ''}`}
        style={{ marginLeft: `${depth * 16}px` }}
        onClick={() => onSelectFolder(folder.id)}
      >
        {/* Bulk 모드 체크박스 */}
        {isBulkMode && onToggleFolderSelect && (
          <button
            className="mr-1 text-slate-400 hover:text-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFolderSelect(folder.id);
            }}
          >
            {isFolderSelected ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} />}
          </button>
        )}

        {/* 드래그 핸들 - useExternalDnd일 때는 표시하지 않음 */}
        {!isBulkMode &&
          (useExternalDnd ? (
            <div className="w-3.5 mr-1" /> // 공간 유지
          ) : (
            <div
              {...attributes}
              {...listeners}
              className="mr-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical size={14} />
            </div>
          ))}

        <div
          onClick={handleToggle}
          className={`mr-1 ${isSelected ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-500'}`}
        >
          {folder.children && folder.children.length > 0 ? (
            isOpen ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <div className="w-3.5" />
          )}
        </div>
        <FolderIcon
          size={16}
          className={`mr-2 ${isSelected ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-500'}`}
        />
        <span className="flex-1 truncate select-none">{folder.name}</span>

        {/* 이름 변경 버튼 */}
        {!isBulkMode && (
          <button
            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all mr-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onRenameFolder(folder.id, folder.name);
            }}
            title="이름 변경"
          >
            <Pencil size={12} />
          </button>
        )}

        {/* 삭제 버튼 */}
        {!isBulkMode && (
          <button
            className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all mr-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFolder(folder.id, folder.name);
            }}
            title="삭제"
          >
            <Trash2 size={12} />
          </button>
        )}

        {/* 하위 폴더 추가 버튼 */}
        {!isBulkMode && (
          <button
            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onAddFolder(folder.id);
            }}
            title="하위 폴더 추가"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {isOpen && folder.children && folder.children.length > 0 && (
        <div className="mt-0.5">
          {folder.children.map((child) => (
            <DraggableFolderItem
              key={child.id}
              folder={child}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onAddFolder={onAddFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              depth={depth + 1}
              allFolders={allFolders}
              dragOverId={dragOverId}
              activeId={activeId}
              dropPosition={dragOverId === child.id ? dropPosition : null}
              onFoldersChange={onFoldersChange}
              registerRef={registerRef}
              selectedFolderIds={selectedFolderIds}
              onToggleFolderSelect={onToggleFolderSelect}
              isBulkMode={isBulkMode}
              isTestCaseDragOver={testCaseDragOverId === child.id}
              testCaseDragOverId={testCaseDragOverId}
              useExternalDnd={useExternalDnd}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 드래그 오버레이용 폴더 미리보기
const FolderDragOverlay: React.FC<{ folder: FolderTreeItem }> = ({ folder }) => {
  return (
    <div className="flex items-center py-1.5 px-3 bg-white border-2 border-indigo-400 shadow-xl rounded-md text-sm text-indigo-700 font-medium min-w-[150px]">
      <GripVertical size={14} className="mr-1 text-indigo-400" />
      <FolderIcon size={16} className="mr-2 text-indigo-500" />
      <span className="truncate">{folder.name}</span>
    </div>
  );
};

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onFoldersChange,
  selectedFolderIds,
  onToggleFolderSelect,
  isBulkMode,
  useExternalDnd = false,
  testCaseDragOverId = null,
}) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [dragOverId, setDragOverId] = useState<UniqueIdentifier | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);
  const [currentMouseY, setCurrentMouseY] = useState<number>(0);

  // 각 폴더 아이템의 DOM 참조 저장
  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const registerRef = (id: string, element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(id, element);
    } else {
      itemRefs.current.delete(id);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const activeFolder = useMemo(() => {
    if (!activeId) return null;
    return findFolderById(folders, activeId as string);
  }, [activeId, folders]);

  // 모든 폴더 ID (미래 사용 예정)
  // const allFolderIds = useMemo(() => getAllFolderIds(folders), [folders]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over } = event;

    // 마우스 Y 위치 업데이트
    if (event.activatorEvent && 'clientY' in event.activatorEvent) {
      setCurrentMouseY((event.activatorEvent as MouseEvent).clientY + (event.delta?.y || 0));
    }

    if (!over) {
      setDragOverId(null);
      setDropPosition(null);
      return;
    }

    const activeIdStr = active.id as string;
    const overId = over.id as string;

    // 자기 자신 위에는 드롭 불가
    if (activeIdStr === overId) {
      setDragOverId(null);
      setDropPosition(null);
      return;
    }

    // 자손 폴더 위에는 드롭 불가 (순환 구조 방지)
    if (isDescendantOf(overId, activeIdStr, folders)) {
      setDragOverId(null);
      setDropPosition(null);
      return;
    }

    const overFolder = findFolderById(folders, overId);
    const activeFolderData = findFolderById(folders, activeIdStr);

    if (!overFolder || !activeFolderData) {
      setDragOverId(null);
      setDropPosition(null);
      return;
    }

    // DOM 요소에서 위치 계산
    const overElement = itemRefs.current.get(overId);
    if (!overElement) {
      setDragOverId(overId);
      setDropPosition('inside');
      return;
    }

    const rect = overElement.getBoundingClientRect();
    const mouseY = currentMouseY || ((event.activatorEvent as MouseEvent)?.clientY || 0) + (event.delta?.y || 0);
    const relativeY = mouseY - rect.top;
    const height = rect.height;

    // 최대 깊이 체크
    const overDepth = getFolderDepth(overId, folders);
    const activeMaxDescendantDepth = getMaxDescendantDepth(activeFolderData);

    // 상단 20%: before, 하단 20%: after, 중간 60%: inside
    let newDropPosition: 'before' | 'after' | 'inside';

    if (relativeY < height * 0.2) {
      newDropPosition = 'before';
    } else if (relativeY > height * 0.8) {
      newDropPosition = 'after';
    } else {
      // inside로 이동할 때 깊이 체크
      if (overDepth + 1 + activeMaxDescendantDepth > MAX_DEPTH) {
        // 깊이 초과 시 상대 위치에 따라 before/after 결정
        newDropPosition = relativeY < height * 0.5 ? 'before' : 'after';
      } else {
        newDropPosition = 'inside';
      }
    }

    setDragOverId(overId);
    setDropPosition(newDropPosition);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    const finalDropPosition = dropPosition;
    const finalDragOverId = dragOverId;

    setActiveId(null);
    setDragOverId(null);
    setDropPosition(null);
    setCurrentMouseY(0);

    if (!over || active.id === over.id || !finalDragOverId) return;

    const activeIdStr = active.id as string;
    const overId = finalDragOverId as string;

    // 자손 폴더로 이동 방지
    if (isDescendantOf(overId, activeIdStr, folders)) return;

    const activeFolderData = findFolderById(folders, activeIdStr);
    const overFolder = findFolderById(folders, overId);

    if (!activeFolderData || !overFolder) return;

    try {
      if (finalDropPosition === 'inside') {
        // 대상 폴더의 자식으로 이동
        await moveFolder(activeIdStr, overId);
      } else {
        // before/after: 형제로 이동
        const newParentId = overFolder.parentId;
        const siblings = getSiblingsByParentId(folders, newParentId);
        const overIndex = siblings.findIndex((s) => s.id === overId);

        // 새 위치의 order 계산
        let newOrder: number;
        if (finalDropPosition === 'before') {
          const prevSibling = siblings[overIndex - 1];
          const prevOrder = prevSibling?.order ?? -1;
          const currentOrder = overFolder.order ?? 0;
          newOrder = (prevOrder + currentOrder) / 2;
        } else {
          const nextSibling = siblings[overIndex + 1];
          const currentOrder = overFolder.order ?? 0;
          const nextOrder = nextSibling?.order ?? currentOrder + 2;
          newOrder = (currentOrder + nextOrder) / 2;
        }

        await moveFolder(activeIdStr, newParentId, newOrder);
      }

      // 폴더 트리 리로드
      onFoldersChange();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to move folder:', error);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDragOverId(null);
    setDropPosition(null);
    setCurrentMouseY(0);
  };

  const folderTreeContent = (
    <div className="h-full">
      <div className="py-2">
        {/* All Cases Item - 드래그 대상 아님 */}
        <div
          className={`flex items-center py-1.5 px-2 mb-1 cursor-pointer rounded-md text-sm transition-colors ${
            selectedFolderId === null
              ? 'bg-white border border-indigo-200 shadow-sm text-indigo-700 font-medium'
              : 'text-slate-600 hover:bg-slate-100 border border-transparent'
          }`}
          onClick={() => onSelectFolder(null)}
        >
          <div className="w-3.5 mr-1" />
          <div className="w-3.5 mr-1" />
          <Layers size={16} className={`mr-2 ${selectedFolderId === null ? 'text-indigo-500' : 'text-slate-400'}`} />
          <span className="flex-1 truncate select-none">All Cases</span>
        </div>

        {folders.map((folder) => (
          <DraggableFolderItem
            key={folder.id}
            folder={folder}
            selectedFolderId={selectedFolderId}
            onSelectFolder={onSelectFolder}
            onAddFolder={onAddFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            depth={0}
            allFolders={folders}
            dragOverId={dragOverId}
            activeId={activeId}
            dropPosition={dragOverId === folder.id ? dropPosition : null}
            onFoldersChange={onFoldersChange}
            registerRef={registerRef}
            selectedFolderIds={selectedFolderIds}
            onToggleFolderSelect={onToggleFolderSelect}
            isBulkMode={isBulkMode}
            isTestCaseDragOver={testCaseDragOverId === folder.id}
            testCaseDragOverId={testCaseDragOverId}
            useExternalDnd={useExternalDnd}
          />
        ))}
      </div>
    </div>
  );

  // 외부 DndContext를 사용하는 경우 자체 DndContext 없이 렌더링
  if (useExternalDnd) {
    return folderTreeContent;
  }

  // 자체 DndContext 사용 (폴더 드래그)
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {folderTreeContent}

      {/* 드래그 오버레이 */}
      <DragOverlay dropAnimation={null}>
        {activeFolder ? <FolderDragOverlay folder={activeFolder} /> : null}
      </DragOverlay>
    </DndContext>
  );
};
