import { useRef, useEffect } from 'preact/hooks';
import { Edit2, Trash2 } from 'lucide-preact';
import { getFileIcon } from './fileIcons';
import type { FileTreeItemProps } from './types';

export function FileTreeItem({
  file,
  isActive,
  isRenaming,
  renameValue,
  onSelect,
  onStartRename,
  onRenameChange,
  onConfirmRename,
  onCancelRename,
  onDelete,
}: FileTreeItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  return (
    <div
      class={`file-tree-item ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      onDblClick={onStartRename}
      title={isRenaming ? undefined : 'Двойной клик для переименования'}
    >
      <span class="tree-item-icon">{getFileIcon(file.name)}</span>

      {isRenaming ? (
        <div class="inline-rename-wrap" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="text"
            class="tree-inline-input"
            value={renameValue}
            onInput={(e) => onRenameChange((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirmRename();
              if (e.key === 'Escape') onCancelRename();
            }}
            onBlur={onConfirmRename}
          />
        </div>
      ) : (
        <span class="tree-item-label">{file.name}</span>
      )}

      {!isRenaming && (
        <div class="tree-item-actions" onClick={(e) => e.stopPropagation()}>
          <button
            class="tree-action-btn"
            onClick={onStartRename}
            title="Переименовать"
          >
            <Edit2 size={12} />
          </button>
          <button
            class="tree-action-btn delete-btn"
            onClick={onDelete}
            title="Удалить файл"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
