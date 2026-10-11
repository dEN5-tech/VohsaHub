import { ChevronDown, ChevronRight, FolderOpen, FilePlus, GraduationCap } from 'lucide-preact';
import type { ExplorerHeaderProps } from './types';

export function ExplorerSection({
  isOpen,
  onToggle,
  onStartCreate,
  onCreateTaskFile,
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
        {onCreateTaskFile && (
          <button
            class="section-action-btn"
            onClick={onCreateTaskFile}
            title="Создать task.json (SoloLearn урок)"
          >
            <GraduationCap size={14} color="#14b8a6" />
          </button>
        )}
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
