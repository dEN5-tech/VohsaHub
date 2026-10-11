import { ChevronDown, ChevronRight, FolderOpen, FilePlus } from 'lucide-preact';
import type { ExplorerHeaderProps } from './types';

export function ExplorerSection({
  isOpen,
  onToggle,
  onStartCreate,
}: ExplorerHeaderProps) {
  return (
    <div
      class="section-header"
      onClick={onToggle}
    >
      <div class="section-title-wrap">
        {isOpen ? (
          <ChevronDown size={14} class="section-caret" />
        ) : (
          <ChevronRight size={14} class="section-caret" />
        )}
        <FolderOpen size={14} class="folder-icon" />
        <span class="section-title">WORKSPACE</span>
      </div>

      <div class="section-actions" onClick={(e) => e.stopPropagation()}>
        <button
          class="section-action-btn"
          onClick={onStartCreate}
          title="Новый файл"
        >
          <FilePlus size={14} />
        </button>
      </div>
    </div>
  );
}
